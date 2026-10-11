import type { Metadata } from 'next';
import Link from 'next/link';
import { DownloadOptions } from '@/components/download-options';
import { NotConfigured } from '@/components/not-configured';
import { PageHeader } from '@/components/page-header';
import { Band, SectionHeading } from '@/components/rails';
import { site } from '@/site.config';

export const metadata: Metadata = {
  title: 'Download',
  description: `Download the ${site.productName} free trial for Windows or macOS.`,
  alternates: { canonical: '/download/' },
};

const req = site.systemRequirements;

export default function DownloadPage() {
  const { downloads } = site;
  return (
    <>
      <PageHeader
        eyebrow="Download"
        title={`Download ${site.productName}.`}
        lede={`The download is the full app. It runs as a free trial for ${site.pricing.trialBinders} client binders, and a license key unlocks it without reinstalling.`}
      >
        <div className="mt-10">
          <DownloadOptions
            windows={{
              url: downloads.windows,
              label: 'Download for Windows',
              file: 'Windows installer (.exe)',
            }}
            mac={{
              url: downloads.macAppleSilicon,
              label: 'Download for macOS',
              file: 'macOS disk image (.dmg), Apple silicon',
              alternate: {
                url: downloads.macIntel,
                label: 'Mac with an Intel processor? Download the Intel version',
              },
            }}
          />
          {downloads.releases ? (
            <p className="mt-4 text-sm text-fg-muted">
              Always the newest version.{' '}
              <a href={downloads.releases} className="text-fg underline underline-offset-4">
                All versions and release notes
              </a>
            </p>
          ) : (
            <p className="mt-4 text-sm text-fg-muted">
              <NotConfigured name="DOWNLOAD_REPO" />
            </p>
          )}
        </div>
      </PageHeader>

      <Band labelledBy="requirements-title">
        <div className="grid gap-10 px-5 py-16 md:px-10 md:py-20 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <SectionHeading
            id="requirements-title"
            eyebrow="System requirements"
            title="What you need."
          />
          <dl className="divide-y divide-border border-y border-border text-[15px]">
            {[
              ['Windows', req.windows],
              ['macOS', req.mac],
              ['Memory', req.memory],
              ['Disk', req.disk],
              ['Internet', 'Only to activate a license and, if you allow it, to check for updates'],
            ].map(([term, value]) => (
              <div key={term} className="grid gap-1 py-4 sm:grid-cols-[160px_1fr]">
                <dt className="font-mono text-xs uppercase tracking-[0.06em] text-fg-subtle sm:pt-1">
                  {term}
                </dt>
                <dd className="text-fg-muted">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Band>

      <Band labelledBy="trial-title">
        <div className="grid gap-10 px-5 py-16 md:px-10 md:py-20 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <SectionHeading
            id="trial-title"
            eyebrow="How the trial works"
            title="Every feature, three binders."
          />
          <ol className="space-y-6 text-[15px] text-fg-muted">
            {[
              ['Install and open it.', 'No account, no email address, no card.'],
              [
                `Build up to ${site.pricing.trialBinders} client binders.`,
                `Every feature works. Cover pages carry a small “Created with ${site.productName} trial” note.`,
              ],
              [
                'Buy when you’re ready.',
                'Enter your license key in Settings → License. Your clients, settings and history stay as they are.',
              ],
            ].map(([title, body], i) => (
              <li key={title} className="grid grid-cols-[2rem_1fr] gap-2">
                <span className="tabular font-mono text-sm text-fg-subtle">0{i + 1}</span>
                <div>
                  <p className="font-medium text-fg">{title}</p>
                  <p className="mt-1">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Band>
      <div className="border-t border-border px-4 py-8 text-center text-sm text-fg-muted">
        Installing on Windows or macOS for the first time?{' '}
        <Link href="/docs/" className="text-fg underline underline-offset-4">
          Read Getting started
        </Link>
      </div>
    </>
  );
}
