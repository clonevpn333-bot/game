import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');

function block(selectorPattern: RegExp): Record<string, string> {
  const match = selectorPattern.exec(css);
  if (!match?.[1]) throw new Error(`Block not found: ${String(selectorPattern)}`);
  const vars: Record<string, string> = {};
  for (const [, name, value] of match[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    if (name && value) vars[name] = value.trim();
  }
  return vars;
}

const light = block(/:root,\s*\[data-theme='light'\]\s*\{([^}]*)\}/);
const darkAttr = block(/\n\[data-theme='dark'\]\s*\{([^}]*)\}/);
const darkMedia = block(/:root:not\(\[data-theme='light'\]\)\s*\{([^}]*)\}/);

// From BUILD_PROMPT.md §2. --fg-subtle is intentionally adjusted (see the AA test below).
const briefLight = {
  '--bg': '#ffffff',
  '--bg-subtle': '#fafafa',
  '--surface': '#ffffff',
  '--fg': '#0a0a0a',
  '--fg-muted': '#666666',
  '--border': '#eaeaea',
  '--border-strong': '#d4d4d4',
  '--success': '#15803d',
  '--warning': '#b45309',
  '--danger': '#b91c1c',
  '--focus': '#0a0a0a',
};
const briefDark = {
  '--bg': '#000000',
  '--bg-subtle': '#0a0a0a',
  '--surface': '#111111',
  '--fg': '#ededed',
  '--fg-muted': '#a1a1a1',
  '--border': '#1f1f1f',
  '--border-strong': '#333333',
  '--success': '#22c55e',
  '--warning': '#f59e0b',
  '--danger': '#ef4444',
  '--focus': '#ededed',
};

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('tokens.css', () => {
  it('matches the brief in the light theme', () => {
    expect(light).toMatchObject(briefLight);
  });

  it('matches the brief in the dark theme', () => {
    expect(darkAttr).toMatchObject(briefDark);
  });

  it('keeps the media-query dark block identical to [data-theme=dark]', () => {
    expect(darkMedia).toEqual(darkAttr);
  });

  const textTokens = ['--fg', '--fg-muted', '--fg-subtle', '--success', '--warning', '--danger'];
  const backgrounds = ['--bg', '--bg-subtle', '--surface'];

  for (const [name, theme] of [
    ['light', light],
    ['dark', darkAttr],
  ] as const) {
    it(`passes WCAG AA (4.5:1) for every text token on every ${name} background`, () => {
      for (const fg of textTokens) {
        for (const bg of backgrounds) {
          const ratio = contrast(theme[fg] ?? '', theme[bg] ?? '');
          expect(ratio, `${fg} on ${bg} (${name})`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }
});
