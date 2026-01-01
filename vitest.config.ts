import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    exclude: ['node_modules', '.next', '__tests__/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'lib/domain/**/*.ts',
        'lib/infrastructure/**/*.ts',
        'lib/shared/**/*.ts',
        'lib/utils.ts',
        'app/api/**/*.ts',
        'components/**/*.tsx',
        'hooks/**/*.ts',
        'stores/**/*.ts',
      ],
      exclude: ['**/*.d.ts', '**/*.test.ts', '**/*.test.tsx'],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
