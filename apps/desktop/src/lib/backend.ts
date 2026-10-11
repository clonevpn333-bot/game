/**
 * The only bridge to the Rust backend. Every call goes through Tauri IPC; there is
 * no browser fallback, so the UI never shows data that didn't come from the app.
 */
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { FileInput as EngineFile, PageInput as EnginePage } from '@binderready/engine';
import type { Quality } from './export-plan';
import type { IndexItem } from './missing';

export const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export interface DesktopPage extends EnginePage {
  phash: string;
  /** Absolute path of the upright 150 DPI page image. */
  image: string;
  imageWidth: number;
  imageHeight: number;
  rotation: number;
  confidence: number;
}

export interface DesktopFile extends EngineFile {
  path: string;
  pages: DesktopPage[];
}

export type Stage = 'queued' | 'reading' | 'splitting' | 'recognizing' | 'done' | 'error';
export type FileErrorKind = 'password' | 'corrupt' | 'unsupported' | 'unreadable';

export interface Progress {
  batchId: string;
  fileId: string;
  stage: Stage;
  pagesDone: number;
  pagesTotal: number;
  error?: FileErrorKind;
  message?: string;
}

export interface Client {
  id: number;
  displayName: string;
  createdAt: string;
  outputDir: string | null;
  lastYear: number | null;
}

export interface BinderRow {
  id: number;
  clientId: number;
  clientName: string;
  taxYear: number;
  exportedAt: string;
  documents: number;
  pages: number;
  outputPath: string;
  trial: boolean;
}

export interface AppInfo {
  version: string;
  /** Text recognition engines on this system, best first. */
  ocrEngines: string[];
  dataDir: string;
  platform: string;
}

export const backend = {
  appInfo: () => invoke<AppInfo>('app_info'),
  listClients: () => invoke<Client[]>('list_clients'),
  createClient: (displayName: string) => invoke<Client>('create_client', { displayName }),
  listBinders: () => invoke<BinderRow[]>('list_binders'),
  getSetting: (key: string) => invoke<string | null>('get_setting', { key }),
  setSetting: (key: string, value: string) => invoke<null>('set_setting', { key, value }),
  ingestFiles: (batchId: string, files: { id: string; path: string }[]) =>
    invoke<null>('ingest_files', { batchId, files }),
  cancelIngest: (batchId: string) => invoke<null>('cancel_ingest', { batchId }),
  expandPaths: (paths: string[]) => invoke<string[]>('expand_paths', { paths }),
  /** Bytes of a file ingested in this session (digital PDF pages are copied from it). */
  readSource: async (path: string) =>
    new Uint8Array(await invoke<ArrayBuffer>('read_source', { path })),
  /** A cached page image re-encoded at an export quality preset. */
  pageJpeg: async (path: string, quality: Quality) =>
    new Uint8Array(await invoke<ArrayBuffer>('page_jpeg', { path, quality })),
  /** System folder picker; the chosen folder becomes writable. Null when cancelled. */
  chooseOutputDir: (start: string | null) => invoke<string | null>('choose_output_dir', { start }),
  /** Re-allows a client's remembered folder; null if it's gone. */
  allowRememberedDir: (clientId: number) =>
    invoke<string | null>('allow_remembered_dir', { clientId }),
  /** Writes a PDF into an allowed folder; returns the path actually written (never overwrites). */
  writeOutput: (bytes: Uint8Array, dir: string, name: string, subdir?: string) =>
    invoke<string>('write_output', bytes, {
      headers: {
        'x-dir': encodeURIComponent(dir),
        'x-name': encodeURIComponent(name),
        ...(subdir ? { 'x-subdir': encodeURIComponent(subdir) } : {}),
      },
    }),
  recordBinder: (record: {
    clientId: number;
    taxYear: number;
    documents: number;
    pages: number;
    outputPath: string;
    outputDir: string;
    trial: boolean;
  }) => invoke<null>('record_binder', { record }),
  /** Stores this binder's {form, issuer} list for next year's missing-documents check. */
  recordIndex: (clientId: number, taxYear: number, items: IndexItem[]) =>
    invoke<null>('record_index', { clientId, taxYear, items }),
  previousIndex: (clientId: number, taxYear: number) =>
    invoke<{ taxYear: number; items: IndexItem[] } | null>('previous_index', { clientId, taxYear }),
  dismissedMissing: (clientId: number, taxYear: number) =>
    invoke<IndexItem[]>('dismissed_missing', { clientId, taxYear }),
  setMissingDismissed: (clientId: number, taxYear: number, item: IndexItem, dismissed: boolean) =>
    invoke<null>('set_missing_dismissed', { clientId, taxYear, item, dismissed }),
  deleteHistory: () => invoke<null>('delete_history'),
  /** System picker for a PNG/SVG logo; false when cancelled. */
  chooseLogo: () => invoke<boolean>('choose_logo'),
  /** The firm logo as PNG bytes, or null. */
  firmLogo: async () => {
    const bytes = new Uint8Array(await invoke<ArrayBuffer>('firm_logo'));
    return bytes.byteLength ? bytes : null;
  },
  clearLogo: () => invoke<null>('clear_logo'),
  onProgress: (handler: (p: Progress) => void): Promise<UnlistenFn> =>
    listen<Progress>('ingest://progress', (e) => {
      handler(e.payload);
    }),
  onFile: (handler: (batchId: string, file: DesktopFile) => void): Promise<UnlistenFn> =>
    listen<{ batchId: string; file: DesktopFile }>('ingest://file', (e) => {
      handler(e.payload.batchId, e.payload.file);
    }),
};
