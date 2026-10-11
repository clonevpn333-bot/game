/**
 * Downloads the prebuilt PDFium library the app bundles (bblanchon/pdfium-binaries),
 * pinned to one release so every build renders PDFs identically.
 *   pnpm fetch:pdfium [--target linux-x64|win-x64|mac-univ]
 * Output: src-tauri/pdfium/<library file> (gitignored; CI runs this before building).
 */
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

export const PDFIUM_RELEASE = 'chromium/8086';

const defaults: Record<string, string> = {
  linux: 'linux-x64',
  win32: 'win-x64',
  darwin: 'mac-univ',
};
const libraries: Record<string, string> = {
  'linux-x64': 'lib/libpdfium.so',
  'win-x64': 'bin/pdfium.dll',
  'mac-univ': 'lib/libpdfium.dylib',
};

const { values } = parseArgs({ options: { target: { type: 'string' } } });
const target = values.target ?? defaults[process.platform];
const library = target ? libraries[target] : undefined;
if (!target || !library) throw new Error(`No PDFium build for ${process.platform}; pass --target`);

const url = `https://github.com/bblanchon/pdfium-binaries/releases/download/${PDFIUM_RELEASE}/pdfium-${target}.tgz`;
const work = await mkdtemp(join(tmpdir(), 'pdfium-'));
const archive = join(work, 'pdfium.tgz');
const response = await fetch(url);
if (!response.ok) throw new Error(`HTTP ${String(response.status)} for ${url}`);
const { writeFile } = await import('node:fs/promises');
await writeFile(archive, new Uint8Array(await response.arrayBuffer()));
execFileSync('tar', ['-xzf', archive, '-C', work]);
const outDir = resolve(import.meta.dirname, '../src-tauri/pdfium');
await mkdir(outDir, { recursive: true });
const file = library.split('/').at(-1) ?? library;
await copyFile(join(work, library), join(outDir, file));
await copyFile(join(work, 'LICENSE'), join(outDir, 'LICENSE-pdfium.txt'));
await rm(work, { recursive: true, force: true });
console.log(`PDFium ${PDFIUM_RELEASE} (${target}) → ${join(outDir, file)}`);
