import { Check, Copy, Download, FileText, Monitor, Moon, Play, Sun } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  Badge,
  Button,
  type ButtonSize,
  type ButtonVariant,
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Crosshair,
  cx,
  Kbd,
  Mark,
  StatusDot,
} from '../src';
import { contrastRatio, normalizeHex } from './contrast';
import { setThemePreference, useTheme, type ThemePreference } from './theme';

export function App() {
  const { resolved } = useTheme();
  return (
    <div className="px-4 md:px-8">
      <div className="mx-auto max-w-[1120px] border-x border-border">
        <Header />
        <main>
          <Hero />
          <ColorSection key={resolved} />
          <TypeSection />
          <ButtonSection />
          <StatusSection />
          <KeyboardSection />
          <CardSection />
          <ShapeSection />
        </main>
        <footer className="relative border-t border-border px-5 py-8 md:px-10">
          <Crosshair corner="top-left" />
          <Crosshair corner="top-right" />
          <p className="text-sm text-fg-muted">
            Tokens live in <code className="font-mono text-fg">packages/design/tokens.css</code>.
            Components live in <code className="font-mono text-fg">packages/design/src</code>.
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-bg/80 px-5 backdrop-blur-md md:px-10">
      <div className="flex items-center gap-2.5">
        <Mark className="text-[20px]" />
        <span className="text-[15px] font-semibold tracking-[-0.02em]">BinderReady</span>
        <span className="hidden h-4 w-px bg-border-strong sm:block" aria-hidden="true" />
        <span className="hidden text-sm text-fg-muted sm:block">Steel</span>
      </div>
      <ThemeSwitcher />
    </header>
  );
}

const themeOptions: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: 'system', label: 'System', icon: <Monitor strokeWidth={1.5} /> },
  { value: 'light', label: 'Light', icon: <Sun strokeWidth={1.5} /> },
  { value: 'dark', label: 'Dark', icon: <Moon strokeWidth={1.5} /> },
];

function ThemeSwitcher() {
  const { preference } = useTheme();
  return (
    <fieldset className="flex rounded-full border border-border p-0.5">
      <legend className="sr-only">Theme</legend>
      {themeOptions.map((option) => (
        <label
          key={option.value}
          title={option.label}
          className={cx(
            'relative grid size-7 cursor-pointer place-items-center rounded-full text-fg-subtle transition-colors duration-150',
            'hover:text-fg has-checked:bg-fg/8 has-checked:text-fg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
            '[&_svg]:size-4',
          )}
        >
          <input
            type="radio"
            name="theme"
            value={option.value}
            checked={preference === option.value}
            onChange={() => {
              setThemePreference(option.value);
            }}
            className="sr-only"
          />
          {option.icon}
          <span className="sr-only">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className="bg-grid absolute inset-0" aria-hidden="true" />
      <div
        className="absolute inset-x-0 top-1/3 mx-auto h-72 max-w-2xl rounded-full bg-[radial-gradient(closest-side,var(--hero-glow),transparent)]"
        aria-hidden="true"
      />
      <div className="relative px-5 pb-20 pt-16 md:px-10 md:pb-28 md:pt-24">
        <p className="eyebrow">Design system · v0</p>
        <h1 id="hero-title" className="mt-5 max-w-[14ch] text-display">
          The shoebox, <span className="text-steel">sorted.</span>
        </h1>
        <p className="mt-6 max-w-[56ch] text-body text-fg-muted">
          Steel is the shared visual language of the BinderReady website and desktop app. Every
          color, size and component on this page is rendered from{' '}
          <code className="font-mono text-[0.9em] text-fg">@binderready/design</code>, in whichever
          theme you choose above.
        </p>
      </div>
    </section>
  );
}

function Section({
  id,
  label,
  title,
  description,
  children,
}: {
  id: string;
  label: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="relative border-t border-border">
      <Crosshair corner="top-left" />
      <Crosshair corner="top-right" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 px-5 py-12 md:px-10 md:py-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        <div>
          <p className="eyebrow">{label}</p>
          <h2 id={id} className="mt-3 text-lg font-semibold tracking-[-0.02em]">
            {title}
          </h2>
          <p className="mt-2 max-w-[40ch] text-sm text-fg-muted">{description}</p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const surfaceTokens = ['--bg', '--bg-subtle', '--surface', '--border', '--border-strong'];
const textTokens = ['--fg', '--fg-muted', '--fg-subtle', '--success', '--warning', '--danger'];

function readToken(name: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  // Minified CSS shortens hex (#ffffff -> #fff); show the canonical form from tokens.css.
  return normalizeHex(raw) ?? raw;
}

/** Remounted on theme change (keyed by the resolved theme) so values are re-read. */
function ColorSection() {
  const [values] = useState(() =>
    Object.fromEntries([...surfaceTokens, ...textTokens].map((t) => [t, readToken(t)])),
  );
  const bg = values['--bg'] ?? '#000000';
  return (
    <Section
      id="color"
      label="Color"
      title="Monochrome, with meaning"
      description="Grays carry the interface. Green, amber and red appear only to report a status. Values below are read live from the active theme."
    >
      <h3 className="eyebrow mb-3">Surfaces and lines</h3>
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-5">
        {surfaceTokens.map((token) => (
          <li key={token} className="bg-bg p-3 last:col-span-2 md:last:col-span-1">
            <div
              className="h-14 rounded-control border border-border"
              style={{ background: `var(${token})` }}
            />
            <p className="mt-3 font-mono text-xs text-fg">{token}</p>
            <p className="font-mono text-xs text-fg-muted">{values[token]}</p>
          </li>
        ))}
      </ul>

      <h3 className="eyebrow mb-3 mt-10">Text and status</h3>
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-3">
        {textTokens.map((token) => {
          const value = values[token] ?? '';
          const ratio = contrastRatio(value, bg);
          return (
            <li key={token} className="bg-bg p-4">
              <p className="text-2xl font-semibold tracking-[-0.03em]" style={{ color: value }}>
                Aa
              </p>
              <p className="mt-3 font-mono text-xs text-fg">{token}</p>
              <p className="font-mono text-xs text-fg-muted">{value}</p>
              <p className="tabular font-mono text-xs text-fg-muted">
                {ratio.toFixed(2)}:1 on --bg, {ratio >= 4.5 ? 'passes AA' : 'below AA'}
              </p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

const typeSpecimens = [
  {
    spec: 'Display · 600 · −0.045em',
    node: (
      <p className="text-display">
        The shoebox, <span className="text-steel">sorted.</span>
      </p>
    ),
  },
  {
    spec: 'H2 · 600 · −0.035em',
    node: <p className="text-h2">Nothing leaves this computer.</p>,
  },
  {
    spec: 'Body · 16 / 1.6',
    node: (
      <p className="max-w-[60ch] text-body text-fg-muted">
        Drop in a client&apos;s messy pile of tax documents. Get one bookmarked, perfectly ordered
        PDF binder in seconds. Everything runs on your computer.
      </p>
    ),
  },
  {
    spec: 'Label · Mono 12 · 0.06em',
    node: <p className="eyebrow">01 — How it works</p>,
  },
  {
    spec: 'Data · Mono 13',
    node: (
      <p className="font-mono text-[13px] text-fg">
        2026 1099-DIV – Sample Brokerage – Jane Sample
      </p>
    ),
  },
];

function TypeSection() {
  return (
    <Section
      id="type"
      label="Type"
      title="Geist, set tight"
      description="Geist Sans for everything people read; Geist Mono for file names, numbers and section labels. Both are bundled, never fetched."
    >
      <dl className="divide-y divide-border border-y border-border">
        {typeSpecimens.map((s) => (
          <div key={s.spec} className="grid gap-3 py-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-8">
            <dt className="font-mono text-xs text-fg-subtle lg:pt-2">{s.spec}</dt>
            <dd className="min-w-0 break-words">{s.node}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

/* ------------------------------------------------------------------ */

const buttonVariants: ButtonVariant[] = ['primary', 'secondary', 'ghost'];
const buttonSizes: ButtonSize[] = ['md', 'sm'];

function ButtonSection() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(snippet: string) {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(snippet);
    } catch {
      setCopied(null);
    }
  }

  return (
    <Section
      id="buttons"
      label="Buttons"
      title="Inverted, outlined, quiet"
      description="Primary is the one action that matters on a screen. Click any specimen to copy its JSX. Press Tab to see the focus ring."
    >
      <div
        className="overflow-x-auto rounded-card border border-border"
        role="region"
        aria-label="Button variants"
        tabIndex={0}
      >
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="eyebrow px-4 py-3 font-normal">
                Variant
              </th>
              {buttonSizes.map((size) => (
                <th key={size} scope="col" className="eyebrow px-4 py-3 font-normal">
                  {size === 'md' ? 'Default · 40px' : 'Small · 32px'}
                </th>
              ))}
              <th scope="col" className="eyebrow px-4 py-3 font-normal">
                Disabled
              </th>
            </tr>
          </thead>
          <tbody>
            {buttonVariants.map((variant) => (
              <tr key={variant} className="border-b border-border last:border-0">
                <th scope="row" className="px-4 py-4 font-mono text-xs font-normal text-fg-muted">
                  {variant}
                </th>
                {buttonSizes.map((size) => {
                  const snippet = `<Button variant="${variant}" size="${size}">Download free trial</Button>`;
                  return (
                    <td key={size} className="px-4 py-4">
                      <Button
                        variant={variant}
                        size={size}
                        onClick={() => void copy(snippet)}
                        aria-describedby="copy-status"
                      >
                        <Download strokeWidth={1.5} />
                        Download free trial
                      </Button>
                    </td>
                  );
                })}
                <td className="px-4 py-4">
                  <Button variant={variant} disabled>
                    Export
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p
        id="copy-status"
        aria-live="polite"
        className="mt-3 flex min-h-5 items-center gap-1.5 font-mono text-xs text-fg-muted"
      >
        {copied ? (
          <>
            <Check className="size-3.5 text-success" strokeWidth={1.5} aria-hidden="true" />
            Copied {copied}
          </>
        ) : (
          <>
            <Copy className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            Click a button to copy its JSX
          </>
        )}
      </p>
    </Section>
  );
}

function StatusSection() {
  return (
    <Section
      id="status"
      label="Status"
      title="Quiet until it matters"
      description="High-confidence documents get no badge at all. Amber means check it; red means it needs a person."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge>W-2</Badge>
        <Badge>1099-DIV</Badge>
        <Badge tone="success">Exported</Badge>
        <Badge tone="warning">
          <StatusDot tone="warning" />
          Check
        </Badge>
        <Badge tone="danger">
          <StatusDot tone="danger" />
          Needs review
        </Badge>
      </div>

      <ul className="mt-8 divide-y divide-border rounded-card border border-border">
        {[
          { name: '2026 W-2 – Northwind Logistics – Jane Sample', status: null },
          { name: '2026 1099-INT – Sample Credit Union – Jane Sample', status: 'warning' as const },
          { name: 'scan0003.pdf, page 4', status: 'danger' as const },
        ].map((row) => (
          <li key={row.name} className="flex items-center gap-3 px-4 py-3">
            <FileText className="size-4 shrink-0 text-fg-subtle" strokeWidth={1.5} aria-hidden />
            <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{row.name}</span>
            {row.status === 'warning' ? (
              <StatusDot tone="warning" label="Check" />
            ) : row.status === 'danger' ? (
              <StatusDot tone="danger" label="Needs review" />
            ) : (
              <span className="sr-only">High confidence</span>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

const shortcuts: { keys: string[]; action: string }[] = [
  { keys: ['J', 'K'], action: 'Next / previous document' },
  { keys: ['Enter'], action: 'Accept' },
  { keys: ['1–9'], action: 'Reassign category' },
  { keys: ['T'], action: 'Change form type' },
  { keys: ['E'], action: 'Edit name' },
  { keys: ['R'], action: 'Rotate page' },
  { keys: ['S'], action: 'Split at current page' },
  { keys: ['M'], action: 'Merge with previous' },
  { keys: ['D'], action: 'Mark duplicate / remove' },
  { keys: ['Space'], action: 'Open large preview' },
];

function KeyboardSection() {
  return (
    <Section
      id="keyboard"
      label="Keyboard"
      title="Every action has a key"
      description="The review board is built for preparers who never want to touch the mouse. Shortcuts are always shown with Kbd."
    >
      <dl className="grid gap-x-10 sm:grid-cols-2">
        {shortcuts.map((s) => (
          <div
            key={s.action}
            className="flex items-center justify-between gap-4 border-b border-border py-2.5"
          >
            <dt className="text-sm text-fg-muted">{s.action}</dt>
            <dd className="flex shrink-0 gap-1">
              {s.keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
        Command palette
        <span className="flex gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
        on Mac,
        <span className="flex gap-1">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
        on Windows
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------------ */

function DocumentThumb() {
  return (
    <div
      className="flex h-24 w-[74px] shrink-0 flex-col gap-1.5 rounded-[4px] border border-border bg-bg-subtle p-2"
      aria-hidden="true"
    >
      <div className="h-1.5 w-8 rounded-full bg-fg-subtle/60" />
      <div className="mt-1 grid grid-cols-2 gap-1">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-3 rounded-[2px] border border-border-strong" />
        ))}
      </div>
      <div className="h-1 w-full rounded-full bg-border-strong" />
      <div className="h-1 w-2/3 rounded-full bg-border-strong" />
    </div>
  );
}

const binderTree = [
  { category: 'Wages', docs: ['2026 W-2 – Northwind Logistics – Sample'] },
  {
    category: 'Interest & dividends',
    docs: [
      '2026 1099-INT – Sample Credit Union – Sample',
      '2026 1099-DIV – Sample Brokerage – Sample',
    ],
  },
  { category: 'Mortgage & property', docs: ['2026 1098 – Testville Home Loans – Sample'] },
];

function CardSection() {
  return (
    <Section
      id="cards"
      label="Cards"
      title="Composed, not configured"
      description="Card is a set of parts: header, title, description, body and footer. Use only the parts you need."
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Card>
          <CardBody className="flex gap-4 pt-5">
            <DocumentThumb />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="break-words font-mono text-[13px] font-medium tracking-normal">
                  2026 W-2 – Northwind Logistics – Sample
                </CardTitle>
                <StatusDot tone="warning" label="Check" className="mt-1.5" />
              </div>
              <CardDescription className="mt-1">Wages · 2 pages</CardDescription>
              <div className="mt-3 flex gap-1.5">
                <Badge>W-2</Badge>
                <Badge tone="warning">Check</Badge>
              </div>
            </div>
          </CardBody>
          <CardFooter className="flex-wrap text-xs text-fg-muted">
            <Kbd>Enter</Kbd> Accept
            <span className="w-2" />
            <Kbd>T</Kbd> Change form type
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jane Sample – 2026 Binder</CardTitle>
            <CardDescription className="tabular font-mono text-xs">
              1 binder · 23 documents · 41 pages
            </CardDescription>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm">
              {binderTree.map((group) => (
                <li key={group.category}>
                  <span className="text-fg">{group.category}</span>
                  <ul className="mt-1 space-y-1 border-l border-border pl-3">
                    {group.docs.map((doc) => (
                      <li key={doc} className="truncate font-mono text-xs text-fg-muted">
                        {doc}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}

function ShapeSection() {
  const [playing, setPlaying] = useState(false);
  return (
    <Section
      id="shape"
      label="Shape and motion"
      title="Three radii, one curve"
      description="6px for controls, 10px for cards, 14px for large panels. Motion is 150–220ms with an ease-out curve, no bounce, and off for reduced motion."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { cls: 'rounded-control', label: 'control · 6px' },
          { cls: 'rounded-card', label: 'card · 10px' },
          { cls: 'rounded-panel', label: 'panel · 14px' },
        ].map((r) => (
          <div key={r.label}>
            <div className={cx('h-20 border border-border-strong bg-bg-subtle', r.cls)} />
            <p className="mt-2 font-mono text-xs text-fg-muted">{r.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setPlaying((p) => !p);
          }}
          aria-pressed={playing}
        >
          <Play strokeWidth={1.5} />
          {playing ? 'Reverse' : 'Play'} 220ms ease-out
        </Button>
        <div className="relative h-8 min-w-48 flex-1 rounded-control border border-border">
          <div
            className={cx(
              'absolute top-1 h-6 w-10 rounded-[4px] bg-fg transition-[left] duration-[220ms] ease-out-steel',
              playing ? 'left-[calc(100%-2.75rem)]' : 'left-1',
            )}
          />
        </div>
      </div>
    </Section>
  );
}
