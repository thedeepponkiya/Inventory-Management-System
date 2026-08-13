import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // host: true binds the dev server to 0.0.0.0 (not just localhost) so it's reachable from
  // other devices on the same WiFi network (e.g. a phone, to test the mobile UI) via this
  // machine's LAN IP - see frontend/src/services/apiConfig.ts for the matching API base URL
  // fix (also derived from the page's own hostname instead of a hardcoded "localhost").
  server: {
    host: true,
  },
})
