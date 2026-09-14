import nodemailer from 'nodemailer';
import config from '../config/index.js';
import { qrService } from './qrService.js';
import Settings from '../models/Settings.js';
import User from '../models/User.js';

let transporter = null;
let warnedUnconfigured = false;

/** SMTP is only usable once a host and credentials are present. */
const isEmailConfigured = () =>
  Boolean(config.email.host && config.email.user && config.email.password);

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }
  return transporter;
};

/**
 * Send one message, returning whether it was actually delivered.
 *
 * Without SMTP settings this reports the skip loudly and returns false, so the
 * caller never records an email as sent that in truth was never dispatched.
 */
const deliver = async (message, label) => {
  if (!isEmailConfigured()) {
    if (!warnedUnconfigured) {
      console.warn(
        'EMAIL IS NOT CONFIGURED: set EMAIL_HOST, EMAIL_USER and EMAIL_PASSWORD in server/.env. ' +
        'No order emails will be delivered until then.'
      );
      warnedUnconfigured = true;
    }
    console.warn(`Skipped ${label} to ${message.to} (no SMTP configured).`);
    return false;
  }

  try {
    await getTransporter().sendMail({ from: config.email.from, ...message });
    console.log(`Sent ${label} to ${message.to}`);
    return true;
  } catch (err) {
    console.error(`Failed to send ${label} to ${message.to}:`, err.message);
    return false;
  }
};

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
            <img src="cid:qrcode" alt="QR Code" width="200" height="200" />
          </div>
        </div>
        ${await footerHtml('Thank you for ordering from CloudKitchen!')}
      </div>
    </body></html>`;

    return deliver({
      to: order.customerEmail,
      subject: `CloudKitchen - Order Confirmed #${order.orderId}`,
      html,
      attachments: [{
        filename: 'qrcode.png',
        content: qrBuffer,
        cid: 'qrcode',
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
            <img src="cid:qrcode" alt="QR Code" width="200" height="200" />
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
      attachments: [{
        filename: 'qrcode.png',
        content: qrBuffer,
        cid: 'qrcode',
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
