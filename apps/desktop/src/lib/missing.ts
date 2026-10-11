/**
 * Missing-documents check. After each export the app keeps, per client and tax
 * year, only {form type, issuer name} for each document. The next year's binder is
 * compared against the most recent earlier year.
 */
import { formById } from './catalog';
import type { ReviewDoc } from './review';

export interface IndexItem {
  formType: string;
  /** Empty when the issuer could not be read. */
  issuerName: string;
}

export interface MissingItem extends IndexItem {
  dismissed: boolean;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const itemKey = (i: IndexItem) => `${i.formType}|${norm(i.issuerName)}`;

/** What this binder contains, as stored for next year. One entry per form + issuer. */
export function indexItems(docs: ReviewDoc[]): IndexItem[] {
  const seen = new Map<string, IndexItem>();
  for (const d of docs) {
    if (d.excluded || !d.formId) continue;
    const item = { formType: d.formId, issuerName: d.fields.issuer ?? '' };
    if (!seen.has(itemKey(item))) seen.set(itemKey(item), item);
  }
  return [...seen.values()];
}

/**
 * Last year's items with nothing matching in this binder. Matching is one to one:
 * the same form from the same issuer first, then (when an issuer couldn't be read
 * on either side) the same form alone, so one unreadable W-2 can't hide a second
 * employer's missing W-2.
 */
export function missingItems(
  previous: IndexItem[],
  docs: ReviewDoc[],
  dismissed: IndexItem[],
): MissingItem[] {
  const current = indexItems(docs);
  const used = new Set<number>();
  const take = (match: (c: IndexItem) => boolean) => {
    const i = current.findIndex((c, n) => !used.has(n) && match(c));
    if (i < 0) return false;
    used.add(i);
    return true;
  };
  const unique = [...new Map(previous.map((p) => [itemKey(p), p])).values()];
  const pending = unique.filter(
    (p) =>
      !take(
        (c) =>
          c.formType === p.formType && !!p.issuerName && norm(c.issuerName) === norm(p.issuerName),
      ),
  );
  const missing = pending.filter(
    (p) => !take((c) => c.formType === p.formType && (!p.issuerName || !c.issuerName)),
  );
  const dismissedKeys = new Set(dismissed.map(itemKey));
  return missing.map((m) => ({ ...m, dismissed: dismissedKeys.has(itemKey(m)) }));
}

/** "Form W-2 from Northwind Logistics LLC", "Schedule K-1 (Form 1065)", … */
export function describeItem(item: IndexItem): string {
  const form = formById.get(item.formType);
  const name = form?.displayName ?? item.formType;
  const label = form?.kind === 'official' && !name.startsWith('Schedule') ? `Form ${name}` : name;
  return item.issuerName ? `${label} from ${item.issuerName}` : label;
}

/** Plain text for an email to the client. Dismissed items are left out. */
export function missingListText(options: {
  clientName: string;
  taxYear: number;
  previousYear: number;
  items: MissingItem[];
  firmName: string;
}): string {
  const items = options.items.filter((i) => !i.dismissed);
  const first = options.clientName.trim().split(/\s+/)[0] ?? options.clientName;
  const lines = [
    `Hi ${first},`,
    '',
    `Thanks for sending your ${String(options.taxYear)} tax documents. Compared with what you sent for ${String(options.previousYear)}, we haven’t received these yet:`,
    '',
    ...items.map((i) => `- ${describeItem(i)}`),
    '',
    'If one of these doesn’t apply this year, just let us know and we’ll take it off the list.',
    '',
    'Thank you,',
    ...(options.firmName.trim() ? [options.firmName.trim()] : []),
  ];
  return lines.join('\n');
}
