/**
 * Synthetic layouts for every MVP form type.
 *
 * These are approximations written as printed form text, independently of the
 * classifier's regexes in forms.json. They let the pipeline be developed and
 * regression-tested end to end, but accuracy on them is NOT evidence of
 * accuracy on real documents: that needs the official PDFs (generate --irs-dir).
 */
import { ADDRESS_LINES, EIN, ISSUER_ADDRESS, MASKED_SSN, SSN, amount, issuers } from './fake.ts';
import type { Random } from './random.ts';

/** Text placed on a page. Coordinates are page fractions from the top-left. */
export interface Block {
  text: string;
  x: number;
  y: number;
  size: number;
  bold?: boolean;
  mono?: boolean;
}

export interface DocValues {
  year: number;
  issuer: string;
  recipientFirst: string;
  recipientLast: string;
}

export interface Rendered {
  /** One array of blocks per page. */
  pages: Block[][];
  /** Ground-truth issuer as the naming step should produce it. */
  issuer: string;
}

export interface FormTemplate {
  formId: string;
  issuerPool: readonly string[];
  render: (
    v: DocValues,
    rng: Random,
    options: { copy?: string; instructions?: boolean },
  ) => Rendered;
}

const recipientName = (v: DocValues) => `${v.recipientFirst} ${v.recipientLast}`.toUpperCase();

/** Box grid: label above value, two columns. */
function boxes(labels: string[], x0: number, y0: number, rng: Random, colWidth = 0.22): Block[] {
  const out: Block[] = [];
  labels.forEach((label, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = x0 + col * colWidth;
    const y = y0 + row * 0.075;
    out.push({ text: label, x, y, size: 6.5 });
    out.push({ text: `$ ${amount(rng, 40000)}`, x: x + 0.01, y: y + 0.03, size: 9, mono: true });
  });
  return out;
}

function issuerBlock(label: string, name: string, x: number, y: number): Block[] {
  return [
    { text: label, x, y, size: 6.5 },
    { text: name.toUpperCase(), x, y: y + 0.03, size: 9, mono: true },
    { text: ISSUER_ADDRESS[0].toUpperCase(), x, y: y + 0.045, size: 9, mono: true },
    { text: ISSUER_ADDRESS[1].toUpperCase(), x, y: y + 0.06, size: 9, mono: true },
  ];
}

function recipientBlock(
  label: string,
  v: DocValues,
  x: number,
  y: number,
  tinLabel: string,
): Block[] {
  return [
    { text: tinLabel, x, y: y - 0.05, size: 6.5 },
    { text: MASKED_SSN, x, y: y - 0.025, size: 9, mono: true },
    { text: label, x, y, size: 6.5 },
    { text: recipientName(v), x, y: y + 0.025, size: 9, mono: true },
    { text: 'Street address (including apt. no.)', x, y: y + 0.05, size: 6.5 },
    { text: ADDRESS_LINES[0].toUpperCase(), x, y: y + 0.07, size: 9, mono: true },
    {
      text: 'City or town, state or province, country, and ZIP or foreign postal code',
      x,
      y: y + 0.095,
      size: 6.5,
    },
    { text: ADDRESS_LINES[1].toUpperCase(), x, y: y + 0.115, size: 9, mono: true },
  ];
}

interface InfoReturnSpec {
  formId: string;
  designation: string;
  title: string[];
  issuerLabel: string;
  issuerPool: readonly string[];
  recipientLabel: string;
  issuerTin?: string;
  recipientTin?: string;
  boxLabels: string[];
  copy: string;
  instructionsTitle: string;
  instructionsBody: string[];
}

/** The common "1099 family" layout: issuer and recipient on the left, boxes and title on the right. */
function infoReturn(spec: InfoReturnSpec): FormTemplate {
  return {
    formId: spec.formId,
    issuerPool: spec.issuerPool,
    render(v, rng, { copy, instructions }) {
      const j = () => rng.jitter(0.008);
      const page: Block[] = [
        { text: 'CORRECTED (if checked)', x: 0.42 + j(), y: 0.03, size: 6.5 },
        ...issuerBlock(spec.issuerLabel, v.issuer, 0.05 + j(), 0.06 + j()),
        { text: spec.issuerTin ?? "PAYER'S TIN", x: 0.05, y: 0.2, size: 6.5 },
        { text: EIN, x: 0.05, y: 0.22, size: 9, mono: true },
        ...recipientBlock(
          spec.recipientLabel,
          v,
          0.05,
          0.31,
          spec.recipientTin ?? "RECIPIENT'S TIN",
        ),
        ...boxes(spec.boxLabels, 0.36 + j(), 0.2 + j(), rng),
        { text: `Form ${spec.designation}`, x: 0.8, y: 0.07, size: 10, bold: true },
        ...spec.title.map((line, i) => ({
          text: line,
          x: 0.8,
          y: 0.1 + i * 0.018,
          size: 9,
          bold: true,
        })),
        { text: `For calendar year ${String(v.year)}`, x: 0.8, y: 0.06 + 0.12, size: 7 },
        { text: copy ?? spec.copy, x: 0.8, y: 0.24, size: 7, bold: true },
        {
          text: 'This is important tax information and is being furnished to the IRS.',
          x: 0.8,
          y: 0.27,
          size: 5.5,
        },
        { text: `Form ${spec.designation} (keep for your records)`, x: 0.05, y: 0.62, size: 7 },
        {
          text: 'Department of the Treasury - Internal Revenue Service',
          x: 0.55,
          y: 0.62,
          size: 7,
        },
      ];
      const pages = [page];
      if (instructions) {
        pages.push([
          { text: spec.instructionsTitle, x: 0.05, y: 0.05, size: 11, bold: true },
          ...spec.instructionsBody.map((t, i) => ({
            text: t,
            x: 0.05,
            y: 0.09 + i * 0.03,
            size: 8,
          })),
          { text: `Form ${spec.designation} (keep for your records)`, x: 0.05, y: 0.93, size: 7 },
        ]);
      }
      return { pages, issuer: v.issuer };
    },
  };
}

const RECIPIENT_INSTRUCTIONS = [
  "Recipient's taxpayer identification number (TIN). For your protection, this form may show only the last four digits of your TIN.",
  'Account number. May show an account or other unique number the payer assigned to distinguish your account.',
  'Future developments. For the latest information about developments related to this form, go to the IRS website.',
];

const infoReturns: FormTemplate[] = [
  infoReturn({
    formId: '1099-int',
    designation: '1099-INT',
    title: ['Interest Income'],
    issuerLabel:
      "PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.",
    issuerPool: issuers.bank,
    recipientLabel: "RECIPIENT'S name",
    boxLabels: [
      '1 Interest income',
      '2 Early withdrawal penalty',
      '3 Interest on U.S. Savings Bonds and Treasury obligations',
      '4 Federal income tax withheld',
      '5 Investment expenses',
      '6 Foreign tax paid',
      '8 Tax-exempt interest',
      '9 Specified private activity bond interest',
      '10 Market discount',
      '11 Bond premium',
    ],
    copy: 'Copy B For Recipient',
    instructionsTitle: 'Instructions for Recipient',
    instructionsBody: [
      ...RECIPIENT_INSTRUCTIONS,
      'Box 1. Shows taxable interest paid to you during the calendar year by the payer.',
    ],
  }),
  infoReturn({
    formId: '1099-oid',
    designation: '1099-OID',
    title: ['Original Issue', 'Discount'],
    issuerLabel:
      "PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.",
    issuerPool: issuers.brokerage,
    recipientLabel: "RECIPIENT'S name",
    boxLabels: [
      '1 Original issue discount for the year',
      '2 Other periodic interest',
      '3 Early withdrawal penalty',
      '4 Federal income tax withheld',
      '5 Market discount',
      '6 Acquisition premium',
      '8 Original issue discount on U.S. Treasury obligations',
      '10 Bond premium',
    ],
    copy: 'Copy B For Recipient',
    instructionsTitle: 'Instructions for Recipient',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
  infoReturn({
    formId: '1099-div',
    designation: '1099-DIV',
    title: ['Dividends and', 'Distributions'],
    issuerLabel:
      "PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.",
    issuerPool: issuers.brokerage,
    recipientLabel: "RECIPIENT'S name",
    boxLabels: [
      '1a Total ordinary dividends',
      '1b Qualified dividends',
      '2a Total capital gain distr.',
      '2b Unrecap. Sec. 1250 gain',
      '3 Nondividend distributions',
      '4 Federal income tax withheld',
      '5 Section 199A dividends',
      '7 Foreign tax paid',
      '12 Exempt-interest dividends',
    ],
    copy: 'Copy B For Recipient',
    instructionsTitle: 'Instructions for Recipient',
    instructionsBody: [
      ...RECIPIENT_INSTRUCTIONS,
      'Box 1a. Shows total ordinary dividends that are taxable.',
    ],
  }),
  infoReturn({
    formId: '1099-b',
    designation: '1099-B',
    title: ['Proceeds From', 'Broker and', 'Barter Exchange', 'Transactions'],
    issuerLabel:
      "PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.",
    issuerPool: issuers.brokerage,
    recipientLabel: "RECIPIENT'S name",
    boxLabels: [
      '1a Description of property',
      '1b Date acquired',
      '1c Date sold or disposed',
      '1d Proceeds',
      '1e Cost or other basis',
      '1g Wash sale loss disallowed',
      '2 Short-term gain or loss',
      '4 Federal income tax withheld',
      'Applicable checkbox on Form 8949',
    ],
    copy: 'Copy B For Recipient',
    instructionsTitle: 'Instructions for Recipient',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
  infoReturn({
    formId: '1099-r',
    designation: '1099-R',
    title: [
      'Distributions From',
      'Pensions, Annuities,',
      'Retirement or',
      'Profit-Sharing',
      'Plans, IRAs,',
      'Insurance',
      'Contracts, etc.',
    ],
    issuerLabel:
      "PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code",
    issuerPool: issuers.retirement,
    recipientLabel: "RECIPIENT'S name",
    boxLabels: [
      '1 Gross distribution',
      '2a Taxable amount',
      '2b Taxable amount not determined',
      '4 Federal income tax withheld',
      '5 Employee contributions/Designated Roth contributions or insurance premiums',
      '7 Distribution code(s)',
      'IRA/ SEP/ SIMPLE',
      '9a Your percentage of total distribution',
    ],
    copy: 'Copy B Report this income on your federal tax return.',
    instructionsTitle: 'Instructions for Recipient',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
  infoReturn({
    formId: '1099-nec',
    designation: '1099-NEC',
    title: ['Nonemployee', 'Compensation'],
    issuerLabel:
      "PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.",
    issuerPool: issuers.client,
    recipientLabel: "RECIPIENT'S name",
    boxLabels: [
      '1 Nonemployee compensation',
      '2 Payer made direct sales totaling $5,000 or more of consumer products to recipient for resale',
      '4 Federal income tax withheld',
      '5 State tax withheld',
      "6 State/Payer's state no.",
      '7 State income',
    ],
    copy: 'Copy B For Recipient',
    instructionsTitle: 'Instructions for Recipient',
    instructionsBody: [...RECIPIENT_INSTRUCTIONS, 'Box 1. Shows nonemployee compensation.'],
  }),
  infoReturn({
    formId: '1099-misc',
    designation: '1099-MISC',
    title: ['Miscellaneous', 'Information'],
    issuerLabel:
      "PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.",
    issuerPool: issuers.client,
    recipientLabel: "RECIPIENT'S name",
    boxLabels: [
      '1 Rents',
      '2 Royalties',
      '3 Other income',
      '4 Federal income tax withheld',
      '5 Fishing boat proceeds',
      '6 Medical and health care payments',
      '9 Crop insurance proceeds',
      '10 Gross proceeds paid to an attorney',
    ],
    copy: 'Copy B For Recipient',
    instructionsTitle: 'Instructions for Recipient',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
  infoReturn({
    formId: '1099-k',
    designation: '1099-K',
    title: ['Payment Card and', 'Third Party', 'Network', 'Transactions'],
    issuerLabel:
      "FILER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.",
    issuerPool: issuers.payments,
    recipientLabel: "PAYEE'S name",
    issuerTin: "FILER'S TIN",
    recipientTin: "PAYEE'S TIN",
    boxLabels: [
      '1a Gross amount of payment card/third party network transactions',
      '1b Card Not Present transactions',
      '2 Merchant category code',
      '3 Number of payment transactions',
      '4 Federal income tax withheld',
      '5a January',
      '5b February',
      "PSE'S name and telephone number",
    ],
    copy: 'Copy B For Payee',
    instructionsTitle: 'Instructions for Payee',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
  infoReturn({
    formId: '1099-g',
    designation: '1099-G',
    title: ['Certain', 'Government', 'Payments'],
    issuerLabel:
      "PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.",
    issuerPool: issuers.government,
    recipientLabel: "RECIPIENT'S name",
    boxLabels: [
      '1 Unemployment compensation',
      '2 State or local income tax refunds, credits, or offsets',
      '4 Federal income tax withheld',
      '5 RTAA payments',
      '6 Taxable grants',
      '7 Agriculture payments',
    ],
    copy: 'Copy B For Recipient',
    instructionsTitle: 'Instructions for Recipient',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
  infoReturn({
    formId: '1099-sa',
    designation: '1099-SA',
    title: ['Distributions', 'From an HSA,', 'Archer MSA, or', 'Medicare Advantage', 'MSA'],
    issuerLabel:
      "TRUSTEE'S/PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.",
    issuerPool: issuers.health,
    recipientLabel: "RECIPIENT'S name",
    issuerTin: "PAYER'S TIN",
    boxLabels: [
      '1 Gross distribution',
      '2 Earnings on excess cont.',
      '3 Distribution code',
      '4 FMV on date of death',
      '5 HSA Archer MSA MA MSA',
    ],
    copy: 'Copy B For Recipient',
    instructionsTitle: 'Instructions for Recipient',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
  infoReturn({
    formId: '1099-q',
    designation: '1099-Q',
    title: ['Payments From', 'Qualified', 'Education Programs', '(Under Sections', '529 and 530)'],
    issuerLabel:
      "PAYER'S/TRUSTEE'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.",
    issuerPool: issuers.edu529,
    recipientLabel: "RECIPIENT'S name",
    boxLabels: [
      '1 Gross distribution',
      '2 Earnings',
      '3 Basis',
      '4 Trustee-to-trustee transfer',
      '5 Check one: Qualified tuition program— Private or State',
      'Coverdell ESA',
    ],
    copy: 'Copy B For Recipient',
    instructionsTitle: 'Instructions for Recipient',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
  infoReturn({
    formId: '1099-s',
    designation: '1099-S',
    title: ['Proceeds From Real', 'Estate Transactions'],
    issuerLabel:
      "FILER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.",
    issuerPool: issuers.closing,
    recipientLabel: "TRANSFEROR'S name",
    issuerTin: "FILER'S TIN",
    recipientTin: "TRANSFEROR'S TIN",
    boxLabels: [
      '1 Date of closing',
      '2 Gross proceeds',
      '3 Address, including city, state, and ZIP code, or legal description',
      "5 Buyer's part of real estate tax",
    ],
    copy: 'Copy B For Transferor',
    instructionsTitle: 'Instructions for Transferor',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
  infoReturn({
    formId: '1099-c',
    designation: '1099-C',
    title: ['Cancellation', 'of Debt'],
    issuerLabel:
      "CREDITOR'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.",
    issuerPool: issuers.creditor,
    recipientLabel: "DEBTOR'S name",
    issuerTin: "CREDITOR'S TIN",
    recipientTin: "DEBTOR'S TIN",
    boxLabels: [
      '1 Date of identifiable event',
      '2 Amount of debt discharged',
      '3 Interest, if included in box 2',
      '4 Debt description',
      '6 Identifiable event code',
      '7 Fair market value of property',
    ],
    copy: 'Copy B For Debtor',
    instructionsTitle: 'Instructions for Debtor',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
  infoReturn({
    formId: '1098',
    designation: '1098',
    title: ['Mortgage', 'Interest', 'Statement'],
    issuerLabel:
      "RECIPIENT'S/LENDER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.",
    issuerPool: issuers.lender,
    recipientLabel: "PAYER'S/BORROWER'S name",
    issuerTin: "RECIPIENT'S TIN",
    recipientTin: "PAYER'S/BORROWER'S TIN",
    boxLabels: [
      '1 Mortgage interest received from payer(s)/borrower(s)',
      '2 Outstanding mortgage principal',
      '3 Mortgage origination date',
      '4 Refund of overpaid interest',
      '5 Mortgage insurance premiums',
      '6 Points paid on purchase of principal residence',
    ],
    copy: 'Copy B For Payer/Borrower',
    instructionsTitle: 'Instructions for Payer/Borrower',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
  infoReturn({
    formId: '1098-t',
    designation: '1098-T',
    title: ['Tuition', 'Statement'],
    issuerLabel:
      "FILER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone number",
    issuerPool: issuers.school,
    recipientLabel: "STUDENT'S name",
    issuerTin: "FILER'S employer identification no.",
    recipientTin: "STUDENT'S TIN",
    boxLabels: [
      '1 Payments received for qualified tuition and related expenses',
      '4 Adjustments made for a prior year',
      '5 Scholarships or grants',
      '6 Adjustments to scholarships or grants for a prior year',
      '8 Check if at least half-time student',
      '9 Check if a graduate student',
    ],
    copy: 'Copy B For Student',
    instructionsTitle: 'Instructions for Student',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
  infoReturn({
    formId: '1098-e',
    designation: '1098-E',
    title: ['Student Loan', 'Interest', 'Statement'],
    issuerLabel:
      "RECIPIENT'S/LENDER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone number",
    issuerPool: issuers.loanServicer,
    recipientLabel: "BORROWER'S name",
    issuerTin: "RECIPIENT'S TIN",
    recipientTin: "BORROWER'S TIN",
    boxLabels: [
      '1 Student loan interest received by lender',
      '2 If checked, box 1 does not include loan origination fees and/or capitalized interest',
    ],
    copy: 'Copy B For Borrower',
    instructionsTitle: 'Instructions for Borrower',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
  infoReturn({
    formId: '5498',
    designation: '5498',
    title: ['IRA', 'Contribution', 'Information'],
    issuerLabel:
      "TRUSTEE'S or ISSUER'S name, street address, city or town, state or province, country, and ZIP or foreign postal code",
    issuerPool: issuers.retirement,
    recipientLabel: "PARTICIPANT'S name",
    issuerTin: "TRUSTEE'S or ISSUER'S TIN",
    recipientTin: "PARTICIPANT'S TIN",
    boxLabels: [
      '1 IRA contributions (other than amounts in boxes 2–4, 8–10, 13a, 14a, and 15a)',
      '2 Rollover contributions',
      '3 Roth IRA conversion amount',
      '5 Fair market value of account',
      '11 Check if RMD for next year',
      '12b RMD amount',
    ],
    copy: 'Copy B For Participant',
    instructionsTitle: 'Instructions for Participant',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
  infoReturn({
    formId: '5498-sa',
    designation: '5498-SA',
    title: ['HSA, Archer MSA,', 'or Medicare', 'Advantage MSA', 'Information'],
    issuerLabel:
      "TRUSTEE'S name, street address, city or town, state or province, country, and ZIP or foreign postal code",
    issuerPool: issuers.health,
    recipientLabel: "PARTICIPANT'S name",
    issuerTin: "TRUSTEE'S TIN",
    recipientTin: "PARTICIPANT'S TIN",
    boxLabels: [
      "1 Employee or self-employed person's Archer MSA contributions",
      '2 Total contributions made in the year',
      '3 Total HSA or Archer MSA contributions made for the prior year',
      '4 Rollover contributions',
      '5 Fair market value of HSA, Archer MSA, or MA MSA',
    ],
    copy: 'Copy B For Participant',
    instructionsTitle: 'Instructions for Participant',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
  infoReturn({
    formId: 'w-2g',
    designation: 'W-2G',
    title: ['Certain', 'Gambling', 'Winnings'],
    issuerLabel:
      "PAYER'S name, street address, city or town, province or state, country, and ZIP or foreign postal code",
    issuerPool: issuers.casino,
    recipientLabel: "WINNER'S name",
    issuerTin: "PAYER'S federal identification number",
    recipientTin: "WINNER'S taxpayer identification no.",
    boxLabels: [
      '1 Reportable winnings',
      '2 Date won',
      '3 Type of wager',
      '4 Federal income tax withheld',
      '5 Transaction',
      '6 Race',
      '7 Winnings from identical wagers',
      '8 Cashier',
      '10 Window',
    ],
    copy: 'Copy B Report this income on your federal tax return.',
    instructionsTitle: 'Information to Winner',
    instructionsBody: RECIPIENT_INSTRUCTIONS,
  }),
];

/** W-2: title and year print at the bottom; one copy per page, or four copies on one page. */
function w2Copy(v: DocValues, rng: Random, copy: string, top: number, scale: number): Block[] {
  const y = (f: number) => top + f * scale;
  const s = (n: number) => n * Math.max(scale, 0.6);
  return [
    { text: "a Employee's social security number", x: 0.3, y: y(0.02), size: s(6.5) },
    { text: SSN, x: 0.31, y: y(0.05), size: s(9), mono: true },
    { text: 'b Employer identification number (EIN)', x: 0.05, y: y(0.1), size: s(6.5) },
    { text: EIN, x: 0.06, y: y(0.13), size: s(9), mono: true },
    { text: "c Employer's name, address, and ZIP code", x: 0.05, y: y(0.17), size: s(6.5) },
    { text: v.issuer.toUpperCase(), x: 0.06, y: y(0.2), size: s(9), mono: true },
    { text: ISSUER_ADDRESS[0].toUpperCase(), x: 0.06, y: y(0.225), size: s(9), mono: true },
    { text: ISSUER_ADDRESS[1].toUpperCase(), x: 0.06, y: y(0.25), size: s(9), mono: true },
    { text: 'd Control number', x: 0.05, y: y(0.3), size: s(6.5) },
    { text: "e Employee's first name and initial", x: 0.05, y: y(0.36), size: s(6.5) },
    { text: 'Last name', x: 0.25, y: y(0.36), size: s(6.5) },
    { text: 'Suff.', x: 0.42, y: y(0.36), size: s(6.5) },
    {
      text: `${v.recipientFirst.toUpperCase()} ${v.recipientLast.toUpperCase()}`,
      x: 0.06,
      y: y(0.39),
      size: s(9),
      mono: true,
    },
    { text: "f Employee's address and ZIP code", x: 0.05, y: y(0.47), size: s(6.5) },
    ...boxes(
      [
        '1 Wages, tips, other compensation',
        '2 Federal income tax withheld',
        '3 Social security wages',
        '4 Social security tax withheld',
        '5 Medicare wages and tips',
        '6 Medicare tax withheld',
        '7 Social security tips',
        '8 Allocated tips',
      ],
      0.52,
      y(0.1),
      rng,
      0.22,
    ).map((b) => ({ ...b, y: top + (b.y - top) * scale, size: s(b.size) })),
    { text: '15 State', x: 0.05, y: y(0.55), size: s(6.5) },
    { text: "Employer's state ID number", x: 0.12, y: y(0.55), size: s(6.5) },
    { text: '16 State wages, tips, etc.', x: 0.4, y: y(0.55), size: s(6.5) },
    { text: 'Form W-2 Wage and Tax Statement', x: 0.05, y: y(0.66), size: s(11), bold: true },
    { text: String(v.year), x: 0.5, y: y(0.655), size: s(20), bold: true },
    {
      text: 'Department of the Treasury—Internal Revenue Service',
      x: 0.62,
      y: y(0.67),
      size: s(6.5),
    },
    { text: copy, x: 0.05, y: y(0.7), size: s(7), bold: true },
  ];
}

const w2: FormTemplate = {
  formId: 'w-2',
  issuerPool: issuers.employer,
  render(v, rng, { copy, instructions }) {
    const pages: Block[][] = [];
    if (copy === '4-up') {
      // One printed sheet with Copies B, C and 2, as employers often hand them out.
      const copies = [
        "Copy B—To Be Filed With Employee's FEDERAL Tax Return.",
        'Copy C—For EMPLOYEE’S RECORDS',
        'Copy 2—To Be Filed With Employee’s State, City, or Local Income Tax Return.',
      ];
      pages.push(copies.flatMap((c, i) => w2Copy(v, rng, c, 0.02 + i * 0.32, 0.42)));
    } else {
      pages.push(
        w2Copy(v, rng, copy ?? "Copy B—To Be Filed With Employee's FEDERAL Tax Return.", 0.05, 1),
      );
    }
    if (instructions) {
      pages.push([
        { text: 'Notice to Employee', x: 0.05, y: 0.05, size: 11, bold: true },
        {
          text: 'Do you have to file? Refer to the Instructions for Forms 1040 and 1040-SR to determine if you are required to file a tax return.',
          x: 0.05,
          y: 0.09,
          size: 8,
        },
        {
          text: 'Earned income credit (EIC). You may be able to take the EIC for this year if your adjusted gross income is less than a certain amount.',
          x: 0.05,
          y: 0.12,
          size: 8,
        },
        {
          text: 'Clergy and religious workers. If you aren’t subject to social security and Medicare taxes, see Pub. 517.',
          x: 0.05,
          y: 0.15,
          size: 8,
        },
      ]);
    }
    return { pages, issuer: v.issuer };
  },
};

const ssa1099: FormTemplate = {
  formId: 'ssa-1099',
  issuerPool: ['Social Security Administration'],
  render(v, rng) {
    return {
      issuer: 'Social Security Administration',
      pages: [
        [
          {
            text: `FORM SSA-1099 – SOCIAL SECURITY BENEFIT STATEMENT`,
            x: 0.05,
            y: 0.05,
            size: 11,
            bold: true,
          },
          { text: String(v.year), x: 0.85, y: 0.05, size: 16, bold: true },
          {
            text: 'PART OF YOUR SOCIAL SECURITY BENEFITS SHOWN IN BOX 5 MAY BE TAXABLE INCOME.',
            x: 0.05,
            y: 0.09,
            size: 7,
          },
          { text: 'SEE THE REVERSE FOR MORE INFORMATION.', x: 0.05, y: 0.105, size: 7 },
          { text: 'Box 1. Name', x: 0.05, y: 0.15, size: 7 },
          { text: recipientName(v), x: 0.05, y: 0.17, size: 9, mono: true },
          { text: "Box 2. Beneficiary's Social Security Number", x: 0.55, y: 0.15, size: 7 },
          { text: SSN, x: 0.55, y: 0.17, size: 9, mono: true },
          { text: `Box 3. Benefits Paid in ${String(v.year)}`, x: 0.05, y: 0.22, size: 7 },
          { text: `$ ${amount(rng, 30000)}`, x: 0.05, y: 0.24, size: 9, mono: true },
          { text: `Box 4. Benefits Repaid to SSA in ${String(v.year)}`, x: 0.35, y: 0.22, size: 7 },
          {
            text: `Box 5. Net Benefits for ${String(v.year)} (Box 3 minus Box 4)`,
            x: 0.65,
            y: 0.22,
            size: 7,
          },
          { text: `$ ${amount(rng, 30000)}`, x: 0.65, y: 0.24, size: 9, mono: true },
          { text: 'DESCRIPTION OF AMOUNT IN BOX 3', x: 0.05, y: 0.3, size: 7, bold: true },
          { text: 'DESCRIPTION OF AMOUNT IN BOX 4', x: 0.55, y: 0.3, size: 7, bold: true },
          { text: 'Box 6. Voluntary Federal Income Tax Withheld', x: 0.05, y: 0.45, size: 7 },
          { text: 'Box 7. Address', x: 0.05, y: 0.5, size: 7 },
          { text: ADDRESS_LINES.join(', ').toUpperCase(), x: 0.05, y: 0.52, size: 9, mono: true },
          {
            text: 'Box 8. Claim Number (Use this number if you need to contact SSA.)',
            x: 0.05,
            y: 0.57,
            size: 7,
          },
          { text: 'Form SSA-1099-SM', x: 0.05, y: 0.62, size: 7 },
          { text: 'DO NOT RETURN THIS FORM TO SSA OR IRS', x: 0.6, y: 0.62, size: 7, bold: true },
        ],
      ],
    };
  },
};

const rrb1099: FormTemplate = {
  formId: 'rrb-1099',
  issuerPool: ['Railroad Retirement Board'],
  render(v, rng) {
    return {
      issuer: 'Railroad Retirement Board',
      pages: [
        [
          {
            text: 'UNITED STATES RAILROAD RETIREMENT BOARD',
            x: 0.05,
            y: 0.04,
            size: 8,
            bold: true,
          },
          {
            text: `FORM RRB-1099 ${String(v.year)} PAYMENTS BY THE RAILROAD RETIREMENT BOARD`,
            x: 0.05,
            y: 0.07,
            size: 10,
            bold: true,
          },
          {
            text: "RECIPIENT'S name, street address, city, state, and ZIP code",
            x: 0.05,
            y: 0.13,
            size: 6.5,
          },
          { text: recipientName(v), x: 0.05, y: 0.155, size: 9, mono: true },
          { text: '1. Claim Number and Payee Code', x: 0.55, y: 0.13, size: 6.5 },
          {
            text: `3. Gross Social Security Equivalent Benefit Portion of Tier I Paid in ${String(v.year)}`,
            x: 0.05,
            y: 0.24,
            size: 6.5,
          },
          { text: `$ ${amount(rng, 20000)}`, x: 0.05, y: 0.265, size: 9, mono: true },
          {
            text: `4. Social Security Equivalent Benefit Portion of Tier I Repaid to RRB in ${String(v.year)}`,
            x: 0.05,
            y: 0.3,
            size: 6.5,
          },
          {
            text: `5. Net Social Security Equivalent Benefit Portion of Tier I Paid in ${String(v.year)}`,
            x: 0.05,
            y: 0.36,
            size: 6.5,
          },
          { text: '10. Federal Income Tax Withheld', x: 0.55, y: 0.36, size: 6.5 },
          { text: 'COPY B - FOR RECIPIENT', x: 0.05, y: 0.45, size: 8, bold: true },
        ],
      ],
    };
  },
};

function form1095(
  formId: string,
  title: string,
  designation: string,
  parts: string[],
  issuerLabel: string,
  issuerPool: readonly string[],
  recipientLabel: string,
): FormTemplate {
  return {
    formId,
    issuerPool,
    render(v, rng) {
      const page: Block[] = [
        { text: `Form ${designation}`, x: 0.05, y: 0.04, size: 12, bold: true },
        { text: title, x: 0.3, y: 0.045, size: 12, bold: true },
        { text: String(v.year), x: 0.85, y: 0.04, size: 16, bold: true },
        { text: 'VOID', x: 0.85, y: 0.08, size: 6.5 },
        { text: 'CORRECTED', x: 0.85, y: 0.095, size: 6.5 },
      ];
      let y = 0.13;
      for (const part of parts) {
        page.push({ text: part, x: 0.05, y, size: 8, bold: true });
        y += 0.03;
        if (part === issuerLabel || part.endsWith(issuerLabel)) {
          page.push({ text: v.issuer.toUpperCase(), x: 0.06, y, size: 9, mono: true });
          y += 0.03;
        }
        if (part.endsWith(recipientLabel)) {
          page.push({ text: recipientName(v), x: 0.06, y, size: 9, mono: true });
          y += 0.03;
        }
        if (/Monthly|Offer|Contribution|Covered/.test(part)) {
          page.push({
            text: `Jan ${amount(rng, 900)}   Feb ${amount(rng, 900)}   Mar ${amount(rng, 900)}`,
            x: 0.06,
            y,
            size: 8,
            mono: true,
          });
          y += 0.03;
        }
      }
      return { pages: [page], issuer: v.issuer };
    },
  };
}

const forms1095 = [
  form1095(
    '1095-a',
    'Health Insurance Marketplace Statement',
    '1095-A',
    [
      'Part I Recipient Information',
      '1 Marketplace identifier',
      '2 Marketplace-assigned policy number',
      "3 Policy issuer's name",
      "4 Recipient's name",
      'Part II Covered Individuals',
      'Part III Coverage Information',
      'A. Monthly enrollment premiums',
      'B. Monthly second lowest cost silver plan (SLCSP) premium',
      'C. Monthly advance payment of premium tax credit',
    ],
    "Policy issuer's name",
    issuers.marketplace,
    "Recipient's name",
  ),
  form1095(
    '1095-b',
    'Health Coverage',
    '1095-B',
    [
      'Part I Responsible Individual',
      '1 Name of responsible individual',
      '8 Enter letter identifying Origin of the Health Coverage',
      'Part II Information About Certain Employer-Sponsored Coverage',
      'Part III Issuer or Other Coverage Provider',
      'Part IV Covered Individuals',
    ],
    'Issuer or Other Coverage Provider',
    issuers.insurer,
    'Name of responsible individual',
  ),
  form1095(
    '1095-c',
    'Employer-Provided Health Insurance Offer and Coverage',
    '1095-C',
    [
      'Part I Employee',
      '1 Name of employee',
      'Applicable Large Employer Member (Employer)',
      '7 Name of employer',
      'Part II Employee Offer of Coverage',
      '14 Offer of Coverage',
      '15 Employee Required Contribution',
      '16 Section 4980H Safe Harbor and Other Relief',
      'Part III Covered Individuals',
    ],
    'Name of employer',
    issuers.employer,
    'Name of employee',
  ),
];

function k1(
  formId: string,
  parent: string,
  title: string,
  entity: string,
  person: string,
  nameLabel: string,
  pool: readonly string[],
): FormTemplate {
  return {
    formId,
    issuerPool: pool,
    render(v, rng) {
      const head = (page: number): Block[] => [
        { text: `Schedule K-1 (Form ${parent})`, x: 0.05, y: 0.04, size: 11, bold: true },
        { text: String(v.year), x: 0.35, y: 0.04, size: 16, bold: true },
        ...(page > 1 ? [{ text: `Page ${String(page)}`, x: 0.85, y: 0.04, size: 8 }] : []),
      ];
      return {
        issuer: v.issuer,
        pages: [
          [
            ...head(1),
            { text: title, x: 0.05, y: 0.08, size: 10, bold: true },
            {
              text: 'Department of the Treasury Internal Revenue Service',
              x: 0.05,
              y: 0.105,
              size: 6.5,
            },
            {
              text: `Part I Information About the ${entity}`,
              x: 0.05,
              y: 0.15,
              size: 8,
              bold: true,
            },
            { text: `A ${entity}'s employer identification number`, x: 0.05, y: 0.18, size: 6.5 },
            { text: EIN, x: 0.06, y: 0.2, size: 9, mono: true },
            { text: nameLabel, x: 0.05, y: 0.23, size: 6.5 },
            { text: v.issuer.toUpperCase(), x: 0.06, y: 0.255, size: 9, mono: true },
            {
              text: ISSUER_ADDRESS.join(', ').toUpperCase(),
              x: 0.06,
              y: 0.275,
              size: 9,
              mono: true,
            },
            {
              text: `Part II Information About the ${person}`,
              x: 0.05,
              y: 0.33,
              size: 8,
              bold: true,
            },
            {
              text: `${person}'s name, address, city, state, and ZIP code`,
              x: 0.05,
              y: 0.36,
              size: 6.5,
            },
            { text: recipientName(v), x: 0.06, y: 0.385, size: 9, mono: true },
            {
              text: `Part III ${person}'s Share of Current Year Income, Deductions, Credits, and Other Items`,
              x: 0.5,
              y: 0.15,
              size: 8,
              bold: true,
            },
            ...boxes(
              [
                '1 Ordinary business income (loss)',
                '2 Net rental real estate income (loss)',
                '4a Guaranteed payments for services',
                '5 Interest income',
                '6a Ordinary dividends',
                '11 Other income (loss)',
              ],
              0.5,
              0.19,
              rng,
              0.22,
            ),
          ],
          [
            ...head(2),
            {
              text: `This list identifies the codes used on Schedule K-1 for all ${person.toLowerCase()}s and provides summarized reporting information.`,
              x: 0.05,
              y: 0.08,
              size: 8,
            },
            {
              text: '1. Ordinary business income (loss). Determine whether the income (loss) is passive or nonpassive.',
              x: 0.05,
              y: 0.12,
              size: 8,
            },
            {
              text: 'Code A. Credit for increasing research activities. See the instructions.',
              x: 0.05,
              y: 0.15,
              size: 8,
            },
          ],
        ],
      };
    },
  };
}

const k1s = [
  k1(
    'k-1-1065',
    '1065',
    "Partner's Share of Income, Deductions, Credits, etc.",
    'Partnership',
    'Partner',
    "B Partnership's name, address, city, state, and ZIP code",
    issuers.partnership,
  ),
  k1(
    'k-1-1120s',
    '1120-S',
    "Shareholder's Share of Income, Deductions, Credits, etc.",
    'Corporation',
    'Shareholder',
    "B Corporation's name, address, city, state, and ZIP code",
    issuers.scorp,
  ),
  k1(
    'k-1-1041',
    '1041',
    "Beneficiary's Share of Income, Deductions, Credits, etc.",
    'Estate or Trust',
    'Beneficiary',
    "B Estate's or trust's name",
    issuers.trust,
  ),
];

/** Brokerage "consolidated 1099": several pages, each saying Page X of N. */
const consolidated: FormTemplate = {
  formId: 'brokerage-consolidated',
  issuerPool: issuers.brokerage,
  render(v, rng) {
    const n = rng.int(3, 6);
    const sections = [
      '1099-DIV Dividends and Distributions',
      '1099-INT Interest Income',
      '1099-B Proceeds From Broker and Barter Exchange Transactions',
      'Summary of Proceeds, Gains & Losses, Adjustments and Withholding',
      '1099-MISC Miscellaneous Information',
      'Detail for Dividends and Distributions',
    ];
    const pages = Array.from({ length: n }, (_, i) => {
      const page: Block[] = [
        { text: v.issuer, x: 0.05, y: 0.035, size: 12, bold: true },
        {
          text: `${String(v.year)} TAX REPORTING STATEMENT`,
          x: 0.55,
          y: 0.035,
          size: 10,
          bold: true,
        },
        {
          text: rng.chance(0.5) ? 'Consolidated Form 1099' : 'Composite Form 1099',
          x: 0.55,
          y: 0.06,
          size: 9,
        },
        { text: `Page ${String(i + 1)} of ${String(n)}`, x: 0.85, y: 0.09, size: 7 },
        {
          text: `Account No. XXXX-0000   Recipient: ${recipientName(v)}`,
          x: 0.05,
          y: 0.09,
          size: 8,
        },
        { text: sections[i % sections.length] ?? '', x: 0.05, y: 0.15, size: 10, bold: true },
      ];
      for (let r = 0; r < 10; r++) {
        page.push({
          text: `SAMPLE FUND ${String(r + 1)}   0${String(r)}/15/${String(v.year)}   ${amount(rng, 5000)}   ${amount(rng, 5000)}`,
          x: 0.05,
          y: 0.2 + r * 0.03,
          size: 8,
          mono: true,
        });
      }
      return page;
    });
    return { pages, issuer: v.issuer };
  },
};

const propertyTax: FormTemplate = {
  formId: 'property-tax-statement',
  issuerPool: issuers.county,
  render(v, rng) {
    const issuer = `${v.issuer} Treasurer`;
    return {
      issuer,
      pages: [
        [
          { text: issuer.toUpperCase(), x: 0.05, y: 0.04, size: 12, bold: true },
          { text: ISSUER_ADDRESS.join(', '), x: 0.05, y: 0.065, size: 8 },
          {
            text: `${String(v.year)} REAL ESTATE TAX STATEMENT`,
            x: 0.5,
            y: 0.04,
            size: 11,
            bold: true,
          },
          { text: `Owner Name: ${recipientName(v)}`, x: 0.05, y: 0.13, size: 9 },
          { text: `Property Address: ${ADDRESS_LINES.join(', ')}`, x: 0.05, y: 0.155, size: 9 },
          { text: 'Parcel Number: 00-000-000', x: 0.55, y: 0.13, size: 9 },
          { text: `Assessed Value: $${amount(rng, 400000)}`, x: 0.05, y: 0.22, size: 9 },
          { text: 'Tax Rate: 1.2500%', x: 0.55, y: 0.22, size: 9 },
          { text: `First Installment Due: $${amount(rng, 3000)}`, x: 0.05, y: 0.3, size: 9 },
          { text: `Second Installment Due: $${amount(rng, 3000)}`, x: 0.55, y: 0.3, size: 9 },
          { text: 'Keep this statement for your income tax records.', x: 0.05, y: 0.4, size: 8 },
        ],
      ],
    };
  },
};

export const templates: FormTemplate[] = [
  ...infoReturns,
  w2,
  ssa1099,
  rrb1099,
  ...forms1095,
  ...k1s,
  consolidated,
  propertyTax,
];
export const templateById = new Map(templates.map((t) => [t.formId, t]));
