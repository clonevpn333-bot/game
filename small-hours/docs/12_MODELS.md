# 12 — MODELS & MATERIAL DEPTH (subagent 2: the 3D Modeler)

### Drop-in replacements for `SMALL_HOURS.html` — props + texture-depth fix

> **Scope.** This doc fixes two things the player reported:
> 1. *"Walls / floors look flat — the textures aren't hitting / have no depth."*
> 2. *"The props (chairs etc.) look too crude."*
>
> Everything here is **copy-paste ready** and keeps the existing builder API
> (`box / deco / cyl / sph / pbr / MATS`), the existing function **names and
> signatures**, and the existing collider behaviour. Poly counts stay PSX-low
> (chunky low-segment cylinders, boxes for everything blocky). The only cost
> increase is a handful of extra `deco()` boxes per prop and slightly busier
> height canvases — both negligible vs. the lighting/shadow budget.
>
> **Do NOT hand-edit the HTML from this doc blindly** — each block below says
> exactly *which existing function or MATS entry it REPLACES*. Replace whole
> functions / whole `MATS.x = pbr(...)` statements, 1-for-1.

---

## PART A — DIAGNOSIS: why the walls/floors read flat

I traced the texture pipeline end to end (`pbr()` → `ctex()` → `boxGeo()` UV
scaling → `MeshStandardMaterial`). The geometry/UV plumbing is actually
**correct** — the flatness is a *content + tuning* problem, not a broken-UV
problem. Five concrete causes, in order of impact:

**1. Height maps are pure noise — no STRUCTURE.** Most wall/ceiling/grime
materials use `h:(c,s)=>noiseFill(c,s,140,16)`. That's a flat field of ±16/255
(~6%) random grain. A derived normal map from pure high-frequency noise produces
a *uniform sparkle* with **no large-scale features** — no cinderblock courses, no
drywall seams, no panel joints, no scuff hollows. Under a single raking
flashlight the eye reads large-scale relief as "depth"; uniform micro-noise just
reads as "slightly rough flat paint." This is the #1 reason walls look flat.

**2. `normalScale` (`ns`) is too low for a dark, raking-light scene.** Values in
the file: floor `ns:0.6`, wall `ns:0.5`, carpet `ns:0.5`. The whole game is lit
by one dim moving spotlight at grazing angles — exactly the condition where you
want a *strong* normal response. `ns` 0.5–0.6 is appropriate for bright even
lighting; here it should be ~1.0–1.6 for walls/ceiling and ~0.9–1.2 for floors.

**3. Height contrast (`hs`) is low where structure exists.** `hs` is the slope
multiplier inside `normalCanvas()`. Walls use `hs:1.1`. Even when we add seams,
a low `hs` flattens the slope of those seams. Structural lines want `hs` ~2–3.

**4. Feature frequency vs. world tiling makes grout/seams huge and sparse.**
Floors/tiles draw 4 grid lines across a 256px canvas, then `boxGeo` tiles that
canvas only `world*uv` times. A 9 m room floor at `uv:0.6` → ~5.4 tile-repeats,
but each canvas only has a 4×4 grid → grout spacing ≈ 0.4 m *of canvas* but
stretched, so lines are thick, far apart, and low-frequency = reads flat/blurry.
Fix: draw a denser, finer grid in the canvas (8×8) AND bump `uv` so real-world
grout spacing lands around 30–60 cm. The `map` and `normalMap` share the same
geometry UVs (both built with `rep` ≈ 1), so they stay aligned automatically —
no UV-mismatch bug, but the *density* must be raised on both.

**5. A few structural MATS have no normal map at all where they should.**
`MATS.door` is fine-ish, but `screen/glass/mirror/redlight/exit/lamp` are raw
`MeshStandardMaterial` with no normal — that's correct (emissive/transparent),
**leave those alone.** The ones that must gain real relief are the big surface
materials: `floor, wall, wallGrime, ceil, carpet, tile, wood, metal` and the
soft goods `sheet, fabric, carpet`.

### The fix in one sentence
Give every big surface material a **height map with real low-frequency structure**
(seams / blocks / grout / planks / scuffs) layered over the existing fine grain,
**raise `hs` to 2–3 on structural lines and `ns` to ~1.0–1.6**, and **tune `uv`
repeats** (passed at the call site, see Part C) so features tile a few times per
wall. No engine/UV-code changes required.

> **Optional 1-line global boost (engine side, NOT required but recommended).**
> Canvas textures default to `THREE.LinearEncoding`. The albedo `map` of a PBR
> material should be sRGB so mid-tones don't wash out (which also makes relief
> shading read better). In `ctex()` you *could* add, for color maps only, an
> encoding flag — but since `ctex` is shared by normal maps (which must stay
> linear) the safe, contained fix is to set it inside `pbr()` on the albedo map
> only. See **Part B.0**. This is a 2-line change and is the only change outside
> the `buildMaterials()` body.

---

## PART B — TEXTURE-DEPTH FIX (drop-in materials)

### B.0  (Optional, recommended) sRGB on albedo only — 2 lines in `pbr()`

> **REPLACES:** the `map:ctex(a,opt.rep),` line inside `function pbr(name,opt)`
> (line ~183). Everything else in `pbr()` stays identical. This makes albedo
> mid-tones correct so the relief shading isn't flattened by a washed-out base.

```js
  // inside pbr(): build albedo texture, then flag it sRGB (normal map stays linear)
  const albTex = ctex(a, opt.rep);
  if ('sRGBEncoding' in THREE) albTex.encoding = THREE.sRGBEncoding; // color map only
  const m=new THREE.MeshStandardMaterial({
    map:albTex, roughness:opt.rough==null?0.85:opt.rough, metalness:opt.metal||0,
    color:opt.tint||0xffffff, emissive:opt.emissive||0x000000, emissiveIntensity:opt.emi||1,
    transparent:!!opt.transparent, opacity:opt.opacity==null?1:opt.opacity, side:opt.side||THREE.FrontSide
  });
```

*(If you'd rather not touch `pbr()` at all, skip B.0 — the material retunes in
B.1 still fix the flatness; the look is just a touch flatter in the midtones.)*

---

### B.1  Surface materials — drop-in replacements

> **REPLACES the following statements inside `function buildMaterials()`**
> (lines ~193–233), 1-for-1, same `MATS.<name>` keys:
> `floor, wall, wallGrime, ceil, carpet, wood, metal, fabric, sheet, tile, door,
> scrubs, gown, dark, cardboard`.
>
> **DO NOT replace** `MATS.glass, mirror, screen, redlight, exit, lamp` — those
> are correct as-is (emissive / transparent, no normal map wanted).
>
> Each one adds a small **structure pass** to the height fn (seams, blocks,
> grout, planks, scuffs, weave) on top of the existing grain, and raises
> `hs`/`ns`. Albedo gets matching painted lines so the relief is *believable*,
> not floating. Canvas size bumped to 384 for the big tiling surfaces so the
> finer structure survives tiling without aliasing (still tiny vs. budget).

```js
function buildMaterials(){

  /* ---- FLOOR: scuffed institutional linoleum, 8x8 fine grid + long scuffs ---- */
  MATS.floor=pbr('floor',{rep:1,size:384,rough:0.62,metal:0.04,
    alb:(c,s)=>{c.fillStyle='#41433b';c.fillRect(0,0,s,s);
      speck(c,s,2600,'#33352e',.5,1.4);speck(c,s,900,'#4d4f45',.4,1.6);
      // fine tile grid (8x8) — visible grout
      c.strokeStyle='rgba(20,20,17,.55)';c.lineWidth=2;
      for(let i=0;i<=8;i++){c.beginPath();c.moveTo(i*s/8,0);c.lineTo(i*s/8,s);c.stroke();
        c.beginPath();c.moveTo(0,i*s/8);c.lineTo(s,i*s/8);c.stroke();}
      // long mop/heel scuffs (low-frequency, give grazing-light streaks)
      c.strokeStyle='rgba(28,28,24,.30)';c.lineWidth=6;
      for(let i=0;i<7;i++){c.beginPath();const y=rnd(0,s);c.moveTo(0,y);
        c.bezierCurveTo(s*0.3,y+rnd(-30,30),s*0.7,y+rnd(-30,30),s,y+rnd(-20,20));c.stroke();}
      speck(c,s,40,'#56584c',.22,9);},
    h:(c,s)=>{noiseFill(c,s,150,18);
      // deep grout valleys (dark = low) + raised tile interiors
      c.strokeStyle='#000';c.lineWidth=4;
      for(let i=0;i<=8;i++){c.beginPath();c.moveTo(i*s/8,0);c.lineTo(i*s/8,s);c.stroke();
        c.beginPath();c.moveTo(0,i*s/8);c.lineTo(s,i*s/8);c.stroke();}
      // subtle bevel highlight just inside each grout line
      c.strokeStyle='rgba(210,210,210,.5)';c.lineWidth=1;
      for(let i=0;i<=8;i++){c.beginPath();c.moveTo(i*s/8+3,0);c.lineTo(i*s/8+3,s);c.stroke();}},
    hs:2.4, ns:1.05});

  /* ---- WALL: painted cinderblock — horizontal courses + vertical joints ---- */
  MATS.wall=pbr('wall',{rep:1,size:384,rough:0.95,
    alb:(c,s)=>{c.fillStyle='#5c5b51';c.fillRect(0,0,s,s);
      speck(c,s,2600,'rgba(82,81,71,.6)',.5,1.2);speck(c,s,14,'#4a4940',.5,20);
      blocks(c,s,4,8,'rgba(34,32,26,.55)','rgba(120,116,104,.18)'); // 4 courses, 8 blocks
      c.fillStyle='rgba(60,55,40,.12)';c.beginPath();c.ellipse(s*.72,s*.3,46,66,0,0,TAU);c.fill();},
    h:(c,s)=>{noiseFill(c,s,140,14);blocksH(c,s,4,8);},
    hs:2.6, ns:1.25});

  /* ---- WALL GRIME: same blockwork, darker, water-stained lower third ---- */
  MATS.wallGrime=pbr('wallGrime',{rep:1,size:384,rough:0.96,tint:0x9a978c,
    alb:(c,s)=>{c.fillStyle='#4a4940';c.fillRect(0,0,s,s);
      speck(c,s,3000,'rgba(40,38,30,.5)',.6,2);
      blocks(c,s,4,8,'rgba(22,20,15,.6)','rgba(96,92,82,.15)');
      // water stain runs down the lower portion
      const g=c.createLinearGradient(0,s*0.45,0,s);g.addColorStop(0,'rgba(30,25,15,0)');g.addColorStop(1,'rgba(26,20,10,.34)');
      c.fillStyle=g;c.fillRect(0,s*0.45,s,s*0.55);
      for(let i=0;i<6;i++){c.strokeStyle='rgba(20,15,8,.18)';c.lineWidth=rnd(3,8);
        const x=rnd(0,s);c.beginPath();c.moveTo(x,s*0.5);c.lineTo(x+rnd(-12,12),s);c.stroke();}},
    h:(c,s)=>{noiseFill(c,s,130,20);blocksH(c,s,4,8);},
    hs:2.8, ns:1.3});

  /* ---- CEILING: acoustic drop-tiles — 3x3 panels + perforation grain ---- */
  MATS.ceil=pbr('ceil',{rep:1,size:384,rough:0.95,
    alb:(c,s)=>{c.fillStyle='#6c6b60';c.fillRect(0,0,s,s);speck(c,s,3600,'#605f54',.5,1);
      // T-bar grid (3x3 drop tiles)
      c.strokeStyle='#3a3933';c.lineWidth=6;
      for(let i=0;i<=3;i++){c.beginPath();c.moveTo(i*s/3,0);c.lineTo(i*s/3,s);c.stroke();
        c.beginPath();c.moveTo(0,i*s/3);c.lineTo(s,i*s/3);c.stroke();}
      // pinhole perforation per tile + a brown water stain
      c.fillStyle='rgba(40,38,33,.5)';for(let i=0;i<1400;i++)c.fillRect(rnd(0,s),rnd(0,s),1,1);
      c.fillStyle='rgba(95,80,45,.22)';c.beginPath();c.ellipse(s*.3,s*.6,54,42,0,0,TAU);c.fill();},
    h:(c,s)=>{noiseFill(c,s,160,12);
      c.strokeStyle='#000';c.lineWidth=10; // deep T-bar grooves
      for(let i=0;i<=3;i++){c.beginPath();c.moveTo(i*s/3,0);c.lineTo(i*s/3,s);c.stroke();
        c.beginPath();c.moveTo(0,i*s/3);c.lineTo(s,i*s/3);c.stroke();}},
    hs:2.6, ns:1.2});

  /* ---- CARPET: low-pile loop — directional weave for grazing-light tooth ---- */
  MATS.carpet=pbr('carpet',{rep:1,size:256,rough:1,
    alb:(c,s)=>{c.fillStyle='#36433f';c.fillRect(0,0,s,s);
      speck(c,s,5200,'#2b3733',.6,1.1);speck(c,s,2800,'#41514c',.4,1);},
    h:(c,s)=>{noiseFill(c,s,140,40);
      // fine vertical loops + sparse horizontal rows = readable pile
      c.strokeStyle='rgba(255,255,255,.16)';c.lineWidth=1;
      for(let x=0;x<s;x+=3){c.beginPath();c.moveTo(x,0);c.lineTo(x,s);c.stroke();}
      c.strokeStyle='rgba(0,0,0,.16)';for(let y=0;y<s;y+=6){c.beginPath();c.moveTo(0,y);c.lineTo(s,y);c.stroke();}},
    hs:1.6, ns:0.95});

  /* ---- WOOD: stained planks — plank gaps + grain lines, real relief ---- */
  MATS.wood=pbr('wood',{rep:1,size:256,rough:0.6,metal:0.05,
    alb:(c,s)=>{c.fillStyle='#553f2b';c.fillRect(0,0,s,s);
      for(let i=0;i<30;i++){c.strokeStyle='rgba('+(44+rnd(-16,16)|0)+',30,18,.5)';c.lineWidth=rnd(1,4);
        c.beginPath();c.moveTo(0,i*s/30+rnd(-3,3));
        c.bezierCurveTo(s/3,i*s/30+rnd(-6,6),2*s/3,i*s/30+rnd(-6,6),s,i*s/30+rnd(-3,3));c.stroke();}
      // 4 plank seams (dark)
      c.strokeStyle='rgba(20,12,6,.7)';c.lineWidth=3;
      for(let i=1;i<4;i++){c.beginPath();c.moveTo(0,i*s/4);c.lineTo(s,i*s/4);c.stroke();}},
    h:(c,s)=>{noiseFill(c,s,150,16);
      c.strokeStyle='#000';c.lineWidth=4;for(let i=1;i<4;i++){c.beginPath();c.moveTo(0,i*s/4);c.lineTo(s,i*s/4);c.stroke();}
      // faint long grain grooves
      c.strokeStyle='rgba(60,60,60,.5)';c.lineWidth=1;
      for(let i=0;i<40;i++){const y=rnd(0,s);c.beginPath();c.moveTo(0,y);c.bezierCurveTo(s/3,y+rnd(-4,4),2*s/3,y+rnd(-4,4),s,y);c.stroke();}},
    hs:1.8, ns:0.8});

  /* ---- METAL: brushed panel — bolt rivets in corners + brushed streaks ---- */
  MATS.metal=pbr('metal',{rep:1,size:256,rough:0.38,metal:0.85,tint:0x9aa0a4,
    alb:(c,s)=>{c.fillStyle='#8a9094';c.fillRect(0,0,s,s);
      for(let i=0;i<s;i+=2){c.strokeStyle='rgba(120,128,132,'+rnd(.08,.3)+')';c.beginPath();c.moveTo(0,i);c.lineTo(s,i);c.stroke();}
      // corner rivets
      c.fillStyle='#5a6063';for(const px of[s*0.12,s*0.88])for(const py of[s*0.12,s*0.88]){c.beginPath();c.arc(px,py,3,0,TAU);c.fill();}
      speck(c,s,160,'#5a6063',.3,1.5);},
    h:(c,s)=>{noiseFill(c,s,160,7);
      // rivets raised + a couple of panel score lines
      c.fillStyle='#fff';for(const px of[s*0.12,s*0.88])for(const py of[s*0.12,s*0.88]){c.beginPath();c.arc(px,py,3,0,TAU);c.fill();}
      c.strokeStyle='#000';c.lineWidth=3;c.strokeRect(s*0.06,s*0.06,s*0.88,s*0.88);},
    hs:1.4, ns:0.55});

  /* ---- FABRIC: upholstery weave (chairs/cushions) ---- */
  MATS.fabric=pbr('fabric',{rep:1,size:256,rough:1,
    alb:(c,s)=>{c.fillStyle='#a59c8e';c.fillRect(0,0,s,s);speck(c,s,5600,'#928879',.4,1);},
    h:(c,s)=>{noiseFill(c,s,150,22);
      c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=1; // crosshatch weave
      for(let i=0;i<s;i+=4){c.beginPath();c.moveTo(i,0);c.lineTo(i,s);c.stroke();c.beginPath();c.moveTo(0,i);c.lineTo(s,i);c.stroke();}},
    hs:1.5, ns:0.85});

  /* ---- SHEET: wrinkled linen (beds, gurneys, the cold-storage shrouds) ---- */
  MATS.sheet=pbr('sheet',{rep:1,size:256,rough:1,tint:0xcfd2cc,
    alb:(c,s)=>{c.fillStyle='#c8cabf';c.fillRect(0,0,s,s);speck(c,s,2200,'#b6b8ac',.3,2);
      c.fillStyle='rgba(120,90,60,.12)';c.beginPath();c.ellipse(s*.6,s*.5,30,18,0,0,TAU);c.fill();},
    h:(c,s)=>{noiseFill(c,s,150,30);
      // soft wrinkle folds
      c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=3;
      for(let i=0;i<10;i++){const y=rnd(0,s);c.beginPath();c.moveTo(0,y);c.bezierCurveTo(s/3,y+rnd(-40,40),2*s/3,y+rnd(-40,40),s,y+rnd(-20,20));c.stroke();}
      c.strokeStyle='rgba(0,0,0,.4)';for(let i=0;i<10;i++){const y=rnd(0,s);c.beginPath();c.moveTo(0,y);c.bezierCurveTo(s/3,y+rnd(-40,40),2*s/3,y+rnd(-40,40),s,y+rnd(-20,20));c.stroke();}},
    hs:1.7, ns:0.95});

  /* ---- TILE: glazed wet-room tile — fine 6x6 grout, glossy ---- */
  MATS.tile=pbr('tile',{rep:1,size:384,rough:0.32,metal:0.05,
    alb:(c,s)=>{c.fillStyle='#cdd2cf';c.fillRect(0,0,s,s);
      c.strokeStyle='rgba(120,130,128,.7)';c.lineWidth=3;
      for(let i=0;i<=6;i++){c.beginPath();c.moveTo(i*s/6,0);c.lineTo(i*s/6,s);c.stroke();
        c.beginPath();c.moveTo(0,i*s/6);c.lineTo(s,i*s/6);c.stroke();}
      speck(c,s,240,'#aeb4b0',.3,2);
      // a little mildew in random grout corners
      c.fillStyle='rgba(60,70,55,.25)';for(let i=0;i<12;i++)c.fillRect((rint(0,6))*s/6-2,(rint(0,6))*s/6-2,5,5);},
    h:(c,s)=>{noiseFill(c,s,185,6);
      c.strokeStyle='#000';c.lineWidth=6; // deep grout
      for(let i=0;i<=6;i++){c.beginPath();c.moveTo(i*s/6,0);c.lineTo(i*s/6,s);c.stroke();
        c.beginPath();c.moveTo(0,i*s/6);c.lineTo(s,i*s/6);c.stroke();}
      // bevel highlight inside grout = crisp glazed edge
      c.strokeStyle='rgba(220,220,220,.6)';c.lineWidth=2;
      for(let i=0;i<=6;i++){c.beginPath();c.moveTo(i*s/6+4,0);c.lineTo(i*s/6+4,s);c.stroke();}},
    hs:3.0, ns:1.35});

  /* ---- DOOR: two recessed panels, deeper relief ---- */
  MATS.door=pbr('door',{rep:1,size:256,rough:0.55,metal:0.1,tint:0xbcb0a0,
    alb:(c,s)=>{c.fillStyle='#6b5b48';c.fillRect(0,0,s,s);
      c.strokeStyle='rgba(40,30,20,.6)';c.lineWidth=10;
      c.strokeRect(s*.14,s*.1,s*.72,s*.36);c.strokeRect(s*.14,s*.54,s*.72,s*.36);
      c.strokeStyle='rgba(255,245,225,.18)';c.lineWidth=2; // inner highlight bevel
      c.strokeRect(s*.16,s*.12,s*.68,s*.32);c.strokeRect(s*.16,s*.56,s*.68,s*.32);},
    h:(c,s)=>{noiseFill(c,s,150,10);
      c.strokeStyle='#000';c.lineWidth=12;
      c.strokeRect(s*.14,s*.1,s*.72,s*.36);c.strokeRect(s*.14,s*.54,s*.72,s*.36);},
    hs:1.8, ns:0.85});

  /* ---- SCRUBS / GOWN / DARK / CARDBOARD: small relief bumps, keep cheap ---- */
  MATS.scrubs=pbr('scrubs',{rep:1,rough:0.9,tint:0xffffff,
    alb:(c,s)=>{c.fillStyle='#2f6b73';c.fillRect(0,0,s,s);speck(c,s,1600,'#27595f',.4,1.3);},
    h:(c,s)=>{noiseFill(c,s,150,18);},hs:1.2,ns:0.6});
  MATS.gown=pbr('gown',{rep:1,rough:1,tint:0xcfd6d8,
    alb:(c,s)=>{c.fillStyle='#aeb8ba';c.fillRect(0,0,s,s);for(let i=0;i<s;i+=10){c.strokeStyle='rgba(150,160,160,.4)';c.beginPath();c.moveTo(0,i);c.lineTo(s,i);c.stroke();}},
    h:(c,s)=>{noiseFill(c,s,150,18);for(let i=0;i<s;i+=10){c.strokeStyle='#000';c.lineWidth=2;c.beginPath();c.moveTo(0,i);c.lineTo(s,i);c.stroke();}},hs:1.4,ns:0.7});
  MATS.dark=pbr('dark',{rep:1,rough:0.7,tint:0x6a6e76,
    alb:(c,s)=>{c.fillStyle='#15171b';c.fillRect(0,0,s,s);speck(c,s,600,'#1e2127',.4,2);},
    h:(c,s)=>noiseFill(c,s,120,16),hs:1.3,ns:0.7});
  MATS.cardboard=pbr('cardboard',{rep:1,rough:0.95,
    alb:(c,s)=>{c.fillStyle='#7a6347';c.fillRect(0,0,s,s);speck(c,s,900,'#6a553c',.4,2);
      c.strokeStyle='rgba(40,30,18,.5)';c.lineWidth=2;c.strokeRect(s*.08,s*.08,s*.84,s*.84);
      c.beginPath();c.moveTo(s*.08,s*.5);c.lineTo(s*.92,s*.5);c.stroke();}, // flap seam
    h:(c,s)=>{noiseFill(c,s,150,12);
      c.strokeStyle='#fff';c.lineWidth=2;c.strokeRect(s*.08,s*.08,s*.84,s*.84);
      c.strokeStyle='#000';c.beginPath();c.moveTo(s*.08,s*.5);c.lineTo(s*.92,s*.5);c.stroke();
      // corrugation ridges (cheap directional relief)
      c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=1;for(let x=0;x<s;x+=4){c.beginPath();c.moveTo(x,0);c.lineTo(x,s);c.stroke();}},
    hs:1.5,ns:0.7});

  // ---- emissive / transparent: UNCHANGED (no normal map wanted) ----
  MATS.glass=new THREE.MeshStandardMaterial({color:0x1a2226,roughness:0.08,metalness:0.4,transparent:true,opacity:0.45});
  MATS.mirror=new THREE.MeshStandardMaterial({color:0x121a1d,roughness:0.05,metalness:0.9,transparent:true,opacity:0.7});
  MATS.screen=new THREE.MeshStandardMaterial({color:0x06140b,roughness:0.25,emissive:0x2f8f5a,emissiveIntensity:0.6});
  MATS.redlight=new THREE.MeshStandardMaterial({color:0x330000,emissive:0xff2222,emissiveIntensity:1.4});
  MATS.exit=new THREE.MeshStandardMaterial({color:0x330000,emissive:0xff3a3a,emissiveIntensity:1.2});
  MATS.lamp=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xfff2d0,emissiveIntensity:1.3});
}
```

### B.2  Two tiny helpers the materials above use — ADD them once

> **ADD** these next to the other texture helpers (near `speck` / `noiseFill`,
> lines ~162–173). They draw a brick/block course pattern into the albedo
> (`blocks`) and a matching height field (`blocksH`) with running-bond offset.
> Used by `MATS.wall` and `MATS.wallGrime`.

```js
// running-bond block COURSES for albedo: dark mortar joints + faint block highlight
function blocks(ctx,s,rows,cols,mortar,hi){
  const bh=s/rows, bw=s/cols;
  ctx.lineWidth=Math.max(2,s/180);
  for(let r=0;r<rows;r++){
    const off=(r%2)?bw/2:0;             // running bond
    ctx.strokeStyle=mortar;
    ctx.beginPath();ctx.moveTo(0,r*bh);ctx.lineTo(s,r*bh);ctx.stroke();           // horizontal joint
    for(let cc=0;cc<=cols;cc++){const x=((cc*bw+off)%s);
      ctx.beginPath();ctx.moveTo(x,r*bh);ctx.lineTo(x,(r+1)*bh);ctx.stroke();}    // vertical joints
    // faint top-edge highlight on each block
    ctx.strokeStyle=hi;ctx.beginPath();ctx.moveTo(0,r*bh+2);ctx.lineTo(s,r*bh+2);ctx.stroke();
  }
}
// matching HEIGHT field: blocks raised (grey), mortar recessed (black)
function blocksH(ctx,s,rows,cols){
  const bh=s/rows, bw=s/cols;
  ctx.fillStyle='#9a9a9a';ctx.fillRect(0,0,s,s);   // block faces = mid/raised
  ctx.strokeStyle='#000';ctx.lineWidth=Math.max(4,s/110);
  for(let r=0;r<=rows;r++){ctx.beginPath();ctx.moveTo(0,r*bh);ctx.lineTo(s,r*bh);ctx.stroke();}
  for(let r=0;r<rows;r++){const off=(r%2)?bw/2:0;
    for(let cc=0;cc<=cols;cc++){const x=((cc*bw+off)%s);
      ctx.beginPath();ctx.moveTo(x,r*bh);ctx.lineTo(x,(r+1)*bh);ctx.stroke();}}
}
```

---

## PART C — UV / REPEAT TUNING AT CALL SITES (no code edits, reference table)

The visible tiling is `world_size × uv`. The values currently passed are mostly
fine once the canvases have real structure; the table below is the
**recommended `uv` per surface** so features land at a believable real-world
spacing. These are the `opt.uv` args already accepted by `box/deco/boxGeo` — you
only change the **number** at the relevant call sites if a surface still looks
too stretched or too busy after Part B. **Most call sites already match; flagged
rows are the only ones worth nudging.**

| Surface (how it's spawned) | Current `uv` | Recommended `uv` | Why |
|---|---|---|---|
| Floor / ceiling via `roomShell` | `0.6` | **0.6 (keep)** | 8×8 grid now → grout ≈ 30–40 cm. Good. |
| Walls via `wallRun` | `0.4` | **0.45** | 4 courses → block ≈ 0.7 m tall; 0.45 keeps courses readable on tall walls. |
| Big crates / lockers (`box(...,{uv:1})`) | `1` | **1 (keep)** | rivets/seams read at 1:1. |
| Tile rooms (bathroom/exam) floor | `0.6` | **0.7** | 6×6 grout → ~25–30 cm tile, correct for a wet room. |

> If you want a single global nudge instead of per-call edits, the cheapest lever
> is the `hs`/`ns` already baked into Part B — leave `uv` alone. The table is
> only for fine polish.

---

## PART D — IMPROVED PROPS (drop-in, same names + signatures)

> All blocks below **REPLACE the same-named function** in the
> `/* ---------- detailed props ---------- */` section (lines ~315–351).
> Signatures are unchanged so every existing call site keeps working. Colliders
> use `box()` / `addCollider()` for the blocking volume; fine detail is `deco()`
> (no collider). Cylinders stay chunky (6–10 segments) for the PSX silhouette.
>
> **Note on rotation:** the original props ignore `ry` for most detail (they pre-
> rotate individual `deco` boxes). To keep this robust *and* cheap, the rewrites
> below build each prop in **local space inside a `THREE.Group`**, rotate the
> group by `ry`, then add it to `WORLD.group`, and place the collider with a
> rotation-aware footprint. This is the single biggest readability win: parts
> stay attached and oriented correctly.

### D.0  One shared helper for grouped props — ADD once

> **ADD** near the prop section. Lets each prop build in local coords then drop
> into the world rotated, while still using the `MATS`/mesh look (shadows on).
> `gmesh` is the grouped analogue of `mesh()`; `gbox`/`gdec` are box/deco that
> add into a given group in LOCAL space.

```js
// grouped-prop helpers: build in local space, attach to a parent group
function gmesh(parent,geo,mat,x,y,z,rotY){const m=new THREE.Mesh(geo,mat);
  m.position.set(x,y,z);if(rotY)m.rotation.y=rotY;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function gbox(parent,mat,x,y,z,w,h,d,uv){return gmesh(parent,boxGeo(w,h,d,uv||0.7),mat,x,y,z);}
function gcyl(parent,mat,x,y,z,rt,rb,h,seg){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||8),mat);
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
// place a group in the world at (x,z) rotated ry, and add a rotation-aware collider AABB
function placeProp(g,x,z,ry,colW,colD,tag){g.position.set(x,0,z);if(ry)g.rotation.y=ry;WORLD.group.add(g);
  if(colW){const c=Math.abs(Math.cos(ry||0)),s=Math.abs(Math.sin(ry||0));
    addCollider(x,z,colW*c+colD*s,colW*s+colD*c,tag||'prop');}return g;}
```

### D.1  `propChair`  — seat + back + 4 tapered legs + rails + bevel

> REPLACES `propChair(x,z,ry)`.

```js
function propChair(x,z,ry){const g=new THREE.Group();
  // seat (chamfered: thin top deck + slightly smaller base = bevel read)
  gbox(g,MATS.fabric,0,0.46,0,0.50,0.07,0.50,1);
  gbox(g,MATS.wood ,0,0.41,0,0.46,0.05,0.46,1);
  // backrest: two posts + padded panel, leaning back slightly
  gmesh(g,boxGeo(0.05,0.55,0.05,1),MATS.wood,-0.21,0.74,-0.22);
  gmesh(g,boxGeo(0.05,0.55,0.05,1),MATS.wood, 0.21,0.74,-0.22);
  const pad=gmesh(g,boxGeo(0.46,0.30,0.05,1),MATS.fabric,0,0.78,-0.225);pad.rotation.x=-0.12;
  // tapered legs (cylinders, chunky)
  for(const dx of[-0.21,0.21])for(const dz of[-0.21,0.21])gcyl(g,MATS.metal,dx,0.22,dz,0.022,0.035,0.44,6);
  // stretcher rails between legs
  gbox(g,MATS.metal,0,0.12,-0.21,0.42,0.03,0.03,1);
  gbox(g,MATS.metal,0,0.12, 0.21,0.42,0.03,0.03,1);
  placeProp(g,x,z,ry||0,0.56,0.56,'prop');}
```

### D.2  `propDesk`  — top + apron + 4 legs + a real drawer with pull

> REPLACES `propDesk(x,z,w,d)`. (Same signature; no `ry` arg, like the original.)

```js
function propDesk(x,z,w,d){const g=new THREE.Group();
  const T=0.78;
  gbox(g,MATS.wood,0,T,0,w,0.06,d,0.8);            // top
  // apron (front + sides), inset
  gbox(g,MATS.wood,0,T-0.10,-(d/2-0.04),w-0.10,0.12,0.04,0.8);
  gbox(g,MATS.wood,-(w/2-0.04),T-0.10,0,0.04,0.12,d-0.10,0.8);
  gbox(g,MATS.wood, (w/2-0.04),T-0.10,0,0.04,0.12,d-0.10,0.8);
  // 4 legs
  for(const dx of[-(w/2-0.07),(w/2-0.07)])for(const dz of[-(d/2-0.07),(d/2-0.07)])
    gbox(g,MATS.wood,dx,T/2-0.03,dz,0.07,T-0.06,0.07,1);
  // a drawer on the front-right with a metal pull
  const dxp=w/2-0.34;
  gbox(g,MATS.wood,dxp,T-0.20,d/2-0.07,0.30,0.16,0.05,1);
  gbox(g,MATS.metal,dxp,T-0.20,d/2-0.05,0.12,0.025,0.03,1);
  placeProp(g,x,z,0,w,d,'prop');}
```

### D.3  `propBed`  — frame + mattress + pillow + blanket overhang + headboard

> REPLACES `propBed(x,z,ry)`. Keeps the `'bed'` collider tag and the hide-spot
> usage at call sites intact (the call sites still push their own `hideSpots`).

```js
function propBed(x,z,ry){const g=new THREE.Group();
  // base frame (boxed rail) — local: long axis = X
  gbox(g,MATS.metal,0,0.30,0,2.05,0.18,1.0,1);
  // mattress
  gbox(g,MATS.sheet,0,0.46,0,1.96,0.16,0.94,0.9);
  // blanket: covers foot 2/3, overhangs the sides (slightly wider/longer)
  gbox(g,MATS.fabric,0.35,0.50,0,1.25,0.10,1.02,0.9);
  gbox(g,MATS.fabric,0.35,0.40,0.50,1.25,0.20,0.04,1);   // side drape +
  gbox(g,MATS.fabric,0.35,0.40,-0.50,1.25,0.20,0.04,1);  // side drape -
  // pillow at head (-X end), puffed (two stacked offset boxes)
  gbox(g,MATS.sheet,-0.72,0.55,0,0.46,0.10,0.78,0.9);
  gbox(g,MATS.sheet,-0.72,0.60,0,0.40,0.08,0.70,0.9);
  // headboard (tall, -X) and footboard (short, +X)
  gbox(g,MATS.metal,-1.0,0.62,0,0.06,0.85,1.0,1);
  gbox(g,MATS.metal, 1.0,0.45,0,0.06,0.45,1.0,1);
  // 4 short legs
  for(const dx of[-0.92,0.92])for(const dz of[-0.42,0.42])gcyl(g,MATS.metal,dx,0.11,dz,0.03,0.03,0.22,6);
  placeProp(g,x,z,ry||0,2.1,1.0,'bed');}
```

### D.4  `propMonitor`  — bezel + glowing screen + stand + base (keeps the light)

> REPLACES `propMonitor(x,z)`. Preserves the green screen-glow `PointLight` and
> a `0.4×0.4` prop collider so existing call sites behave the same.

```js
function propMonitor(x,z){const g=new THREE.Group();
  gcyl(g,MATS.metal,0,0.05,0,0.16,0.20,0.10,8);     // base
  gcyl(g,MATS.metal,0,0.6,0,0.04,0.04,1.1,6);       // pole
  // head: bezel box + recessed glowing screen on the front (+Z local)
  const head=new THREE.Group();head.position.set(0,1.55,0);g.add(head);
  gmesh(head,boxGeo(0.66,0.50,0.07,1),MATS.dark,0,0,0);          // bezel
  const scr=new THREE.Mesh(boxGeo(0.56,0.40,0.02,1),MATS.screen);scr.position.set(0,0,0.045);head.add(scr);
  gmesh(head,boxGeo(0.10,0.04,0.05,1),MATS.metal,0,-0.30,0);     // chin
  // CRT-ish back hump
  gmesh(head,boxGeo(0.4,0.34,0.18,1),MATS.dark,0,0,-0.12);
  const L=new THREE.PointLight(0x2f8f5a,0.5,3,2);L.position.set(0,1.55,0.4);g.add(L);
  placeProp(g,x,z,0,0.66,0.5,'prop');}
```

### D.5  `propLocker`  — door, vents, handle (keeps hide-spot + 'locker' tag)

> REPLACES `propLocker(x,z,ry,id)`. Returns the body mesh (some call sites read
> the return) and still pushes the `hideSpots` entry. Tag `'locker'` preserved.

```js
function propLocker(x,z,ry,id){const g=new THREE.Group();
  const body=gbox(g,MATS.metal,0,1.0,0,0.6,2.0,0.6,1);   // shell
  // recessed door on +Z face
  gbox(g,MATS.metal,0,1.0,0.30,0.50,1.88,0.03,1);
  // two louver vent bands (top + bottom)
  for(const yy of[1.62,0.42])for(let i=0;i<4;i++)gbox(g,MATS.dark,0,yy-i*0.05,0.32,0.34,0.02,0.02,1);
  // handle + lock
  gbox(g,MATS.metal,0.18,1.0,0.33,0.04,0.16,0.04,1);
  gcyl(g,MATS.metal,0.18,0.80,0.33,0.02,0.02,0.03,6);
  placeProp(g,x,z,ry||0,0.6,0.6,'locker');
  WORLD.hideSpots.push({x,z,r:1.0,kind:'locker',id});
  return body;}
```

### D.6  `propShelf`  — uprights + back + 3–4 shelves + a few items

> REPLACES `propShelf(x,z,ry,n)`. Keeps the `(x,z,ry,n)` signature.

```js
function propShelf(x,z,ry,n){const g=new THREE.Group();n=n||3;
  const H2=2.0,W=1.6,D=0.4;
  // 2 uprights + 2 cross braces (local long axis = X)
  for(const dx of[-(W/2-0.03),(W/2-0.03)]){gbox(g,MATS.wood,dx,H2/2,-(D/2-0.03),0.05,H2,0.05,1);
    gbox(g,MATS.wood,dx,H2/2, (D/2-0.03),0.05,H2,0.05,1);}
  // thin back panel
  gbox(g,MATS.wood,0,H2/2,-(D/2-0.01),W-0.06,H2,0.02,0.8);
  // shelves
  for(let i=0;i<n;i++)gbox(g,MATS.wood,0,0.35+i*((H2-0.4)/(n-1||1)),0,W-0.06,0.04,D-0.04,0.8);
  // a few items: boxes / a bottle / a folder, sprinkled on shelves
  const items=[MATS.cardboard,MATS.dark,MATS.sheet,MATS.cardboard];
  for(let i=0;i<n;i++){const sy=0.35+i*((H2-0.4)/(n-1||1));
    if(i%2===0){gbox(g,items[i%items.length],-0.45,sy+0.13,0,0.26,0.22,0.26,1);
      gcyl(g,MATS.dark,0.2,sy+0.16,0.02,0.05,0.06,0.30,6);}
    else{gbox(g,MATS.cardboard,0.3,sy+0.10,0,0.5,0.18,0.28,1);}}
  placeProp(g,x,z,ry||0,W,D,'prop');}
```

### D.7  `propSink`  — counter + basin + faucet + mirror

> REPLACES `propSink(x,z)`. Mirror faces -Z (same as original layout).

```js
function propSink(x,z){const g=new THREE.Group();
  gbox(g,MATS.tile,0,0.55,0,0.7,0.45,0.5,1);          // vanity body
  gbox(g,MATS.tile,0,0.79,0,0.72,0.04,0.52,1);        // counter lip
  // recessed basin
  gmesh(g,boxGeo(0.38,0.10,0.30,1),MATS.metal,0,0.74,0.02);
  // faucet (gooseneck-ish: post + spout) + handle
  gcyl(g,MATS.metal,0,0.90,-0.16,0.02,0.02,0.18,6);
  gbox(g,MATS.metal,0,0.99,-0.10,0.025,0.025,0.14,1);
  gbox(g,MATS.metal,0.08,0.90,-0.18,0.06,0.03,0.03,1);
  // mirror on the wall behind (-Z)
  gmesh(g,boxGeo(0.6,0.7,0.04,1),MATS.mirror,0,1.5,-0.24);
  placeProp(g,x,z,0,0.7,0.5,'prop');}
```

### D.8  `propGurney`  — chunky bed + mattress + side rails + 4 caster legs

> REPLACES `propGurney(x,z,ry)`.

```js
function propGurney(x,z,ry){const g=new THREE.Group();
  gbox(g,MATS.metal,0,0.80,0,2.0,0.10,0.7,1);          // deck
  gbox(g,MATS.sheet,0,0.87,0,1.9,0.07,0.64,0.9);       // mattress pad
  // raised side rails
  gbox(g,MATS.metal,0,0.96,0.33,1.6,0.03,0.03,1);
  gbox(g,MATS.metal,0,0.96,-0.33,1.6,0.03,0.03,1);
  for(const dx of[-0.7,0.7]){gcyl(g,MATS.metal,dx,0.90,0.33,0.02,0.02,0.12,6);gcyl(g,MATS.metal,dx,0.90,-0.33,0.02,0.02,0.12,6);}
  // 4 legs + casters
  for(const dx of[-0.85,0.85])for(const dz of[-0.28,0.28]){
    gcyl(g,MATS.metal,dx,0.42,dz,0.03,0.03,0.76,6);
    gcyl(g,MATS.dark ,dx,0.05,dz,0.07,0.07,0.07,8);}
  placeProp(g,x,z,ry||0,2.0,0.7,'prop');}
```

### D.9  `propToilet`, `propBox`, `propFishtank`, `propVent`, `propPoster` — light touch

> Optional polish. `propToilet`, `propBox`, `propVent`, `propPoster`,
> `propFishtank` already read acceptably; these add a little form. Drop-in
> REPLACEMENTS, same signatures. (Skip if you want to keep the diff small.)

```js
function propToilet(x,z){const g=new THREE.Group();
  gbox(g,MATS.tile,0,0.22,0,0.40,0.44,0.30,1);         // pedestal
  gcyl(g,MATS.tile,0,0.46,0.04,0.22,0.20,0.12,10);     // bowl
  gbox(g,MATS.tile,0,0.62,-0.18,0.42,0.40,0.16,1);     // tank
  gbox(g,MATS.sheet,0,0.50,0.04,0.40,0.04,0.30,1);     // lid/seat
  placeProp(g,x,z,0,0.45,0.55,'prop');}

function propBox(x,z){const g=new THREE.Group();const sz=rnd(0.42,0.55);
  gbox(g,MATS.cardboard,0,sz/2,0,sz,sz,sz,1);
  // open flaps
  gmesh(g,boxGeo(sz,0.02,sz*0.5,1),MATS.cardboard,0,sz, sz*0.25).rotation.x=-0.5;
  gmesh(g,boxGeo(sz,0.02,sz*0.5,1),MATS.cardboard,0,sz,-sz*0.25).rotation.x= 0.5;
  placeProp(g,x,z,rnd(-0.4,0.4),sz,sz,'prop');}

function propFishtank(x,z){const g=new THREE.Group();
  gbox(g,MATS.wood,0,0.4,0,1.5,0.8,0.7,0.8);           // stand
  gmesh(g,boxGeo(1.4,1.0,0.6,1),MATS.glass,0,1.3,0);   // tank
  gbox(g,MATS.dark,0,0.86,0,1.42,0.08,0.62,1);         // gravel line
  const w=new THREE.PointLight(0x3a7,0.4,3,2);w.position.set(0,1.6,0);g.add(w);
  placeProp(g,x,z,0,1.5,0.7,'prop');}

function propVent(x,y,z,ry){const g=new THREE.Group();
  gmesh(g,boxGeo(0.6,0.4,0.04,1),MATS.metal,0,0,0);    // frame
  for(let i=0;i<5;i++)gmesh(g,boxGeo(0.54,0.04,0.05,1),MATS.dark,0,0.14-i*0.07,0.01); // louvers
  g.position.set(x,y,z);if(ry)g.rotation.y=ry;WORLD.group.add(g);}   // no collider (wall-mounted)

function propPoster(mat,x,y,z,ry,w,h){const g=new THREE.Group();
  gmesh(g,boxGeo((w||1.1)+0.04,(h||1.3)+0.04,0.02,1),MATS.dark,0,0,-0.01); // frame backing
  gmesh(g,boxGeo(w||1.1,h||1.3,0.02,1),mat,0,0,0.01);
  g.position.set(x,y,z);if(ry)g.rotation.y=ry;WORLD.group.add(g);}   // no collider
```

---

## PART E — NEW PROPS (3 useful additions)

> **ADD** these new functions in the prop section. They use the same builders and
> are cheap. Call them from `buildClinic()` (suggested call sites listed per
> prop). All have correct colliders via `placeProp`.

### E.1  `propIVStand(x,z)` — IV pole on a wheeled base + drip bag

Great for exam, sleep-lab, cold storage, MRI. ~Very cheap.

```js
function propIVStand(x,z){const g=new THREE.Group();
  // 5-spoke base + casters
  for(let i=0;i<5;i++){const a=i/5*TAU;gbox(g,MATS.metal,Math.cos(a)*0.18,0.04,Math.sin(a)*0.18,0.22,0.03,0.05,1);
    gcyl(g,MATS.dark,Math.cos(a)*0.24,0.03,Math.sin(a)*0.24,0.04,0.04,0.04,6);}
  gcyl(g,MATS.metal,0,1.0,0,0.018,0.022,1.9,6);          // pole
  // top hooks
  gbox(g,MATS.metal,0,1.92,0,0.18,0.03,0.03,1);
  gcyl(g,MATS.metal,0.09,1.86,0,0.012,0.012,0.10,6);
  // saline bag (slightly translucent sheet look) + drip line
  const bag=gmesh(g,boxGeo(0.14,0.26,0.05,1),MATS.sheet,0.09,1.70,0);bag.material=MATS.sheet;
  gcyl(g,MATS.glass,0.09,1.35,0,0.004,0.004,0.5,4);      // thin line
  placeProp(g,x,z,0,0.5,0.5,'prop');return g;}
```
*Suggested calls:* `propIVStand(3.4,-9.6);` (exam), `propIVStand(-5.2,-36);`
(cold storage), `propIVStand(11.6,-7.2);` (MRI).

### E.2  `propWheelchair(x,z,ry)` — folding chair on two big wheels

Strong horror silhouette for hallways / observation / cold storage.

```js
function propWheelchair(x,z,ry){const g=new THREE.Group();
  // seat + back
  gbox(g,MATS.fabric,0,0.50,0,0.46,0.06,0.44,1);
  const back=gmesh(g,boxGeo(0.46,0.50,0.05,1),MATS.fabric,0,0.76,-0.21);back.rotation.x=-0.10;
  // armrests
  gbox(g,MATS.dark,-0.25,0.66,0,0.05,0.05,0.40,1);
  gbox(g,MATS.dark, 0.25,0.66,0,0.05,0.05,0.40,1);
  // push handles
  gcyl(g,MATS.metal,-0.22,0.92,-0.22,0.018,0.018,0.18,6);
  gcyl(g,MATS.metal, 0.22,0.92,-0.22,0.018,0.018,0.18,6);
  // two large rear wheels (thin cylinders on their side)
  for(const sx of[-1,1]){const wheel=gcyl(g,MATS.dark,sx*0.27,0.34,-0.05,0.34,0.34,0.05,12);
    wheel.rotation.z=Math.PI/2;
    const rim=gcyl(g,MATS.metal,sx*0.27,0.34,-0.05,0.30,0.30,0.045,8);rim.rotation.z=Math.PI/2;}
  // small front casters
  for(const sx of[-0.2,0.2])gcyl(g,MATS.dark,sx,0.10,0.24,0.10,0.10,0.04,8);
  // footplate
  gbox(g,MATS.metal,0,0.20,0.30,0.34,0.04,0.10,1);
  placeProp(g,x,z,ry||0,0.7,0.8,'prop');return g;}
```
*Suggested calls:* `propWheelchair(-2.0,-20.0,0.6);` (south hall),
`propWheelchair(6.2,-12.4,Math.PI);` (observation), `propWheelchair(-4.6,-35,0.4);`
(cold storage — very effective).

### E.3  `propTVcart(x,z,ry)` — wheeled AV cart with a CRT (diegetic dread)

Pairs perfectly with the story's tape-dubbing theme. Has a glowing CRT face.

```js
function propTVcart(x,z,ry){const g=new THREE.Group();
  // two shelves + 4 posts + casters
  gbox(g,MATS.dark,0,0.62,0,0.7,0.04,0.6,1);   // top shelf
  gbox(g,MATS.dark,0,0.30,0,0.7,0.04,0.6,1);   // bottom shelf
  for(const dx of[-0.31,0.31])for(const dz of[-0.26,0.26]){
    gcyl(g,MATS.metal,dx,0.46,dz,0.02,0.02,0.34,6);
    gcyl(g,MATS.metal,dx,0.14,dz,0.02,0.02,0.30,6);
    gcyl(g,MATS.dark ,dx,0.04,dz,0.05,0.05,0.05,8);}
  // CRT on top: box body + glowing front
  const tv=new THREE.Group();tv.position.set(0,0.92,0);g.add(tv);
  gmesh(tv,boxGeo(0.62,0.50,0.5,1),MATS.dark,0,0,0);
  const face=new THREE.Mesh(boxGeo(0.5,0.38,0.02,1),MATS.screen);face.position.set(0,0.02,0.255);tv.add(face);
  // VCR on bottom shelf
  gmesh(g,boxGeo(0.5,0.10,0.34,1),MATS.metal,0,0.39,0.05);
  const L=new THREE.PointLight(0x2f8f5a,0.45,3,2);L.position.set(0,0.95,0.5);g.add(L);
  placeProp(g,x,z,ry||0,0.7,0.6,'prop');return g;}
```
*Suggested calls:* `propTVcart(-3.0,-26.8,0.3);` (processing/dubbing room — on-
theme), `propTVcart(6.4,-14.2,Math.PI);` (observation),
`propTVcart(15.0,-6.4,-Math.PI/2);` (sleep lab corner).

### E.4 (bonus) `propClock(x,y,z,ry)` — institutional wall clock

Wall-mounted, no collider, cheap. Reads "3:33 AM" dread. Uses `signMat` for the
face so it's a real readable clock.

```js
function propClock(x,y,z,ry){const g=new THREE.Group();
  gcyl(g,MATS.dark,0,0,0.02,0.16,0.16,0.04,12);          // rim
  const faceMat=signMat([{t:'12',sz:18}],'#e8e6dc','#222'); // simple light face
  const face=new THREE.Mesh(new THREE.CircleGeometry(0.14,16),faceMat);face.position.z=0.041;g.add(face);
  gbox(g,MATS.dark,0,0.04,0.05,0.012,0.10,0.006,1);      // minute hand
  const hh=gbox(g,MATS.dark,0.03,0.0,0.05,0.07,0.012,0.006,1);hh.rotation.z=-0.6; // hour hand
  g.position.set(x,y,z);if(ry)g.rotation.y=ry;WORLD.group.add(g);}
```
*Suggested calls:* `propClock(0,2.4,8.9,Math.PI);` (lobby),
`propClock(-1.46,2.3,-10.5,Math.PI/2);` (nurses), `propClock(0,2.4,-16.8,0);`
(break room).

---

## PART F — INTEGRATION CHECKLIST & BUDGET

**Order of operations (one pass through `buildMaterials()` + the prop section):**

1. *(optional)* Apply **B.0** (2 lines in `pbr()`).
2. **ADD** helpers: **B.2** (`blocks`,`blocksH`), **D.0** (`gmesh/gbox/gcyl/placeProp`).
3. **REPLACE** the body of `buildMaterials()` with **B.1**.
4. **REPLACE** props **D.1–D.8** (and optionally **D.9**) 1-for-1 by name.
5. **ADD** new props **E.1–E.4** and sprinkle the suggested call sites into
   `buildClinic()` (all optional, all cheap).

**What changed vs. flat look, at a glance:**
- Every wall/floor/ceiling/tile material now has **structural relief** (blocks,
  grout, T-bar, planks) — not just noise.
- `ns` raised to **~1.0–1.35** on big surfaces, `hs` to **~2.4–3.0** on
  structural lines → the raking flashlight now carves visible shadow into
  seams/grout. This is the single change that makes it "hit."
- Albedo gains matching painted lines so relief is grounded, plus optional sRGB
  so midtones don't wash the relief out.

**Budget impact (kept deliberately small):**
- *Textures:* big tiling surfaces bumped 256→384 px (≈2.25× pixels on ~6
  materials, built **once** at load, cached in `_texCache`). Normal maps are
  derived once. Net: a few ms of extra load time, **zero per-frame cost** — same
  number of texture binds.
- *Geometry:* props gain ~6–18 extra small meshes each. They're `BoxGeometry` /
  low-seg `CylinderGeometry` (6–12 segs). Total scene tri count rises modestly;
  all are static under one `WORLD.group`. No new lights except the ones already
  inside `propMonitor` and the optional new AV-cart/IV props (each is a short-
  range `PointLight`, same pattern already used widely).
- *Colliders:* unchanged count philosophy — one AABB per blocking prop via
  `placeProp` (rotation-aware), same as before.

**PSX fidelity preserved:** chunky 6–12 segment cylinders, hard box forms, flat
institutional palette; the *depth* comes entirely from normal maps + raking
light + the VHS pass, which is exactly the Fears-to-Fathom recipe in
`01_ART_BIBLE.md` (§2, §9).

---

## PART G — QUICK QA (what to look for after integrating)

- Stand close to any **cinderblock wall** and sweep the flashlight sideways —
  you should see the mortar courses catch shadow and the blocks pop. If still
  flat, raise `MATS.wall` `ns` to 1.5 and `hs` to 3.0.
- Look down a **tile bathroom floor** at a grazing angle — grout lines should
  read as crisp recessed grid. Tune `uv` 0.6→0.7 if tiles look too big.
- **Ceiling** T-bar grid should be visible from below under the point lights.
- **Chairs/desks/beds**: parts stay attached and correctly oriented at every
  `ry`; legs are round and tapered; the bed reads as frame+mattress+pillow+
  blanket, not a striped box.
- No prop should let the player walk through its main volume (collider check),
  and wall-mounted items (vent/poster/clock) should have **no** collider.
