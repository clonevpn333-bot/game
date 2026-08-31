/**
 * Edge routing gateway for Lowspec Arcade (§3.2 / §3.3).
 *
 * Two jobs, both done at the edge with no origin round trip:
 *
 *   1. Resolve a friendly game path to the current versioned bundle URL, using
 *      a routing table in KV. New titles and re-mapped routes go live by
 *      editing that table — the shell is never redeployed for a catalog change.
 *   2. Optionally gate access with a short-lived HS256 JWT or a signed URL,
 *      verified locally by WebCrypto. No session store, no database.
 *
 * Auth is OFF unless REQUIRE_TOKEN is set. See deploy/README.md for why that
 * is the default.
 */

const IMMUTABLE = 'public, max-age=31536000, immutable';
const SHORT = 'public, max-age=60, stale-while-revalidate=600';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }

    // /play/<id> -> the versioned bundle this id currently points at.
    const play = /^\/play\/([a-z0-9-]+)\/?$/.exec(url.pathname);
    if (play) {
      const target = await resolveRoute(env, play[1]);
      if (!target) return json({ error: 'unknown game', id: play[1] }, 404);
      if (env.REQUIRE_TOKEN) {
        const auth = await authorize(request, env, play[1]);
        if (!auth.ok) return accessRequired(auth.reason);
      }
      // 302, not a rewrite: the browser then holds the content-hashed URL, so
      // the service worker caches it under the key it will look it up by.
      return Response.redirect(new URL(target, url.origin).toString(), 302);
    }

    const response = await fetchAsset(request, env, ctx);
    return withCacheHeaders(response, url);
  },
};

/** Routing table lives in KV: key `route:<id>` -> "games/<id>.html?v=<hash>". */
async function resolveRoute(env, id) {
  if (env.ROUTES) {
    const hit = await env.ROUTES.get(`route:${id}`);
    if (hit) return hit;
  }
  // Fall back to the manifest so a deploy works before KV is populated.
  try {
    const res = await fetch(new URL('/games.json', env.ORIGIN || 'https://example.invalid'));
    if (!res.ok) return null;
    const manifest = await res.json();
    const game = manifest.games.find((g) => g.id === id);
    return game ? `${game.entry}?v=${game.hash}` : null;
  } catch {
    return null;
  }
}

async function fetchAsset(request, env, ctx) {
  // Static assets come from the connected Pages/Assets binding when present.
  if (env.ASSETS) return env.ASSETS.fetch(request);
  return fetch(request);
}

function withCacheHeaders(response, url) {
  const headers = new Headers(response.headers);
  const p = url.pathname;
  // Content-hashed bundles are immutable; the shell and manifest are not.
  if (/^\/games\/[^/]+\.html$/.test(p) && url.searchParams.has('v')) headers.set('cache-control', IMMUTABLE);
  else if (/\.(jpg|png|svg|woff2?)$/.test(p)) headers.set('cache-control', 'public, max-age=604800');
  else if (p.endsWith('games.json') || p.endsWith('/') || p.endsWith('index.html') || p.endsWith('sw.js')) {
    headers.set('cache-control', SHORT);
  }
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'no-referrer');
  return new Response(response.body, { status: response.status, headers });
}

// --------------------------------------------------------------------- auth

/**
 * Accepts either `Authorization: Bearer <jwt>` or `?token=<jwt>` (signed link).
 * HS256 only: the shared secret never leaves the edge, and verification is a
 * single local HMAC — no network hop, so the added latency is microseconds.
 */
async function authorize(request, env, audience) {
  const url = new URL(request.url);
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : url.searchParams.get('token');
  if (!token) return { ok: false, reason: 'no token supplied' };
  if (!env.JWT_SECRET) return { ok: false, reason: 'gateway is misconfigured (no signing key)' };

  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed token' };
  const [h, p, s] = parts;

  let header_, payload;
  try {
    header_ = JSON.parse(atobUrl(h));
    payload = JSON.parse(atobUrl(p));
  } catch { return { ok: false, reason: 'malformed token' }; }
  if (header_.alg !== 'HS256') return { ok: false, reason: 'unsupported algorithm' };

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const valid = await crypto.subtle.verify(
    'HMAC', key, base64UrlToBytes(s), new TextEncoder().encode(`${h}.${p}`)
  );
  if (!valid) return { ok: false, reason: 'bad signature' };

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return { ok: false, reason: 'token expired' };
  if (payload.nbf && payload.nbf > now + 60) return { ok: false, reason: 'token not yet valid' };
  // Single-audience tokens: a link for one title does not open the whole library.
  if (env.REQUIRE_AUDIENCE && payload.aud && payload.aud !== audience && payload.aud !== '*') {
    return { ok: false, reason: 'token is for a different title' };
  }
  return { ok: true, claims: payload };
}

function accessRequired(reason) {
  // Fail closed, but with a page a person can act on rather than a blank error.
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Access required</title>
<body style="font:15px system-ui;background:#0d1117;color:#e6edf3;display:grid;place-items:center;height:100vh;margin:0">
<div style="max-width:44ch;text-align:center">
<h1 style="font-size:18px">Access required</h1>
<p style="color:#9aa7b4">${escapeHtml(reason)}. Ask whoever shared this link for a fresh one — access links are short-lived by design.</p>
</div>`,
    { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }
  );
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function atobUrl(s) { return atob(s.replace(/-/g, '+').replace(/_/g, '/')); }

function base64UrlToBytes(s) {
  const bin = atobUrl(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
