/* Reshapes the single-file build into the fragment an Artifact expects:
 * the head's own title/fonts/styles, then the body content — no document wrapper. */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = await readFile(path.join(ROOT, 'dist', 'nova-arcade.html'), 'utf8');

const head = src.slice(src.indexOf('<head>') + 6, src.indexOf('</head>'));
const body = src.slice(src.indexOf('<body>') + 6, src.lastIndexOf('</body>'));

const keep = head
  .split('\n')
  .filter((l) => !/<meta\s+(charset|name="viewport"|name="color-scheme"|name="theme-color"|name="robots")/i.test(l))
  .join('\n');

await writeFile(path.join(ROOT, 'dist', 'artifact.html'), keep.trim() + '\n' + body.trim() + '\n');
console.log('dist/artifact.html written');
