# Lowspec Arcade

A zero-dependency HTML5 game portal built for ChromeOS and low-end laptops:
dual-core CPUs, ~4 GB of RAM, integrated GPUs, no fan. Every design decision
answers to that hardware first — a title that cannot hold a stable frame rate
there is treated as a defect, not a trade-off.

No framework. No bundler. No runtime dependencies. The shell is `index.html`
plus seven small ES modules; each game is one self-contained HTML file.

```
node tools/serve.mjs          # http://127.0.0.1:8765
```

## What is here

| | |
|---|---|
| **Portal shell** | `index.html`, `portal/css/shell.css`, `portal/js/*.js` — hash router, catalog grid, iframe launcher, IndexedDB saves, diagnostics |
| **Games** | `games/*.html`, built from `src/games/<id>/` — one file each, inlined and content-hashed |
| **Catalog** | `games.json` — generated; the portal hardcodes no game knowledge |
| **Offline** | `sw.js` — app-shell precache, per-bundle versioned caching, quota-aware LRU eviction |
| **Engine** | `src/engine/*.js` — fixed-timestep loop, object pools, dynamic resolution, teardown registry, the portal↔game bridge |
| **Harnesses** | `tests/e2e.mjs`, `tools/bench.mjs`, `tools/soak.mjs`, `tools/check-budgets.mjs` |

## Measured, not asserted

`node tools/bench.mjs` runs the benchmark table on a simulated low-end profile
(4× CPU throttle, DPR 1, 1366×768, software GL). Latest run in this repo:

| Metric | Target | Fail at | Measured |
|---|---|---|---|
| Shell transfer (gzipped) | < 150 KB | > 250 KB | **23.2 KB** |
| Shell first contentful paint | < 1.0 s | > 1.8 s | **0.08 s** |
| Shell time to interactive | < 2.0 s | > 3.5 s | **0.22 s** |
| Cold launch → interactive | < 3.0 s | > 6.0 s | **412 ms** (voxel-drift) |
| Warm launch → interactive | < 500 ms | > 1.2 s | **218 ms** (voxel-drift) |
| Sustained frame rate | ≥ 30 (60 target) | < 30 | **37.4 fps** worst (voxel-drift, software GL) |
| Heap after exit vs baseline | ±10 % | monotonic growth | **+5 %** worst |

`node tests/e2e.mjs` covers the acceptance criteria directly — save round-trip
through `postMessage`, deterministic teardown, tier refusal, offline play,
pointer lock inside the sandbox, per-bundle cache invalidation, and surviving a
deliberately leaky title. 27/27 pass.

Frame rates above are on a **software rasteriser**, which is the pessimistic
case; real integrated GPUs do considerably better. The heap figures are JS heap
via CDP — see `docs/ARCHITECTURE.md` for what that does and does not include.

## Adding a game

One HTML file and one manifest entry, with zero portal changes — enforced by
`tools/check-budgets.mjs`, which fails the build if any portal module mentions a
game id.

1. `mkdir src/games/my-game` with an `index.html` and a `game.json`.
2. Reference the shared engine with ordinary tags — the builder inlines them:
   ```html
   <script src="../../engine/teardown.js"></script>
   <script src="../../engine/loop.js"></script>
   <script src="../../engine/bridge.js"></script>
   ```
3. Connect to the portal:
   ```js
   PE.Bridge.connect({
     id: 'my-game',
     onHello:    (ctx) => start(ctx.save, ctx.caps),  // ctx.tier is already gated
     onPause:    () => loop.pause(),
     onResume:   () => loop.resume(),
     onShutdown: () => { PE.Bridge.flush(); PE.Teardown.destroyAll(); },
   });
   PE.Bridge.save(state);   // debounced; lands in the portal's IndexedDB
   ```
4. `node tools/build.mjs` writes `games/my-game.html`, hashes it, and updates
   `games.json`. `node tools/gen-thumbs.mjs my-game` captures the card image.

`game.json` fields: `id`, `title`, `tagline`, `description`, `version`,
`minRendererTier` (`canvas2d` | `webgl1` | `webgl2`), `estMemoryMB`,
`pointerLock`, `budgetKB`, `controls[]`, `tags[]`, `hidden`.

## Commands

```
node tools/build.mjs            # bundle games, hash them, write games.json, stamp sw.js
node tools/build.mjs --check    # CI: fail if anything committed is stale
node tools/check-budgets.mjs    # shell + bundle size budgets, manifest-driven check
node tools/serve.mjs [port]     # static server matching production cache headers
node tests/e2e.mjs              # acceptance tests
node tools/bench.mjs            # the §4 benchmark table
node tools/soak.mjs --minutes=30    # multi-game leak soak
node tools/gen-thumbs.mjs [id]  # capture card thumbnails from real gameplay
node tools/gen-icons.mjs        # regenerate PWA icons
```

Everything except the harnesses runs with plain Node and no dependencies; the
harnesses drive Chromium through Playwright.

## The library

| Title | Tier | Est. memory | What it exercises |
|---|---|---|---|
| **Schedule I** | 2D Canvas | ~120 MB | The pre-existing title, ported: saves, pause, teardown, resolution scaling |
| **Orbital Salvage** | 2D Canvas | ~45 MB | Fixed-timestep + interpolation, fixed-size pools, layered canvases |
| **Prism Runner** | WebGL 1 | ~60 MB | The middle rung: instancing where available, per-object draws where not |
| **Voxel Drift** | WebGL 2 | ~320 MB | Streaming chunk meshes on a worker, frustum culling, pointer lock, LRU geometry budget |
| *Pointer Lock Probe* | 2D Canvas | ~8 MB | Diagnostic: proves pointer lock works inside the sandbox |
| *Leak Test Harness* | 2D Canvas | ~320 MB | Diagnostic: leaks, hangs, throws, and refuses to shut down on purpose |

## Documentation

- `docs/ARCHITECTURE.md` — how each requirement is met, the bridge protocol, the
  decisions taken on the open questions, and the honest caveats.
- `deploy/README.md` — hosts, failover, the edge gateway, and access control.
