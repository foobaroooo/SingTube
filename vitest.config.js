import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.js', '**/*.spec.js'],
    exclude: ['node_modules', 'dist', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.js',
        '**/*.spec.js',
        'vite.config.ts',
        'vitest.config.js'
      ]
    },
    // Run tests in watch mode by default during development
    watch: false, // Set to true if you want watch mode by default
    silent: false,
    reporters: ['verbose']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
