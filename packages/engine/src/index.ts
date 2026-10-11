export {
  CATEGORY_IDS,
  CatalogError,
  compilePattern,
  parseFormsCatalog,
  type Category,
  type CategoryId,
  type FormDefinition,
  type FormKind,
  type FormsCatalog,
} from './forms.ts';
export {
  checkFormAgainstText,
  extractOmbNumbers,
  type FormCheck,
  type PatternCheck,
} from './verify.ts';
export {
  buildLines,
  maskIdentifiers,
  normalizeText,
  pageText,
  type Line,
  type PageText,
} from './text.ts';
export {
  classifyPage,
  classifyText,
  defaultClassifierConfig,
  scoreForm,
  type ClassifierConfig,
  type FormScore,
} from './classify.ts';
export { extractFields, extractIssuer, extractRecipientLastName, extractYear } from './extract.ts';
export {
  DEFAULT_NAME_TEMPLATE,
  NAME_TOKENS,
  dedupeNames,
  renderName,
  type NameToken,
  type NameValues,
} from './naming.ts';
export { splitPages, type PageGroup } from './split.ts';
export { hammingDistance, markDuplicates, NEAR_DUPLICATE_BITS } from './duplicates.ts';
export { binderSections, type BinderSection } from './order.ts';
export { processFiles, type PipelineOptions } from './pipeline.ts';
export type * from './types.ts';
