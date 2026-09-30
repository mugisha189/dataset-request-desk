import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// One deployable: the API serves this build as static files (see backend/app/main.py), so the
// build output goes straight into backend/app/static rather than a dist/ folder that then has
// to be copied there by hand. Locally, `npm run dev` proxies /api to the FastAPI server instead,
// so there is no CORS to configure and the cookie the API sets is same-origin either way.
export default defineConfig({
  // The API mounts the built assets under /static (see backend/app/main.py) and serves
  // index.html itself at /, so asset URLs the built HTML/JS emit need that prefix.
  base: '/static/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../backend/app/static'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
