import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: { proxy: { '/ws': { target: 'ws://localhost:3001', ws: true } } },
});
