import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // VITE_BASE_URL is set by the GitHub Actions workflow so the built assets
  // resolve correctly at  https://<user>.github.io/<repo>/
  base: process.env.VITE_BASE_URL || '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
  },
})
