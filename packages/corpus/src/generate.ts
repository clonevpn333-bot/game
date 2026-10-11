/**
 * Synthetic test corpus (clean digital tier) with ground-truth labels.
 *
 *   pnpm --filter @binderready/corpus generate [--seed 2026] [--out out/clean]
 *
 * Writes PDFs and manifest.json. Every name is invented and every identifier is
 * an all-zero placeholder. Scanned and photo tiers are derived from this tier
 * (see degrade.ts) once OCR is available.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import { clients } from './fake.ts';
import type { CorpusManifest, TruthDocument, TruthFile } from './manifest.ts';
import { Random } from './random.ts';
import { templateById, templates, type Block, type FormTemplate } from './templates.ts';

const PAGE_W = 612;
const PAGE_H = 792;

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  mono: PDFFont;
}

function draw(page: PDFPage, blocks: Block[], fonts: Fonts) {
  for (const b of blocks) {
    const font = b.mono ? fonts.mono : b.bold ? fonts.bold : fonts.regular;
    page.drawText(b.text, {
      x: b.x * PAGE_W,
      y: PAGE_H - b.y * PAGE_H - b.size,
      size: b.size,
      font,
      maxWidth: PAGE_W * (1 - b.x) - 18,
    });
  }
}

async function pdfFromPages(pages: Block[][], title: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setProducer('BinderReady synthetic corpus');
  doc.setCreationDate(new Date('2026-01-31T00:00:00Z'));
  doc.setModificationDate(new Date('2026-01-31T00:00:00Z'));
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    mono: await doc.embedFont(StandardFonts.Courier),
  };
  for (const blocks of pages) draw(doc.addPage([PAGE_W, PAGE_H]), blocks, fonts);
  return doc.save({ useObjectStreams: false });
}

interface PlannedDoc {
  truth: Omit<TruthDocument, 'pages'>;
  pages: Block[][];
}

const MESSY_NAMES = [
  'scan{n}.pdf',
  'Document ({n}).pdf',
  'IMG_{n}.pdf',
  'Scan {n}.pdf',
  'doc{n}.pdf',
  'tax stuff {n}.pdf',
];

export async function generate(seed: number, outDir: string): Promise<CorpusManifest> {
  const rng = new Random(seed);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  // Every form type appears at least five times across the clients.
  const queue: FormTemplate[] = [];
  for (let round = 0; round < 5; round++) queue.push(...rng.shuffle([...templates]));

  const files: TruthFile[] = [];
  let fileCounter = 0;
  let docCounter = 0;
  const year = 2026;

  const writeFile_ = async (
    name: string,
    bytes: Uint8Array,
    client: string,
    documents: TruthDocument[],
    expect: TruthFile['expect'] = 'ok',
  ) => {
    fileCounter += 1;
    const path = `${String(fileCounter).padStart(3, '0')}-${name}`;
    await writeFile(join(outDir, path), bytes);
    files.push({
      path,
      name,
      client,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      expect,
      documents,
    });
  };

  const planDoc = (
    template: FormTemplate,
    client: (typeof clients)[number],
    opts: { copy?: string; instructions?: boolean; issuer?: string; seed?: number } = {},
  ): PlannedDoc => {
    const issuer = opts.issuer ?? rng.pick(template.issuerPool);
    // A fixed seed renders identical amounts, which is what separate copies of one form share.
    const valuesRng = opts.seed === undefined ? rng : new Random(opts.seed);
    const rendered = template.render(
      { year, issuer, recipientFirst: client.first, recipientLast: client.last },
      valuesRng,
      {
        ...(opts.copy ? { copy: opts.copy } : {}),
        instructions: opts.instructions ?? false,
      },
    );
    docCounter += 1;
    return {
      truth: {
        id: `d${String(docCounter)}`,
        formId: template.formId,
        year,
        issuer: rendered.issuer,
        recipientLast: client.last,
        duplicateOf: null,
      },
      pages: rendered.pages,
    };
  };

  const assemble = (docs: PlannedDoc[]) => {
    let start = 0;
    const truths: TruthDocument[] = [];
    for (const d of docs) {
      truths.push({
        ...d.truth,
        pages: Array.from({ length: d.pages.length }, (_, i) => start + i),
      });
      start += d.pages.length;
    }
    return { pages: docs.flatMap((d) => d.pages), truths };
  };

  for (const [ci, client] of clients.entries()) {
    const clientName = `${client.first} ${client.last}`;
    const mine = queue.splice(0, Math.ceil(queue.length / (clients.length - ci)));
    const planned = mine.map((t) => {
      const instructions = t.formId !== 'brokerage-consolidated' && rng.chance(0.25);
      return planDoc(t, client, {
        instructions,
        ...(t.formId === 'w-2' && rng.chance(0.3) ? { copy: '4-up' } : {}),
      });
    });

    // Single-document files with messy names; some names hint at the form, one in six misleads.
    const singles = planned.splice(0, Math.ceil(planned.length * 0.6));
    for (const doc of singles) {
      const { pages, truths } = assemble([doc]);
      const hint = rng.chance(0.3)
        ? `${doc.truth.formId.toUpperCase().replace('-', ' ')} ${rng.pick(['maybe', 'stuff', 'from bank', ''])}`.trim()
        : null;
      const misleading = rng.chance(1 / 6)
        ? rng.pick(['W2 again', '1099 stuff', 'mortgage thing'])
        : null;
      const name = `${misleading ?? hint ?? rng.pick(MESSY_NAMES).replace('{n}', String(rng.int(1000, 9999)))}${misleading || hint ? '.pdf' : ''}`;
      await writeFile_(name, await pdfFromPages(pages, name), clientName, truths);
    }

    // Multi-document scans: several documents in one PDF, the way a sheet feeder produces them.
    while (planned.length > 0) {
      const batch = planned.splice(0, rng.int(2, 5));
      const { pages, truths } = assemble(batch);
      const name = `scan${String(rng.int(1, 99)).padStart(4, '0')}.pdf`;
      await writeFile_(name, await pdfFromPages(pages, name), clientName, truths);
    }

    // Exact duplicate: the client sent the same file twice.
    const original = files.filter((f) => f.client === clientName && f.documents.length === 1).at(0);
    if (original) {
      const bytes = await readFile(join(outDir, original.path));
      await writeFile_(
        `${original.name.replace(/\.pdf$/, '')} (1).pdf`,
        bytes,
        clientName,
        original.documents.map((d) => ({
          ...d,
          id: `d${String(++docCounter)}`,
          duplicateOf: d.id,
        })),
      );
    }

    // Near duplicate: Copy C of a W-2 scanned separately from Copy B.
    const w2 = templateById.get('w-2');
    if (w2) {
      const seed = rng.int(1, 2 ** 30);
      const b = planDoc(w2, client, { issuer: 'Northwind Logistics LLC', seed });
      const c = planDoc(w2, client, {
        issuer: 'Northwind Logistics LLC',
        seed,
        copy: 'Copy C—For EMPLOYEE’S RECORDS (See Notice to Employee on the back of Copy B.)',
      });
      const first = assemble([b]);
      await writeFile_(
        'W2 copy B.pdf',
        await pdfFromPages(first.pages, 'W2 copy B'),
        clientName,
        first.truths,
      );
      const second = assemble([c]);
      await writeFile_(
        'W2 copy C.pdf',
        await pdfFromPages(second.pages, 'W2 copy C'),
        clientName,
        second.truths.map((d) => ({ ...d, duplicateOf: first.truths[0]?.id ?? null })),
      );
    }
  }

  // A password-protected PDF (qpdf) and a truncated, corrupt one.
  const lockedSource = join(outDir, 'locked-source.pdf');
  const locked = assemble([
    planDoc(templateById.get('1099-div') ?? (templates[0] as FormTemplate), clients[0]),
  ]);
  await writeFile(lockedSource, await pdfFromPages(locked.pages, 'locked'));
  const lockedOut = join(outDir, 'locked.pdf');
  execFileSync('qpdf', [
    '--encrypt',
    'sample-user-pw',
    'sample-owner-pw',
    '256',
    '--',
    lockedSource,
    lockedOut,
  ]);
  await writeFile_(
    'brokerage statement (password).pdf',
    await readFile(lockedOut),
    `${clients[0].first} ${clients[0].last}`,
    [],
    'password',
  );
  await rm(lockedSource);
  await rm(lockedOut);

  const corrupt = (
    await pdfFromPages(
      assemble([planDoc(templateById.get('1098') ?? (templates[0] as FormTemplate), clients[1])])
        .pages,
      'corrupt',
    )
  ).slice(0, 900);
  await writeFile_(
    'Document (7).pdf',
    corrupt,
    `${clients[1].first} ${clients[1].last}`,
    [],
    'corrupt',
  );

  const manifest: CorpusManifest = {
    tier: 'clean',
    seed,
    generatedBy: 'synthetic-templates',
    files,
  };
  await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  const { values } = parseArgs({ options: { seed: { type: 'string' }, out: { type: 'string' } } });
  const out = resolve(values.out ?? resolve(import.meta.dirname, '../out/clean'));
  const manifest = await generate(Number(values.seed ?? 2026), out);
  const docs = manifest.files.flatMap((f) => f.documents);
  const pages = manifest.files.reduce(
    (n, f) => n + f.documents.reduce((m, d) => m + d.pages.length, 0),
    0,
  );
  console.log(
    `${String(manifest.files.length)} files, ${String(docs.length)} documents, ${String(pages)} pages → ${out}`,
  );
}
