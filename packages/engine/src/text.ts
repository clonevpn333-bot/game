import type { Word } from './types.ts';

export interface Line {
  text: string;
  /** Top of the line, page fraction. */
  y: number;
  x: number;
  right: number;
  words: Word[];
}

/** Collapses whitespace and folds typographic quotes and dashes to ASCII. */
export function normalizeText(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Horizontal gap (page fraction) that separates two columns or form boxes. */
export const COLUMN_GAP = 0.035;

/** Groups words into reading-order lines: words whose vertical centers are close share a line. */
export function buildLines(words: Word[]): Line[] {
  const sorted = [...words]
    .filter((w) => w.text.trim() !== '')
    .sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2) || a.x - b.x);
  const lines: Word[][] = [];
  for (const word of sorted) {
    const center = word.y + word.h / 2;
    const line = lines.at(-1);
    const first = line?.[0];
    if (
      line &&
      first &&
      Math.abs(first.y + first.h / 2 - center) <= Math.max(first.h, word.h) * 0.5
    ) {
      line.push(word);
    } else {
      lines.push([word]);
    }
  }
  // A wide horizontal gap separates boxes on a form: split there so a box label and
  // the neighbouring box's text don't read as one phrase.
  const segments = lines.flatMap((ws) => {
    ws.sort((a, b) => a.x - b.x);
    const out: Word[][] = [];
    for (const word of ws) {
      const seg = out.at(-1);
      const prev = seg?.at(-1);
      if (seg && prev && word.x - (prev.x + prev.w) < COLUMN_GAP) seg.push(word);
      else out.push([word]);
    }
    return out;
  });
  return segments.map((ws) => ({
    text: normalizeText(ws.map((w) => w.text).join(' ')),
    y: Math.min(...ws.map((w) => w.y)),
    x: Math.min(...ws.map((w) => w.x)),
    right: Math.max(...ws.map((w) => w.x + w.w)),
    words: ws,
  }));
}

export interface PageText {
  lines: Line[];
  /** All text in reading order, one line per row. */
  full: string;
  /** Text in the top band of the page, where titles and designations print. */
  header: string;
  /**
   * Column-major reading: lines that share a left edge, top to bottom. A title
   * printed over several lines in one box ("Dividends and / Distributions") reads
   * as one phrase here even when other columns interleave in row order.
   */
  columns: string;
  headerColumns: string;
}

/** Lines whose left edges are this close belong to the same column. */
const COLUMN_EDGE = 0.03;

function columnOrder(lines: Line[]): string {
  const columns: Line[][] = [];
  for (const line of [...lines].sort((a, b) => a.x - b.x || a.y - b.y)) {
    const column = columns.find((c) => Math.abs((c[0]?.x ?? 0) - line.x) <= COLUMN_EDGE);
    if (column) column.push(line);
    else columns.push([line]);
  }
  return columns
    .map((c) =>
      c
        .sort((a, b) => a.y - b.y)
        .map((l) => l.text)
        .join('\n'),
    )
    .join('\n\n');
}

export const HEADER_FRACTION = 0.3;

export function pageText(words: Word[]): PageText {
  const lines = buildLines(words);
  const headerLines = lines.filter((l) => l.y < HEADER_FRACTION);
  return {
    lines,
    full: lines.map((l) => l.text).join('\n'),
    header: headerLines.map((l) => l.text).join('\n'),
    columns: columnOrder(lines),
    headerColumns: columnOrder(headerLines),
  };
}

/** Replaces anything shaped like an SSN, EIN or 9-digit TIN. Use before logging any text. */
export function maskIdentifiers(text: string): string {
  return text
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****')
    .replace(/\b\d{2}-\d{7}\b/g, '**-*******')
    .replace(/\b\d{9}\b/g, '*********');
}
