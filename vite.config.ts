import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages project URL: https://guzzler.github.io/QuietNote/
  // Vite applies base in dev too — the dev server serves at /QuietNote/.
  base: '/QuietNote/',
  plugins: [react()],
  server: {
    host: '127.0.0.1'
  }
})
