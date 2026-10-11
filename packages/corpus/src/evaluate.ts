/**
 * Scores engine output against ground truth. Pure, so the scoring rules are
 * unit-tested separately from the corpus.
 */
import type { DocumentResult } from '@binderready/engine';
import type { TruthDocument, TruthFile } from './manifest.ts';

export interface FileOutcome {
  file: TruthFile;
  /** Engine documents for this file, or how opening it failed. */
  result: DocumentResult[] | { error: 'password' | 'corrupt' };
}

export interface DocVerdict {
  truth: TruthDocument;
  predicted: DocumentResult | null;
  splitCorrect: boolean;
  formCorrect: boolean;
  correct: boolean;
  flagged: boolean;
  autoAccepted: boolean;
}

export interface FormStats {
  formId: string;
  truthCount: number;
  tp: number;
  fp: number;
  fn: number;
}

export interface Metrics {
  documents: number;
  pages: number;
  correct: number;
  correctOrFlagged: number;
  splitCorrect: number;
  autoAccepted: number;
  /** Auto-accepted predicted documents that are wrong (bad form or bad split). */
  misfiledWhileAuto: number;
  duplicatesExpected: number;
  duplicatesCaught: number;
  falseDuplicates: number;
  errorFilesExpected: number;
  errorFilesHandled: number;
  fields: { year: number; issuer: number; recipient: number };
  perForm: FormStats[];
  verdicts: DocVerdict[];
}

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const samePages = (a: number[], b: number[]) =>
  a.length === b.length && a.every((p, i) => p === b[i]);

export function evaluate(outcomes: FileOutcome[]): Metrics {
  const verdicts: DocVerdict[] = [];
  const perForm = new Map<string, FormStats>();
  const stat = (id: string) => {
    let s = perForm.get(id);
    if (!s) {
      s = { formId: id, truthCount: 0, tp: 0, fp: 0, fn: 0 };
      perForm.set(id, s);
    }
    return s;
  };
  let autoAccepted = 0;
  let misfiledWhileAuto = 0;
  let errorFilesExpected = 0;
  let errorFilesHandled = 0;
  let falseDuplicates = 0;

  for (const { file, result } of outcomes) {
    if (file.expect !== 'ok') {
      errorFilesExpected += 1;
      if (!Array.isArray(result) && result.error === file.expect) errorFilesHandled += 1;
      continue;
    }
    if (!Array.isArray(result)) {
      for (const truth of file.documents) {
        verdicts.push({
          truth,
          predicted: null,
          splitCorrect: false,
          formCorrect: false,
          correct: false,
          flagged: true,
          autoAccepted: false,
        });
        stat(truth.formId).truthCount += 1;
        stat(truth.formId).fn += 1;
      }
      continue;
    }
    for (const truth of file.documents) {
      const predicted = result.find((d) => samePages(d.pages, truth.pages)) ?? null;
      const overlapping = result.filter((d) => d.pages.some((p) => truth.pages.includes(p)));
      const splitCorrect = predicted !== null;
      const formCorrect = predicted?.formId === truth.formId;
      const correct = splitCorrect && formCorrect;
      const flagged = overlapping.some((d) => d.status !== 'auto');
      verdicts.push({
        truth,
        predicted,
        splitCorrect,
        formCorrect,
        correct,
        flagged,
        autoAccepted: predicted?.status === 'auto',
      });
      const s = stat(truth.formId);
      s.truthCount += 1;
      if (correct) s.tp += 1;
      else s.fn += 1;
      if (predicted && !formCorrect && predicted.formId) stat(predicted.formId).fp += 1;
    }
    for (const predicted of result) {
      if (predicted.status !== 'auto') continue;
      autoAccepted += 1;
      const truth = file.documents.find((t) => samePages(t.pages, predicted.pages));
      if (!truth || truth.formId !== predicted.formId) misfiledWhileAuto += 1;
      if (predicted.duplicateOf && !truth?.duplicateOf) falseDuplicates += 1;
    }
  }

  const ok = verdicts.filter((v) => v.predicted);
  const expectedDupes = verdicts.filter((v) => v.truth.duplicateOf !== null);
  return {
    documents: verdicts.length,
    pages: verdicts.reduce((n, v) => n + v.truth.pages.length, 0),
    correct: verdicts.filter((v) => v.correct).length,
    correctOrFlagged: verdicts.filter((v) => v.correct || v.flagged).length,
    splitCorrect: verdicts.filter((v) => v.splitCorrect).length,
    autoAccepted,
    misfiledWhileAuto,
    duplicatesExpected: expectedDupes.length,
    duplicatesCaught: expectedDupes.filter((v) => v.predicted?.duplicateOf).length,
    falseDuplicates,
    errorFilesExpected,
    errorFilesHandled,
    fields: {
      year: ok.filter((v) => v.predicted?.fields.taxYear === v.truth.year).length,
      issuer: ok.filter((v) => norm(v.predicted?.fields.issuer) === norm(v.truth.issuer)).length,
      recipient: ok.filter(
        (v) => norm(v.predicted?.fields.recipientLastName) === norm(v.truth.recipientLast),
      ).length,
    },
    perForm: [...perForm.values()].sort((a, b) => a.formId.localeCompare(b.formId)),
    verdicts,
  };
}
