import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  base: '/todo-list/',
  server: {
    port: 5173,
    open: true
  },
  build: {
    // Code splitting and chunk optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Core modules - eager loaded
          'core': [
            './src/core/DOMManager.js',
            './src/core/APIClient.js',
            './src/core/PerformanceMonitor.js',
            './src/core/MemoryManager.js'
          ],
          // Feature modules - lazy loaded
          'auth': ['./src/features/AuthModule.js'],
          'ai': ['./src/features/AIAssistant.js'],
          'reminders': ['./src/features/ReminderSystem.js'],
          'tasks': ['./src/features/TaskManager.js'],
          // Utilities
          'utils': [
            './src/utils/AnimationEngine.js',
            './src/utils/StorageManager.js'
          ]
        },
        // Chunk naming for better debugging
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name
          return `assets/${name}-[hash].js`
        }
      },
      // Warn about large chunks
      onwarn(warning, warn) {
        // Warn if chunk size exceeds 200KB
        if (warning.code === 'CHUNK_SIZE_EXCEEDED') {
          console.warn(`⚠️ Warning: ${warning.message}`)
        }
        warn(warning)
      }
    },
    // Tree-shaking and minification
    minify: 'esbuild', // Use esbuild for faster builds
    // Source maps for development only
    sourcemap: process.env.NODE_ENV === 'development',
    // Chunk size warnings
    chunkSizeWarningLimit: 200, // 200KB warning threshold
    // Enable gzip compression reporting
    reportCompressedSize: true,
    // Target modern browsers for better tree-shaking
    target: 'es2015'
  },
  plugins: [
    // Build size analysis
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap' // Visual representation of bundle
    }),
    // Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files > 10KB
      deleteOriginFile: false
    })
  ]
})
