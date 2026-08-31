#!/usr/bin/env node
/** Parse-checks JS files (ES modules and classic scripts) without running them. */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let bad = 0;
for (const f of process.argv.slice(2)) {
  const src = readFileSync(f, 'utf8');
  try {
    if (/^\s*(import|export)\b/m.test(src)) new vm.SourceTextModule(src, { identifier: f });
    else new vm.Script(src, { filename: f });
  } catch (e) {
    bad++;
    console.error(`FAIL ${f}: ${e.message}`);
  }
}
if (!bad) console.log(`syntax OK: ${process.argv.length - 2} file(s)`);
process.exit(bad ? 1 : 0);
