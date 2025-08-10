import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // --- ADD THIS SERVER CONFIGURATION BLOCK ---
  server: {
    host: true,
    allowedHosts: ['bayyena.com', 'www.bayyena.com'], // Needed for Docker
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Use the service name
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001', // Use the service name
        changeOrigin: true,
      }
    }
  }
})
// --- END OF SERVER CONFIGURATION BLOCK ---