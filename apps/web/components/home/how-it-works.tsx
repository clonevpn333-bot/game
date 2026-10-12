import type { CSSProperties } from 'react';
import { site } from '@/site.config';
import { Band, SectionHeading } from '../rails';

const steps = [
  {
    title: 'Drop',
    body: 'Drag in PDFs, scans, and phone photos. Multi-document scans get split automatically.',
  },
  {
    title: 'Review',
    body: `${site.productName} recognizes each form, names it, and flags anything it isn’t sure about. Fix anything in one keystroke.`,
  },
  {
    title: 'Export',
    body: 'One binder with a cover page, a clickable index, and bookmarks, in your firm’s order.',
  },
];

/**
 * One sheet per document. Positions are in stage widths (cqw): where it lies in the pile,
 * where it sits on the review board, and where it ends up in the binder. The tab marks its
 * section once it is filed. The duplicate W-2 is set aside instead of filed.
 */
const sheets = [
  { form: 'W-2', issuer: 'Northwind Logistics', tab: 'Wages', pile: [8, 30, -14], grid: [3, 3] },
  {
    form: '1099-INT',
    issuer: 'Sample Savings Bank',
    tab: 'Interest',
    pile: [30, 8, 9],
    grid: [37, 3],
  },
  {
    form: '1099-DIV',
    issuer: 'Example Index Funds',
    tab: 'Dividends',
    pile: [52, 34, -6],
    grid: [71, 3],
  },
  {
    form: '1098',
    issuer: 'Testville Mortgage',
    tab: 'Mortgage',
    pile: [22, 44, 17],
    grid: [3, 44],
  },
  {
    form: '1099-NEC',
    issuer: 'Placeholder Design LLC',
    tab: 'Self-employment',
    pile: [64, 10, 21],
    grid: [37, 44],
  },
  { form: 'W-2', issuer: 'Northwind Logistics', tab: null, pile: [40, 26, -24], grid: [71, 44] },
] as const;

function Sheet({ sheet, i }: { sheet: (typeof sheets)[number]; i: number }) {
  const filed = sheet.tab !== null;
  const style = {
    '--px': sheet.pile[0],
    '--py': sheet.pile[1],
    '--pr': `${String(sheet.pile[2])}deg`,
    '--gx': sheet.grid[0],
    '--gy': sheet.grid[1],
    // Filed sheets stack into the binder, each a hair lower; the duplicate slides away.
    '--sx': filed ? 37 + i * 0.7 : 104,
    '--sy': filed ? 22 + i * 0.9 : 44,
    '--tab': i,
    zIndex: filed ? 10 - i : 1,
  } as CSSProperties;
  return (
    <div className={filed ? 'story-sheet' : 'story-sheet story-dup'} style={style}>
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[max(9px,1.7cqw)] font-semibold">{sheet.form}</span>
        <span className={filed ? 'story-dot bg-success' : 'story-dot bg-warning'} aria-hidden />
      </div>
      <p className="mt-[1cqw] truncate text-[max(8px,1.5cqw)] text-fg-muted">{sheet.issuer}</p>
      <div className="mt-[2cqw] space-y-[1.1cqw]" aria-hidden>
        {[92, 70, 84, 56, 76].map((w, j) => (
          <span
            key={j}
            className="block h-[0.7cqw] rounded-full bg-fg/12"
            style={{ width: `${String(w)}%` }}
          />
        ))}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-[1cqw]" aria-hidden>
        {[0, 1, 2, 3].map((b) => (
          <span key={b} className="h-[3.2cqw] rounded-[2px] border border-border" />
        ))}
      </div>
      {filed ? (
        <span className="story-tab font-mono text-[max(8px,1.35cqw)]">{sheet.tab}</span>
      ) : (
        <span className="story-dup-label font-mono text-[max(8px,1.35cqw)]">Duplicate</span>
      )}
    </div>
  );
}

/**
 * The page's one orchestrated moment. On wide screens with scroll-driven animations the
 * section pins while the pile is read, laid out for review and filed into a tabbed binder,
 * and the step that is happening lights up. Everywhere else it is a still: the review board.
 */
export function HowItWorks() {
  return (
    <Band id="product" labelledBy="how-title">
      <div className="story">
        <div className="story-pin grid gap-10 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-16">
          <div>
            <SectionHeading
              id="how-title"
              eyebrow="01 — How it works"
              title="From pile to binder in three steps."
            />
            <ol className="relative mt-10 space-y-7 pl-6">
              <span className="story-rail" aria-hidden />
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  className="story-step"
                  style={{ '--step': i } as CSSProperties}
                >
                  <h3 className="text-xl font-semibold tracking-[-0.02em]">{step.title}</h3>
                  <p className="mt-1.5 max-w-[40ch] text-[15px] text-fg-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="story-stage" aria-hidden>
            {sheets.map((sheet, i) => (
              <Sheet key={`${sheet.form}-${String(i)}`} sheet={sheet} i={i} />
            ))}
            <div className="story-cover">
              <p className="text-[max(9px,1.6cqw)] font-medium">Sample Tax Co.</p>
              <p className="mt-auto text-[max(11px,2.6cqw)] font-semibold tracking-[-0.02em]">
                Jane Sample
              </p>
              <p className="font-mono text-[max(8px,1.4cqw)] text-fg-muted">2026 tax documents</p>
              <div className="mt-[2.4cqw] space-y-[1cqw] border-t border-border pt-[2cqw] font-mono text-[max(8px,1.3cqw)] text-fg-muted">
                {['Wages', 'Interest', 'Dividends', 'Mortgage', 'Self-employment'].map((s, i) => (
                  <p key={s} className="flex justify-between gap-2">
                    <span className="truncate">{s}</span>
                    <span className="tabular">{i + 2}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Band>
  );
}
