/// <reference lib="webworker" />
/**
 * Assembles the binder (and individual files) off the main thread: pdf-lib work on
 * a few hundred pages would otherwise freeze the window.
 */
import { assembleBinder, assembleSingle, type BinderOptions, type BinderSection } from './binder';
import { memorySource } from './export-plan';

export interface ExportJob {
  sections: BinderSection[];
  options: BinderOptions;
  pdfs: [string, Uint8Array][];
  images: [string, Uint8Array][];
  singles: boolean;
}

export type ExportReply =
  | {
      ok: true;
      binder: Uint8Array;
      pageCount: number;
      documentCount: number;
      singles: { name: string; bytes: Uint8Array }[];
    }
  | { ok: false; message: string };

self.onmessage = async (event: MessageEvent<ExportJob>) => {
  const { sections, options, pdfs, images, singles } = event.data;
  try {
    const source = memorySource(new Map(pdfs), new Map(images));
    const binder = await assembleBinder(sections, source, options);
    const files: { name: string; bytes: Uint8Array }[] = [];
    if (singles) {
      for (const document of sections.flatMap((s) => s.documents)) {
        files.push({
          name: document.name,
          bytes: await assembleSingle(document, source, options.productName, options.generatedOn),
        });
      }
    }
    const reply: ExportReply = {
      ok: true,
      binder: binder.bytes,
      pageCount: binder.pageCount,
      documentCount: binder.documentCount,
      singles: files,
    };
    self.postMessage(reply, [binder.bytes.buffer, ...files.map((f) => f.bytes.buffer)]);
  } catch (error) {
    const reply: ExportReply = {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(reply);
  }
};
