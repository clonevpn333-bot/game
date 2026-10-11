import { Badge, Button } from '@binderready/design';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { BookCopy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { backend, type BinderRow } from '../lib/backend';
import { isMac } from '../lib/platform';

export function Recent() {
  const [rows, setRows] = useState<BinderRow[] | null>(null);
  useEffect(() => {
    void backend.listBinders().then(setRows);
  }, []);
  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <p className="eyebrow">Recent binders</p>
      <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">Exported binders</h1>
      {rows && rows.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <BookCopy className="size-8 text-fg-subtle" strokeWidth={1.25} aria-hidden />
          <p className="text-[15px] font-medium">No binders exported yet</p>
          <p className="max-w-[40ch] text-sm text-fg-muted">
            Binders you export appear here, with a shortcut to their folder.
          </p>
        </div>
      ) : null}
      {rows?.length ? (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {rows.map((b) => (
            <li key={b.id} className="flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px]">
                  {b.clientName} · {b.taxYear}
                </p>
                <p className="mt-0.5 truncate font-mono text-xs text-fg-muted" data-selectable>
                  {b.outputPath}
                </p>
              </div>
              {b.trial ? <Badge>Trial</Badge> : null}
              <span className="font-mono text-xs text-fg-muted tabular">
                {b.documents} docs · {b.pages} pages · {b.exportedAt.slice(0, 10)}
              </span>
              <Button size="sm" variant="ghost" onClick={() => void revealItemInDir(b.outputPath)}>
                {isMac ? 'Show in Finder' : 'Show in Explorer'}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
