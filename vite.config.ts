
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill process.env for the browser environment so the build doesn't crash on process access
    'process.env': {}
  },
  base: '/',
  server: {
    host: '0.0.0.0', // Слушать на всех интерфейсах (IPv4 + IPv6)
    port: 5173,
    strictPort: false,
    cors: true,
    hmr: {
      host: '0.0.0.0',
      protocol: 'ws',
    },
    allowedHosts: [
      'verlliann.cloud',
      '.verlliann.cloud',
      'web-mpit.ru.tuna.am',
      '.tuna.am',
      'localhost',
    ],
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  }
});
