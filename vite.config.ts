import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pawgressApiPlugin } from './server/api';

export default defineConfig({
  plugins: [react(), pawgressApiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
