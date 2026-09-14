/**
 * SMTP relay running on Supabase Edge Functions.
 *
 * Why this exists: Render's free web services block outbound traffic to SMTP
 * ports 25, 465 and 587, so the API server cannot talk to Gmail directly.
 * Supabase Edge Functions *do* allow outbound SMTP on port 465, so the API
 * server posts a message here over ordinary HTTPS and this function performs
 * the actual SMTP delivery.
 *
 * Ports 25 and 587 are blocked by the Deno runtime, so this is 465-only.
 *
 * Deploy via the dashboard (Edge Functions -> Deploy a new function -> editor)
 * or the CLI (supabase functions deploy send-email). See README.md.
 *
 * Secrets (dashboard: Edge Functions -> Secrets, or `supabase secrets set`):
 *   SMTP_HOST      smtp.gmail.com
 *   SMTP_PORT      465
 *   SMTP_USER      your-address@gmail.com
 *   SMTP_PASSWORD  Gmail App Password, 16 chars, no spaces
 *   RELAY_SECRET   long random string, must match the API server
 */

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

interface Attachment {
  filename: string;
  contentBase64: string;
  contentType?: string;
  /** Set to embed the file in the body via <img src="cid:VALUE">. */
  contentId?: string;
}

interface RelayRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: Attachment[];
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/** Constant-time comparison so the shared secret cannot be guessed by timing. */
const secretMatches = (provided: string, expected: string): boolean => {
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Use POST.' }, 405);

  const relaySecret = Deno.env.get('RELAY_SECRET');
  if (!relaySecret) {
    return json({ ok: false, error: 'RELAY_SECRET is not configured on the function.' }, 500);
  }

  // Without this check the function would be an open relay that anyone could
  // use to send mail from your Gmail account.
  const provided = req.headers.get('x-relay-secret') ?? '';
  if (!secretMatches(provided, relaySecret)) {
    return json({ ok: false, error: 'Unauthorized.' }, 401);
  }

  let payload: RelayRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: 'Body must be JSON.' }, 400);
  }

  if (!payload.to || !payload.subject || !payload.html) {
    return json({ ok: false, error: 'to, subject and html are all required.' }, 400);
  }

  const host = Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com';
  // 465 is the only SMTP port the runtime permits outbound.
  const port = Number(Deno.env.get('SMTP_PORT') ?? '465');
  const user = Deno.env.get('SMTP_USER');
  const password = Deno.env.get('SMTP_PASSWORD');

  if (!user || !password) {
    return json({ ok: false, error: 'SMTP_USER and SMTP_PASSWORD are not configured on the function.' }, 500);
  }

  const client = new SMTPClient({
    connection: {
      hostname: host,
      port,
      tls: true, // implicit TLS; required on 465
      auth: { username: user, password },
    },
  });

  try {
    await client.send({
      from: payload.from ?? user,
      to: payload.to.split(',').map(a => a.trim()).filter(Boolean),
      subject: payload.subject,
      html: payload.html,
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
      ...(payload.attachments?.length
        ? {
            attachments: payload.attachments.map(a => ({
              filename: a.filename,
              encoding: 'base64' as const,
              content: a.contentBase64,
              contentType: a.contentType ?? 'application/octet-stream',
              // With a contentID the part is referenced from the HTML and shown
              // inline, rather than listed as a separate download.
              ...(a.contentId ? { contentID: a.contentId } : {}),
            })),
          }
        : {}),
    });

    return json({ ok: true, via: `${host}:${port}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('SMTP relay failed:', message);
    // 502: this function worked, the upstream mail server is what failed.
    return json({ ok: false, error: message }, 502);
  } finally {
    // Leaving the connection open exhausts the function's socket budget.
    try { await client.close(); } catch { /* already closed */ }
  }
});
