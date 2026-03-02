import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  build: {
    lib: {
      entry: 'src/web-components/entry.js',
      formats: ['es'],
      fileName: () => 'wev-my-plans.esm.js'
    },
    rollupOptions: {
      external: []
    },
    cssCodeSplit: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
