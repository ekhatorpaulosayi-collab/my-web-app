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
    // Code splitting for faster loading
    rollupOptions: {
      output: {
        // Add timestamp to force cache invalidation on every build
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`,
        manualChunks: {
          // Split vendor code
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-icons': ['lucide-react'],
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
