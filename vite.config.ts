import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config tuned for Tauri: fixed dev port (must match tauri.conf.json's
// devUrl), and ignore src-tauri so Rust rebuilds don't trigger a web reload.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
});
