'use client';

import { Check, Copy, Undo2 } from 'lucide-react';
import { useState } from 'react';

interface Expected {
  id: string;
  form: string;
  issuer: string;
}

const lastYear: Expected[] = [
  { id: 'div', form: '1099-DIV', issuer: 'Sample Brokerage' },
  { id: 'sa', form: '1099-SA', issuer: 'Sample Health Bank' },
  { id: 'int', form: '1099-INT', issuer: 'Testville Savings' },
];

function emailText(items: Expected[]) {
  const lines = items.map((item) => `- ${item.form} from ${item.issuer}`);
  return [
    'Hi Jane,',
    '',
    'Thanks for sending your 2026 documents. A few that you had last year haven’t arrived yet:',
    '',
    ...lines,
    '',
    'If any of these don’t apply this year, let me know and I’ll take them off the list.',
  ].join('\n');
}

/** A working slice of the app's "Missing from last year" panel. */
export function MissingDocsDemo() {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const open = lastYear.filter((item) => !dismissed.includes(item.id));

  return (
    <div className="rounded-[10px] border border-border-strong bg-surface text-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="font-medium">Missing from last year</p>
        <span className="tabular font-mono text-xs text-fg-muted">
          {open.length} of {lastYear.length}
        </span>
      </div>
      <ul className="divide-y divide-border">
        {lastYear.map((item) => {
          const isDismissed = dismissed.includes(item.id);
          return (
            <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <div
                className={
                  isDismissed ? 'min-w-0 flex-1 basis-56 opacity-50' : 'min-w-0 flex-1 basis-56'
                }
              >
                <p className="font-mono text-[13px]">
                  {item.form} <span className="text-fg-muted">· {item.issuer}</span>
                </p>
                <p className="text-xs text-fg-muted">
                  {isDismissed ? 'Not expected this year' : 'Received in 2025 · not here yet'}
                </p>
              </div>
              <button
                type="button"
                aria-label={`${isDismissed ? 'Undo' : 'Not expected this year'}: ${item.form} from ${item.issuer}`}
                onClick={() => {
                  setCopied(false);
                  setDismissed((d) =>
                    isDismissed ? d.filter((id) => id !== item.id) : [...d, item.id],
                  );
                }}
                className="inline-flex h-7 items-center gap-1.5 rounded-control border border-border-strong px-2.5 text-xs text-fg-muted transition-colors duration-150 hover:bg-fg/6 hover:text-fg"
              >
                {isDismissed ? (
                  <>
                    <Undo2 className="size-3.5" strokeWidth={1.5} aria-hidden />
                    Undo
                  </>
                ) : (
                  'Not expected this year'
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg-subtle px-4 py-3">
        <p aria-live="polite" className="text-xs text-fg-muted">
          {copied
            ? 'Copied. Paste it into an email to your client.'
            : 'Ready to send to your client.'}
        </p>
        <button
          type="button"
          disabled={open.length === 0}
          onClick={() => {
            void navigator.clipboard.writeText(emailText(open)).then(
              () => {
                setCopied(true);
              },
              () => {
                setCopied(false);
              },
            );
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-control bg-fg px-3 text-xs font-medium text-bg transition-colors duration-150 hover:bg-fg/85 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {copied ? (
            <Check className="size-3.5" strokeWidth={1.5} aria-hidden />
          ) : (
            <Copy className="size-3.5" strokeWidth={1.5} aria-hidden />
          )}
          Copy missing-docs list
        </button>
      </div>
    </div>
  );
}
