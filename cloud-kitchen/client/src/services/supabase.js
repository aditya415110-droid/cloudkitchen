import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://mfkoksauazfzwfxcmknd.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_cwyJBSbB7aVY_-kyE7_SFg_7JBgQH9D";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
