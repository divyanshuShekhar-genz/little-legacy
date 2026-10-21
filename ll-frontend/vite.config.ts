import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend the dev server proxies to. Defaults to the local API; set API_PROXY_TARGET to point a
// second dev server at another backend (e.g. a test instance on :4100) without touching :4000.
const backend = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // API calls (/api) and uploaded files (/uploads) are proxied to the backend in development.
    proxy: { '/api': backend, '/uploads': backend },
  },
});
