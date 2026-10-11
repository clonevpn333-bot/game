import { Button } from '@binderready/design';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { Check, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { describeItem, missingItems, missingListText, type MissingItem } from '../lib/missing';
import { useApp } from '../state/store';

/** Missing items for the open binder, or null when the client has no earlier binder. */
export function useMissing(): { previousYear: number; items: MissingItem[] } | null {
  const history = useApp((s) => s.history);
  const docs = useApp((s) => s.docs);
  const dismissed = useApp((s) => s.dismissedMissing);
  return useMemo(
    () =>
      history
        ? { previousYear: history.taxYear, items: missingItems(history.items, docs, dismissed) }
        : null,
    [history, docs, dismissed],
  );
}

/** Copies the friendly missing-docs email text; returns whether it worked. */
export async function copyMissingList(items: MissingItem[], previousYear: number) {
  const { batch, firmName } = useApp.getState();
  if (!batch) return false;
  await writeText(
    missingListText({
      clientName: batch.client.displayName,
      taxYear: batch.taxYear,
      previousYear,
      items,
      firmName,
    }),
  );
  return true;
}

export function useCopied(): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => {
      setCopied(false);
    }, 2000);
    return () => {
      window.clearTimeout(t);
    };
  }, [copied]);
  return [
    copied,
    () => {
      setCopied(true);
    },
  ];
}

export function MissingPanel() {
  const missing = useMissing();
  const setDismissed = useApp((s) => s.setMissingDismissed);
  const [copied, markCopied] = useCopied();
  if (!missing) return null;
  const open = missing.items.filter((i) => !i.dismissed);
  const dismissed = missing.items.filter((i) => i.dismissed);
  return (
    <section aria-labelledby="missing-title" className="border-t border-border px-5 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="missing-title" className="text-[13px] font-medium">
          Missing from {missing.previousYear}
        </h2>
        <span className="font-mono text-xs text-fg-subtle tabular">{open.length}</span>
      </div>
      {open.length ? (
        <ul className="mt-3 space-y-2" aria-label="Missing documents">
          {open.map((item) => (
            <li
              key={`${item.formType}|${item.issuerName}`}
              className="rounded-card border border-border p-3 text-[13px]"
            >
              <p className="leading-snug">{describeItem(item)}</p>
              <button
                type="button"
                onClick={() => void setDismissed(item, true)}
                className="mt-1.5 text-xs text-fg-muted underline-offset-2 hover:text-fg hover:underline"
              >
                Not expected this year
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-fg-muted">
          Everything from the {missing.previousYear} binder is here.
        </p>
      )}
      {open.length ? (
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          onClick={() =>
            void copyMissingList(missing.items, missing.previousYear).then((ok) => {
              if (ok) markCopied();
            })
          }
        >
          {copied ? <Check strokeWidth={1.5} aria-hidden /> : null}
          {copied ? 'Copied' : 'Copy missing-docs list'}
        </Button>
      ) : null}
      {dismissed.length ? (
        <div className="mt-4">
          <p className="text-xs text-fg-subtle">Not expected this year</p>
          <ul className="mt-1.5 space-y-1">
            {dismissed.map((item) => (
              <li
                key={`${item.formType}|${item.issuerName}`}
                className="flex items-center justify-between gap-2 text-xs text-fg-muted"
              >
                <span className="min-w-0 truncate line-through">{describeItem(item)}</span>
                <button
                  type="button"
                  aria-label={`Expect ${describeItem(item)} again`}
                  title="Expect it again"
                  onClick={() => void setDismissed(item, false)}
                  className="grid size-6 shrink-0 place-items-center rounded-control hover:bg-bg-subtle hover:text-fg [&_svg]:size-3.5"
                >
                  <Undo2 strokeWidth={1.5} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
