import { Badge, StatusDot, cx } from '@binderready/design';
import { parseFormsCatalog } from '@binderready/engine';
import formsJson from '@binderready/engine/forms.json';
import { GripVertical } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Band, SectionHeading } from '../rails';
import { MissingDocsDemo } from './missing-docs-demo';

const catalog = parseFormsCatalog(formsJson);
const officialForms = catalog.forms.filter((f) => f.kind === 'official').map((f) => f.displayName);

function Cell({
  title,
  body,
  children,
  className,
  index,
}: {
  title: string;
  body: ReactNode;
  children: ReactNode;
  className?: string;
  index: number;
}) {
  return (
    <div
      style={{ '--i': index } as CSSProperties}
      className={cx('flex min-w-0 flex-col gap-8 bg-bg p-6 md:p-8', className)}
    >
      <div className="flex-1">{children}</div>
      <div>
        <h3 className="text-[17px] font-semibold tracking-[-0.015em]">{title}</h3>
        <p className="mt-1.5 max-w-[52ch] text-[15px] text-fg-muted">{body}</p>
      </div>
    </div>
  );
}

const splitGroups = [4, 2, 6, 3, 2, 5, 3, 2, 3];

function SplitFragment() {
  return (
    <div className="rounded-[10px] border border-border-strong bg-surface p-4" aria-hidden>
      <p className="font-mono text-xs text-fg-muted">scan0007.pdf · 30 pages</p>
      <div className="mt-4 flex gap-1.5">
        {splitGroups.map((pages, g) => (
          <div key={g} className="flex flex-1 gap-px" style={{ flexGrow: pages }}>
            {Array.from({ length: pages }, (_, p) => (
              <span
                key={p}
                className={cx('h-9 flex-1 rounded-[2px]', p === 0 ? 'bg-fg' : 'bg-fg/25')}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-4 font-mono text-xs text-fg">→ 9 documents</p>
    </div>
  );
}

function NamingFragment() {
  const tokens = ['{year}', '{form}', '{issuer}', '{client}'];
  return (
    <div className="rounded-[10px] border border-border-strong bg-surface p-4" aria-hidden>
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
        {tokens.map((t, i) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="rounded-[4px] border border-border-strong px-1.5 py-0.5 text-fg">
              {t}
            </span>
            {i < tokens.length - 1 ? (
              <span className="text-fg-subtle">{i === 0 ? '' : '–'}</span>
            ) : null}
          </span>
        ))}
      </div>
      <p className="mt-4 truncate font-mono text-[13px] text-fg">
        2026 1099-DIV – Sample Brokerage – Sample
      </p>
      <p className="mt-1 truncate font-mono text-[13px] text-fg-muted">
        2026 W-2 – Northwind Logistics – Sample
      </p>
    </div>
  );
}

function DuplicateFragment() {
  return (
    <div
      className="divide-y divide-border rounded-[10px] border border-border-strong bg-surface"
      aria-hidden
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="tabular font-mono text-xs text-fg-subtle">1</span>
        <p className="min-w-0 flex-1 truncate font-mono text-[13px]">
          2026 W-2 – Northwind Logistics
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <span className="tabular font-mono text-xs text-fg-subtle">2</span>
        <p className="min-w-0 flex-1 truncate font-mono text-[13px] text-fg-muted line-through decoration-fg-subtle">
          2026 W-2 – Northwind Logistics
        </p>
        <Badge tone="warning" className="shrink-0">
          <StatusDot tone="warning" />
          Duplicate of 1
        </Badge>
      </div>
    </div>
  );
}

const firmOrder = [
  'Wages',
  'Interest & dividends',
  'Brokerage',
  'Retirement & Social Security',
  'Health',
];

function FirmFragment() {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,200px)_1fr]" aria-hidden>
      <div className="flex aspect-[8.5/11] w-full max-w-[200px] flex-col rounded-[6px] border border-border-strong bg-surface p-4">
        <span className="grid size-8 place-items-center rounded-[4px] bg-fg font-mono text-[11px] font-semibold text-bg">
          ST
        </span>
        <p className="mt-3 text-[11px] font-medium">Sample Tax Co.</p>
        <p className="mt-auto text-[13px] font-semibold tracking-[-0.01em]">Jane Sample</p>
        <p className="font-mono text-[10px] text-fg-muted">2026 tax documents</p>
        <p className="mt-2 font-mono text-[10px] text-fg-subtle">23 documents · 41 pages</p>
      </div>
      <ol className="w-full max-w-md self-start rounded-[10px] border border-border-strong bg-surface text-[13px]">
        {firmOrder.map((label, i) => (
          <li
            key={label}
            className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-0"
          >
            <GripVertical className="size-3.5 text-fg-subtle" strokeWidth={1.5} />
            <span className="tabular font-mono text-xs text-fg-subtle">{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Features() {
  return (
    <Band labelledBy="features-title">
      <div className="px-5 pt-16 md:px-10 md:pt-24">
        <SectionHeading
          id="features-title"
          eyebrow="02 — What it does"
          title="Built for the way documents actually arrive."
          className="reveal"
        />
      </div>
      <div className="reveal-stagger mt-12 grid grid-cols-[minmax(0,1fr)] gap-px border-t border-border bg-border md:grid-cols-2 lg:grid-cols-3">
        <Cell
          index={0}
          className="md:col-span-2"
          title="Catches what’s missing."
          body="“Last year this client had a 1099-DIV from Sample Brokerage. It hasn’t arrived.” One click turns the list into an email to your client."
        >
          <MissingDocsDemo />
        </Cell>
        <Cell
          index={1}
          title="Recognizes the forms that matter."
          body="W-2, the 1099 family, 1098s, 1095s, K-1s, SSA-1099 and more."
        >
          <ul className="flex flex-wrap gap-1.5" aria-label="Recognized forms">
            {officialForms.map((name) => (
              <li key={name}>
                <Badge>{name.replace('Schedule K-1 (Form ', 'K-1 (')}</Badge>
              </li>
            ))}
          </ul>
        </Cell>
        <Cell
          index={2}
          title="Splits multi-document scans."
          body="One 30-page scan becomes the 9 documents it actually contains."
        >
          <SplitFragment />
        </Cell>
        <Cell
          index={3}
          title="Names everything consistently."
          body={
            <>
              <span className="font-mono text-[13px]">2026 1099-DIV – Issuer – Client</span>, using
              your naming template.
            </>
          }
        >
          <NamingFragment />
        </Cell>
        <Cell
          index={4}
          title="Finds duplicates."
          body="The same W-2 sent twice gets flagged, not filed twice."
        >
          <DuplicateFragment />
        </Cell>
        <Cell
          index={5}
          className="md:col-span-2 lg:col-span-3"
          title="Your firm, your binder."
          body="Firm logo on the cover page, with category order you control."
        >
          <FirmFragment />
        </Cell>
      </div>
    </Band>
  );
}
