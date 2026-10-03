# WORLD//SHIFT

A 3D open-world game set in one city that exists in three eras at once — **1996**, **2047** and **2189** —
and the player can shift between them instantly, staying in the same physical place.

## Run
```
cd worldshift
npx http-server . -p 8080      # or: python3 -m http.server 8080
# open http://localhost:8080
```
Rebuild after editing `src/`: `npm install && npm run build` (or `npm run dev` to watch).

URL options: `?era=0|1|2`, `?t=<hour>`, `?x=&z=` spawn, `?q=low|medium|high`, `?debug`.

## Controls
WASD move · mouse look · Shift sprint · Space jump/vault/mantle (dodge while aiming) · C crouch / slide ·
**1 / 2 / 3 shift to 1996 / 2047 / 2189** · **hold Q to peek** through time (wheel changes era) ·
E interact · F vehicle · LMB attack · RMB aim/block · R reload · J chronicle · M map · Esc pause.

## Architecture (src/)
- `core/` renderer + HDR post (bloom, era colour grade, shift distortion), input, synthesized audio
- `world/` district layout (2.7 km), procedural PBR texture arrays, uber world shader (interior-mapped
  windows, overgrowth, wetness, shift wavefront), era-aware building realisation (1996 → 2047 → ruin 2189),
  chunk streaming per era, far-LOD skyline, collision world
- `timeline/` Chronicle (cause → effect fact store with chunk dependency tracking), shift + peek system
- `actors/` procedural rig + blended animation, player controller, third-person camera
- `gameplay/`, `ui/` game loop, HUD, menus
