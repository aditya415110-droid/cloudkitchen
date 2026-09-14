import nodemailer from 'nodemailer';
import config from '../config/index.js';
import { qrService } from './qrService.js';
import Settings from '../models/Settings.js';
import User from '../models/User.js';

let warnedUnconfigured = false;
const transports = new Map();

/** SMTP is only usable once a host and credentials are present. */
const isSmtpConfigured = () =>
  Boolean(config.email.host && config.email.user && config.email.password);

/**
 * Which delivery mechanism to use.
 *
 * 'auto' prefers an HTTP provider, because SMTP is blocked outright on some
 * hosts (Render's free tier blocks ports 25/465/587) while plain HTTPS is not.
 */
const HTTP_PROVIDERS = ['relay', 'mailjet', 'brevo', 'resend'];

export const activeProvider = () => {
  const choice = config.email.provider;
  if (choice === 'smtp' || HTTP_PROVIDERS.includes(choice)) return choice;

  if (config.email.relayUrl && config.email.relaySecret) return 'relay';
  if (config.email.mailjetApiKey && config.email.mailjetApiSecret) return 'mailjet';
  if (config.email.brevoApiKey) return 'brevo';
  if (config.email.resendApiKey) return 'resend';
  return 'smtp';
};

export const isEmailConfigured = () => {
  switch (activeProvider()) {
    case 'relay':
      return Boolean(config.email.relayUrl && config.email.relaySecret && config.email.from);
    case 'mailjet':
      return Boolean(config.email.mailjetApiKey && config.email.mailjetApiSecret && config.email.from);
    case 'brevo': return Boolean(config.email.brevoApiKey && config.email.from);
    case 'resend': return Boolean(config.email.resendApiKey && config.email.from);
    default: return isSmtpConfigured();
  }
};

/** Split "Name <a@b.com>" into its parts; bare addresses get an empty name. */
const parseAddress = (value) => {
  const match = /^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/.exec(value || '');
  if (match) return { name: match[1].replace(/^["']|["']$/g, ''), email: match[2] };
  return { name: '', email: (value || '').trim() };
};

const splitRecipients = (to) =>
  String(to || '').split(',').map(a => parseAddress(a).email).filter(Boolean);

/** POST JSON and surface a non-2xx body as an Error, the way SMTP errors read. */
const postJson = async (url, headers, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  const text = await response.text();
  if (!response.ok) {
    const err = new Error(`HTTP ${response.status}: ${text.slice(0, 400)}`);
    err.code = response.status === 401 || response.status === 403 ? 'EAUTH' : 'EAPI';
    err.responseCode = response.status;
    throw err;
  }

  try { return JSON.parse(text); } catch { return {}; }
};

/**
 * Supabase Edge Function relay.
 *
 * Render blocks outbound SMTP, but the Edge Function runtime permits port 465,
 * so the message travels here over HTTPS and is handed to Gmail from there.
 */
const sendViaRelay = async (payload) => {
  const result = await postJson(
    config.email.relayUrl,
    {
      'x-relay-secret': config.email.relaySecret,
      // Sent so the call also succeeds if the function is left with Supabase's
      // default "Verify JWT" enabled; harmless when it is switched off. The
      // real authorisation is the relay secret above.
      ...(config.supabase.anonKey ? { authorization: `Bearer ${config.supabase.anonKey}` } : {}),
    },
    {
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
      ...(payload.attachments?.length
        ? {
            attachments: payload.attachments.map(a => ({
              filename: a.filename,
              contentType: a.contentType || 'application/octet-stream',
              contentBase64: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
              ...(a.cid ? { contentId: a.cid } : {}),
            })),
          }
        : {}),
    }
  );

  if (!result.ok) {
    const err = new Error(result.error || 'The relay reported a failure.');
    err.code = 'EAPI';
    throw err;
  }
  return { messageId: undefined, response: `relayed via ${result.via || 'Supabase'}` };
};

/** Mailjet keeps inline parts in InlinedAttachments, downloads in Attachments. */
const mailjetParts = (attachments = []) => {
  if (!attachments.length) return {};

  const encode = (a) => ({
    ContentType: a.contentType || 'application/octet-stream',
    Filename: a.filename,
    Base64Content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
  });

  const inline = attachments.filter(a => a.cid);
  const plain = attachments.filter(a => !a.cid);

  return {
    ...(inline.length
      ? { InlinedAttachments: inline.map(a => ({ ...encode(a), ContentID: a.cid })) }
      : {}),
    ...(plain.length ? { Attachments: plain.map(encode) } : {}),
  };
};

/**
 * Mailjet Send API v3.1.
 *
 * Note the unusual error contract: a per-message failure still returns HTTP 200
 * with Status "error" inside the body, so the status has to be inspected rather
 * than relying on the response code.
 */
const sendViaMailjet = async (payload) => {
  const sender = parseAddress(payload.from);
  const auth = Buffer
    .from(`${config.email.mailjetApiKey}:${config.email.mailjetApiSecret}`)
    .toString('base64');

  const result = await postJson(
    'https://api.mailjet.com/v3.1/send',
    { authorization: `Basic ${auth}` },
    {
      Messages: [{
        From: { Email: sender.email, ...(sender.name ? { Name: sender.name } : {}) },
        To: splitRecipients(payload.to).map(Email => ({ Email })),
        Subject: payload.subject,
        HTMLPart: payload.html,
        ...(payload.replyTo ? { ReplyTo: { Email: parseAddress(payload.replyTo).email } } : {}),
        ...(mailjetParts(payload.attachments)),
      }],
    }
  );

  const message = result?.Messages?.[0];
  if (!message || message.Status !== 'success') {
    const reasons = (message?.Errors || [])
      .map(e => `${e.ErrorCode || ''} ${e.ErrorMessage || ''}`.trim())
      .join('; ');
    const err = new Error(reasons || `Mailjet returned status "${message?.Status || 'unknown'}".`);
    // 'unauthorized' / sender errors surface here rather than as an HTTP 4xx.
    err.code = /api key|unauthorized/i.test(reasons) ? 'EAUTH' : 'EAPI';
    throw err;
  }

  return { messageId: message.To?.[0]?.MessageID, response: 'accepted by Mailjet' };
};

/** Brevo transactional API. Single-sender verification, no DNS records needed. */
const sendViaBrevo = async (payload) => {
  const sender = parseAddress(payload.from);
  const result = await postJson(
    'https://api.brevo.com/v3/smtp/email',
    { 'api-key': config.email.brevoApiKey },
    {
      sender: { email: sender.email, ...(sender.name ? { name: sender.name } : {}) },
      to: splitRecipients(payload.to).map(email => ({ email })),
      subject: payload.subject,
      htmlContent: payload.html,
      ...(payload.replyTo ? { replyTo: { email: parseAddress(payload.replyTo).email } } : {}),
      // Brevo has no cid support, so attachments are downloads only; the HTML
      // references images by absolute URL instead.
      ...(payload.attachments?.length
        ? {
            attachment: payload.attachments.map(a => ({
              name: a.filename,
              content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
            })),
          }
        : {}),
    }
  );
  return { messageId: result.messageId, response: 'accepted by Brevo' };
};

/** Resend API. Requires a verified domain to reach anyone but your own address. */
const sendViaResend = async (payload) => {
  const result = await postJson(
    'https://api.resend.com/emails',
    { authorization: `Bearer ${config.email.resendApiKey}` },
    {
      from: payload.from,
      to: splitRecipients(payload.to),
      subject: payload.subject,
      html: payload.html,
      ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
      ...(payload.attachments?.length
        ? {
            attachments: payload.attachments.map(a => ({
              filename: a.filename,
              content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
              ...(a.cid ? { content_id: a.cid } : {}),
            })),
          }
        : {}),
    }
  );
  return { messageId: result.id, response: 'accepted by Resend' };
};

/**
 * Build (and cache) a transport for one port.
 *
 * The timeouts matter in production: several PaaS providers silently drop
 * outbound SMTP instead of refusing it, so without them a blocked port hangs
 * the send for minutes rather than failing with a usable error.
 */
const getTransporter = (port = config.email.port, secure = config.email.secure) => {
  const key = `${port}:${secure}`;
  if (!transports.has(key)) {
    transports.set(key, nodemailer.createTransport({
      host: config.email.host,
      port,
      secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    }));
  }
  return transports.get(key);
};

// Implicit TLS on 465 is the usual way around a provider that blocks 587.
const FALLBACK_PORT = 465;
const isFallbackAvailable = () => config.email.port !== FALLBACK_PORT;

/** Connection-level failures are worth retrying on the other port; auth errors are not. */
const isConnectionError = (err) => {
  const code = err?.code || '';
  return ['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ESOCKET', 'EDNS', 'ECONNECTION', 'EHOSTUNREACH']
    .includes(code) || /timeout|timed out/i.test(err?.message || '');
};

/**
 * Check that SMTP is reachable and the credentials are accepted.
 * Returns a plain result object so it can back both a startup log and an
 * admin-facing diagnostic endpoint.
 */
export const verifyEmailConnection = async () => {
  const provider = activeProvider();

  if (!isEmailConfigured()) {
    const message = provider === 'smtp'
      ? 'EMAIL_HOST, EMAIL_USER and EMAIL_PASSWORD are not all set.'
      : `${provider.toUpperCase()}_API_KEY and EMAIL_FROM are not both set.`;
    return { ok: false, provider, reason: 'not_configured', message };
  }

  // HTTP providers have no connection to open; the credentials are only
  // exercised on a real send, so report configuration rather than a false OK.
  if (provider !== 'smtp') {
    return {
      ok: true,
      provider,
      transport: 'https',
      message: provider === 'relay'
        ? 'Configured to send through the Supabase Edge Function relay over HTTPS. Use "Send Test" to confirm the relay and its SMTP credentials work.'
        : `Configured to send over the ${provider} HTTPS API. Use "Send Test" to confirm the key and sender are accepted.`,
    };
  }

  const attempts = [{ port: config.email.port, secure: config.email.secure }];
  if (isFallbackAvailable()) attempts.push({ port: FALLBACK_PORT, secure: true });

  const errors = [];
  for (const { port, secure } of attempts) {
    try {
      await getTransporter(port, secure).verify();
      return { ok: true, provider, transport: 'smtp', port, secure, host: config.email.host, user: config.email.user };
    } catch (err) {
      errors.push(`port ${port}: ${err.code || 'ERROR'} ${err.message}`);
      if (!isConnectionError(err)) break; // bad credentials fail the same way on every port
    }
  }

  return {
    ok: false,
    provider,
    transport: 'smtp',
    reason: 'unreachable',
    message: errors.join(' | '),
    host: config.email.host,
    hint: 'If every port times out, this host blocks outbound SMTP. Set MAILJET_API_KEY and MAILJET_API_SECRET to send over HTTPS instead.',
  };
};

/**
 * Send one message, returning whether it was actually delivered.
 *
 * Without SMTP settings this reports the skip loudly and returns false, so the
 * caller never records an email as sent that in truth was never dispatched.
 */
/** Turn a delivery error into a short, non-obvious-cause hint for the admin UI. */
const explainError = (err, provider = 'smtp') => {
  if (HTTP_PROVIDERS.includes(provider)) {
    if (provider === 'relay') {
      if (/unauthorized/i.test(err.message || '')) {
        return 'The relay rejected the shared secret. EMAIL_RELAY_SECRET here must match RELAY_SECRET set on the Edge Function.';
      }
      if (/not configured/i.test(err.message || '')) {
        return 'The Edge Function is missing its secrets. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD and RELAY_SECRET with "supabase secrets set".';
      }
      if (/username and password|invalid login|535/i.test(err.message || '')) {
        return 'Gmail rejected the credentials held by the relay. SMTP_PASSWORD must be a current App Password.';
      }
      return 'The relay was reached but delivery failed. See the raw error below.';
    }
    // A blocked account also answers 401, but the keys are fine and saying
    // "check your keys" sends you chasing the wrong thing.
    if (/blocked|suspend|under review/i.test(err.message || '')) {
      return `${provider} accepted the credentials but has put the account on hold, so it will not send. `
        + 'This is usually a new-account review. Contact their support to release it, or switch provider '
        + '(set BREVO_API_KEY) in the meantime.';
    }
    if (err.code === 'EAUTH') {
      return provider === 'mailjet'
        ? 'Mailjet rejected the credentials. Check MAILJET_API_KEY and MAILJET_API_SECRET.'
        : `The ${provider} API key was rejected. Check ${provider.toUpperCase()}_API_KEY.`;
    }
    if (/sender|from/i.test(err.message || '')) {
      return `${provider} refused the sender address. The EMAIL_FROM address must be verified in your ${provider} account first.`;
    }
    if (/domain|not verified|testing/i.test(err.message || '')) {
      return 'The sender domain is not verified, so this provider will only deliver to your own address. Verify a sender (Brevo) or a domain (Resend).';
    }
    return 'See the raw API response below.';
  }

  if (err.code === 'EAUTH') {
    return 'Gmail rejected the credentials. EMAIL_PASSWORD must be a current App Password (16 characters, no spaces), not the account password.';
  }
  if (err.responseCode === 550 || /blocked|spam/i.test(err.message || '')) {
    return 'The mail server accepted the connection but refused the message. Check that EMAIL_FROM matches EMAIL_USER.';
  }
  if (isConnectionError(err)) {
    return 'Could not reach the SMTP server. Most hosts that do this are blocking outbound SMTP; an HTTP email API (Resend, SendGrid) is the usual way around it.';
  }
  return 'See the attempt log below for the raw SMTP error.';
};

/**
 * Send one message, reporting exactly what happened on each port attempted.
 *
 * Returns a result object rather than a boolean so the admin diagnostics screen
 * can show the real SMTP error instead of "check the logs".
 */
const deliverDetailed = async (message, label) => {
  const attempts = [];

  if (!isEmailConfigured()) {
    if (!warnedUnconfigured) {
      console.warn(
        'EMAIL IS NOT CONFIGURED: set EMAIL_HOST, EMAIL_USER and EMAIL_PASSWORD. ' +
        'No order emails will be delivered until then.'
      );
      warnedUnconfigured = true;
    }
    console.warn(`Skipped ${label} to ${message.to} (no SMTP configured).`);
    return {
      ok: false,
      attempts,
      error: 'SMTP is not configured.',
      hint: 'Set EMAIL_HOST, EMAIL_USER and EMAIL_PASSWORD, then redeploy.',
    };
  }

  const payload = { from: config.email.from, ...message, html: normalizeHtml(message.html) };
  const provider = activeProvider();

  // HTTP providers are a single attempt: there is no port to fall back to.
  if (provider !== 'smtp') {
    const startedAt = Date.now();
    try {
      const send = {
        relay: sendViaRelay, mailjet: sendViaMailjet, brevo: sendViaBrevo, resend: sendViaResend,
      }[provider];
      const info = await send(payload);
      attempts.push({ provider, ok: true, ms: Date.now() - startedAt, response: info.response });
      console.log(`Sent ${label} to ${message.to} via ${provider}.`);
      return { ok: true, provider, attempts, via: { provider }, messageId: info.messageId };
    } catch (err) {
      const detail = `${err.code || 'ERROR'} ${err.message}`;
      attempts.push({ provider, ok: false, ms: Date.now() - startedAt, error: detail });
      console.error(`Failed to send ${label} to ${message.to} via ${provider}: ${detail}`);
      return { ok: false, provider, attempts, error: detail, hint: explainError(err, provider) };
    }
  }

  const ports = [{ port: config.email.port, secure: config.email.secure }];
  // A blocked port looks like a connection failure, so implicit TLS is worth a retry.
  if (isFallbackAvailable()) ports.push({ port: FALLBACK_PORT, secure: true });

  for (const [index, { port, secure }] of ports.entries()) {
    const startedAt = Date.now();
    try {
      const info = await getTransporter(port, secure).sendMail(payload);
      attempts.push({ port, secure, ok: true, ms: Date.now() - startedAt, response: info.response });
      console.log(`Sent ${label} to ${message.to} via port ${port}.`);

      if (index > 0) {
        console.warn(`Set EMAIL_PORT=${port} and EMAIL_SECURE=${secure} to skip the failed attempt next time.`);
      }
      return {
        ok: true,
        attempts,
        via: { port, secure },
        messageId: info.messageId,
        usedFallback: index > 0,
      };
    } catch (err) {
      const detail = `${err.code || 'ERROR'} ${err.message}`;
      attempts.push({ port, secure, ok: false, ms: Date.now() - startedAt, error: detail });
      console.error(`Failed to send ${label} to ${message.to} on port ${port}: ${detail}`);

      // Rejected credentials fail identically on every port, so stop here.
      if (!isConnectionError(err)) {
        return { ok: false, attempts, error: detail, hint: explainError(err) };
      }
    }
  }

  const last = attempts[attempts.length - 1];
  return {
    ok: false,
    attempts,
    error: last?.error || 'All SMTP attempts failed.',
    hint: 'Every port timed out, so this host is blocking outbound SMTP (Render blocks 25/465/587 on free web services). Set MAILJET_API_KEY and MAILJET_API_SECRET to send over HTTPS instead.',
  };
};

/** Boolean wrapper for the order emails, which only care whether it went out. */
const deliver = async (message, label) => (await deliverDetailed(message, label)).ok;

/**
 * Strip trailing whitespace and blank lines from generated HTML.
 *
 * Quoted-printable encodes a trailing space as "=20", and the template literals
 * below leave lines of pure indentation wherever a conditional block renders
 * empty. Those surfaced as literal "=20 =20" text in delivered mail.
 */
const normalizeHtml = (html) => String(html || '')
  .split('\n')
  .map(line => line.replace(/[ \t]+$/, ''))
  .filter(line => line.length > 0)
  .join('\n');

/**
 * Whether the active provider can render <img src="cid:..."> inline.
 * Brevo's API has no content-id support, so it falls back to the hosted URL.
 */
const supportsInlineImages = () => activeProvider() !== 'brevo';

/** Content id used for the embedded pickup QR. */
const QR_CID = 'pickupqr';

/**
 * Where the QR <img> should point.
 *
 * Embedding wins wherever it is supported: a hosted URL depends on the API
 * being awake and publicly reachable when the customer opens the mail, and on
 * free hosting that spins down when idle it frequently is not.
 */
const qrImageSrc = () => (supportsInlineImages() ? `cid:${QR_CID}` : null);

/** The customer's own order page, where the QR is always rendered in-app. */
const orderPageUrl = (order) => `${config.clientUrl}/orders/${order._id}`;

/** Absolute URL of an order's QR PNG, served by the API for email clients. */
const qrImageUrl = (order) => `${config.serverUrl}/api/orders/qr/${order.qrToken}.png`;

const formatCurrency = (amount) => `₹${amount.toFixed(2)}`;
const formatDate = (date) => date ? new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'TBD';

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
  .header { background: #f97316; color: #fff; padding: 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; }
  .content { padding: 24px; }
  .order-info { background: #fff7ed; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { background: #f9fafb; font-weight: 600; }
  .total-row { font-weight: 700; font-size: 16px; }
  .qr-section { text-align: center; padding: 20px; background: #f9fafb; border-radius: 8px; margin: 16px 0; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 14px; }
  .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
`;

const itemsTable = (order) => {
  const items = order.items || [];
  const subtotal = order.subtotal ?? order.totalAmount;
  const discount = order.discountAmount || 0;

  return `
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
    <tbody>
      ${items.map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${formatCurrency(i.price)}</td><td>${formatCurrency(i.price * i.quantity)}</td></tr>`).join('')}
      <tr><td colspan="3">Subtotal</td><td>${formatCurrency(subtotal)}</td></tr>
      ${discount > 0 ? `<tr style="color:#16a34a"><td colspan="3">Discount${order.coupon?.code ? ` (${order.coupon.code})` : ''}</td><td>-${formatCurrency(discount)}</td></tr>` : ''}
      <tr class="total-row"><td colspan="3">Total</td><td>${formatCurrency(order.totalAmount)}</td></tr>
    </tbody>
  </table>
`;
};

/** Restaurant name, address and phone for the email footer, from admin settings. */
const footerHtml = async (closingLine) => {
  let settings = null;
  try {
    settings = await Settings.getSettings();
  } catch (err) {
    console.warn('Could not load restaurant settings for email footer:', err.message);
  }

  const name = settings?.restaurantName || 'CloudKitchen';
  const loc = settings?.location;
  const address = [loc?.addressLine1, loc?.addressLine2, loc?.city, loc?.state, loc?.postalCode]
    .filter(Boolean).join(', ');
  const phone = settings?.contact?.phone;

  return `<div class="footer">
    <p>${closingLine.replace('CloudKitchen', name)}</p>
    ${address ? `<p>${address}</p>` : ''}
    ${phone ? `<p>Call us: ${phone}</p>` : ''}
  </div>`;
};

/**
 * Who should receive new-order alerts.
 *
 * ADMIN_EMAILS wins when set, so alerts can go to a shared inbox that is not a
 * login account. Otherwise every ADMIN user is notified, with the public
 * contact address as a last resort.
 */
const resolveAdminRecipients = async () => {
  if (config.email.adminEmails.length > 0) return config.email.adminEmails;

  try {
    const admins = await User.find({ role: 'ADMIN' }).select('email').lean();
    const emails = admins.map(a => a.email).filter(Boolean);
    if (emails.length > 0) return emails;
  } catch (err) {
    console.warn('Could not look up admin users for order alert:', err.message);
  }

  try {
    const settings = await Settings.getSettings();
    if (settings?.contact?.email) return [settings.contact.email];
  } catch {
    // Fall through to the empty list below.
  }

  return [];
};

export const emailService = {
  /** Plain deliverability check, used by the admin diagnostics endpoint. */
  async sendTestEmail(to) {
    const html = `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
      <div class="container">
        <div class="header"><h1>Email is working</h1></div>
        <div class="content">
          <p>This is a test message from your CloudKitchen server.</p>
          <div class="order-info">
            <p><strong>Sent from:</strong> ${config.serverUrl}</p>
            <p><strong>Environment:</strong> ${config.nodeEnv}</p>
            <p><strong>SMTP host:</strong> ${config.email.host}:${config.email.port}</p>
            <p><strong>Time:</strong> ${formatDate(new Date())}</p>
          </div>
          <p>Order confirmations and new-order alerts will be delivered from this address.</p>
        </div>
        ${await footerHtml('CloudKitchen')}
      </div>
    </body></html>`;

    return deliverDetailed({ to, subject: 'CloudKitchen - SMTP test', html }, 'test email');
  },

  async sendOrderConfirmation(order) {
    const qrBuffer = await qrService.generateQrBuffer(order.qrToken);

    const html = `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
      <div class="container">
        <div class="header"><h1>🍽️ CloudKitchen</h1><p>Order Confirmation</p></div>
        <div class="content">
          <p>Hi <strong>${order.customerName}</strong>,</p>
          <p>Your order has been placed successfully!</p>
          <div class="order-info">
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>Status:</strong> <span class="status-badge" style="background:#dbeafe;color:#1d4ed8;">PLACED</span></p>
            <p><strong>Estimated Pickup:</strong> ${formatDate(order.estimatedPickupTime)}</p>
          </div>
          ${itemsTable(order)}
          <div class="qr-section">
            <p><strong>Your Pickup QR Code</strong></p>
            <p style="color:#6b7280;font-size:13px;">Show this at pickup</p>
            <img src="${qrImageSrc() || qrImageUrl(order)}" alt="Pickup QR code" width="200" height="200" style="display:block;margin:0 auto;" />
            <p style="margin-top:14px;">
              <a href="${orderPageUrl(order)}" style="color:#ea580c;font-weight:600;text-decoration:none;">
                Can't see the code? Open your order &rarr;
              </a>
            </p>
          </div>
        </div>
        ${await footerHtml('Thank you for ordering from CloudKitchen!')}
      </div>
    </body></html>`;

    return deliver({
      to: order.customerEmail,
      subject: `CloudKitchen - Order Confirmed #${order.orderId}`,
      html,
      // Embedded in the body via cid, so it renders without fetching anything.
      attachments: [{
        filename: 'pickup-qr.png',
        content: qrBuffer,
        contentType: 'image/png',
        cid: QR_CID,
      }],
    }, `order confirmation #${order.orderId}`);
  },

  /**
   * Alert the kitchen that a new order has arrived.
   * Sent alongside the customer confirmation, never in place of it.
   */
  async sendNewOrderAdminNotification(order) {
    const recipients = await resolveAdminRecipients();
    if (recipients.length === 0) {
      console.warn(`No admin recipients configured; skipping alert for order ${order.orderId}.`);
      return false;
    }

    const adminOrderUrl = `${config.clientUrl}/admin/orders/${order._id}`;

    const html = `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
      <div class="container">
        <div class="header" style="background:#111827;"><h1>New Order Received</h1><p>#${order.orderId}</p></div>
        <div class="content">
          <div class="order-info">
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>Customer:</strong> ${order.customerName}</p>
            <p><strong>Email:</strong> <a href="mailto:${order.customerEmail}">${order.customerEmail}</a></p>
            <p><strong>Placed:</strong> ${formatDate(order.createdAt || new Date())}</p>
            <p><strong>Estimated Pickup:</strong> ${formatDate(order.estimatedPickupTime)}</p>
          </div>
          ${itemsTable(order)}
          <p style="text-align:center;margin:24px 0;">
            <a href="${adminOrderUrl}"
               style="background:#f97316;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;display:inline-block;">
              Open in Admin Panel
            </a>
          </p>
        </div>
        ${await footerHtml('CloudKitchen')}
      </div>
    </body></html>`;

    return deliver({
      to: recipients.join(', '),
      // Replies go to the customer, so the kitchen can just hit reply.
      replyTo: order.customerEmail,
      subject: `New Order #${order.orderId} - ${formatCurrency(order.totalAmount)} - ${order.customerName}`,
      html,
    }, `admin alert for #${order.orderId}`);
  },

  async sendOrderReadyNotification(order) {
    const qrBuffer = await qrService.generateQrBuffer(order.qrToken);

    const html = `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
      <div class="container">
        <div class="header" style="background:#16a34a;"><h1>🍽️ CloudKitchen</h1><p>Your Order is Ready!</p></div>
        <div class="content">
          <p>Hi <strong>${order.customerName}</strong>,</p>
          <p>Great news! Your order <strong>#${order.orderId}</strong> is ready for pickup!</p>
          <div class="order-info" style="background:#f0fdf4;">
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>Status:</strong> <span class="status-badge" style="background:#bbf7d0;color:#15803d;">READY FOR PICKUP</span></p>
            <p><strong>Pickup Time:</strong> ${formatDate(order.estimatedPickupTime)}</p>
          </div>
          <div class="qr-section">
            <p><strong>Show this QR code at the counter</strong></p>
            <img src="${qrImageSrc() || qrImageUrl(order)}" alt="Pickup QR code" width="200" height="200" style="display:block;margin:0 auto;" />
            <p style="margin-top:14px;">
              <a href="${orderPageUrl(order)}" style="color:#ea580c;font-weight:600;text-decoration:none;">
                Can't see the code? Open your order &rarr;
              </a>
            </p>
          </div>
          ${itemsTable(order)}
        </div>
        ${await footerHtml('Thank you for ordering from CloudKitchen!')}
      </div>
    </body></html>`;

    return deliver({
      to: order.customerEmail,
      subject: `CloudKitchen - Order #${order.orderId} Ready for Pickup! 🎉`,
      html,
      // Embedded in the body via cid, so it renders without fetching anything.
      attachments: [{
        filename: 'pickup-qr.png',
        content: qrBuffer,
        contentType: 'image/png',
        cid: QR_CID,
      }],
    }, `ready notification #${order.orderId}`);
  },

  async sendOrderCancellationNotification(order) {
    const html = `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
      <div class="container">
        <div class="header" style="background:#dc2626;"><h1>🍽️ CloudKitchen</h1><p>Order Cancelled</p></div>
        <div class="content">
          <p>Hi <strong>${order.customerName}</strong>,</p>
          <p>We're sorry, but your order <strong>#${order.orderId}</strong> has been cancelled.</p>
          <div class="order-info" style="background:#fef2f2;">
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>Status:</strong> <span class="status-badge" style="background:#fecaca;color:#b91c1c;">CANCELLED</span></p>
          </div>
          ${itemsTable(order)}
          <p>If you have questions, please contact us.</p>
        </div>
        ${await footerHtml('CloudKitchen')}
      </div>
    </body></html>`;

    return deliver({
      to: order.customerEmail,
      subject: `CloudKitchen - Order #${order.orderId} Cancelled`,
      html,
    }, `cancellation notice #${order.orderId}`);
  },
};
