#!/usr/bin/env node
/* build.mjs — assemble the single-file index.html from build/*.js modules.
   Concatenates modules in dependency order between the GAME:START / GAME:END
   markers, inside one <script type="module">. Run: node build.mjs */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const B = p => path.join(ROOT, 'build', p);

// dependency order
const ORDER = ['config', 'utils', 'input', 'save', 'entities', 'rounds',
    'view_bean', 'view_world', 'game', 'ui', 'engine'];

const parts = [];
parts.push('<script type="module">');
parts.push("import * as THREE from 'three';");
parts.push('');
for (const name of ORDER) {
    let src = fs.readFileSync(B(name + '.js'), 'utf8').replace(/\s+$/, '');
    parts.push(`/* === ${name} === */`);
    parts.push(src);
    parts.push('');
}
parts.push('</script>');
const block = parts.join('\n');

const htmlPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const start = html.indexOf('<!-- GAME:START -->');
const end = html.indexOf('<!-- GAME:END -->');
if (start < 0 || end < 0) { console.error('markers not found'); process.exit(1); }
html = html.slice(0, start) + '<!-- GAME:START -->\n' + block + '\n<!-- GAME:END -->' + html.slice(end + '<!-- GAME:END -->'.length);
fs.writeFileSync(htmlPath, html);

const lines = html.split('\n').length;
console.log(`built index.html — ${lines} lines from ${ORDER.length} modules`);
