import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@remote': path.resolve(__dirname, './src-remote'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/__test__/*.test.{ts,tsx}', 'src-remote/**/__test__/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup-localStorage.ts', './src/test/setup-tauri.ts'],
  },
});
