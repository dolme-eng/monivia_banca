import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    testTimeout: 10000,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'e2e/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
