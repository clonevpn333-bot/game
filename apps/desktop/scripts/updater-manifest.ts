/**
 * Writes the updater manifest (latest.json) for a GitHub release from the signed
 * updater artifacts the release workflow collected:
 *
 *   node scripts/updater-manifest.ts --version 0.2.0 --repo owner/name --dir dist-release
 *     [--tag v0.2.0]   the release the installers are attached to (default v<version>)
 *
 * Every `<file>.sig` next to an installer becomes a platform entry; the app's updater
 * reads https://github.com/<repo>/releases/latest/download/latest.json.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

/** Tauri's updater platform keys, from the artifact names this workflow produces. */
export function platformFor(file: string): string | null {
  if (/_x64-setup\.exe$/.test(file)) return 'windows-x86_64';
  if (/aarch64\.app\.tar\.gz$/.test(file)) return 'darwin-aarch64';
  if (/x86_64\.app\.tar\.gz$/.test(file)) return 'darwin-x86_64';
  return null;
}

export async function manifest(
  dir: string,
  version: string,
  repo: string,
  notes: string,
  tag = `v${version}`,
) {
  const platforms: Record<string, { signature: string; url: string }> = {};
  for (const sig of (await readdir(dir)).filter((f) => f.endsWith('.sig'))) {
    const file = sig.slice(0, -'.sig'.length);
    const platform = platformFor(file);
    if (!platform) continue;
    platforms[platform] = {
      signature: (await readFile(join(dir, sig), 'utf8')).trim(),
      url: `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(file)}`,
    };
  }
  if (!Object.keys(platforms).length) throw new Error(`No signed updater artifacts in ${dir}`);
  return { version, notes, pub_date: new Date().toISOString(), platforms };
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      version: { type: 'string' },
      repo: { type: 'string' },
      dir: { type: 'string' },
      notes: { type: 'string' },
      tag: { type: 'string' },
    },
  });
  if (!values.version || !values.repo || !values.dir) {
    throw new Error('Pass --version, --repo and --dir');
  }
  const json = await manifest(
    values.dir,
    values.version,
    values.repo,
    values.notes ?? '',
    values.tag ?? `v${values.version}`,
  );
  await writeFile(join(values.dir, 'latest.json'), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`latest.json: ${Object.keys(json.platforms).join(', ')}`);
}
