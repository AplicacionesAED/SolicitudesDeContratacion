import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Solo se define cuando la app vive bajo un prefijo detrás del gateway del portal
  // (ej. VITE_BASE_PATH=/solicitudes/). Standalone, vacío -> "/" como siempre.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  server: {
    port: 5193,
  },
});
