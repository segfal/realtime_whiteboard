import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
    // ✅ EXCLUDE E2E TESTS - This is the key fix
    exclude: [
      'node_modules/',
      'tests/e2e/**',           // Exclude Playwright tests
      '**/*.e2e.spec.ts',       // Exclude E2E spec files
      '**/*.e2e.test.ts',       // Exclude E2E test files
      '**/*.config.*',
      '**/coverage/**',
    ],
    // ✅ INCLUDE ONLY UNIT/INTEGRATION TESTS
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
      ],
    },
    // Windows-specific settings
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Add CSS mock
      '\\.css$': 'identity-obj-proxy',
    },
  },
});
