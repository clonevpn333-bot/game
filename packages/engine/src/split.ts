/**
 * Page grouping within one file. A new document starts at a form title or
 * designation in the header, or when the form type changes; pages continue a
 * document on "Page X of Y", continuation markers, instruction backs, or when
 * a multi-page form repeats its header.
 */
import type { FormsCatalog } from './forms.ts';
import type { PageText } from './text.ts';
import type { Classification } from './types.ts';

export interface PageGroup {
  pages: number[];
}

/** A page with this little text is a blank side, a back or an image without text. */
const SPARSE_WORDS = 25;

export function splitPages(
  catalog: FormsCatalog,
  texts: PageText[],
  classes: Classification[],
): PageGroup[] {
  const groups: (PageGroup & { formId: string | null })[] = [];
  const multiPage = new Map(catalog.forms.map((f) => [f.id, f.multiPage]));

  classes.forEach((c, i) => {
    const current = groups.at(-1);
    const words = texts[i]?.full.split(/\s+/).length ?? 0;
    if (!current) {
      groups.push({ pages: [i], formId: c.formId });
      return;
    }
    const sameForm = c.formId !== null && c.formId === current.formId;
    const currentMultiPage = current.formId !== null && (multiPage.get(current.formId) ?? false);

    let startNew: boolean;
    if (c.continuation) startNew = false;
    else if (c.startsForm) startNew = !(sameForm && currentMultiPage);
    else if (c.formId === null || c.status === 'review')
      startNew = words > SPARSE_WORDS && !currentMultiPage;
    else startNew = !sameForm;

    if (startNew) groups.push({ pages: [i], formId: c.formId });
    else {
      current.pages.push(i);
      current.formId ??= c.formId;
    }
  });
  return groups.map(({ pages }) => ({ pages }));
}
