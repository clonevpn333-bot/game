/**
 * Page classification: weighted signals from forms.json, combined into a confidence.
 * Signal weights and thresholds live in ClassifierConfig so the accuracy harness can
 * tune them; never tune by editing test labels.
 */
import { compilePattern, type FormDefinition, type FormsCatalog } from './forms.ts';
import { pageText, type PageText } from './text.ts';
import type { Alternative, Classification, PageInput, Status } from './types.ts';
import { extractOmbNumbers } from './verify.ts';

export interface ClassifierConfig {
  weights: {
    omb: number;
    titleHeader: number;
    titleBody: number;
    designationHeader: number;
    designationBody: number;
    /** Multiplied by the fraction of box labels found. */
    boxLabels: number;
    keyword: number;
    keywordCap: number;
    filename: number;
    /** Multiplied by the fraction of issuer labels found. */
    issuerLabels: number;
  };
  /** Raw score that maps to confidence 1.0. */
  saturation: number;
  autoAccept: number;
  check: number;
  /** If the runner-up is within this margin of the winner, never auto-accept. */
  closeMargin: number;
}

export const defaultClassifierConfig: ClassifierConfig = {
  weights: {
    omb: 0.55,
    titleHeader: 0.5,
    titleBody: 0.3,
    designationHeader: 0.3,
    designationBody: 0.12,
    boxLabels: 0.4,
    keyword: 0.03,
    keywordCap: 0.09,
    filename: 0.08,
    issuerLabels: 0.06,
  },
  saturation: 1.05,
  autoAccept: 0.9,
  check: 0.6,
  closeMargin: 0.15,
};

export interface FormScore {
  formId: string;
  raw: number;
  confidence: number;
  titleInHeader: boolean;
  titleAnywhere: boolean;
  designationInHeader: boolean;
  multiPage: boolean;
}

const CONTINUATION = [
  /\bpage\s*([2-9]|[1-9]\d)\s*(?:of|\/)\s*\d+\b/i,
  /\(continued\)|\bcontinued\b|\bcontinuation\b/i,
  /\binstructions\s+for\s+(?:recipient|employee|payer|payee|borrower|student|partner|shareholder|beneficiary|participant|transferor|debtor|filer|winner)\b/i,
  /\binformation\s+to\s+winner\b/i,
  /\bnotice\s+to\s+employee\b/i,
];

function compiled(catalog: FormsCatalog) {
  const cache = new Map<string, RegExp>();
  return (pattern: string) => {
    let re = cache.get(pattern);
    if (!re) {
      re = compilePattern(catalog, pattern);
      cache.set(pattern, re);
    }
    return re;
  };
}

const regexCache = new WeakMap<FormsCatalog, (pattern: string) => RegExp>();
function re(catalog: FormsCatalog, pattern: string): RegExp {
  let get = regexCache.get(catalog);
  if (!get) {
    get = compiled(catalog);
    regexCache.set(catalog, get);
  }
  return get(pattern);
}

function anyMatch(catalog: FormsCatalog, patterns: string[], text: string): boolean {
  return patterns.some((p) => re(catalog, p).test(text));
}

function fraction(catalog: FormsCatalog, patterns: string[], text: string): number {
  if (patterns.length === 0) return 0;
  return patterns.filter((p) => re(catalog, p).test(text)).length / patterns.length;
}

export function scoreForm(
  catalog: FormsCatalog,
  form: FormDefinition,
  text: PageText,
  fileName: string,
  config: ClassifierConfig = defaultClassifierConfig,
): FormScore {
  const w = config.weights;
  let raw = 0;

  const omb = extractOmbNumbers(text.full);
  if (form.ombNumbers.some((n) => omb.includes(n))) raw += w.omb;

  const titleInHeader =
    anyMatch(catalog, form.titlePatterns, text.header) ||
    anyMatch(catalog, form.titlePatterns, text.headerColumns);
  const titleAnywhere =
    titleInHeader ||
    anyMatch(catalog, form.titlePatterns, text.full) ||
    anyMatch(catalog, form.titlePatterns, text.columns);
  if (titleInHeader) raw += w.titleHeader;
  else if (titleAnywhere) raw += w.titleBody;

  const designationInHeader = anyMatch(catalog, form.designationPatterns, text.header);
  if (designationInHeader) raw += w.designationHeader;
  else if (anyMatch(catalog, form.designationPatterns, text.full)) raw += w.designationBody;

  const both = `${text.full}\n\n${text.columns}`;
  raw += w.boxLabels * fraction(catalog, form.boxLabelPatterns, both);
  raw += w.issuerLabels * fraction(catalog, form.issuerFieldLabels, both);

  const lower = text.full.toLowerCase();
  const keywordHits = form.keywords.filter((k) => lower.includes(k.toLowerCase())).length;
  raw += Math.min(w.keywordCap, keywordHits * w.keyword);

  if (anyMatch(catalog, form.filenameHints, fileName)) raw += w.filename;

  return {
    formId: form.id,
    raw,
    confidence: Math.min(1, raw / config.saturation),
    titleInHeader,
    titleAnywhere,
    designationInHeader,
    multiPage: form.multiPage,
  };
}

export function isContinuation(text: PageText): boolean {
  return CONTINUATION.some((p) => p.test(text.full));
}

/** Scores every form and turns the best into a decision with a status. */
export function classifyPage(
  catalog: FormsCatalog,
  page: PageInput,
  fileName: string,
  config: ClassifierConfig = defaultClassifierConfig,
): Classification & { scores: FormScore[] } {
  const text = pageText(page.words);
  return classifyText(catalog, text, fileName, config);
}

export function classifyText(
  catalog: FormsCatalog,
  text: PageText,
  fileName: string,
  config: ClassifierConfig = defaultClassifierConfig,
): Classification & { scores: FormScore[] } {
  const scores = catalog.forms.map((form) => scoreForm(catalog, form, text, fileName, config));
  // A matched container title (e.g. "Consolidated Form 1099") outranks the forms it bundles.
  for (const form of catalog.forms) {
    const container = scores.find((s) => s.formId === form.id);
    if (!form.containsForms || !container?.titleInHeader) continue;
    for (const s of scores) {
      if (form.containsForms.includes(s.formId)) {
        s.confidence = Math.min(s.confidence, container.confidence * 0.5);
        s.titleInHeader = false;
        s.designationInHeader = false;
      }
    }
  }
  scores.sort((a, b) => b.confidence - a.confidence);
  const [best, second] = scores;
  const continuation = isContinuation(text);

  if (!best || best.confidence < 0.2) {
    return {
      formId: null,
      confidence: best?.confidence ?? 0,
      status: 'review',
      alternatives: [],
      startsForm: false,
      continuation,
      scores,
    };
  }

  const close = second !== undefined && best.confidence - second.confidence < config.closeMargin;
  let status: Status =
    best.confidence >= config.autoAccept
      ? 'auto'
      : best.confidence >= config.check
        ? 'check'
        : 'review';
  if (close && status === 'auto') status = 'check';

  const alternatives: Alternative[] = scores
    .slice(1)
    .filter(
      (s) =>
        s.confidence >= config.check * 0.5 &&
        best.confidence - s.confidence < config.closeMargin * 2,
    )
    .slice(0, 3)
    .map((s) => ({ formId: s.formId, confidence: s.confidence }));

  return {
    formId: status === 'review' && best.confidence < config.check * 0.5 ? null : best.formId,
    confidence: best.confidence,
    status,
    alternatives,
    // Single-page forms such as the W-2 print their title at the bottom: a title anywhere starts one.
    startsForm:
      best.titleInHeader || best.designationInHeader || (best.titleAnywhere && !best.multiPage),
    continuation,
    scores,
  };
}
