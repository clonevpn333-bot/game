import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import tauriConfig from './src-tauri/tauri.conf.json' with { type: 'json' };

/** index.html's <title> comes from the same productName as the rest of the app. */
const productTitle: Plugin = {
  name: 'product-title',
  transformIndexHtml: (html) => html.replace('%PRODUCT_NAME%', tauriConfig.productName),
};

// Tauri expects a fixed dev port and serves the built files from dist/.
export default defineConfig({
  plugins: [react(), tailwindcss(), productTitle],
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  build: { target: 'es2022', outDir: 'dist', emptyOutDir: true },
  worker: { format: 'es' },
});
