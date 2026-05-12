import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'packages/renderer',
  server: {
    port: 5173,
  },
  build: {
    outDir: '../../dist/renderer',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'packages/renderer/src'),
    },
  },
  css: {
    postcss: './packages/renderer/postcss.config.js',
  },
})
