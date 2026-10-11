/**
 * Derives the scanned and photo tiers from the clean tier, keeping its labels.
 *
 *   node src/degrade.ts --tier scanned|photo [--clean out/clean] [--out out/<tier>]
 *
 * scanned: every page rasterized at 200 DPI with slight skew, noise, blur and
 *   JPEG artifacts (a few fed upside down), re-assembled into image-only PDFs.
 * photo:   the first page of each document "photographed": perspective warp,
 *   90/180° turns, shadow, blur, table-texture background; JPEG or HEIC.
 * Needs pdftoppm, ImageMagick (convert) and heif-enc.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { PDFDocument } from 'pdf-lib';
import type { CorpusManifest, TruthDocument, TruthFile } from './manifest.ts';
import { Random } from './random.ts';

const run = (cmd: string, args: string[]) =>
  execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });

function rasterize(pdf: string, page: number, dpi: number, outPrefix: string): string {
  run('pdftoppm', [
    '-r',
    String(dpi),
    '-png',
    '-singlefile',
    '-f',
    String(page + 1),
    '-l',
    String(page + 1),
    pdf,
    outPrefix,
  ]);
  return `${outPrefix}.png`;
}

async function scannedTier(
  clean: CorpusManifest,
  cleanDir: string,
  outDir: string,
  rng: Random,
): Promise<CorpusManifest> {
  const work = await mkdtemp(join(tmpdir(), 'br-scan-'));
  const files: TruthFile[] = [];
  for (const file of clean.files) {
    const source = join(cleanDir, file.path);
    if (file.expect !== 'ok') {
      await copyFile(source, join(outDir, file.path));
      files.push(file);
      continue;
    }
    // A byte-identical resend stays byte-identical: reuse the scan already made.
    const original =
      /\(1\)\.pdf$/.test(file.name) && file.documents.every((d) => d.duplicateOf)
        ? files.find((f) => f.documents.some((d) => d.id === file.documents[0]?.duplicateOf))
        : undefined;
    if (original) {
      await copyFile(join(outDir, original.path), join(outDir, file.path));
      files.push({ ...file, sha256: original.sha256 });
      continue;
    }
    const pageCount = Math.max(...file.documents.flatMap((d) => d.pages)) + 1;
    const doc = await PDFDocument.create();
    for (let p = 0; p < pageCount; p++) {
      const png = rasterize(source, p, 200, join(work, `p${String(p)}`));
      const jpg = join(work, `p${String(p)}.jpg`);
      const angle = (rng.next() * 2 - 1) * 1.8 + (rng.chance(0.08) ? 180 : 0);
      run('convert', [
        png,
        '-background',
        'white',
        '-rotate',
        angle.toFixed(2),
        '-attenuate',
        (0.25 + rng.next() * 0.35).toFixed(2),
        '+noise',
        'Gaussian',
        '-blur',
        `0x${(0.4 + rng.next() * 0.5).toFixed(2)}`,
        '-colorspace',
        'Gray',
        '-quality',
        String(rng.int(45, 70)),
        jpg,
      ]);
      const image = await doc.embedJpg(await readFile(jpg));
      const page = doc.addPage([612, 792]);
      page.drawImage(image, { x: 0, y: 0, width: 612, height: 792 });
    }
    const bytes = await doc.save();
    await writeFile(join(outDir, file.path), bytes);
    files.push({ ...file, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  await rm(work, { recursive: true, force: true });
  return { ...clean, tier: 'scanned', files };
}

async function photoTier(
  clean: CorpusManifest,
  cleanDir: string,
  outDir: string,
  rng: Random,
): Promise<CorpusManifest> {
  const work = await mkdtemp(join(tmpdir(), 'br-photo-'));
  const files: TruthFile[] = [];
  const idMap = new Map<string, string>();
  let n = 4000;
  for (const file of clean.files) {
    if (file.expect !== 'ok') continue;
    // A byte-identical resend stays byte-identical: copy the photo already taken.
    const exactCopy =
      file.documents.length > 0 &&
      file.documents.every((d) => d.duplicateOf !== null) &&
      /\(1\)\.pdf$/.test(file.name);
    for (const truth of file.documents) {
      n += rng.int(1, 9);
      const originalId = exactCopy ? idMap.get(truth.duplicateOf ?? '') : undefined;
      const original = originalId
        ? files.find((f) => f.documents.some((d) => d.id === originalId))
        : undefined;
      if (original) {
        const copyName = original.name.replace(/(\.\w+)$/, ' (1)$1');
        const path = `${String(files.length + 1).padStart(3, '0')}-${copyName}`;
        await copyFile(join(outDir, original.path), join(outDir, path));
        const id = `${truth.id}p`;
        idMap.set(truth.id, id);
        files.push({
          ...original,
          path,
          name: copyName,
          documents: [{ ...truth, id, pages: [0], duplicateOf: originalId ?? null }],
        });
        continue;
      }
      // A 12-megapixel phone photo of a letter page is about 300 DPI on the page.
      const png = rasterize(
        join(cleanDir, file.path),
        truth.pages[0] ?? 0,
        300,
        join(work, 'page'),
      );
      const w = 2550;
      const h = 3300;
      const m = 260;
      const j = () => rng.int(20, 180);
      const turn = rng.chance(0.15) ? 180 : rng.chance(0.12) ? 90 : 0;
      const jpg = join(work, 'photo.jpg');
      run('convert', [
        png,
        '-resize',
        `${String(w)}x${String(h)}!`,
        '-bordercolor',
        '#7a6650',
        '-border',
        String(m),
        '(',
        '+clone',
        '-attenuate',
        '0.9',
        '+noise',
        'Multiplicative',
        ')',
        '-compose',
        'Multiply',
        '-composite',
        '-virtual-pixel',
        'background',
        '-background',
        '#5f4d3b',
        '-distort',
        'Perspective',
        `0,0 ${String(j())},${String(j())}  ${String(w + 2 * m)},0 ${String(w + 2 * m - j())},${String(j())}  ${String(w + 2 * m)},${String(h + 2 * m)} ${String(w + 2 * m - j())},${String(h + 2 * m - j())}  0,${String(h + 2 * m)} ${String(j())},${String(h + 2 * m - j())}`,
        '(',
        '-size',
        `${String(h + 2 * m)}x${String(w + 2 * m)}`,
        `gradient:white-gray${String(rng.int(55, 80))}`,
        '-rotate',
        String(rng.pick([90, -90])),
        ')',
        '-compose',
        'Multiply',
        '-composite',
        '-rotate',
        String(turn + (rng.next() * 2 - 1) * 3),
        '-blur',
        `0x${(0.6 + rng.next() * 0.8).toFixed(2)}`,
        '-quality',
        String(rng.int(70, 88)),
        jpg,
      ]);
      const heic = rng.chance(0.4);
      const name = `IMG_${String(n)}.${heic ? 'HEIC' : 'JPG'}`;
      const path = `${String(files.length + 1).padStart(3, '0')}-${name}`;
      if (heic) run('heif-enc', ['-q', '60', '-o', join(outDir, path), jpg]);
      else await copyFile(jpg, join(outDir, path));
      const bytes = await readFile(join(outDir, path));
      const id = `${truth.id}p`;
      idMap.set(truth.id, id);
      const doc: TruthDocument = {
        ...truth,
        id,
        pages: [0],
        duplicateOf: truth.duplicateOf ? (idMap.get(truth.duplicateOf) ?? null) : null,
      };
      files.push({
        path,
        name,
        client: file.client,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        expect: 'ok',
        documents: [doc],
      });
    }
  }
  await rm(work, { recursive: true, force: true });
  return { ...clean, tier: 'photo', files };
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: { tier: { type: 'string' }, clean: { type: 'string' }, out: { type: 'string' } },
  });
  const tier = values.tier === 'photo' ? 'photo' : 'scanned';
  const cleanDir = resolve(values.clean ?? resolve(import.meta.dirname, '../out/clean'));
  const outDir = resolve(values.out ?? resolve(import.meta.dirname, `../out/${tier}`));
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const clean = JSON.parse(
    await readFile(join(cleanDir, 'manifest.json'), 'utf8'),
  ) as CorpusManifest;
  const rng = new Random(clean.seed + (tier === 'photo' ? 2 : 1));
  const manifest =
    tier === 'photo'
      ? await photoTier(clean, cleanDir, outDir, rng)
      : await scannedTier(clean, cleanDir, outDir, rng);
  await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const docs = manifest.files.flatMap((f) => f.documents).length;
  console.log(
    `${tier}: ${String(manifest.files.length)} files, ${String(docs)} documents → ${outDir}`,
  );
}
