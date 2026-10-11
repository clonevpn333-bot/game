'use client';

import { Button, StatusDot, cx } from '@binderready/design';
import { BookMarked, FileImage, FileText, RotateCcw, Sparkles } from 'lucide-react';
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  ViewTransition,
  type CSSProperties,
} from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { binderSummary, binderTree, heroCategories, heroFiles, type HeroFile } from './files';

type Phase = 'scattered' | 'sorted' | 'binder';

const SORT_DELAY_MS = 1200;
const BINDER_DELAY_MS = 2100;

// One flight stagger per card. Names are stable, so this is static CSS.
const staggerCss = heroFiles
  .map((_, i) => `::view-transition-group(hero-card-${i}){animation-delay:${i * 24}ms}`)
  .join('');

function FileIcon({ name }: { name: string }) {
  const image = /\.(heic|jpe?g|png)$/i.test(name);
  const Icon = image ? FileImage : FileText;
  return <Icon className="size-[1.1em] shrink-0 text-fg-subtle" strokeWidth={1.5} aria-hidden />;
}

function Card({ file, index, phase }: { file: HeroFile; index: number; phase: Phase }) {
  const sorted = phase !== 'scattered';
  const name = sorted ? file.clean : file.messy;
  return (
    <ViewTransition name={`hero-card-${index}`} share="hero-card" update="hero-card" default="none">
      <li
        className={cx(
          'hero-card flex items-center gap-[0.5em] rounded-[6px] border bg-surface px-[0.6em] font-mono leading-none',
          file.category === 'review' && sorted ? 'border-warning/40' : 'border-border-strong',
          phase === 'scattered' &&
            'absolute left-[calc(var(--x)*0.54%)] w-[46%] py-[0.75em] shadow-[0_8px_24px_-12px_rgb(0_0_0/0.45)] @[40rem]:left-[calc(var(--x)*0.95%)] @[40rem]:w-[27%]',
          phase === 'sorted' && 'relative h-[2.1em] w-full @[40rem]:h-auto @[40rem]:py-[0.5em]',
          phase === 'binder' &&
            'absolute left-1/2 top-1/2 w-[30%] -translate-x-1/2 -translate-y-1/2 scale-75 py-[0.75em] opacity-0',
        )}
        style={
          phase === 'scattered'
            ? ({ '--x': file.x, top: `${file.y}%`, rotate: `${file.r}deg` } as CSSProperties)
            : undefined
        }
      >
        <FileIcon name={file.messy} />
        <span className="min-w-0 truncate leading-snug @[40rem]:line-clamp-2 @[40rem]:whitespace-normal">
          {name}
        </span>
        {sorted && file.category === 'review' ? (
          <StatusDot tone="warning" label="Needs review" className="ml-auto" />
        ) : null}
      </li>
    </ViewTransition>
  );
}

function Binder({ client }: { client: string }) {
  return (
    <ViewTransition enter="hero-binder" exit="hero-binder" default="none">
      <div className="absolute inset-0 grid place-items-center p-[5%]">
        <div className="flex w-full max-w-[52em] items-stretch gap-[1.5em]">
          <div
            aria-hidden
            className="hidden aspect-[8.5/11] w-[34%] shrink-0 flex-col rounded-[6px] border border-border-strong bg-surface p-[1.2em] shadow-[0_24px_64px_-24px_rgb(0_0_0/0.5)] @[40rem]:flex"
          >
            <span className="h-[0.5em] w-[40%] rounded-full bg-fg/30" />
            <p className="mt-auto text-[1.15em] font-semibold tracking-[-0.02em] text-fg">
              {client}
            </p>
            <p className="font-mono text-[0.75em] text-fg-muted">2026 tax documents</p>
            <div className="mt-[1.2em] space-y-[0.45em] border-t border-border pt-[1em]">
              {binderTree.slice(0, 5).map((node) => (
                <span
                  key={node.label}
                  className="block h-[0.35em] rounded-full bg-fg/15"
                  style={{ width: `${40 + node.count * 8}%` }}
                />
              ))}
            </div>
          </div>
          <div className="min-w-0 flex-1 rounded-[10px] border border-border-strong bg-surface shadow-[0_24px_64px_-24px_rgb(0_0_0/0.5)]">
            <div className="flex items-center gap-3 border-b border-border px-[1.1em] py-[0.9em]">
              <span className="grid size-[2.2em] shrink-0 place-items-center rounded-[6px] bg-fg text-bg">
                <BookMarked className="size-[1.1em]" strokeWidth={1.5} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[1.05em] font-semibold tracking-[-0.01em] text-fg">
                  {client} – 2026 Binder.pdf
                </p>
                <p className="tabular font-mono text-[0.8em] text-fg-muted">{binderSummary}</p>
              </div>
            </div>
            <ol
              className="grid grid-cols-[auto_auto] gap-x-[1em] px-[1.1em] py-[0.8em] text-[0.9em] @[40rem]:grid-cols-[auto_auto_minmax(0,1fr)]"
              aria-label="Bookmarks"
            >
              {binderTree.map((node) => (
                <li
                  key={node.label}
                  className="col-span-full grid grid-cols-subgrid items-baseline border-b border-border py-[0.45em] last:border-0"
                >
                  <span className="text-fg">{node.label}</span>
                  <span className="tabular text-right font-mono text-fg-subtle">{node.count}</span>
                  <span className="hidden min-w-0 truncate font-mono text-[0.92em] text-fg-muted @[40rem]:block">
                    {node.first}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </ViewTransition>
  );
}

export function HeroStage({ client }: { client: string }) {
  const reduced = useReducedMotion();
  const [state, setState] = useState<Phase>('scattered');
  /** Set once the visitor presses Sort or Replay; until then reduced motion shows the result. */
  const [touched, setTouched] = useState(false);
  const phase: Phase = reduced && !touched ? 'binder' : state;
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };

  const go = (next: Phase) => {
    startTransition(() => {
      setState(next);
    });
  };

  const run = (sortDelay: number) => {
    clearTimers();
    timers.current.push(
      window.setTimeout(() => {
        go('sorted');
      }, sortDelay),
      window.setTimeout(() => {
        go('binder');
      }, sortDelay + BINDER_DELAY_MS),
    );
  };

  const stageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (reduced) return clearTimers;
    // Start once the page has loaded, the main thread is idle and the hero is on screen,
    // so the animation never competes with hydration and is never missed.
    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    const startWhenVisible = () => {
      if (cancelled || !stageRef.current) return;
      observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer?.disconnect();
          run(SORT_DELAY_MS);
        }
      });
      observer.observe(stageRef.current);
    };
    const afterLoad = () => {
      // Safari has no requestIdleCallback.
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(startWhenVisible, { timeout: 1500 });
      } else {
        setTimeout(startWhenVisible, 200);
      }
    };
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
    return () => {
      cancelled = true;
      observer?.disconnect();
      window.removeEventListener('load', afterLoad);
      clearTimers();
    };
    // Starts the sequence on mount (or when motion becomes allowed); run only touches refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const counts = heroCategories.map((c) => ({
    ...c,
    files: heroFiles
      .map((file, index) => ({ file, index }))
      .filter(({ file }) => file.category === c.id),
  }));

  const status =
    phase === 'scattered'
      ? '18 files dropped'
      : phase === 'sorted'
        ? '23 documents recognized · 3 need review'
        : binderSummary;

  return (
    <figure
      ref={stageRef}
      aria-label={`${client}'s documents being sorted into one binder`}
      className="@container overflow-hidden rounded-[14px] border border-border-strong bg-bg-subtle shadow-[0_40px_120px_-40px_rgb(0_0_0/0.55)]"
    >
      <style>{staggerCss}</style>
      <div className="flex h-11 items-center gap-3 border-b border-border bg-surface px-4">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
        </div>
        <p className="min-w-0 flex-1 truncate text-center text-xs text-fg-muted">{client} · 2026</p>
        {phase === 'scattered' ? (
          <Button
            size="sm"
            variant="secondary"
            className="h-7"
            onClick={() => {
              setTouched(true);
              run(0);
            }}
          >
            <Sparkles strokeWidth={1.5} />
            Sort
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            disabled={phase === 'sorted'}
            onClick={() => {
              setTouched(true);
              clearTimers();
              go('scattered');
              run(SORT_DELAY_MS);
            }}
          >
            <RotateCcw strokeWidth={1.5} />
            Replay
          </Button>
        )}
      </div>

      <div
        data-phase={phase}
        className="relative aspect-[4/5] text-[3.1cqw] @[40rem]:aspect-[16/9] @[40rem]:text-[1.25cqw] @[64rem]:text-[0.95rem]"
      >
        {phase === 'scattered' ? (
          <ul className="absolute inset-[3%]" aria-label="Dropped files">
            {heroFiles.map((file, index) => (
              <Card key={file.messy} file={file} index={index} phase={phase} />
            ))}
          </ul>
        ) : null}

        {phase === 'sorted' ? (
          <div className="absolute inset-[4%] columns-2 gap-[4%] @[40rem]:columns-3">
            {counts.map((group) => (
              <div key={group.id} className="mb-[1.6em] break-inside-avoid">
                <p
                  id={`hero-group-${group.id}`}
                  className="mb-[0.6em] flex items-center gap-2 font-mono text-[0.78em] uppercase tracking-[0.06em] text-fg-subtle"
                >
                  {group.label}
                  <span className="tabular text-fg-muted">{group.files.length}</span>
                </p>
                <ul
                  aria-labelledby={`hero-group-${group.id}`}
                  className="flex flex-col @max-[40rem]:[&>li+li]:-mt-[1.75em] @[40rem]:gap-[0.4em]"
                >
                  {group.files.map(({ file, index }) => (
                    <Card key={file.messy} file={file} index={index} phase={phase} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}

        {phase === 'binder' ? (
          <>
            <ul aria-hidden className="absolute inset-0">
              {heroFiles.map((file, index) => (
                <Card key={file.messy} file={file} index={index} phase={phase} />
              ))}
            </ul>
            <Binder client={client} />
          </>
        ) : null}
      </div>

      <figcaption className="flex h-9 items-center justify-between gap-3 border-t border-border bg-surface px-4">
        <span aria-live="polite" className="tabular truncate font-mono text-[11px] text-fg-muted">
          {status}
        </span>
        <span className="hidden font-mono text-[11px] text-fg-subtle sm:inline">
          Processed on this computer
        </span>
      </figcaption>
    </figure>
  );
}
