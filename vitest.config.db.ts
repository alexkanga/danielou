import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for DB integration tests.
 *
 * Uses setup-db.ts which mocks @/lib/db with postgres-js driver,
 * enabling tests to run against a standard PostgreSQL service container
 * in GitHub Actions CI.
 */
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/tests/setup-db.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
