// Bundles BeatLab into ONE html file (CSS + JS inlined).
//   node scripts/build-single.mjs [out.html] [--fragment]
// --fragment drops the <!DOCTYPE>/<html>/<head>/<body> wrapper (for hosts that add their own).
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) || root + 'dist/beatlab.html';
const fragment = args.includes('--fragment');

const html = await readFile(root + 'index.html', 'utf8');
const css = await readFile(root + 'css/style.css', 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const js = (await Promise.all(scripts.map((s) => readFile(root + s, 'utf8')))).map((code, i) => `/* ${scripts[i]} */\n${code}`);
const body = html.slice(html.indexOf('<!--APP-->'), html.indexOf('<!--/APP-->') + '<!--/APP-->'.length);
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/)[0];
const scriptTags = js.map((c) => `<script>\n${c.replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n');

const page = fragment
  ? `<title>BeatLab</title>\n${fonts}\n<style>\n${css}\n</style>\n${body}\n${scriptTags}\n`
  : `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">\n<title>BeatLab</title>\n${fonts}\n<style>\n${css}\n</style>\n</head>\n<body>\n${body}\n${scriptTags}\n</body>\n</html>\n`;
await writeFile(out, page);
console.log(`wrote ${out} (${(page.length / 1024).toFixed(0)} KB)`);
