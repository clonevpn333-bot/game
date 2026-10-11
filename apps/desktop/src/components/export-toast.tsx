import { Button } from '@binderready/design';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { CircleCheck, X } from 'lucide-react';
import { isMac } from '../lib/platform';
import { useApp } from '../state/store';

const isWindows = typeof navigator !== 'undefined' && /Win/i.test(navigator.platform);
const revealLabel = isMac ? 'Show in Finder' : isWindows ? 'Show in Explorer' : 'Show in folder';

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${String(Math.max(1, Math.round(bytes / 1024)))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Shown after an export until dismissed or the binder closes. */
export function ExportToast() {
  const result = useApp((s) => s.lastExport);
  const set = useApp((s) => s.set);
  const closeBinder = useApp((s) => s.closeBinder);
  const go = useApp((s) => s.go);
  if (!result) return null;
  const file = result.path.split(/[\\/]/).at(-1) ?? result.path;
  return (
    <div
      role="status"
      className="fixed bottom-14 right-6 z-30 flex w-[420px] max-w-[calc(100vw-48px)] items-start gap-3 rounded-card border border-border-strong bg-surface p-4 shadow-lg"
    >
      <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.5} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Binder saved</p>
        <p className="mt-0.5 truncate font-mono text-xs text-fg-muted" title={result.path}>
          {file}
        </p>
        <p className="mt-0.5 font-mono text-xs text-fg-muted tabular">
          {result.documents} documents · {result.pages} pages · {formatBytes(result.bytes)}
          {result.singlesWritten ? ` · ${String(result.singlesWritten)} individual files` : ''}
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => void revealItemInDir(result.path)}>
            {revealLabel}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              closeBinder();
              go('new-binder');
            }}
          >
            Start next binder
          </Button>
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          set({ lastExport: null });
        }}
        className="grid size-6 place-items-center rounded-control text-fg-muted hover:bg-bg-subtle hover:text-fg [&_svg]:size-3.5"
      >
        <X strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}
