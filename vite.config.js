import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Gzip compression for production
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br)$/, /\.(gz)$/]
    }),
    // Brotli compression for production (better compression)
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br)$/, /\.(gz)$/]
    })
  ],
  server: {
    port: 4000,
    strictPort: true,
    host: '0.0.0.0', // Bind to all network interfaces for WSL2
    hmr: {
      host: 'localhost'
    }
  },
  build: {
    // The landing page should not download receipt/PDF code.
    modulePreload: false,
    // Code splitting for faster loading
    rollupOptions: {
      output: {
        // Add timestamp to force cache invalidation on every build
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`,
        manualChunks(id) {
          if (id.includes('preload-helper')) return 'preload';
          if (!id.includes('node_modules')) return undefined;
          if (
            id.includes('jspdf') ||
            id.includes('html2canvas') ||
            id.includes('canvg') ||
            id.includes('dompurify') ||
            id.includes('fflate') ||
            id.includes('fast-png') ||
            id.includes('/pako/') ||
            id.includes('file-saver')
          ) return 'vendor-pdf';
          if (id.includes('chart.js') || id.includes('react-chartjs')) return 'vendor-charts';
          if (id.includes('firebase')) return 'vendor-firebase';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('@sentry')) return 'vendor-sentry';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('papaparse')) return 'vendor-csv';
          if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/') || id.includes('scheduler')) return 'vendor-react';
          return undefined;
        }
      }
    },
    // Reduce chunk size warning limit
    chunkSizeWarningLimit: 600,
    // Minify for production with esbuild (faster than terser)
    minify: 'esbuild',
    target: 'es2015'
  }
})
