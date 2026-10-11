/**
 * The hero's sample pile. Every name is invented ("Sample", "Testville",
 * "Northwind") so nothing resembles a real person or institution.
 * 18 files in → 23 documents out: three scans hold more than one document.
 */

export type HeroCategory =
  'wages' | 'interest' | 'retirement' | 'health' | 'education' | 'mortgage' | 'review';

export interface HeroFile {
  messy: string;
  clean: string;
  category: HeroCategory;
  /** Scattered position: percent of the stage, plus rotation in degrees. */
  x: number;
  y: number;
  r: number;
}

export const heroCategories: { id: HeroCategory; label: string }[] = [
  { id: 'wages', label: 'Wages' },
  { id: 'interest', label: 'Interest & Dividends' },
  { id: 'retirement', label: 'Retirement' },
  { id: 'health', label: 'Health' },
  { id: 'education', label: 'Education' },
  { id: 'mortgage', label: 'Mortgage & Property' },
  { id: 'review', label: 'Needs review' },
];

export const heroFiles: HeroFile[] = [
  {
    messy: 'IMG_5678.HEIC',
    clean: '2026 W-2 – Northwind Logistics – Sample',
    category: 'wages',
    x: 4,
    y: 8,
    r: -7,
  },
  {
    messy: 'scan0003.pdf',
    clean: '2026 1099-INT – Sample Credit Union – Sample',
    category: 'interest',
    x: 34,
    y: 4,
    r: 4,
  },
  {
    messy: 'W2 maybe.jpg',
    clean: '2026 W-2 – Testville Unified Schools – Sample',
    category: 'wages',
    x: 63,
    y: 10,
    r: -3,
  },
  {
    messy: 'IMG_5679.HEIC',
    clean: '2026 SSA-1099 – Social Security Admin. – Sample',
    category: 'retirement',
    x: 12,
    y: 27,
    r: 6,
  },
  {
    messy: 'Document (4).pdf',
    clean: '2026 1099-R – Example Retirement Plan – Sample',
    category: 'retirement',
    x: 46,
    y: 22,
    r: -5,
  },
  {
    messy: 'bank thing.png',
    clean: '2026 1099-INT – First Sample Bank – Sample',
    category: 'interest',
    x: 72,
    y: 30,
    r: 8,
  },
  {
    messy: '1099 stuff.pdf',
    clean: '2026 1099-DIV – Sample Brokerage – Sample',
    category: 'interest',
    x: 2,
    y: 46,
    r: -4,
  },
  {
    messy: 'scan0004.pdf',
    clean: '2026 1098 – Testville Home Loans – Sample',
    category: 'mortgage',
    x: 28,
    y: 41,
    r: 3,
  },
  {
    messy: 'tuition.pdf',
    clean: '2026 1098-T – Testville State College – Sample',
    category: 'education',
    x: 56,
    y: 44,
    r: -8,
  },
  {
    messy: 'IMG_5702.HEIC',
    clean: '2026 1095-A – Health Insurance Marketplace – Sample',
    category: 'health',
    x: 74,
    y: 55,
    r: 5,
  },
  {
    messy: 'hsa.pdf',
    clean: '2026 1099-SA – Sample Health Bank – Sample',
    category: 'health',
    x: 8,
    y: 64,
    r: 7,
  },
  {
    messy: 'property tax.jpg',
    clean: '2026 Property tax – Testville County – Sample',
    category: 'mortgage',
    x: 37,
    y: 60,
    r: -6,
  },
  {
    messy: 'scan0007.pdf',
    clean: '2026 1099-DIV – Example Index Funds – Sample',
    category: 'interest',
    x: 60,
    y: 68,
    r: 2,
  },
  {
    messy: 'student loan.png',
    clean: '2026 1098-E – Sample Loan Servicing – Sample',
    category: 'education',
    x: 18,
    y: 82,
    r: -3,
  },
  {
    messy: 'IMG_5710.HEIC',
    clean: '2026 5498 – Example Retirement Plan – Sample',
    category: 'retirement',
    x: 45,
    y: 79,
    r: 6,
  },
  {
    messy: 'Scan 2.pdf',
    clean: 'Unrecognized document – 2 pages',
    category: 'review',
    x: 70,
    y: 84,
    r: -7,
  },
  {
    messy: 'photo.jpg',
    clean: 'Possible 1099-MISC – check the payer',
    category: 'review',
    x: 1,
    y: 90,
    r: 4,
  },
  {
    messy: 'W2 again.jpg',
    clean: 'Duplicate of 2026 W-2 – Northwind Logistics',
    category: 'review',
    x: 30,
    y: 92,
    r: -2,
  },
];

/** The finished binder's bookmark tree (after splitting and review). Counts sum to 23. */
export const binderTree: { label: string; count: number; first: string }[] = [
  { label: 'Wages', count: 2, first: '2026 W-2 – Northwind Logistics' },
  { label: 'Interest & dividends', count: 6, first: '2026 1099-INT – Sample Credit Union' },
  {
    label: 'Retirement & Social Security',
    count: 4,
    first: '2026 SSA-1099 – Social Security Admin.',
  },
  { label: 'Health', count: 3, first: '2026 1095-A – Health Insurance Marketplace' },
  { label: 'Education', count: 2, first: '2026 1098-T – Testville State College' },
  { label: 'Mortgage & property', count: 3, first: '2026 1098 – Testville Home Loans' },
  { label: 'Other', count: 3, first: '2026 1099-MISC – Sample Consulting Co.' },
];

export const binderSummary = '1 binder · 23 documents · 41 pages';
