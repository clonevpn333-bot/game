import { ArrowRight, KeyRound, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { site } from '@/site.config';
import { Rails } from '../rails';

export function PrivacyPanel() {
  return (
    <section
      aria-labelledby="privacy-title"
      data-theme="dark"
      className="relative overflow-hidden border-t border-border bg-bg text-fg"
    >
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <Rails className="relative">
        <div className="grid gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div className="reveal">
            <p className="eyebrow">03 — Privacy</p>
            <h2 id="privacy-title" className="mt-4 text-h2 text-balance md:text-[3.25rem]">
              Nothing leaves this computer.
            </h2>
            <p className="mt-6 max-w-[52ch] text-body text-fg-muted">
              {site.productName} reads, recognizes and assembles documents entirely on your machine.
              There’s no account and no cloud processing, and client files are never uploaded. The
              app’s own security policy blocks every network request except two.
            </p>
            <Link
              href="/security/"
              className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-fg underline-offset-4 hover:underline"
            >
              Read the security overview
              <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
            </Link>
          </div>
          <div className="reveal self-end">
            <p className="font-mono text-xs text-fg-subtle">Allowed network requests</p>
            <ol className="mt-4 divide-y divide-border rounded-[14px] border border-border-strong bg-surface">
              <li className="flex gap-4 p-5">
                <KeyRound
                  className="mt-0.5 size-4 shrink-0 text-fg-muted"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <div>
                  <p className="text-[15px] font-medium">License activation</p>
                  <p className="mt-1 text-sm text-fg-muted">
                    Sends your license key and a device name.
                  </p>
                  <p className="mt-2 font-mono text-xs text-fg-subtle">
                    {site.network.licenseHost}
                  </p>
                </div>
              </li>
              <li className="flex gap-4 p-5">
                <RefreshCw
                  className="mt-0.5 size-4 shrink-0 text-fg-muted"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <div>
                  <p className="text-[15px] font-medium">Update check</p>
                  <p className="mt-1 text-sm text-fg-muted">Can be turned off in Settings.</p>
                  <p className="mt-2 font-mono text-xs text-fg-subtle">{site.network.updateHost}</p>
                </div>
              </li>
            </ol>
            <p className="mt-4 font-mono text-xs text-fg-subtle">
              Everything else is blocked by the app’s Content Security Policy.
            </p>
          </div>
        </div>
      </Rails>
    </section>
  );
}
