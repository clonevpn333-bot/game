/**
 * What goes into the binder, in which order, and where each page comes from.
 * Pure, so the binder contents are unit-tested without the app.
 */
import { binderSections, type CategoryId } from '@binderready/engine';
import type { BinderDocument, BinderSection, PageSource } from './binder';
import { catalog } from './catalog';
import { rotationKey, type Files, type ReviewDoc, type Rotations } from './review';

export type Quality = 'compact' | 'balanced' | 'high';

export const QUALITY_PRESETS: { id: Quality; label: string; detail: string }[] = [
  { id: 'compact', label: 'Compact', detail: 'Smallest files, for email' },
  { id: 'balanced', label: 'Balanced', detail: 'Clear on screen and in print' },
  { id: 'high', label: 'High', detail: 'Sharpest scans, larger files' },
];

/**
 * Documents still in the binder, grouped by category in the firm's order. A
 * duplicate the preparer restored (D twice) is included like any other document.
 */
export function planBinder(
  docs: ReviewDoc[],
  files: Files,
  rotations: Rotations,
  categoryOrder: readonly CategoryId[],
): BinderSection[] {
  const included = docs.filter((d) => !d.excluded).map((d) => ({ ...d, duplicateOf: null }));
  return binderSections(catalog, included, categoryOrder).map((section) => ({
    title: section.displayName,
    documents: section.documents.map((d) => toBinderDocument(d, files, rotations)),
  }));
}

function toBinderDocument(
  doc: Pick<ReviewDoc, 'name' | 'fileId' | 'pages'>,
  files: Files,
  rotations: Rotations,
): BinderDocument {
  const file = files[doc.fileId];
  return {
    name: doc.name,
    pages: doc.pages.map((pageIndex) => {
      const page = file?.pages.find((p) => p.index === pageIndex);
      return {
        // Digital PDF pages are copied as they are (vector, searchable); scans and photos
        // use the straightened page image.
        kind: page?.source === 'text-layer' ? 'pdf' : 'image',
        sourceId: doc.fileId,
        pageIndex,
        rotation: rotations[rotationKey(doc.fileId, pageIndex)] ?? 0,
      };
    }),
  };
}

/** Every source PDF and page image the binder needs, so they can be fetched up front. */
export function requiredInputs(sections: BinderSection[], files: Files) {
  const pdfs = new Map<string, string>();
  const images = new Map<string, string>();
  for (const page of sections.flatMap((s) => s.documents.flatMap((d) => d.pages))) {
    const file = files[page.sourceId];
    if (!file) continue;
    if (page.kind === 'pdf') pdfs.set(page.sourceId, file.path);
    else {
      const image = file.pages.find((p) => p.index === page.pageIndex)?.image;
      if (image) images.set(imageKey(page.sourceId, page.pageIndex), image);
    }
  }
  return { pdfs, images };
}

export const imageKey = (sourceId: string, pageIndex: number) => `${sourceId}:${String(pageIndex)}`;

/** A PageSource over bytes already fetched. */
export function memorySource(
  pdfs: Map<string, Uint8Array>,
  images: Map<string, Uint8Array>,
): PageSource {
  return {
    pdf: (sourceId) => {
      const bytes = pdfs.get(sourceId);
      return bytes
        ? Promise.resolve(bytes)
        : Promise.reject(new Error(`Missing source ${sourceId}`));
    },
    jpeg: (sourceId, pageIndex) => {
      const bytes = images.get(imageKey(sourceId, pageIndex));
      return bytes
        ? Promise.resolve(bytes)
        : Promise.reject(new Error(`Missing page ${imageKey(sourceId, pageIndex)}`));
    },
  };
}

/** "Jane Sample – 2025 Binder": the file name and the PDF title. */
export const binderTitle = (client: string, taxYear: number) =>
  `${client} – ${String(taxYear)} Binder`;

/** Folder for individually exported files, next to the binder. */
export const filesFolder = (client: string, taxYear: number) =>
  `${client} – ${String(taxYear)} files`;
