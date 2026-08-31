# Deployment

The site is the repository root. There is no build output directory: `index.html`,
`games.json`, `games/*.html`, `portal/**`, `sw.js` and `manifest.webmanifest` are
served as-is. `node tools/build.mjs` regenerates the bundles, the manifest and the
service worker's shell version stamp; CI fails if any of them is stale.

## Hosts

| Host | Role | Notes |
|---|---|---|
| GitHub Pages | primary, via `.github/workflows/pages.yml` | zero config, but **ignores `_headers`** — see below |
| Netlify | mirror, via `netlify.toml` + `_headers` | applies the real caching policy |
| Cloudflare Pages | mirror + edge gateway | `_headers` plus `deploy/cloudflare/worker.js` |

Deploying to two of these is the multi-provider redundancy in §3.1: the same commit
produces byte-identical files on both, so a mirror is a DNS change away, not a
rebuild.

### The GitHub Pages caveat, stated plainly

GitHub Pages sets its own `Cache-Control` (about 10 minutes) and there is no way to
override it. Content-hashed bundles therefore get a 10-minute CDN TTL instead of a
year. In practice this costs very little here, because the service worker caches
bundles cache-first under their `?v=<hash>` URL and never revalidates them — after
the first play, the network is not consulted at all. If long-lived edge TTLs matter
(for example, many first-time visitors on a slow link), deploy the Netlify or
Cloudflare mirror as primary; both honour `_headers`.

## Failover

1. Both hosts track `main` and deploy the same commit.
2. Health check: `GET /games.json` must return 200 with a `games` array, and
   `GET /games/<id>.html?v=<hash>` must return 200 for the first entry.
3. To fail over, repoint the CNAME at the mirror. Because every asset is
   content-addressed by its hash, a client mid-session keeps working: its service
   worker already holds the shell and any bundle it has played.
4. Nothing is stateful server-side. Saves live in the player's IndexedDB, so a
   host swap loses no player data.

## Routing gateway (optional)

`deploy/cloudflare/worker.js` resolves `/play/<id>` to the current versioned bundle
using a KV routing table, falling back to `games.json`. Adding or re-mapping a title
is a KV write, with no shell redeploy — the §3.2 criterion. It also applies the
immutable/short-TTL split at the edge.

## Access control

Auth is **off by default**, and that is a deliberate call, not an omission
(§6, "auth scope"). This is a library of first-party single-file games with no user
data on the server; every auth layer added is latency on the launch path and a token
to expire at the wrong moment. The Worker ships with the mechanism ready:

- Set `REQUIRE_TOKEN=1` and `wrangler secret put JWT_SECRET` to require a
  short-lived HS256 JWT (`Authorization: Bearer …` or `?token=…`).
- Set `REQUIRE_AUDIENCE=1` to bind each token to one title, so a shared link for one
  game does not open the library.
- Verification is a local HMAC in the Worker: no session store, no origin round
  trip, microseconds of added latency.

Turn it on when there is an actual gating requirement to point at.

## A note on managed devices

If this is ever deployed for school- or work-issued hardware, check the deployment
against that network's acceptable-use policy first. Standard CDN routing, caching
and token auth are all ordinary infrastructure and are what is implemented here.
Rotating hostnames to stay ahead of a network filter is a different thing, is not
implemented, and is not something this design should be extended to do.
