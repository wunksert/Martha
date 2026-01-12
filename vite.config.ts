import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'ui',
  build: {
    outDir: '../dist/ui',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        'recipes-list': resolve(__dirname, 'ui/recipes-list.html'),
        'todo-widget': resolve(__dirname, 'ui/todo-widget.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  server: {
    port: 5173,
    cors: true
  }
});
