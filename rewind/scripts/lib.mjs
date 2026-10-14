import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
export const core = require('../js/core.js');
const root = new URL('../', import.meta.url);
export const LIB = new URL('data/library.json', root);
export const readLib = () => JSON.parse(readFileSync(LIB, 'utf8'));
export const writeLib = (lib) => writeFileSync(LIB, JSON.stringify(lib, null, 1) + '\n');
export const rebuild = () => spawnSync(process.execPath, [new URL('scripts/build-library.mjs', root).pathname], { stdio: 'inherit' });
export const OEMBED = process.env.OEMBED_BASE || 'https://www.tiktok.com/oembed';

/* Ask TikTok's public oEmbed endpoint about a post.
 * -> {state:'ok', author, title, thumbnail} | {state:'gone', http} | {state:'unknown', reason} */
export async function checkOembed(v) {
  const url = v.creator ? `https://www.tiktok.com/@${v.creator}/video/${v.id}` : `https://www.tiktok.com/@_/video/${v.id}`;
  try {
    const res = await fetch(`${OEMBED}?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'rewind-link-check/1.0' } });
    if (res.status === 200) {
      const j = await res.json().catch(() => ({}));
      if (j && (j.html || j.title || j.author_unique_id)) return { state: 'ok', author: j.author_unique_id || null, title: j.title || null, thumbnail: j.thumbnail_url || null };
      return { state: 'unknown', reason: 'empty oEmbed body' };
    }
    if (res.status === 429 || res.status >= 500) return { state: 'unknown', reason: `HTTP ${res.status}` };
    if (res.status >= 400) {
      // A wrong @handle also 4xxs; retry once with the placeholder handle before calling it gone.
      if (v.creator) return checkOembed({ ...v, creator: null });
      return { state: 'gone', http: res.status };
    }
    return { state: 'unknown', reason: `HTTP ${res.status}` };
  } catch (e) {
    return { state: 'unknown', reason: String(e.cause?.code || e.message) };
  }
}
