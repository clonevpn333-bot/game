# Architecture map

One line per file. Read this to orient — not the source.
Rule: no file over ~400 lines. If one grows past it, split it.

## Root
| file | what lives here |
|---|---|
| `package.json` | scripts (`npm run server`, `npm run site`, `npm run check`), deps (`ws`, dev: `three`, `playwright`) |
| `netlify.toml` | Netlify publish dir (`site`), headers, `/h/*` → `hub.html` rewrite |
| `ARCHITECTURE.md` | this map |
| `README.md` | how to run everything, how friends connect to Summit |

## tools/
| file | what lives here |
|---|---|
| `tools/devserver.js` | static server for `site/` that mirrors the Netlify rewrites (`node tools/devserver.js 4321`) |
| `tools/check.js` | `node --check` across every JS file; the fast validation pass |
| `tools/shot.js` | headless Chromium screenshot + console/network error report |

## site/ — Nova Arcade (the hub, deployed to Netlify)
| file | what lives here |
|---|---|
| `site/index.html` | entry gate: mints a private key and redirects to `/h/<key>` |
| `site/hub.html` | hub shell (fonts, css, `#app`, loads `js/main.js`) |
| `site/css/tokens.css` | palette, type scale, spacing, motion tokens — single source of truth |
| `site/css/base.css` | reset, base typography, film grain, focus/scrollbar styling |
| `site/css/ui.css` | buttons, chips, fields, overlays, toasts, view-transition keyframes |
| `site/css/hub.css` | chrome, hero, rails, cards, detail view, player, footer |
| `site/js/main.js` | bootstrap: key validation, chrome, search wiring, route table |
| `site/js/session.js` | private-link keys: mint (128-bit CSPRNG base62), adopt, retire, regenerate, path parsing |
| `site/js/store.js` | per-key profile: favourites, recents, play counts + a small prefs bucket |
| `site/js/manifest.js` | loads `games/games.json`, lookup/search/category helpers |
| `site/js/art.js` | procedural cover art (canvas): motifs `summit`/`neon`/`vector`/`prism`/`metro` |
| `site/js/router.js` | History-API router under `/h/<key>`, view swap + transitions |
| `site/js/ui/dom.js` | `h()` element helper + inline icon set |
| `site/js/ui/toast.js` | transient toasts |
| `site/js/ui/card.js` | one game card (art, badge, favourite, play affordance) |
| `site/js/ui/rail.js` | horizontal rail with paging buttons + `grid()` |
| `site/js/ui/hero.js` | auto-advancing featured hero |
| `site/js/ui/linksheet.js` | "your private link" sheet: copy / regenerate |
| `site/js/views/library.js` | library view: hero + rails, or filtered grid when searching |
| `site/js/views/detail.js` | game detail page (facts, tags, related) |
| `site/js/views/player.js` | immersive sandboxed-iframe player with fullscreen |
| `site/games/games.json` | **the manifest** — add a game by dropping a folder in `site/games/` + one entry here |
| `site/games/<id>/` | each game, self-contained |
| `site/vendor/three/` | vendored three.js module build (no CDN at runtime) |
