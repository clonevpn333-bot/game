/** Ground truth for one generated corpus tier. */
export interface CorpusManifest {
  tier: 'clean' | 'scanned' | 'photo';
  seed: number;
  /** "synthetic-templates" (built-in approximations) or "irs-fillable" (official PDFs filled with fake data). */
  generatedBy: 'synthetic-templates' | 'irs-fillable';
  files: TruthFile[];
}

export interface TruthFile {
  /** Path relative to the manifest. */
  path: string;
  /** The file name as a client would have sent it. */
  name: string;
  client: string;
  sha256: string;
  /** "password" and "corrupt" files must be reported as such, never processed. */
  expect: 'ok' | 'password' | 'corrupt';
  documents: TruthDocument[];
}

export interface TruthDocument {
  id: string;
  formId: string;
  /** 0-based page indexes within the file. */
  pages: number[];
  year: number;
  issuer: string;
  recipientLast: string;
  /** Truth id of the document this one duplicates (exact copy or separately scanned copy). */
  duplicateOf: string | null;
}
