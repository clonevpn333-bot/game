import { describe, expect, it } from 'vitest';
import raw from '../forms.json' with { type: 'json' };
import { CATEGORY_IDS, CatalogError, compilePattern, parseFormsCatalog } from './forms.ts';

const catalog = parseFormsCatalog(raw);
const clone = () => structuredClone(raw) as unknown as { forms: Record<string, unknown>[] };

// BUILD_PROMPT.md §5 "MVP form list".
const MVP_FORMS = [
  'w-2',
  'w-2g',
  '1099-int',
  '1099-oid',
  '1099-div',
  '1099-b',
  '1099-r',
  '1099-nec',
  '1099-misc',
  '1099-k',
  '1099-g',
  '1099-sa',
  '1099-q',
  '1099-s',
  '1099-c',
  'ssa-1099',
  'rrb-1099',
  '1098',
  '1098-t',
  '1098-e',
  '1095-a',
  '1095-b',
  '1095-c',
  '5498',
  '5498-sa',
  'k-1-1065',
  'k-1-1120s',
  'k-1-1041',
  'brokerage-consolidated',
  'property-tax-statement',
];

describe('forms.json', () => {
  it('is a valid catalog', () => {
    expect(catalog.forms.length).toBeGreaterThan(0);
  });

  it('covers exactly the MVP form list', () => {
    expect(catalog.forms.map((f) => f.id).sort()).toEqual([...MVP_FORMS].sort());
  });

  it('lists categories in the default binder order', () => {
    expect(catalog.categories.map((c) => c.id)).toEqual(CATEGORY_IDS);
  });

  it('puts forms in the categories the brief specifies', () => {
    const categoryOf = Object.fromEntries(catalog.forms.map((f) => [f.id, f.category]));
    expect(categoryOf).toMatchObject({
      'w-2': 'wages',
      'w-2g': 'wages',
      '1099-oid': 'interest-dividends',
      'brokerage-consolidated': 'brokerage',
      '5498': 'retirement',
      'rrb-1099': 'retirement',
      '1099-k': 'self-employment',
      '5498-sa': 'health',
      '1099-q': 'education',
      '1099-s': 'mortgage-property',
      'property-tax-statement': 'mortgage-property',
      'k-1-1041': 'pass-through',
      '1099-c': 'debt-other',
    });
  });

  it('never carries an OMB number that was not verified against a source', () => {
    for (const form of catalog.forms) {
      if (form.ombNumbers.length > 0) {
        expect(form.verifiedOn, form.id).not.toBeNull();
        expect(form.source, form.id).not.toBeNull();
      }
    }
  });

  it('has year patterns that capture the year from realistic header text', () => {
    const w2 = catalog.forms.find((f) => f.id === 'w-2');
    const text = 'Form W-2 Wage and Tax Statement 2026 Copy B';
    const years = (w2?.yearPatterns ?? [])
      .map((p) => compilePattern(catalog, p).exec(text)?.[1])
      .filter(Boolean);
    expect(years).toContain('2026');
  });

  it('routes filename hints to the right form', () => {
    const match = (name: string) =>
      catalog.forms
        .filter((f) => f.filenameHints.some((h) => compilePattern(catalog, h).test(name)))
        .map((f) => f.id);
    expect(match('W2 maybe.jpg')).toEqual(['w-2']);
    expect(match('w2g casino.pdf')).toEqual(['w-2g']);
    expect(match('1099 int chase.pdf')).toEqual(['1099-int']);
    expect(match('1098-T state univ.pdf')).toEqual(['1098-t']);
    expect(match('1098 mortgage.pdf')).toEqual(['1098']);
    expect(match('5498-SA.pdf')).toEqual(['5498-sa']);
    expect(match('IMG_5678.HEIC')).toEqual([]);
  });
});

describe('parseFormsCatalog', () => {
  it('rejects an OMB number without a verification date', () => {
    const bad = clone();
    const first = bad.forms[0];
    if (first) first.ombNumbers = ['1545-0000'];
    expect(() => parseFormsCatalog(bad)).toThrow(/OMB numbers must come from forms:verify/);
  });

  it('rejects an invalid regex and reports every problem at once', () => {
    const bad = clone();
    const [a, b] = bad.forms;
    if (a) a.titlePatterns = ['(unclosed'];
    if (b) b.category = 'nowhere';
    try {
      parseFormsCatalog(bad);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CatalogError);
      expect((error as CatalogError).problems).toHaveLength(2);
    }
  });

  it('rejects a year pattern without a capture group', () => {
    const bad = clone();
    const first = bad.forms[0];
    if (first) first.yearPatterns = ['calendar year 20\\d{2}'];
    expect(() => parseFormsCatalog(bad)).toThrow(/capture the year/);
  });

  it('rejects an OMB number on a heuristic type', () => {
    const bad = clone();
    const heuristic = bad.forms.find((f) => f.kind === 'heuristic');
    if (heuristic) {
      heuristic.ombNumbers = ['1545-0000'];
      heuristic.verifiedOn = '2026-01-01';
    }
    expect(() => parseFormsCatalog(bad)).toThrow(/heuristic types cannot have OMB numbers/);
  });
});
