import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react', '@headlessui/react'],
        }
      }
    }
  },
  optimizeDeps: {
    exclude: [],
  },
  server: {
    headers: {
      'Service-Worker-Allowed': '/'
    }
  }
});
