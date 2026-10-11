/** Normalizes #rgb / #rrggbb to lowercase #rrggbb; returns null for anything else. */
export function normalizeHex(color: string): string | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m?.[1]) return null;
  const hex = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
  return `#${hex.toLowerCase()}`;
}

function luminance(color: string): number {
  const normalized = normalizeHex(color);
  if (!normalized) return Number.NaN;
  const hex = normalized.slice(1);
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two #rrggbb colors. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
