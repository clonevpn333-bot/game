import { Badge } from '@binderready/design';
import { parseFormsCatalog } from '@binderready/engine';
import formsJson from '@binderready/engine/forms.json';
import type { Metadata } from 'next';
import { mdxComponents } from '@/components/prose';
import { site } from '@/site.config';

export const metadata: Metadata = {
  title: 'Supported forms',
  description: `Every form type ${site.productName} recognizes, by binder category.`,
  alternates: { canonical: '/docs/supported-forms/' },
};

const catalog = parseFormsCatalog(formsJson);

const H1 = mdxComponents.h1;
const P = mdxComponents.p;

export default function SupportedFormsPage() {
  const groups = catalog.categories
    .map((category) => ({
      category,
      forms: catalog.forms.filter((f) => f.category === category.id),
    }))
    .filter((g) => g.forms.length > 0);

  return (
    <>
      <H1>Supported forms</H1>
      <P>
        {site.productName} recognizes {catalog.forms.length} document types, listed here in default
        binder order. Anything else goes to Other and is marked for review, so you can name it
        yourself.
      </P>
      <div className="mt-10 divide-y divide-border border-y border-border">
        {groups.map(({ category, forms }) => (
          <section
            key={category.id}
            className="grid gap-4 py-6 sm:grid-cols-[220px_1fr]"
            aria-labelledby={`cat-${category.id}`}
          >
            <h2 id={`cat-${category.id}`} className="text-[15px] font-medium">
              {category.displayName}
            </h2>
            <ul className="space-y-3">
              {forms.map((form) => (
                <li key={form.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-[13px] text-fg">{form.displayName}</span>
                  {form.kind === 'heuristic' ? <Badge>Recognized by layout</Badge> : null}
                  {form.multiPage ? <Badge>Multi-page</Badge> : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <P>
        Brokerage consolidated statements and property tax statements aren’t standard government
        forms, so {site.productName} recognizes them by their wording and layout and marks them
        Check more often than official forms.
      </P>
    </>
  );
}
