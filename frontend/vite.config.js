import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { port: 5173 },
  define: { __APP_VERSION__: JSON.stringify('1.0.0') }
});
