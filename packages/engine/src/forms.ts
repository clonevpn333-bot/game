/**
 * The form catalog (forms.json): what BinderReady recognizes and where each
 * document goes in the binder. Pure data + validation; no IO.
 */

export const CATEGORY_IDS = [
  'organizer',
  'wages',
  'interest-dividends',
  'brokerage',
  'retirement',
  'self-employment',
  'health',
  'education',
  'mortgage-property',
  'pass-through',
  'debt-other',
  'other',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface Category {
  id: CategoryId;
  displayName: string;
}

/** `official`: a published government form. `heuristic`: recognized by vocabulary only. */
export type FormKind = 'official' | 'heuristic';

export interface FormDefinition {
  id: string;
  displayName: string;
  category: CategoryId;
  kind: FormKind;
  /** Only ever filled by `pnpm forms:verify` from the official PDF. Never typed by hand. */
  ombNumbers: string[];
  titlePatterns: string[];
  /**
   * The form's designation as printed ("1099-INT", "Schedule K-1 … Form 1065"), derived from the
   * MVP list in BUILD_PROMPT.md rather than from form text, so it needs no source verification.
   */
  designationPatterns: string[];
  boxLabelPatterns: string[];
  keywords: string[];
  issuerFieldLabels: string[];
  /** Each pattern must capture the four-digit year in group 1. */
  yearPatterns: string[];
  filenameHints: string[];
  multiPage: boolean;
  /**
   * Forms this one bundles (a brokerage consolidated statement prints 1099-DIV,
   * 1099-INT and 1099-B sections). When its title matches, these can't outrank it.
   */
  containsForms?: string[];
  /** Official document the patterns are checked against; null for heuristic types or unknown sources. */
  source: string | null;
  /** ISO date the patterns were last confirmed against `source`; null until verified. */
  verifiedOn: string | null;
  /** Issuer used for naming when the form always comes from one agency (e.g. SSA). */
  fixedIssuer?: string;
  notes?: string;
}

export interface FormsCatalog {
  version: 1;
  /** RegExp flags applied to every pattern. */
  patternFlags: string;
  categories: Category[];
  forms: FormDefinition[];
}

export class CatalogError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`forms.json is invalid:\n  - ${problems.join('\n  - ')}`);
    this.name = 'CatalogError';
    this.problems = problems;
  }
}

const OMB_NUMBER = /^\d{4}-\d{4}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FORM_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Json = Record<string, unknown>;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/**
 * Validates raw forms.json content and returns it typed. Collects every
 * problem instead of stopping at the first, so one run shows all fixes needed.
 */
export function parseFormsCatalog(raw: unknown): FormsCatalog {
  const problems: string[] = [];
  const root = (raw ?? {}) as Json;

  if (root.version !== 1) problems.push('version must be 1');
  const flags = root.patternFlags;
  if (typeof flags !== 'string' || !/^[dgimsuyv]*$/.test(flags)) {
    problems.push('patternFlags must be a string of RegExp flags');
  }

  const categories = Array.isArray(root.categories) ? (root.categories as Json[]) : [];
  const categoryIds = categories.map((c) => c.id);
  if (JSON.stringify(categoryIds) !== JSON.stringify(CATEGORY_IDS)) {
    problems.push(`categories must be exactly, in order: ${CATEGORY_IDS.join(', ')}`);
  }
  for (const c of categories) {
    if (typeof c.displayName !== 'string' || c.displayName === '') {
      problems.push(`category ${String(c.id)}: displayName is required`);
    }
  }

  const forms = Array.isArray(root.forms) ? (root.forms as Json[]) : [];
  if (forms.length === 0) problems.push('forms must be a non-empty array');
  const seen = new Set<string>();

  for (const [index, f] of forms.entries()) {
    const id = typeof f.id === 'string' ? f.id : `#${index}`;
    const at = (msg: string) => problems.push(`${id}: ${msg}`);

    if (typeof f.id !== 'string' || !FORM_ID.test(f.id)) at('id must be lowercase kebab-case');
    if (seen.has(id)) at('duplicate id');
    seen.add(id);
    if (typeof f.displayName !== 'string' || f.displayName === '') at('displayName is required');
    if (!CATEGORY_IDS.includes(f.category as CategoryId))
      at(`unknown category ${String(f.category)}`);
    if (f.kind !== 'official' && f.kind !== 'heuristic') at('kind must be official or heuristic');
    if (typeof f.multiPage !== 'boolean') at('multiPage must be a boolean');

    for (const key of [
      'ombNumbers',
      'titlePatterns',
      'designationPatterns',
      'boxLabelPatterns',
      'keywords',
      'issuerFieldLabels',
      'yearPatterns',
      'filenameHints',
    ]) {
      if (!isStringArray(f[key])) at(`${key} must be an array of strings`);
    }
    if (isStringArray(f.titlePatterns) && f.titlePatterns.length === 0) {
      at('needs at least one titlePattern');
    }

    for (const key of [
      'titlePatterns',
      'designationPatterns',
      'boxLabelPatterns',
      'issuerFieldLabels',
      'yearPatterns',
      'filenameHints',
    ]) {
      if (!isStringArray(f[key])) continue;
      for (const pattern of f[key]) {
        try {
          const re = new RegExp(pattern, typeof flags === 'string' ? flags : '');
          if (key === 'yearPatterns' && !/\((?!\?)/.test(re.source)) {
            at(`yearPattern ${pattern} must capture the year in group 1`);
          }
        } catch (error) {
          at(`${key} has an invalid RegExp ${pattern}: ${(error as Error).message}`);
        }
      }
    }

    const omb = isStringArray(f.ombNumbers) ? f.ombNumbers : [];
    for (const n of omb) if (!OMB_NUMBER.test(n)) at(`OMB number ${n} must look like 1545-0000`);

    const source = f.source;
    if (source !== null && (typeof source !== 'string' || !source.startsWith('https://'))) {
      at('source must be an https URL or null');
    }
    const verifiedOn = f.verifiedOn;
    if (verifiedOn !== null && (typeof verifiedOn !== 'string' || !ISO_DATE.test(verifiedOn))) {
      at('verifiedOn must be an ISO date (YYYY-MM-DD) or null');
    }

    // Provenance rules: an OMB number can only exist once its source was checked.
    if (omb.length > 0 && verifiedOn === null) {
      at('has OMB numbers but no verifiedOn date; OMB numbers must come from forms:verify');
    }
    if (verifiedOn !== null && source === null) at('verifiedOn is set but there is no source');
    if (f.kind === 'heuristic') {
      if (omb.length > 0) at('heuristic types cannot have OMB numbers');
      if (source !== null) at('heuristic types have no official source');
    }
    if (f.containsForms !== undefined) {
      if (!isStringArray(f.containsForms)) at('containsForms must be an array of form ids');
    }
    if (f.fixedIssuer !== undefined && typeof f.fixedIssuer !== 'string') {
      at('fixedIssuer must be a string');
    }
  }

  const ids = new Set(forms.map((f) => f.id));
  for (const f of forms) {
    for (const contained of isStringArray(f.containsForms) ? f.containsForms : []) {
      if (!ids.has(contained))
        problems.push(`${String(f.id)}: containsForms names unknown form ${contained}`);
    }
  }

  if (problems.length > 0) throw new CatalogError(problems);
  return raw as FormsCatalog;
}

/** Compiles a catalog pattern with the catalog's flags. */
export function compilePattern(catalog: FormsCatalog, pattern: string): RegExp {
  return new RegExp(pattern, catalog.patternFlags);
}
