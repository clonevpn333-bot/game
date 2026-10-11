/**
 * Writes a vcpkg overlay port for Tesseract without libcurl and libarchive:
 *
 *   node scripts/vcpkg-overlay.ts <vcpkg root>   → vcpkg/ports/tesseract
 *
 * The official port always links both (they let the tesseract CLI read URLs and
 * archives). The app only passes in-memory images, and a networking library it never
 * calls has no place in an app that promises documents stay on the machine. The port
 * is copied from the runner's vcpkg checkout at build time so its version and patches
 * stay current; every edit is asserted, so a changed upstream port fails loudly.
 */
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const DROPPED = ['curl', 'libarchive'];

type Dependency = string | { name: string };

export function patchManifest(json: string): string {
  const manifest = JSON.parse(json) as { dependencies: Dependency[] };
  const before = manifest.dependencies.length;
  manifest.dependencies = manifest.dependencies.filter(
    (d) => !DROPPED.includes(typeof d === 'string' ? d : d.name),
  );
  if (before - manifest.dependencies.length !== DROPPED.length) {
    throw new Error(`tesseract vcpkg.json: expected to drop ${DROPPED.join(', ')}`);
  }
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function patchPortfile(text: string): string {
  const edits: [string, string][] = [
    ['-DCMAKE_REQUIRE_FIND_PACKAGE_LibArchive=ON', '-DDISABLE_ARCHIVE=ON'],
    ['-DCMAKE_REQUIRE_FIND_PACKAGE_CURL=ON', '-DDISABLE_CURL=ON'],
    ['find_dependency(CURL)\n', ''],
    ['find_dependency(LibArchive)\n', ''],
  ];
  let out = text;
  for (const [from, to] of edits) {
    if (!out.includes(from))
      throw new Error(`tesseract portfile.cmake: "${from.trim()}" not found`);
    out = out.replace(from, to);
  }
  return out;
}

if (import.meta.main) {
  const vcpkgRoot = process.argv[2];
  if (!vcpkgRoot) throw new Error('Pass the vcpkg root');
  const source = join(vcpkgRoot, 'ports/tesseract');
  const target = resolve(import.meta.dirname, '../vcpkg/ports/tesseract');
  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true });
  const manifestPath = join(target, 'vcpkg.json');
  const portfilePath = join(target, 'portfile.cmake');
  await writeFile(manifestPath, patchManifest(await readFile(manifestPath, 'utf8')));
  await writeFile(portfilePath, patchPortfile(await readFile(portfilePath, 'utf8')));
  console.log(`tesseract overlay port without ${DROPPED.join(' and ')} → ${target}`);
}
