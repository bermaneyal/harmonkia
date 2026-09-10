import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Microphone access requires a secure context; localhost is fine,
    // but for testing from a phone on the LAN enable https or use a tunnel.
    host: true,
  },
});
