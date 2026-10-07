import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained HTML file (JS, CSS and fonts inlined).
export default defineConfig({
  plugins: [viteSingleFile()],
  build: { outDir: 'dist-single', assetsInlineLimit: 100_000_000, cssCodeSplit: false, sourcemap: false, chunkSizeWarningLimit: 5000 },
});
