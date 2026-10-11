/**
 * Version-free copies of the installers, attached to every release so the website can
 * link to https://github.com/<repo>/releases/latest/download/<name> and always serve the
 * newest published version without a rebuild:
 *
 *   node scripts/release-assets.ts --dir dist-release --product BinderReady
 *
 * The website builds the same names (apps/web/site.config.ts; a test keeps them equal).
 */
import { copyFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

export const STABLE_SUFFIXES = {
  windows: 'windows-x64-setup.exe',
  macAppleSilicon: 'macos-apple-silicon.dmg',
  macIntel: 'macos-intel.dmg',
} as const;

/** The stable name for a versioned installer Tauri produced, or null for other files. */
export function stableName(file: string, product: string): string | null {
  if (/_x64-setup\.exe$/.test(file)) return `${product}-${STABLE_SUFFIXES.windows}`;
  if (/_aarch64\.dmg$/.test(file)) return `${product}-${STABLE_SUFFIXES.macAppleSilicon}`;
  if (/_x64\.dmg$/.test(file)) return `${product}-${STABLE_SUFFIXES.macIntel}`;
  return null;
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: { dir: { type: 'string' }, product: { type: 'string' } },
  });
  if (!values.dir || !values.product) throw new Error('Pass --dir and --product');
  for (const file of await readdir(values.dir)) {
    const name = stableName(file, values.product);
    if (!name) continue;
    await copyFile(join(values.dir, file), join(values.dir, name));
    console.log(`${file} → ${name}`);
  }
}
