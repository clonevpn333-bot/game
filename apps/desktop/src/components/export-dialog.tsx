import { Button, Kbd, cx } from '@binderready/design';
import { CATEGORY_IDS, type CategoryId } from '@binderready/engine';
import { FolderOpen } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { backend } from '../lib/backend';
import { binderTitle } from '../lib/export-plan';
import { runExport, type ExportStep } from '../lib/export-run';
import { PRODUCT_NAME } from '../lib/product';
import { applyTemplate, fullOrder } from '../lib/review';
import { useApp, type ExportPrefs } from '../state/store';
import { OrderList, QualityField, TemplateField, Toggle, templateIsValid } from './binder-fields';

function stepLabel(step: ExportStep | null): string {
  if (!step) return '';
  if (step.step === 'pages') return `Preparing pages ${String(step.done)}/${String(step.total)}`;
  if (step.step === 'assembling') return 'Building the binder';
  return `Saving files ${String(step.done)}/${String(step.total)}`;
}

function stepFraction(step: ExportStep | null): number {
  if (!step) return 0;
  if (step.step === 'pages') return step.total ? (step.done / step.total) * 0.7 : 0.7;
  if (step.step === 'assembling') return 0.8;
  return 0.8 + (step.total ? (step.done / step.total) * 0.2 : 0.2);
}

export function ExportDialog() {
  const batch = useApp((s) => s.batch);
  const docs = useApp((s) => s.docs);
  const inputs = useApp((s) => s.inputs);
  const rotations = useApp((s) => s.rotations);
  const selectedId = useApp((s) => s.selectedId);
  const savedOrder = useApp((s) => s.categoryOrder);
  const savedTemplate = useApp((s) => s.nameTemplate);
  const savedPrefs = useApp((s) => s.exportPrefs);
  const set = useApp((s) => s.set);
  const dialog = useRef<HTMLDialogElement>(null);

  const [order, setOrder] = useState<CategoryId[]>(() => fullOrder(savedOrder));
  const [prefs, setPrefs] = useState<ExportPrefs>(savedPrefs);
  const [template, setTemplate] = useState(savedTemplate);
  const [folder, setFolder] = useState<string | null>(null);
  const [step, setStep] = useState<ExportStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = step !== null;

  const included = useMemo(() => docs.filter((d) => !d.excluded), [docs]);
  const pages = included.reduce((n, d) => n + d.pages.length, 0);
  const counts = useMemo(() => {
    const map = new Map<CategoryId, number>();
    for (const d of included) map.set(d.category, (map.get(d.category) ?? 0) + 1);
    return map;
  }, [included]);
  const clientName = batch?.client.displayName.split(/\s+/).at(-1) ?? '';
  const templateValid = templateIsValid(template);
  const example = included.find((d) => d.id === selectedId) ?? included[0];
  const preview =
    example && templateValid
      ? applyTemplate([{ ...example, nameEdited: false }], { template, clientName })[0]?.name
      : null;

  const chooseButton = useRef<HTMLButtonElement>(null);
  const exportButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  // Start where the next action is: pick a folder, or export.
  useEffect(() => {
    (folder ? exportButton : chooseButton).current?.focus();
  }, [folder]);

  // The client's folder from last time, if it still exists.
  useEffect(() => {
    if (!batch) return;
    void backend.allowRememberedDir(batch.client.id).then((dir) => {
      setFolder((current) => current ?? dir);
    });
  }, [batch]);

  if (!batch) return null;

  const close = () => {
    if (busy) return;
    set({ exportOpen: false });
  };

  const chooseFolder = async () => {
    const dir = await backend.chooseOutputDir(folder ?? batch.client.outputDir);
    if (dir) setFolder(dir);
  };

  const start = async () => {
    if (!folder || !templateValid || busy) return;
    setError(null);
    setStep({ step: 'pages', done: 0, total: 0 });
    const state = useApp.getState();
    const customOrder = order.join() === CATEGORY_IDS.join() ? [] : order;
    try {
      await Promise.all([
        state.setExportPrefs(prefs),
        state.setCategoryOrder(customOrder),
        template === state.nameTemplate ? null : state.setNameTemplate(template),
      ]);
      const fresh = useApp.getState();
      const result = await runExport(
        {
          clientId: batch.client.id,
          client: batch.client.displayName,
          taxYear: batch.taxYear,
          docs: fresh.docs,
          files: inputs,
          rotations,
          categoryOrder: customOrder,
          quality: prefs.quality,
          includeCover: prefs.includeCover,
          includeIndex: prefs.includeIndex,
          singles: prefs.singles,
          outputDir: folder,
          firmName: fresh.firmName,
          logoPng: await backend.firmLogo(),
          trial: false,
          productName: PRODUCT_NAME,
        },
        setStep,
      );
      useApp.getState().exportDone(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep(null);
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    if (item) next.splice(to, 0, item);
    setOrder(next);
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="export-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      className="m-auto max-h-[min(860px,calc(100vh-48px))] w-[760px] max-w-[calc(100vw-48px)] overflow-hidden rounded-panel border border-border bg-bg p-0 text-fg shadow-2xl backdrop:bg-black/40"
    >
      <form
        method="dialog"
        className="flex max-h-[inherit] flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          void start();
        }}
      >
        <header className="border-b border-border px-6 pb-4 pt-5">
          <p className="eyebrow">Export</p>
          <h2 id="export-title" className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">
            {binderTitle(batch.client.displayName, batch.taxYear)}
          </h2>
          <p className="mt-0.5 font-mono text-xs text-fg-muted tabular">
            {included.length} documents · {pages} pages
          </p>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-8 overflow-y-auto px-6 py-5">
          <section aria-labelledby="order-title" className="min-w-0">
            <div className="flex items-baseline justify-between">
              <h3 id="order-title" className="text-sm font-medium">
                Binder order
              </h3>
              {order.join() !== CATEGORY_IDS.join() ? (
                <button
                  type="button"
                  className="text-xs text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                  onClick={() => {
                    setOrder([...CATEGORY_IDS]);
                  }}
                >
                  Reset to default
                </button>
              ) : (
                <span className="text-xs text-fg-subtle">Default</span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-fg-muted">
              Drag to reorder. Saved as your firm’s order.
            </p>
            <OrderList order={order} counts={counts} onMove={move} />
          </section>

          <div className="min-w-0 space-y-6">
            <section aria-labelledby="contents-title">
              <h3 id="contents-title" className="text-sm font-medium">
                Contents
              </h3>
              <div className="mt-2 divide-y divide-border rounded-card border border-border">
                <Toggle
                  label="Cover page"
                  detail="Firm, client, tax year, counts"
                  checked={prefs.includeCover}
                  onChange={(v) => {
                    setPrefs({ ...prefs, includeCover: v });
                  }}
                />
                <Toggle
                  label="Index"
                  detail="Clickable list of every document"
                  checked={prefs.includeIndex}
                  onChange={(v) => {
                    setPrefs({ ...prefs, includeIndex: v });
                  }}
                />
                <Toggle
                  label="Also export individual files"
                  detail="One renamed PDF per document, in a folder"
                  checked={prefs.singles}
                  onChange={(v) => {
                    setPrefs({ ...prefs, singles: v });
                  }}
                />
              </div>
            </section>

            <TemplateField
              template={template}
              valid={templateValid}
              preview={preview ?? null}
              onChange={setTemplate}
            />

            <QualityField
              quality={prefs.quality}
              onChange={(quality) => {
                setPrefs({ ...prefs, quality });
              }}
            />

            <section aria-labelledby="folder-title">
              <h3 id="folder-title" className="text-sm font-medium">
                Save to
              </h3>
              <div className="mt-2 flex items-center gap-2">
                <p
                  className={cx(
                    'min-w-0 flex-1 truncate rounded-control border border-border px-3 py-2 font-mono text-xs',
                    folder ? 'text-fg' : 'text-fg-subtle',
                  )}
                  title={folder ?? undefined}
                  dir={folder ? 'rtl' : undefined}
                >
                  {folder ? <bdi>{folder}</bdi> : 'No folder chosen'}
                </p>
                <Button
                  ref={chooseButton}
                  size="sm"
                  variant="secondary"
                  onClick={() => void chooseFolder()}
                  disabled={busy}
                >
                  <FolderOpen strokeWidth={1.5} aria-hidden />
                  Choose…
                </Button>
              </div>
              <p className="mt-1 text-xs text-fg-muted">Remembered for this client.</p>
            </section>
          </div>
        </div>

        <footer className="border-t border-border px-6 py-4">
          {busy ? (
            <div className="mb-3" aria-live="polite">
              <div className="flex justify-between font-mono text-xs text-fg-muted tabular">
                <span>{stepLabel(step)}</span>
                <span>{Math.round(stepFraction(step) * 100)}%</span>
              </div>
              <div
                className="mt-1.5 h-1 overflow-hidden rounded-full bg-border"
                role="progressbar"
                aria-label="Export progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(stepFraction(step) * 100)}
              >
                <div
                  className="h-full bg-fg transition-[width] duration-200"
                  style={{ width: `${String(stepFraction(step) * 100)}%` }}
                />
              </div>
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="mb-3 text-sm text-danger">
              The binder wasn’t saved: {error}
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button ref={exportButton} type="submit" disabled={!folder || !templateValid || busy}>
              {busy ? 'Exporting…' : 'Export binder'}
              {busy ? null : (
                <Kbd className="ml-1 border-bg/30 bg-transparent text-bg/80 shadow-none">Enter</Kbd>
              )}
            </Button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
