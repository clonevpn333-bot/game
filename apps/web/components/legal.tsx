import { site } from '@/site.config';
import { NotConfigured } from './not-configured';

export function Company() {
  return <>{site.company.legalName ?? <NotConfigured name="COMPANY_LEGAL_NAME" />}</>;
}
export function GoverningState() {
  return <>{site.company.governingState ?? <NotConfigured name="COMPANY_GOVERNING_STATE" />}</>;
}
export function Address() {
  return <>{site.company.address ?? <NotConfigured name="COMPANY_ADDRESS" />}</>;
}
export function SupportEmail() {
  return site.supportEmail ? (
    <a href={`mailto:${site.supportEmail}`} className="text-fg underline underline-offset-4">
      {site.supportEmail}
    </a>
  ) : (
    <NotConfigured name="SUPPORT_EMAIL" />
  );
}

const fmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });

export function LegalHeader({ title, updated }: { title: string; updated: string }) {
  return (
    <header className="border-b border-border pb-8">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-4 text-[2.25rem] font-semibold leading-tight tracking-[-0.035em] md:text-[2.75rem]">
        {title}
      </h1>
      <p className="mt-3 font-mono text-xs text-fg-subtle">
        Last updated {fmt.format(new Date(updated))}
      </p>
    </header>
  );
}
