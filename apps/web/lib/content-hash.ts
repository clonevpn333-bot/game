import { createHash } from 'node:crypto';
import { securityContentText } from './security-content.ts';

/** Stamped into the security PDF's Subject so tests can tell when it's stale. */
export function securityContentHash(): string {
  return createHash('sha256').update(securityContentText()).digest('hex').slice(0, 16);
}
