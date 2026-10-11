import type { DocumentResult } from '@binderready/engine';
import { describe, expect, it } from 'vitest';
import { describeItem, indexItems, missingItems, missingListText } from './missing';
import { toReviewDocs } from './review';

const doc = (formId: string, issuer: string | null, over: Partial<DocumentResult> = {}) =>
  ({
    id: `${formId}-${issuer ?? 'x'}`,
    fileId: 'f',
    fileName: 'f.pdf',
    pages: [0],
    formId,
    category: 'wages',
    confidence: 0.95,
    status: 'auto',
    alternatives: [],
    fields: { taxYear: 2025, issuer, recipientLastName: 'Sample' },
    name: '',
    duplicateOf: null,
    duplicateKind: null,
    ...over,
  }) satisfies DocumentResult;

const last = [
  { formType: 'w-2', issuerName: 'Northwind Logistics LLC' },
  { formType: 'w-2', issuerName: 'Testville Unified Schools' },
  { formType: '1099-int', issuerName: 'First Sample Bank, N.A.' },
  { formType: 'k-1-1065', issuerName: 'Sample Real Estate Partners LP' },
  { formType: 'brokerage-consolidated', issuerName: '' },
];

describe('missing documents', () => {
  it('lists last year’s documents that have not arrived', () => {
    const now = toReviewDocs([
      doc('w-2', 'NORTHWIND LOGISTICS LLC'),
      doc('1099-int', 'First Sample Bank NA'),
      doc('brokerage-consolidated', 'Testville Securities LLC'),
      doc('1099-nec', 'Example Design Studio LLC'),
    ]);
    expect(missingItems(last, now, []).map(describeItem)).toEqual([
      'Form W-2 from Testville Unified Schools',
      'Schedule K-1 (Form 1065) from Sample Real Estate Partners LP',
    ]);
  });

  it('lets one unreadable issuer match only one document', () => {
    const now = toReviewDocs([doc('w-2', null)]);
    const missing = missingItems(last.slice(0, 2), now, []);
    expect(missing).toHaveLength(1);
  });

  it('ignores removed duplicates and marks dismissed items', () => {
    const now = toReviewDocs([doc('w-2', 'Northwind Logistics LLC', { duplicateOf: 'x' })]);
    const missing = missingItems(last.slice(0, 1), now, [
      last[0] ?? { formType: '', issuerName: '' },
    ]);
    expect(missing).toEqual([{ ...last[0], dismissed: true }]);
  });

  it('stores only form type and issuer, once each', () => {
    const items = indexItems(toReviewDocs([doc('w-2', 'A'), doc('w-2', 'a'), doc('1098', null)]));
    expect(items).toEqual([
      { formType: 'w-2', issuerName: 'A' },
      { formType: '1098', issuerName: '' },
    ]);
  });

  it('writes a friendly list without dismissed items', () => {
    const text = missingListText({
      clientName: 'Jane Sample',
      taxYear: 2025,
      previousYear: 2024,
      firmName: 'Example Tax Co.',
      items: [
        { formType: 'w-2', issuerName: 'Testville Unified Schools', dismissed: false },
        { formType: '1099-int', issuerName: '', dismissed: true },
      ],
    });
    expect(text).toBe(
      [
        'Hi Jane,',
        '',
        'Thanks for sending your 2025 tax documents. Compared with what you sent for 2024, we haven’t received these yet:',
        '',
        '- Form W-2 from Testville Unified Schools',
        '',
        'If one of these doesn’t apply this year, just let us know and we’ll take it off the list.',
        '',
        'Thank you,',
        'Example Tax Co.',
      ].join('\n'),
    );
  });
});
