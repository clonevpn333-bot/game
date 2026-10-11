import { buttonStyles } from '@binderready/design';
import { FileDown } from 'lucide-react';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { Rails } from '@/components/rails';
import { PrintButton } from '@/components/print-button';
import { securityLastUpdated, securityPdfPath, securitySections } from '@/lib/security-content';
import { site } from '@/site.config';

export const metadata: Metadata = {
  title: 'Security overview',
  description: `What ${site.productName} does on your computer, what it stores, and the only two network requests it makes.`,
  alternates: { canonical: '/security/' },
};

const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(
  new Date(securityLastUpdated),
);

export default function SecurityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Security overview"
        title="What happens to your clients’ documents."
        lede={`A plain account of what ${site.productName} does on your computer, what it keeps, and the two network requests it makes. Print it or download it for your security plan.`}
      >
        <div className="no-print mt-8 flex flex-wrap items-center gap-3">
          <a href={securityPdfPath} download className={buttonStyles()}>
            <FileDown strokeWidth={1.5} />
            Download PDF
          </a>
          <PrintButton />
          <p className="font-mono text-xs text-fg-subtle">Last updated {date}</p>
        </div>
      </PageHeader>
      <div className="border-t border-border">
        <Rails>
          <div className="grid gap-12 px-5 py-14 md:px-10 md:py-20 lg:grid-cols-[220px_minmax(0,1fr)]">
            <nav aria-label="On this page" className="no-print hidden lg:block">
              <ol className="sticky top-24 space-y-2 text-sm">
                {securitySections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="text-fg-muted transition-colors duration-150 hover:text-fg"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <article className="max-w-[70ch]">
              {securitySections.map((section, i) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-24 border-b border-border py-10 first:pt-0 last:border-0"
                >
                  <h2 className="flex items-baseline gap-3 text-2xl font-semibold tracking-[-0.025em]">
                    <span className="tabular font-mono text-sm font-normal text-fg-subtle">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {section.title}
                  </h2>
                  {section.paragraphs?.map((p) => (
                    <p key={p} className="mt-4 text-[15px] leading-7 text-fg-muted">
                      {p}
                    </p>
                  ))}
                  {section.items ? (
                    <dl className="mt-6 divide-y divide-border rounded-[10px] border border-border">
                      {section.items.map((item) => (
                        <div key={item.term} className="p-5">
                          <dt className="font-medium text-fg">{item.term}</dt>
                          <dd className="mt-1.5 text-[15px] leading-7 text-fg-muted">
                            {item.detail}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </section>
              ))}
            </article>
          </div>
        </Rails>
      </div>
    </>
  );
}
