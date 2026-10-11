/**
 * Naming fields only: tax year, issuer and recipient last name. Never SSNs, TINs,
 * account numbers or amounts — value lines containing digits are skipped for names.
 */
import { compilePattern, type FormDefinition, type FormsCatalog } from './forms.ts';
import type { Line, PageText } from './text.ts';
import type { ExtractedFields } from './types.ts';

const MIN_YEAR = 2000;
const MAX_YEAR = 2099;

export function extractYear(
  catalog: FormsCatalog,
  form: FormDefinition | null,
  text: PageText,
): number | null {
  const counts = new Map<number, number>();
  const add = (y: number, weight: number) => {
    if (y >= MIN_YEAR && y <= MAX_YEAR) counts.set(y, (counts.get(y) ?? 0) + weight);
  };
  for (const pattern of form?.yearPatterns ?? []) {
    const re = new RegExp(compilePattern(catalog, pattern).source, `${catalog.patternFlags}g`);
    for (const m of text.header.matchAll(re)) add(Number(m[1]), 3);
    for (const m of text.full.matchAll(re)) add(Number(m[1]), 1);
  }
  if (counts.size === 0) {
    // Fall back to a bare year in the header band, where forms print the tax year.
    for (const m of text.header.matchAll(/\b(20\d{2})\b/g)) add(Number(m[1]), 1);
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [year, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && year > best)) {
      best = year;
      bestCount = count;
    }
  }
  return best;
}

// Words that mark a line as a printed label rather than a value. "State", "city" and
// "ZIP" are left out on purpose: they appear in real issuer names ("State College").
const LABELISH =
  /\b(?:name|address|street|telephone|phone|number|identification|tin|ein|ssn|account|box|omb|corrected|void)\b|['’]s\b|:$/i;
/** Identifier and amount shapes: a line with any of these is never a name. */
const NOT_A_NAME =
  /\d{3}-\d{2}-\d{4}|\d{2}-\d{7}|X{3}-X{2}|\$|\d+[.,]\d{2}\b|\b\d{5}(?:-\d{4})?\b|\d{4,}/;
const LEGAL_SUFFIX =
  /^(?:llc|l\.l\.c\.|inc\.?|corp\.?|co\.?|lp|llp|pllc|n\.a\.|na|usa|fsb|plc|pc|p\.c\.)$/i;
const NAME_SUFFIX = /^(?:jr\.?|sr\.?|ii|iii|iv|v)$/i;

function smartCase(value: string): string {
  if (value !== value.toUpperCase()) return value;
  return value
    .toLowerCase()
    .split(' ')
    .map((word) =>
      LEGAL_SUFFIX.test(word)
        ? word.toUpperCase()
        : word.replace(/(^|[-'])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase()),
    )
    .join(' ');
}

function cleanName(raw: string, allowDigits = false): string | null {
  const value = raw
    .replace(/\s{2,}/g, ' ')
    .replace(/[,;]+$/, '')
    .replace(/^[\s:–-]+/, '')
    .trim();
  if (value.length < 2 || !/[a-z]{2}/i.test(value) || NOT_A_NAME.test(value)) return null;
  if (!allowDigits && /\d/.test(value)) return null;
  return smartCase(value.slice(0, 80));
}

/** The value printed under (or after) a label: same line remainder, else the next lines in that column. */
function valueAfterLabel(lines: Line[], labelRe: RegExp, allowDigits = false): string | null {
  for (const [i, line] of lines.entries()) {
    const m = labelRe.exec(line.text);
    if (!m) continue;
    // "Taxpayer name: Jane Sample" style: the value follows a colon on the same line.
    const inline = /^[^:]{0,60}:\s*(.+)$/.exec(line.text.slice(m.index + m[0].length));
    if (inline?.[1] && !LABELISH.test(inline[1])) {
      const name = cleanName(inline[1], allowDigits);
      if (name) return name;
    }
    for (const next of lines.slice(i + 1)) {
      if (next.y - line.y > 0.1) break;
      if (next.y <= line.y + 0.002 || Math.abs(next.x - line.x) > 0.2) continue;
      if (LABELISH.test(next.text)) continue;
      const name = cleanName(next.text, allowDigits);
      if (name) return name;
    }
  }
  return null;
}

/**
 * Statements without an issuer label (brokerage, county tax bills) print the
 * issuer as a letterhead: the first header line that isn't a title or label.
 */
function letterhead(catalog: FormsCatalog, form: FormDefinition, text: PageText): string | null {
  for (const line of text.lines) {
    if (line.y >= 0.12) break;
    if (form.titlePatterns.some((p) => compilePattern(catalog, p).test(line.text))) continue;
    if (
      /\b(?:tax|statement|form|page|account|recipient)\b/i.test(line.text) &&
      !/treasurer|collector/i.test(line.text)
    )
      continue;
    const name = cleanName(line.text);
    if (name) return name;
  }
  return null;
}

export function extractIssuer(
  catalog: FormsCatalog,
  form: FormDefinition | null,
  text: PageText,
): string | null {
  if (!form) return null;
  if (form.fixedIssuer) return form.fixedIssuer;
  if (form.kind === 'heuristic') return letterhead(catalog, form, text);
  for (const pattern of form.issuerFieldLabels) {
    const value = valueAfterLabel(text.lines, compilePattern(catalog, pattern), true);
    if (value) return value;
  }
  // The form's own labels found nothing: try the generic issuer roles.
  for (const label of GENERIC_ISSUER_LABELS) {
    const value = valueAfterLabel(text.lines, label, true);
    if (value) return value;
  }
  return null;
}

/** Issuer roles printed across information returns, used when a form's own labels miss. */
const GENERIC_ISSUER_LABELS = [
  /\b(?:PAYER|FILER|TRUSTEE|LENDER|CREDITOR|ISSUER)['’]?S(?:\s*\/\s*(?:PAYER|TRUSTEE|LENDER)['’]?S)?\s+name/i,
];

/** Generic recipient labels across the supported forms. */
const RECIPIENT_LABELS = [
  /RECIPIENT['’]?S\s+name/i,
  /Employee['’]?s\s+first\s+name/i,
  /BORROWER['’]?S\s+name/i,
  /STUDENT['’]?S\s+name/i,
  /PAYEE['’]?S\s+name/i,
  /BENEFICIARY['’]?S\s+name/i,
  /Partner['’]?s\s+name/i,
  /Shareholder['’]?s\s+name/i,
  /Beneficiary['’]?s\s+name/i,
  /Name\s+of\s+(?:recipient|beneficiary|employee|responsible\s+individual)/i,
  /TRANSFEROR['’]?S\s+name/i,
  /DEBTOR['’]?S\s+name/i,
  /PARTICIPANT['’]?S\s+name/i,
  /WINNER['’]?S\s+name/i,
  /\bRecipient(?=\s*:)/i,
  /Box\s*1\.?\s*Name\b/i,
  /Taxpayer\s+name|Owner\s+name|Property\s+owner/i,
];

export function extractRecipientLastName(text: PageText): string | null {
  for (const label of RECIPIENT_LABELS) {
    const value = valueAfterLabel(text.lines, label);
    if (!value) continue;
    const parts = value.split(/\s+/).filter((p) => !NAME_SUFFIX.test(p) && !/&/.test(p));
    const last = parts.at(-1);
    if (last) return smartCase(last.replace(/[,.]$/, ''));
  }
  return null;
}

export function extractFields(
  catalog: FormsCatalog,
  form: FormDefinition | null,
  texts: PageText[],
): ExtractedFields {
  const first = texts[0];
  if (!first) return { taxYear: null, issuer: null, recipientLastName: null };
  let issuer = extractIssuer(catalog, form, first);
  let recipientLastName = extractRecipientLastName(first);
  let taxYear = extractYear(catalog, form, first);
  for (const t of texts.slice(1, 3)) {
    issuer ??= extractIssuer(catalog, form, t);
    recipientLastName ??= extractRecipientLastName(t);
    taxYear ??= extractYear(catalog, form, t);
  }
  return { taxYear, issuer, recipientLastName };
}
