import { createClient } from '@supabase/supabase-js';

/**
 * Both of these are public by design.
 *
 * Vite inlines `import.meta.env.VITE_*` into the bundle at build time, so these
 * values ship in the JavaScript whether they come from an env var or a literal.
 * That is fine: the publishable key only identifies the project. What data it
 * can reach is decided by Row Level Security and bucket policies on Supabase,
 * and by the API server verifying the user's JWT on every request.
 *
 * There is deliberately no fallback. A hardcoded default would let a
 * misconfigured deploy point the browser at the wrong Supabase project while
 * the API server talks to the right one - the two halves would disagree about
 * who is signed in, and the failure would look like a random auth bug.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set at build time. ' +
    'Add them to client/.env for local development, or to the build environment ' +
    'of the host. They are read when the bundle is built, not at runtime.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
