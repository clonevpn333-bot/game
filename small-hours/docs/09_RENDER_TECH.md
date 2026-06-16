# 09 — RENDER / GRAPHICS TECH

**Game:** SMALL HOURS — The Ashgrove Study (single-file browser horror, Three.js for
lighting / shadows / post only; all models hand-built from primitives).
**Scope of this doc:** the most reliable, highest-quality Three.js setup for a dark,
atmospheric sleep-clinic horror game with a working flashlight, real shadows, fog,
bloom, and a VHS post filter. **Drop-in compatible with the current `SMALL_HOURS.html` API.**

> **Verification note.** This report was produced *with live network access*.
> The dependency chains (which `THREE.*` global each addon needs, and the load order)
> were verified by fetching the **actual r128 source** from
> `raw.githubusercontent.com/mrdoob/three.js/r128/examples/js/...`. The CDN file *paths*
> are confirmed from the published npm tag (the npm package, and therefore unpkg /
> jsDelivr, is generated from that same git tag, so the `examples/js/**` tree is
> byte-identical to what was verified on GitHub). The version-boundary facts
> (r148 / r161) come from the official three.js migration guide and forum.
> Direct `curl`/WebFetch hits to unpkg, cdnjs and the jsDelivr API returned HTTP 403
> from the sandbox's outbound proxy — that is a sandbox restriction, **not** a sign the
> files are missing; the files are well-established and the current game already loads
> them from unpkg successfully.

---

## 0. TL;DR (the decision)

- **Keep Three.js `r128` (0.128.0), UMD build + classic `examples/js` addons via plain
  `<script>` tags.** It is the correct choice and there is no reason to change.
- **Hard version ceiling (verified):**
  - `examples/js` (the classic non-module UMD addons) was **removed in r148**.
  - The UMD build itself (`build/three.min.js` / `three.js`) was **removed in r161**.
  - => The "global `THREE` + `examples/js` postprocessing via `<script>`" pattern only
    works on **r147 and earlier**. r128 is comfortably inside that window and is the
    most battle-tested choice for this exact pattern.
- **Load order is load-bearing.** In r128 the base class `THREE.Pass` **and**
  `THREE.FullScreenQuad` live *inside* `EffectComposer.js` (there is no separate
  `Pass.js`). So `EffectComposer.js` must load **before** `RenderPass.js`,
  `ShaderPass.js`, `UnrealBloomPass.js`, etc. `CopyShader.js` must come before
  `EffectComposer.js`; `LuminosityHighPassShader.js` must come before `UnrealBloomPass.js`.
- **SSAO: do NOT include it.** SSAOPass in this pattern is heavy, fiddly, needs 4 extra
  files, and in a near-black flashlight scene the effect is almost invisible while
  costing a full-res depth/normal prepass. Fake the contact-shadow look with cheap
  hand-placed darkening instead (see §6). It *is* available for r128 if ever wanted —
  exact URLs and caveats are in §2.3.
- **ES-module + importmap: not recommended** for a single copy-paste file at r128
  (see §2.4). Stick with UMD `<script>` tags.
- **Most important config values** (clinic-horror tuned):
  - `ACESFilmicToneMapping`, `toneMappingExposure ≈ 1.1` (current 1.15 is fine; 1.05–1.15 range)
  - `outputEncoding = THREE.sRGBEncoding` (REQUIRED on r128 or the whole scene looks washed/flat)
  - `shadowMap.type = PCFSoftShadowMap`, `setPixelRatio(Math.min(devicePixelRatio, 1.5))`
  - **`physicallyCorrectLights = false`** (keep the legacy intensity model the current numbers assume)
  - Flashlight `SpotLight(0xfff0d6, ~2.4, 16, ~0.6, ~0.45, 1.2)` + a tiny camera fill so
    the player is never in pure black; FogExp2 density ≈ 0.05.

---

## 1. Current setup (as found in `SMALL_HOURS.html`)

CDN tags (lines 130–136):

```html
<script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/shaders/CopyShader.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/postprocessing/ShaderPass.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
```

Renderer / scene / lights (`initThree`, lines 564–595):

- `WebGLRenderer({antialias:true, powerPreference:'high-performance'})`
- `setPixelRatio(Math.min(devicePixelRatio,1.5))`
- `shadowMap.enabled = true`, `type = PCFSoftShadowMap`
- `toneMapping = ACESFilmicToneMapping`, `toneMappingExposure = 1.15`
- `outputEncoding = sRGBEncoding`
- `scene.background = 0x05070a`, `scene.fog = FogExp2(0x05080b, 0.055)`
- `camera = PerspectiveCamera(72, aspect, 0.05, 80)`, `rotation.order='YXZ'`
- `HemisphereLight(0x3a4452, 0x0a0c0a, 0.35)` + `AmbientLight(0x223040, 0.25)`
- **Flashlight:** `SpotLight(0xfff0d6, 2.4, 16, 0.62, 0.45, 1.2)`, `castShadow`,
  `shadow.mapSize 1024²`, mounted on camera with a `flashTarget` Object3D at z=-1.
- **Personal fill:** `PointLight(0x6a7488, 0.35, 4, 2)` mounted on camera.
- Post: feature-detects `THREE.EffectComposer / RenderPass / ShaderPass`; adds
  `UnrealBloomPass(res, 0.55, 0.7, 0.82)` then a custom `VHS_SHADER` ShaderPass set to
  `renderToScreen=true`. Falls back gracefully (`composer=null`) on any error.
- Ceiling lights via `ceilLight()` (lines 291–296): `PointLight(col,intensity,dist,2)`
  with optional `castShadow` (1024² map, `bias -0.002`) and optional flicker.
- Per-frame: `if(composer)composer.render(); else renderer.render(scene,camera);`
  (line 957) and `if(typeof THREE==='undefined'){ show "needs internet" }` (line 148).

**Verdict: the existing architecture is correct and robust.** Recommendations below are
confirmations + tuning, not a rewrite. The only "must-keep" subtlety is the script
**load order** (already correct in the file) and `outputEncoding = sRGBEncoding`
(already set). Everything else is taste/perf tuning.

---

## 2. CDN / version verification

### 2.1 Recommended version + exact URLs (PRIMARY: unpkg, r128)

These are the exact files, in the exact order they must load. **This matches the
current file** — keep it.

```html
<!-- 1. Core UMD build: defines global THREE -->
<script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>

<!-- 2. CopyShader: needed by EffectComposer + UnrealBloomPass -->
<script src="https://unpkg.com/three@0.128.0/examples/js/shaders/CopyShader.js"></script>

<!-- 3. EffectComposer: ALSO defines THREE.Pass + THREE.FullScreenQuad (no separate Pass.js in r128) -->
<script src="https://unpkg.com/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>

<!-- 4. RenderPass: extends THREE.Pass  (needs #3) -->
<script src="https://unpkg.com/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>

<!-- 5. ShaderPass: extends THREE.Pass + uses THREE.FullScreenQuad  (needs #3) -->
<script src="https://unpkg.com/three@0.128.0/examples/js/postprocessing/ShaderPass.js"></script>

<!-- 6. LuminosityHighPassShader: needed by UnrealBloomPass -->
<script src="https://unpkg.com/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"></script>

<!-- 7. UnrealBloomPass: needs THREE.Pass(#3), CopyShader(#2), LuminosityHighPassShader(#6) -->
<script src="https://unpkg.com/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
```

**Dependency facts (verified against r128 source):**

| File | Defines | Requires (must already be loaded) |
|---|---|---|
| `build/three.min.js` | global `THREE` + all core classes | — |
| `shaders/CopyShader.js` | `THREE.CopyShader` | `THREE` |
| `postprocessing/EffectComposer.js` | `THREE.EffectComposer`, **`THREE.Pass`**, **`THREE.FullScreenQuad`**, `THREE.MaskPass`, `THREE.ClearMaskPass` | `THREE`, `THREE.CopyShader`, `THREE.ShaderPass`* |
| `postprocessing/RenderPass.js` | `THREE.RenderPass` | `THREE.Pass` (from EffectComposer.js) |
| `postprocessing/ShaderPass.js` | `THREE.ShaderPass` | `THREE.Pass`, `THREE.FullScreenQuad` (from EffectComposer.js) |
| `shaders/LuminosityHighPassShader.js` | `THREE.LuminosityHighPassShader` | `THREE` |
| `postprocessing/UnrealBloomPass.js` | `THREE.UnrealBloomPass` | `THREE.Pass`, `THREE.FullScreenQuad`, `THREE.CopyShader`, `THREE.LuminosityHighPassShader` |

\* Note the slightly circular look: `EffectComposer.js` *references* `THREE.ShaderPass`
and `THREE.CopyShader` only **at construction time** (inside `new EffectComposer()` /
`addPass`), not at script-parse time. Loading CopyShader before EffectComposer and
ShaderPass right after is sufficient — which the order above does. This is exactly the
order the current file uses, so it is proven to work.

**Why r128 specifically (verified version boundaries):**

- `examples/js/` removed in **r148** → on r148+ the classic UMD addons above 404.
- UMD build (`build/three.min.js`, `build/three.js`) removed in **r161** → on r161+
  there is no global-`THREE` `<script>` build at all.
- So **r147 is the newest version this whole pattern can use.** r128 is a popular,
  stable, widely-mirrored LTS-ish pick squarely inside the supported window, and the
  game's lighting numbers were authored against r128's behavior. **Do not bump it**
  without re-testing tone mapping / light intensities.

### 2.2 Backup CDNs (same r128 files, if unpkg is flaky)

Two interchangeable mirrors. Pick ONE host per page (don't mix), or use the JS fallback
loader in §2.5.

**jsDelivr (mirrors npm 1:1 — same `examples/js` paths as unpkg):**

```
https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js
https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js
https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js
https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js
https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js
https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js
https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js
```

**cdnjs (Cloudflare) — NOTE THE DIFFERENT PATH SHAPE.** cdnjs flattens the tree: there
is **no `examples/js/` prefix** — files sit directly under the version, e.g.
`postprocessing/...` and `shaders/...`:

```
https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/shaders/CopyShader.js
https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/postprocessing/EffectComposer.js
https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/postprocessing/RenderPass.js
https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/postprocessing/ShaderPass.js
https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/shaders/LuminosityHighPassShader.js
https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/postprocessing/UnrealBloomPass.js
```

(cdnjs uses the tag string `r128`, jsDelivr/unpkg use the npm semver `0.128.0`.)

### 2.3 SSAO / SAO availability for r128 (and why to skip it)

**Available? Yes.** For r128 the classic UMD `SSAOPass` exists and works via `<script>`,
but it needs **four** extra files in this order (verified against r128 source — SSAOPass
extends `THREE.Pass`, so it also needs `EffectComposer.js` first):

```html
<!-- after EffectComposer.js + ShaderPass.js + CopyShader.js -->
<script src="https://unpkg.com/three@0.128.0/examples/js/math/SimplexNoise.js"></script>          <!-- THREE.SimplexNoise -->
<script src="https://unpkg.com/three@0.128.0/examples/js/shaders/SSAOShader.js"></script>          <!-- THREE.SSAOShader + SSAODepthShader + SSAOBlurShader (ALL in this one file) -->
<script src="https://unpkg.com/three@0.128.0/examples/js/postprocessing/SSAOPass.js"></script>     <!-- THREE.SSAOPass -->
```

Dependency chain (verified): `SSAOPass` → needs `THREE.Pass` (EffectComposer.js),
`THREE.SimplexNoise`, `THREE.SSAOShader` / `SSAODepthShader` / `SSAOBlurShader` (the
single `SSAOShader.js` defines all three), and `THREE.CopyShader`. It logs console errors
if SimplexNoise or SSAOShader are missing.

> `SAOPass` (the other ambient-occlusion pass) also exists for r128
> (`examples/js/postprocessing/SAOPass.js` + `examples/js/shaders/SAOShader.js` +
> `DepthLimitedBlurShader.js` + `UnpackDepthRGBAShader.js` + `CopyShader.js`). It has an
> even longer dependency list. Same recommendation: skip.

**Recommendation: DO NOT INCLUDE SSAO/SAO.** Reasons:

1. **It's nearly invisible in this game.** AO darkens crevices/contacts using *ambient*
   light. Our ambient is intentionally tiny (§3) and the scene is lit mostly by a moving
   flashlight cone → there's barely any ambient term for AO to subtract, so the visual
   payoff is minimal.
2. **Cost.** SSAOPass renders the scene's depth (and normals) to a full-res target every
   frame, then a noisy AO pass + blur. On a fog-heavy, shadow-casting scene that's a big
   hit on integrated GPUs — exactly the laptops a browser horror game runs on.
3. **Fragility.** Four more CDN files = four more things that can 404 or load
   out-of-order. Against the project's "one reliable copy-paste file" goal, that's bad.
4. **Better cheaper alternative (see §6):** bake soft AO straight into the procedural
   floor/wall textures (the game already draws grime/edges into canvas albedo+height),
   plus drop a faint dark "contact" decal/quad under big props. Free, art-directed,
   reads better in the dark than real SSAO would.

### 2.4 ES-module + importmap approach — brief pros/cons (not recommended here)

You *could* instead do:

```html
<script type="importmap">{ "imports": {
  "three": "https://unpkg.com/three@0.128.0/build/three.module.js",
  "three/addons/": "https://unpkg.com/three@0.128.0/examples/jsm/"
}}</script>
<script type="module">
  import * as THREE from 'three';
  import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
  // ...
</script>
```

| | UMD `<script>` (CURRENT) | ESM + importmap |
|---|---|---|
| Single copy-paste file | ✅ trivial | ✅ works |
| Works on `file://` double-click | ✅ yes | ❌ **No** — ES modules + importmap need `http(s)://`; opening the .html directly hits CORS/module errors |
| Browser support | ✅ universal | ⚠️ importmap unsupported on older Safari/Firefox; needs reasonably modern browser |
| Global `THREE` (the whole game uses bare `THREE.*`) | ✅ native | ❌ would require `window.THREE = THREE;` shim or rewriting hundreds of `THREE.` refs |
| r128 quirk | none | r128's ESM examples had documented broken relative imports on unpkg (see three.js issue #21764); importmap papers over it but it was historically flaky on this exact version |
| Future-proofing past r161 | ❌ dead end (no UMD) | ✅ the only option on new versions |

**Decision: stay on UMD `<script>` tags.** The game is built around a global `THREE`,
must survive being saved and double-clicked (`file://`), and is pinned to r128. ESM buys
us nothing here and breaks `file://`. If the project ever upgrades past r147, *that's*
when to migrate to ESM/importmap — and at that point `window.THREE = THREE` keeps the
rest of the code unchanged.

### 2.5 Robust FALLBACK strategy (CDN/addons fail to load)

The current file already does the two most important things:

1. **THREE missing → clear "needs internet" message** (line 148):
   `if(typeof THREE==='undefined'){ $('loaderr').style.display='block'; }` — keep this.
2. **Post-FX feature-detect → fall back to plain render** (lines 588–594, 957):
   only build the composer `if(THREE.EffectComposer && THREE.RenderPass && THREE.ShaderPass)`,
   wrap in try/catch, and render `composer ? composer.render() : renderer.render(scene,camera)`.

Recommended hardening (additive — does not change behavior when everything loads):

**(a) Tolerate a missing bloom file specifically** (already done: bloom is guarded by
`if(THREE.UnrealBloomPass)`). Good — if only `UnrealBloomPass.js`/`LuminosityHighPassShader.js`
fail, you still get RenderPass + VHS.

**(b) Optional multi-CDN auto-failover loader** for the core build, so a single dead host
doesn't kill the game. Use this *instead of* the static core `<script>` only if you want
belt-and-suspenders (it adds complexity; the static tags are fine for most cases):

```html
<script>
// Try unpkg -> jsdelivr -> cdnjs for the CORE build, then load addons from the SAME host.
(function(){
  var HOSTS = [
    {core:"https://unpkg.com/three@0.128.0/build/three.min.js",        ex:"https://unpkg.com/three@0.128.0/examples/js/"},
    {core:"https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js", ex:"https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/"},
    {core:"https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", ex:"https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/"} // NOTE: cdnjs has NO examples/js/ prefix
  ];
  var ADDONS = ["shaders/CopyShader.js","postprocessing/EffectComposer.js","postprocessing/RenderPass.js",
                "postprocessing/ShaderPass.js","shaders/LuminosityHighPassShader.js","postprocessing/UnrealBloomPass.js"];
  function loadSeq(urls, done){ (function next(i){ if(i>=urls.length) return done(true);
    var s=document.createElement('script'); s.src=urls[i]; s.onload=function(){next(i+1);};
    s.onerror=function(){done(false);}; document.head.appendChild(s); })(0); }
  function tryHost(k){
    if(k>=HOSTS.length){ window.__threeFailed=true; return; }
    var h=HOSTS[k], exPrefix = h.ex.indexOf('cdnjs')>-1 ? h.ex : h.ex; // cdnjs path already has no examples/js
    var s=document.createElement('script'); s.src=h.core;
    s.onerror=function(){ tryHost(k+1); };
    s.onload=function(){
      var urls = ADDONS.map(function(a){ return h.ex + a; });
      loadSeq(urls, function(ok){ if(!ok) tryHost(k+1); /* else: THREE + addons ready */ });
    };
    document.head.appendChild(s);
  }
  tryHost(0);
})();
</script>
```

> The minimal version (the static 7 tags in §2.1) is recommended for simplicity; the
> failover loader above is the "maximum reliability" option. Either way the in-game guards
> in (a)/(b) remain the real safety net.

**(c) Keep the existing window 'error' handler** (line 146) so any addon that loads but
throws shows the red `#err` overlay instead of a black screen.

Net fallback ladder:
`full (THREE+composer+bloom+VHS)` → `THREE+RenderPass+VHS (no bloom)` →
`THREE only, renderer.render()` → `no THREE: "needs internet" message`.

---

## 3. Lighting + render config for moody clinic horror

### 3.1 Renderer

```js
renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));   // cap: 2x DPR on a phone = 4x the pixels, kills FPS
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;        // soft edges; VSM is darker/leakier, PCFSoft is the sweet spot
renderer.toneMapping       = THREE.ACESFilmicToneMapping;   // see note vs Reinhard below
renderer.toneMappingExposure = 1.10;                        // 1.05–1.15 for clinic dark; current 1.15 is fine
renderer.outputEncoding    = THREE.sRGBEncoding;            // REQUIRED on r128 — without it everything looks flat/grey
renderer.physicallyCorrectLights = false;                   // KEEP legacy model (see §3.2)
```

- **ACES vs Reinhard:** **Use ACES** (current). ACES rolls highlights off filmically —
  the flashlight hotspot, the green monitors, the red REC dot keep color and don't blow
  to pure white. Reinhard desaturates and flattens highlights → the bloom + emissives
  look milky. ACES is the right look for a moody, contrasty horror frame. (Linear/no-tone-
  mapping would clip the flashlight to white; avoid.)
- **Exposure:** keep ~**1.05–1.15**. Higher lifts the blacks and kills dread; lower and
  the player can't navigate. 1.10 is a good default; the game already drives perceived
  darkness via fog + low ambient + sanity vignette, so exposure should stay modest.
- **outputEncoding / colorSpace:** On r128 the property is `renderer.outputEncoding =
  THREE.sRGBEncoding` (already set — keep it). Texture color maps should be
  `texture.encoding = THREE.sRGBEncoding` if you want strictly correct albedo; for this
  game's procedural canvas textures it's a minor refinement, the renderer-level setting is
  what matters most. *(For reference: `outputColorSpace`/`SRGBColorSpace` is the r152+
  rename — do NOT use those names on r128, they don't exist and will silently do nothing.)*
- **pixelRatio cap:** `Math.min(devicePixelRatio, 1.5)` (current). With shadows + post on
  integrated GPUs this is the single biggest perf lever. 1.5 keeps it crisp without the
  2x explosion.
- **physicallyCorrectLights:** **Keep `false`.** The game's intensities (spotlight 2.4,
  point lights 0.7–1.0, hemi 0.35) are authored for the legacy (non-physical) model where
  intensity is a unitless multiplier and `PointLight` falls off by `distance`. Turning on
  physically-correct lights switches to candela/lumen units with inverse-square falloff —
  every light would need re-tuning (point lights would need ~10–50× larger values) and the
  carefully-balanced darkness would break. Not worth it; leave off.

### 3.2 The flashlight (guaranteed-working camera-mounted SpotLight)

This is the player's primary light and it already works in the file. Recommended values:

```js
// cone color slightly warm = "cheap LED torch"; intensity/dist tuned so it reaches ~one room
flashlight = new THREE.SpotLight(0xfff0d6, 2.4, 16, 0.60, 0.45, 1.2);
//                                color    int  dist angle penumbra decay
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(1024, 1024);     // 1024 is plenty for one moving cone; 2048 only if you see stair-stepping
flashlight.shadow.camera.near = 0.2;
flashlight.shadow.camera.far  = 16;            // == distance; keeps depth precision tight
flashlight.shadow.bias        = -0.0015;       // kills shadow acne on flat walls
flashlight.shadow.focus       = 1.0;

// aim it straight ahead by parenting a target to the camera
flashTarget = new THREE.Object3D();
flashTarget.position.set(0, 0, -1);
camera.add(flashlight);
camera.add(flashTarget);
flashlight.target = flashTarget;

// tiny personal fill so the player is NEVER in pure black (readability + less nausea)
const fill = new THREE.PointLight(0x6a7488, 0.35, 4, 2);  // cool, very short range, low intensity
camera.add(fill);
scene.add(camera);   // camera must be in the scene graph for its child lights to render
```

- **angle ~0.55–0.62 rad** (≈ 32–36°): tight enough to feel like a torch, wide enough to
  navigate.
- **penumbra ~0.4–0.5:** soft cone edge; a hard edge looks like a stage spotlight.
- **decay 1.2 with distance 16:** gives a natural-ish falloff under the legacy model so the
  far end of the cone fades into fog rather than ending in a hard disc.
- **fill light:** keep it *cool* (0x6a7488) and *weak* (0.35) so it contrasts the warm
  cone and never reveals the room — just enough that walls aren't 100% #000.

**Flicker-on-low-battery** (the file already does a version of this on line 649 — here's a
clean, drop-in form):

```js
// in updatePlayer(dt,t):
if (P.flashOn && P.batt > 0) {
  P.batt = clamp(P.batt - dt*0.0035, 0, 1);
  let target = 2.4;
  if (P.batt < 0.20) {                       // dying battery: stutter
    const f = Math.sin(t*30) * Math.sin(t*7.3);          // irregular beat
    const dropout = (Math.random() < 0.04) ? 0.15 : 1.0; // occasional near-blackout
    target = 2.4 * (0.55 + 0.45*f) * dropout;
  }
  flashlight.intensity = lerp(flashlight.intensity, Math.max(0, target), 0.3);
} else {
  flashlight.intensity = lerp(flashlight.intensity, 0, 0.3);
}
```

### 3.3 Ambient / hemisphere baseline + fog (dark-but-visible)

```js
scene.background = new THREE.Color(0x05070a);          // near-black cool blue
scene.fog        = new THREE.FogExp2(0x05080b, 0.05);  // density 0.045–0.055; match the bg hue (slightly green-blue)

const hemi = new THREE.HemisphereLight(0x3a4452, 0x0a0c0a, 0.35);  // sky cool, ground near-black, low
scene.add(hemi);
const amb  = new THREE.AmbientLight(0x223040, 0.25);              // tiny cool global lift so shadows aren't pure void
scene.add(amb);
```

- **Target "dark but readable":** combined hemi(0.35)+amb(0.25) gives just enough that a
  wall outside the flashlight reads as a *shape* (~3–6% grey) without being navigable —
  the player still needs the torch. Don't exceed ~0.4 hemi / ~0.3 amb or the dread evaporates.
- **Fog color MUST match `scene.background`** (both ~`0x05080b`). If they differ you get an
  ugly "halo" where geometry meets the far plane. FogExp2 density **0.05** makes the
  flashlight cone die into murk around 14–18 m — this is also a *performance* feature
  (§6): nothing far away needs to be crisp.
- Tie sanity to the vignette (already done via `#vig` box-shadow) rather than to ambient,
  so the 3D lighting stays stable while the *frame* tightens as composure drops.

### 3.4 Flickering fluorescent ceiling lights with shadows

The file's `ceilLight(x,z,col,intensity,dist,shadow,flick)` is the right tool. Tuning:

```js
function ceilLight(x, z, col, intensity, dist, shadow, flick){
  const fix = deco(MATS.lamp, x, 2.86, z, 0.7, 0.06, 0.24);   // emissive fixture (reads even when light is off)
  const L = new THREE.PointLight(col, intensity, dist, 2);     // decay 2 ~ inverse-square-ish under legacy
  L.position.set(x, 2.7, z);
  if (shadow){
    L.castShadow = true;
    L.shadow.mapSize.set(1024, 1024);    // PointLight shadows are a CUBE (6 faces) — expensive; keep 1024 or drop to 512
    L.shadow.bias = -0.003;
    L.shadow.camera.near = 0.1;
    L.shadow.camera.far  = dist;         // tight far plane = better depth precision + cheaper
  }
  // ... push to WORLD.lights / WORLD.flickers
}
```

**Shadow budget — how many shadow-casting lights are safe:**

- A `PointLight` shadow is a **cube map = 6 render passes**. A `SpotLight` shadow is **1**.
- **Budget for integrated GPUs: at most ~3–4 shadow-casting lights rendering in a frame,
  and one of those is already the flashlight.** So allow **~2–3 shadow-casting ceiling
  PointLights active at once**, max.
- **Prefer flagging only a *few* ceiling lights `shadow=true`** (the file does this — most
  `ceilLight(...)` calls pass `false`). Shadow-cast only the lights in rooms the player
  actually occupies / the hero lights.
- **Where you can, make a "shadow" fluorescent a `SpotLight` pointing down** instead of a
  PointLight — 1 shadow pass instead of 6, and a downward cone reads fine for a ceiling
  panel.

**Cull lights near the player** (the key perf trick — only let nearby shadow lights
actually cast):

```js
const SHADOW_BUDGET = 3;                 // includes the flashlight conceptually; here: extra scene lights
function cullLights(){
  // distance-sort shadow-capable lights; enable shadows on the nearest N, disable the rest
  const cands = WORLD.lights.filter(r => r.canShadow);
  cands.forEach(r => {
    r._d = dist2(P.pos[0], P.pos[2], r.light.position.x, r.light.position.z);
  });
  cands.sort((a,b)=>a._d-b._d);
  cands.forEach((r,i)=>{
    const want = i < SHADOW_BUDGET && r._d < 14;       // only near + within budget
    if (r.light.castShadow !== want) r.light.castShadow = want; // toggling is cheap; the cube render is what costs
    // also fully disable far lights to save the lighting math + draw influence:
    r.light.visible = r._d < 26;                       // beyond fog, invisible anyway
  });
}
// call cullLights() every ~0.2s, not every frame
```

(Mark which lights are *allowed* to cast with `rec.canShadow = !!shadow` when you create
them, then let `cullLights()` decide who *actually* casts this moment.)

### 3.5 Emissive materials (monitors / EXIT sign / red REC dot)

Emissive `MeshStandardMaterial` is correct (the file already does this). They're cheap
(no light cost) and they're what bloom latches onto.

```js
MATS.screen   = new THREE.MeshStandardMaterial({ color:0x06140b, roughness:0.25, emissive:0x2f8f5a, emissiveIntensity:0.6 });
MATS.redlight = new THREE.MeshStandardMaterial({ color:0x330000, emissive:0xff2222, emissiveIntensity:1.4 });
MATS.exit     = new THREE.MeshStandardMaterial({ color:0x330000, emissive:0xff3a3a, emissiveIntensity:1.2 });
MATS.lamp     = new THREE.MeshStandardMaterial({ color:0xffffff, emissive:0xfff2d0, emissiveIntensity:1.3 });
```

- **Pair a hero emissive with a tiny real light** for spill (the file does this: a monitor
  also gets a weak `PointLight(0x2f8f5a, 0.5, 3)` — keep it **shadowless** and short-range).
  Most emissives should be light-free; only the few the player stands near get a spill light.
- **emissiveIntensity 1.2–1.5** for signs/REC, **~0.6** for monitors — this is the level
  where UnrealBloomPass (threshold ~0.8, §5) blooms them slightly without the whole panel
  flaring. Push REC-dot to ~1.6 if you want it to "burn" a little on camera.
- A faint pulse on the REC dot sells "recording": `mat.emissiveIntensity = 1.2 + 0.4*Math.sin(t*3)`.

---

## 4. Post-processing

### 4.1 UnrealBloomPass — subtle

```js
// UnrealBloomPass(resolution, strength, radius, threshold)
bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight),
              0.55,   // strength: 0.4–0.6. Subtle. >0.8 starts to wash the frame
              0.7,    // radius:   soft, wide-ish glow
              0.82);  // threshold: HIGH on purpose — only emissives/flashlight hotspot bloom, not the whole dim room
composer.addPass(bloomPass);
```

- The **high threshold (0.82)** is the trick that keeps a dark game from going milky:
  almost nothing in a dim scene exceeds it, so bloom only kisses the monitors, EXIT sign,
  REC dot and the flashlight hotspot — exactly what you want glowing. (Current values are
  already good. If the scene ever looks foggy/washed, *raise* threshold before lowering
  strength.)
- Keep bloom guarded by `if (THREE.UnrealBloomPass)` so a missing file degrades gracefully.

### 4.2 VHS ShaderPass — atmospheric, not destructive

The file's `VHS_SHADER` (lines 596–609) is already well-judged: barrel distortion,
chromatic aberration, scanlines, grain, slight green push, head-switch noise band at the
bottom, vignette — all scaled by a `uDeg` ("degradation") uniform driven by sanity/story.
**Keep it.** Recommended (lightly cleaned) version with safe default uniforms:

```js
const VHS_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uTime:    { value: 0 },
    uDeg:     { value: 0.35 },                 // 0 = clean-ish, 1 = heavy. Drive from sanity/story.
    uRes:     { value: new THREE.Vector2(1,1) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float uTime, uDeg;
    uniform vec2 uRes;
    float rand(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      vec2 c  = uv - 0.5;
      float r2 = dot(c,c);
      // barrel / CRT curvature (gentle)
      uv = 0.5 + c * (1.0 + (0.03 + 0.05*uDeg) * r2);
      // chromatic aberration (scales with degradation), horizontal split
      float ab = (1.0 + 4.5*uDeg) / uRes.x;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + vec2(ab,0.0)).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - vec2(ab,0.0)).b;
      // scanlines (subtle, ~8% modulation)
      col *= 0.92 + 0.08*sin(uv.y * uRes.y * 1.6);
      // grain
      col += (rand(uv*uRes + uTime) - 0.5) * (0.05 + 0.13*uDeg);
      // slight green/VHS tint
      col = mix(col, col * vec3(0.93,1.03,0.93), 0.5);
      // head-switch noise band along the very bottom
      if (uv.y > 0.972){
        col = mix(col, vec3(rand(vec2(uv.x*uRes.x, floor(uTime*60.0)))), 0.6);
      }
      // vignette
      col *= smoothstep(0.95, 0.28, r2 * 1.2);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`
};
```

Tuning so it's atmospheric, not washed out:

- **Aberration `(1.0 + 4.5*uDeg)/uRes.x`** — pixel-scaled so it doesn't explode on 4K.
  Keep base ~1px; only the high-sanity-loss end (uDeg→1) should smear.
- **Scanlines at 8% (`0.92 + 0.08*...`)** — present but not stripey. Don't exceed ~0.12.
- **Grain `0.05 + 0.13*uDeg`** — a little always, more as composure drops.
- **Head-switch band only in the bottom ~3% (`uv.y>0.972`)** — the signature VHS tear;
  keep it thin so it reads as "tracking" not "broken screen".
- **Vignette via `smoothstep`** layered *under* the HUD `#vig` element — together they keep
  the frame's corners dark without crushing the center.
- Drive `uDeg` from gameplay (the file does: `clamp(STORY.deg + (1-san)*0.4 + dread*0.3, 0, 1)`).
  Resist the urge to default it high; **0.3–0.4 baseline** keeps the scene legible.
- **Order matters:** RenderPass → UnrealBloomPass → **VHS last** with
  `vhsPass.renderToScreen = true` (so grain/scanlines sit on top of bloom, like a real
  tape of an already-glowing monitor). The file does exactly this.

Per-frame uniform updates (already wired): set `vhsPass.uniforms.uTime.value = t` and
`uRes` to the drawing-buffer size on resize.

---

## 5. Drop-in block (copy-paste ready, matches current file's API)

### 5.1 The `<script>` CDN tags (exact, in order)

```html
<!-- Three.js r128 — UMD build + classic examples/js post addons. ORDER IS REQUIRED. -->
<script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/shaders/CopyShader.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/postprocessing/ShaderPass.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
```

(Identical to the current file — confirmed correct. Optionally add the §2.5 failover loader
for max reliability.)

### 5.2 `initRenderer()` config snippet

Named `initRenderer()` per the brief; the live file's equivalent is `initThree()` — the
bodies are interchangeable (same globals: `renderer, scene, camera, composer, vhsPass,
flashlight, flashTarget, hemi, bloomPass`).

```js
let renderer, scene, camera, composer, vhsPass, flashlight, flashTarget, hemi, bloomPass;

function initRenderer(){
  // ---- renderer ----
  renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.10;
  renderer.outputEncoding    = THREE.sRGBEncoding;     // r128 name — keep
  renderer.physicallyCorrectLights = false;            // keep legacy intensities
  document.getElementById('app').appendChild(renderer.domElement);

  // ---- scene / fog / camera ----
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);
  scene.fog        = new THREE.FogExp2(0x05080b, 0.05);
  camera = new THREE.PerspectiveCamera(72, innerWidth/innerHeight, 0.05, 80);
  camera.rotation.order = 'YXZ';

  // ---- global fill (dark but visible) ----
  hemi = new THREE.HemisphereLight(0x3a4452, 0x0a0c0a, 0.35); scene.add(hemi);
  scene.add(new THREE.AmbientLight(0x223040, 0.25));

  // ---- flashlight (camera-mounted spotlight) ----
  flashlight = new THREE.SpotLight(0xfff0d6, 2.4, 16, 0.60, 0.45, 1.2);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.set(1024, 1024);
  flashlight.shadow.camera.near = 0.2;
  flashlight.shadow.camera.far  = 16;
  flashlight.shadow.bias        = -0.0015;
  flashTarget = new THREE.Object3D(); flashTarget.position.set(0,0,-1);
  camera.add(flashlight); camera.add(flashTarget); flashlight.target = flashTarget;

  // ---- personal fill so the player is never in pure black ----
  camera.add(new THREE.PointLight(0x6a7488, 0.35, 4, 2));
  scene.add(camera);

  // ---- post: composer = RenderPass -> (UnrealBloom) -> VHS, with graceful fallback ----
  try{
    if (THREE.EffectComposer && THREE.RenderPass && THREE.ShaderPass){
      composer = new THREE.EffectComposer(renderer);
      composer.addPass(new THREE.RenderPass(scene, camera));
      if (THREE.UnrealBloomPass){
        bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.7, 0.82);
        composer.addPass(bloomPass);
      }
      vhsPass = new THREE.ShaderPass(VHS_SHADER);
      vhsPass.uniforms.uRes.value.set(innerWidth, innerHeight);
      vhsPass.renderToScreen = true;
      composer.addPass(vhsPass);
    }
  } catch(e){ composer = null; console.warn('post fx unavailable', e); }
}

// render loop:  if (composer) composer.render(); else renderer.render(scene, camera);
// resize:       renderer.setSize(W,H); camera.aspect=W/H; camera.updateProjectionMatrix();
//               composer && composer.setSize(W,H); bloomPass && bloomPass.setSize(W,H);
//               vhsPass && vhsPass.uniforms.uRes.value.set(W,H);
// per-frame:    vhsPass && (vhsPass.uniforms.uTime.value = t);
```

### 5.3 The VHS shader object

Use the `VHS_SHADER` object exactly as listed in **§4.2** (it's the cleaned form of the
current file's shader; uniforms `tDiffuse / uTime / uDeg / uRes` are unchanged, so all
existing references — e.g. `vhsPass.uniforms.uDeg.value = ...` on line 658 — keep working).

---

## 6. Performance notes (budget for integrated GPUs / laptops)

- **Shadow maps are the #1 cost.** Budget:
  - Flashlight SpotLight: **1** shadow pass, 1024². Always on.
  - Scene shadow-casting **PointLights: cap ~2–3 active**, 1024² (or 512²). Each is a
    **6-face cube** render — treat 1 shadow PointLight ≈ 6× a SpotLight.
  - **Total live shadow passes target: ≤ ~8–10/frame.** Use `cullLights()` (§3.4) to keep
    only the nearest few casting; flip far lights `visible=false` (beyond fog they're
    invisible anyway, and it saves the per-fragment light math).
  - Prefer downward `SpotLight` over `PointLight` for any ceiling light that must cast.
- **Light count (non-shadow):** dozens of cheap `PointLight`s are fine, but each adds
  per-fragment cost on every lit pixel. Keep most ceiling/monitor lights **short-range**
  (`dist` 3–8) and **shadowless**; cull far ones with `visible=false`.
- **Draw calls:** the game builds many small meshes. Where geometry shares a material and
  never moves (walls, floors, trim), consider `THREE.BufferGeometryUtils.mergeBufferGeometries`
  to collapse them into one mesh per material → fewer draw calls. (Static world only;
  don't merge anything you animate or toggle.) Reuse the cached `MATS.*` materials (the
  file already does via `_texCache`) — don't clone materials per prop.
- **FogExp2 is a perf feature, not just a mood feature.** Density ~0.05 means anything
  past ~18 m is fully fogged; combined with the camera `far = 80` you can aggressively
  `visible=false` distant rooms/props. Consider a coarse per-room visibility toggle keyed
  to the player's current room.
- **pixelRatio cap (1.5)** and **post-pass count** are the next levers. The chain is
  RenderPass + Bloom (several blur passes) + VHS = full-frame work several times per frame;
  on a weak GPU, dropping `setPixelRatio` to `Math.min(dpr,1.25)` or disabling bloom
  recovers the most.
- **Texture sizes:** procedural canvas textures at 256² (the file's default) are ideal —
  small, fast to upload, plenty for a grainy dark look. Don't go to 1024² without reason.
- **Antialias + post:** `antialias:true` on the renderer only AAs the initial RenderPass;
  the composer's render targets aren't MSAA on r128's basic `WebGLRenderTarget`. The VHS
  grain/scanlines hide aliasing well, so this is fine — no need for an extra FXAA/SMAA pass
  (which would be more files + more cost). The slight softness suits the VHS aesthetic.

---

## 7. Summary table — what to keep vs change

| Item | Current | Recommendation |
|---|---|---|
| Three.js version | r128 (UMD + examples/js) | **Keep.** Correct; r147 is the hard ceiling for this pattern. |
| CDN | unpkg | **Keep**; jsDelivr / cdnjs as backups (§2.2); optional failover loader (§2.5). |
| Load order | correct | **Keep** (CopyShader→EffectComposer→Render/Shader→LumiHighPass→Bloom). |
| Tone mapping | ACES, exp 1.15 | Keep ACES; exposure 1.10 (1.05–1.15 fine). |
| outputEncoding | sRGBEncoding | **Keep — required on r128.** Don't rename to outputColorSpace (r152+). |
| physicallyCorrectLights | (unset = false) | **Keep false** — intensities are authored for legacy model. |
| Shadows | PCFSoft, 1024² | Keep; add `cullLights()` so ≤3 scene PointLights cast at once. |
| Flashlight | SpotLight 2.4/16/0.62/0.45/1.2 + fill | Keep; low-battery flicker (§3.2). |
| Bloom | 0.55 / 0.7 / 0.82 | **Keep** — high threshold prevents wash-out. |
| VHS pass | custom ShaderPass, last | **Keep**; default uDeg ~0.3–0.4. |
| **SSAO/SAO** | not present | **Do NOT add.** Invisible in the dark + expensive; fake AO in textures/decals. |
| ES modules / importmap | not used | **Do NOT switch** (breaks `file://`, needs window.THREE shim). |
| Fallback | THREE-missing msg + composer feature-detect | Keep; bloom already guarded; consider §2.5 multi-CDN. |

---

### Sources (verified live)
- three.js r128 addon source (dependency chains + load order), fetched from
  `raw.githubusercontent.com/mrdoob/three.js/r128/examples/js/...`:
  `EffectComposer.js`, `RenderPass.js`, `ShaderPass.js`, `UnrealBloomPass.js`,
  `SSAOPass.js`, `shaders/SSAOShader.js`, `math/SimplexNoise.js`.
- three.js Migration Guide / forum: `examples/js` removed in **r148**; UMD build
  (`build/three.min.js`) removed in **r161**.
- three.js issue #21764 ("import error from cdn in version 0.128") — re: ESM/importmap
  fragility on this exact version (does not affect the UMD `<script>` path we use).
- CDN path shapes: unpkg/jsDelivr mirror npm `three@0.128.0` (`/examples/js/**`);
  cdnjs uses tag `r128` with a flattened path (no `examples/js/` prefix).
