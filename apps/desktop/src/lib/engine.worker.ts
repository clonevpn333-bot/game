/// <reference lib="webworker" />
/**
 * Runs the recognition engine off the main thread, so the UI stays responsive
 * while hundreds of pages are classified and split.
 */
import { processFiles, type DocumentResult, type FileInput } from '@binderready/engine';
import { catalog } from './catalog';

export interface EngineRequest {
  id: number;
  files: FileInput[];
  clientName: string;
  nameTemplate: string;
}

export interface EngineResponse {
  id: number;
  documents: DocumentResult[];
  millis: number;
}

self.onmessage = (event: MessageEvent<EngineRequest>) => {
  const started = performance.now();
  const { id, files, clientName, nameTemplate } = event.data;
  const documents = processFiles(catalog, files, { clientName, nameTemplate });
  const response: EngineResponse = { id, documents, millis: performance.now() - started };
  self.postMessage(response);
};
