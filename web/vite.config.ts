import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The deployed stack serves the SPA and the API from one origin (nginx proxies
// /api and /sanctum to Laravel, AD-1). In dev, Vite plays that role: it proxies
// the same paths to `php artisan serve`, so the browser still sees one origin.
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: apiTarget },
      '/sanctum': { target: apiTarget },
    },
  },
})
