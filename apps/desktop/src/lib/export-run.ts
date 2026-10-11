/**
 * Runs an export: fetch every page the binder needs from the backend (at the
 * chosen quality), assemble in a worker, then write the files through Rust into
 * the folder the preparer picked.
 */
import { backend } from './backend';
import type { BinderOptions } from './binder';
import { binderTitle, filesFolder, planBinder, requiredInputs, type Quality } from './export-plan';
import type { ExportJob, ExportReply } from './export.worker';
import { indexItems } from './missing';
import type { Files, ReviewDoc, Rotations } from './review';
import type { CategoryId } from '@binderready/engine';

export interface ExportRequest {
  clientId: number;
  client: string;
  taxYear: number;
  docs: ReviewDoc[];
  files: Files;
  rotations: Rotations;
  categoryOrder: CategoryId[];
  quality: Quality;
  includeCover: boolean;
  includeIndex: boolean;
  singles: boolean;
  outputDir: string;
  firmName: string;
  logoPng: Uint8Array | null;
  trial: boolean;
  productName: string;
}

export type ExportStep =
  | { step: 'pages'; done: number; total: number }
  | { step: 'assembling' }
  | { step: 'writing'; done: number; total: number };

export interface ExportResult {
  path: string;
  bytes: number;
  pages: number;
  documents: number;
  singlesWritten: number;
  millis: number;
}

/** Runs `tasks` with at most `limit` in flight. */
async function pool<T>(items: T[], limit: number, run: (item: T) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++] as T;
      await run(item);
    }
  });
  await Promise.all(workers);
}

function assemble(job: ExportJob): Promise<ExportReply> {
  const worker = new Worker(new URL('./export.worker.ts', import.meta.url), { type: 'module' });
  return new Promise<ExportReply>((resolve) => {
    worker.onmessage = (e: MessageEvent<ExportReply>) => {
      resolve(e.data);
    };
    worker.onerror = (e) => {
      resolve({ ok: false, message: e.message });
    };
    worker.postMessage(job, [
      ...job.pdfs.map(([, b]) => b.buffer),
      ...job.images.map(([, b]) => b.buffer),
    ]);
  }).finally(() => {
    worker.terminate();
  });
}

export async function runExport(
  request: ExportRequest,
  onStep: (step: ExportStep) => void,
): Promise<ExportResult> {
  const started = performance.now();
  const sections = planBinder(
    request.docs,
    request.files,
    request.rotations,
    request.categoryOrder,
  );
  if (!sections.length) throw new Error('There are no documents in this binder.');
  const { pdfs, images } = requiredInputs(sections, request.files);

  const total = pdfs.size + images.size;
  let done = 0;
  onStep({ step: 'pages', done, total });
  const pdfBytes: [string, Uint8Array][] = [];
  const imageBytes: [string, Uint8Array][] = [];
  const tick = () => {
    done += 1;
    onStep({ step: 'pages', done, total });
  };
  await pool([...pdfs], 4, async ([id, path]) => {
    pdfBytes.push([id, await backend.readSource(path)]);
    tick();
  });
  await pool([...images], 4, async ([key, path]) => {
    imageBytes.push([key, await backend.pageJpeg(path, request.quality)]);
    tick();
  });

  onStep({ step: 'assembling' });
  const options: BinderOptions = {
    client: request.client,
    taxYear: request.taxYear,
    firmName: request.firmName,
    logoPng: request.logoPng,
    includeCover: request.includeCover,
    includeIndex: request.includeIndex,
    trial: request.trial,
    productName: request.productName,
    generatedOn: new Date(),
  };
  const reply = await assemble({
    sections,
    options,
    pdfs: pdfBytes,
    images: imageBytes,
    singles: request.singles,
  });
  if (!reply.ok) throw new Error(reply.message);

  const writes = 1 + reply.singles.length;
  onStep({ step: 'writing', done: 0, total: writes });
  const path = await backend.writeOutput(
    reply.binder,
    request.outputDir,
    binderTitle(request.client, request.taxYear),
  );
  let written = 0;
  for (const single of reply.singles) {
    await backend.writeOutput(
      single.bytes,
      request.outputDir,
      single.name,
      filesFolder(request.client, request.taxYear),
    );
    written += 1;
    onStep({ step: 'writing', done: 1 + written, total: writes });
  }
  await backend.recordBinder({
    clientId: request.clientId,
    taxYear: request.taxYear,
    documents: reply.documentCount,
    pages: reply.pageCount,
    outputPath: path,
    outputDir: request.outputDir,
    trial: request.trial,
  });
  await backend.recordIndex(request.clientId, request.taxYear, indexItems(request.docs));
  return {
    path,
    bytes: reply.binder.byteLength,
    pages: reply.pageCount,
    documents: reply.documentCount,
    singlesWritten: written,
    millis: performance.now() - started,
  };
}
