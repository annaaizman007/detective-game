import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Static hosting: the whole game is one page plus hashed chunks. Phaser is
// split into its own chunk so a code change never re-downloads the engine.
export default defineConfig({
  base: './',
  publicDir: 'public',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@assets': fileURLToPath(new URL('./public/assets', import.meta.url)),
    },
  },
  server: { port: 5173, host: true },
  preview: { port: 4173 },
  build: {
    target: 'es2020',
    sourcemap: false,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
