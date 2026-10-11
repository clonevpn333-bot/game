import type { DocumentResult, FileInput } from '@binderready/engine';
import type { EngineRequest, EngineResponse } from './engine.worker';

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (r: EngineResponse) => void>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<EngineResponse>) => {
      pending.get(e.data.id)?.(e.data);
      pending.delete(e.data.id);
    };
  }
  return worker;
}

/** Classify, split, name and de-duplicate in the worker. */
export function runEngine(
  files: FileInput[],
  clientName: string,
  nameTemplate: string,
): Promise<{ documents: DocumentResult[]; millis: number }> {
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    const request: EngineRequest = { id, files, clientName, nameTemplate };
    getWorker().postMessage(request);
  });
}
