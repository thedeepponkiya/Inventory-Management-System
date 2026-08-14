import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Binds to 0.0.0.0 (not just localhost) so the dev server is reachable from other
    // devices on the same WiFi network (e.g. a phone, to test the mobile UI) via this
    // machine's LAN IP.
    host: true,
    // Forwards same-origin /api and /uploads requests to the backend - see
    // frontend/src/services/apiConfig.ts, which now always uses relative URLs instead of a
    // hardcoded host:port, so this proxy is what actually reaches the backend in dev (a
    // production reverse proxy, e.g. Nginx, does the equivalent forwarding after build).
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
})
