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

const defaultUrl = 'https://mfkoksauazfzwfxcmknd.supabase.co';
const defaultAnonKey = 'sb_publishable_cwyJBSbB7aVY_-kyE7_SFg_7JBgQH9D';
const defaultMongoUri = 'mongodb+srv://aditya415110_db_user:Aditya9322@cluster0.1y3ikr1.mongodb.net/cloudkitchen?retryWrites=true&w=majority&appName=Cluster0';

const config = {
  port: env('PORT', 5000),
  mongoUri: env('MONGODB_URI', defaultMongoUri),
  supabase: {
    url: env('SUPABASE_URL', defaultUrl),
    anonKey: env('SUPABASE_ANON_KEY', defaultAnonKey),
    serviceRoleKey: env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_ANON_KEY') || defaultAnonKey,
  },
  jwt: {
    secret: env('JWT_SECRET', 'change-this-in-production'),
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
  },
  clientUrl: env('CLIENT_URL', 'http://localhost:5173'),
  serverUrl: env('SERVER_URL', 'http://localhost:5000'),
  nodeEnv: env('NODE_ENV', 'development'),
};

export default config;
