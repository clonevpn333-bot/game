import { parseFormsCatalog } from '@binderready/engine';
import formsJson from '@binderready/engine/forms.json';

export const catalog = parseFormsCatalog(formsJson);
export const formById = new Map(catalog.forms.map((f) => [f.id, f]));
export const categoryName = new Map(catalog.categories.map((c) => [c.id, c.displayName]));

/** Short label for a form: "K-1 (1065)" rather than "Schedule K-1 (Form 1065)". */
export function formLabel(formId: string | null): string {
  if (!formId) return 'Unrecognized';
  const name = formById.get(formId)?.displayName ?? formId;
  return name.replace(/^Schedule K-1 \(Form (.+)\)$/, 'K-1 ($1)');
}
