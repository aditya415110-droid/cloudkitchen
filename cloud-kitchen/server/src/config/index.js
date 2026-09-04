import dotenv from 'dotenv';
dotenv.config();

const defaultUrl = 'https://mfkoksauazfzwfxcmknd.supabase.co';
const defaultAnonKey = 'sb_publishable_cwyJBSbB7aVY_-kyE7_SFg_7JBgQH9D';
const defaultMongoUri = 'mongodb+srv://aditya415110_db_user:Aditya9322@cluster0.1y3ikr1.mongodb.net/cloudkitchen?retryWrites=true&w=majority&appName=Cluster0';

const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || defaultMongoUri,
  supabase: {
    url: process.env.SUPABASE_URL || defaultUrl,
    anonKey: process.env.SUPABASE_ANON_KEY || defaultAnonKey,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || defaultAnonKey,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-in-production',
    expiresIn: '7d',
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'CloudKitchen <noreply@cloudkitchen.com>',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || 'http://localhost:5000',
  nodeEnv: process.env.NODE_ENV || 'development',
};

export default config;
