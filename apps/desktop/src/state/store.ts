import { CATEGORY_IDS, DEFAULT_NAME_TEMPLATE, type CategoryId } from '@binderready/engine';
import { create } from 'zustand';
import {
  backend,
  type Client,
  type DesktopFile,
  type FileErrorKind,
  type Progress,
  type Stage,
} from '../lib/backend';
import { runEngine } from '../lib/engine-client';
import type { Quality } from '../lib/export-plan';
import type { ExportResult } from '../lib/export-run';
import * as review from '../lib/review';

export type View =
  'home' | 'new-binder' | 'processing' | 'review' | 'clients' | 'recent' | 'settings';

export interface FileStatus {
  id: string;
  name: string;
  path: string;
  stage: Stage;
  pagesDone: number;
  pagesTotal: number;
  error?: FileErrorKind;
  message?: string;
}

export interface Batch {
  id: string;
  client: Client;
  taxYear: number;
  files: FileStatus[];
  startedAt: number;
  finishedAt: number | null;
  engineMillis: number | null;
}

export interface ExportPrefs {
  includeCover: boolean;
  includeIndex: boolean;
  singles: boolean;
  quality: Quality;
}

export const DEFAULT_EXPORT_PREFS: ExportPrefs = {
  includeCover: true,
  includeIndex: true,
  singles: false,
  quality: 'balanced',
};

/** Settings keys (SQLite settings table). */
const KEYS = {
  exportPrefs: 'export.prefs',
  nameTemplate: 'naming.template',
  categoryOrder: 'binder.order',
} as const;

function parseOrder(raw: string | null): CategoryId[] {
  try {
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    const known = new Set<string>(CATEGORY_IDS);
    return value.filter((c): c is CategoryId => typeof c === 'string' && known.has(c));
  } catch {
    return [];
  }
}

function parsePrefs(raw: string | null): ExportPrefs {
  try {
    const value = (raw ? JSON.parse(raw) : {}) as Partial<ExportPrefs>;
    return {
      includeCover: typeof value.includeCover === 'boolean' ? value.includeCover : true,
      includeIndex: typeof value.includeIndex === 'boolean' ? value.includeIndex : true,
      singles: typeof value.singles === 'boolean' ? value.singles : false,
      quality: value.quality === 'compact' || value.quality === 'high' ? value.quality : 'balanced',
    };
  } catch {
    return DEFAULT_EXPORT_PREFS;
  }
}

interface State {
  view: View;
  clients: Client[];
  /** Files dropped before a client was chosen; ingested once the binder starts. */
  pendingPaths: string[];
  batch: Batch | null;
  inputs: review.Files;
  docs: review.ReviewDoc[];
  rotations: review.Rotations;
  selectedId: string | null;
  stripOpen: boolean;
  previewOpen: boolean;
  formPickerOpen: boolean;
  editingName: boolean;
  paletteOpen: boolean;
  notice: string | null;
  nameTemplate: string;
  /** The firm's category order; empty means the default order. */
  categoryOrder: CategoryId[];
  exportPrefs: ExportPrefs;
  exportOpen: boolean;
  lastExport: ExportResult | null;

  go: (view: View) => void;
  loadPrefs: () => Promise<void>;
  setNameTemplate: (template: string) => Promise<void>;
  setCategoryOrder: (order: CategoryId[]) => Promise<void>;
  setExportPrefs: (prefs: ExportPrefs) => Promise<void>;
  openExport: () => void;
  exportDone: (result: ExportResult) => void;
  loadClients: () => Promise<void>;
  createClient: (name: string) => Promise<Client>;
  queuePaths: (paths: string[]) => void;
  startBinder: (client: Client, taxYear: number) => Promise<void>;
  addPaths: (paths: string[]) => Promise<void>;
  onProgress: (p: Progress) => void;
  onFile: (batchId: string, file: DesktopFile) => void;
  closeBinder: () => void;

  select: (id: string | null) => void;
  move: (delta: 1 | -1) => void;
  accept: () => void;
  reassign: (category: CategoryId) => void;
  changeForm: (formId: string) => void;
  rename: (name: string) => void;
  rotatePage: (fileId: string, page: number, delta?: number) => void;
  splitAt: (at: number) => void;
  merge: () => void;
  toggleExcluded: () => void;
  movePage: (from: number, to: number) => void;
  set: (
    patch: Partial<
      Pick<
        State,
        | 'stripOpen'
        | 'previewOpen'
        | 'formPickerOpen'
        | 'editingName'
        | 'paletteOpen'
        | 'notice'
        | 'exportOpen'
        | 'lastExport'
      >
    >,
  ) => void;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function naming(get: () => State): review.NamingContext {
  const batch = get().batch;
  return {
    template: get().nameTemplate,
    clientName: batch?.client.displayName.split(/\s+/).at(-1) ?? '',
  };
}

function allSettled(batch: Batch): boolean {
  return (
    batch.files.length > 0 && batch.files.every((f) => f.stage === 'done' || f.stage === 'error')
  );
}

export const useApp = create<State>((set, get) => ({
  view: 'home',
  clients: [],
  pendingPaths: [],
  batch: null,
  inputs: {},
  docs: [],
  rotations: {},
  selectedId: null,
  stripOpen: false,
  previewOpen: false,
  formPickerOpen: false,
  editingName: false,
  paletteOpen: false,
  notice: null,
  nameTemplate: DEFAULT_NAME_TEMPLATE,
  categoryOrder: [],
  exportPrefs: DEFAULT_EXPORT_PREFS,
  exportOpen: false,
  lastExport: null,

  go: (view) => {
    set({ view, paletteOpen: false });
  },
  loadPrefs: async () => {
    const [prefs, template, order] = await Promise.all([
      backend.getSetting(KEYS.exportPrefs),
      backend.getSetting(KEYS.nameTemplate),
      backend.getSetting(KEYS.categoryOrder),
    ]);
    set({
      exportPrefs: parsePrefs(prefs),
      nameTemplate: template?.trim() ? template : DEFAULT_NAME_TEMPLATE,
      categoryOrder: parseOrder(order),
    });
  },
  setNameTemplate: async (template) => {
    set({ nameTemplate: template });
    set({ docs: review.applyTemplate(get().docs, naming(get)) });
    await backend.setSetting(KEYS.nameTemplate, template);
  },
  setCategoryOrder: async (order) => {
    set({ categoryOrder: order });
    await backend.setSetting(KEYS.categoryOrder, JSON.stringify(order));
  },
  setExportPrefs: async (prefs) => {
    set({ exportPrefs: prefs });
    await backend.setSetting(KEYS.exportPrefs, JSON.stringify(prefs));
  },
  openExport: () => {
    const { batch, docs } = get();
    if (!batch || !docs.some((d) => !d.excluded)) return;
    set({
      exportOpen: true,
      paletteOpen: false,
      formPickerOpen: false,
      previewOpen: false,
      editingName: false,
    });
  },
  exportDone: (result) => {
    set({ exportOpen: false, lastExport: result });
    void get().loadClients();
  },
  loadClients: async () => {
    set({ clients: await backend.listClients() });
  },
  createClient: async (name) => {
    const client = await backend.createClient(name);
    await get().loadClients();
    return client;
  },
  queuePaths: (paths) => {
    set((s) => ({
      pendingPaths: [...s.pendingPaths, ...paths],
      view: s.batch ? s.view : 'new-binder',
    }));
  },
  startBinder: async (client, taxYear) => {
    const batch: Batch = {
      id: newId(),
      client,
      taxYear,
      files: [],
      startedAt: Date.now(),
      finishedAt: null,
      engineMillis: null,
    };
    set({
      batch,
      inputs: {},
      docs: [],
      rotations: {},
      selectedId: null,
      lastExport: null,
      view: 'processing',
    });
    const pending = get().pendingPaths;
    set({ pendingPaths: [] });
    if (pending.length) await get().addPaths(pending);
  },
  addPaths: async (paths) => {
    const batch = get().batch;
    if (!batch || paths.length === 0) return;
    const known = new Set(batch.files.map((f) => f.path));
    const fresh = paths
      .filter((p) => !known.has(p))
      .map((path) => ({ id: newId(), path, name: path.split(/[\\/]/).at(-1) ?? path }));
    if (!fresh.length) return;
    const files: FileStatus[] = fresh.map((f) => ({
      ...f,
      stage: 'queued',
      pagesDone: 0,
      pagesTotal: 0,
    }));
    set({
      batch: { ...batch, files: [...batch.files, ...files], finishedAt: null },
      view: 'processing',
    });
    await backend.ingestFiles(
      batch.id,
      fresh.map(({ id, path }) => ({ id, path })),
    );
  },
  onProgress: (p) => {
    const batch = get().batch;
    if (!batch || p.batchId !== batch.id) return;
    const files = batch.files.map((f) =>
      f.id === p.fileId
        ? {
            ...f,
            stage: p.stage,
            pagesDone: p.pagesDone || f.pagesDone,
            pagesTotal: p.pagesTotal || f.pagesTotal,
            ...(p.error ? { error: p.error } : {}),
            ...(p.message ? { message: p.message } : {}),
          }
        : f,
    );
    const next = { ...batch, files };
    set({ batch: next });
    void maybeRunEngine(next);
  },
  onFile: (batchId, file) => {
    const batch = get().batch;
    if (!batch || batchId !== batch.id) return;
    set((s) => ({ inputs: { ...s.inputs, [file.id]: file } }));
    void maybeRunEngine(get().batch ?? batch);
  },
  closeBinder: () => {
    const batch = get().batch;
    if (batch && !allSettled(batch)) void backend.cancelIngest(batch.id);
    set({
      batch: null,
      inputs: {},
      docs: [],
      rotations: {},
      selectedId: null,
      exportOpen: false,
      lastExport: null,
      view: 'home',
    });
  },

  select: (id) => {
    set({ selectedId: id, editingName: false, formPickerOpen: false });
  },
  move: (delta) => {
    const order = review.navigationOrder(get().docs, get().categoryOrder);
    if (!order.length) return;
    const at = order.indexOf(get().selectedId ?? '');
    const next = at < 0 ? order[0] : order[Math.min(order.length - 1, Math.max(0, at + delta))];
    set({ selectedId: next ?? null, editingName: false, formPickerOpen: false });
  },
  accept: () => {
    const id = get().selectedId;
    if (!id) return;
    set({ docs: review.accept(get().docs, id) });
    get().move(1);
  },
  reassign: (category) => {
    const id = get().selectedId;
    if (id) set({ docs: review.reassignCategory(get().docs, id, category) });
  },
  changeForm: (formId) => {
    const id = get().selectedId;
    if (id)
      set({
        docs: review.changeForm(get().docs, get().inputs, id, formId, naming(get)),
        formPickerOpen: false,
      });
  },
  rename: (name) => {
    const id = get().selectedId;
    if (id) set({ docs: review.rename(get().docs, id, name, naming(get)), editingName: false });
  },
  rotatePage: (fileId, page, delta = 90) => {
    set({ rotations: review.rotate(get().rotations, fileId, page, delta) });
  },
  splitAt: (at) => {
    const id = get().selectedId;
    if (id) set({ docs: review.splitAt(get().docs, get().inputs, id, at, naming(get)) });
  },
  merge: () => {
    const id = get().selectedId;
    if (!id) return;
    const docs = get().docs;
    const result = review.mergeWithPrevious(docs, id);
    if (result.error) {
      set({ notice: result.error });
      return;
    }
    const removedIndex = review.navigationOrder(docs, get().categoryOrder).indexOf(id);
    const order = review.navigationOrder(result.docs, get().categoryOrder);
    set({ docs: result.docs, selectedId: order[Math.max(0, removedIndex - 1)] ?? null });
  },
  toggleExcluded: () => {
    const id = get().selectedId;
    if (id) set({ docs: review.toggleExcluded(get().docs, id) });
  },
  movePage: (from, to) => {
    const id = get().selectedId;
    if (id) set({ docs: review.movePage(get().docs, id, from, to) });
  },
  set: (patch) => {
    set(patch);
  },
}));

let engineRun = 0;

/** When every file has finished (or failed), run the engine once over all of them. */
async function maybeRunEngine(batch: Batch) {
  const { inputs } = useApp.getState();
  if (!allSettled(batch)) return;
  const ok = batch.files.filter((f) => f.stage === 'done');
  if (ok.some((f) => !inputs[f.id])) return;
  if (batch.finishedAt) return;
  const run = ++engineRun;
  useApp.setState({ batch: { ...batch, finishedAt: Date.now() } });
  const files = ok.map((f) => inputs[f.id]).filter((f): f is DesktopFile => f !== undefined);
  const clientName = batch.client.displayName.split(/\s+/).at(-1) ?? '';
  const { documents, millis } = await runEngine(files, clientName, useApp.getState().nameTemplate);
  if (run !== engineRun || useApp.getState().batch?.id !== batch.id) return;
  // Files added after review started: keep every edit made to documents that didn't change.
  const previous = new Map(
    useApp.getState().docs.map((d) => [`${d.fileId}:${d.pages.join(',')}`, d]),
  );
  const docs = review
    .toReviewDocs(documents)
    .map((d) => previous.get(`${d.fileId}:${d.pages.join(',')}`) ?? d);
  const current = useApp.getState().batch;
  useApp.setState({
    docs,
    selectedId: review.navigationOrder(docs, useApp.getState().categoryOrder)[0] ?? null,
    batch: current ? { ...current, engineMillis: millis } : current,
    view: docs.length || batch.files.some((f) => f.stage === 'error') ? 'review' : 'processing',
  });
}
