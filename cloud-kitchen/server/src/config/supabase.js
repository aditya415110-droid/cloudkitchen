import { createClient } from '@supabase/supabase-js';
import config from './index.js';

// config already requires these, so no hardcoded fallbacks are needed here.
const supabaseUrl = config.supabase.url;
const anonKey = config.supabase.anonKey;

// Storage writes need the service role key. Falling back to the anon key keeps
// reads working, but uploads will fail until SUPABASE_SERVICE_ROLE_KEY is set.
if (!config.supabase.serviceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set: menu image uploads will fail.');
}

// Server-side client, ideally with the service role key
export const supabaseAdmin = createClient(supabaseUrl, config.supabase.serviceRoleKey || anonKey);

// Client for verifying user tokens
export const supabaseAuth = createClient(supabaseUrl, anonKey);
