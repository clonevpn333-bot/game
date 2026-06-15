# 01 — ART BIBLE  ⭐ (MOST IMPORTANT)
### How the humanoid models and textures look, and how they are built

> **North-star principle: _Photographic until it isn't._**
> Every asset is authored to film-set realism, then pushed through a degraded
> consumer-camcorder pipeline. Clean realism reads as a tech demo. *Dirty*
> realism — real skin, real grime, viewed through a tape that's been watched too
> many times — reads as a **memory of something that actually happened to you.**
> That uncanny "found footage of a real night" quality is the entire *Fears to
> Fathom* charm, and it is the single most important thing in this game.

---

## 0. Contents
1. Engine, pipeline & tools
2. The Degradation Layer (the signature "look")
3. Humans — the master spec (skin, eyes, hair, teeth, nails, sweat)
4. The cast — individual character designs & how each is textured
5. The Visitor — designing an entity out of *wrongness*, not gore
6. Wardrobe & hero props (the electrode harness is a character)
7. Environments & set dressing (the Ashgrove Sleep Center)
8. The Dream-Decay system (how a real room rots into a nightmare)
9. Lighting & camera
10. Color script
11. Diegetic UI & the end-card
12. Texture budgets, naming & QA checklist
13. Mood board (words + reference shots to gather)

---

## 1. Engine, pipeline & tools

| Stage | Tool | Why |
|---|---|---|
| Engine | **Unreal Engine 5.4+** | Lumen GI + reflections, Virtual Shadow Maps, MetaHuman, Niagara, Chaos cloth, and a post-process stack flexible enough to build the camcorder filter as a custom material. |
| Hero humans | **MetaHuman Creator → MetaHuman DNA + custom sculpt** | Fastest route to *anatomically correct* faces with a production-grade facial rig (700+ joints / blendshape hybrid). We do **not** ship stock MetaHumans — each is re-sculpted in the DNA so faces are unrecognizable as presets. |
| Sculpt & wrinkle/displacement maps | **ZBrush** | Pore-level detail, tension wrinkle maps for the 17 FACS regions, asymmetry. |
| Texturing | **Substance 3D Painter** (assets) + **Designer** (tiling materials) | PBR authoring, smart-material grime, the medical-grime library. |
| Cloth | **Marvelous Designer → Chaos Cloth** | The hospital gown's thinness and the Tech's scrubs need real drape and translucency. |
| Environment scan kit | **Quixel Megascans + targeted photogrammetry (RealityCapture)** | Linoleum, ceiling tiles, scuffed vinyl — real scanned surfaces carry the clinic's "institutional sadness." |
| Hair | **Unreal Groom (strand)** for hero, **cards** for background | Oily, flat, fluorescent-lit hair. |
| Procedural decay / dream sim | **Houdini** (baked) + **runtime material blends** | The rot, the displacement, the "set melting" between sleep cycles. |
| Audio-reactive visuals | Niagara + custom material params driven by the audio mid-band | Walls breathe with the heartbeat. |

**Why MetaHuman matters for the brief.** The request is *extremely humanoid
models.* MetaHuman gives us the one thing hand-modeling can't reliably hit on a
small team: a **rig that drives believable micro-expression** (the difference
between a scary face and a Halloween mask is the eyes and the 6 frames around a
smile). We then make each human ours by re-sculpting topology and authoring
every texture from scratch.

---

## 2. The Degradation Layer (the signature "look")

This is the post-process chain applied **last**, over a fully realistic render.
It is the *Fears to Fathom* fingerprint. A real, runnable reference
implementation of this exact chain lives in
[`../tech/shaders/SmallHours_PostProcess.hlsl`](../tech/shaders/SmallHours_PostProcess.hlsl),
and a working browser version drives the proof-of-concept in [`../poc/`](../poc/).

**Order of operations (top of the stack first):**

1. **Internal-resolution downscale.** Render at native, then resample the scene
   color to a **~480–600p** buffer before upscaling back. Kills the "too sharp"
   tell instantly. Sharpness becomes a horror dial we can turn.
2. **Chroma subsampling + bleed.** Separate luma/chroma; blur chroma horizontally
   (~2–4 px) so reds and blues smear past their edges — the unmistakable analog
   "color runs ahead of the picture" look. The red REC dot and blood bleed first.
3. **Chromatic aberration.** Radial RGB split, stronger toward frame edges,
   driven up during fear spikes.
4. **Halation / blow-out bloom.** Bright sources (fluorescents, monitors, the
   EXIT sign) bloom into soft haloes; whites clip warm.
5. **Tape artifacts.**
   - *Head-switching noise:* a torn, jittering band of static across the **bottom
     ~6%** of frame — the dead giveaway of VHS playback.
   - *Tracking errors / dropout:* horizontal tear lines and brief signal-loss
     glitches, scripted at story beats and randomized in dream states.
   - *Time-base wobble:* gentle horizontal warble on scanlines.
6. **Scanlines / interlacing.** Soft even/odd field separation, especially on
   motion (interlace combing on fast camera turns).
7. **Grain:** two layers — fine film grain (luma) + coarse, color-speckled tape
   grain that crawls.
8. **Lens:** subtle barrel distortion + vignette + a faint smeared fingerprint on
   the "lens" in the upper-right.
9. **Color LUT:** the per-act grade (see §10). The base LUT crushes blacks
   slightly green and pushes skin a hair sallow under fluorescents.
10. **HUD overlay (diegetic):** `REC ●`, a live **timecode that reads the real
    system clock** (see Story & Surprise), battery icon, and `SP` (standard play).

**Escalation as a tool.** The filter is not static. As dread rises, we:
- raise grain + aberration + bleed,
- introduce tracking tears and 1–3 frame dropouts,
- briefly **drop the filter entirely** at the worst moment (a half-second of
  pristine, silent, high-resolution clarity is more frightening than any
  glitch — the mask slips and you see the thing *clearly*),
- then slam the degradation back. That clean-frame "blink" is a signature beat.

---

## 3. Humans — the master spec

Every human in the game is built to this spec, then individualized.

### 3.1 Geometry & topology
- **LOD0:** ~90k–140k tris (face ~35k of it; eyes, teeth, interior mouth modeled).
- Clean edge-flow for the 17 FACS deformation regions; extra loops at nasolabial
  fold, brow, and the orbicularis oculi (the muscle that makes a smile *real*).
- Hands are hero geometry — the player sees their own hands constantly, and the
  Tech's gloved hands do a lot of acting. Separate nail geometry.

### 3.2 Skin shader (the most important material in the game)
A layered subsurface model. Channels authored at **8K**, shipped at **4K** with a
tiling **micro-detail normal** for pores:

| Map | Purpose |
|---|---|
| **Albedo (base color)** | Authored *flat/even* — all the life comes from the maps below, never painted-in shadows. Includes vellus discoloration, faint capillaries, lip color bleed. |
| **Subsurface / thickness** | Drives Burley (Christensen-Burley) SSS. Ears, nostrils, fingertips, eyelids glow red in backlight. **This single map is what separates "human" from "mannequin."** |
| **Specular roughness (dual-lobe)** | Two specular lobes — a broad soft sheen + a tight oily highlight on the T-zone, nose, lips. Micro-roughness breakup map so highlights shimmer like real skin, never plastic. |
| **Normal (macro)** | Sculpted wrinkles, scars, asymmetry. |
| **Micro-normal (tiled pore detail)** | Tiled ~10–20× across the body, blended by a mask so cheeks/nose/forehead get the right pore density. This is the detail the camcorder filter *almost* hides — and the "almost" is the uncanny part. |
| **Curvature / cavity** | Drives blood-flow tint and dirt accumulation. |
| **Blood-flow / flush mask** | A dynamic param: ears/cheeks/knuckles redden under stress or pressure; lips pale in the Visitor's presence. |

Dynamic skin behaviors over the hour:
- **Sweat** grows as **clearcoat decals** along the hairline, upper lip, and
  sternum — roughness drops locally, a wet specular sheen appears. By the climax
  the player's own hands (visible) glisten.
- **Goosebumps**: a tessellation/normal pop on the forearms triggered at scares.
- **Pallor**: SSS intensity is a global param; in dream/paralysis states we drain
  it toward a waxy, **embalmed** look — the same model, suddenly corpse-cold.

### 3.3 Eyes (where the horror lives)
- Two-layer eye: refractive **cornea** over the sclera/iris, real index-of-
  refraction so the iris sits *inside* the eye and catches caustics.
- **Wet meniscus** at the lower lid (a thin wet rim), tear-line specular.
- **Limbal ring**, individual iris fiber texture, **pupil dilation** bound to
  lighting *and* to story (dilates in the dark, blows wide at fear, pins to a dot
  when the Tech "isn't really there").
- **Micro-saccades** — eyes never sit perfectly still on a living person; we add
  tiny constant jitter + blink timing variance. Removing this is a horror tool:
  the **dead-eye pass** = freeze saccades, kill the catchlight, flatten corneal
  SSS. A face we've watched be warm all night goes *off* in three frames.

### 3.4 Hair, teeth, nails
- **Hair:** strand groom for Eli (player hands rarely show hair, but the Tech's
  hair and the subjects' hair are strand). Authored oily and flat — fluorescent
  light makes hair look unwashed. Flyaways catch rim light.
- **Teeth:** translucent enamel with SSS, slight yellowing, real gum line, plaque
  in the gaps. The Tech's teeth are **too even and too white** — orthodontic-
  perfect, the only "expensive" thing about him. Wrong on purpose.
- **Nails:** the player's nails are **bitten down** (characterization through the
  thing you stare at all game). The Tech's are clipped clinically square under
  the gloves; you notice when a glove tears.

---

## 4. The cast — individual designs & texturing notes

### 4.1 ELI MERCER — the player (you)
Seen as: hands, forearms, lower body when you look down, and **reflections**
(mirror, dark monitor, the observation glass — reflections matter enormously here;
see Surprise doc).
- 20, broke, exhausted. Bitten nails, a pale **smartwatch tan line** (sold the
  watch), a friendship-bracelet that's frayed, a cheap hospital gown that ties at
  the back and never quite covers.
- Texture story: ink stain on the side of the left hand (you've been job-applying
  / filling forms all week), a healing scrape on the knuckle. **Small, specific,
  human.** The player should glance at their hands and believe they're *theirs.*

### 4.2 THE NIGHT TECHNICIAN — "Marcus Vane" (the antagonist)
**The single most important character model in the game.** The whole horror is
that he is *almost* warm. Design him to be likeable for 20 minutes so the turn
lands.

- **Facial design — the "uncanny kind":**
  - **Smile without the eyes.** Rig his default friendly smile using zygomatic
    major (mouth) **with the orbicularis oculi underweighted** — so he smiles but
    his eyes never crinkle. The brain reads this subconsciously as "fake" long
    before the player can say why.
  - **Interpupillary distance** set ~3–4% wide of natural. Imperceptible
    consciously; quietly *off.*
  - **Blink rate** authored slightly too low. He holds eye contact a beat past
    comfortable.
  - **Too-even teeth** (see §3.4), foundation-matte skin — he wears makeup under
    fluorescents, so his skin has *less* visible pore detail than the subjects.
    He is the one human who looks slightly *less* real than the others, and the
    micro-normal map is deliberately dialed down to sell it.
- **Texturing:** clean, tidy, but a coffee stain on the lanyard, bitten cuticles
  he hides, a faint old scar at the hairline. A man who has done this many times.
- **Wardrobe:** teal scrubs, a fleece zip-up with the Ashgrove logo, a lanyard
  with a badge whose photo doesn't match his face (an Easter egg you can catch),
  blue **nitrile gloves** (thin-film shader; they squeak; one tears in Act 3 and
  you see the clinical square nail underneath).
- **Escalation pass:** in dream/observed states his pores enlarge, foundation
  cracks, SSS drains — the warmth was the makeup; under it he is the same waxy
  cold as the Visitor. Implication, never stated: *what is he?*

### 4.3 THE INTAKE COORDINATOR — "Renata" (brief, Act 1)
The friendly woman at the desk who checks you in, gives you the forms and the
gown. Warm, overworked, real. Her job in the art design is **calibration**: she's
what a *genuinely* normal person looks like, so your gut can later flag how Vane
is different. She leaves at 11pm ("you're in good hands with Marcus") — the last
normal human you see. Texturing: real, tired, a cardigan with a pilled cuff,
reading glasses on a chain.

### 4.4 THE OTHER SUBJECTS (glimpsed, never befriended)
- **Room 2 — the sleeper you hear but never clearly see.** Snores, then doesn't.
- **Room 4 — "the long subject."** Through a door-crack: someone who has been in
  the study far too long. Pressure sores, a beard grown in, eyes open. You are
  not supposed to see Room 4. Texturing is the full *embalmed/pallor* pass on a
  living model — alive, but kept.
- Variety in age/body/ethnicity so the clinic reads as indiscriminate: it takes
  whoever is desperate enough.

### 4.5 Crowd/background fidelity
Background humans use card hair and 2K textures, but **never** appear at the same
time/space as a hero human under the same light — we protect the hero faces.

---

## 5. The Visitor — an entity built from *wrongness*

The ambiguous threat. Is it the drug in the gel? A shared hallucination the
clinic induces and records? Real? **The art never resolves it**, and that
ambiguity is the *Fears to Fathom* restraint. No gore. No jump-scare design.
Horror by *proportion and stillness.*

- **It is a correct human silhouette** — right height, right proportions — which
  is exactly why it's worse than a monster. The brain expects a person and gets
  *almost* one.
- **No subsurface scattering.** Skin like **wet paper stretched over bone.** The
  one material rule that makes a humanoid read as "thing, not person." Roughness
  inverted (it's faintly, sickly *moist*), albedo drained to grey-violet.
- **It does not animate while observed.** Look at it and it is utterly,
  impossibly still — stiller than a real thing can be (we literally freeze the
  skeletal mesh, including the micro-jitter every other character has, so it
  reads as *too still*). Look away — peripheral vision, a turn of the camera, a
  blink in a sleep-paralysis beat — and its position changes. Never *seen*
  moving. This is the "weeping angel" idea executed with horror discipline:
  always closer, never caught.
- **Where it lives:** the corners the fluorescents don't reach, the far end of the
  corridor, the foot of the bed during sleep paralysis, and — once — **standing
  in the observation room, on the other side of the glass, watching you the way
  the Tech does.**
- **The clean-frame reveal:** the only time the camcorder filter fully drops (§2)
  is the one moment you see the Visitor in perfect clarity. That half-second of
  hi-fidelity stillness is the most expensive frame in the game and the one
  players will describe to their friends.

---

## 6. Wardrobe & hero props

### 6.1 The electrode harness — a HERO prop (and a character)
The thing they wire you into. Lavish detail here; the player stares at it.
- **Ag/AgCl electrode cups** (gold and silver), each with a glob of **conductive
  gel** — a translucent, refractive, slightly-too-thick gel with its own SSS and a
  wet rim. The gel is cold; we sell "cold" with a bluish SSS and a sheen.
- **Color-coded leads** braided into a loom, an **EEG cap** (the perforated mesh),
  a chest **respiration belt**, a fingertip **pulse-ox** with its red glow, an
  **IV line** "for hydration" (it isn't).
- The wires are a leash. As you move, they tug. Removing them is a core temptation
  (see Gameplay). When you finally do, the gel strings and the adhesive pulls skin
  — a wince-worthy tactile material moment.

### 6.2 Other wardrobe
- **Hospital gown:** thin cotton with real translucency (cloth SSS), backlit by
  the corridor light when you stand in the doorway — vulnerable, exposed.
- **Tech's scrubs + fleece:** see §4.2.
- **Bedsheets:** Marvelous Designer drape, institutional thin, a faint old stain
  near the pillow that you'll think about. Chaos Cloth so they shift when you do.
- **The clipboard & consent forms:** readable paper props with real legalese (and
  one clause, in fine print, that signs away more than sleep).

---

## 7. Environments — the Ashgrove Sleep Center

Architecture: a 1980s medical office in a half-empty strip-mall, repurposed.
Institutional, underfunded, *clean in the way that hides things.* Scanned
surfaces carry the mood:

- **Waiting room (Act 1):** beige chairs, a water cooler that gurgles, expired
  magazines, a children's-cartoon poster about "good sleep," a **fish tank** (a
  single fish — note it; it matters at the end), a TV playing a silent infomercial.
  Anesthetic teal/beige palette. This is the calmest, most ordinary room — so the
  rest hurts more.
- **Corridor:** flickering fluorescents, **scuffed linoleum** (real scan), water-
  stained drop-ceiling tiles (one is ajar), hand-sanitizer dispensers, a fire-exit
  sign whose red bleeds in the filter. Numbered doors: 1–5. You are Room 3.
- **The sleep room (the main stage):** the bed, the bedside **clock that shows the
  real time**, the call button on a cord, a wall **camera with a red REC dot and a
  night-vision IR ring**, the harness rig, and — dominating one wall — the
  **one-way observation mirror.** A vent. A water stain shaped like nothing until
  3am. Cold blue light + red REC accents.
- **The observation room (behind the glass):** the *other side.* Monitors showing
  EEG/EKG/the IR camera feed of the bed, a clipboard, a coffee gone cold, a wall
  of labeled tapes (subject names, dates — including names you'll recognize), a
  door marked **STAFF ONLY → basement.** Lit by monitor-glow green.
- **The basement / utility (the reveal):** where the tapes are processed and the
  truth lives. Boilers, a cot, a wall of monitors, and the **archive**. Sodium
  amber and black. We hold the worst of it in implication.

**Set-dressing rule:** every prop is either *characterization* (the bitten pen,
the wrong badge photo, the too-many tapes) or *a future scare's setup* (the ajar
ceiling tile, the vent, the stain, the fish tank). Nothing is neutral.

---

## 8. The Dream-Decay system (real room → nightmare)

Between sleep cycles the *same* sleep room rots, then resets, so the player can
never trust which state they're in. Built so it's clearly the same space (re-using
the hero assets — efficient *and* scarier).

Techniques, layered:
- **Texture mip-bias push** + roughness drift: surfaces go damp, dim, *wrong.*
- **World-aligned rot decals** (Houdini-baked, runtime-blended): mold creeps up
  the walls from the corners, the linoleum buckles, the ceiling weeps.
- **Geometry displacement:** walls bow with the heartbeat (audio-coupled material
  WPO); the corridor lengthens (a tunneling FOV + scaled geometry) when you walk
  toward an exit that won't arrive.
- **Palette swap** to sodium amber/black (see §10).
- **Population:** the Visitor's rules (§5) apply; the clock ticks but the *time
  stops advancing* (a tell that you're under).
- **Reset tell:** waking is a wet inhale, a snap to cold blue, the filter
  re-stabilizing, the clock jumping forward. Players learn to read the *filter
  itself* as a sleep-state indicator — which we then weaponize by faking a
  wake-up that's still a dream (the filter "stabilizes" but the clock is wrong).

---

## 9. Lighting & camera

- **Lighting:** Lumen GI; nearly all light is **practical** (fluorescent tubes,
  monitors, the REC dot, the EXIT sign, moonlight through venetian blinds casting
  bar shadows across the bed and your body). Fluorescents **flicker** on a subtle
  authored curve and full-blackout on cue. The IR night-vision look (green, flat,
  retro-reflective eyes) is used when we cut to the room camera's feed.
- **Camera:** first-person, **handheld camcorder framing** — gentle breathing
  sway tied to the player's simulated breath (which the player partly controls;
  see Gameplay), slight barrel distortion, shallow DOF that racks when you focus
  (interact-look), and the diegetic HUD (REC, timecode, battery). FOV ~70,
  narrowing to ~55 (claustrophobic) in paralysis. Motion is weighty and human —
  no twitchy FPS turn speed; you move like a tired person who can't run properly.

---

## 10. Color script (per act)

| Act / state | Palette | Key light | Feeling |
|---|---|---|---|
| Arrival / waiting room | Anesthetic teal, beige, sodium streetlight outside | Warm-ish fluorescents | Mundane, tired, "this is fine" |
| Wiring up / intake | Clinical white-blue, the gel's cold blue sheen | Exam lamp | Vulnerable, exposed |
| Sleep room (awake) | Cold blue + red REC accent + moonlight bars | Moon + REC dot | Watched, alone |
| Dreams / decay | Sodium amber → black, sickly green edges | Sourceless dread-glow | Untethered |
| Sleep paralysis | Desaturated, single cold rim on the Visitor | Almost none | Helpless |
| Observation room | Monitor-glow green, EEG phosphor | Monitors only | Complicit |
| Basement / reveal | Amber/black, a single swinging bulb | Bare bulb | Truth, too late |
| The clean-frame moment | **Full color, full resolution, no filter** | Real | *Oh.* |

---

## 11. Diegetic UI & the end-card

- **Phone:** Eli's cracked phone — texts (mom, the landlord, a friend), a banking
  app showing **-$43.18** that explains everything, the original ad screenshot,
  low battery anxiety. UI styled as a real, slightly-dated Android skin, shot
  *through* the camcorder filter like everything else.
- **Forms & monitors:** EEG/EKG readouts are real, readable waveforms (phosphor-
  green, with the dread-meter spike behavior described in Gameplay).
- **The end-card "Fear Profile":** the most important screen in the game. A
  clinical report printout (see `04_THE_SURPRISE.md`) — Subject name, session
  timecode (real), and a list of findings **about the player.** Designed as a
  dot-matrix/fax aesthetic on paper, REC light still blinking in the corner.

---

## 12. Texture budgets, naming & QA checklist

**Budgets (ship targets):**
- Hero skin: 4K albedo/normal/roughness/SSS + 2K micro-detail tiling.
- Hero props (harness, phone, clipboard): 2K–4K with packed ORM (Occlusion-
  Roughness-Metallic) maps.
- Environment trims & tiling: 2K Megascans-grade, packed.
- **Texel density target:** ~10.24 px/cm on hero surfaces; ~5.12 on environment.
- Memory: aggressive streaming + LOD; the camcorder downscale (§2) lets us ship
  lower mip bias in motion for free atmosphere.

**Naming convention:** `T_<Asset>_<Channel>` (e.g. `T_Vane_Skin_SSS`),
`M_<Asset>` for materials, `MI_` for instances, `SK_`/`SM_` for meshes,
`BP_` for blueprints. Full layout in
[`../tech/project_structure.md`](../tech/project_structure.md).

**Per-character QA checklist (the "is this human?" pass):**
- [ ] SSS reads in backlight (ears/nostrils glow)?
- [ ] Dual-lobe spec — skin shimmers, never plastic?
- [ ] Micro-saccades + variable blink present on living characters?
- [ ] Wet meniscus + catchlight in eyes?
- [ ] Pore micro-normal blended by region (not uniform)?
- [ ] Smile uses orbicularis (real) — and Vane's deliberately doesn't?
- [ ] Sweat/flush/pallor dynamic params wired to the stress system?
- [ ] Reads correctly **through the filter at 540p** (final check — always grade
      and review characters *through* the degradation, never clean)?

---

## 13. Mood board (gather these)

**Words:** anesthetic, fluorescent hum, latex, conductive gel, polite, patient,
*kind eyes that don't blink enough*, the smell of a clinic, 3am, a tape watched
too many times, embalmed, the foot of the bed.

**Reference to collect:** real polysomnography setups; 1980s strip-mall medical
offices; consumer Hi8/VHS night footage; sleep-paralysis patient illustrations;
the specific green of IR security cams; *Fears to Fathom*'s grain/grade;
*Visage*'s spaces; medical-supply catalogs (for the harness); the precise beige
of an underfunded waiting room.

**The test for every asset:** *Does it look like real footage of a real night
that someone is sorry they have?* If yes, ship it.
