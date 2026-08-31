# Architecture

How the portal meets the specification, what was decided where the spec left a
choice open, and where the implementation's guarantees stop.

---

## 0. The constraint model, in code

Three facts drive everything:

| Fact | Where it shows up |
|---|---|
| A tab on a 4 GB device gets ~1–1.5 GB before it is killed | `estMemoryMB` per title, `memoryHeadroom()` warnings, the renderer's LRU byte budget, `portal:lowmem` |
| Integrated GPUs are fill-rate bound and throttle thermally | DPR clamped to 1, backing store at 0.75–1.0×, resolution dropped before frame rate, no blur/filter effects anywhere in the shell |
| GC pauses cause more jank than raw compute | Allocation-free hot loops, fixed-size pools, bound frame callbacks, preallocated matrices and stats objects |

---

## 1. Client-side resource optimisation

### 1.1 Memory

**Allocation-free hot loops.** `PE.Loop` binds its own frame callback once, and
never creates an object, array, or closure per frame; `stats` is one object
mutated in place. `PE.Pool.update(fn, dt)` takes a module-level function so the
sweep does not allocate a closure. The ported Schedule I loop was changed from
`requestAnimationFrame(ts => this._loop(ts))` — one closure per frame, forever —
to a single bound function.

**Pools sized at load, never grown.** `PE.Pool` allocates its objects up front
and keeps a free-list of indices in an `Int32Array`. On exhaustion it recycles
round-robin rather than growing, because a mid-frame allocation spike is exactly
what the target hardware cannot absorb. `exhausted` counts how often that
happens, so undersized pools are visible rather than silent.

**Deterministic teardown.** `PE.Teardown` is the only sanctioned way for a game
to register a listener, a rAF, a timer, a GL context, an `AudioContext`, or an
object URL. `destroyAll()` cancels and releases every one, calls `loseContext()`
on tracked GL contexts, closes audio graphs, revokes URLs, and exits pointer
lock. It is idempotent.

**LRU asset budget.** Voxel Drift's renderer holds a hard byte budget over
resident chunk geometry (96 MB, dropped to 64 MB on devices reporting ≤ 4 GB) and
evicts least-recently-drawn chunks — deleting the VAO and both buffers — when the
budget is exceeded. On `portal:lowmem` it shrinks both the budget and the render
distance. The portal side keeps the parallel LRU for *cached bundles* in
IndexedDB, shared with the service worker.

**iframe teardown as the real mechanism.** `GameSession.destroy()` sends
`portal:shutdown`, waits up to 250 ms for an ack, then navigates the frame to
`about:blank` and removes it regardless. The blank navigation is deliberate: it
drops the document, its heap, its GL contexts and its audio graph before the
element leaves the tree. A title that ignores shutdown entirely (the leak-test
bundle does, on request) is reclaimed anyway — verified in `tests/e2e.mjs`.

### 1.2 Canvas and context lifecycle

One live game frame at a time, enforced in `launcher.js`: `launch()` destroys the
current session before creating the next. Capability probing creates exactly one
throwaway context and explicitly loses it, so repeated visits to the diagnostics
page cannot walk the browser's ~16-context ceiling.

`PE.ResolutionScaler` clamps `devicePixelRatio` to 1 and sizes the backing store
at 0.5–1.0× of either CSS size or a fixed logical resolution. It is observable
and reversible at runtime: the player bar's resolution selector sends
`portal:settings` and the game applies it live, no reload.

**OffscreenCanvas.** Detected and reported (`capabilities.workerRendering`), and
deliberately *not* the baseline — see "Decisions" below. Voxel Drift moves the
expensive work (terrain generation and meshing) to a worker instead, which is
where the main-thread time actually goes in a chunked renderer.

### 1.3 Rendering

**Tiered, feature-detected.** `capabilities.detect()` probes WebGL2 → WebGL1 →
2D and also reports the GPU string, whether it is a software rasteriser,
instancing support, and max texture size. Each title declares
`minRendererTier`; unsupported titles get a friendly explanation and no play
button, and a direct `#/play/<id>` link is refused rather than launched into a
crash.

**Fixed timestep, interpolated render.** `PE.Loop` accumulates real time, steps
simulation at a fixed 60 Hz (max 5 steps per frame, then it discards the
backlog rather than compounding it), and hands the renderer an interpolation
alpha. Both 2D titles and the voxel title interpolate positions between the
previous and current step.

**Dynamic resolution before frame rate.** The scaler drops a step after 12
consecutive frames over 115 % of budget, and only raises after 240 frames
(~4 s) under 70 % of budget, with a cooldown after every change. If a step-up is
followed by a relapse within 4 s, that step is blocked for the rest of the
session — which is what stops the 60/45 oscillation the spec calls out. Voxel
Drift adds a second stage: render distance moves only once resolution is already
at its floor, one step at a time, with a 6-second cooldown.

**Draw-call discipline.** Voxel Drift: one procedurally generated texture atlas
bound once, one VAO per chunk, only air-adjacent faces meshed, per-chunk AABB
frustum culling, and quad triangulation flipped by AO gradient to avoid seams.
Prism Runner: one instanced draw call via `ANGLE_instanced_arrays`, falling back
to ≤ 96 per-object draws where the extension is missing — the fallback ships in a
real title rather than only existing in a test.

**2D specifics.** Orbital Salvage layers two canvases: a starfield painted once
per resize and never cleared, under a dynamic layer that is the only thing
cleared per frame. Schedule I keeps its logical 1280×720 coordinate space while
the backing store scales, by re-applying the transform on every resize.

### 1.4 Storage and bundles

`tools/build.mjs` inlines every local `<script src>` and stylesheet into one HTML
file per game, escapes `</script>` inside inlined source, hashes the result, and
writes `games.json`. Builds are deterministic, so `--check` in CI proves the
committed bundles match their sources. Per-bundle `budgetKB` is enforced at build
time and again in `tools/check-budgets.mjs`.

Bundles are fetched only on launch, at `games/<id>.html?v=<hash>`. Saves go to
IndexedDB (`gameportal` → `saves`), never `localStorage`; the e2e suite asserts
game frames keep `localStorage` empty.

---

## 2. Portal architecture

### 2.1 Shell

Vanilla ES modules, no framework, no build step for the shell. Critical CSS is
inlined in `index.html` so first paint needs zero round trips; the grid hydrates
from `games.json` after. Full keyboard operation: roving tabindex with 2D arrow
navigation across the grid (columns derived from layout, not assumed), `/` to
focus search, Escape to clear, Escape to leave a game when not pointer-locked.

### 2.2 Sandboxing and the bridge

Every game runs in
`<iframe sandbox="allow-scripts allow-same-origin allow-pointer-lock">`.

> **This is a resource boundary, not a security boundary.** `allow-scripts` plus
> `allow-same-origin` together mean same-origin script inside the frame is not
> contained — that combination is what makes pointer lock and same-origin
> `postMessage` work, and the spec requires it. It still contains what it is
> here to contain: crashes, leaks, runaway loops, orphaned GL contexts. Bundles
> in `games/` are first-party code reviewed like the rest of the repository. If
> third-party titles are ever hosted, they must move to a separate origin
> (a `*.games.example.com` per title, or a sandboxed subdomain) before they are
> trusted with `allow-same-origin`.

`allow-pointer-lock` is in the allowlist and verified end to end: the
`pointer-lock-probe` bundle requests the lock from inside a frame configured
exactly like a real launch, counts movement deltas, and reports both to the
portal. `#/diagnostics` runs it on demand; `tests/e2e.mjs` asserts it in CI.

**Bridge protocol (v1).** Every message is `{ type, token, … }`. The portal
generates a 128-bit token per launch; after the handshake, messages without it
are ignored, and the portal additionally checks `event.source` and `event.origin`.

| Direction | Message | Payload |
|---|---|---|
| game → portal | `game:hello` | `{ protocol, id }` — first contact, no token yet |
| portal → game | `portal:hello` | `{ token, tier, caps, save, settings }` |
| game → portal | `game:ready` | `{ needs: { tier, pointerLock } }` |
| game → portal | `game:save` | `{ data }` → IndexedDB, debounced game-side to ≤ 1 write / 2 s |
| game → portal | `game:score` / `game:progress` / `game:stats` / `game:pointerlock` / `game:error` / `game:exit` | |
| portal → game | `portal:pause` / `portal:resume` | on tab visibility change |
| portal → game | `portal:lowmem` | `{ level }` when headroom drops under ~120 MB |
| portal → game | `portal:settings` | `{ resolutionScale }` from the player bar |
| portal → game | `portal:shutdown` | game flushes, tears down, acks |

A game never touches portal storage: save state round-trips through the bridge.
Opened directly as a file, a bundle degrades to its own IndexedDB store.

### 2.3 Offline and caching

Three caches with three strategies:

- `shell-<hash>` — app shell, precached at install, cache-first. The hash is
  stamped into `sw.js` by the build from the shell sources, so a shell change
  invalidates the shell cache and a game change does not.
- `bundles-v1` — game bundles at `?v=<hash>` URLs, cache-first and never
  revalidated (a hit is proof the bytes are current). Storing a new version
  purges older versions of that path only.
- `runtime-v1` — thumbnails and icons, stale-while-revalidate.

`games.json` is network-first with a 2.5 s timeout and a cache fallback, so the
catalog refreshes online and opens offline. Quota-aware eviction kicks in above
85 % of the origin's quota and evicts least-recently-used bundles (LRU data
shared with the page through IndexedDB) down to 60 %.

One subtlety worth recording, because it is easy to get wrong: **loading a bundle
into an iframe is a navigation request**, so the bundle route must be matched
*before* the navigation handler, or the app-shell strategy answers it with
`index.html`. That bug is why the first integration run rendered the portal
inside the game frame.

PWA: `manifest.webmanifest` with 192/512 PNG icons (generated by
`tools/gen-icons.mjs`, which includes a small PNG encoder so the repo carries no
binary it cannot rebuild), `standalone` display, and an install prompt in the
header.

---

## 3. Hosting

See `deploy/README.md` for hosts, the GitHub Pages caching caveat, failover, the
`/play/<id>` edge routing gateway, and why token auth ships off by default.

---

## Decisions taken on the open questions

**Routing style — path per game.** `#/play/<id>` in the shell, `/play/<id>` at
the edge. Subdomains isolate origins and storage better, and that is exactly the
argument for moving to them *if third-party titles are ever hosted*; for a
first-party library they buy isolation we do not need at the cost of DNS,
certificates, and a per-origin service worker and IndexedDB store — which would
break offline play and saves across titles.

**OffscreenCanvas — an enhancement, not the baseline.** Support on older
ChromeOS builds is uneven, and a worker-rendered path that must also have a
main-thread fallback is two renderers to maintain. Voxel Drift instead moves
generation and meshing (the actual main-thread cost) to a worker built from a
Blob URL, so a single-file bundle keeps its worker, with an inline fallback where
`Worker` or `blob:` is unavailable. `capabilities.workerRendering` is detected and
surfaced in diagnostics for when a title genuinely needs it.

**Auth — not in v1.** No user data lives on the server and every title is
first-party. The mechanism is implemented and tested in the Worker
(`REQUIRE_TOKEN`, short-lived HS256 JWTs verified edge-locally, optional
per-title audience) so turning it on is a config change, not a project.

**Second host — Netlify as the mirror.** It applies `_headers`, needs no build,
and is already in the toolchain. Cloudflare Pages is the alternative if the edge
Worker becomes load-bearing.

---

## What the measurements do and do not cover

- **Heap figures are JS heap** (`JSHeapUsedSize` via CDP, after a forced
  collection). They exclude GPU allocations, which for Voxel Drift are the
  largest single consumer. The renderer reports its own resident geometry bytes
  in the HUD and in `game:stats`; total process memory has to be read from the
  browser's task manager on a real device.
- **Frame rates in this repo were measured on a software rasteriser** under a 4×
  CPU throttle. That is a pessimistic stand-in for an Intel UHD or Mali part, not
  a substitute for measuring on one.
- **Thermal throttling is not simulated.** A fanless chassis degrades over
  minutes; the 30-minute soak catches leaks, not thermal behaviour. Sustained
  frame rate on real hardware needs a real device.
- `performance.memory` is bucketed to ~10 MB granularity, which is why the
  harnesses use CDP instead. The in-game HUD still uses it, and is indicative
  only.

## Roadmap status

- **Phase 1 (MVP portal)** — complete: shell, router, manifest, launcher with
  pointer lock verified, four titles, IndexedDB saves.
- **Phase 2 (offline & resilience)** — complete: service worker, precache,
  per-bundle caching, PWA install, tier detection with graceful refusal.
- **Phase 3 (edge & access)** — configuration and the Worker are in the repo and
  documented; the failover drill and latency measurements need real hosts.
- **Phase 4 (hardening)** — soak, benchmarks and CI budgets are wired up.
  Remaining: allocation profiling on a physical low-end device, and per-device-class
  tuning of the initial resolution heuristic against real hardware.
