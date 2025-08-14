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
    hmr: false, // Disable WebSocket-based Hot Module Replacement
    watch: {
      usePolling: true // Use file system polling instead of WebSocket-based watching
    },
    proxy: {
      '/api': {
        target: 'http://backend:3001', // Use the service name
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://backend:3001', // Use the service name
        changeOrigin: true,
      }
    }
  },
  // Disable all WebSocket-related features
  define: {
    __VITE_DISABLE_WS__: true
  },
  // Additional WebSocket disabling
  optimizeDeps: {
    exclude: ['ws', 'websocket']
  }
})
// --- END OF SERVER CONFIGURATION BLOCK ---