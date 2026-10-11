import { site } from '@/site.config';

const P = site.productName;
const { pricing } = site;

export interface Faq {
  id: string;
  question: string;
  answer: string[];
}

/** Home page FAQ. Answers stay inside the honesty rules in BUILD_PROMPT.md §1. */
export const faqs: Faq[] = [
  {
    id: 'local',
    question: 'Do my clients’ documents leave my computer?',
    answer: [
      `No. ${P} reads, recognizes and assembles documents on your computer, and client files are never uploaded. There is no account and no cloud processing.`,
      `The app makes two kinds of network request and blocks everything else: license activation, which sends your license key and a device name, and an update check, which you can turn off in Settings.`,
    ],
  },
  {
    id: 'software',
    question: 'Which tax software does it work with?',
    answer: [
      `All of them. ${P} produces standard PDF files with bookmarks and a clickable index, so the binder opens in any PDF reader and attaches to any return, client portal or document management system you already use.`,
    ],
  },
  {
    id: 'forms',
    question: 'Which forms does it recognize?',
    answer: [
      'W-2 and W-2G, the 1099 family (INT, OID, DIV, B, R, NEC, MISC, K, G, SA, Q, S, C), SSA-1099 and RRB-1099, 1098, 1098-T and 1098-E, 1095-A, 1095-B and 1095-C, 5498 and 5498-SA, and Schedule K-1 from Forms 1065, 1120-S and 1041.',
      'It also recognizes brokerage consolidated statements and property tax statements. Anything else goes to Other, flagged for you to name.',
    ],
  },
  {
    id: 'unsure',
    question: 'What happens when it isn’t sure?',
    answer: [
      'It tells you. Documents it recognizes with high confidence are filed quietly. Documents it is less sure about get an amber Check marker, and anything it can’t place goes into a Needs review group at the top of the board.',
      'When two form types look equally likely, it never guesses: it shows you both and waits. Fixing a document takes one keystroke.',
    ],
  },
  {
    id: 'scans',
    question: 'Does it work on scanned paper and phone photos?',
    answer: [
      'Yes. It reads PDFs, JPG, PNG, HEIC and multi-page TIFF files. Phone photos are straightened and turned the right way up, and a multi-document scan is split into the separate documents it contains.',
      'Digital PDFs with a text layer are read exactly. Blurry or shadowed photos may be flagged for review rather than filed automatically.',
    ],
  },
  {
    id: 'platforms',
    question: 'Windows or Mac?',
    answer: [
      `Both. ${P} runs on ${site.systemRequirements.windows} and on ${site.systemRequirements.mac}. One license covers either platform.`,
    ],
  },
  {
    id: 'subscription',
    question: 'Is this a subscription?',
    answer: [
      `No. You pay once: $${pricing.solo.price} for Solo or $${pricing.firm.price} for Firm. There is no renewal and nothing stops working if you never pay again.`,
    ],
  },
  {
    id: 'updates',
    question: `What does “free updates for ${pricing.majorVersion}.x” mean?`,
    answer: [
      `Every ${pricing.majorVersion}.x release is free for license holders, including new form support and fixes. If there is ever a version ${pricing.majorVersion + 1}, upgrading is optional and version ${pricing.majorVersion} keeps working.`,
    ],
  },
  {
    id: 'office',
    question: 'Can my whole office use one license?',
    answer: [
      `A Solo license activates on ${pricing.solo.activations} computers and a Firm license on ${pricing.firm.activations}. Each computer that builds binders needs an activation. You can move an activation by deactivating it from Settings → License on the old computer.`,
    ],
  },
  {
    id: 'refunds',
    question: 'What’s your refund policy?',
    answer: [
      `If ${P} isn’t right for your practice, ask for a refund within ${pricing.refundDays} days of purchase and you get your money back, no questions asked. The license is deactivated when the refund is issued.`,
    ],
  },
  {
    id: 'advice',
    question: 'Is this tax advice?',
    answer: [
      `No. ${P} organizes documents. It does not prepare returns, give tax advice or check that a document is correct or complete. You remain responsible for reviewing every document and every return.`,
    ],
  },
];

export interface Plan {
  id: 'trial' | 'solo' | 'firm';
  name: string;
  price: string;
  cadence: string;
  summary: string;
  features: string[];
  highlight: boolean;
}

export const plans: Plan[] = [
  {
    id: 'trial',
    name: 'Trial',
    price: 'Free',
    cadence: 'no card needed',
    summary: 'Try it on real client files.',
    features: [
      'Every feature',
      `${pricing.trialBinders} client binders`,
      'A small trial note on cover pages',
    ],
    highlight: false,
  },
  {
    id: 'solo',
    name: 'Solo',
    price: `$${pricing.solo.price}`,
    cadence: 'once',
    summary: 'For one preparer.',
    features: [
      `${pricing.solo.activations} computers`,
      'Every feature, unlimited binders',
      `Free updates for version ${pricing.majorVersion}.x`,
    ],
    highlight: true,
  },
  {
    id: 'firm',
    name: 'Firm',
    price: `$${pricing.firm.price}`,
    cadence: 'once',
    summary: 'For a small office.',
    features: [
      `${pricing.firm.activations} computers`,
      'Every feature, unlimited binders',
      `Free updates for version ${pricing.majorVersion}.x`,
    ],
    highlight: false,
  },
];
