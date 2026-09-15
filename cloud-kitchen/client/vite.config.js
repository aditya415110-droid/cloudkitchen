import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/** Build-time vars the app cannot run without. */
const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

export default defineConfig(({ mode }) => {
  // Vite inlines VITE_* at build time, so a missing one produces a bundle that
  // is broken for every visitor. Fail the build instead of shipping it.
  const env = loadEnv(mode, process.cwd(), '');
  const missing = REQUIRED.filter(key => !env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing build-time environment variable(s): ${missing.join(', ')}.\n` +
      'Add them to client/.env locally, or to the host build environment.\n' +
      'These are public values baked into the bundle - never put a secret in a VITE_ variable.'
    );
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:5000',
        '/socket.io': {
          target: 'http://localhost:5000',
          ws: true,
        },
      },
    },
  };
});
