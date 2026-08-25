import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'

// In dev mode (npm run dev), redirect requests for json-formatter.esm.js to the source entry point
const devWebComponentPlugin = () => ({
  name: 'dev-web-component-entry',
  apply: 'serve',
  resolveId(id) {
    if (id.endsWith('json-formatter.esm.js')) {
      return path.resolve(__dirname, 'src/web-components/entry.js')
    }
  }
})

export default defineConfig({
  base: '/development-tools/',
  
  plugins: [
    devWebComponentPlugin(),
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