import dotenv from 'dotenv';
dotenv.config();

/**
 * Read an env var, stripping a wrapping pair of quotes.
 *
 * Dashboard UIs (Render, Railway) store values literally, so a value pasted as
 * `"CloudKitchen <me@gmail.com>"` keeps its quotes and produces an invalid
 * From header. dotenv strips them locally, which is why this only bites in
 * production.
 */
const env = (key, fallback = undefined) => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;

  const trimmed = raw.trim();
  const isQuoted = trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
     (trimmed.startsWith("'") && trimmed.endsWith("'")));

  return isQuoted ? trimmed.slice(1, -1) : trimmed;
};

/**
 * Required at startup. Fail loudly rather than falling back to a hardcoded
 * value: a committed default is a credential in the git history, and it also
 * lets a misconfigured deploy quietly write to the wrong database.
 */
const required = (key) => {
  const value = env(key);
  if (!value) {
    throw new Error(
      `${key} is not set. Define it in server/.env for local development, ` +
      "or in the host's environment variables for a deployment."
    );
  }
  return value;
};

/**
 * Treat an unreplaced template value as unset.
 *
 * A placeholder like YOUR_SUPABASE_SERVICE_ROLE_KEY is a non-empty string, so
 * it gets used as a real credential and fails deep inside the client with
 * something opaque ("Invalid Compact JWS") rather than at startup.
 */
const notPlaceholder = (value) => {
  if (!value) return '';
  const looksUnreplaced = /^(YOUR_|<|xxx+$|changeme$|replace)/i.test(value) || value.includes('_HERE');
  return looksUnreplaced ? '' : value;
};

const config = {
  port: env('PORT', 5000),
  mongoUri: required('MONGODB_URI'),
  supabase: {
    url: required('SUPABASE_URL'),
    // The anon key is publishable by design; it ships in the browser bundle.
    anonKey: required('SUPABASE_ANON_KEY'),
    serviceRoleKey: notPlaceholder(env('SUPABASE_SERVICE_ROLE_KEY')),
  },
  jwt: {
    // Unused: authentication is handled entirely by Supabase JWT verification
    // in middleware/auth.js. Kept only so a future local-token feature has a
    // home; not required, so it cannot block startup.
    secret: env('JWT_SECRET', ''),
    expiresIn: '7d',
  },
  email: {
    host: env('EMAIL_HOST'),
    port: parseInt(env('EMAIL_PORT', '587'), 10),
    secure: env('EMAIL_SECURE') === 'true',
    user: env('EMAIL_USER'),
    password: env('EMAIL_PASSWORD'),
    from: env('EMAIL_FROM', 'CloudKitchen <noreply@cloudkitchen.com>'),
    // Comma-separated override for who receives new-order alerts. When unset,
    // alerts go to every user with the ADMIN role.
    adminEmails: env('ADMIN_EMAILS', '')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean),

    // Delivery mechanism: 'auto' picks an HTTP provider when its key is set and
    // falls back to SMTP. Hosts that block outbound SMTP ports (Render's free
    // tier blocks 25/465/587) can only deliver over HTTPS.
    provider: env('EMAIL_PROVIDER', 'auto').toLowerCase(),
    // Supabase Edge Function acting as an SMTP relay, for hosts that block
    // outbound SMTP but allow HTTPS.
    relayUrl: env('EMAIL_RELAY_URL'),
    relaySecret: env('EMAIL_RELAY_SECRET'),
    mailjetApiKey: env('MAILJET_API_KEY'),
    mailjetApiSecret: env('MAILJET_API_SECRET'),
    brevoApiKey: env('BREVO_API_KEY'),
    resendApiKey: env('RESEND_API_KEY'),
  },
  clientUrl: env('CLIENT_URL', 'http://localhost:5173'),
  serverUrl: env('SERVER_URL', 'http://localhost:5000'),
  nodeEnv: env('NODE_ENV', 'development'),
};

export default config;
