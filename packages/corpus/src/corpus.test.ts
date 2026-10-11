import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DocumentResult } from '@binderready/engine';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { evaluate } from './evaluate.ts';
import { dHashFromGray, textLayerPages, OpenError } from './extract.ts';
import { generate } from './generate.ts';
import type { CorpusManifest, TruthFile } from './manifest.ts';

const doc = (
  pages: number[],
  formId: string,
  status: DocumentResult['status'] = 'auto',
  duplicateOf: string | null = null,
): DocumentResult => ({
  id: `x${pages.join('')}`,
  fileId: 'f',
  fileName: 'f.pdf',
  pages,
  formId,
  category: 'wages',
  confidence: 0.95,
  status,
  alternatives: [],
  fields: { taxYear: 2026, issuer: 'Acme', recipientLastName: 'Sample' },
  name: '',
  duplicateOf,
  duplicateKind: duplicateOf ? 'near' : null,
});

const truthFile = (
  documents: TruthFile['documents'],
  expect: TruthFile['expect'] = 'ok',
): TruthFile => ({
  path: 'f.pdf',
  name: 'f.pdf',
  client: 'Jane Sample',
  sha256: 'x',
  expect,
  documents,
});

const truth = (id: string, pages: number[], formId: string, duplicateOf: string | null = null) => ({
  id,
  pages,
  formId,
  year: 2026,
  issuer: 'Acme',
  recipientLast: 'Sample',
  duplicateOf,
});

describe('evaluate', () => {
  it('counts a wrong form that was auto-accepted as misfiled', () => {
    const m = evaluate([
      { file: truthFile([truth('a', [0], 'w-2')]), result: [doc([0], '1099-int')] },
    ]);
    expect(m.correct).toBe(0);
    expect(m.misfiledWhileAuto).toBe(1);
  });

  it('counts a wrong form flagged for review as flagged, not misfiled', () => {
    const m = evaluate([
      { file: truthFile([truth('a', [0], 'w-2')]), result: [doc([0], '1099-int', 'check')] },
    ]);
    expect(m.correctOrFlagged).toBe(1);
    expect(m.misfiledWhileAuto).toBe(0);
  });

  it('requires the exact page split', () => {
    const m = evaluate([
      {
        file: truthFile([truth('a', [0, 1], 'k-1-1065')]),
        result: [doc([0], 'k-1-1065'), doc([1], 'k-1-1065')],
      },
    ]);
    expect(m.splitCorrect).toBe(0);
    expect(m.misfiledWhileAuto).toBe(2);
  });

  it('credits caught duplicates and counts false ones', () => {
    const m = evaluate([
      {
        file: truthFile([truth('a', [0], 'w-2'), truth('b', [1], 'w-2', 'a')]),
        result: [doc([0], 'w-2', 'auto', 'zz'), doc([1], 'w-2', 'auto', 'x0')],
      },
    ]);
    expect(m.duplicatesCaught).toBe(1);
    expect(m.falseDuplicates).toBe(1);
  });

  it('expects password-protected and corrupt files to be reported', () => {
    const m = evaluate([
      { file: truthFile([], 'password'), result: { error: 'password' } },
      { file: truthFile([], 'corrupt'), result: [] },
    ]);
    expect(m.errorFilesExpected).toBe(2);
    expect(m.errorFilesHandled).toBe(1);
  });
});

describe('dHash', () => {
  it('is stable and sensitive to layout', () => {
    const w = 36;
    const h = 32;
    const left = new Uint8Array(w * h).map((_, i) => (i % w < w / 2 ? 0 : 255));
    const right = new Uint8Array(w * h).map((_, i) => (i % w < w / 2 ? 255 : 0));
    expect(dHashFromGray(left, w, h)).toBe(dHashFromGray(left, w, h));
    expect(dHashFromGray(left, w, h)).not.toBe(dHashFromGray(right, w, h));
    expect(dHashFromGray(left, w, h)).toHaveLength(16);
  });
});

describe('generator', () => {
  let dir: string;
  let manifest: CorpusManifest;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'br-corpus-'));
    manifest = await generate(99, dir);
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('covers every MVP form type at least five times', () => {
    const counts = new Map<string, number>();
    for (const d of manifest.files.flatMap((f) => f.documents))
      counts.set(d.formId, (counts.get(d.formId) ?? 0) + 1);
    expect(counts.size).toBe(30);
    expect(Math.min(...counts.values())).toBeGreaterThanOrEqual(5);
  });

  it('is deterministic for a seed', async () => {
    const again = await mkdtemp(join(tmpdir(), 'br-corpus-'));
    const second = await generate(99, again);
    // qpdf salts AES-256 encryption randomly, so the password-protected file is the one exception.
    const hashes = (m: CorpusManifest) =>
      m.files.filter((f) => f.expect !== 'password').map((f) => f.sha256);
    expect(hashes(second)).toEqual(hashes(manifest));
    await rm(again, { recursive: true, force: true });
  });

  it('never writes anything that looks like a real SSN or EIN', async () => {
    for (const file of manifest.files.filter((f) => f.expect === 'ok').slice(0, 20)) {
      const pages = await textLayerPages(new Uint8Array(await readFile(join(dir, file.path))));
      const text = pages.flatMap((p) => p.words.map((w) => w.text)).join(' ');
      for (const ssn of text.match(/\b\d{3}-\d{2}-\d{4}\b/g) ?? []) expect(ssn).toBe('000-00-0000');
      for (const ein of text.match(/\b\d{2}-\d{7}\b/g) ?? []) expect(ein).toBe('00-0000000');
    }
  });

  it('produces a password-protected file that the extractor reports as such', async () => {
    const locked = manifest.files.find((f) => f.expect === 'password');
    expect(locked).toBeDefined();
    await expect(
      textLayerPages(new Uint8Array(await readFile(join(dir, locked?.path ?? '')))),
    ).rejects.toBeInstanceOf(OpenError);
  });
});
