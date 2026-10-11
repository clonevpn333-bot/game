/**
 * The only bridge to the Rust backend. Every call goes through Tauri IPC; there is
 * no browser fallback, so the UI never shows data that didn't come from the app.
 */
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { FileInput as EngineFile, PageInput as EnginePage } from '@binderready/engine';

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
  ocrEngine: string;
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
  onProgress: (handler: (p: Progress) => void): Promise<UnlistenFn> =>
    listen<Progress>('ingest://progress', (e) => {
      handler(e.payload);
    }),
  onFile: (handler: (batchId: string, file: DesktopFile) => void): Promise<UnlistenFn> =>
    listen<{ batchId: string; file: DesktopFile }>('ingest://file', (e) => {
      handler(e.payload.batchId, e.payload.file);
    }),
};
