import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 1420,
    strictPort: true,
    // Proxy API requests to the Express backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  clearScreen: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
