# 11 — PERFORMANCE / OPTIMIZATION

**Game:** SMALL HOURS — The Ashgrove Study (single-file browser horror; Three.js r128 UMD for
lighting / shadows / post only; all models hand-built from primitives).
**Symptom reported:** "super laggy — can't even look around at 30fps."
**Goal of this doc:** find the hotspots and specify concrete, drop-in fixes (compatible with the
current `r128` API) to comfortably clear 30 fps and realistically hit 60 on a mid laptop iGPU.

> **Verification note.** Diagnosis is grounded in a full read of the shipping
> `SMALL_HOURS.html` (line numbers cited throughout). The performance principles were
> corroborated with live web searches (three.js docs + forum, Discover three.js, and the
> three.js performance gists — links at the bottom). The single most important fact —
> *a forward renderer shades every lit fragment against every visible light, every
> frame* — is confirmed by both the three.js forum ("you end up looping over each light
> for each pixel on the screen") and the WebGLRenderer's known `NUM_POINT_LIGHTS`
> shader-recompile behaviour. Numbers below are first-order estimates, not profiled
> captures; treat the **ranking** as the reliable part and re-measure with the
> on-screen counter (Appendix C) after each change.

---

## 0. TL;DR — the five fixes that matter (do them in this order)

| # | Fix | Effort | Expected gain (looking around, standing still) |
|---|-----|--------|-----------------------------------------------|
| 1 | **Cull PointLights to the nearest 8 each frame** (`.visible=false` on the rest). The scene has **66** PointLights; the forward renderer currently shades *every fragment against all of them*. | ~20 lines | **Massive — the single biggest win.** Easily 2–4× frame rate. This alone likely takes you from <30 to 60. |
| 2 | **Cut real-time shadows from 11 maps to 0–1.** There are **10 shadow-casting PointLights (each a 6-face cube render) + the flashlight SpotLight**. That is up to ~61 extra scene renders per frame. Set `renderer.shadowMap.autoUpdate=false` (bake once) or disable shadows entirely. | ~10 lines | **Very large.** 1.5–3×. The VHS/grain filter hides the loss of contact shadows almost entirely. |
| 3 | **Clamp pixel ratio to 1.0** (`setPixelRatio(Math.min(devicePixelRatio,1))`), and optionally render at 0.75–0.85 internal scale and upscale. Currently capped at **1.5**, i.e. up to **2.25× the pixels** on a HiDPI/Retina screen. | 1 line | **Large on HiDPI, fill-rate-bound machines.** On a 2× display, dropping 1.5→1.0 is ~**2.25× fewer fragments**; the bloom + VHS passes scale with this too. |
| 4 | **Make bloom cheap / optional** and confirm VHS is single-pass. UnrealBloom is a multi-pass mip pyramid run at full screen resolution; it is the most expensive post pass. | ~5 lines | **Moderate–large**, ~1.2–1.5×, and it compounds with fix #3 (post passes are fragment/fill-rate bound). |
| 5 | **Stop per-frame face CanvasTexture re-uploads** and reduce draw calls by sharing/merging static geometry. The `_redraw=true` flag is set every frame for visible characters (L1079/L1082), forcing a 512×512 GPU re-upload; the scene is also thousands of individual `Mesh`es (high draw-call count). | ~30 lines | **Moderate.** Texture fix removes a per-frame CPU→GPU stall during dialogue; draw-call merging mostly helps lower-end GPUs and load time. |

Apply #1 and #2 first and re-measure before touching anything else — they are ~80% of the win and the rest may become unnecessary.

---

## 1. The scene as it actually is (measured from the source)

I counted the real object population rather than trusting the round numbers in the brief:

**Lights (`scene` total):**

| Kind | Count | Where | Cost note |
|------|------:|-------|-----------|
| `PointLight` (ceiling) | **43** | `ceilLight()` — incl. loops at L519 (×7) and L624 (×6) | All added to `WORLD.group`, all `.visible` by default |
| `PointLight` (monitors) | **6** | `propMonitor()` ×6 (L524,527,532,538,559,581) | green screen glow |
| `PointLight` (props/accent) | **16** | fishtank, room-3 red, courtyard, sleep-lab ×5, nurses, observation ×5, boiler, shipping | |
| `PointLight` (camera fill) | **1** | L724, parented to `camera` | should always stay on |
| **PointLight TOTAL** | **66** | | **This is the headline problem.** |
| `SpotLight` (flashlight) | 1 | L719, `castShadow=true` | being removed by design — see §4 |
| `HemisphereLight` | 1 | L716 | cheap, keep |
| `AmbientLight` | 1 | L717 | cheap, keep |

> The brief estimated "~42 PointLights." The true number is **66**. That makes fix #1 even
> more valuable than expected: a forward renderer's fragment shader loops over *all* of
> them. r128 also recompiles material shaders when the count of each light *type* in view
> changes, so an uncontrolled, varying light count can additionally cause shader-compile
> hitches — culling to a *fixed* budget (always exactly N visible) avoids that too (see §3.1).

**Shadow-casting lights (real-time shadow maps):**

`ceilLight(...,shadow=true,...)` is set at: L492 (1), L519 loop `i===2||i===5` (2), L531 (1),
L564 (1), L599 (1), L602 (1), L624 loop `i===1||i===4` (2), L663 (1) = **10 shadow-casting
PointLights**, **each `mapSize 1024×1024`** (L294). A PointLight shadow is a **cube map → the
scene is re-rendered 6 times per light**. Plus the **flashlight SpotLight** shadow (1024², 1
extra render, L720).

> **Worst case ≈ 10×6 + 1 = 61 extra full-scene depth renders per frame**, on top of the main
> render and the post stack. Even with `autoUpdate` culling only re-rendering changed maps,
> this is the second-biggest cost. The flickering lights (L1084) change intensity constantly,
> which can keep their shadow maps marked dirty.

**Geometry / draw calls:** every prop helper (`box`, `deco`, `cyl`, `sph`, `propChair`,
`propBed`, `propShelf`, …) creates an **individual `THREE.Mesh`** added to one `WORLD.group`
(see `mesh()` L262). With ~20 rooms of furniture plus **261 colliders' worth of boxes**, the
scene is on the order of **1–2k draw calls**. Each humanoid (`buildHuman`) is ~25 separate
meshes; there are 4–5 humans. Draw-call count is a CPU cost (mostly hurts low-end and load
time); it is real but secondary to lights/shadows here.

**Post:** `EffectComposer` = `RenderPass` → `UnrealBloomPass(res=innerWidth×innerHeight,
strength .55, radius .7, threshold .82)` (L731) → `ShaderPass(VHS)` (L732). Bloom is sized to
the **full window**, not a reduced resolution.

**Per-frame texture upload:** in `tick()` (L1079) every visible talking character gets
`c.p._redraw=true` *every frame*, and `buildHuman.update` (L472–473) then repaints a **512×512
canvas face** and sets `faceTex.needsUpdate=true` → a full texture re-upload to the GPU **every
frame** during any dialogue. The author *intended* throttling (`this._faceT` gate, 0.05s) but
the `_redraw` flag bypasses the intent because it's re-armed each frame, so the gate only limits
to once per `_faceT` window *but the flag forces a redraw whenever talk/blink is active*. Net:
heavy, frequent re-uploads exactly when the player is reading subtitles and not moving.

**Pixel ratio:** `setPixelRatio(Math.min(devicePixelRatio,1.5))` (L706) → up to 2.25× the
fragment work of 1.0 on a 2× display. Combined with bloom+VHS (both fill-rate bound) this is a
big multiplier on a laptop iGPU.

**Render loop hygiene:** mostly fine — no `new` THREE objects allocated per frame in the hot
path. Two small leaks to fix: `vhsPass.uniforms.uRes.value.set(innerWidth,innerHeight)` runs
every frame (L1096) though it only changes on resize, and the flicker loop (L1084) writes light
intensities every frame for *all* flickers (cheap, but re-dirties shadow maps — see §4).

---

## 2. Why "can't even look around" specifically

Standing still and only rotating the camera **still pays the full per-frame cost**: the
fragment shader evaluates all 66 lights for every pixel, all shadow maps that are marked dirty
re-render, bloom + VHS run over the whole framebuffer at 1.5× pixel ratio, and if any character
is mid-dialogue a 512² face texture is re-uploaded. None of that is gated on player movement, so
look-around is exactly as expensive as everything else. That is the tell-tale signature of a
**fragment/fill-rate + light-count bound**, not a CPU-logic bound — which is good news, because
fixes #1–#4 attack precisely that.

---

## 3. THE FIXES

### 3.1 LIGHT BUDGET — per-frame nearest-N culling  ⭐ highest ROI

Keep only the **nearest 8** PointLights `.visible=true` each frame; hide the rest. three.js
skips `visible=false` lights entirely (they are not uploaded and not looped in the shader). The
camera fill light (L724) is parented to the camera and must always stay visible — exclude it
from the cull list.

**Recommended budget:** **`MAX_POINT_LIGHTS = 8`** (try 6 if still heavy, up to 10 if you have
headroom). Rooms here are small (5×5–9×12) and the player can only ever be near a handful of
fixtures, so 8 looks visually identical to "all on" in practice. **Keep the count fixed** (always
make exactly N visible when ≥N are in range) so the shader's `NUM_POINT_LIGHTS` define stays
constant and the renderer doesn't recompile materials as you walk (avoids hitching).

**Build a flat list once** (after the world is built), then cull each frame. The existing
`WORLD.lights` array only holds `ceilLight` records, so collect *all* PointLights instead:

```js
// ---- one-time setup, after buildClinic()/buildCharacters() (e.g. end of boot()) ----
const MAX_POINT_LIGHTS = 8;
const cullLights = [];                 // every PointLight EXCEPT the camera fill
scene.traverse(o => {
  if (o.isPointLight && o.parent !== camera) cullLights.push(o);
});
// stash each light's authored intensity so flicker math still works on the visible ones
cullLights.forEach(L => { L.userData.baseIntensity = L.intensity; });

// ---- per frame, inside tick() BEFORE composer.render() ----
function cullPointLights() {
  const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  for (const L of cullLights) {
    const dx = L.position.x - cx, dy = L.position.y - cy, dz = L.position.z - cz;
    // include the light's own range so a light you've walked past goes dark naturally
    L.userData._d2 = dx*dx + dy*dy + dz*dz;
  }
  // partial selection: find the Nth smallest distance without a full sort
  cullLights.sort((a, b) => a.userData._d2 - b.userData._d2);   // N is small; sort is fine
  for (let i = 0; i < cullLights.length; i++) {
    cullLights[i].visible = i < MAX_POINT_LIGHTS;
  }
}
```

Notes:
- A full `sort` of ~65 entries each frame is trivial (microseconds) next to what it saves. If
  you want to avoid even that, keep a max-distance cutoff first (`_d2 > maxRange*maxRange →
  hide`) and only sort the survivors.
- **Interaction with flicker:** the flicker loop (L1084) writes `fl.light.intensity` directly.
  That still works on visible lights; on hidden ones it's a no-op cost-wise. No change needed,
  but read `fl.base` (already stored) rather than re-deriving.
- This does **not** touch the Hemisphere/Ambient fill, so a culled room never goes pure black —
  it falls back to the soft global fill + your flashlight/camera fill, which is on-aesthetic.

### 3.2 SHADOWS — go to 0–2 maps, and stop updating them every frame

Real-time shadows are the second hotspot. Three sane tiers, in order of preference for the
FtF (found-footage / VHS) look:

**Tier A (recommended for shipping the FtF look) — turn shadows OFF entirely.**
The VHS chroma-shift, scanlines, vignette and grain hide the absence of contact shadows almost
completely, and the scene is already very dark.

```js
renderer.shadowMap.enabled = false;     // L707 — flip to false
// and stop the per-light cube renders:
//   in ceilLight() never set L.castShadow=true (ignore the `shadow` arg),
//   and on the flashlight: flashlight.castShadow = false;  // L720
```

This removes ~61 potential depth renders per frame in one stroke.

**Tier B (keep a hint of shadow, cheaply) — bake once, never auto-update.**
Render the shadow maps a single time at startup, then freeze them. Because the world is static
(only doors/characters move, and the VHS hides their missing shadows), this looks fine:

```js
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;   // not PCFSoft — cheaper filtering
renderer.shadowMap.autoUpdate = false;          // <-- key line: don't re-render maps each frame

// keep at most 1–2 shadow casters total, small maps:
//   in ceilLight(): if(shadow){ L.castShadow=true; L.shadow.mapSize.set(512,512); ... }
//   and only let the FIRST one or two casters actually cast (cap it).

// after the scene + lights exist (end of boot()), bake one frame of shadows:
renderer.shadowMap.needsUpdate = true;          // forces a single update on the next render
// (the next composer.render() in tick() consumes it; nothing else required)
```

If you later need the nearest caster to update (e.g. the flickering boiler), set
`renderer.shadowMap.needsUpdate = true` **only on the frames it actually changes**, not every
frame. Do **not** leave flickering lights as shadow casters under `autoUpdate=true` — the
intensity change re-dirties the cube map every frame, which is the worst case.

**Config regardless of tier:** drop `mapSize` from `1024`→`512` (L294, L720) — a PSX/VHS scene
cannot resolve 1024² shadow detail anyway — and prefer `PCFShadowMap` over `PCFSoftShadowMap`
(L707) for cheaper sampling.

**Quantified:** Tier A removes the entire shadow stage. Tier B turns "≤61 depth renders every
frame" into "≤2 depth renders, once." Either is a 1.5–3× win depending on how shadow-bound the
machine is.

### 3.3 PIXEL RATIO / INTERNAL RESOLUTION

```js
// L706 — clamp to 1.0 (HiDPI screens were paying up to 2.25× the fragment cost)
renderer.setPixelRatio(Math.min(devicePixelRatio, 1));
```

Optionally render even lower and upscale — this *suits* the PSX/VHS aesthetic (chunkier pixels)
and is a clean fill-rate win because **everything** (main pass, bloom, VHS) scales with it:

```js
const RES_SCALE = 0.85;                 // 0.75–0.9; lower = faster + more "VHS"
renderer.setPixelRatio(Math.min(devicePixelRatio, 1));
renderer.setSize(innerWidth, innerHeight);                 // CSS size stays full
renderer.domElement.style.width = innerWidth + 'px';
renderer.domElement.style.height = innerHeight + 'px';
// drive the internal buffers smaller:
renderer.setSize(Math.round(innerWidth*RES_SCALE), Math.round(innerHeight*RES_SCALE), false);
composer && composer.setSize(Math.round(innerWidth*RES_SCALE), Math.round(innerHeight*RES_SCALE));
bloomPass && bloomPass.setSize(Math.round(innerWidth*RES_SCALE), Math.round(innerHeight*RES_SCALE));
// the canvas CSS box (set above) upscales the smaller buffer to fill the window.
// Mirror the same RES_SCALE math in resize() (L1103) and update VHS uRes accordingly.
```

CSS `image-rendering: pixelated` on `#app canvas` makes the upscale crisp rather than blurry if
you want a harder PSX edge.

**Quantified:** 1.5→1.0 on a 2× display ≈ **2.25× fewer fragments**. Adding `RES_SCALE=0.85` on
top is a further ~1.4× (0.85² area). These multiply through the post stack too.

### 3.4 POST — keep bloom cheap, confirm VHS is single-pass

- **VHS is already single-pass** (one `ShaderPass`, one fullscreen draw — good, L732). Keep it.
  Only nit: stop re-`set`ting `uRes` every frame (L1096) — move it into `resize()` since it only
  changes then. Leave `uTime` updating per frame (it must).
- **Bloom is the expensive pass** (UnrealBloom = bright-pass + a 5-level Gaussian mip pyramid,
  multiple draws). Cheapen it:

```js
// L731 — render bloom at HALF the framebuffer resolution and dial it back
bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(innerWidth*0.5, innerHeight*0.5),  // half-res input
  0.45,   // strength (was .55)
  0.6,    // radius   (was .7)
  0.85    // threshold (was .82 — higher = fewer pixels bloom = cheaper & less mushy)
);
// and in resize(): bloomPass.setSize(innerWidth*0.5, innerHeight*0.5);
```

- **Make bloom optional / quality-tiered.** Cheapest correct option for low-end: drop bloom and
  fake the glow in the VHS shader, or just skip the pass. A clean toggle:

```js
// build composer with bloom only above a quality threshold
const USE_BLOOM = (devicePixelRatio <= 1.5);   // or a settings flag / auto-detect by FPS
if (USE_BLOOM && THREE.UnrealBloomPass) { bloomPass = new THREE.UnrealBloomPass(...); composer.addPass(bloomPass); }
```

If you ever drop *all* post passes, remember `tick()` already falls back to
`renderer.render(scene,camera)` when `composer` is null (L1097) — but you still want the VHS, so
keep the composer and only make *bloom* conditional.

### 3.5 DRAW CALLS — share materials (done) and merge static geometry

The materials are already cached and shared (`_texCache`, `MATS.*`) — good. The problem is
**geometry**: every wall/prop is its own `Mesh`, so each is its own draw call. For a hand-built
scene, two practical approaches (you do **not** need to rewrite the builders):

**(a) Merge the static world into a few big meshes — `BufferGeometryUtils.mergeBufferGeometries`.**
It exists in r128 as an example addon. Add the script tag and merge per-material after building:

```html
<!-- add alongside the other examples/js scripts (order doesn't matter for this one) -->
<script src="https://unpkg.com/three@0.128.0/examples/js/utils/BufferGeometryUtils.js"></script>
```

```js
// after buildClinic(), BEFORE adding characters/doors (those move — keep them separate):
function mergeStatic(group) {
  const byMat = new Map();                 // material -> [geometry,...]
  const movers = new Set();                // skip doors (animated) & lights
  WORLD.doors.forEach(d => movers.add(d.leaf));
  group.traverse(o => {
    if (!o.isMesh) return;
    let p = o; let moving = false;
    while (p) { if (movers.has(p)) moving = true; p = p.parent; }
    if (moving) return;
    o.updateWorldMatrix(true, false);
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);  // bake transform into verts
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(g);
    o.userData._merge = true;
  });
  // remove the originals, add one merged mesh per material
  group.children.slice().forEach(o => { if (o.userData && o.userData._merge) group.remove(o); });
  byMat.forEach((geos, mat) => {
    const merged = THREE.BufferGeometryUtils.mergeBufferGeometries(geos, false);
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = false; m.receiveShadow = true;   // see shadow tier choice
    group.add(m);
  });
}
```

This collapses ~1–2k static draw calls down to roughly **one per material (~15–20 total)**. Big
CPU/load win on low-end; modest on a fast GPU. **Caveat:** merged geometry can't be frustum-
culled per-prop, but a single small clinic fits the frustum often anyway, and the light/shadow
fixes dominate — so this is a tidy-up, not a frontline fix.

**(b) Lighter-touch alternative — `InstancedMesh` for the repeated props.** Chairs, beds, boxes,
shelves, monitors and screens are the same geometry repeated. If a full merge feels risky,
convert just those high-count props to `InstancedMesh` (one draw call per prop type). More code
than (a) for less total reduction, so prefer (a) unless you want to keep per-prop dynamism.

> **Geometry hygiene either way:** the per-mesh UV rescale in `boxGeo()` (L256) makes a fresh
> `BoxGeometry` for *every* box even when dimensions repeat. After merging this is moot, but if
> you don't merge, consider caching `boxGeo` results by `w,h,d,uv` key to cut allocations and
> GPU buffers (helps load time and memory, not steady-state FPS much).

### 3.6 TEXTURES — stop per-frame face uploads; cap sizes; mipmaps

**The bug:** `tick()` sets `c.p._redraw=true` for visible characters every frame (L1079, L1082),
and `update()` repaints the 512² face + `needsUpdate=true` whenever talk/blink is active
(L472–473). Fix it to upload **only on a real change**, throttled:

```js
// in buildHuman.update (replace the redraw block at L472-473):
this._faceT -= dt;
const wantRedraw = (p._redraw || p.blink > 0 || p.talk > 0.01);
if (wantRedraw && this._faceT <= 0) {
  // only actually re-upload if the visible state changed enough to matter
  const sig = (p.eyeOpen|0) + Math.round(p.talk*4) + Math.round((p.smile||0)*4) + (p.pallor?9:0);
  if (sig !== this._faceSig) {
    const nc = paintFace(p);
    this.faceCanvas.getContext('2d').drawImage(nc, 0, 0);
    this.faceTex.needsUpdate = true;
    this._faceSig = sig;
  }
  this._faceT = 0.08;        // cap to ~12 fps for the face, plenty for a mouth flap
  p._redraw = false;
}
```

And in `tick()`, **don't** blanket-set `_redraw` every frame — only when talk state actually
flips. Simplest: drop the `c.p._redraw=true` at the end of L1079's loop and let `talk>0.01`/
`blink>0` drive redraws (the gate above already throttles them).

Other texture wins:
- **Cap face canvas size.** 512² is overkill for a head that's usually a few dozen pixels tall on
  screen. Drop `paintFace`'s `S=512` → **256** (L357). Quarter the upload cost and re-paint cost;
  invisible under the VHS filter.
- **Mipmaps:** world textures use `RepeatWrapping` and benefit from mipmaps (default on for
  `CanvasTexture` — fine; ensure `minFilter` stays `LinearMipmapLinear`). For the **face**
  texture, which is re-uploaded, set `faceTex.generateMipmaps=false` and
  `faceTex.minFilter=THREE.LinearFilter` (L418) so each upload doesn't also rebuild a mip chain.
- The procedural world textures are generated once and cached (`_texCache`) — good, no per-frame
  cost there.

### 3.7 MISC

- **Fog already limits far rendering** (`FogExp2`, density 0.055 → ~0.09 in basement, L712/L635).
  Good. You can lean on it harder: nudge density up slightly and **pull `camera.far` in** from
  `80` (L713) toward ~`40`. Smaller far plane = tighter frustum, fewer objects, smaller shadow
  cameras. The fog hides the near clip of the far plane.
- **`frustumCulled`** is on by default for all meshes — leave it on (the merge in §3.5 trades
  some of this away, which is an acceptable deal here). Do **not** set it false anywhere.
- **No per-frame allocations in the hot loop** — verified. Keep it that way; the light-cull code
  above reuses `userData` fields rather than allocating.
- **`powerPreference:'high-performance'`** is already set (L705) — good, requests the dGPU on
  hybrid laptops.
- **Flicker loop (L1084)** writes intensities every frame for all flickers. Cheap on its own, but
  if you keep any flickering light as a *shadow caster* it forces a shadow re-render every frame.
  Resolution: never let flickering lights cast shadows (combine with §3.2).

---

## 4. The flashlight SpotLight (being removed) — its cost, quantified

The lead designer is removing the camera-mounted flashlight. For the record, here is what it was
costing so the removal's benefit is clear and so the *fill light* isn't removed by mistake:

- **`flashlight.castShadow=true` at 1024²** (L720): a SpotLight shadow is **one extra full-scene
  depth render every frame**, and because the light is parented to the camera, its shadow camera
  moves every frame → the map is **always dirty**, so even `autoUpdate=false` wouldn't have
  helped it. This is the single most reliably-dirty shadow map in the build.
- Removing the flashlight deletes that per-frame depth render outright (a clean ~1 full-scene
  render/frame saved, more on shadow-heavy GPUs).
- The SpotLight *also* counts as a lit source in the fragment shader, but one spot is cheap
  next to the point-light swarm; the **shadow** was the cost, not the light.
- **Keep the camera fill `PointLight`** (L724) — it's the "never in total black" light and is
  excluded from the §3.1 cull. Don't remove it along with the flashlight.

Net: the removal is a genuine perf win (mostly via the always-dirty shadow), and it's also why
fix #2 should *not* rely on the flashlight shadow being the thing you keep.

---

## 5. Suggested rollout (highest ROI first)

1. **Light culling (§3.1)** — nearest-8 `.visible` cull. *Re-measure.* Expect the biggest jump.
2. **Shadows (§3.2)** — Tier A (off) for the FtF look, or Tier B (`autoUpdate=false`, bake once,
   ≤2 casters @512). *Re-measure.*
3. **Pixel ratio → 1.0 (§3.3)**, then add `RES_SCALE≈0.85` if you want more headroom / more grain.
4. **Bloom half-res + optional (§3.4)**; move VHS `uRes` out of the per-frame path.
5. **Face texture throttle + 256² (§3.6)**; then **merge static geometry (§3.5)** if low-end
   devices or load time still need help.

After steps 1–3 you should be comfortably past 30 and likely at/near 60 on a mid laptop iGPU;
4–5 add margin and smooth the dialogue/low-end cases.

---

## Appendix A — exact line references

| Concern | Line(s) in `SMALL_HOURS.html` |
|---|---|
| Renderer + pixelRatio 1.5 + PCFSoft + shadowMap.enabled | 705–709 |
| `ceilLight()` (PointLight + optional 1024² shadow) | 291–295 |
| Shadow-casting ceilLights | 492, 519(×2), 531, 564, 599, 602, 624(×2), 663 |
| Flashlight SpotLight + 1024² shadow | 719–722 |
| Camera fill PointLight (keep!) | 724 |
| Hemisphere / Ambient fill | 716–717 |
| EffectComposer + UnrealBloom(full-res) + VHS | 727–734 |
| VHS shader (single pass) | 736–749 |
| Per-frame `_redraw=true` on characters | 1079, 1082 |
| Face repaint + `needsUpdate` | 472–473 |
| `paintFace` S=512 | 357 |
| Flicker intensity loop | 1084 |
| Per-frame `uRes.set` (move to resize) | 1096 |
| `camera.far = 80` | 713 |
| Fog density | 712, 635 |
| `mesh()` — one Mesh per prop | 262–264 |
| `boxGeo()` — fresh geometry per box | 256–261 |

## Appendix B — light count math (so the budget is defensible)

- PointLights: 43 ceiling + 6 monitor + 16 accent + 1 camera-fill = **66**.
- A forward renderer evaluates every *visible* light per lit fragment. Culling 66→8 visible is a
  ~**8× reduction in per-fragment light work** in the worst case (fully-lit rooms), and the
  camera-fill stays on so nothing goes black.
- Shadow casters: 10 PointLight cube maps (×6 faces) + 1 SpotLight = up to **61 extra
  scene renders/frame** before the flashlight is removed; **60** after; **0–12** under Tier B
  with 2 casters and `autoUpdate=false` (and 0 in steady state once baked).

## Appendix C — measure it (add a tiny on-screen counter)

Drop this in to verify each change instead of guessing:

```js
// minimal FPS + drawcall readout
let _f=0,_t=performance.now();
const dbg=document.createElement('div');
dbg.style.cssText='position:absolute;left:6px;top:6px;z-index:50;color:#7fd0a0;font:11px monospace;text-shadow:0 1px 2px #000';
document.body.appendChild(dbg);
// inside tick(), after composer.render():
_f++; const now=performance.now();
if(now-_t>500){ const fps=(_f*1000/(now-_t))|0;
  dbg.textContent='fps '+fps+'  calls '+renderer.info.render.calls+'  tris '+renderer.info.render.triangles+'  lights '+cullLights.filter(l=>l.visible).length;
  _f=0;_t=now; }
```

`renderer.info.render.calls` is the draw-call count (watch it fall after §3.5);
`...triangles` and the visible-light count confirm the cull is working.

---

## Sources

- Discover three.js — *The Big List of three.js Tips and Tricks*: https://discoverthreejs.com/tips-and-tricks/
- three.js performance guide (gist): https://gist.github.com/iErcann/2a9dfa51ed9fc44854375796c8c24d92
- *100 three.js tips that actually improve performance*: https://www.utsubo.com/blog/threejs-best-practices-100-tips
- three.js forum — *Optimizing Point Lights*: https://discourse.threejs.org/t/optimizing-point-lights/36153
- three.js forum — *Point lights and performance, revisited*: https://discourse.threejs.org/t/point-lights-and-performance-revisited/49316
- three.js docs — `WebGLRenderer.shadowMap` (`autoUpdate` / `needsUpdate`): https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap
- three.js forum — `renderer.shadowMap.autoUpdate == false`: https://discourse.threejs.org/t/renderer-shadowmap-autoupdate-false/50401
- three.js docs — `UnrealBloomPass` (resolution / cost): https://threejs.org/docs/pages/UnrealBloomPass.html
- three.js forum — *UnrealBloomPass is ruining my whole render*: https://discourse.threejs.org/t/effectcomposer-unrealbloompass-is-ruining-my-whole-render-thing/45253
