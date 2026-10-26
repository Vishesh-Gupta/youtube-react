/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

import { apiServer } from './server/dev.ts'

export default defineConfig(({ mode }) => {
  // The key stays on the server side: only VITE_-prefixed variables reach the browser.
  const { YOUTUBE_API_KEY } = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), apiServer(YOUTUBE_API_KEY || undefined)],
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
  }
})
