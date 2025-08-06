import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // --- ADD THIS SERVER CONFIGURATION BLOCK ---
  server: {
    proxy: {
      // Any request starting with /api will be proxied to the backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Any request starting with /uploads will also be proxied
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
