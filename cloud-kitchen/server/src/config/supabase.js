import { createClient } from '@supabase/supabase-js';
import config from './index.js';

const supabaseUrl = config.supabase.url || 'https://mfkoksauazfzwfxcmknd.supabase.co';
const serviceRoleOrAnonKey = config.supabase.serviceRoleKey || config.supabase.anonKey || 'sb_publishable_cwyJBSbB7aVY_-kyE7_SFg_7JBgQH9D';
const anonKey = config.supabase.anonKey || 'sb_publishable_cwyJBSbB7aVY_-kyE7_SFg_7JBgQH9D';

// Server-side client with service role key (or fallback key)
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleOrAnonKey);

// Client for verifying user tokens
export const supabaseAuth = createClient(supabaseUrl, anonKey);
