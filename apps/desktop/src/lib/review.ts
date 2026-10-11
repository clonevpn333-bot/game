/**
 * Review-board edits as pure functions over the document list, so every keyboard
 * action is unit-tested without a UI. Re-classification and re-naming use the
 * same engine as the first pass.
 */
import {
  CATEGORY_IDS,
  classifyText,
  extractFields,
  pageText,
  renderName,
  type CategoryId,
  type DocumentResult,
  type PageText,
} from '@binderready/engine';
import type { DesktopFile } from './backend';
import { catalog, formById, formLabel } from './catalog';

export interface ReviewDoc extends DocumentResult {
  /** A person accepted or corrected this document. */
  reviewed: boolean;
  /** Removed from the binder (duplicate or not needed). */
  excluded: boolean;
  /** The name was typed by hand; don't regenerate it. */
  nameEdited: boolean;
}

export interface NamingContext {
  template: string;
  clientName: string;
}

export type Files = Record<string, DesktopFile>;

export function toReviewDocs(documents: DocumentResult[]): ReviewDoc[] {
  return documents.map((d) => ({
    ...d,
    reviewed: false,
    excluded: d.duplicateOf !== null,
    nameEdited: false,
  }));
}

function texts(files: Files, doc: Pick<DocumentResult, 'fileId' | 'pages'>): PageText[] {
  const file = files[doc.fileId];
  return doc.pages
    .map((p) => file?.pages.find((page) => page.index === p))
    .filter((p) => p !== undefined)
    .map((p) => pageText(p.words));
}

function nameFor(doc: ReviewDoc, naming: NamingContext): string {
  if (doc.nameEdited) return doc.name;
  const form = doc.formId ? formById.get(doc.formId) : undefined;
  return renderName(naming.template, {
    year: doc.fields.taxYear,
    form: form ? formLabel(form.id) : 'Document',
    issuer: doc.fields.issuer,
    client: naming.clientName || doc.fields.recipientLastName,
  });
}

/** Board groups: unresolved "Needs review" first, then categories in binder order. */
export function boardGroups(docs: ReviewDoc[], order: readonly CategoryId[] = CATEGORY_IDS) {
  const live = docs.filter((d) => !d.excluded);
  const needsReview = live.filter((d) => d.status === 'review' && !d.reviewed);
  const rest = live.filter((d) => !needsReview.includes(d));
  const groups: { id: string; label: string; docs: ReviewDoc[] }[] = [];
  if (needsReview.length)
    groups.push({ id: 'needs-review', label: 'Needs review', docs: needsReview });
  for (const category of order) {
    const inCategory = rest.filter((d) => d.category === category);
    if (inCategory.length) {
      groups.push({
        id: category,
        label: catalog.categories.find((c) => c.id === category)?.displayName ?? category,
        docs: inCategory,
      });
    }
  }
  const excluded = docs.filter((d) => d.excluded);
  if (excluded.length)
    groups.push({ id: 'excluded', label: 'Duplicates and removed', docs: excluded });
  return groups;
}

/** Keyboard order: the board read top to bottom. */
export function navigationOrder(docs: ReviewDoc[]): string[] {
  return boardGroups(docs).flatMap((g) => g.docs.map((d) => d.id));
}

const replace = (docs: ReviewDoc[], id: string, f: (d: ReviewDoc) => ReviewDoc) =>
  docs.map((d) => (d.id === id ? f(d) : d));

export function accept(docs: ReviewDoc[], id: string): ReviewDoc[] {
  return replace(docs, id, (d) => ({ ...d, reviewed: true, status: d.formId ? 'auto' : d.status }));
}

export function reassignCategory(docs: ReviewDoc[], id: string, category: CategoryId): ReviewDoc[] {
  return replace(docs, id, (d) => ({ ...d, category, reviewed: true, status: 'auto' }));
}

export function changeForm(
  docs: ReviewDoc[],
  files: Files,
  id: string,
  formId: string,
  naming: NamingContext,
): ReviewDoc[] {
  const form = formById.get(formId);
  if (!form) return docs;
  return replace(docs, id, (d) => {
    const fields = extractFields(catalog, form, texts(files, d));
    const next: ReviewDoc = {
      ...d,
      formId,
      category: form.category,
      fields,
      reviewed: true,
      status: 'auto',
      confidence: 1,
      alternatives: [],
    };
    return { ...next, name: nameFor(next, naming) };
  });
}

export function rename(
  docs: ReviewDoc[],
  id: string,
  name: string,
  naming: NamingContext,
): ReviewDoc[] {
  const trimmed = name.trim();
  return replace(docs, id, (d) => {
    if (!trimmed) {
      const reset = { ...d, nameEdited: false };
      return { ...reset, name: nameFor(reset, naming) };
    }
    return { ...d, name: trimmed, nameEdited: true, reviewed: true };
  });
}

export function toggleExcluded(docs: ReviewDoc[], id: string): ReviewDoc[] {
  return replace(docs, id, (d) => ({ ...d, excluded: !d.excluded, reviewed: true }));
}

/** Splits so the page at `at` (position within the document) starts a new document. */
export function splitAt(
  docs: ReviewDoc[],
  files: Files,
  id: string,
  at: number,
  naming: NamingContext,
): ReviewDoc[] {
  const index = docs.findIndex((d) => d.id === id);
  const doc = docs[index];
  if (!doc || at <= 0 || at >= doc.pages.length) return docs;
  const head: ReviewDoc = { ...doc, pages: doc.pages.slice(0, at) };
  const tailPages = doc.pages.slice(at);
  const tailTexts = texts(files, { fileId: doc.fileId, pages: tailPages });
  const first = tailTexts[0];
  const cls = first ? classifyText(catalog, first, doc.fileName) : null;
  const form = cls?.formId ? (formById.get(cls.formId) ?? null) : null;
  const fields = extractFields(catalog, form, tailTexts);
  const suffix = docs.filter((d) => d.id.startsWith(`${doc.id}.`)).length + 1;
  const tail: ReviewDoc = {
    ...doc,
    id: `${doc.id}.${String(suffix)}`,
    pages: tailPages,
    formId: form?.id ?? null,
    category: form && cls?.status !== 'review' ? form.category : 'other',
    confidence: cls?.confidence ?? 0,
    status: form ? (cls?.status ?? 'review') : 'review',
    alternatives: cls?.alternatives ?? [],
    fields,
    duplicateOf: null,
    duplicateKind: null,
    reviewed: false,
    excluded: false,
    nameEdited: false,
    name: '',
  };
  return [
    ...docs.slice(0, index),
    { ...head, reviewed: true },
    { ...tail, name: nameFor(tail, naming) },
    ...docs.slice(index + 1),
  ];
}

/** Merges a document into the one before it in the same file. */
export function mergeWithPrevious(
  docs: ReviewDoc[],
  id: string,
): { docs: ReviewDoc[]; error?: string } {
  const doc = docs.find((d) => d.id === id);
  if (!doc) return { docs };
  const sameFile = docs
    .filter((d) => d.fileId === doc.fileId && d.id !== id)
    .filter((d) => (d.pages[0] ?? 0) < (doc.pages[0] ?? 0))
    .sort((a, b) => (b.pages[0] ?? 0) - (a.pages[0] ?? 0));
  const previous = sameFile[0];
  if (!previous)
    return {
      docs,
      error: 'This is the first document in its file, so there is nothing to merge it into.',
    };
  const merged = {
    ...previous,
    pages: [...previous.pages, ...doc.pages].sort((a, b) => a - b),
    reviewed: true,
  };
  return { docs: docs.filter((d) => d.id !== id).map((d) => (d.id === previous.id ? merged : d)) };
}

/** Moves a page within a document. */
export function movePage(docs: ReviewDoc[], id: string, from: number, to: number): ReviewDoc[] {
  return replace(docs, id, (d) => {
    if (from < 0 || from >= d.pages.length || to < 0 || to >= d.pages.length) return d;
    const pages = [...d.pages];
    const [page] = pages.splice(from, 1);
    if (page !== undefined) pages.splice(to, 0, page);
    return { ...d, pages, reviewed: true };
  });
}

export type Rotations = Record<string, number>;
export const rotationKey = (fileId: string, page: number) => `${fileId}:${String(page)}`;

export function rotate(rotations: Rotations, fileId: string, page: number, delta = 90): Rotations {
  const key = rotationKey(fileId, page);
  return { ...rotations, [key]: ((((rotations[key] ?? 0) + delta) % 360) + 360) % 360 };
}

/** Category for number keys 1–9: the first nine categories in binder order. */
export function categoryForKey(
  key: number,
  order: readonly CategoryId[] = CATEGORY_IDS,
): CategoryId | null {
  return order[key - 1] ?? null;
}
