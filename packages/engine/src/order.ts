import { CATEGORY_IDS, type CategoryId, type FormsCatalog } from './forms.ts';
import type { DocumentResult } from './types.ts';

export interface BinderSection {
  category: CategoryId;
  displayName: string;
  documents: DocumentResult[];
}

/**
 * Binder order: category order (default or the firm's own), then form order as
 * listed in forms.json, then issuer, then where the document was found.
 * Duplicates are left out.
 */
export function binderSections(
  catalog: FormsCatalog,
  documents: DocumentResult[],
  categoryOrder: readonly CategoryId[] = CATEGORY_IDS,
): BinderSection[] {
  const formIndex = new Map(catalog.forms.map((f, i) => [f.id, i]));
  const names = new Map(catalog.categories.map((c) => [c.id, c.displayName]));
  const order = [...categoryOrder, ...CATEGORY_IDS.filter((c) => !categoryOrder.includes(c))];
  const live = documents.filter((d) => d.duplicateOf === null);
  return order
    .map((category) => ({
      category,
      displayName: names.get(category) ?? category,
      documents: live
        .filter((d) => d.category === category)
        .sort(
          (a, b) =>
            (formIndex.get(a.formId ?? '') ?? 999) - (formIndex.get(b.formId ?? '') ?? 999) ||
            (a.fields.issuer ?? '').localeCompare(b.fields.issuer ?? '') ||
            a.fileName.localeCompare(b.fileName) ||
            (a.pages[0] ?? 0) - (b.pages[0] ?? 0),
        ),
    }))
    .filter((s) => s.documents.length > 0);
}
