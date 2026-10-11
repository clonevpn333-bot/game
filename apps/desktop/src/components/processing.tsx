import { Badge, Button, StatusDot, cx } from '@binderready/design';
import { AlertTriangle, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Stage } from '../lib/backend';
import { useApp } from '../state/store';
import { DropZone } from './drop-zone';

const STAGES: { stage: Stage; label: string }[] = [
  { stage: 'reading', label: 'Reading' },
  { stage: 'splitting', label: 'Splitting' },
  { stage: 'recognizing', label: 'Recognizing' },
  { stage: 'done', label: 'Done' },
];
const order: Record<Stage, number> = {
  queued: -1,
  reading: 0,
  splitting: 1,
  recognizing: 2,
  done: 3,
  error: 3,
};

function StageChips({ stage }: { stage: Stage }) {
  return (
    <ol className="flex items-center gap-1" aria-label={`Stage: ${stage}`}>
      {STAGES.map((s) => {
        const state =
          order[stage] > order[s.stage] || stage === 'done'
            ? 'past'
            : stage === s.stage
              ? 'current'
              : 'future';
        return (
          <li
            key={s.stage}
            className={cx(
              'flex h-6 items-center gap-1 rounded-full border px-2 text-[11px]',
              state === 'past' && 'border-border text-fg-muted',
              state === 'current' && 'border-fg text-fg',
              state === 'future' && 'border-border text-fg-subtle opacity-60',
            )}
          >
            {state === 'past' ? <Check className="size-3" strokeWidth={2} aria-hidden /> : null}
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}

export function Processing() {
  const batch = useApp((s) => s.batch);
  const addPaths = useApp((s) => s.addPaths);
  const close = useApp((s) => s.closeBinder);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => {
      window.clearInterval(t);
    };
  }, []);
  if (!batch) return null;

  const pagesDone = batch.files.reduce((n, f) => n + f.pagesDone, 0);
  const pagesTotal = batch.files.reduce((n, f) => n + f.pagesTotal, 0);
  const filesDone = batch.files.filter((f) => f.stage === 'done' || f.stage === 'error').length;
  const seconds = ((batch.finishedAt ?? now) - batch.startedAt) / 1000;
  const rate = seconds > 0 ? pagesDone / seconds : 0;
  const progress =
    batch.files.length === 0
      ? 0
      : (filesDone / batch.files.length) * 0.5 + (pagesTotal ? (pagesDone / pagesTotal) * 0.5 : 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-8 py-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Processing</p>
            <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">
              {batch.files.length
                ? `Reading ${String(batch.files.length)} ${batch.files.length === 1 ? 'file' : 'files'}`
                : 'Add documents to begin'}
            </h1>
          </div>
          <div className="text-right font-mono text-xs text-fg-muted tabular">
            <p>
              {filesDone}/{batch.files.length} files · {pagesDone}/{pagesTotal || '–'} pages
            </p>
            <p className="mt-1">{rate.toFixed(1)} pages/s</p>
          </div>
        </div>
        <div
          className="mt-4 h-1 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-label="Overall progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className="h-full bg-fg transition-[width] duration-200 ease-out-steel"
            style={{ width: `${String(progress * 100)}%` }}
          />
        </div>
      </div>
      <ul className="flex-1 divide-y divide-border overflow-y-auto">
        {batch.files.map((f) => (
          <li key={f.id} className="flex items-center gap-4 px-8 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[13px]">{f.name}</p>
              {f.error ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-danger">
                  <AlertTriangle className="size-3.5" strokeWidth={1.5} aria-hidden />
                  {f.message}
                </p>
              ) : (
                <p className="mt-0.5 font-mono text-xs text-fg-subtle tabular">
                  {f.pagesTotal
                    ? `${String(f.pagesDone)}/${String(f.pagesTotal)} pages`
                    : f.stage === 'queued'
                      ? 'Waiting'
                      : '…'}
                </p>
              )}
            </div>
            {f.error ? (
              <Badge tone="danger">
                <StatusDot tone="danger" />
                Couldn’t open
              </Badge>
            ) : (
              <StageChips stage={f.stage} />
            )}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-4 border-t border-border px-8 py-4">
        <div className="flex-1">
          <DropZone compact title="Drop more documents" onFiles={(paths) => void addPaths(paths)} />
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            close();
          }}
        >
          Cancel binder
        </Button>
      </div>
    </div>
  );
}
