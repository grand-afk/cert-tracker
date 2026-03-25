import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/cert-tracker/',
  plugins: [react()],
  cacheDir: '/tmp/vite-cert-cache',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    pool: 'vmForks',
    cache: { dir: '/tmp/vitest-cert-cache' },
  },
})
