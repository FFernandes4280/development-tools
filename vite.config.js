import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills()
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/web-components/entry.js'),
      formats: ['es'],
      fileName: () => 'json-formatter.esm.js'
    },
    rollupOptions: {
      external: [],
      output: {
        inlineDynamicImports: true,
        assetFileNames: 'assets/[name][extname]'
      }
    },
    sourcemap: false,
    cssCodeSplit: false,
    cssInline: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    include: ['monaco-editor']
  }
})
