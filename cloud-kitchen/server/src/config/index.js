import dotenv from 'dotenv';
dotenv.config();

/**
 * Read an env var, stripping a wrapping pair of quotes.
 *
 * Dashboard UIs (Render, Railway) store values literally, so a value pasted as
 * `"LEBELL <me@gmail.com>"` keeps its quotes and produces an invalid
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
 * Accept a Supabase API key only if it has a usable shape.
 *
 * Supabase keys are either a JWT (three dot-separated segments) or the newer
 * `sb_secret_` / `sb_publishable_` format. Anything else - an unreplaced
 * placeholder, a project ref pasted by mistake, a truncated copy - is sent as a
 * credential and fails deep inside the storage client with an opaque
 * "Invalid Compact JWS" at upload time. Rejecting it here turns that into one
 * clear warning at startup, and lets the caller fall back to the anon key.
 */
const validSupabaseKey = (value, label) => {
  if (!value) return '';

  const isJwt = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
  const isNewFormat = /^sb_(secret|publishable)_[A-Za-z0-9_-]+$/.test(value);

  if (isJwt || isNewFormat) return value;

  console.warn(
    `${label} does not look like a Supabase key and will be ignored. ` +
    'Expected a JWT (three dot-separated parts) or an sb_secret_... value ' +
    'from Supabase > Settings > API.'
  );
  return '';
};

/**
 * Drop any trailing slash from a base URL.
 *
 * These are concatenated as `${base}/path`, so a value pasted with a trailing
 * slash produces a double slash in links - which is how the "//admin/orders"
 * in the order emails happened.
 */
const baseUrl = (value) => String(value || '').replace(/\/+$/, '');

const config = {
  port: env('PORT', 5000),
  mongoUri: required('MONGODB_URI'),
  supabase: {
    url: required('SUPABASE_URL'),
    // The anon key is publishable by design; it ships in the browser bundle.
    anonKey: required('SUPABASE_ANON_KEY'),
    serviceRoleKey: validSupabaseKey(env('SUPABASE_SERVICE_ROLE_KEY'), 'SUPABASE_SERVICE_ROLE_KEY'),
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
    from: env('EMAIL_FROM', 'LEBELL <noreply@lebell.com>'),
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
  clientUrl: baseUrl(env('CLIENT_URL', 'http://localhost:5173')),
  serverUrl: baseUrl(env('SERVER_URL', 'http://localhost:5000')),
  nodeEnv: env('NODE_ENV', 'development'),
};

export default config;
