// Bundles src/ into a single classic script so index.html runs from file:// or any static host.
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const options = {
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  outfile: 'dist/worldshift.js',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  legalComments: 'none',
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('watching src/ …');
} else {
  await esbuild.build(options);
}

// Single-file build: inline CSS + JS into one HTML that opens directly (file://)
if (!watch) {
  const fs = await import('node:fs');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');
  const js = fs.readFileSync('dist/worldshift.js', 'utf8').replace(/<\/script/gi, '<\\/script');
  const out = html
    .replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}\n</style>`)
    .replace('<script src="dist/worldshift.js"></script>', () => `<script>\n${js}\n</script>`);
  fs.writeFileSync('WORLDSHIFT.html', out);
  console.log('wrote WORLDSHIFT.html', (out.length / 1024).toFixed(0) + ' KB');
}
