import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    include: [
      'src/**/__tests__/**/*.test.ts',
      'lib/**/__tests__/**/*.test.ts',
      'components/detail/__tests__/**/*.test.{ts,tsx}',
      'components/dashboard/__tests__/**/*.test.{ts,tsx}',
      'components/control-bar/__tests__/**/*.test.{ts,tsx}',
      'components/gantt/__tests__/**/*.test.{ts,tsx}',
      'components/ops/__tests__/**/*.test.{ts,tsx}',
      'components/map/__tests__/**/*.test.{ts,tsx}',
      'app/api/**/__tests__/**/*.test.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: [
      { find: '@/lib/ssot', replacement: path.resolve(__dirname, './lib/ssot') },
      { find: '@/lib', replacement: path.resolve(__dirname, './lib') },
      { find: '@/src', replacement: path.resolve(__dirname, './src') },
      { find: '@/app', replacement: path.resolve(__dirname, './app') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
});
