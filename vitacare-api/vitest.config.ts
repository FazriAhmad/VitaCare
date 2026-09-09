import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000,
    // Tanpa ini, hasil `npm run build` di dist/ ikut ter-scan dan tiap test jalan dobel.
    exclude: ['**/node_modules/**', 'dist/**'],
  },
})
