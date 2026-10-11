import type { CategoryId } from './forms.ts';

/** One recognized word. Coordinates are fractions of the page (0–1, origin top-left). */
export interface Word {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** OCR confidence 0–1; 1 for an embedded text layer. */
  confidence: number;
}

export interface PageInput {
  /** Index of the page within its file, 0-based. */
  index: number;
  words: Word[];
  /** Where the words came from: an embedded PDF text layer or OCR. */
  source: 'text-layer' | 'ocr';
  /** 64-bit perceptual hash of the rendered page as 16 hex chars, when available. */
  phash?: string;
}

export interface FileInput {
  id: string;
  /** Original file name as dropped, e.g. "IMG_5678.HEIC". */
  name: string;
  /** SHA-256 of the file bytes. */
  sha256: string;
  pages: PageInput[];
}

export type Status = 'auto' | 'check' | 'review';

export interface Alternative {
  formId: string;
  confidence: number;
}

export interface Classification {
  formId: string | null;
  confidence: number;
  status: Status;
  /** Other plausible form types, best first (always set when status is "check" for a close call). */
  alternatives: Alternative[];
  /** True when the page reads as the start of a form (title or designation in the header). */
  startsForm: boolean;
  /** True when the page says it continues something ("Page 2 of 3", "continued", instructions). */
  continuation: boolean;
}

export interface ExtractedFields {
  taxYear: number | null;
  issuer: string | null;
  recipientLastName: string | null;
}

export interface DocumentResult {
  id: string;
  fileId: string;
  fileName: string;
  /** Page indexes within the file, in order. */
  pages: number[];
  formId: string | null;
  category: CategoryId;
  confidence: number;
  status: Status;
  alternatives: Alternative[];
  fields: ExtractedFields;
  name: string;
  /** Set when this document duplicates another; points at the kept document. */
  duplicateOf: string | null;
  duplicateKind: 'exact' | 'near' | null;
}
