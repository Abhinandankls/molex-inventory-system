
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react()
  ],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
        output: {
            manualChunks(id) {
                if (id.includes('node_modules')) {
                    if (id.includes('react') || id.includes('react-dom')) {
                        return 'vendor-react';
                    }
                    if (id.includes('exceljs')) {
                        return 'vendor-excel';
                    }
                    if (id.includes('@supabase')) {
                        return 'vendor-db';
                    }
                    return 'vendor-utils';
                }
            }
        }
    }
  },
  server: {
    host: true, 
    port: 3000,
    https: false, 
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
