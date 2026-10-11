export const DEFAULT_NAME_TEMPLATE = '{year} {form} – {issuer} – {client}';

export const NAME_TOKENS = ['year', 'form', 'issuer', 'client'] as const;
export type NameToken = (typeof NAME_TOKENS)[number];
export type NameValues = Partial<Record<NameToken, string | number | null>>;

// Characters Windows and macOS reject in file names, plus ASCII control characters.
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001f]/g;

/**
 * Renders a naming template. A missing value drops its token together with one
 * adjacent separator, so "{year} {form} – {issuer} – {client}" without an issuer
 * becomes "2026 W-2 – Sample", never "2026 W-2 –  – Sample".
 */
export function renderName(template: string, values: NameValues): string {
  const parts = template.split(/(\{[a-z]+\})/g).filter((p) => p !== '');
  const resolved: { text: string; token: boolean; empty: boolean }[] = parts.map((part) => {
    const m = /^\{([a-z]+)\}$/.exec(part);
    if (!m) return { text: part, token: false, empty: false };
    const raw = values[m[1] as NameToken];
    const text =
      raw === null || raw === undefined ? '' : String(raw).replace(FORBIDDEN, '-').trim();
    return { text, token: true, empty: text === '' };
  });
  for (let i = 0; i < resolved.length; i++) {
    const part = resolved[i];
    if (!part?.token || !part.empty) continue;
    const before = resolved[i - 1];
    const after = resolved[i + 1];
    if (before && !before.token) before.text = '';
    else if (after && !after.token) after.text = '';
  }
  return resolved
    .map((p) => p.text)
    .join('')
    .replace(FORBIDDEN, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[\s–—-]+|[\s–—-]+$/g, '')
    .slice(0, 180);
}

/** Makes names unique within a folder by appending " (2)", " (3)"… */
export function dedupeNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const key = name.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n === 1 ? name : `${name} (${String(n)})`;
  });
}
