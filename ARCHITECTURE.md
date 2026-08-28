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

## site/games/summit/shared/ — imported verbatim by BOTH server and client
| file | what lives here |
|---|---|
| `shared/rng.js` | seeded PRNG, string→seed hash, Perlin `Noise` with `fbm`/`ridged`, math helpers |
| `shared/constants.js` | every tunable: tick rates, biome bands, stamina/survival/status tables, flight, room codes |
| `shared/mountain.js` | `createWorld(seed)` → height/normal/slope, guaranteed climbing route, campfires, beach, loot spots |
| `shared/locomotion.js` | `step()` — the one movement function (walk, climb, slide, swim, ghost, freefall/canopy) |
| `shared/survival.js` | vitals: hunger, temperature, statuses, damage, downed/bleed-out, consumables, campfire rest |
| `shared/items.js` | item catalogue with real weights, pack sizes, per-biome loot tables |
| `shared/protocol.js` | message-type constants, `enc`/`dec`, snapshot packing, player flag bits |

## server/ — Summit authoritative server (Node + ws)
| file | what lives here |
|---|---|
| `server/index.js` | HTTP + WebSocket bootstrap, message routing, fixed-step loop, `/health`, also serves `site/` |
| `server/rooms.js` | room registry: code generation, lookup, token→room, reaping empty rooms |
| `server/room.js` | one room: join/leave/reconnect, phase machine (lobby→flight→dive→climb→extract→results), snapshots, badges |
| `server/simulate.js` | per-tick authoritative simulation: input draining, modifiers, grapple/zipline/carry, survival, fall damage |
| `server/actions.js` | every player verb (pickup, use, give, rope, piton, grapple, zipline, boost, revive, carry, ping, horn, camp, board) |
| `server/loot.js` | world item spawning, containers, inventory add/remove with weight + slot limits |
| `server/shared.js` | single re-export point for the shared modules above |

## tools/
| file | what lives here |
|---|---|
| `tools/nettest.js` | headless 2-client integration test: full run through every phase, actions, reconnect, drop-out |
| `tools/climbsim.js` | proves a seed's route is climbable using the real movement code (`node tools/climbsim.js SEED`) |
| `tools/srv.sh` | start/stop the game server via pidfile |

## site/games/summit/client/ — the game client
| file | what lives here |
|---|---|
| `client/boot.js` | app shell: renderer, connection, screens, phase switching, frame loop |
| `client/net.js` | websocket client: prediction + reconciliation for you, interpolation for teammates |
| `client/audio.js` | synthesised sound: wind by altitude, footsteps, horn, impacts, fire |
| **gfx/** | |
| `gfx/textures.js` | every texture, generated: rock/snow/sand/jungle/ash/bark/fabric/leather/metal/wood/skin, leaves, clouds, water normals |
| `gfx/materials.js` | material library, shared height-fog block, terrain/water/foliage/cloud shaders |
| `gfx/sky.js` | analytic scattering sky, sun, day cycle, and the lights the scene uses |
| `gfx/clouds.js` | instanced cloud decks you climb through + the cloud sea below |
| `gfx/post.js` | bloom, depth-masked light shafts, ACES tone mapping, sRGB encode |
| `gfx/scene.js` | Stage: renderer settings, resize, quality levels, per-frame atmosphere |
| **world/** | |
| `world/terrain.js` | chunked LOD terrain + the static far mesh of the whole mountain |
| `world/flora.js` | procedural trunks, canopies, boulders, grass — geometry only |
| `world/scatter.js` | deterministic instanced placement of that flora by biome and cell |
| `world/water.js` | ocean ring and the shallow lagoon |
| `world/props.js` | campfires, crates, luggage, caches, pitons, anchors, fire particles, ping markers |
| `world/vehicles.js` | jump plane, extraction helicopter, hangar |
| `world/worldobjects.js` | mirrors the server's loot/anchors/ziplines/marks/flares/campfires into the scene |
| **char/** | |
| `char/rig.js` | the 25-bone skeleton and the segments used for skin weighting |
| `char/body.js` | builds the skinned climber: tubes, caps, head, boots, gear, per-part materials |
| `char/cosmetics.js` | outfits, hats, packs, skin tones, and the materials/extras they imply |
| `char/anim.js` | procedural pose library, blending, head look, emotes |
| `char/ik.js` | two-bone IK for hands on rock and feet on ground |
| `char/cloth.js` | verlet scarf and harness gear |
| **play/** | |
| `play/input.js` | pointer lock, keymap, trackpad-friendly look |
| `play/camera.js` | third/first person rig with terrain collision and shake |
| `play/climbers.js` | one visual climber per player: animation, cloth, ragdoll, parachute, name tag |
| `play/ragdoll.js` | verlet ragdoll that hands control back to the animator once it settles |
| `play/interact.js` | picks the interaction target, renders its prompt, dispatches actions |
| **ui/** | |
| `ui/game.css` | the game's whole visual language |
| `ui/kit.js` | `h()` helper + the local profile (coins, unlocks, look) |
| `ui/hud.js` | vitals, altitude ladder, team, prompt, belt, feed, banners, net readout |
| `ui/screens.js` | loading, main menu, settings, pause, control reference |
| `ui/lobby.js` | the hangar board: room code, roster, ready-up |
| `ui/shop.js` | cosmetics shop and post-run coin award |
| `ui/results.js` | stats table and badges |
| `ui/social.js` | chat line and emote wheel |
| **flow/** | |
| `flow/airfield.js` | the hangar, apron, waiting plane, crates, campfire |
| `flow/lobbyscene.js` | pre-flight scene + the flat world the lobby simulates against |
| `flow/run.js` | the run: streaming, climbers, camera, interaction, HUD, audio, day cycle |
| **dev pages** | `dev.html` (terrain), `char.html` (climbers), `textures.html` (texture sheet) |

## tools/ (additions)
| file | what lives here |
|---|---|
| `tools/playtest.js` | drives the real client through a whole run in a headless browser |
| `tools/duotest.js` | two real browsers in one room: roster, movement sync, reconnect |
| `tools/peek.js` | screenshots the 3D scene with the UI panels hidden |
| `tools/probe.js`, `tools/probe2.js` | evaluate an expression inside the running page (shader/state debugging) |
| `tools/shot3d.js` | screenshots a WebGL page once it sets `window.__ready` |
