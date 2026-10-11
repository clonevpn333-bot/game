import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  Badge,
  Button,
  ButtonLink,
  buttonStyles,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Crosshair,
  cx,
  Kbd,
  Mark,
  StatusDot,
} from './index';

const html = (node: React.ReactNode) => renderToStaticMarkup(node);

describe('Button', () => {
  it('defaults to a primary, 40px, type="button" control', () => {
    const out = html(<Button>Download free trial</Button>);
    expect(out).toMatch(/^<button type="button"/);
    expect(out).toContain('bg-fg text-bg');
    expect(out).toContain('h-10');
    expect(out).toContain('>Download free trial</button>');
  });

  it('renders the secondary variant with a strong hairline border', () => {
    const out = html(<Button variant="secondary">Buy</Button>);
    expect(out).toContain('border-border-strong');
    expect(out).not.toContain('bg-fg ');
  });

  it('lets an explicit type and disabled state through', () => {
    const out = html(
      <Button type="submit" disabled>
        Activate
      </Button>,
    );
    expect(out).toContain('type="submit"');
    expect(out).toContain('disabled=""');
  });

  it('lets a caller className override conflicting utilities', () => {
    const out = html(<Button className="h-12">Sort</Button>);
    expect(out).toContain('h-12');
    expect(out).not.toMatch(/\bh-10\b/);
  });

  it('renders ButtonLink as an anchor with the same styles', () => {
    const out = html(
      <ButtonLink href="/download" variant="secondary">
        Download
      </ButtonLink>,
    );
    expect(out).toMatch(/^<a class="[^"]*border-border-strong[^"]*" href="\/download">/);
  });

  it('exposes buttonStyles for framework links', () => {
    expect(buttonStyles({ variant: 'ghost', size: 'sm' })).toContain('h-8');
  });
});

describe('cx', () => {
  it('keeps custom text sizes alongside text colors', () => {
    expect(cx('text-display text-fg')).toBe('text-display text-fg');
  });

  it('resolves conflicting custom radii to the last one', () => {
    expect(cx('rounded-control', 'rounded-panel')).toBe('rounded-panel');
  });
});

describe('Badge and StatusDot', () => {
  it('applies the tone color', () => {
    expect(html(<Badge tone="warning">Check</Badge>)).toContain('text-warning');
    expect(html(<Badge>W-2</Badge>)).toContain('text-fg-muted');
  });

  it('announces a status dot label to screen readers only', () => {
    const out = html(<StatusDot tone="danger" label="Needs review" />);
    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain('bg-danger');
    expect(out).toContain('<span class="sr-only">Needs review</span>');
  });
});

describe('Kbd', () => {
  it('renders a semantic kbd element', () => {
    expect(html(<Kbd>J</Kbd>)).toMatch(/^<kbd class="[^"]*font-mono[^"]*">J<\/kbd>$/);
  });
});

describe('Card', () => {
  it('composes header, body and footer', () => {
    const out = html(
      <Card>
        <CardHeader>
          <CardTitle>2026 W-2 – Northwind Logistics – Sample</CardTitle>
        </CardHeader>
        <CardBody>Wages</CardBody>
        <CardFooter>Accept</CardFooter>
      </Card>,
    );
    expect(out).toContain('rounded-card');
    expect(out).toContain('<h3');
    expect(out.indexOf('Wages')).toBeLessThan(out.indexOf('Accept'));
  });
});

describe('decorative marks', () => {
  it('hides Mark and Crosshair from assistive tech', () => {
    expect(html(<Mark />)).toContain('aria-hidden="true"');
    expect(html(<Crosshair corner="top-left" />)).toContain('aria-hidden="true"');
  });
});
