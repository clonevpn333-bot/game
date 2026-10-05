---
name: why-we-wonder
description: Make a WHY WE WONDER YouTube Short (30–45 s, 1080x1920) — the channel's cost-controlled hybrid pipeline: research → locked TTS narration → medium plan → procedural Canvas 2D / projected 3D / Three.js (Pip) / PiP shots → contact-sheet animatic → one critique → gate → Remotion render → targeted patch-splice → ≤25 MB MP4 sent in chat. Use whenever the user asks for a new WHY WE WONDER (formerly HOMO CURIOSUS) video, episode or short, or to patch one.
---

# WHY WE WONDER — production workflow

Channel identity: curiosity taking over the frame; diagrams becoming reality; reality annotated by drawings;
2D ideas colliding with 3D worlds; hidden systems revealed; mystery / science / history / engineering in one universe.
Brand: midnight navy #0D1630 · warm ivory #F2E8D0 · curiosity yellow #F2C230 · burnt orange #D45F1E (+ cyan, violet,
warning red #C8321E). Recurring motif: THE CURIOSITY LINE (`FILM.hc.line`). Captions: Fraunces 600; labels: JetBrains Mono.
Outro (always): the pellet/hero object alone in darkness → one big fact line in Fraunces → the curiosity line WRITES
"WHY WE / WONDER" in drawn monoline capitals → "STAY CURIOUS." in mono. Rules docs: `videos/REMOTION_RULES.md`,
`videos/HOMO_CURIOSUS_STYLE.md`.

## COST RULES (the user is cost-sensitive — obey strictly)
- No subagents unless the user explicitly asks. Build shots yourself.
- One contact sheet = the animatic. One critique pass. Patch only weak shots. Never regenerate the whole film for one shot.
- Render the final once; if a fix is needed, render ONLY the affected frame range (`--frames=a-b`) and splice with ffmpeg.
- Deliver ONE file via SendUserFile (display "attach"), ≤ 25 MB (two-pass x264; bitrate ≈ 25 MB·8 / duration − 160k audio).
- Don't send intermediate videos. Don't bother with GitHub for delivery (commit/push source only, renders are gitignored).

## 2D ART STANDARD (non-negotiable; ep5 broke this and the user called it out)
The 2D must look HAND-DRAWN, with intricate, obsessive linework. The bar is the origin film
(`videos/homo-curiosus-origin`). Its scenes use inkPath/inkCircle 57×, hatch 21×, stipple 7×, gradients 4×.
Ep5 used inkPath 0×, stipple 0× and gradients 37×, which is why it looked like flat vector clip-art.
- **Ink every form.** Outlines use `L.inkPath` / `L.inkCircle`: tapered, weight-varied, and boiling on twos (lib.T boil).
  Never draw a figure with bare `fill()` or flat `ctx.stroke()`.
- **Tone is drawn.** Use `L.hatch` / `L.crossHatch` with `density` functions that follow the form (contour hatching:
  2–4 layers deepening into shadow), plus `L.stipple` in the deepest darks. **Gradients are only for light**
  (glow, fog, sky, candle falloff), never to shade an object.
- **Obsessive detail budget per hero object:** a thick silhouette with thin interior lines; 3+ hatch layers; small marks
  (cracks, folds, stitches, embroidery, wood grain, mortar). Background objects still get ink and one hatch layer.
- **Plate.** `L.paper` / `L.blueprint` grain on every 2D shot (or a deliberate ink-on-black plate).
- **Type.** No `shadowBlur` glows, drop shadows or scale-slam titles on every beat (one slam per film at most).
  Type enters by stroke reveal, mask, or being written by the curiosity line. Fonts: Fraunces + JetBrains Mono, plus at
  most ONE period display face for one title moment.
- **Self-audit before the animatic:** grep the episode's scenes and kit for these counts. If gradients outnumber
  inkPath, or hatch/stipple are near zero, the shot isn't drawn yet. Fix it before rendering.

## HYBRID COHERENCE (2D × 3D)
- Never put a 3D object on a flat 2D body (ep5's ray-marched skull on a vector robe). For a hero assembly, either
  (a) build the whole thing in 3D (skull + robe + throne as one ray-marched or three.js scene), or (b) render the 3D with
  the engraving-hatch shader and draw the 2D parts in matching ink at the same line density, or (c) make the clash
  deliberate and readable (freeze-to-sketch, an annotation drawn over the 3D, a PiP opening over it).
- Use the interaction devices: freeze-to-sketch, annotations on 3D, PiPs over moving shots (2–4 per film), geometry morphs.
- Weave the curiosity line through the story at least 3 times (not only the outro). Shots should physically become the
  next one (REMOTION_RULES 8) instead of hard-cutting every beat.

## Project template
Copy the latest episode (`videos/cadaver-synod/` has the 3D skull, font loading and dark kit; `videos/neutron-star/` has space; `videos/dancing-plague/` has Pip + woodcut; `videos/poisoned-umbrella/` has noir/rain). For drawing standards, read `videos/homo-curiosus-origin/pf/src/scenes` first: `pf/` (procedural-film engine: core.js, lib.js, props.js
= FILM.hx + FILM.mk kit, cast.js = FILM.hc, tools/) and `remotion/` (symlink node_modules to
`videos/homo-curiosus-origin/remotion/node_modules`; ProcCanvas bridge, Captions with per-shot bands, Root/Film).
Scenes are `pf/src/scenes/NN-id.js` registering `FILM.scene({ id, draw(ctx, t, info) })`; one Remotion `ShotNN.tsx` each.
Kit (props.js FILM.mk): `cam/P3` pinhole 3D, `street` (wet night street), `rain`, `man` (noir silhouette figure — never
draw cartoon faces on humans), `brolly`, `pip()` branded PiP window (rect/circle, leader line, label tab), `callout`,
`label`, `sphere` (per-pixel lit 3D sphere from equirect texture), `board` (evidence board). Brand palette lives in lib.js pal.

## Steps
1. **Research** (1–2 WebSearch). Never invent key facts; hedge contested ones in the script ("historians suspect…").
2. **Script** ~80–95 words for 30–40 s. Hook in line 1. Last line = the striking fact (used in the outro).
3. **Lock narration**: `vo/script.txt` + `vo/gaps.json`; per line
   `cd videos/homo-curiosus-trailer && npx hyperframes tts "<line>" -v bm_george -s 1.12 -o <proj>/vo/assets/vo/lNN.wav --json`
   then `python3 videos/_shared/tools/timing.py <proj>/vo` → timing.json (word onsets). Copy vo.wav to remotion/public,
   run `remotion/scripts/captions.py`. Audio leads timing: cut on the 0.25 s grid against measured words.
4. **Medium plan** per shot: 2D / 3D / hybrid / PiP. Target: some pure 2D, some 3D, several hybrid, 2–4 meaningful PiPs.
   2D/3D must INTERACT (freeze-to-sketch, annotations on 3D, PiP opening over a moving shot, geometry morphs).
5. **timeline.js** (ids, files, start/end, mode 'illustrated'|'schematic') + palette additions in lib.js.
6. **Write scenes** (dense, deterministic: seed via lib.hash/rng, draw from t alone, on-twos for characters).
   Remember `lib.tracePath` does NOT begin a path — call `ctx.beginPath()` first.
7. **Animatic**: `node tools/snap.cjs --times <~20 key beats> --scale 0.3 --sheet --cols 10 --out .frames/anim`, Read it.
8. **One critique** (hook, composition, cut-off subjects, readability, PiP clutter, brand) → patch weak shots → re-snap only those.
   Also check: is every object inked and hatched (2D ART STANDARD)? Is anything shaded with a gradient? Any 3D/2D
   mismatch? How many PiPs (2–4)? How many curiosity-line beats (3+)? Are the entrances varied, or all the same slam?
9. **Gate**: `node tools/check.cjs` must have no FAIL (WARN ok). Text must end above y 1540.
10. **Score**: copy `tools/score.py` (python numpy + `_shared/tools/sfxlib.py`), cue every story beat, duck under VO;
    Remotion score volume ≈ 0.42 (≈ 8 dB under the voice).
11. **Render**: `cd remotion && npx remotion render <Comp> out/master.mp4 --crf=16 --concurrency=3` (background).
    remotion.config.ts uses `/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell` + swangle GL.
12. **Targeted critique**: one 15-frame tile from the MP4 (`ffmpeg … select … tile=15x1`). Patch-splice only if broken.
13. **Encode + send** (loudnorm I=-14:TP=-1.5), commit + push source, short summary to the user.

## Pip (optional 3D blob character) — works, but the USER REMOVED HIM from episode 3
Default: do NOT put Pip in an episode unless the user asks for him. Keep the tech below for when they do.
- `remotion/src/three/piplib.js` = `videos/_shared/lib.js` with imports pointed at `three/examples/jsm/...` (+ `// @ts-nocheck`).
- `remotion/src/three/Pip.tsx` `<PipLayer rig={(T) => PipState} start={shotStart} clip?={[cx, cy, r]} />`: plain three@0.181
  on a transparent canvas (makeRenderer: alpha + preserveDrawingBuffer), rendered in useLayoutEffect per frame — deterministic.
  `rig` gets GLOBAL time T and returns { x, y, scale, hop, lean, spin, turn, armL, armR, sq, visible, face:{eyes, mouth, …} }.
- `remotion/src/three/rig.ts`: `W2(sx, sy)` screen→world (558 px per unit, Pip's root = his feet, height ≈ 2.3·scale units)
  and `port(cx, cy, r, o)` to seat Pip inside a porthole.
- Layer order per shot: `<ProcShot id>` (2D world, porthole interior) → `<PipLayer>` (CSS clip-path circle for portholes) →
  `<ProcOverlay sceneId="<id>-fg">` (porthole ring / PiP frames drawn over Pip).
- Story device: Pip watches the dark 2D world through his porthole, then steps INTO the print in full 3D for reaction
  moments (gasp, dance along, spin out, tremble), and waves beside the outro wordmark.
- Face kit: eyes open|happy|closed|squeeze|x|narrow; mouth smile|grin|open|wobble|o|flat|smirk|scream|frown; wide, browUp,
  sad, sweat, blush, lookX/lookY. Never give realistic humans cartoon faces — humans are noir silhouettes or period prints.

## 2D world kits (pf/src/props.js)
- FILM.mk (episode 2): noir wet street, rain, silhouette man, umbrella, PiP windows, callouts, labels, lit spheres, board.
- FILM.wc (episode 3): woodcut print (figures support { walk: true } — always give moving people a real walk cycle, never slide them) — parchment paper, rigid gouge hatching, broadside frame, half-timbered houses,
  perspective street to a spire, period dancers/musicians (stiff stamped-puppet poses), Pip porthole.

## Later kits + lessons (ep4 neutron star, ep5 Cadaver Synod)
- FILM.sp (videos/neutron-star): space plate, emissive per-pixel stars, pulsar beams, dipole field lines, ray-marched gold ring.
- FILM.df (videos/cadaver-synod): dark-fantasy engraving kit + `df.skull3d` — a ray-marched SDF skull and papal tiara with
  candle key light, crimson rim, AO and an engraving-hatch shader (~0.5 s/frame). The user prefers real 3D hero objects
  over flat 2D ones. Silhouette humans only, rim-lit, with real walk cycles.
- Cached plates must never call time-dependent helpers (glowDot flickers with lib.T), or the determinism gate fails.
- Canvas webfonts: ProcCanvas waits on document.fonts (delayRender); install the same fonts as TTF into
  ~/.local/share/fonts so pf snaps match the render (Cinzel, UnifrakturMaguntia, Fraunces, JetBrains Mono).
- Hooks: words stamped on screen from frame ~0.1 s, motion on frame 0, camera punch, then cuts every 1.5–2 s.
- Music: never rip copyrighted tracks. Compose an original in the requested style, and ALSO deliver a NO_MUSIC cut
  (VO + SFX) so the user can add a licensed sound in the Shorts app. score.py writes score.wav, sfx.wav, music_only.wav.
- Always ship a vertical 1080×1920 cover (videos/brand/thumbs/<ep>-v fixture, rendered with snap --fixtures).
