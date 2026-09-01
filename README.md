# Nova Arcade

A game library that launches instantly and holds frame rate on a Chromebook.
Zero dependencies, no framework, no build step for the shell — one `index.html`,
seven small ES modules, and one self-contained HTML file per game.

```
node tools/serve.mjs          # http://127.0.0.1:8765
```

## The library

Eight titles, imported from the hub and wrapped so they behave on low-end
hardware:

| Title | Category | Renderer | Est. memory |
|---|---|---|---|
| **Summit** | Co-op | WebGL 1 | ~300 MB |
| **Voxel** | Sandbox | WebGL 1 | ~380 MB |
| **Bonecrown** | Action | WebGL 1 | ~320 MB |
| **Neon Bay** | Action | WebGL 1 | ~420 MB |
| **Neon Drift** | Arcade | WebGL 1 | ~220 MB |
| **Vector Siege** | Action | 2D Canvas | ~60 MB |
| **Lumen** | Puzzle | 2D Canvas | ~45 MB |
| **Schedule I** | Action | 2D Canvas | ~120 MB |

Two hidden diagnostic bundles ship alongside them: a pointer-lock probe and a
deliberately leaky harness used to prove a bad title can't take the site down.

## What the portal adds to a game

The imported titles were written standalone and know nothing about any of this.
`src/engine/shim.js` is injected into each bundle at build time and wraps them
from the outside — no edits to their code:

- **Resolution scaling.** It owns `window.devicePixelRatio`, so every engine
  that sizes its drawing buffer from it starts clamped and drops further when
  frames run long. The quality selector in the player bar is authoritative:
  most engines cache their pixel ratio at construction, so a change relaunches
  the frame with the new value in the handshake. Measured on Bonecrown: 1280×714
  CSS → 768×428 buffer on auto, 640×357 on Performance+.
- **Real pause.** Every `requestAnimationFrame` goes through the shim, so a
  backgrounded game genuinely stops — and the paused interval is hidden from the
  game's own clock, so nothing teleports on resume.
- **Teardown.** Exiting cancels the loop and drops every WebGL context the game
  created, then the iframe itself is destroyed, which reclaims the rest.

Games written against the bridge directly (`PE.Bridge`) also get save
round-tripping through IndexedDB, per-title resume, and low-memory hints.

## Measured

`node tests/e2e.mjs` — 29/29. Save round-trip through `postMessage`, teardown
across repeated launches, tier refusal, offline play, pointer lock inside the
sandbox, per-bundle cache invalidation, and surviving the leak harness.

`node tools/bench.mjs` — the performance table on a simulated low-end profile
(4× CPU throttle, DPR 1, 1366×768). `node tools/soak.mjs --minutes=30` cycles
the whole library looking for leaks.

Heap figures are JS heap via CDP and exclude GPU memory. Frame rates measured
in this repo come from a **software rasteriser**, which is far slower than the
integrated GPU in a real Chromebook — treat them as a floor, not a forecast.

## Deploying

The repo root is the site. No build output directory, no server.

**Netlify** (recommended — it applies the caching rules):

```
npx netlify-cli deploy --prod --dir .
```

or connect the repo in the Netlify UI; `netlify.toml` and `_headers` are already
in place. Content-hashed bundles get a one-year immutable TTL, the shell and
catalog stay short-lived.

**GitHub Pages**: enable Pages (Settings → Pages → GitHub Actions) and merge to
`main`; `.github/workflows/pages.yml` does the rest. Pages ignores `_headers`,
so bundles get its own ~10-minute TTL — the service worker makes that mostly
moot, since a played game is served from cache and never revalidated.

Every game page carries a **direct link** (`/#/play/<id>`) with a copy button,
so you can hand someone a URL that opens straight into one title.

## Adding a game

Two kinds of entry:

**Prebuilt** — a game that is already one self-contained HTML file:

```
src/games/my-game/bundle.html
src/games/my-game/game.json     { "prebuilt": true, "shim": true, ... }
```

**From source** — assembled by the builder, with the engine available:

```
src/games/my-game/index.html    <script src="../../engine/bridge.js"></script>
src/games/my-game/js/*.js
```

Either way `node tools/build.mjs` writes `games/my-game.html`, hashes it and
updates `games.json`. Adding a game needs **zero portal changes** —
`tools/check-budgets.mjs` fails the build if any portal module mentions a game
id.

## Commands

```
node tools/build.mjs            # bundle, hash, write games.json, stamp sw.js
node tools/build.mjs --check    # CI: fail if anything committed is stale
node tools/check-budgets.mjs    # size budgets + manifest-driven check
node tools/build-single.mjs     # pack the whole arcade into dist/portal.html
node tools/gen-art.mjs          # regenerate key art from each game's art record
node tools/serve.mjs [port]     # static server matching production headers
node tests/e2e.mjs              # acceptance tests
node tools/bench.mjs            # performance table
node tools/pwa-check.mjs        # installability
node tools/soak.mjs --minutes=30
```

Everything but the harnesses runs on plain Node with no dependencies.

## Docs

- `docs/ARCHITECTURE.md` — how each piece works, the bridge protocol, decisions
  and honest limits.
- `deploy/README.md` — hosts, failover, edge routing, access control.
