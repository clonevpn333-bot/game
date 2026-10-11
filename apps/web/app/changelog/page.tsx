import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { Rails } from '@/components/rails';
import { changelog } from '@/content/changelog';
import { site } from '@/site.config';

export const metadata: Metadata = {
  title: 'Changelog',
  description: `What’s new in each ${site.productName} release: new form support, fixes and improvements, newest first.`,
  alternates: { canonical: '/changelog/' },
};

const fmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });

export default function ChangelogPage() {
  return (
    <>
      <PageHeader
        eyebrow="Changelog"
        title="What’s new."
        lede={`Every ${site.productName} release, newest first.`}
      />
      <div className="border-t border-border">
        <Rails>
          <ol className="px-5 py-14 md:px-10 md:py-20">
            {changelog.map(({ version, date, Body }) => (
              <li
                key={version}
                className="grid gap-4 border-b border-border pb-12 last:border-0 md:grid-cols-[220px_minmax(0,1fr)] md:gap-12"
              >
                <div>
                  <h2 className="font-mono text-lg">{version}</h2>
                  <p className="mt-1 font-mono text-xs text-fg-subtle">
                    {date ? fmt.format(new Date(date)) : 'Unreleased'}
                  </p>
                </div>
                <div className="max-w-[68ch]">
                  <Body />
                </div>
              </li>
            ))}
          </ol>
        </Rails>
      </div>
    </>
  );
}
