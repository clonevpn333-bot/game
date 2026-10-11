/**
 * Checks a form definition against the text of its official source document.
 * Used by `pnpm forms:verify`; pure so it can be unit tested without network.
 */
import { compilePattern, type FormDefinition, type FormsCatalog } from './forms.ts';

/** Collapses whitespace and folds typographic quotes and dashes to ASCII. */
export function normalizeText(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every distinct "OMB No. 1545-0000" style number in the text, in order of appearance. */
export function extractOmbNumbers(text: string): string[] {
  const found = new Set<string>();
  for (const m of normalizeText(text).matchAll(/OMB\s*No\.?\s*:?\s*(\d{4})\s*-\s*(\d{4})/gi)) {
    found.add(`${m[1] ?? ''}-${m[2] ?? ''}`);
  }
  return [...found];
}

export interface PatternCheck {
  pattern: string;
  matched: boolean;
}

export interface FormCheck {
  formId: string;
  ombNumbers: string[];
  titles: PatternCheck[];
  boxLabels: PatternCheck[];
  issuerLabels: PatternCheck[];
  /** True when every title, box-label and issuer-label pattern matched the official text. */
  verified: boolean;
}

export function checkFormAgainstText(
  catalog: FormsCatalog,
  form: FormDefinition,
  rawText: string,
): FormCheck {
  const text = normalizeText(rawText);
  const run = (patterns: string[]): PatternCheck[] =>
    patterns.map((pattern) => ({ pattern, matched: compilePattern(catalog, pattern).test(text) }));

  const titles = run(form.titlePatterns);
  const boxLabels = run(form.boxLabelPatterns);
  const issuerLabels = run(form.issuerFieldLabels);
  const verified = [...titles, ...boxLabels, ...issuerLabels].every((c) => c.matched);

  return {
    formId: form.id,
    ombNumbers: extractOmbNumbers(text),
    titles,
    boxLabels,
    issuerLabels,
    verified,
  };
}
