import { describe, expect, it } from 'vitest';
import type { FormDefinition, FormsCatalog } from './forms.ts';
import { checkFormAgainstText, extractOmbNumbers, normalizeText } from './verify.ts';

// Synthetic form and text. 0000-0000 is deliberately not a real OMB number.
const form: FormDefinition = {
  id: 'test-form',
  displayName: 'Test Form',
  category: 'other',
  kind: 'official',
  ombNumbers: [],
  titlePatterns: ['Sample\\s+Statement'],
  boxLabelPatterns: ['Box\\s+one\\s+amount', "Payer'?s\\s+code"],
  keywords: [],
  issuerFieldLabels: ["ISSUER'?S\\s+name"],
  yearPatterns: ['(20\\d{2})'],
  filenameHints: [],
  multiPage: false,
  source: 'https://example.invalid/test.pdf',
  verifiedOn: null,
};
const catalog: FormsCatalog = { version: 1, patternFlags: 'iu', categories: [], forms: [form] };

describe('normalizeText', () => {
  it('folds curly quotes, dashes and whitespace', () => {
    expect(normalizeText('Payer’s\n\n code –  OMB')).toBe("Payer's code - OMB");
  });
});

describe('extractOmbNumbers', () => {
  it('reads each distinct OMB number regardless of spacing and dash style', () => {
    expect(
      extractOmbNumbers('OMB No. 0000-0001 ... OMB No.0000 – 0002 ... OMB No. 0000-0001'),
    ).toEqual(['0000-0001', '0000-0002']);
  });

  it('returns nothing when no OMB number is printed', () => {
    expect(extractOmbNumbers('Sample Statement')).toEqual([]);
  });
});

describe('checkFormAgainstText', () => {
  it('verifies when every title, box and issuer pattern matches', () => {
    const result = checkFormAgainstText(
      catalog,
      form,
      'SAMPLE STATEMENT  OMB No. 0000-0000\nBox one amount  Payer’s code  ISSUER’S name',
    );
    expect(result.verified).toBe(true);
    expect(result.ombNumbers).toEqual(['0000-0000']);
  });

  it('reports exactly which patterns are missing', () => {
    const result = checkFormAgainstText(catalog, form, 'Sample Statement Box one amount');
    expect(result.verified).toBe(false);
    expect(result.boxLabels.filter((c) => !c.matched).map((c) => c.pattern)).toEqual([
      "Payer'?s\\s+code",
    ]);
    expect(result.issuerLabels[0]?.matched).toBe(false);
  });
});
