import type { ComponentType } from 'react';
import V1_0_0, { meta as m1_0_0 } from './1-0-0.mdx';

export interface ChangelogEntry {
  version: string;
  /** ISO date of the release, or null while unreleased. */
  date: string | null;
  Body: ComponentType;
}

/** Newest first. Add a new .mdx file with `export const meta = { version, date }` and list it here. */
export const changelog: ChangelogEntry[] = [
  { ...(m1_0_0 as { version: string; date: string | null }), Body: V1_0_0 },
];
