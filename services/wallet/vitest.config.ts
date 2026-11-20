import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.ts'],
    fileParallelism: false, // semua tes memakai satu database
    testTimeout: 20_000,
  },
});
