import { Badge, Button, Kbd, StatusDot, cx } from '@binderready/design';
import { CATEGORY_IDS } from '@binderready/engine';
import { convertFileSrc } from '@tauri-apps/api/core';
import { ChevronLeft, ChevronRight, Copy, RotateCw, Scissors, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DesktopFile } from '../lib/backend';
import { catalog, categoryName, formLabel } from '../lib/catalog';
import { modKey } from '../lib/platform';
import { boardGroups, categoryForKey, rotationKey, type ReviewDoc } from '../lib/review';
import { useApp } from '../state/store';
import { pickFiles } from './drop-zone';
import { ExportDialog } from './export-dialog';
import { ExportToast } from './export-toast';
import { MissingPanel } from './missing-panel';

function pageImage(files: Record<string, DesktopFile>, fileId: string, page: number) {
  const p = files[fileId]?.pages.find((x) => x.index === page);
  return p ? convertFileSrc(p.image) : null;
}

function StatusMark({ doc }: { doc: ReviewDoc }) {
  if (doc.excluded) return <Badge>{doc.duplicateKind ? 'Duplicate' : 'Removed'}</Badge>;
  if (doc.reviewed || doc.status === 'auto') return null;
  return doc.status === 'review' ? (
    <StatusDot tone="danger" label="Needs review" />
  ) : (
    <StatusDot tone="warning" label="Check" />
  );
}

function Thumb({
  src,
  rotation,
  className,
}: {
  src: string | null;
  rotation: number;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'grid aspect-[8.5/11] place-items-center overflow-hidden rounded-[4px] border border-border bg-white',
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt=""
          draggable={false}
          className="max-h-full max-w-full object-contain transition-transform duration-150"
          style={{ transform: `rotate(${String(rotation)}deg)` }}
        />
      ) : null}
    </div>
  );
}

function DocCard({ doc, selected }: { doc: ReviewDoc; selected: boolean }) {
  const files = useApp((s) => s.inputs);
  const rotations = useApp((s) => s.rotations);
  const select = useApp((s) => s.select);
  const set = useApp((s) => s.set);
  const ref = useRef<HTMLButtonElement>(null);
  const first = doc.pages[0] ?? 0;
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      onClick={() => {
        select(doc.id);
        set({ stripOpen: true });
      }}
      className={cx(
        'group flex flex-col gap-2.5 rounded-card border bg-surface p-2.5 text-left transition-[border-color,opacity] duration-150',
        selected
          ? 'border-fg shadow-[0_0_0_1px_var(--fg)]'
          : 'border-border hover:border-border-strong',
        doc.excluded && 'opacity-55',
      )}
    >
      <Thumb
        src={pageImage(files, doc.fileId, first)}
        rotation={rotations[rotationKey(doc.fileId, first)] ?? 0}
      />
      <div className="min-w-0 px-0.5">
        <p className="line-clamp-2 min-h-[2.5em] font-mono text-[11.5px] leading-[1.25] text-fg">
          {doc.name}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <Badge>{formLabel(doc.formId)}</Badge>
          <span className="font-mono text-[11px] text-fg-subtle tabular">{doc.pages.length}p</span>
          <span className="ml-auto">
            <StatusMark doc={doc} />
          </span>
        </div>
      </div>
    </button>
  );
}

function FormPicker({ doc }: { doc: ReviewDoc }) {
  const changeForm = useApp((s) => s.changeForm);
  const set = useApp((s) => s.set);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const options = catalog.forms.filter((f) =>
    `${f.displayName} ${categoryName.get(f.category) ?? ''}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-overlay pt-[16vh]"
      onMouseDown={() => {
        set({ formPickerOpen: false });
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Change form type"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        className="w-[480px] overflow-hidden rounded-panel border border-border-strong bg-surface"
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(options.length - 1, a + 1));
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            }
            if (e.key === 'Enter') {
              const f = options[active];
              if (f) changeForm(f.id);
            }
            if (e.key === 'Escape') set({ formPickerOpen: false });
          }}
          placeholder={`Form type for “${doc.name}”`}
          className="h-12 w-full border-b border-border bg-transparent px-4 text-[15px] outline-none placeholder:text-fg-subtle"
        />
        <ul role="listbox" className="max-h-80 overflow-y-auto p-1.5">
          {options.map((f, i) => (
            <li
              key={f.id}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => {
                setActive(i);
              }}
              onClick={() => {
                changeForm(f.id);
              }}
              className={cx(
                'flex h-9 cursor-pointer items-center justify-between rounded-control px-3 text-sm',
                i === active && 'bg-fg/8',
              )}
            >
              <span className="font-mono text-[13px]">{formLabel(f.id)}</span>
              <span className="text-xs text-fg-subtle">{categoryName.get(f.category)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Preview({
  doc,
  page,
  setPage,
}: {
  doc: ReviewDoc;
  page: number;
  setPage: (p: number) => void;
}) {
  const files = useApp((s) => s.inputs);
  const rotations = useApp((s) => s.rotations);
  const set = useApp((s) => s.set);
  const p = doc.pages[page] ?? 0;
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-overlay backdrop-blur-sm"
      onMouseDown={() => {
        set({ previewOpen: false });
      }}
    >
      <div
        className="flex items-center justify-between px-6 py-3"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <p className="truncate font-mono text-sm">{doc.name}</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-fg-muted tabular">
            Page {page + 1} of {doc.pages.length}
          </span>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => {
              setPage(page - 1);
            }}
          >
            <ChevronLeft strokeWidth={1.5} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Next page"
            disabled={page >= doc.pages.length - 1}
            onClick={() => {
              setPage(page + 1);
            }}
          >
            <ChevronRight strokeWidth={1.5} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Close preview"
            onClick={() => {
              set({ previewOpen: false });
            }}
          >
            <X strokeWidth={1.5} />
          </Button>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 place-items-center p-6">
        <img
          src={pageImage(files, doc.fileId, p) ?? ''}
          alt={`Page ${String(page + 1)} of ${doc.name}`}
          className="max-h-full max-w-full rounded-[4px] bg-white shadow-[0_30px_90px_-30px_rgb(0_0_0/0.6)]"
          style={{ transform: `rotate(${String(rotations[rotationKey(doc.fileId, p)] ?? 0)}deg)` }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        />
      </div>
    </div>
  );
}

function PageStrip({
  doc,
  page,
  setPage,
}: {
  doc: ReviewDoc;
  page: number;
  setPage: (p: number) => void;
}) {
  const files = useApp((s) => s.inputs);
  const rotations = useApp((s) => s.rotations);
  const rotatePage = useApp((s) => s.rotatePage);
  const splitAt = useApp((s) => s.splitAt);
  const movePage = useApp((s) => s.movePage);
  const merge = useApp((s) => s.merge);
  const set = useApp((s) => s.set);
  return (
    <section aria-label="Pages" className="border-t border-border bg-bg-subtle px-6 py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-fg-muted">
          {doc.pages.length} {doc.pages.length === 1 ? 'page' : 'pages'} · from{' '}
          <span className="font-mono">{doc.fileName}</span>
        </p>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={merge}>
            Merge with previous <Kbd>M</Kbd>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Close page strip"
            onClick={() => {
              set({ stripOpen: false });
            }}
          >
            <X strokeWidth={1.5} />
          </Button>
        </div>
      </div>
      <ol className="flex gap-3 overflow-x-auto pb-1">
        {doc.pages.map((p, i) => (
          <li key={`${String(p)}-${String(i)}`} className="w-28 shrink-0">
            <button
              type="button"
              onClick={() => {
                setPage(i);
              }}
              aria-pressed={i === page}
              aria-label={`Page ${String(i + 1)}`}
              className={cx(
                'block w-full rounded-[6px] p-0.5',
                i === page ? 'ring-2 ring-fg' : 'ring-1 ring-transparent hover:ring-border-strong',
              )}
            >
              <Thumb
                src={pageImage(files, doc.fileId, p)}
                rotation={rotations[rotationKey(doc.fileId, p)] ?? 0}
              />
            </button>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="font-mono text-[11px] text-fg-subtle tabular">{i + 1}</span>
              <span className="flex">
                <button
                  type="button"
                  title="Move left"
                  aria-label={`Move page ${String(i + 1)} left`}
                  disabled={i === 0}
                  onClick={() => {
                    movePage(i, i - 1);
                    setPage(i - 1);
                  }}
                  className="grid size-6 place-items-center rounded text-fg-muted hover:text-fg disabled:opacity-30 [&_svg]:size-3.5"
                >
                  <ChevronLeft strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  title="Move right"
                  aria-label={`Move page ${String(i + 1)} right`}
                  disabled={i === doc.pages.length - 1}
                  onClick={() => {
                    movePage(i, i + 1);
                    setPage(i + 1);
                  }}
                  className="grid size-6 place-items-center rounded text-fg-muted hover:text-fg disabled:opacity-30 [&_svg]:size-3.5"
                >
                  <ChevronRight strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  title="Rotate (R)"
                  aria-label={`Rotate page ${String(i + 1)}`}
                  onClick={() => {
                    rotatePage(doc.fileId, p);
                  }}
                  className="grid size-6 place-items-center rounded text-fg-muted hover:text-fg [&_svg]:size-3.5"
                >
                  <RotateCw strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  title="Split here (S)"
                  aria-label={`Start a new document at page ${String(i + 1)}`}
                  disabled={i === 0}
                  onClick={() => {
                    splitAt(i);
                  }}
                  className="grid size-6 place-items-center rounded text-fg-muted hover:text-fg disabled:opacity-30 [&_svg]:size-3.5"
                >
                  <Scissors strokeWidth={1.5} />
                </button>
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Detail({ doc }: { doc: ReviewDoc }) {
  const editing = useApp((s) => s.editingName);
  const rename = useApp((s) => s.rename);
  const set = useApp((s) => s.set);
  const changeForm = useApp((s) => s.changeForm);
  const accept = useApp((s) => s.accept);
  const toggleExcluded = useApp((s) => s.toggleExcluded);
  const [draft, setDraft] = useState(doc.name);
  // Reset the draft when the name changes or editing starts or stops.
  const [draftFor, setDraftFor] = useState({ name: doc.name, editing });
  if (draftFor.name !== doc.name || draftFor.editing !== editing) {
    setDraftFor({ name: doc.name, editing });
    setDraft(doc.name);
  }
  const rows: [string, string][] = [
    ['Form', formLabel(doc.formId)],
    ['Category', categoryName.get(doc.category) ?? doc.category],
    ['Tax year', doc.fields.taxYear ? String(doc.fields.taxYear) : 'Not found'],
    ['Issuer', doc.fields.issuer ?? 'Not found'],
    ['Confidence', `${String(Math.round(doc.confidence * 100))}%`],
  ];
  return (
    <section aria-label="Selected document" className="flex flex-col gap-5 px-5 py-5">
      <div>
        <p className="eyebrow">Name</p>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') rename(draft);
              if (e.key === 'Escape') set({ editingName: false });
            }}
            onBlur={() => {
              rename(draft);
            }}
            aria-label="Document name"
            className="mt-2 w-full rounded-control border border-fg bg-bg px-2 py-1.5 font-mono text-[13px] outline-none"
          />
        ) : (
          <p className="mt-2 break-words font-mono text-[13px] leading-snug" data-selectable>
            {doc.name}
          </p>
        )}
      </div>
      {doc.status !== 'auto' && !doc.reviewed ? (
        <div
          className={cx(
            'rounded-card border p-3 text-[13px]',
            doc.status === 'review' ? 'border-danger/40' : 'border-warning/40',
          )}
        >
          <p className="font-medium">
            {doc.status === 'review' ? 'Needs review' : 'Check this one'}
          </p>
          <p className="mt-1 text-fg-muted">
            {doc.formId === null
              ? 'This doesn’t match a supported form. Pick a type with T, or move it with a number key.'
              : doc.alternatives.length
                ? 'Two form types look alike. Accept, or pick the other one:'
                : 'Recognition was less certain than usual. Accept it, or fix it.'}
          </p>
          {doc.alternatives.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {doc.alternatives.map((a) => (
                <Button
                  key={a.formId}
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    changeForm(a.formId);
                  }}
                >
                  {formLabel(a.formId)}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {doc.duplicateOf ? (
        <p className="flex items-start gap-2 rounded-card border border-border p-3 text-[13px] text-fg-muted">
          <Copy className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          {doc.duplicateKind === 'exact'
            ? 'This file is byte-for-byte the same as one already added.'
            : 'This looks like another copy of a document already in the binder.'}
          {doc.excluded ? ' It’s left out of the binder.' : ' It’s included anyway.'}
        </p>
      ) : null}
      <dl className="divide-y divide-border border-y border-border text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2">
            <dt className="text-fg-muted">{k}</dt>
            <dd className="min-w-0 truncate text-right" title={v}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={accept}>
          Accept <Kbd className="border-bg/30 bg-transparent text-bg/80 shadow-none">Enter</Kbd>
        </Button>
        <Button size="sm" variant="secondary" onClick={toggleExcluded}>
          {doc.excluded ? 'Include in binder' : 'Remove'}
        </Button>
      </div>
    </section>
  );
}

const footerKeys: [string[], string][] = [
  [['J', 'K'], 'Next / previous'],
  [['Enter'], 'Accept'],
  [['1–9'], 'Category'],
  [['T'], 'Form type'],
  [['E'], 'Edit name'],
  [['R'], 'Rotate'],
  [['S'], 'Split'],
  [['M'], 'Merge'],
  [['D'], 'Duplicate / remove'],
  [['Space'], 'Preview'],
  [[modKey, 'E'], 'Export'],
];

export function ReviewBoard() {
  const docs = useApp((s) => s.docs);
  const batch = useApp((s) => s.batch);
  const selectedId = useApp((s) => s.selectedId);
  const stripOpen = useApp((s) => s.stripOpen);
  const previewOpen = useApp((s) => s.previewOpen);
  const formPickerOpen = useApp((s) => s.formPickerOpen);
  const notice = useApp((s) => s.notice);
  const exportOpen = useApp((s) => s.exportOpen);
  const history = useApp((s) => s.history);
  const openExport = useApp((s) => s.openExport);
  const addPaths = useApp((s) => s.addPaths);
  const set = useApp((s) => s.set);
  const [page, setPage] = useState(0);
  const categoryOrder = useApp((s) => s.categoryOrder);
  const groups = useMemo(() => boardGroups(docs, categoryOrder), [docs, categoryOrder]);
  const selected = docs.find((d) => d.id === selectedId) ?? null;

  // A newly selected document opens at its first page.
  const [pageFor, setPageFor] = useState(selectedId);
  if (pageFor !== selectedId) {
    setPageFor(selectedId);
    setPage(0);
  }
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => {
      set({ notice: null });
    }, 4000);
    return () => {
      window.clearTimeout(t);
    };
  }, [notice, set]);

  // ⌘E / Ctrl+E: export.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        useApp.getState().openExport();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useApp.getState();
      if (
        s.paletteOpen ||
        s.formPickerOpen ||
        s.editingName ||
        s.exportOpen ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select')) return;
      const doc = s.docs.find((d) => d.id === s.selectedId);
      const key = e.key;
      if (s.previewOpen) {
        if (key === ' ' || key === 'Escape') {
          e.preventDefault();
          s.set({ previewOpen: false });
        }
        if (key === 'ArrowRight' && doc) setPage((p) => Math.min(doc.pages.length - 1, p + 1));
        if (key === 'ArrowLeft') setPage((p) => Math.max(0, p - 1));
        return;
      }
      const handled = (() => {
        switch (key.toLowerCase()) {
          case 'j':
            s.move(1);
            return true;
          case 'k':
            s.move(-1);
            return true;
          case 'enter':
            s.accept();
            return true;
          case 't':
            if (doc) s.set({ formPickerOpen: true });
            return true;
          case 'e':
            if (doc) s.set({ editingName: true });
            return true;
          case 'r':
            if (doc) s.rotatePage(doc.fileId, doc.pages[page] ?? 0, e.shiftKey ? -90 : 90);
            return true;
          case 's':
            if (doc && page > 0) s.splitAt(page);
            else if (doc)
              s.set({
                stripOpen: true,
                notice:
                  'Pick a page after the first in the page strip, then press S to split there.',
              });
            return true;
          case 'm':
            s.merge();
            return true;
          case 'd':
            s.toggleExcluded();
            return true;
          case ' ':
            if (doc) s.set({ previewOpen: true });
            return true;
          case 'escape':
            s.set({ stripOpen: false });
            return true;
          case 'arrowright':
            if (doc) setPage((p) => Math.min(doc.pages.length - 1, p + 1));
            return true;
          case 'arrowleft':
            setPage((p) => Math.max(0, p - 1));
            return true;
          default: {
            const n = Number(key);
            if (Number.isInteger(n) && n >= 1 && n <= 9) {
              const category = categoryForKey(n, CATEGORY_IDS);
              if (category) s.reassign(category);
              return true;
            }
            return false;
          }
        }
      })();
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [page]);

  if (!batch) return null;
  const live = docs.filter((d) => !d.excluded);
  const pages = live.reduce((n, d) => n + d.pages.length, 0);
  const needReview = live.filter((d) => d.status === 'review' && !d.reviewed).length;
  const check = live.filter((d) => d.status === 'check' && !d.reviewed).length;
  const failed = batch.files.filter((f) => f.stage === 'error');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-6 border-b border-border px-6 py-4">
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-semibold tracking-[-0.015em]">
            {batch.client.displayName} · {batch.taxYear}
          </h1>
          <p className="mt-0.5 font-mono text-xs text-fg-muted tabular">
            {live.length} documents · {pages} pages
            {needReview ? ` · ${String(needReview)} need review` : ''}
            {check ? ` · ${String(check)} to check` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void pickFiles().then((p) => addPaths(p))}
          >
            Add files
          </Button>
          <Button size="sm" onClick={openExport} disabled={live.length === 0}>
            Export binder
            <Kbd className="ml-1 border-bg/30 bg-transparent text-bg/80 shadow-none">{modKey}</Kbd>
            <Kbd className="border-bg/30 bg-transparent text-bg/80 shadow-none">E</Kbd>
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          {failed.length ? (
            <div role="status" className="mb-6 space-y-2">
              {failed.map((f) => (
                <p
                  key={f.id}
                  className="flex items-center gap-2 rounded-card border border-danger/40 px-3 py-2 text-[13px]"
                >
                  <StatusDot tone="danger" />
                  <span className="font-mono">{f.name}</span>
                  <span className="text-fg-muted">— {f.message}</span>
                </p>
              ))}
            </div>
          ) : null}
          {groups.map((g) => (
            <section key={g.id} aria-labelledby={`group-${g.id}`} className="mb-8">
              <h2
                id={`group-${g.id}`}
                className="mb-3 flex items-center gap-2 text-[13px] font-medium"
              >
                {g.id === 'needs-review' ? <StatusDot tone="danger" /> : null}
                {g.label}
                <span className="font-mono text-xs text-fg-subtle tabular">{g.docs.length}</span>
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3">
                {g.docs.map((d) => (
                  <DocCard key={d.id} doc={d} selected={d.id === selectedId} />
                ))}
              </div>
            </section>
          ))}
          {docs.length === 0 ? (
            <p className="py-20 text-center text-sm text-fg-muted">
              No documents were found in these files.
            </p>
          ) : null}
        </div>
        {selected || history ? (
          <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-border">
            {selected ? <Detail doc={selected} /> : null}
            <MissingPanel />
          </aside>
        ) : null}
      </div>
      {selected && stripOpen ? <PageStrip doc={selected} page={page} setPage={setPage} /> : null}
      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-bg-subtle px-6 py-2.5 text-xs text-fg-muted">
        {footerKeys.map(([keys, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="flex gap-0.5">
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
            {label}
          </span>
        ))}
      </footer>
      {notice ? (
        <p
          role="status"
          className="fixed bottom-14 left-1/2 z-30 -translate-x-1/2 rounded-control border border-border-strong bg-surface px-4 py-2 text-[13px] shadow-lg"
        >
          {notice}
        </p>
      ) : null}
      {selected && formPickerOpen ? <FormPicker doc={selected} /> : null}
      {selected && previewOpen ? <Preview doc={selected} page={page} setPage={setPage} /> : null}
      {exportOpen ? <ExportDialog /> : null}
      <ExportToast />
    </div>
  );
}
