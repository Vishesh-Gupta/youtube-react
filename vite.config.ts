/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { demoApi } from './demo/plugin.ts'

export default defineConfig({
  // Until a server holds the API key, development serves sample results.
  plugins: [react(), demoApi()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
})
