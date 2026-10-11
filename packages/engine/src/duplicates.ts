import type { DocumentResult, FileInput } from './types.ts';

/** Bits that differ between two 64-bit hashes written as 16 hex characters. */
export function hammingDistance(a: string, b: string): number {
  let distance = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 4) {
    let x = Number.parseInt(a.slice(i, i + 4), 16) ^ Number.parseInt(b.slice(i, i + 4), 16);
    while (x) {
      distance += x & 1;
      x >>= 1;
    }
  }
  return distance;
}

/** Perceptual hashes this close (out of 64 bits) count as the same page image. */
export const NEAR_DUPLICATE_BITS = 10;

const norm = (s: string | null) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * The figures printed on a page (amounts, dates, codes). Separately scanned copies
 * of one form share them; two accounts at the same bank don't. Compared in memory
 * only — never stored or logged.
 */
function figures(file: FileInput | undefined, pageIndex: number): Set<string> {
  const page = file?.pages.find((p) => p.index === pageIndex);
  // Amounts with cents and full dates: placeholder identifiers and ZIP codes repeat across
  // unrelated documents, so they are left out.
  return new Set(
    (page?.words ?? [])
      .map((w) => w.text.replace(/[$,]/g, ''))
      .filter((t) => /^\d+\.\d{2}$/.test(t) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  // Pages without any figures can't be told apart this way; don't call them duplicates.
  if (a.size === 0 && b.size === 0) return 0;
  let shared = 0;
  for (const x of a) if (b.has(x)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/** Share of figures two pages must have in common to count as the same document. */
export const SAME_FIGURES = 0.8;

/**
 * Marks duplicates in place and returns the documents.
 *  - exact: the whole file is byte-identical (same SHA-256) to an earlier file
 *  - near: same form, issuer and year, and first pages that look the same
 *    (also catches separately scanned copies B/C/2 of one form)
 */
export function markDuplicates(documents: DocumentResult[], files: FileInput[]): DocumentResult[] {
  const firstFileByHash = new Map<string, string>();
  const exactOf = new Map<string, string>();
  for (const file of files) {
    const original = firstFileByHash.get(file.sha256);
    if (original) exactOf.set(file.id, original);
    else firstFileByHash.set(file.sha256, file.id);
  }
  const phash = new Map(files.map((f) => [f.id, new Map(f.pages.map((p) => [p.index, p.phash]))]));
  const fileById = new Map(files.map((f) => [f.id, f]));

  const kept: DocumentResult[] = [];
  for (const doc of documents) {
    const originalFile = exactOf.get(doc.fileId);
    if (originalFile) {
      const position = documents.filter((d) => d.fileId === doc.fileId).indexOf(doc);
      const original = documents.filter((d) => d.fileId === originalFile)[position];
      if (original) {
        doc.duplicateOf = original.id;
        doc.duplicateKind = 'exact';
        continue;
      }
    }
    const hash = phash.get(doc.fileId)?.get(doc.pages[0] ?? -1);
    const match = kept.find((k) => {
      if (!doc.formId || k.formId !== doc.formId) return false;
      if (!doc.fields.issuer || norm(k.fields.issuer) !== norm(doc.fields.issuer)) return false;
      if (doc.fields.taxYear === null || k.fields.taxYear !== doc.fields.taxYear) return false;
      const other = phash.get(k.fileId)?.get(k.pages[0] ?? -1);
      if (hash === undefined || other === undefined) return false;
      if (hammingDistance(hash, other) > NEAR_DUPLICATE_BITS) return false;
      const mine = figures(fileById.get(doc.fileId), doc.pages[0] ?? -1);
      const theirs = figures(fileById.get(k.fileId), k.pages[0] ?? -1);
      return jaccard(mine, theirs) >= SAME_FIGURES;
    });
    if (match) {
      doc.duplicateOf = match.id;
      doc.duplicateKind = 'near';
    } else {
      kept.push(doc);
    }
  }
  return documents;
}
