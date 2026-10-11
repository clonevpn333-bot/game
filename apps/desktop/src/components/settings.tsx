import { Button, ThemeSwitcher } from '@binderready/design';
import { CATEGORY_IDS, renderName, type CategoryId } from '@binderready/engine';
import { ask } from '@tauri-apps/plugin-dialog';
import { Check } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { backend } from '../lib/backend';
import { useAppInfo } from '../lib/platform';
import { PRODUCT_NAME } from '../lib/product';
import { fullOrder } from '../lib/review';
import { themeStore } from '../lib/theme';
import { useApp } from '../state/store';
import { OrderList, QualityField, TemplateField, templateIsValid } from './binder-fields';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-10 first-of-type:mt-8">
      <h2 id={id} className="text-[13px] font-medium text-fg-muted">
        {title}
      </h2>
      <div className="divide-y divide-border border-y border-border">{children}</div>
    </section>
  );
}

function Row({
  title,
  description,
  children,
  stacked = false,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
  /** Put the control under the text (wide controls). */
  stacked?: boolean;
}) {
  return (
    <div className={stacked ? 'py-5' : 'flex items-start justify-between gap-8 py-5'}>
      <div className="max-w-[52ch]">
        <p className="text-[14px] font-medium">{title}</p>
        <div className="mt-1 text-[13px] text-fg-muted">{description}</div>
      </div>
      <div className={stacked ? 'mt-4 max-w-[560px]' : 'shrink-0'}>{children}</div>
    </div>
  );
}

/** Shows "Saved" briefly after a setting is written. */
function useSaved(): [boolean, () => void] {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => {
      setSaved(false);
    }, 1800);
    return () => {
      window.clearTimeout(t);
    };
  }, [saved]);
  return [
    saved,
    () => {
      setSaved(true);
    },
  ];
}

function Saved({ show }: { show: boolean }) {
  return (
    <span
      aria-live="polite"
      className={`inline-flex h-5 items-center gap-1 text-xs text-fg-muted transition-opacity ${show ? 'opacity-100' : 'opacity-0'}`}
    >
      {show ? (
        <>
          <Check className="size-3.5" strokeWidth={1.5} aria-hidden /> Saved
        </>
      ) : null}
    </span>
  );
}

function FirmName() {
  const firmName = useApp((s) => s.firmName);
  const setFirmName = useApp((s) => s.setFirmName);
  const [draft, setDraft] = useState(firmName);
  const [saved, markSaved] = useSaved();
  const id = useId();
  // Settings load after the page can render: follow the stored value until edited.
  const [synced, setSynced] = useState(firmName);
  if (synced !== firmName) {
    setSynced(firmName);
    setDraft(firmName);
  }
  const save = () => {
    if (draft.trim() === firmName) return;
    void setFirmName(draft).then(markSaved);
  };
  return (
    <div className="flex items-center gap-3">
      <Saved show={saved} />
      <label htmlFor={id} className="sr-only">
        Firm name
      </label>
      <input
        id={id}
        value={draft}
        maxLength={120}
        placeholder="Example Tax Co."
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
        }}
        className="h-9 w-72 rounded-control border border-border-strong bg-bg px-3 text-sm outline-none focus:border-fg"
      />
    </div>
  );
}

function FirmLogo() {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let current: string | null = null;
    let live = true;
    void backend.firmLogo().then((bytes) => {
      if (!live) return;
      current = bytes ? URL.createObjectURL(new Blob([bytes], { type: 'image/png' })) : null;
      setUrl(current);
    });
    return () => {
      live = false;
      if (current) URL.revokeObjectURL(current);
    };
  }, [version]);
  const choose = async () => {
    setError(null);
    try {
      if (await backend.chooseLogo()) setVersion((v) => v + 1);
    } catch (e) {
      setError(String(e));
    }
  };
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-end gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => void choose()}>
          {url ? 'Replace…' : 'Choose logo…'}
        </Button>
        {url ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              void backend.clearLogo().then(() => {
                setVersion((v) => v + 1);
              })
            }
          >
            Remove
          </Button>
        ) : null}
        {error ? (
          <p role="alert" className="max-w-56 text-right text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
      {/* Covers are white paper: preview the logo on white in both themes. */}
      <div className="grid h-16 w-40 place-items-center rounded-card border border-border bg-white p-2">
        {url ? (
          <img src={url} alt="Firm logo" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-[#737373]">No logo</span>
        )}
      </div>
    </div>
  );
}

function DefaultOrder() {
  const saved = useApp((s) => s.categoryOrder);
  const setCategoryOrder = useApp((s) => s.setCategoryOrder);
  const order = fullOrder(saved);
  const persist = (next: CategoryId[]) =>
    void setCategoryOrder(next.join() === CATEGORY_IDS.join() ? [] : next);
  return (
    <div>
      <OrderList
        order={order}
        counts={new Map()}
        onMove={(from, to) => {
          if (to < 0 || to >= order.length) return;
          const next = [...order];
          const [item] = next.splice(from, 1);
          if (item) next.splice(to, 0, item);
          persist(next);
        }}
      />
      {saved.length ? (
        <Button
          size="sm"
          variant="ghost"
          className="mt-2"
          onClick={() => {
            persist([...CATEGORY_IDS]);
          }}
        >
          Reset to default order
        </Button>
      ) : null}
    </div>
  );
}

function NameTemplate() {
  const template = useApp((s) => s.nameTemplate);
  const setNameTemplate = useApp((s) => s.setNameTemplate);
  const [draft, setDraft] = useState(template);
  const [saved, markSaved] = useSaved();
  const [synced, setSynced] = useState(template);
  if (synced !== template) {
    setSynced(template);
    setDraft(template);
  }
  const valid = templateIsValid(draft);
  const preview = valid
    ? renderName(draft, {
        year: new Date().getFullYear() - 1,
        form: 'W-2',
        issuer: 'Northwind Logistics LLC',
        client: 'Sample',
      })
    : null;
  // Save shortly after typing stops.
  useEffect(() => {
    if (!valid || draft === template) return;
    const t = window.setTimeout(() => {
      void setNameTemplate(draft).then(markSaved);
    }, 500);
    return () => {
      window.clearTimeout(t);
    };
  }, [draft, template, valid, setNameTemplate, markSaved]);
  return (
    <div>
      <TemplateField template={draft} valid={valid} preview={preview} onChange={setDraft} />
      <Saved show={saved} />
    </div>
  );
}

function DefaultQuality() {
  const prefs = useApp((s) => s.exportPrefs);
  const setExportPrefs = useApp((s) => s.setExportPrefs);
  return (
    <div className="w-[420px]">
      <QualityField
        hideLegend
        quality={prefs.quality}
        onChange={(quality) => void setExportPrefs({ ...prefs, quality })}
      />
    </div>
  );
}

const ENGINE_NAMES: Record<string, string> = {
  tesseract: 'Tesseract 5',
  windows: 'Windows OCR',
  vision: 'Apple Vision',
};

function OcrEngine() {
  const info = useAppInfo();
  const [engine, setEngine] = useState<string | null>(null);
  const id = useId();
  useEffect(() => {
    void backend.getSetting('ocr.engine').then((v) => {
      setEngine(v ?? 'auto');
    });
  }, []);
  const engines = info?.ocrEngines ?? [];
  const automatic = ENGINE_NAMES[engines[0] ?? ''];
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        Text recognition engine
      </label>
      <select
        id={id}
        value={engine ?? 'auto'}
        disabled={engine === null || !info}
        onChange={(e) => {
          setEngine(e.target.value);
          void backend.setSetting('ocr.engine', e.target.value);
        }}
        className="h-9 w-56 rounded-control border border-border-strong bg-bg px-2 text-sm outline-none focus:border-fg"
      >
        <option value="auto">Automatic{automatic ? ` (${automatic})` : ''}</option>
        {engines.map((e) => (
          <option key={e} value={e}>
            {ENGINE_NAMES[e] ?? e}
          </option>
        ))}
      </select>
    </div>
  );
}

function DeleteHistory() {
  const loadClients = useApp((s) => s.loadClients);
  const closeBinder = useApp((s) => s.closeBinder);
  const [done, setDone] = useState(false);
  const run = async () => {
    const ok = await ask(
      'This deletes your client list, binder history and the document lists used for the missing-documents check. Exported binders on disk are not touched. This can’t be undone.',
      {
        title: 'Delete all local history?',
        kind: 'warning',
        okLabel: 'Delete history',
        cancelLabel: 'Cancel',
      },
    );
    if (!ok) return;
    closeBinder(true);
    await backend.deleteHistory();
    await loadClients();
    setDone(true);
  };
  return (
    <div className="flex items-center gap-3">
      {done ? <span className="text-xs text-fg-muted">History deleted</span> : null}
      <Button size="sm" variant="secondary" className="text-danger" onClick={() => void run()}>
        Delete all local history…
      </Button>
    </div>
  );
}

export function Settings() {
  const info = useAppInfo();
  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <p className="eyebrow">Settings</p>
      <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">Settings</h1>

      <Section id="firm" title="Firm profile">
        <Row
          title="Firm name"
          description="Printed on binder covers and signed on missing-documents emails."
        >
          <FirmName />
        </Row>
        <Row title="Logo" description="PNG or SVG. Printed on binder covers.">
          <FirmLogo />
        </Row>
      </Section>

      <Section id="binders" title="Binders">
        <Row
          stacked
          title="Default binder order"
          description="Categories in the order binders list them. The review board follows it too."
        >
          <DefaultOrder />
        </Row>
        <Row
          stacked
          title="Document names"
          description="Used for bookmarks, the index and individual files. Names you typed by hand stay as they are."
        >
          <NameTemplate />
        </Row>
        <Row
          title="Image quality"
          description="For scanned and photographed pages. Digital PDFs are copied as they are."
        >
          <DefaultQuality />
        </Row>
      </Section>

      <Section id="ocr" title="Text recognition">
        <Row
          title="Engine"
          description={
            info && info.ocrEngines.length === 1
              ? 'Scans and photos are read on this computer. Tesseract is the engine available here.'
              : 'Scans and photos are read on this computer. Automatic picks the best engine for this system.'
          }
        >
          <OcrEngine />
        </Row>
      </Section>

      <Section id="appearance" title="Appearance">
        <Row title="Theme" description="System follows your computer’s light or dark setting.">
          <ThemeSwitcher store={themeStore} />
        </Row>
      </Section>

      <Section id="data" title="Data">
        <Row
          title="App data folder"
          description="Settings, your client list and binder history are stored here. Page images are kept in a cache only while you work and are deleted when the app next starts. Document text is never stored."
        >
          <span
            className="block max-w-[320px] break-all text-right font-mono text-xs text-fg-muted"
            data-selectable
          >
            {info?.dataDir ?? '…'}
          </span>
        </Row>
        <Row
          title="Local history"
          description="Clients, exported-binder records and, for each client and year, the list of form types and issuers used to spot missing documents."
        >
          <DeleteHistory />
        </Row>
      </Section>

      <Section id="about" title="About">
        <Row title="Version" description={`The installed version of ${PRODUCT_NAME}.`}>
          <span className="font-mono text-[13px]">{info?.version ?? '…'}</span>
        </Row>
      </Section>
    </div>
  );
}
