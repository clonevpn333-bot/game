import { site } from '@/site.config';
import { Band, SectionHeading } from '../rails';

const steps = [
  {
    n: '01',
    title: 'Drop',
    body: 'Drag in PDFs, scans, and phone photos. Multi-document scans get split automatically.',
  },
  {
    n: '02',
    title: 'Review',
    body: `${site.productName} recognizes each form, names it, and flags anything it isn’t sure about. Fix anything in one keystroke.`,
  },
  {
    n: '03',
    title: 'Export',
    body: 'One binder with a cover page, a clickable index, and bookmarks, in your firm’s order.',
  },
];

export function HowItWorks() {
  return (
    <Band id="product" labelledBy="how-title">
      <div className="px-5 pt-16 md:px-10 md:pt-24">
        <SectionHeading
          id="how-title"
          eyebrow="01 — How it works"
          title="From pile to binder in three steps."
          className="reveal"
        />
      </div>
      <ol className="reveal-stagger mt-12 grid border-t border-border md:grid-cols-3">
        {steps.map((step, i) => (
          <li
            key={step.n}
            style={{ '--i': i } as React.CSSProperties}
            className="border-border px-5 py-10 md:px-10 [&:not(:first-child)]:border-t md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:border-t-0"
          >
            <span className="tabular font-mono text-sm text-fg-subtle">{step.n}</span>
            <h3 className="mt-6 text-xl font-semibold tracking-[-0.02em]">{step.title}</h3>
            <p className="mt-2 max-w-[36ch] text-[15px] text-fg-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </Band>
  );
}
