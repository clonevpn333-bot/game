/**
 * Invented names and clearly invalid identifiers. Never real taxpayer data.
 * Identifiers use all-zero patterns (000-00-0000, 00-0000000) per the brief.
 */
export const clients = [
  { first: 'Jane', last: 'Sample' },
  { first: 'John', last: 'Example' },
  { first: 'Maria', last: 'Testcase' },
  { first: 'Sam', last: 'Placeholder' },
  { first: 'Avery', last: 'Fakename' },
  { first: 'Lee', last: 'Demo-Smith' },
] as const;

export const issuers = {
  employer: [
    'Northwind Logistics LLC',
    'Testville Unified Schools',
    'Sample Manufacturing Co.',
    'Example Health Partners Inc.',
    'Fabrikam Test Labs LLC',
  ],
  bank: [
    'Sample Credit Union',
    'First Sample Bank, N.A.',
    'Testville Savings',
    'Example Federal Savings',
  ],
  brokerage: ['Sample Brokerage', 'Example Index Funds', 'Testville Securities LLC'],
  retirement: ['Example Retirement Plan', 'Sample Pension Trust', 'Testville 401(k) Plan'],
  lender: ['Testville Home Loans', 'Sample Mortgage Co.', 'Example Bank Mortgage'],
  school: ['Testville State College', 'Sample University'],
  loanServicer: ['Sample Loan Servicing', 'Example Student Aid Inc.'],
  health: ['Sample Health Bank', 'Example HSA Trust Co.'],
  insurer: ['Sample Health Plan Inc.', 'Example Insurance Co.'],
  government: ['Testville State Department of Revenue', 'Sample State Employment Agency'],
  casino: ['Testville Casino & Resort'],
  payments: ['Sample Payments Inc.', 'Example Marketplace LLC'],
  client: ['Sample Consulting Co.', 'Example Design Studio LLC'],
  partnership: ['Sample Real Estate Partners LP', 'Example Ventures LLC'],
  scorp: ['Sample Holdings Inc.'],
  trust: ['Sample Family Trust'],
  county: ['Testville County', 'Example County'],
  edu529: ['Sample 529 College Savings Plan'],
  closing: ['Testville Title & Escrow LLC'],
  creditor: ['Sample Card Services', 'Example Auto Finance'],
  marketplace: ['Health Insurance Marketplace'],
} as const;

export const ADDRESS_LINES = ['123 Sample St', 'Testville, ST 00000'] as const;
export const ISSUER_ADDRESS = ['456 Example Ave, Suite 100', 'Sampletown, ST 00000'] as const;
export const SSN = '000-00-0000';
export const MASKED_SSN = 'XXX-XX-0000';
export const EIN = '00-0000000';

export function amount(rng: { next(): number }, max = 90000): string {
  const value = Math.round(rng.next() * max * 100) / 100;
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
