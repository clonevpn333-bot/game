import { classifyText, defaultClassifierConfig, type ClassifierConfig } from './classify.ts';
import { markDuplicates } from './duplicates.ts';
import { extractFields } from './extract.ts';
import type { FormsCatalog } from './forms.ts';
import { DEFAULT_NAME_TEMPLATE, renderName } from './naming.ts';
import { splitPages } from './split.ts';
import { pageText } from './text.ts';
import type { Classification, DocumentResult, FileInput } from './types.ts';

export interface PipelineOptions {
  /** Client display name for the {client} token; falls back to the recipient's last name. */
  clientName?: string | null;
  nameTemplate?: string;
  config?: ClassifierConfig;
}

/** Classify, split, extract, name and de-duplicate. Pure: same input, same output. */
export function processFiles(
  catalog: FormsCatalog,
  files: FileInput[],
  options: PipelineOptions = {},
): DocumentResult[] {
  const config = options.config ?? defaultClassifierConfig;
  const template = options.nameTemplate ?? DEFAULT_NAME_TEMPLATE;
  const forms = new Map(catalog.forms.map((f) => [f.id, f]));
  const documents: DocumentResult[] = [];

  for (const file of files) {
    const pages = [...file.pages].sort((a, b) => a.index - b.index);
    const texts = pages.map((p) => pageText(p.words));
    const classes: Classification[] = texts.map((t) => classifyText(catalog, t, file.name, config));
    const groups = splitPages(catalog, texts, classes);

    groups.forEach((group, g) => {
      // The document takes the most confident classification among its pages.
      const best = group.pages
        .map((i) => classes[i])
        .filter((c): c is Classification => c !== undefined)
        .reduce((a, b) => (b.confidence > a.confidence ? b : a));
      const form = best.formId ? (forms.get(best.formId) ?? null) : null;
      const fields = extractFields(
        catalog,
        form,
        group.pages.map((i) => texts[i]).filter((t) => t !== undefined),
      );
      const status = form ? best.status : 'review';
      const category = form && status !== 'review' ? form.category : 'other';
      documents.push({
        id: `${file.id}#${String(g + 1)}`,
        fileId: file.id,
        fileName: file.name,
        pages: group.pages.map((i) => pages[i]?.index ?? i),
        formId: form?.id ?? null,
        category,
        confidence: best.confidence,
        status,
        alternatives: best.alternatives,
        fields,
        name: renderName(template, {
          year: fields.taxYear,
          form:
            form?.kind === 'official'
              ? form.displayName.replace(/^Schedule K-1 \(Form (.+)\)$/, 'K-1 ($1)')
              : (form?.displayName ?? 'Document'),
          issuer: fields.issuer,
          client: options.clientName ?? fields.recipientLastName,
        }),
        duplicateOf: null,
        duplicateKind: null,
      });
    });
  }
  return markDuplicates(documents, files);
}
