import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: path.resolve(__dirname, 'examples/playground'),
  resolve: {
    alias: {
      '@ahamed/bengali-ime': path.resolve(__dirname, 'src/index.ts'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'examples/playground/dist'),
    emptyOutDir: true,
    sourcemap: true,
  },
});
