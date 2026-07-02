import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src-remote',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@remote': path.resolve(__dirname, './src-remote'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'src-tauri/remote-dist'),
    emptyOutDir: true,
    target: 'es2020',
    minify: 'esbuild',
  },
});
