# VOLTHAVEN — Build Contract

**Read this fully before writing a line.** Every module is written by a different agent in
parallel. This document is the only coordination mechanism. Violating it breaks the build.

---

## 0. Hard rules

1. **You own exactly one file.** Never edit any other file in `src/`. Never edit `build.js`,
   `tools/*`, or `volthaven.html` (it is generated).
2. **No external assets. Ever.** No image files, no model files, no audio files, no fonts
   beyond CSS generic families, no `fetch()`, no base64 blobs of captured media. Every
   texture, mesh, animation and sound is *computed in JavaScript at runtime*.
   The **only** external resource in the whole project is
   `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`.
3. **three.js r128 only.** `THREE.EffectComposer`, `UnrealBloomPass`, `OrbitControls`,
   `GLTFLoader`, and everything else from `examples/` **do not exist** — cdnjs ships the core
   build alone. Post-processing, controls, loaders: we write them. Available in core and used
   heavily: `WebGLRenderTarget`, `DepthTexture`, `ShaderMaterial`, `RawShaderMaterial`,
   `PMREMGenerator`, `DataTexture`, `CanvasTexture`, `SkinnedMesh`/`Skeleton`/`Bone`,
   `AnimationMixer` (r128 API), `InstancedMesh`, `BufferGeometry`, `Raycaster`, `Curve`,
   `ExtrudeGeometry`, `LatheGeometry`, `TubeGeometry`, `ShapeGeometry`.
   r128 notes: `renderer.outputEncoding = THREE.sRGBEncoding`, `texture.encoding`,
   `renderer.toneMapping = THREE.ACESFilmicToneMapping`, `geometry.setAttribute`,
   `material.vertexColors = true` (boolean). `BufferGeometry.merge` does NOT exist —
   `THREE.BufferGeometryUtils` is an example file and is NOT available; if you need geometry
   merging, use `VH.util.mergeGeometries()` from `05_util.js`.
4. **After every edit run:** `node --check src/<yourfile>.js` and then
   `node build.js --out /tmp/vh_<yourname>.html --quiet`. Never leave the build red.
5. **Look at what you built.** `node tools/shot.js /tmp/x.png --file /tmp/vh_<yourname>.html`.
   Never claim a visual result you have not screenshotted.
6. **Performance target: 60fps at 1600x900 on integrated graphics.** Budget: < 400 draw
   calls, < 900k triangles visible, <= 12 realtime lights with shadows off except 1 shadow
   caster. Use `InstancedMesh` for anything repeated. Neon is emissive material + bloom,
   NOT a point light, except where a light is gameplay-critical.
7. **Prefer targeted edits over rewrites** once a file has content.

---

## 1. Load order and namespace

Files are concatenated in this order inside one IIFE:

```
05_util.js  10_core.js  20_materials.js  30_world.js  40_chars.js  50_combat.js
60_ai.js    70_story.js 80_missions.js   90_audio.js  95_ui.js     99_main.js
```

Because everything shares one scope, **prefix every top-level name you create** and attach
your public API to the single global:

```js
window.VH = window.VH || {};
VH.Combat = (function () {
  // ... all your internals live in this closure ...
  return { init, update, /* ... */ };
})();
```

**Never execute scene-building work at load time.** Define only. `99_main.js` boots.

---

## 2. Lifecycle

`99_main.js` calls, in order:

```
VH.Audio.init()                 // may be deferred until first gesture
VH.Core.init(canvas)            // renderer, scene, camera, post stack
VH.Mat.init(VH.Core.renderer)   // procedural textures/materials/env map
VH.World.build(seed)            // returns a World handle (see §4)
VH.Chars.init()
VH.Combat.init()
VH.AI.init()
VH.Missions.init()
VH.UI.init()
```

then each frame, in order:

```
VH.Missions.update(dt)   VH.AI.update(dt)      VH.Combat.update(dt)
VH.Chars.update(dt)      VH.World.update(dt)   VH.Audio.update(dt)
VH.UI.update(dt)         VH.Core.render(dt)
```

`dt` is seconds, clamped to <= 1/20. Never use raw `Date.now()` deltas.

Every module must tolerate being called before its data exists (e.g. `if (!ready) return;`).

---

## 3. Shared context — `VH.ctx`

Created by `99_main.js` before `init`. Read it; do not replace it.

```js
VH.ctx = {
  scene, camera, renderer,        // from Core
  player: null,                   // Actor, set by Chars/Combat
  actors: [],                     // ALL living Actors incl. player
  enemies: [],                    // subset, hostile & alive
  world: null,                    // World handle from VH.World.build
  time: 0, dt: 0, frame: 0,
  paused: false,
  timeScale: 1,                   // slow-mo; Combat owns it, everyone multiplies by it
  input: VH.Input,                // see §6
  flags: {},                      // story/global flags, string -> any
}
```

### Actor (the one shared entity shape)

Created by `VH.Chars.create()`. Everyone reads these fields; only the listed owner writes.

```js
{
  id: 'e12',
  group: THREE.Group,        // root; group.position is FEET on ground
  kind: 'player'|'enemy'|'npc',
  archetype: 'kas'|'grunt'|'shield'|'sniper'|'drone'|'brute'|'netrunner'|'civ'|<npc id>,
  team: 0 /*player*/ | 1 /*hostile*/ | 2 /*neutral*/,
  hp, maxHp, armor, alive: true,
  radius: 0.42, height: 1.78,
  vel: THREE.Vector3,        // owner: Combat (player) / AI (enemies)
  yaw: 0,                    // facing, radians; owner: Combat/AI
  state: 'idle',             // animation intent, see §7 vocabulary
  stagger: 0,                // >0 = in hit reaction, cannot act
  iframes: 0,                // >0 = invulnerable
  aim: THREE.Vector3,        // world point this actor is aiming at
  weapon: null,              // Weapon instance, owner: Combat
  anim: {},                  // owner: Chars ONLY
  ai: {},                    // owner: AI ONLY
  headPos(): THREE.Vector3,  // world-space head/aim node
  chestPos(): THREE.Vector3,
}
```

### Event bus (`05_util.js` provides it)

```js
VH.on(name, fn); VH.off(name, fn); VH.emit(name, payload);
```

Canonical events — **use these exact names**:

| event | payload | emitted by |
|---|---|---|
| `hit` | `{attacker, target, dmg, point, normal, part:'head'|'body'|'limb', weapon, crit}` | Combat |
| `kill` | `{attacker, target, part}` | Combat |
| `playerHit` | `{dmg, from}` | Combat |
| `fire` | `{actor, weapon, origin, dir}` | Combat |
| `reload` | `{actor, weapon}` | Combat |
| `dash` | `{actor, dir}` | Combat |
| `melee` | `{actor, hit}` | Combat |
| `focusStart` / `focusEnd` | `{}` | Combat |
| `alert` | `{actor, level}` | AI |
| `objective` | `{id, text, done}` | Missions |
| `missionStart` / `missionEnd` | `{id, outcome}` | Missions |
| `dialogue` | `{speaker, text, portrait, choices?}` | Missions/Story |
| `beat` | `{id}` | Missions — story beat for UI/audio stings |
| `shake` | `{amount, dur}` | anyone → Core |
| `hitstop` | `{dur}` | Combat → Core |
| `notify` | `{text, kind}` | anyone → UI |

---

## 4. Module APIs (the integration surface)

### `VH.Core` — 10_core.js
```
init(canvas) -> void            // renderer, scene, camera, render targets, post chain
render(dt) -> void
camera, renderer, scene         // properties
setQuality(0|1|2)
shake(amount, dur)              // also listens to 'shake' event
hitstop(dur)
resize()
env                             // THREE.Texture (PMREM env map) for Mat to use
registerLight(obj3d, opts)      // dynamic light budget manager, returns handle
```
Owns: tone mapping, bloom, SSAO, volumetric fog/god rays, rain-on-lens, chromatic
aberration, vignette, grain, FXAA, color grade, camera rig + follow/aim behaviour hooks.
**Camera transform is written by Core each frame** from `VH.Core.camTarget` which
Combat sets: `{pos:Vector3, look:Vector3, fov:number, shakeMul:number}`.

### `VH.Mat` — 20_materials.js
```
init(renderer) -> void
get(name) -> THREE.Material     // cached, shared. Never mutate a returned material.
tex(name, opts) -> THREE.Texture
makeSign(text, opts) -> THREE.Texture   // procedural neon sign / kanji-ish glyph plate
palette                          // named colors, the game's art bible
noise2D(x,y), fbm(x,y)          // exported so World/Chars share the same noise
```
Named materials that MUST exist (World/Chars/Combat depend on them):
`asphalt, asphaltWet, concrete, concreteStain, metalPanel, metalRust, glassDark,
glassLit, neonCyan, neonMagenta, neonAmber, neonRed, neonGreen, plasticBlack,
fabricDark, skin, chrome, decal, holo, water, trimLit`

### `VH.World` — 30_world.js
```
build(seed, districtId) -> World
update(dt)
World = {
  group: THREE.Group,           // added to scene by main
  colliders: [ {type:'box'|'cyl', ...} ],   // static collision
  navSample(x,z) -> {y, walkable}           // ground height query
  spawns: { player: Vector3, enemy: [Vector3], cover: [{pos,normal}] },
  bounds: THREE.Box3,
  lights: [],
  district: 'undertide'|'spine'|'market'|'spire'|'rooftops'|'transit'|'sablecore',
}
raycastGround(x, z) -> y
segments()                       // list of buildable district ids
```

### `VH.Chars` — 40_chars.js
```
init()
create(archetype, opts) -> Actor      // builds mesh + rig + animation state
update(dt)                            // advances all actor animation
play(actor, clipName, opts)           // request animation, see §7
lookAt(actor, worldPoint)             // additive head/torso aim
portrait(id, size) -> canvas          // procedural character portrait for dialogue UI
```

### `VH.Combat` — 50_combat.js
Owns: player controller, camera target, weapons, projectiles/hitscan, damage,
hit reactions, dash, melee, focus (slow-mo), targeting/magnetism, collision resolution
against `world.colliders`, and `VH.ctx.timeScale`.
```
init(); update(dt)
spawnPlayer(pos)
damage(target, amount, opts)          // single choke point for all damage
weapons                               // catalog
giveWeapon(actor, id)
```

### `VH.AI` — 60_ai.js
Owns enemy brains, squad coordination, spawning of hostiles, telegraphs.
```
init(); update(dt)
spawn(archetype, pos, opts) -> Actor  // uses VH.Chars.create + registers
clearAll()
setAlert(level)
```

### `VH.Story` — 70_story.js
**Pure data + text. No three.js, no DOM.** The campaign script.
```
VH.Story = {
  title, tagline,
  characters: { id: {name, role, voice, portraitSeed, bio} },
  acts: [ {id, title, missions:[missionId]} ],
  missions: { id: { id, act, title, subtitle, district, brief,
                    objectives:[{id,text,type,...}],
                    script: [ Beat... ],      // see §8
                    onComplete: {flags, unlocks} } },
  dialogue: { nodeId: {speaker, text, choices:[{text, goto, flag}], ...} },
  codex: [...], barks: {archetype:[lines]},
}
```

### `VH.Missions` — 80_missions.js
Runtime that executes `VH.Story` scripts: spawns, triggers, objective tracking,
cutscene camera, dialogue playback, act/mission flow, save/continue.
```
init(); update(dt)
start(missionId); complete(); fail(reason)
current                                // {id, objectives, ...}
goto(missionId)                        // debug/skip
```

### `VH.Audio` — 90_audio.js
Pure WebAudio synthesis. No files.
```
init(); update(dt)
play(name, opts) -> handle             // one-shots
music(stateName)                       // 'explore'|'combat'|'tension'|'boss'|'sad'|'menu'
ambience(districtId)
voice(speakerId, text)                 // stylised vocal texture, not TTS words
```
Must self-suspend until first user gesture (browser autoplay policy) — `VH.Audio.unlock()`.

### `VH.UI` — 95_ui.js
DOM + canvas overlay. Title screen, HUD, damage feedback, dialogue box with choices,
objective tracker, codex, pause, mission intro cards, death/retry, credits.
```
init(); update(dt)
showDialogue(node, cb); hideDialogue()
setObjectives(list); toast(text, kind)
titleScreen(); missionCard(mission, cb)
```

---

## 5. Art direction bible (binding on everyone)

**Volthaven** — a vertical coastal megacity built over a drowned harbour. Ash-grey concrete
and salt corrosion, not chrome and purple. The look is **wet, dense, and lived-in**.

- **Value structure**: the world is DARK (background luminance ~0.02–0.06). All brightness
  comes from *sources* — signage, windows, headlights, screens — and their reflections in
  standing water. Never flat-lit. Never a uniform ambient wash.
- **Hue discipline**: base palette is desaturated teal-grey and warm sodium amber.
  Accents: `#00e5ff` cyan (corporate/Sable), `#ff2d6f` magenta-red (Undertide/Ninefold),
  `#ffb340` sodium amber (street/civic), `#7cff5a` toxic green (medical/illegal), sparingly.
  Two dominant hues per shot, third as 5% accent. **No rainbow neon.**
- **Fog is the depth cue**: heavy height fog, colored by nearby emitters. Distant buildings
  should read as flat silhouettes with only window grids visible.
- **Wetness**: every horizontal surface is partly wet — roughness variation via mask,
  vertical drips, puddles that mirror the signage above them. This single feature does
  more for the "2077 look" than anything else. Prioritise it.
- **Density**: never an empty street. AC units, cable runs, pipes, satellite dishes,
  laundry lines, fire escapes, vending kiosks, trash, bollards, planters, parked vehicles,
  crowd silhouettes, drifting steam from grates. Repetition is fine — use InstancedMesh.
- **Signage** carries the storytelling: brand names from the fiction (see §9), in a mix of
  large vertical blade signs, wall-washed logos, and small window decals.
- **Framing**: strong verticals, deep perspective corridors, foreground occluders.
- **Anti-goals**: purple/teal only palette, evenly spaced identical cubes, glowing grid
  floors, chrome spheres, "TRON" lines, Comic Sans-tier fonts, flat unlit ground plane.

---

## 6. Input — trackpad-first. This is a hard constraint.

**No Pointer Lock. Ever. Assume a MacBook trackpad with no external mouse, one button,
two-finger scroll.** Design for it; do not add it as a fallback.

`VH.Input` (provided by `05_util.js`, extended by Combat) exposes:

```js
VH.Input = {
  keys: {},               // keys['KeyW'] === true  (event.code)
  mouse: {x, y, nx, ny},  // px and normalized -1..1 from screen centre
  down: false, rightDown: false,
  wheel: 0,               // accumulated this frame, reset by Combat
  pressed(code), released(code),   // edge queries, valid for one frame
  clickedThisFrame: false,
}
```

### The control scheme (do not redesign it unilaterally)

| Action | Binding | Notes |
|---|---|---|
| Move | `W A S D` | camera-relative |
| Camera yaw | **cursor X distance from screen centre**, rate-based, dead zone 18% | plus `Q`/`E` nudge |
| Camera pitch | cursor Y, clamped, smaller authority | |
| Aim | **absolute cursor position** = reticle | no lock, no recentring |
| Fire | left button **hold** (auto weapons) or click | |
| Soft lock | generous target magnetism cone around reticle; reticle snaps + swells over a valid target | this is what makes a trackpad viable — tune it hard |
| Cycle target | `Tab` / `Shift+Tab`; two-finger scroll also cycles when a target is held | |
| **Focus** (signature mechanic) | hold `Space` — timeScale drops to 0.28, aim assist widens, a "mark" reticle lets you tag up to 4 body parts; release to execute the marked burst | this is the answer to "no mouse precision" — it's a *design* answer, not an accessibility fallback |
| Dash | `Shift` + direction, i-frames 0.22s, 2 charges, 1.6s recharge | |
| Melee | `F` | |
| Reload | `R` | |
| Weapon swap | `1..4`, or two-finger scroll when no target held | |
| Interact | `E` | |
| Cover snap | auto when moving into cover geometry | no button |
| Pause | `Esc` | |
| Dialogue choice | number keys AND clicking the line | |

Everything must be playable one-handed-ish: no chord requiring >2 simultaneous keys plus
mouse. No double-click timing tests. No drag gestures longer than 300ms.

---

## 7. Animation vocabulary (Chars ↔ Combat/AI shared)

`actor.state` is set by Combat/AI; Chars reads it and blends. Legal values:

`idle, walk, run, sprint, strafeL, strafeR, back, dash, jump, fall, land,
aim, fire, reload, melee1, melee2, hitL, hitR, hitHeavy, stagger, death,
cover, coverPeek, vault, crouch, interact, talk, sit, dead`

`VH.Chars.play(actor, 'fire')` = one-shot overlay that returns to `actor.state`.
Every one-shot must have real **anticipation → contact → recovery** framing; snap-to-pose
is the single biggest tell of a tech demo.

---

## 8. Mission script beats (Story ↔ Missions)

`mission.script` is an array of beats executed in order by `VH.Missions`:

```js
{t:'spawn',    at:'plaza_a', archetype:'grunt', count:3, alert:0}
{t:'wave',     at:[...], units:[{a:'grunt',n:4},{a:'shield',n:1}], onClear:'next'}
{t:'dialogue', node:'m02_intro'}            // blocks until done
{t:'bark',     speaker:'cantor', text:'...'}// non-blocking
{t:'objective',id:'reach_lift', text:'Reach the freight lift', marker:[x,y,z]}
{t:'wait',     until:'objective:reach_lift'}
{t:'camera',   move:'establish', target:[x,y,z], dur:4}
{t:'flag',     set:{metOye:true}}
{t:'branch',   on:'flag:sparedBishop', yes:[...beats], no:[...beats]}
{t:'music',    state:'combat'}
{t:'spawnBoss',archetype:'sable', at:'spire_core'}
{t:'end',      outcome:'success'}
```
If Story needs a beat type Missions doesn't have, Story's author must note it in
`VH.Story.requiredBeats` and Missions' author implements it. Both agents: check that array.

---

## 9. Fiction bible (binding — names, brands, voice)

**Title:** *VOLTHAVEN*.
**City:** Volthaven, built on the flooded ruin of a harbour called the Shelf.
**The Choir:** the tidal-fusion lattice that powers the city. It is stabilised by borrowed
neural idle-cycles harvested from sleeping citizens through their implants. People who go
too deep never come back up. The city calls them **the Quiet**.

**Protagonist — Rin "Kas" Kasavin** (she/her). Former Sable *resonance auditor*: she tuned
people's implants to the Choir. She is complicit; that is the point. Dry, clipped, allergic
to speeches. Wants absolution she doesn't believe in.

**CANTOR** — a degrading AI fragment of the Choir's original conductor, living in Kas's
failing implant. Speaks in fragments of liturgy and signal-processing jargon. It is dying,
and it is the only thing that loves her. The buddy voice of the game.

**Auriel Sable** — architect of the Choir, Kas's former mentor. Believes the arithmetic:
a few thousand Quiet to keep nine million lit. Never raises her voice. Correct about the
numbers and monstrous anyway. Not a mustache-twirler — she must be *persuasive*.

**Bishop** — leader of the Ninefold, from the Undertide. Wants to cut the Choir and let the
city go dark, knowing the cost. Charisma, real grievance, and a body count.

**Oyelaran "Oye" Fesi** — ripperdoc, keeps Kas alive, warm and profane. His daughter Ife is
in the Quiet. He is the emotional cost of every choice.

**Nadia Kwon, "Wick"** — ex-Sable enforcer. Sardonic, competent, compromised. The midpoint
betrayal runs through her.

**Districts:** Undertide (flooded lower decks), the Spine (elevated freeway strip), Kettle
Market, the Rooftops, Transit (mag-line), Sable Core, the Spire.
**Brands for signage:** SABLE, ANDRADE-SABLE CONTINUITY, KETTLE, NINEFOLD, HALCYON NOODLE,
DRY DOCK 9, VOLT-EX, SALTLIGHT, PACHINKO OSAKI, GLASSJAW, MERIDIAN CLINIC, TIDEWATER,
FIRSTLIGHT LOANS, CHOIR PUBLIC UTILITY. Use these; do not invent Blade-Runner knockoffs.

**Tone:** grief and infrastructure. Not "cool hacker punches corp." The best line in the
game should be quiet.

**Anti-goals for writing:** no "the year is 2077", no exposition dumps in the first 60
seconds, no character who exists only to explain, no quips at emotional beats, no
"jack in and hack the mainframe", no chosen-one framing.

---

## 10. Debug hooks (every module helps populate these — required by the test harness)

```js
VH.booted = true                 // set by 99_main when the first frame has rendered
VH.debug = {
  state()      -> {mission, objectives, enemies, hp, fps, district, pos}
  goto(id)     -> jump to mission id
  freecam(pos, look)
  spawn(archetype, n)
  kill()       -> kill all enemies (skip encounter)
  god(bool)
  timeScale(n)
  seed(n)
}
```
Query flags the harness uses: `?cap=1` (renderer must be created with
`preserveDrawingBuffer:true` when present), `?mission=<id>`, `?nointro=1`, `?seed=<n>`,
`?quality=0|1|2`, `?god=1`.

---

## 11. Definition of done for your piece

- `node --check` clean, `node build.js` clean, **zero console errors** in `tools/shot.js`.
- You have personally screenshotted (or contact-sheeted, for motion) the result and it
  looks/behaves the way you claim.
- 60fps at the stated budget.
- It integrates: you did not change any other file, and every API above that you promised
  to provide exists with the promised signature.

---

## 12. Sandbox facts you need (read this, it will save you an hour)

- **cdnjs is blocked by egress policy inside this sandbox.** The shipped HTML still points at
  `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` — do not change that.
  `tools/shot.js` and `tools/strip.js` intercept that URL and serve the byte-identical r128
  build from `tools/three.r128.min.js`. So capture works; plain `curl` to cdnjs will not.
- **Chromium here runs on SwiftShader (software GL).** The `fps` number reported by the
  harness is meaningless — expect 4-15fps. **Never tune performance against it.** Hold the
  budget structurally instead: count draw calls (`renderer.info.render.calls`), triangles
  (`renderer.info.render.triangles`), and programs. The harness prints
  `VH.debug.state()`; add whatever you need there. Targets: **< 400 draw calls,
  < 900k triangles, < 60 shader programs.** Software rendering also means: heavy fragment
  shaders make capture *slow*, not broken — if a screenshot takes 60s, that is expected.
- **`THREE.CapsuleGeometry` does not exist in r128** (added in r132). Nor do
  `BufferGeometryUtils`, `EffectComposer`, `RoundedBoxGeometry`, `OrbitControls`,
  `SimplexNoise`, `Line2`, `MeshLine`. Build capsules from `CylinderGeometry` +
  two `SphereGeometry` halves, or use `LatheGeometry`.
- **Build tolerantly while others are working:**
  `node build.js --tolerant --out /tmp/vh_<yourname>.html --quiet`
  In `--tolerant` mode any module that currently fails `node --check` (because another agent
  is mid-write) is swapped for its stub and a warning is printed, so you are never blocked
  by someone else's half-saved file. Your own file must still be clean.
- Put screenshots in `/home/user/game/.shots/<yourname>_*.png` (gitignored) and **Read them**.
  You cannot judge a render you have not looked at.
