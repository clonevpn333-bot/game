# 07 — MAP / WORLD SPEC  ⭐ (LEVEL DESIGN)
### *Small Hours — The Ashgrove Study* — the full facility, ~45-minute playthrough

> This document is the authoritative layout for the level designer and the story
> agent. Area IDs are **canonical** — the story agent references them by these exact
> names. Coordinates use the engine's world convention: **XZ plane, floor at y=0,
> ceiling at H = 3.0**, axis-aligned boxes only. Collision is cylinder-vs-AABB with
> **player radius r ≈ 0.32**; every door/gap below is sized **≥ 1.6** wide so the
> player fits with margin.
>
> Tone target: an underfunded strip-mall sleep clinic that is quietly something far
> worse. Clinical, grounded, fluorescent, water-stained. The dread is institutional.
> Nothing here is fantastical until you reach the basement, and even there the
> horror is **inventory and paperwork**, not spectacle.

---

## 0. ORIENTATION & CONVENTIONS

**Axes.** `+X` = east (right on the plan), `+Z` = south (toward the entrance),
`-Z` = north (into the clinical core and, past it, the service spine). Player
spawns at the south end (lobby), the building deepens northward, then the service
corridor runs east–west across the far north, with the **stair down** at its west
end into the basement.

**Why this shape.** It preserves the existing build (lobby at `(0,9)`, the central
hall, the six clinical rooms on the original ±X gaps) and grows it into a real
facility without moving anything that the current `buildClinic()` already places.
Everything new is *appended*; nothing existing is relocated.

**Heights.** All rooms use `H = 3.0` except the **basement**, which I spec at a
lower feel via prop placement and lighting (engine has one ceiling height; we read
"low" through swinging-bulb lights, exposed ducts, and `wallGrime`). The stair
corridor `M_STAIR` is the transition; the engine has no real vertical, so the
basement is laid out as a **separate slab to the far west/southwest** reached by a
long descending-feeling corridor (fog thickens, lights die, materials degrade), and
the player is teleported/faded down the stair (story trigger). Treat basement
coordinates as their own region; they do **not** physically overlap the ground
floor on the plan, so colliders never conflict.

**Reading the entries.** Each area gives: PURPOSE · CENTER (cx,cz) & SIZE (w×d) ·
OPENINGS / DOORS (with coords + neighbor) · LIGHTS (which flicker `F`, which cast
shadow `S`) · PROPS (with coords) · HIDE SPOTS · LOCKS & KEYS · ONE-WAY notes.

**Door-gap rule check.** Every `roomShell` gap and every corridor opening below is
**1.7 or 2.4 wide** (the two values the existing build uses). `addDoor` leaves a
clear span of ~1.4 in its own collider but is placed inside a **1.7-wide wall gap**,
so the walkable slot beside the swinging leaf is ≥ 1.6 minus leaf thickness — the
player (r 0.32, diameter 0.64) passes. Where a door must be generous (gurney
moves, the chase), I widen the host gap to **2.4**.

---

## 1. CANONICAL AREA LIST (with the 4 added spaces)

| ID | Name | Region | Center | Size (w×d) | New? |
|---|---|---|---|---|---|
| **A_VESTIBULE** | Entry airlock / front doors | Ground S | (0, 16.5) | 8 × 4 | NEW |
| **B_LOBBY** | Waiting room (SPAWN) | Ground S | (0, 9) | 14 × 12 | exists |
| **C_INTAKE** | Reception / consent office | Ground S | (8.5, 9) | 5 × 8 | NEW |
| **D_HALL_NORTH** | Central patient corridor | Ground core | (0, −6) | 3 × 18 | exists |
| **E_ROOM1** | Patient room 1 | Ground E | (4.2, 1.5) | 5 × 4 | NEW |
| **E_ROOM2** | Patient room 2 | Ground W | (−4.2, 1.5) | 5 × 4 | NEW |
| **E_ROOM3** | Patient room 3 — **yours** | Ground E | (4.2, −3) | 5 × 5 | exists |
| **E_ROOM4** | Patient room 4 — **the long subject** | Ground W | (−4.2, −8) | 5 × 5 | exists |
| **E_ROOM5** | Patient room 5 | Ground E | (8.6, −3) | 5 × 5 | NEW |
| **E_ROOM6** | Patient room 6 | Ground W | (−8.6, −8) | 5 × 5 | NEW |
| **F_BATHROOM** | Shared patient bathroom | Ground W | (−4.2, −3) | 5 × 4 | exists |
| **G_EXAM** | Exam / wiring room | Ground E | (4.2, −8) | 5 × 5 | exists |
| **H_SLEEPLAB** | Control room (polysomnograph) | Ground E | (8.8, −8) | 5 × 5 | NEW |
| **I_OBSERVATION** | Behind E_ROOM3's one-way mirror | Ground E | (4.6, −13) | 6 × 4 | exists |
| **J_RECORDS** | Tape archive | Ground W | (−4.6, −13) | 6 × 4 | exists |
| **K_BREAK** | Staff break room (+lockers, hide) | Ground core N | (0, −17) | 5 × 4 | exists |
| **L_HALL_SOUTH** | Service corridor (E–W) | Ground far N | (0, −21) | 24 × 3 | NEW |
| **M_STAIR** | Stairwell corridor → basement | Ground→base | (−13, −21) | 3 × 10 | NEW |
| **N_BOILER** | Boiler / utility | Basement | (−13, −33) | 7 × 7 | NEW |
| **O_COLDSTORAGE** | Cold storage — **the awful truth** | Basement | (−6, −36) | 7 × 6 | NEW |
| **P_SHIPPING** | Loading bay (the vendor) | Basement | (2, −33) | 8 × 8 | NEW |
| *+ Q_NURSES* | Nurses' station (hub) | Ground core | (0, −10.5) | 4 × 3 (open) | NEW |
| *+ R_MRI* | "Imaging" room (the chair) | Ground E | (13, −8) | 6 × 6 | NEW |
| *+ S_COURTYARD* | Courtyard window alcove | Ground W | (−12.5, −3) | 5 × 5 | NEW |
| *+ T_PROCESSING* | Tape duplication room | Basement | (−6, −28) | 6 × 4 | NEW |

**24 areas total** (20 canonical + 4 added). The four additions (`Q_NURSES`,
`R_MRI`, `S_COURTYARD`, `T_PROCESSING`) exist purely for **pacing**: a central hub
to orient the player, a single dread set-piece room mid-game, a "window to the
normal world you can't reach" beat, and a basement antechamber that bridges the
stair into the cold-storage gut-punch.

**Approximate footprint.** Ground floor occupies roughly **X ∈ [−15.5, +16]**
(≈ 31.5 m) by **Z ∈ [−22.5, +18.5]** (≈ 41 m) → about **31 × 41 m ≈ 1,290 m²**.
The basement slab occupies **X ∈ [−16.5, +6]** by **Z ∈ [−39, −26]** → about
**22.5 × 13 m ≈ 290 m²**. Total built footprint ≈ **1,580 m²** across ~24 spaces —
a genuinely sizable facility for a 45-minute first-person night.

---

## 2. GROUND FLOOR — AREA DETAILS

### A_VESTIBULE — entry airlock / front doors
- **Purpose.** The threshold. First and last room. The front doors you walk in
  through at 10:40pm and (if you escape) sprint out of at dawn. Mundane: a mat, a
  flickering exterior sign glow, a hand-sanitizer stand, a community pinboard.
- **Center (0, 16.5), size 8 × 4.**
- **Openings/doors.**
  - **North → B_LOBBY:** gap `[0, 2.4]` in the wall at `z = 14.5` (the lobby's
    existing south extent is z = 15; place the shared wall at **z = 14.5**, gap
    centered x = 0). Glass double-doors here = `addDoor(0, 14.5, 'x', 'd_front')`,
    **locked after Renata leaves** (story sets `d_front.locked = true` at 11:00pm;
    on the escape it is force-opened).
  - **South:** the actual exterior doors to the parking lot at `z = 18.5`, gap
    `[0, 2.4]`. This is the **win exit** in the Discharged ending — modeled as an
    `addItem` "front doors" target, with bright cold dawn light past it.
- **Lights.** `ceilLight(0, 16.5, 0xbfc8d0, 0.7, 8, false, true)` — buzzing,
  **flickers (F)**, no shadow. A red `MATS.exit` "EXIT" box over the south doors.
- **Props (6).**
  - `propPoster(signMat([{t:'ASHGROVE',sz:22},{t:'SLEEP CTR',sz:18}],'#15302a','#bfe8ff'), 0, 2.3, 18.45, Math.PI, 2.4, 1.0)` — exterior sign, faces in.
  - Floor mat: `deco(MATS.carpet, 0, 0.06, 16.5, 2.0, 0.04, 1.2)`.
  - Sanitizer stand: `cyl(MATS.metal, 3.2, 0.6, 17.4, 0.08, 0.1, 1.2, 10)`.
  - Pinboard (lore): `propPoster(signMat([{t:'MISSING',sz:20},{t:'have you seen',sz:13},{t:'R. ORTIZ?',sz:18}],'#d8d2c0','#552'), 3.7, 1.7, 16.5, -Math.PI/2, 0.9, 1.1)` — a flyer for a *previous* subject. Quiet horror; optional.
  - Wet-floor sign: `propBox(-2.8, 17.6)` retextured (or a `cyl` cone).
  - Bench: `propChair(-3.2, 16.5, 0)`.
- **Hide spots.** None (transit room).
- **One-way.** On the **escape**, the south exterior doors are the only useful exit;
  the north lobby door behind you can be slammed by the chase (story may relock).

### B_LOBBY — waiting room (SPAWN) *(exists — augment only)*
- **Purpose.** Where you spawn (`P.pos = [0,1.65,12.5]`). The most normal you will
  feel all night: fish tank, chairs, a silent infomercial, the consent desk's
  cousin. Renata greets you here.
- **Center (0, 9), size 14 × 12** — *as built.* Open north into D_HALL_NORTH via the
  existing `wallRun('z',3,-7,7,H,[[0,2.4]])` doorway at z = 3.
- **NEW openings to wire up:**
  - **South → A_VESTIBULE:** the south wall (currently solid at z = 15) gets a gap
    `[0, 2.4]`; rebuild as `wallRun('z', 15, -7, 7, H, [[0,2.4]])`.
  - **East → C_INTAKE:** east wall (currently solid at x = 7) gets a gap `[9, 2.0]`
    *(centered at z = 9, width 2.0)*; rebuild east wall as
    `wallRun('x', 7, 3, 15, H, [[9,2.0]])`. Door `addDoor(7, 9, 'z', 'd_intake')`.
- **Lights (as built).** `ceilLight(0,8,…,1.0,12,S)`, `ceilLight(-4,12,…,0.8,10,F)`,
  `ceilLight(4,12,…,0.8,10,F)`.
- **Props (as built).** Reception desk `propDesk(-3.5,5,3.4,1.2)`; fish tank
  `propFishtank(4.6,5,0)`; two rows of chairs; SLEEP WELL / ASHGROVE posters; the
  red EXIT box over the hall mouth.
- **Hide spots.** None.
- **One-way.** None. Hub for Act I.

### C_INTAKE — reception / consent office  *(NEW)*
- **Purpose.** Renata's office. Where the **consent forms** are signed (page 4 you
  don't read). A back office with a filing cabinet, the staff coat rack, and — found
  later — the first hint that "sessions" are *product*. After 3am it's where the
  **staff coffee mug is still warm** (someone's awake and it isn't you).
- **Center (8.5, 9), size 5 × 8.** Long room hugging the lobby's east side.
- **Openings/doors.**
  - **West → B_LOBBY:** gap `[9, 2.0]` at x = 6 (shared wall). `addDoor(7,9,'z','d_intake')` (see B_LOBBY).
  - **North → toward R_MRI corridor stub:** a **locked** internal door
    `addDoor(8.5, 5.6, 'x', 'd_intake_back', true, 'STAFF — keypad. Locked.')`,
    gap `[8.5, 1.7]` at z = 5.6, opening to a short service spur that reaches
    **R_MRI** (see §Connectivity). Opens with **STAFF KEYCARD**.
- **Lights.** `ceilLight(8.5, 7, 0xcfd2c0, 0.8, 8, false, false)`; a desk lamp
  `ceilLight(8.5, 11, 0xffe6b0, 0.4, 4, false, true)` — warm, flickers.
- **Props (8).**
  - `propDesk(8.5, 11.5, 2.6, 1.1)` — Renata's desk; clipboard + consent forms live here.
  - `propChair(8.5, 12.6, Math.PI)` and `propChair(7.4, 11.5, Math.PI/2)` (visitor side).
  - Filing cabinet: `box(MATS.metal, 10.3, 0.8, 7.5, 0.6, 1.6, 1.0, {uv:1})`.
  - Coat rack: `cyl(MATS.metal, 7.2, 1.0, 6.2, 0.06, 0.06, 2.0, 8)` with a hung gown `deco(MATS.gown, 7.2, 1.4, 6.3, 0.5, 0.9, 0.1)`.
  - Water cooler: `cyl(MATS.glass, 10.4, 0.9, 11.8, 0.18, 0.18, 0.6, 12)` on `propBox`.
  - Wall sign: `propPoster(signMat([{t:'INTAKE',sz:28},{t:'check-in →',sz:16}]), 8.5, 2.2, 5.1, 0, 1.4, 0.7)`.
  - Coffee mug on desk (warm at 3am — `deco` small cyl, story-flagged).
- **Hide spots.** **Knee-hole under the desk:** `WORLD.hideSpots.push({x:8.5, z:11.9, r:1.0, kind:'desk', id:'desk_intake'})`.
- **Locks & keys.** `d_intake_back` → **STAFF KEYCARD**.
- **One-way.** None.

### D_HALL_NORTH — central patient corridor  *(exists — extend)*
- **Purpose.** The spine. Six patient-room doors hang off it; you walk it in the gel
  haze on the way to bed and stagger back up it at 3:33am. The fluorescents here are
  the ones that **die one by one** as the night turns.
- **Center (0, −6), size 3 × 18** — as built, floor/ceiling slabs at `(0,*,−6)`.
- **Openings/doors (existing + NEW).** The built east/west wall runs already have
  gaps at z = −3, −8, −13. I **add** gaps at **z = 1.5** (E_ROOM1 / E_ROOM2) and
  keep the existing three. Rebuild the two long walls as:
  - East wall `wallRun('x', 1.5, -15, 3, H, [[1.5,1.7],[-3,1.7],[-8,1.7],[-13,1.7]])`
  - West wall `wallRun('x', -1.5, -15, 3, H, [[1.5,1.7],[-3,1.7],[-8,1.7],[-13,1.7]])`
  - North end opens into **Q_NURSES → K_BREAK** (existing break-room gap at z = −15,
    `[0,2.4]`) and onward.
- **Lights (as built + flag).** Seven lights `ceilLight(0, 1-i*2.6, …)` for i=0..6;
  i = 2 and i = 5 cast shadow; **all flicker**. Story kills lights northward as
  Act III escalates (set `rec.on = 0` on the northmost fixtures).
- **Props.** Wall signs: existing `ROOMS 1—5 →`. Add a wall-mounted hand-sanitizer
  `deco` and a gurney parked against the wall near the north end:
  `propGurney(0.0, -14.0, 0)` (also a soft chase obstacle). A ceiling **vent with an
  ajar tile** above z = −6: `propVent(0, 2.7, -6, 0)` + a tilted `deco` tile beside
  it (the Act-I-planted vent route hint).
- **Hide spots.** The parked gurney's underside isn't a hide; lockers live in K.
- **One-way.** None — but late-game the south end (toward lobby) is where the chase
  funnels you.

### E_ROOM1 — patient room 1  *(NEW)*
- **Purpose.** An *empty, made-up* room — establishes the type so E_ROOM3 (yours)
  and E_ROOM4 (occupied) read as variations. Early exploration; a readable
  "discharge summary" on the bed that's blank where the discharge date should be.
- **Center (4.2, 1.5), size 5 × 4.** Open **west** to D_HALL_NORTH.
- **Openings/doors.** `roomShell(4.2, 1.5, 5, 4, H, {w:true}, MATS.floor)`;
  door `addDoor(1.5, 1.5, 'z', 'd_r1')` in the hall gap `[1.5,1.7]`.
- **Lights.** `ceilLight(4.2, 1.5, 0x9fb6c8, 0.6, 7, false, true)` — flickers.
- **Props (6).** `propBed(4.6, 1.5, 0)`; `propMonitor(6.3, 0.3)` (dark/off);
  `propDesk(2.6, 0.4, 0.9, 0.7)`; a folded gown `deco(MATS.gown, 4.6, 0.72, 1.5, 0.5, 0.1, 0.4)`;
  bedside `propBox(6.0, 2.6)`; one-way mirror stub on the far wall
  `deco(MATS.mirror, 6.55, 1.6, 1.5, 0.08, 1.7, 1.8)` (every room has the glass).
- **Hide spots.** Under-bed: `{x:4.6, z:1.5, r:1.3, kind:'bed', id:'bed1'}`.
- **Locks.** None (open early).

### E_ROOM2 — patient room 2  *(NEW)*
- **Purpose.** Mirror of E_ROOM1 on the west. Holds a **lore note** ("Subject 2
  declined the IV — incomplete, no payout") and a phone left behind, dead. Adds
  symmetry and a hide spot on the escape route's far side.
- **Center (−4.2, 1.5), size 5 × 4.** Open **east** to D_HALL_NORTH.
- **Openings/doors.** `roomShell(-4.2, 1.5, 5, 4, H, {e:true}, MATS.floor)`;
  `addDoor(-1.5, 1.5, 'z', 'd_r2')` in the hall gap `[1.5,1.7]`.
- **Lights.** `ceilLight(-4.2, 1.5, 0x9fb6c8, 0.6, 7, false, true)`.
- **Props (6).** `propBed(-4.6, 1.5, Math.PI)`; dark `propMonitor(-6.3, 0.3)`;
  `propDesk(-2.6, 0.4, 0.9, 0.7)`; the dead phone `deco` on the desk;
  `propVent(-6.6, 2.3, 1.5, Math.PI/2)`; mirror stub `deco(MATS.mirror, -6.55, 1.6, 1.5, 0.08, 1.7, 1.8)`.
- **Hide spots.** Under-bed `{x:-4.6, z:1.5, r:1.3, kind:'bed', id:'bed2'}`.

### E_ROOM3 — patient room 3 — **YOURS**  *(exists)*
- **Purpose.** Your stage. Where you wire up, sleep, wake at 3:33, endure paralysis,
  and start the night proper. Has the **one-way mirror** into I_OBSERVATION and the
  REC dot. The room "isn't the same room" after the faked wake (story re-dresses).
- **Center (4.2, −3), size 5 × 5.** Open **west.** *(as built)*
- **Openings/doors.** `addDoor(1.5, -3, 'z', 'd_r3')` (hall gap `[-3,1.7]`).
- **Lights.** `ceilLight(4.2, -3, 0x9fb6c8, 0.7, 7, S)`.
- **Props (as built).** `propBed(4.6,-3,0)`; `propMonitor(6.3,-4.2)` (your bedside
  EEG); `propDesk(2.6,-4.2,0.9,0.7)`; the **one-way mirror**
  `deco(MATS.mirror, 6.55, 1.6, -1.6, 0.08, 1.7, 2.4)`; the REC dot
  (`MATS.redlight` + point light at (5.6,2.6,-1.1)); `propVent(6.6, 2.3, -3, -π/2)`.
- **Hide spots.** Under your bed `{x:4.6, z:-3, r:1.3, kind:'bed', id:'bed3'}` (as built).
- **One-way (perceptual).** The mirror is one-way: you can't see into
  I_OBSERVATION, but the observer (and CAM 3) sees you. Late-game, up close, a shape
  is visible behind it.

### E_ROOM4 — patient room 4 — **THE LONG SUBJECT**  *(exists)*
- **Purpose.** The proof. Someone who came for one night and never left — nineteen
  days under, beard grown in, eyes open, doesn't look at you. The single most
  important environmental story beat before the basement.
- **Center (−4.2, −8), size 5 × 5.** Open **east.** *(as built)*
- **Openings/doors.** `addDoor(-1.5, -8, 'z', 'd_r4', true, 'Locked from the outside. Something shifts behind it.')`
  — **locked**; you read it *through the door crack* (existing `addItem` at
  (-1.9,-8)). It is **never opened by the player**; it opens only in a scripted
  micro-beat if at all. Lock has **no key** (deliberate — you cannot save them).
- **Lights.** `ceilLight(-4.2, 1.4, 0x6a5e54, 0.5, 6, F)` — sickly, flickers. *(as built; note the y is the engine's value — it reads as a low dim fixture.)*
- **Props (as built + add).** `propBed(-4.6,-8,Math.PI)` with `CH.subject` lying on
  it; add an **IV stand** beside the bed: `cyl(MATS.metal, -3.4, 1.1, -8.0, 0.04, 0.04, 1.8, 8)` + a bag `deco(MATS.glass, -3.4, 1.9, -8.0, 0.18, 0.3, 0.1)`; a heart
  monitor `propMonitor(-6.3, -9.4)` ticking slow; a meal tray untouched `propBox(-5.6, -6.4)`.
- **Hide spots.** None (you can't get in).
- **One-way.** Visual only, through the crack.

### E_ROOM5 — patient room 5  *(NEW)*
- **Purpose.** Reached by a short **east spur** off the room-3/exam cluster. Holds a
  **spare flashlight battery** and a child's drawing taped to the wall (a subject
  was here with a kid? — unexplained, awful). Gives the east wing depth and a
  detour reward.
- **Center (8.6, −3), size 5 × 5.** Open **west** into a connector that joins
  E_ROOM3's hall gap region.
- **Openings/doors.**
  - **West → E_ROOM5 spur:** A 1.7-wide connector links E_ROOM5's west wall (x = 6.1)
    to the area just east of E_ROOM3. Build a short corridor cell at (7.1, −3):
    `roomShell(7.1, -3, 2.2, 2.0, H, {w:false, e:false, n:true, s:true}, MATS.floor)`
    with east/west open, then `roomShell(8.6, -3, 5, 5, H, {w:true}, MATS.floor)`.
    Door `addDoor(6.1, -3, 'z', 'd_r5')`, gap `[ -3, 1.7]` (centered z=-3).
  - The connector's north/south are walls; only E↔W flows (E_ROOM3 ⇆ E_ROOM5).
- **Lights.** `ceilLight(8.6, -3, 0x9fb6c8, 0.6, 7, false, true)`.
- **Props (7).** `propBed(9.0, -3, 0)`; `propMonitor(10.6, -4.4)`; `propDesk(7.0, -4.4, 0.9, 0.7)`;
  the **battery** as `addItem(7.0, -4.4, 1.6, 'Spare battery', …, once)`; child's drawing
  `propPoster(signMat([{t:'MY',sz:18},{t:'DREAM',sz:18},{t:'HOUSE',sz:16}],'#e8e4d0','#446'), 11.0, 1.6, -3, -Math.PI/2, 0.7, 0.8)`;
  `propVent(11.0, 2.3, -1.5, -Math.PI/2)`; mirror stub.
- **Hide spots.** Under-bed `{x:9.0, z:-3, r:1.3, kind:'bed', id:'bed5'}`.

### E_ROOM6 — patient room 6  *(NEW)*
- **Purpose.** West-wing twin of E_ROOM5, reached by a spur off the room-4 cluster.
  The **most degraded** patient room — water-stained, one chair, a Bible-thick stack
  of consent carbons. Optional deep-lore stop; also a hide spot for the chase.
- **Center (−8.6, −8), size 5 × 5.** Open **east** via connector to E_ROOM4 region.
- **Openings/doors.**
  - Connector cell at (−7.1, −8): `roomShell(-7.1, -8, 2.2, 2.0, H, {w:false,e:false,n:true,s:true}, MATS.floor)`,
    then `roomShell(-8.6, -8, 5, 5, H, {e:true}, MATS.floor)`.
    Door `addDoor(-6.1, -8, 'z', 'd_r6')`, gap `[-8, 1.7]`.
- **Lights.** `ceilLight(-8.6, -8, 0x6a6e64, 0.5, 7, F)` — flickers hard.
- **Props (7).** `propBed(-9.0, -8, Math.PI)` (stripped, no sheet — bare frame);
  `propChair(-7.2, -9.4, 0)`; carbons stack `propBox(-9.0, -6.4)` + `propBox(-9.6, -6.4)`;
  `propShelf(-11.0, -8, Math.PI/2, 3)`; `propVent(-11.0, 2.3, -8, π/2)`; mirror stub;
  a water stain `deco(MATS.wallGrime, -11.0, 1.4, -8, 0.05, 2.6, 4.6)` on the far wall.
- **Hide spots.** Under-bed `{x:-9.0, z:-8, r:1.3, kind:'bed', id:'bed6'}`.

### F_BATHROOM — shared patient bathroom  *(exists)*
- **Purpose.** The shared washroom; holds the **NIGHT LOG** (the "Subject in 4 has
  been under nineteen days" note). Mirror beat: up close at night the reflection
  lags. Cramped, tiled, a dripping tap.
- **Center (−4.2, −3), size 5 × 4.** Open **east.** *(as built)*
- **Openings/doors.** `addDoor(-1.5, -3, 'z', 'd_bath')` (hall gap `[-3,1.7]`).
- **Lights.** `ceilLight(-4.2, -3, 0xbfd0c8, 0.6, 6, F)`.
- **Props (as built + add).** `propSink(-6.1, -3.6)` (mirror); `propToilet(-6.0, -2.0)`;
  `propVent(-2.0, 2.2, -3, π/2)`; add a second stall divider `box(MATS.tile, -5.0, 1.2, -2.0, 0.1, 2.4, 1.6, {uv:1})` and a paper-towel dispenser `deco(MATS.metal, -6.4, 1.4, -2.0, 0.3, 0.4, 0.15)`.
- **Hide spots.** **Toilet stall:** `{x:-6.0, z:-2.0, r:0.9, kind:'stall', id:'stall_bath'}`
  (the engine treats any hideSpot kind; label as "stall").
- **Locks.** None.

### G_EXAM — exam / wiring room  *(exists)*
- **Purpose.** Where Vane wires you (gel, cap, IV) before bed; later, where you find
  the **STAFF KEYCARD** in the drawer (existing item at (6.4,−9.5)). Surgical
  brightness, a gurney, an equipment cabinet, a sink.
- **Center (4.2, −8), size 5 × 5.** Open **west.** *(as built)*
- **Openings/doors.**
  - `addDoor(1.5, -8, 'z', 'd_exam')` (hall gap `[-8,1.7]`).
  - **NEW East → H_SLEEPLAB:** add an internal door
    `addDoor(6.7, -8, 'z', 'd_lab', true, 'CONTROL — badge only.')`, host gap
    `[-8, 1.7]` in the exam east wall (rebuild that wall with the gap). Opens with
    **STAFF KEYCARD**. This gives a *second* route into the observation cluster and
    is the route Vane uses.
- **Lights.** `ceilLight(4.2, -8, 0xbfe0e8, 0.9, 7, F)` *(as built)*.
- **Props (as built + add).** `propGurney(4.4,-8,0)`; `propMonitor(6.3,-9.5)`;
  `propShelf(4.2,-10,0,3)`; equipment cabinet `deco(MATS.metal,3.0,1.2,-9.6,0.6,1.4,0.4)`;
  `propSink(6.4,-6.6)`; add an **IV stand** `cyl(MATS.metal, 3.0, 1.1, -6.6, 0.04,0.04,1.8,8)`
  and a tray of (capped) needles `propBox(3.0, 0.9?→ on shelf)`; a sharps bin
  `box(MATS.redlight, 3.4, 0.9, -10.0, 0.3, 0.4, 0.3, {uv:1})`.
- **Hide spots.** **Behind the equipment cabinet:** `{x:3.0, z:-9.6, r:0.8, kind:'cabinet', id:'cab_exam'}`.
- **Locks & keys.** `d_lab` → STAFF KEYCARD (drawer item also lives here).

### H_SLEEPLAB — control room (polysomnograph)  *(NEW)*
- **Purpose.** The **wired-up control room**: the polysomnograph that "isn't
  measuring health, it's measuring fear." A bank of EEG plotters, a patch-panel of
  cables that run (visibly) toward the patient rooms, a swivel chair still warm, a
  coffee, a clipboard scoring **your** night minute-by-minute. This is the *clinical*
  half of the reveal (I_OBSERVATION is the *surveillance* half). Distinct from
  observation: this room is about the **instrument**, not the cameras.
- **Center (8.8, −8), size 5 × 5.** Reached **west from G_EXAM** (the badge door).
- **Openings/doors.**
  - **West → G_EXAM:** `addDoor(6.7, -8, 'z', 'd_lab', true, …)` (see G_EXAM).
  - **South → H↔ corridor to I_OBSERVATION:** an internal gap `[ -10.5, 1.7]` in the
    south wall at z = −10.5 leading down a 1.7-wide spur that meets the observation
    cluster from the east (see Connectivity). Door `addDoor(8.8, -10.5, 'x', 'd_lab_obs', true, 'Locked. Card reader.')` → STAFF KEYCARD.
- **Lights.** `ceilLight(8.8, -8, 0x6fae86, 0.6, 7, S)` — monitor-green wash; plus
  five small green emissive monitor lights (mirror the observation pattern).
- **Props (9).**
  - Plotter desk along north wall: `propDesk(8.8, -10.0, 3.4, 0.9)`.
  - Five EEG screens: `for i in 0..4: deco(MATS.screen, 7.4+i*0.7, 1.7, -10.3, 0.1, 0.6, 0.55)` + a small `0x2f8f5a` PointLight each.
  - Patch panel (cables to rooms): `box(MATS.metal, 11.1, 1.4, -8, 0.2, 2.0, 1.6, {uv:1})` with `deco` cable bundles draping toward the west wall.
  - Swivel chair (warm): `propChair(8.8, -8.6, 0)`.
  - Coffee + clipboard on desk (the fear-score sheet) — `addItem(8.8, -10.0, 1.8, 'The scoring clipboard', openNote(...))`.
  - Server tower: `box(MATS.dark, 11.1, 0.9, -6.4, 0.6, 1.8, 0.6, {uv:1})` blinking.
  - Wall whiteboard: `propPoster(signMat([{t:'CYCLE 1: ok',sz:13},{t:'CYCLE 2: spike',sz:13},{t:'GEL: rotate',sz:13}]), 8.8, 2.0, -5.6, 0, 1.6, 1.0)`.
  - `propVent(8.8, 2.3, -5.6, 0)`.
- **Hide spots.** **Knee-hole under the plotter desk:** `{x:8.8, z:-9.6, r:1.0, kind:'desk', id:'desk_lab'}`.
- **Locks & keys.** `d_lab` and `d_lab_obs` → STAFF KEYCARD.
- **One-way.** None, but its cables visibly tie it to the patient wing.

### I_OBSERVATION — behind E_ROOM3's one-way mirror  *(exists)*
- **Purpose.** The surveillance half of the reveal. Monitors, the **IR feed of your
  own empty bed (CAM 3)**, the wall of tapes with tonight's already labeled and
  recording, and the **STAFF-ONLY door to the basement** at the far side. The turn:
  Vane appears behind you here.
- **Center (4.6, −13), size 6 × 4.** Open **west.** *(as built)*
- **Openings/doors.**
  - **West → D_HALL_NORTH:** `addDoor(1.5, -13, 'z', 'd_obs', true, 'A red card-reader. STAFF ONLY. It is locked.')` → STAFF KEYCARD (the existing `d_obs`; story sets `keyNeed='staff'`).
  - **East → H_SLEEPLAB spur:** receive `d_lab_obs` from the lab side at the east
    wall x = 7.6 (gap `[-13, 1.7]`); a 1.7 corridor links (8.8,−10.5)→(7.6,−13).
  - **South → basement door:** the existing `deco(MATS.door, 4.6, 1.2, -14.9, …)` is
    the **STAFF-ONLY → basement** door. Make it a real
    `addDoor(4.6, -14.9, 'x', 'd_base', true, 'STAFF ONLY — BASEMENT. Needs the basement key.')`
    — it sits in the south wall (fixed Z = −14.9, a wall running along X), so per the
    engine convention the orient is **'x'**. Host gap `[4.6,1.7]` in that wall.
    Opens with **BASEMENT KEY**.
- **Lights.** `ceilLight(4.6, -13, 0x6fae86, 0.7, 8, S)` + five green monitor lights *(as built)*.
- **Props (as built + add).** `propDesk(4.6, -14.4, 3.4, 0.9)`; five monitors at
  z = −14.7; four `propShelf(7.2, …, π/2, 3)` (the **tape wall**); the back of the
  one-way mirror `deco(MATS.glass, 1.65, 1.6, -13, 0.08, 1.7, 2.4)`. Add labeled
  tape boxes on the shelves (`propBox` rows) and a swivel chair `propChair(4.6, -13.6, 0)`.
- **Hide spots.** **Under the console desk:** `{x:4.6, z:-14.4, r:1.0, kind:'desk', id:'desk_obs'}` (for when Vane enters).
- **Locks & keys.** `d_obs` → STAFF KEYCARD; `d_base` → BASEMENT KEY.
- **One-way.** Through the mirror you watch E_ROOM3 / CAM 3.

### J_RECORDS — tape archive  *(exists)*
- **Purpose.** The paper/tape archive: shelves of master tapes, the **OUTBOUND
  shipping manifest** ("14 sessions… 'fear response' priced 3x"), the client
  ledger you can glimpse but not read. The bureaucracy of the horror.
- **Center (−4.6, −13), size 6 × 4.** Open **east.** *(as built)*
- **Openings/doors.**
  - **East → D_HALL_NORTH:** `addDoor(-1.5, -13, 'z', 'd_rec')` (hall gap `[-13,1.7]`).
  - **NEW South → M_STAIR approach (service):** a **locked** door
    `addDoor(-4.6, -14.9, 'x', 'd_rec_svc', true, 'Service passage. Locked.')`, host
    gap `[-4.6, 1.7]` at z = −15, into the L_HALL_SOUTH service corridor. Opens with
    **STAFF KEYCARD** (gives an alternate north route and ties Records to the spine).
- **Lights.** `ceilLight(-4.6, -13, 0x9a8e7a, 0.6, 7, F)` *(as built)* — amber, dusty.
- **Props (as built + add).** Four `propShelf(-7.2,…,π/2,4)` and five
  `propShelf(-2.4,…,π/2,4)`; `propBox(-4.6,-12)`, `propBox(-3.8,-12)`;
  `propDesk(-4.6,-14.2,2.4,0.8)`. Add a card-catalog `box(MATS.wood, -4.6, 0.8, -11.6, 1.4, 1.4, 0.6, {uv:1})` and a ladder `cyl` against the shelves.
- **Hide spots.** **Between the shelf rows:** `{x:-4.6, z:-13, r:1.0, kind:'shelf', id:'shelf_rec'}`.
- **Locks & keys.** `d_rec_svc` → STAFF KEYCARD.

### K_BREAK — staff break room (+ lockers, hide)  *(exists)*
- **Purpose.** The staff break room at the north end of the spine: a microwave, a
  schedule, **two lockers (hide spots)**, and a **spare battery** on the desk
  (existing item). The most "ordinary workplace" room — which is its own horror,
  because *this is where they take their breaks from doing this.*
- **Center (0, −17), size 5 × 4.** Open **south** to the hall (existing `[0,2.4]`).
- **Openings/doors.**
  - **South → Q_NURSES / D_HALL_NORTH:** existing `wallRun('z',-15,-1.5,1.5,H,[[0,2.4]])`.
  - **NEW North → L_HALL_SOUTH:** open the north wall with a gap `[0, 2.4]` (rebuild
    `wallRun('z', -19, -2.5, 2.5, H, [[0,2.4]])`) — *resize K to 5×4 centered (0,−17)
    means north wall at z = −19*. Door `addDoor(0, -19, 'x', 'd_break_svc')`
    (unlocked — staff pass freely to the service spine).
- **Lights.** `ceilLight(0, -17, 0xc8ccb6, 0.7, 6, F)` *(as built)*.
- **Props (as built + add).** `propDesk(0,-18.2,2.0,0.9)`; `propChair(-1.2,-17,0)`,
  `propChair(1.2,-17,π)`; `propLocker(-2.2,-16,0,'lk1')`, `propLocker(2.2,-16,0,'lk2')`;
  add a microwave `box(MATS.metal, 2.2, 1.0, -18.6, 0.5, 0.4, 0.4, {uv:1})`, a
  fridge `box(MATS.metal, -2.2, 1.0, -18.6, 0.7, 2.0, 0.7, {uv:1})`, and a staff
  schedule `propPoster(signMat([{t:'NIGHTS',sz:18},{t:'VANE',sz:22}]), 0, 2.0, -18.9, Math.PI, 1.4, 0.9)`.
- **Hide spots.** **Two lockers** (`lk1`, `lk2`) via `propLocker`. *(as built)*
- **Locks.** `d_break_svc` unlocked.

### Q_NURSES — nurses' station (hub)  *(NEW, added)*
- **Purpose.** A small open **hub** at the junction of the patient spine, the break
  room, and (via the records/exam clusters) the observation cluster. Orients the
  player; a curved counter with monitors that show the **room cameras** (a preview
  of the surveillance theme). No walls on its long sides — it's a counter island in
  a widened part of the corridor.
- **Center (0, −10.5), size 4 × 3 (open island).**
- **Openings/doors.** None — it sits **inside** the corridor's north reach (z ≈ −9
  to −12), where D_HALL_NORTH widens. Build it as **deco-only furniture + colliders**,
  no `roomShell` (so it never seals the corridor). The hall walls already pass it.
- **Lights.** `ceilLight(0, -10.5, 0xbfe0e8, 0.7, 7, S)` — a bright island of light
  in the dimming hall.
- **Props (6).**
  - Curved counter (approximate with two boxes): `box(MATS.wood, -0.6, 0.9, -10.5, 1.2, 1.0, 0.5, {uv:1})`, `box(MATS.wood, 0.6, 0.9, -10.5, 1.2, 1.0, 0.5, {uv:1})`.
  - Two small cam monitors on the counter: `deco(MATS.screen, -0.5, 1.4, -10.5, 0.4, 0.3, 0.05)`, `deco(MATS.screen, 0.5, 1.4, -10.5, 0.4, 0.3, 0.05)` + green point lights.
  - Office chair behind: `propChair(0, -11.2, 0)`.
  - A pneumatic-tube terminal: `cyl(MATS.metal, 1.2, 1.4, -11.0, 0.12, 0.12, 0.8, 10)`.
  - A clipboard rack on the counter (lore: room assignments — Room 4 has no
    discharge date).
- **Hide spots.** **Behind the counter:** `{x:0, z:-11.0, r:0.9, kind:'counter', id:'counter_q'}`.
- **One-way.** The cam monitors foreshadow I_OBSERVATION.

### R_MRI — "imaging" room (the chair)  *(NEW, added)*
- **Purpose.** A single mid-game **dread set-piece**: a so-called "imaging" room that
  is really where the worst of the procedure happens — a reclined chair with
  restraints, a bore-like machine that's just painted plywood, a wall of develop-
  fixer chemical smell (told via labels), and the night's most unambiguous "this is
  not medicine" prop. Reached through C_INTAKE's locked back door — a *detour* that
  rewards the curious and deepens the horror before the basement.
- **Center (13, −8), size 6 × 6.** Reached from C_INTAKE via a north→west service
  spur, OR from H_SLEEPLAB region (optional second link).
- **Openings/doors.**
  - **From C_INTAKE:** the locked `d_intake_back` (at intake's north, z = 5.6) opens
    a spur running north then west to R_MRI's north wall. Practically: a 1.7 corridor
    from (8.5, 5.6) up to (8.5, −5) then west to (10, −8) into R_MRI's east wall.
    Door at R_MRI east: `addDoor(10, -8, 'z', 'd_mri', true, 'IMAGING — keypad.')` →
    STAFF KEYCARD.
  - **West stub → H_SLEEPLAB** (optional): a closable internal door for staff flow
    (can be left as a sealed `deco` door to save colliders).
- **Lights.** `ceilLight(13, -8, 0x9fb0c0, 0.6, 8, F)` — cold, flickers; a red
  "machine active" `MATS.redlight` over the bore.
- **Props (8).**
  - The chair (reclined, restraints): `propGurney(13, -8, 0)` raised + `deco` straps
    `deco(MATS.metal, 13, 0.95, -7.4, 0.6, 0.05, 0.1)`, `deco(MATS.metal, 13, 0.95, -8.6, 0.6, 0.05, 0.1)`.
  - The "scanner" bore: `cyl(MATS.metal, 13, 1.3, -10.0, 1.2, 1.2, 1.4, 16)` with a
    dark hole `cyl(MATS.dark, 13, 1.3, -10.0, 0.6, 0.6, 1.5, 16)`.
  - Control console: `propDesk(15.0, -8, 1.2, 1.6)` + `propMonitor(15.4, -6.6)`.
  - Chemical shelf: `propShelf(13, -5.4, 0, 3)` with bottle labels
    `propPoster(signMat([{t:'FIXER',sz:20},{t:'do not',sz:12},{t:'inhale',sz:14}],'#cfc','#363'), 13, 1.6, -5.1, 0, 0.7, 0.8)`.
  - Lead apron on a hook: `deco(MATS.dark, 11.2, 1.3, -8, 0.5, 0.9, 0.1)`.
  - `propVent(15.6, 2.3, -8, -π/2)`; a sharps bin; a rolling stool `propChair`.
- **Hide spots.** **Behind the scanner bore:** `{x:13, z:-10.6, r:0.9, kind:'machine', id:'mri'}`.
- **Locks & keys.** `d_intake_back`, `d_mri` → STAFF KEYCARD.

### S_COURTYARD — courtyard window alcove  *(NEW, added)*
- **Purpose.** A **window to the normal world you can't reach.** A small alcove off
  the west wing with a big (sealed, reinforced) window onto an interior courtyard —
  a dead potted ficus, a bench, rain on the glass, the parking lot lights beyond a
  fence you can see but not get to. The "so close to outside" beat that makes the
  trap land. Also the spot where, late, you see the Visitor *outside* the glass,
  in the courtyard, before it's inside.
- **Center (−12.5, −3), size 5 × 5.** Reached from F_BATHROOM/E_ROOM2 cluster via a
  west spur.
- **Openings/doors.**
  - **East → west-wing spur:** A 1.7 connector from S_COURTYARD's east wall (x = −10)
    to the area west of F_BATHROOM. Door `addDoor(-10, -3, 'z', 'd_court')` (unlocked).
- **Lights.** `ceilLight(-12.5, -3, 0x88a0b8, 0.5, 8, F)` — moonlight-cold; plus a
  bluish exterior glow simulated with a low PointLight outside the window.
- **Props (6).**
  - The window: `deco(MATS.glass, -15.0, 1.7, -3, 0.1, 2.2, 3.2)` on the west wall
    (x = −15), with a reinforcing grid `deco(MATS.metal, -14.98, 1.7, -3, 0.02, 2.2, 3.2)`.
  - Dead ficus: `cyl(MATS.dark, -12.5, 0.5, -1.2, 0.06, 0.06, 1.0, 8)` + a `sph(MATS.dark, -12.5, 1.1, -1.2, 0.4, 8)` canopy.
  - Bench: two `propChair(-13.4, -3, π/2)`, `propChair(-11.6, -3, -π/2)`.
  - A vending machine (out of order): `box(MATS.dark, -12.5, 1.1, -5.0, 1.0, 2.2, 0.8, {uv:1})` with a faint screen.
  - A payphone husk on the wall: `deco(MATS.metal, -14.9, 1.4, -1.2, 0.3, 0.5, 0.2)`.
  - `propPoster(signMat([{t:'COURTYARD',sz:18},{t:'no exit',sz:14}],'#cfd','#455'), -12.5, 2.1, -5.4, 0, 1.4, 0.7)`.
- **Hide spots.** **Behind the vending machine:** `{x:-12.5, z:-5.0, r:0.8, kind:'vending', id:'vend_court'}`.
- **One-way.** Visual only (window). You can never go *through* it.

---

## 3. SERVICE SPINE & THE WAY DOWN

### L_HALL_SOUTH — service corridor (E–W)  *(NEW)*
- **Purpose.** Despite the name (south = the existing convention for the service
  block in the original brief), this corridor runs **east–west across the far north**
  of the ground floor, behind the clinical core. It is the **staff artery**: dirtier
  (`wallGrime`), narrower-feeling, lined with breaker panels, a janitor closet, and
  signage pointing to STAIRS and SHIPPING. It connects the break room, the records
  service door, and the **stairwell down (M_STAIR)** at its **west end**.
- **Center (0, −21), size 24 × 3.** Spans **X ∈ [−12, +12]** at z = −21 (wall band
  z ∈ [−22.5, −19.5]).
- **Openings/doors.**
  - **South gaps (into the ground floor):**
    - to **K_BREAK** at x = 0: gap `[0, 2.4]`, door `d_break_svc` (z = −19, see K).
    - to **J_RECORDS** service door at x = −4.6: the `d_rec_svc` spur meets here.
    - an east stub toward **H_SLEEPLAB/I_OBSERVATION** service access at x = +8
      (optional; can be a sealed `deco` door).
  - **West end → M_STAIR:** open the west wall at x = −12 with gap `[-21, 2.4]`
    into the stairwell mouth. Door `addDoor(-12, -21, 'z', 'd_stair', true, 'STAIRS — DOWN. Basement key required.')` → **BASEMENT KEY**.
  - **East end → R_MRI service** (optional sealed link).
- **Lights.** Run of cheap fixtures: `for i in 0..5: ceilLight(-10+i*4, -21, 0xb0b4a0, 0.5, 6, (i===1||i===4), true)` — half flicker, two cast shadow. The **westmost dies** as you approach the stair (story).
- **Props (8).**
  - Breaker panel: `box(MATS.metal, -8, 1.4, -22.4, 0.6, 1.6, 0.2, {uv:1})`.
  - Janitor closet (sealed door + mop bucket): `addDoor(-2, -22.4? )` → simplest as a
    `deco` door `deco(MATS.door, -2, 1.2, -22.4, 1.25, 2.4, 0.06)` + `cyl(MATS.metal, -2, 0.3, -20.8, 0.25, 0.25, 0.5, 10)` bucket.
  - Wet-floor sign mid-corridor.
  - Stacked supply boxes: `propBox(6, -20.0)`, `propBox(6.6, -20.0)`, `propBox(6.3, -20.6)`.
  - A wheeled laundry bin (linens): `box(MATS.fabric, 9, 0.7, -21, 1.0, 1.2, 0.8, {uv:1})`.
  - Signage: `propPoster(signMat([{t:'← STAIRS',sz:18},{t:'SHIPPING',sz:16},{t:'B-LEVEL',sz:14}],'#dd0','#000'), -11.8, 2.2, -21, Math.PI/2, 1.0, 0.9)` near the west end.
  - A second sign east: `propPoster(signMat([{t:'IMAGING →',sz:18}]), 11.8, 2.2, -21, -Math.PI/2, 0.9, 0.6)`.
- **Hide spots.** **The laundry bin:** `{x:9, z:-21, r:0.9, kind:'bin', id:'bin_svc'}`.
- **Locks & keys.** `d_stair` → BASEMENT KEY; `d_rec_svc` → STAFF KEYCARD.

### M_STAIR — stairwell corridor → basement  *(NEW)*
- **Purpose.** The transition. A concrete stair shaft you descend; the engine has no
  vertical, so it's a long, narrowing, **darkening corridor** that *feels* like going
  down (fog density ramps, lights die behind you, the air sound changes), ending at
  a fade that drops you onto the basement slab. Half-landing with a flickering bulb;
  a chain-and-padlock gate (the BASEMENT KEY lock is actually at the top, on
  `d_stair`); graffiti from a previous subject scratched into the paint.
- **Center (−13, −23), size 3 × 7** (X ∈ [−14.5, −11.5], Z ∈ [−26.5, −19.5]). The
  top (south, z = −19.5) opens to L_HALL_SOUTH via `d_stair`; the shaft runs north to
  a **dead end at z ≈ −26.5** where a story **fade/teleport** lands the player in the
  basement (T_PROCESSING). See §9.10 for the exact `roomShell`/`trigger`.
- **Openings/doors.**
  - **Top (south) → L_HALL_SOUTH:** `d_stair` (BASEMENT KEY), gap `[-21, 2.4]` at x = −12
    (the shaft's south wall at z = −19.5 lines up with the corridor's west gap mouth).
  - **Bottom (north) → T_PROCESSING / basement:** the descent ends at the dead end
    z ≈ −26.5 with a **trigger** that fades the screen and relocates the player into
    `T_PROCESSING` (and thickens fog, swaps ambient). No physical door is needed.
- **Lights.** Three bulbs down the shaft: `ceilLight(-13, -20, 0xffe2b0, 0.5, 5, false, true)` (top, warm), `ceilLight(-13, -23, 0xffd0a0, 0.4, 4, false, true)` (mid, **flicker**), `ceilLight(-13, -25.8, 0xff9060, 0.35, 4, false, true)` (bottom, dying amber). Swinging-bulb feel via flicker.
- **Props (5).**
  - Handrail: place as `deco(MATS.metal, -11.6, 1.0, -23, 0.06, 1.0, 6)` (no collider, so the player never snags).
  - Concrete texture swap: walls here use `MATS.wallGrime`.
  - Scratched graffiti: `propPoster(signMat([{t:'DONT',sz:24},{t:'SLEEP',sz:24}],'#2a2a26','#a33'), -14.4, 1.6, -23, Math.PI/2, 0.8, 0.9)`.
  - A dropped flashlight (dead) on the half-landing: `cyl(MATS.metal, -13, 0.1, -23, 0.05, 0.05, 0.25, 8)`.
  - A "B-LEVEL — AUTHORIZED ONLY" sign at the bottom.
- **Hide spots.** None (transit).
- **Locks & keys.** `d_stair` → **BASEMENT KEY**. One-directional in feel (you fade
  down; coming back up is a separate scripted beat in the finale).

---

## 4. BASEMENT (the third act) — its own slab, far NW/SW

> Reached only via `M_STAIR`. Laid out as a **non-overlapping region** at
> Z ∈ [−39, −26]. Lit by amber/black, swinging bare bulbs, monitor glow, and one
> red EXIT over the loading dock. Materials: `wallGrime`, `metal`, `dark`,
> `cardboard`. This is where the tapes are processed and **the awful truth lives.**

### T_PROCESSING — tape duplication room  *(NEW, added basement antechamber)*
- **Purpose.** The first basement room off the stair: where master tapes are
  **duplicated and labeled**. Racks of dubbing decks, a labeler, spools, a wall of
  blank cases waiting for names. Bridges the stair into the cold-storage gut-punch —
  you understand the *industry* of it here before you see the *inventory*.
- **Center (−6, −28), size 6 × 4** (x ∈ [−9,−3], z ∈ [−30,−26]).
- **Openings/doors.**
  - **North/up → M_STAIR landing:** the stair-bottom trigger fades and relocates you
    to ≈ (−6, −27.5), inside this room. No physical door needed.
  - **South → O_COLDSTORAGE:** gap `[-6, 1.7]` in the south wall at z = −30, door
    `addDoor(-6, -30, 'x', 'd_cold', true, 'COLD STORAGE. The handle is freezing.')`
    — fixed-Z wall → orient **'x'**. Unlocked once you're down here, or gated by a
    small find (a COLD KEY on a hook).
  - **West → N_BOILER:** open passage — N_BOILER's east wall (x = −9) carries the gap
    `[-28, 1.7]` (no door; the rooms share the x = −9 line).
  - **East → P_SHIPPING:** gap `[-28, 1.7]` in the east wall at x = −3, door
    `addDoor(-3, -28, 'z', 'd_ship')` (fixed-X wall → 'z'; unlocked).
- **Lights.** `ceilLight(-6, -28, 0xffcaa0, 0.5, 6, F)` swinging amber + a green
  rack-glow `ceilLight(-6, -29.5, 0x2f8f5a, 0.3, 4, false, false)`.
- **Props (8).**
  - Dubbing rack: `box(MATS.metal, -8.4, 1.3, -27, 0.6, 2.0, 1.2, {uv:1})` with rows
    of `deco(MATS.screen, …)` deck faces.
  - Labeler desk: `propDesk(-6, -26.8, 2.0, 0.9)` with a label printer.
  - Wall of blank cases: `propShelf(-3.6, -27, π/2, 4)` stacked with `propBox` rows.
  - A reel-to-reel `cyl(MATS.metal, -7, 1.1, -29, 0.3, 0.3, 0.15, 16)` on the desk.
  - **The lore item:** `addItem(-6, -26.8, 1.8, 'The dubbing log', openNote('DUPLICATION LOG', …))` — confirms buyers, volumes, "fear response 3×."
  - Bins of discarded labels (names you can read): `propBox(-8.4, -29.4)`.
  - A wall clock stopped at 3:33.
  - `propVent(-9.0?, 2.3, -28, π/2)`.
- **Hide spots.** **Behind the dubbing rack:** `{x:-8.4, z:-27, r:0.9, kind:'rack', id:'rack_proc'}`.
- **Locks & keys.** `d_cold` may need a small **COLD KEY** (optional 3rd key) found
  on a hook here, or be unlocked — see Key Progression.

### N_BOILER — boiler / utility  *(NEW)*
- **Purpose.** Boilers, the building's guts, a sagging cot where someone *sleeps down
  here*, a fuse box that controls the whole facility's lights (a usable beat: cut or
  restore power), and the loudest, most oppressive ambient zone. Dread by machinery.
- **Center (−13, −33), size 7 × 7.**
- **Openings/doors.**
  - **East → T_PROCESSING:** open passage at x = −9 (gap `[-28? ]` — practically the
    shared wall band; gap `[-30, 1.7]` centered z = −30 won't align — use a north-east
    corner opening: gap on N_BOILER's east wall x = −9.5, centered z = −31, width 1.7).
  - **South stub → O_COLDSTORAGE** (optional): a sealed `deco` door for flavor.
- **Lights.** One swinging bulb `ceilLight(-13, -33, 0xffb070, 0.5, 6, F)` + boiler
  pilot-flame glow `ceilLight(-13, -35, 0xff5520, 0.3, 3, false, false)` red-orange.
- **Props (9).**
  - Two boilers: `cyl(MATS.metal, -15, 1.3, -34.5, 0.9, 0.9, 2.4, 16)`, `cyl(MATS.metal, -15, 1.3, -32.0, 0.9, 0.9, 2.4, 16)` with pipe runs `deco(MATS.metal, …)` along the ceiling.
  - The cot (someone sleeps here): `propBed(-11.5, -35.5, 0)` with a blanket and a
    personal mug — *staff live down here on long shifts.*
  - Fuse box (usable): `box(MATS.metal, -16.3, 1.4, -33, 0.2, 1.8, 1.0, {uv:1})` →
    `addItem` "Main breakers" that toggles facility lights (a tool for the escape).
  - Tool bench: `propDesk(-11.0, -31.0, 1.8, 0.8)` with wrenches.
  - Coal/grime piles: `propBox` clusters.
  - A floor drain `deco(MATS.metal, -13, 0.06, -33, 0.6, 0.04, 0.6)`.
  - `propVent(-16.3, 2.3, -35, π/2)` (a vent the Visitor uses).
  - A hard-hat on a hook; a "DANGER HIGH VOLTAGE" sign `propPoster(signMat([{t:'DANGER',sz:24},{t:'HIGH',sz:18},{t:'VOLTAGE',sz:16}],'#dd0','#000'), -16.4, 1.7, -31.5, π/2, 0.9, 1.0)`.
- **Hide spots.** **Between the boilers:** `{x:-15, z:-33.2, r:0.9, kind:'boiler', id:'boiler_n'}`.
- **Locks.** None (open from T_PROCESSING).

### O_COLDSTORAGE — cold storage — **THE AWFUL TRUTH**  *(NEW)*
- **Purpose.** The gut-punch. A walk-in cold room — ostensibly for "biological
  samples." What's actually here: gurneys under sheets, a rack of labeled
  specimen/storage, and the unmistakable implication of what happens to the subjects
  who are *retained* and stop being profitable. Kept clinical and restrained — the
  horror is the **labels and the cold**, never gore. This is the bottom of the night.
- **Center (−6, −36), size 7 × 6.**
- **Openings/doors.**
  - **North → T_PROCESSING:** `d_cold` in the north wall at z = −33 (gap `[-6, 1.7]`);
    the door is hosted on T_PROCESSING's south wall (z = −30) per §9.10 — the two
    rooms share the band z ∈ [−33,−30], so the single `d_cold` leaf serves both.
    *(See T.)*
  - **East → P_SHIPPING:** an internal roll-up at x = −2.5, gap `[-36, 2.4]` (wide —
    gurneys pass), `deco` roll-up + a real door. The east wall is at fixed X = −2.5
    (runs along Z), so per the engine convention the orient is **'z'**:
    `addDoor(-2.5, -36, 'z', 'd_cold_ship')`. Unlocked (story).
- **Lights.** Cold blue: `ceilLight(-6, -36, 0x9fc0d0, 0.6, 7, S)` + a freezer-case
  glow. A red `MATS.redlight` thermostat readout.
- **Props (9).**
  - Three sheeted gurneys: `propGurney(-8, -37, 0)`, `propGurney(-6, -37.5, 0)`,
    `propGurney(-4, -37, 0)` — each with a `deco(MATS.sheet, …)` draped full-length.
    (At least one with a **toe-tag** `propPoster` you can read: a name from the
    archive.)
  - Specimen rack / freezer cases: `propShelf(-8.6, -35, π/2, 4)` with labeled
    `propBox` rows (dates, codes).
  - A steel prep table: `box(MATS.metal, -3.0, 0.9, -34.5, 1.6, 0.1, 0.8, {uv:1})`.
  - Hanging plastic strip-curtains at the door: `deco(MATS.glass, -6, 1.5, -33.2, 1.7, 2.0, 0.05)` (translucent).
  - **The key lore item:** `addItem(-6, -37.5, 2.0, 'The sheet (don't)', say(...))` — a
    look beat, restrained, that names the long subject's fate without showing it.
  - Frost on everything: `wallGrime` + bluish tint.
  - Thermostat: `box(MATS.dark, -9.4, 1.4, -36, 0.3, 0.4, 0.15, {uv:1})` + red readout.
  - A floor drain; a coiled hose.
  - `propVent(-9.4, 2.3, -38, π/2)`.
- **Hide spots.** **Among the gurneys / behind strip curtain:** `{x:-6, z:-38, r:1.0, kind:'gurney', id:'gurney_cold'}`.
- **Locks.** `d_cold` (see Key Progression); `d_cold_ship` unlocked.
- **One-way.** None, but this is the emotional point-of-no-return.

### P_SHIPPING — loading bay (the vendor)  *(NEW)*
- **Purpose.** The vendor's loading dock: where the **product leaves the building**.
  A roll-up dock door (to the alley), a pallet of outbound crates stamped with the
  **buyer's logo (never named — just a mark)**, a forklift, a shipping desk with the
  manifest, and — crucially — a possible **second way out** (the dock door) that
  becomes the escape valve in some routes. The banal logistics of evil.
- **Center (2, −33), size 8 × 8.**
- **Openings/doors.**
  - **West → T_PROCESSING:** `d_ship` at x = −1 (gap `[-28? ]`; practically the
    shared wall — gap `[-33, 1.7]`? align to the corridor: open the west wall at
    x = −2 with gap centered z = −28, width 1.7). Door `addDoor(-2, -28, 'z', 'd_ship')`
    (east-of-T wall is fixed-X → orient 'z'; matches the `d_ship` in §9.10).
  - **South-west → O_COLDSTORAGE:** receive `d_cold_ship` at the cold room's east
    (x = −2.5) → P_SHIPPING's west, gap `[-36, 2.4]`.
  - **South → dock roll-up (exterior):** the **loading bay door** to the alley at
    z = −37, gap `[2, 2.4]`. Modeled as a large `deco` roll-up `deco(MATS.metal, 2, 1.5, -37, 3.0, 3.0, 0.1)` over an EXIT; in the **alternate escape**, this is the
    way out instead of the front doors.
- **Lights.** `ceilLight(2, -33, 0xffd0a0, 0.6, 8, F)` warm sodium + a red EXIT over
  the dock door + a single dramatic `ceilLight(2, -36, 0xff6030, 0.4, 5, false, true)`.
- **Props (9).**
  - Pallet of outbound crates: `propBox` grid `for ix,iz: propBox(0+ix*0.6, -34+iz*0.6)` (3×3) on a `deco` pallet, each stamped with the **buyer mark** `propPoster(signMat([{t:'◼◤◼',sz:30}],'#5a4a3a','#000'), …)` — a logo, deliberately unreadable/abstract.
  - Forklift (approximate): `box(MATS.metal, 5.0, 0.5, -31.0, 1.2, 1.0, 1.8, {uv:1})` body + `box(MATS.metal, 5.0, 1.6, -30.0, 0.1, 2.0, 1.0)` mast + fork `deco`.
  - Shipping desk + manifest: `propDesk(5.0, -35.0, 1.8, 0.9)` →
    `addItem(5.0, -35.0, 1.8, 'Outbound manifest', openNote('ASHGROVE — OUTBOUND', …))` (the existing OUTBOUND note can live here or in J_RECORDS; suggest the **detailed buyer ledger** here).
  - Hand truck `cyl`; stretch-wrap roll `cyl(MATS.glass, …)`.
  - A wall of cubbies for outbound tapes: `propShelf(-2.4, -33, π/2, 4)`.
  - Dock leveler plate `deco(MATS.metal, 2, 0.1, -36.4, 2.6, 0.04, 1.0)`.
  - A clipboard on a nail; a pallet jack.
  - "SHIPPING / RECEIVING" sign + "AUTHORIZED PERSONNEL" sign.
- **Hide spots.** **Behind the crate pallet:** `{x:0, z:-34, r:1.0, kind:'crates', id:'crates_ship'}`; and **the forklift:** `{x:5.0, z:-31.0, r:0.9, kind:'forklift', id:'fork_ship'}`.
- **Locks.** The exterior dock roll-up may require the **BASEMENT KEY** or a switch
  in N_BOILER (story choice) to open as an escape; otherwise it's sealed and the
  escape is back up the stair.
- **One-way.** The dock door (if used) is an exit only.

---

## 5. COORDINATE FLOOR-PLAN (ASCII)

Not to perfect scale; each cell ≈ 1 m. North is **up** (−Z up, +Z down). The
basement is drawn as an inset to the lower-left (it does not physically overlap the
ground floor — it's reached via the stair fade).

```
  GROUND FLOOR                                   X →  -16        -8         0         +8        +16
                                                      |          |          |          |          |
  z=-22  ┌────────────────────────── L_HALL_SOUTH (service, E–W) ────────────────────────────┐
         │  [d_stair→BASEMENT KEY]      breakers   janitor    boxes   laundry-bin   →IMAGING   │
  z=-19  │      M_STAIR mouth        ┌─ d_break_svc ─┐    d_rec_svc(spur)                       │
         └──────────┐                │   K_BREAK     │                                          │
  z=-17             │ (shaft down)   │  lk1   lk2    │                                          │
  z=-15  ┌──────────┘            ┌───┴──[gap 2.4]────┴───┐                                      │
         │  J_RECORDS   d_rec →  │       (hall north end) │  ← d_obs (STAFF)   I_OBSERVATION    │
  z=-13  │  (tape archive) ──────┤ D_HALL_NORTH (spine)   ├──── one-way mirror ──┐  d_base↓      │
         │                       │                        │                      │ (BASEMENT KEY)│
  z=-11  │              Q_NURSES (counter island, cams)   │        d_lab_obs ←→ H_SLEEPLAB spur │
         │                       │                        │                                      │
  z=-8   │ E_ROOM6 ─ d_r6 ─ conn ┤ E_ROOM4(LONG SUBJ)     │ G_EXAM ─ d_lab → H_SLEEPLAB   R_MRI │
         │ (degraded)            │  [d_r4 LOCKED no key]   │ (wiring; STAFF key in drawer) (chair)│
  z=-6   │                       │                        │                                      │
  z=-3   │ S_COURTYARD ─ d_court ┤ F_BATHROOM ─ d_bath    │ E_ROOM3 (YOURS) ─ d_r3   conn  E_ROOM5│
         │ (window;no exit)      │ (NIGHT LOG; stall)     │  one-way mirror→OBS       d_r5  (batt)│
  z=-1   │                       │                        │                                      │
  z=+1.5 │             E_ROOM2 ─ d_r2 ┤                ├ d_r1 ─ E_ROOM1                          │
  z=+3   │                       └────[gap 2.4 to lobby]─┘                                       │
  z=+5   │                                                         d_intake_back↑ (to R_MRI spur)│
  z=+9   │                 B_LOBBY (SPAWN)  ── d_intake → ──  C_INTAKE (reception/consent)       │
         │            desk · fishtank · chairs · EXIT          desk · files · coat · cooler      │
  z=+14.5│                 └──── d_front (glass) ────┐                                           │
  z=+16.5│                       A_VESTIBULE         │  mat · sanitizer · pinboard · sign        │
  z=+18.5│                 ══════ EXTERIOR DOORS (Discharged exit) ══════                        │
         └────────────────────────────────────────────────────────────────────────────────────┘

  BASEMENT (reached only via M_STAIR; own slab, Z ≈ -26..-39)
                         X →   -16       -9        -6        -2        +2        +6
  z=-26  ┌───────────────[ stair bottom: fade lands here ]──────────────────────────┐
  z=-28  │   N_BOILER   ══open══  T_PROCESSING (dubbing/labels)  ─ d_ship → P_SHIPPING │
         │  boilers·cot·fuse      racks·labeler·dubbing log        crates·forklift     │
  z=-30  │                        │ d_cold ↓                       │ manifest·ledger   │
  z=-33  │  boiler pilot          │                                │   (buyer mark)    │
  z=-36  │                   O_COLDSTORAGE  ── d_cold_ship → ──  P_SHIPPING dock        │
         │                   gurneys(sheeted)·specimen rack    ══ DOCK ROLL-UP (alt exit)══
  z=-39  └────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. CONNECTIVITY GRAPH (reachability proof from SPAWN = B_LOBBY)

Edges are labeled with the gate (— = open/unlocked, **K** = STAFF KEYCARD,
**B** = BASEMENT KEY, **C** = optional COLD KEY). Door IDs in parentheses.

```
B_LOBBY ──(d_front, locked after 11pm)── A_VESTIBULE ══EXTERIOR DOORS (Discharged exit)
B_LOBBY ──(— gap z=3)── D_HALL_NORTH
B_LOBBY ──(d_intake, —)── C_INTAKE ──(d_intake_back, K)── [spur] ── R_MRI ──(d_mri, K)──┐
                                                                                         │
D_HALL_NORTH ──(d_r1, —)── E_ROOM1                                                       │
D_HALL_NORTH ──(d_r2, —)── E_ROOM2                                                       │
D_HALL_NORTH ──(d_r3, —)── E_ROOM3 ──[conn, —]──(d_r5)── E_ROOM5                          │
D_HALL_NORTH ──(d_bath, —)── F_BATHROOM ──[conn]──(d_court, —)── S_COURTYARD              │
D_HALL_NORTH ──(d_r4, LOCKED, no key — view only)── E_ROOM4                               │
D_HALL_NORTH ──[conn]──(d_r6, —)── E_ROOM6                                                │
D_HALL_NORTH ── Q_NURSES (open island, always reachable)                                  │
D_HALL_NORTH ──(d_exam, —)── G_EXAM ──(d_lab, K)── H_SLEEPLAB ──(d_lab_obs, K)── I_OBSERVATION
D_HALL_NORTH ──(d_obs, K)── I_OBSERVATION  (primary route; STAFF KEYCARD)                 │
D_HALL_NORTH ──(d_rec, —)── J_RECORDS ──(d_rec_svc, K)── L_HALL_SOUTH                     │
D_HALL_NORTH ──(— gap z=-15)── K_BREAK ──(d_break_svc, —)── L_HALL_SOUTH                  │
I_OBSERVATION ──(d_base, B)── [scripted: only after entering observation]── (basement path via stair OR direct)
L_HALL_SOUTH ──(d_stair, B)── M_STAIR ══fade down══ T_PROCESSING (basement)
T_PROCESSING ── N_BOILER (open) ;  T_PROCESSING ──(d_ship, —)── P_SHIPPING
T_PROCESSING ──(d_cold, C or —)── O_COLDSTORAGE ──(d_cold_ship, —)── P_SHIPPING
R_MRI ──[optional sealed link]── H_SLEEPLAB
```

**Reachability check (BFS from B_LOBBY).** With **no keys**, from B_LOBBY you reach:
A_VESTIBULE, C_INTAKE, D_HALL_NORTH, and off the hall — E_ROOM1, E_ROOM2, E_ROOM3
(+E_ROOM5 via conn), F_BATHROOM (+S_COURTYARD via conn), E_ROOM6 (via conn),
G_EXAM, J_RECORDS, K_BREAK, Q_NURSES (open). That is the **entire Act-I/II explorable
set**. E_ROOM4 is *view-only* by design (no key — you cannot save the long subject).

**With STAFF KEYCARD** (found in G_EXAM drawer): unlock H_SLEEPLAB, I_OBSERVATION
(both routes: `d_obs` from hall and `d_lab`+`d_lab_obs` from exam), R_MRI (via
`d_intake_back`+`d_mri`), J_RECORDS service door, and L_HALL_SOUTH (via records or
break — break is already open, so L_HALL_SOUTH is reachable even without the card,
but the card adds the records shortcut).

**With BASEMENT KEY** (found in I_OBSERVATION / on Vane's body / in the lab during
the reveal): unlock `d_stair` → M_STAIR → the whole basement (T_PROCESSING,
N_BOILER, O_COLDSTORAGE, P_SHIPPING).

**Therefore every one of the 24 areas is reachable from spawn** given the intended
key pickups (E_ROOM4 intentionally interior-locked but its *content* is delivered
through the door crack, satisfying "reachable content"). ✔

**Door-width verification.** Every gap above is **1.7** (single doors) or **2.4**
(main throughways / gurney routes / chase funnels). Player diameter = 2 × r =
**0.64**. The opening is the gap cut by `wallRun`; the `addDoor` leaf swings *into*
the room out of the gap, so the through-aperture is the full gap width. The two gap
sizes used everywhere are **1.7** and **2.4**, both well over the 0.64 hard minimum
and over the 1.6 comfort target. The door's own collider is small (0.4 across the
opening) and turns **off** while open (`dr.col.on = dr.open < 0.5`), so it never
pinches the player. **Every gap = 1.7 or 2.4 ≥ 1.6; no aperture is below 0.64.** ✔

> **Door Orientation Note (verified against the engine, line 300).**
> `addDoor(x,z,orient,…)`: when `orient==='z'` the leaf is **thin in X (0.06) and
> deep in Z (1.25)** — it fills a doorway in a wall that **runs along Z** (a wall at
> a fixed X, e.g. the hall's east/west walls at x=±1.5; existing
> `addDoor(1.5,-3,'z','d_r3')`). When `orient` is anything else (use **'x'**) the
> leaf is **wide in X (1.25) and thin in Z (0.06)** — it fills a doorway in a wall
> that **runs along X** (a wall at a fixed Z).
>
> **The rule, deterministically:** *door in a fixed-X wall → `'z'`; door in a
> fixed-Z wall → `'x'`.* All orient letters in this spec already follow this rule.
> Quick reference for the new/edited doors:
>
> | Door | At (x,z) | Wall | Orient |
> |---|---|---|---|
> | d_front | (0, 14.5) | fixed-Z | **'x'** |
> | d_intake | (7, 9) | fixed-X | **'z'** |
> | d_intake_back | (8.5, 5.6) | fixed-Z | **'x'** |
> | d_r1 | (1.5, 1.5) | fixed-X | **'z'** |
> | d_r2 | (−1.5, 1.5) | fixed-X | **'z'** |
> | d_r5 | (6.1, −3) | fixed-X | **'z'** |
> | d_r6 | (−6.1, −8) | fixed-X | **'z'** |
> | d_court | (−10, −3) | fixed-X | **'z'** |
> | d_lab | (6.7, −8) | fixed-X | **'z'** |
> | d_lab_obs | (8.8, −10.5) | fixed-Z | **'x'** |
> | d_mri | (10, −8) | fixed-X | **'z'** |
> | d_base | (4.6, −14.9) | fixed-Z | **'x'** |
> | d_rec_svc | (−4.6, −14.9) | fixed-Z | **'x'** |
> | d_break_svc | (0, −19) | fixed-Z | **'x'** |
> | d_stair | (−12, −21) | fixed-X | **'z'** |
> | d_cold | (−6, −30) | fixed-Z | **'x'** |
> | d_ship | (−3, −28) | fixed-X | **'z'** |
> | d_cold_ship | (−2.5, −36) | fixed-X | **'z'** |
> | *(existing)* d_r3/d_r4/d_bath/d_exam/d_obs/d_rec | hall side walls (fixed-X) | **'z'** |

---

## 7. KEY / LOCK PROGRESSION (the spine of traversal)

| Key | Where found | Unlocks | Gates which act |
|---|---|---|---|
| **STAFF KEYCARD** (`staff`) | G_EXAM drawer (existing item at (6.4,−9.5)) | `d_obs`, `d_lab`, `d_lab_obs`, `d_intake_back`, `d_mri`, `d_rec_svc` | Act IV: behind-the-glass cluster + the imaging detour |
| **BASEMENT KEY** (`basement`) | I_OBSERVATION (on the console / Vane drops it during the turn) | `d_stair`, `d_base`, (optionally the dock roll-up) | Act V: the basement |
| **COLD KEY** (`cold`) *(optional 3rd)* | T_PROCESSING (on a hook) | `d_cold` | Deepens basement gating; can be cut (leave `d_cold` unlocked) |

**KEYNAMES additions** (the engine's `KEYNAMES` map currently has `staff`,
`basement`): add `cold:'Cold-room key'` if the optional third key is used.

**Progression in one line:** *Explore freely (no key) → find STAFF KEYCARD in the
exam room → unlock the observation/control cluster (the reveal) → get the BASEMENT
KEY in observation → descend the stair → the basement act → escape (front doors or
the dock).* Two keys carry the whole hour; the optional cold key adds one beat.

---

## 8. ~45-MINUTE PACING / TRAVERSAL FLOW

> Mapped to the story beats (docs 02/06) but **scoped to ~45 min** by tightening the
> middle. Phase = wall-clock target for a first-time player. Loops and backtracks
> are explicit. "Gate" = what's required to proceed.

### Phase 0 — Arrival & consent (≈0:00–0:06) · *mundane*
- Spawn **B_LOBBY**. Phone beat (Maya, bank −$43.18). Walk **B_LOBBY → C_INTAKE**
  (`d_intake`, open). Talk to Renata; **read & sign consent** (page 4 logged).
- Renata leaves; `d_front` locks (the sound you remember). Objective → Room 3.
- **Travel:** lobby ↔ intake (short). ~6 min.

### Phase 1 — Wiring up & first sleep (≈0:06–0:14) · *trust → fuse*
- **B_LOBBY → D_HALL_NORTH → E_ROOM3** (`d_r3`). Meet **Vane**; the three rules;
  the REC dot and the one-way mirror established. Optionally peek **E_ROOM1/E_ROOM2**
  on the way (empty rooms teach the type).
- Get in bed → **breathe-to-sleep** → gentle dream → **wake at 3:33am** (room
  colder, phone "buzzed"). Lights begin dying northward.
- **Travel:** lobby→room3 along the spine. ~8 min.

### Phase 2 — The night turns: explore the patient wing (≈0:14–0:24) · *dread, key 1*
- Free exploration of the **no-key set**. Intended loop, both wings off the spine:
  1. **F_BATHROOM** (`d_bath`) → **NIGHT LOG** ("Subject in 4 … nineteen days").
  2. **S_COURTYARD** (via `d_court`) → the window beat; you see the lot you can't reach.
  3. **E_ROOM4** door crack → **the long subject** (view-only; `d_r4` locked, no key).
  4. **E_ROOM6** (via conn, `d_r6`) → degraded room, consent carbons.
  5. **E_ROOM5** (via conn off E_ROOM3, `d_r5`) → **spare battery** + the child's drawing.
  6. **Q_NURSES** island → room-cam monitors (foreshadow), Room-4 has no discharge date.
  7. **K_BREAK** (north gap) → lockers (**hide spots**), **spare battery** on desk.
- **First paralysis** triggers in/near E_ROOM3 mid-phase (eyes-only; the Visitor at
  the foot of the bed). The **Visitor becomes active** and begins roaming — first
  **hide-and-evade** pressure (lockers in K_BREAK, under-beds, the bathroom stall).
- **Gate to advance:** find the **STAFF KEYCARD** in **G_EXAM** (`d_exam`, open;
  drawer item). This is the deliberate funnel out of free-roam.
- **Travel:** lots of spine ↔ room backtracking; this is the exploration-loop phase.
  ~10 min.

### Phase 3 — Behind the glass: the reveal (≈0:24–0:33) · *terror + understanding, key 2*
- With the keycard: **G_EXAM → H_SLEEPLAB** (`d_lab`) — the polysomnograph, the
  cables to the rooms, the **fear-scoring clipboard** (the instrument half of the
  reveal). Then **H_SLEEPLAB → I_OBSERVATION** (`d_lab_obs`) *or* backtrack to the
  hall and use **`d_obs`** — either route into observation (the surveillance half).
- In **I_OBSERVATION:** CAM 3 of your **empty bed**, the **tape wall** with tonight
  already recording, the **STAFF-ONLY → basement** door (`d_base`). Optional detour:
  **R_MRI** via `d_intake_back`+`d_mri` (the chair) and **J_RECORDS** (`d_rec`) for
  the **OUTBOUND manifest** — deep-lore backtracks for thorough players.
- **The turn:** Vane appears behind you, *not surprised.* He **drops/holds the
  BASEMENT KEY** (you take it during/after the confrontation). Visitor goes to
  **hunt**. The "chase that's a shoot" pressure begins.
- **Travel:** exam→lab→observation cluster, plus optional records/MRI loops. ~9 min.

### Phase 4 — The basement act (≈0:33–0:42) · *the bottom of the night*
- **Get to the stair.** Two ways, both now open: **I_OBSERVATION → hall → K_BREAK
  (open) → L_HALL_SOUTH → M_STAIR** (`d_stair`, **BASEMENT KEY**), or the
  `d_base`-into-service shortcut. Service-corridor traversal under hunt pressure
  (laundry-bin hide).
- **Descend M_STAIR** (fog ramps, lights die) → fade → **T_PROCESSING** (dubbing
  log, the *industry* of it). Branch outward:
  - **N_BOILER** (open) — the cot, the **fuse box** (cut/restore facility lights — a
    tool you can use against the Visitor), boiler dread.
  - **O_COLDSTORAGE** (`d_cold`) — **the awful truth** (sheeted gurneys, the long
    subject's fate, restrained). Emotional point-of-no-return.
  - **P_SHIPPING** (`d_ship`) — the **buyer's crates**, the manifest/ledger, the
    **dock roll-up** (a possible second exit).
- Heaviest **hide-and-evade** here (rack, boilers, gurneys, crates, forklift). ~9 min.

### Phase 5 — The bill comes due (≈0:42–0:45) · *gut punch*
- **Escape resolves by behavior** (the Fear Profile, not a menu):
  - **Discharged:** climb back up (scripted) → **D_HALL_NORTH → B_LOBBY →
    A_VESTIBULE → EXTERIOR DOORS** (the `d_front`/exterior is force-opened); dawn,
    the car, +$1,200, something in the back seat. *(Alt: out the P_SHIPPING dock.)*
  - **Incomplete:** you break/panic past threshold → Vane sedates you (kind, awful).
  - **Retained:** total compliance / never resisted → you become E_ROOM4.
- **Fear Profile end-card.** ~3 min.

**Total ≈ 45 min.** Length sources, as required: a **sizable facility** (24 areas,
~1,580 m²), **two+ keys/objectives** (staff card → reveal cluster; basement key →
basement act), **optional readable lore** (NIGHT LOG, OUTBOUND manifest, dubbing
log, ledger, consent p.4, MRI chemicals, the toe-tag), multiple **hide-and-evade**
sections (lockers, stalls, under-beds, counter, bins, rack, boilers, gurneys,
crates, forklift), and a full **basement act** (4 rooms). Pacing rule from doc 06 is
respected: **no two calm beats in a row after the first paralysis** — every quiet
exploration moment after Phase 2's midpoint is undercut by Visitor pressure.

---

## 9. READY-TO-PASTE BUILDER CALLS (new areas)

> These follow the existing `buildClinic()` API exactly. Drop them **after** the
> existing room block (or interleave by region). **Coordinates are non-overlapping
> with the existing build.** Orient letters on `addDoor` follow the existing-build
> convention (hall side-doors use `'z'`; copy the nearest existing door for a given
> wall direction — see the Door Orientation Note §6). Lights: 6th arg = shadow,
> 7th = flicker.

### 9.1 A_VESTIBULE + lobby south opening + C_INTAKE
```js
/* ---- rebuild B_LOBBY south & east walls to add openings ---- */
// south wall with a doorway to the vestibule:
wallRun('z', 15, -7, 7, H, [[0,2.4]], MATS.carpet);
// east wall with a doorway to intake:
wallRun('x', 7, 3, 15, H, [[9,2.0]]);

/* ---- A_VESTIBULE (0,16.5) 8x4 ---- */
roomShell(0,16.5,8,4,H,{n:false,ng:[[0,2.4]],s:false,sg:[[0,2.4]]},MATS.tile,MATS.ceil,MATS.tile);
ceilLight(0,16.5,0xbfc8d0,0.7,8,false,true);            // flickers
deco(MATS.exit,0,2.6,18.4,1.0,0.3,0.05);                 // EXIT over exterior doors
deco(MATS.carpet,0,0.06,16.5,2.0,0.04,1.2);              // entry mat
cyl(MATS.metal,3.2,0.6,17.4,0.08,0.10,1.2,10);           // sanitizer stand
propChair(-3.2,16.5,0);                                   // bench
propPoster(signMat([{t:'ASHGROVE',sz:22},{t:'SLEEP CTR',sz:18}],'#15302a','#bfe8ff'),0,2.3,18.45,Math.PI,2.4,1.0);
propPoster(signMat([{t:'MISSING',sz:20},{t:'R. ORTIZ?',sz:18}],'#d8d2c0','#552'),3.7,1.7,16.5,-Math.PI/2,0.9,1.1);
addDoor(0,14.5,'x','d_front');   // glass front doors (Z-wall → 'x'); story locks at 11pm

/* ---- C_INTAKE (8.5,9) 5x8 ---- */
roomShell(8.5,9,5,8,H,{w:true},MATS.carpet);             // open west to lobby
ceilLight(8.5,7,0xcfd2c0,0.8,8,false,false);
ceilLight(8.5,11,0xffe6b0,0.4,4,false,true);             // warm desk lamp, flicker
propDesk(8.5,11.5,2.6,1.1);
propChair(8.5,12.6,Math.PI); propChair(7.4,11.5,Math.PI/2);
box(MATS.metal,10.3,0.8,7.5,0.6,1.6,1.0,{uv:1});         // filing cabinet
cyl(MATS.metal,7.2,1.0,6.2,0.06,0.06,2.0,8);             // coat rack
deco(MATS.gown,7.2,1.4,6.3,0.5,0.9,0.1);
cyl(MATS.glass,10.4,0.9,11.8,0.18,0.18,0.6,12);          // water cooler
propPoster(signMat([{t:'INTAKE',sz:28},{t:'check-in →',sz:16}]),8.5,2.2,5.1,0,1.4,0.7);
addDoor(7,9,'z','d_intake');                                          // X-wall (fixed x=7) → 'z'
addDoor(8.5,5.6,'x','d_intake_back',true,'STAFF — keypad. Locked.');  // Z-wall (fixed z=5.6) → 'x'; → R_MRI spur (STAFF)
WORLD.hideSpots.push({x:8.5,z:11.9,r:1.0,kind:'desk',id:'desk_intake'});
```

### 9.2 E_ROOM1 / E_ROOM2 + hall gap at z=1.5
```js
/* rebuild hall long walls to add the z=1.5 gaps (keep existing -3,-8,-13) */
wallRun('x', 1.5,-15,3,H,[[1.5,1.7],[-3,1.7],[-8,1.7],[-13,1.7]]);
wallRun('x',-1.5,-15,3,H,[[1.5,1.7],[-3,1.7],[-8,1.7],[-13,1.7]]);

/* E_ROOM1 (4.2,1.5) 5x4 open west */
roomShell(4.2,1.5,5,4,H,{w:true},MATS.floor);
ceilLight(4.2,1.5,0x9fb6c8,0.6,7,false,true);
propBed(4.6,1.5,0); propMonitor(6.3,0.3); propDesk(2.6,0.4,0.9,0.7);
deco(MATS.gown,4.6,0.72,1.5,0.5,0.1,0.4); propBox(6.0,2.6);
deco(MATS.mirror,6.55,1.6,1.5,0.08,1.7,1.8);
addDoor(1.5,1.5,'z','d_r1');
WORLD.hideSpots.push({x:4.6,z:1.5,r:1.3,kind:'bed',id:'bed1'});

/* E_ROOM2 (-4.2,1.5) 5x4 open east */
roomShell(-4.2,1.5,5,4,H,{e:true},MATS.floor);
ceilLight(-4.2,1.5,0x9fb6c8,0.6,7,false,true);
propBed(-4.6,1.5,Math.PI); propMonitor(-6.3,0.3); propDesk(-2.6,0.4,0.9,0.7);
propVent(-6.6,2.3,1.5,Math.PI/2); deco(MATS.mirror,-6.55,1.6,1.5,0.08,1.7,1.8);
addDoor(-1.5,1.5,'z','d_r2');
WORLD.hideSpots.push({x:-4.6,z:1.5,r:1.3,kind:'bed',id:'bed2'});
```

### 9.3 E_ROOM5 (east spur) + E_ROOM6 (west spur)
```js
/* E_ROOM5 spur off E_ROOM3 */
roomShell(7.1,-3,2.2,2.0,H,{w:false,e:false},MATS.floor);  // connector (E/W open)
roomShell(8.6,-3,5,5,H,{w:true},MATS.floor);
ceilLight(8.6,-3,0x9fb6c8,0.6,7,false,true);
propBed(9.0,-3,0); propMonitor(10.6,-4.4); propDesk(7.0,-4.4,0.9,0.7);
propPoster(signMat([{t:'MY',sz:18},{t:'DREAM',sz:18},{t:'HOUSE',sz:16}],'#e8e4d0','#446'),11.0,1.6,-3,-Math.PI/2,0.7,0.8);
propVent(11.0,2.3,-1.5,-Math.PI/2); deco(MATS.mirror,11.05,1.6,-3,0.08,1.7,1.8);
addDoor(6.1,-3,'z','d_r5');                                           // X-wall (fixed x=6.1) → 'z'
WORLD.hideSpots.push({x:9.0,z:-3,r:1.3,kind:'bed',id:'bed5'});
// battery pickup:
addItem(7.0,-4.4,1.6,'Spare battery',()=>{INV.batteries++;P.batt=clamp(P.batt+0.6,0,1);updateInv();SOUND.pickup();say('','Flashlight battery. +charge.',3);},true);

/* E_ROOM6 spur off E_ROOM4 */
roomShell(-7.1,-8,2.2,2.0,H,{w:false,e:false},MATS.floor);
roomShell(-8.6,-8,5,5,H,{e:true},MATS.floor);
ceilLight(-8.6,-8,0x6a6e64,0.5,7,false,true);
propBed(-9.0,-8,Math.PI); propChair(-7.2,-9.4,0);
propBox(-9.0,-6.4); propBox(-9.6,-6.4); propShelf(-11.0,-8,Math.PI/2,3);
propVent(-11.0,2.3,-8,Math.PI/2); deco(MATS.wallGrime,-11.0,1.4,-8,0.05,2.6,4.6);
deco(MATS.mirror,-11.05,1.6,-8,0.08,1.7,1.8);
addDoor(-6.1,-8,'z','d_r6');                                          // X-wall (fixed x=-6.1) → 'z'
WORLD.hideSpots.push({x:-9.0,z:-8,r:1.3,kind:'bed',id:'bed6'});
```

### 9.4 H_SLEEPLAB + exam east door
```js
/* rebuild G_EXAM east wall with a gap to the lab */
wallRun('x',6.7,-10.5,-5.5,H,[[-8,1.7]],MATS.tile);

/* H_SLEEPLAB (8.8,-8) 5x5 */
roomShell(8.8,-8,5,5,H,{w:true},MATS.floor,MATS.ceil);
ceilLight(8.8,-8,0x6fae86,0.6,7,true,false);
propDesk(8.8,-10.0,3.4,0.9);
for(let i=0;i<5;i++){deco(MATS.screen,7.4+i*0.7,1.7,-10.3,0.1,0.6,0.55);
  const L=new THREE.PointLight(0x2f8f5a,0.25,3,2);L.position.set(7.4+i*0.7,1.7,-10.0);WORLD.group.add(L);}
box(MATS.metal,11.1,1.4,-8,0.2,2.0,1.6,{uv:1});          // patch panel
propChair(8.8,-8.6,0);
box(MATS.dark,11.1,0.9,-6.4,0.6,1.8,0.6,{uv:1});         // server tower
propPoster(signMat([{t:'CYCLE1 ok',sz:13},{t:'CYCLE2 spike',sz:12},{t:'GEL rotate',sz:12}]),8.8,2.0,-5.6,0,1.6,1.0);
propVent(8.8,2.3,-5.6,0);
addDoor(6.7,-8,'z','d_lab',true,'CONTROL — badge only.');         // X-wall (fixed x=6.7) → 'z'; STAFF
addDoor(8.8,-10.5,'x','d_lab_obs',true,'Locked. Card reader.');   // Z-wall (fixed z=-10.5) → 'x'; STAFF -> obs spur
WORLD.hideSpots.push({x:8.8,z:-9.6,r:1.0,kind:'desk',id:'desk_lab'});
// scoring clipboard:
addItem(8.8,-10.0,1.8,'The scoring clipboard',()=>openNote('POLYSOMNOGRAPH — SESSION 3',
`CH3  EEG ............ spindle/spike present
CH3  HR ............. 96 climbing (good)
FEAR INDEX ......... rising — DO NOT intervene
GEL ................ rotate compound (tolerance)
NOTE: subject reads high. Keep lights low.`));
```

### 9.5 I_OBSERVATION basement door + obs east spur (wire existing room)
```js
/* I_OBSERVATION already built; add the real basement door + east spur link */
// south wall basement door (replace the decorative one):
addDoor(4.6,-14.9,'x','d_base',true,'STAFF ONLY — BASEMENT. Needs the basement key.'); // Z-wall (fixed z=-14.9) → 'x'
// east spur connecting H_SLEEPLAB's d_lab_obs down to observation's east side:
roomShell(8.2,-11.75,1.7,2.5,H,{n:false,s:false},MATS.floor);  // vertical connector
wallRun('x',7.6,-14,-12,H,[[-13,1.7]]);                        // obs east wall gap
WORLD.hideSpots.push({x:4.6,z:-14.4,r:1.0,kind:'desk',id:'desk_obs'});
// set key needs on existing locked doors:
{const d=WORLD.doors.find(x=>x.id==='d_obs'); if(d)d.keyNeed='staff';}
{const d=WORLD.doors.find(x=>x.id==='d_base'); if(d)d.keyNeed='basement';}
```

### 9.6 R_MRI (the chair) + intake→MRI spur
```js
/* spur from C_INTAKE (8.5,5.6) north then west into R_MRI east wall */
roomShell(8.5,0.3,1.7,10.6,H,{n:false,s:false},MATS.floor); // vertical spur z:[-5,5.6]
roomShell(9.0,-8,2.0,1.7,H,{w:false,e:false},MATS.floor);   // elbow west into MRI

/* R_MRI (13,-8) 6x6 */
roomShell(13,-8,6,6,H,{w:true},MATS.tile,MATS.ceil,MATS.tile);
ceilLight(13,-8,0x9fb0c0,0.6,8,false,true);
propGurney(13,-8,0);                                          // the chair (reclined)
deco(MATS.metal,13,0.95,-7.4,0.6,0.05,0.1); deco(MATS.metal,13,0.95,-8.6,0.6,0.05,0.1); // straps
cyl(MATS.metal,13,1.3,-10.0,1.2,1.2,1.4,16); cyl(MATS.dark,13,1.3,-10.0,0.6,0.6,1.5,16); // bore
propDesk(15.0,-8,1.2,1.6); propMonitor(15.4,-6.6);
propShelf(13,-5.4,0,3);
propPoster(signMat([{t:'FIXER',sz:20},{t:'do not',sz:12},{t:'inhale',sz:14}],'#cfd6cf','#363'),13,1.6,-5.1,0,0.7,0.8);
deco(MATS.dark,11.2,1.3,-8,0.5,0.9,0.1);                      // lead apron
propVent(15.6,2.3,-8,-Math.PI/2);
addDoor(10,-8,'z','d_mri',true,'IMAGING — keypad.');          // X-wall (fixed x=10) → 'z'; STAFF
WORLD.hideSpots.push({x:13,z:-10.6,r:0.9,kind:'machine',id:'mri'});
```

### 9.7 S_COURTYARD (window alcove) + west spur
```js
/* spur west from F_BATHROOM region into S_COURTYARD east wall */
roomShell(-9.0,-3,2.0,1.7,H,{w:false,e:false},MATS.floor);    // elbow
/* S_COURTYARD (-12.5,-3) 5x5 */
roomShell(-12.5,-3,5,5,H,{e:true},MATS.floor);
ceilLight(-12.5,-3,0x88a0b8,0.5,8,false,true);
deco(MATS.glass,-14.95,1.7,-3,0.08,2.2,3.2);                  // window
deco(MATS.metal,-14.93,1.7,-3,0.02,2.2,3.2);                  // reinforcing grid
cyl(MATS.dark,-12.5,0.5,-1.2,0.06,0.06,1.0,8); sph(MATS.dark,-12.5,1.1,-1.2,0.4,8); // dead ficus
propChair(-13.4,-3,Math.PI/2); propChair(-11.6,-3,-Math.PI/2);
box(MATS.dark,-12.5,1.1,-5.0,1.0,2.2,0.8,{uv:1});            // dead vending machine
deco(MATS.metal,-14.9,1.4,-1.2,0.3,0.5,0.2);                 // payphone husk
propPoster(signMat([{t:'COURTYARD',sz:18},{t:'no exit',sz:14}],'#cfd6cf','#455'),-12.5,2.1,-5.4,0,1.4,0.7);
{const glow=new THREE.PointLight(0x6a86b0,0.5,7,2);glow.position.set(-16.5,1.8,-3);WORLD.group.add(glow);} // exterior moonlight
addDoor(-10,-3,'z','d_court');                                // X-wall (fixed x=-10) → 'z'
WORLD.hideSpots.push({x:-12.5,z:-5.0,r:0.8,kind:'vending',id:'vend_court'});
```

### 9.8 Q_NURSES (open counter island — NO roomShell)
```js
/* furniture island inside the widened hall around z=-10.5; do NOT seal the corridor */
box(MATS.wood,-0.6,0.9,-10.5,1.2,1.0,0.5,{uv:1});
box(MATS.wood, 0.6,0.9,-10.5,1.2,1.0,0.5,{uv:1});
deco(MATS.screen,-0.5,1.4,-10.5,0.4,0.3,0.05); deco(MATS.screen,0.5,1.4,-10.5,0.4,0.3,0.05);
{const L=new THREE.PointLight(0x2f8f5a,0.3,3,2);L.position.set(0,1.4,-10.3);WORLD.group.add(L);}
ceilLight(0,-10.5,0xbfe0e8,0.7,7,true,false);
propChair(0,-11.2,0);
cyl(MATS.metal,1.2,1.4,-11.0,0.12,0.12,0.8,10);              // pneumatic tube terminal
WORLD.hideSpots.push({x:0,z:-11.0,r:0.9,kind:'counter',id:'counter_q'});
```

### 9.9 K_BREAK north opening + L_HALL_SOUTH (service corridor)
```js
/* open K_BREAK north wall to the service corridor (K resized to 5x4 -> north wall z=-19) */
wallRun('z',-19,-2.5,2.5,H,[[0,2.4]]);
addDoor(0,-19,'x','d_break_svc');                           // Z-wall (fixed z=-19) → 'x'
box(MATS.metal,2.2,1.0,-18.6,0.5,0.4,0.4,{uv:1});            // microwave
box(MATS.metal,-2.2,1.0,-18.6,0.7,2.0,0.7,{uv:1});          // fridge
propPoster(signMat([{t:'NIGHTS',sz:18},{t:'VANE',sz:22}]),0,2.0,-18.9,Math.PI,1.4,0.9);

/* L_HALL_SOUTH (0,-21) 24x3, walls grimy */
roomShell(0,-21,24,3,H,
  {ng:[[0,2.4],[-4.6,1.7],[8,1.7]],   // north-side gaps (toward K_BREAK / J_RECORDS svc / lab svc)
   wg:[[-21,2.4]], eg:[[-21,1.7]]},   // west -> stair, east -> imaging svc
  MATS.floor,MATS.ceil,MATS.wallGrime);
for(let i=0;i<6;i++)ceilLight(-10+i*4,-21,0xb0b4a0,0.5,6,(i===1||i===4),true);
box(MATS.metal,-8,1.4,-22.4,0.6,1.6,0.2,{uv:1});            // breaker panel
deco(MATS.door,-2,1.2,-22.4,1.25,2.4,0.06);                 // janitor (sealed)
cyl(MATS.metal,-2,0.3,-20.8,0.25,0.25,0.5,10);              // mop bucket
propBox(6,-20.0); propBox(6.6,-20.0); propBox(6.3,-20.6);
box(MATS.fabric,9,0.7,-21,1.0,1.2,0.8,{uv:1});             // laundry bin (hide)
propPoster(signMat([{t:'← STAIRS',sz:18},{t:'SHIPPING',sz:16},{t:'B-LEVEL',sz:14}],'#dddd00','#000'),-11.8,2.2,-21,Math.PI/2,1.0,0.9);
addDoor(-12,-21,'z','d_stair',true,'STAIRS — DOWN. Basement key required.'); // X-wall (fixed x=-12) → 'z'; BASEMENT KEY
WORLD.hideSpots.push({x:9,z:-21,r:0.9,kind:'bin',id:'bin_svc'});
{const d=WORLD.doors.find(x=>x.id==='d_stair'); if(d)d.keyNeed='basement';}

/* J_RECORDS service door into L_HALL_SOUTH */
addDoor(-4.6,-14.9,'x','d_rec_svc',true,'Service passage. Locked.'); // Z-wall (fixed z=-14.9) → 'x'
{const d=WORLD.doors.find(x=>x.id==='d_rec_svc'); if(d)d.keyNeed='staff';}
```

### 9.10 M_STAIR shaft + basement region (T / N / O / P)
```js
/* M_STAIR shaft (visual descent; fog/lights handled by story trigger)
   Centered (-13,-23), size 3 x 7 → spans z ∈ [-26.5, -19.5]. Its SOUTH wall (z=-19.5)
   meets L_HALL_SOUTH's west gap region via the d_stair door at (-12,-21): the corridor's
   west wall gap [-21,2.4] and this shaft's south gap line up at the corridor mouth.
   The NORTH end (z=-26.5) is a dead end holding the descent trigger (no real geometry
   continues; the fade relocates the player to the basement slab). */
roomShell(-13,-23,3,7,H,{s:false,sg:[[-21,2.4]]},MATS.floor,MATS.ceil,MATS.wallGrime);
ceilLight(-13,-20,0xffe2b0,0.5,5,false,true);
ceilLight(-13,-23,0xffd0a0,0.4,4,false,true);
ceilLight(-13,-25.8,0xff9060,0.35,4,false,true);
propPoster(signMat([{t:'DONT',sz:24},{t:'SLEEP',sz:24}],'#2a2a26','#a33'),-14.4,1.6,-23,Math.PI/2,0.8,0.9);
// trigger at the dead-end bottom fades + relocates player to T_PROCESSING and thickens fog (story owns this).
trigger(-13,-25.8,1.6,()=>{ fade(1,1.2,()=>{ P.pos[0]=-6;P.pos[2]=-27.5; scene.fog.density=0.09; fade(0,1.4);
  say('','The stairs end in cold air and a low hum. B-Level.',5); }); },'descend');

/* ---- BASEMENT SLAB ---- clean 3-column grid, all rooms span z ∈ [-38,-26]:
     WEST column  N_BOILER     x ∈ [-18,-9]
     CENTER col   T_PROCESSING x ∈ [-9,-3], z ∈ [-30,-26]
                  O_COLDSTORAGE x ∈ [-9,-3], z ∈ [-38,-30]   (shares z=-30 with T)
     EAST column  P_SHIPPING   x ∈ [-3, 6]
   Shared wall lines: x=-9 (N|T,O), x=-3 (T,O|P), z=-30 (T|O). No overlaps. */

/* T_PROCESSING (-6,-28) 6x4  — basement antechamber (player fades in here) */
roomShell(-6,-28,6,4,H,{s:false,sg:[[-6,1.7]],w:false,wg:[[-28,1.7]],e:false,eg:[[-28,1.7]]},MATS.floor,MATS.ceil,MATS.wallGrime);
ceilLight(-6,-28,0xffcaa0,0.5,6,false,true);
box(MATS.metal,-8.4,1.3,-27,0.6,2.0,1.2,{uv:1});           // dubbing rack
propDesk(-6,-26.8,2.0,0.9); propShelf(-3.6,-27,Math.PI/2,4);
cyl(MATS.metal,-7,1.1,-28.8,0.3,0.3,0.15,16);              // reel
addItem(-6,-26.8,1.8,'The dubbing log',()=>openNote('DUPLICATION LOG',
`OUTBOUND MASTERS — this week: 14
'FEAR RESPONSE' grade ... priced 3x
BUYER: [mark only — no name]
DISPOSE incomplete subjects per policy.`));
addDoor(-6,-30,'x','d_cold',true,'COLD STORAGE. The handle is freezing.'); // Z-wall (z=-30) → 'x'  ↓ to O
addDoor(-3,-28,'z','d_ship');                               // X-wall (x=-3) → 'z'  → to P
WORLD.hideSpots.push({x:-8.4,z:-27,r:0.9,kind:'rack',id:'rack_proc'});

/* N_BOILER (-13.5,-32) 9x12  — west column, full height; east wall x=-9 shared w/ T,O */
roomShell(-13.5,-32,9,12,H,{e:false,eg:[[-28,1.7]]},MATS.floor,MATS.ceil,MATS.wallGrime); // open into T at z=-28
ceilLight(-13.5,-29,0xffb070,0.5,6,false,true); ceilLight(-13.5,-35,0xffb070,0.45,6,false,true);
{const p=new THREE.PointLight(0xff5520,0.4,3,2);p.position.set(-14,1.2,-35);WORLD.group.add(p);} // pilot
cyl(MATS.metal,-16,1.3,-34.5,0.9,0.9,2.4,16); cyl(MATS.metal,-16,1.3,-31.5,0.9,0.9,2.4,16); // boilers
propBed(-12.5,-36.5,0);                                     // the cot
box(MATS.metal,-17.3,1.4,-32,0.2,1.8,1.0,{uv:1});          // fuse box
addItem(-17.3,-32,1.6,'Main breakers',()=>{ /* toggle facility lights */ say('','You throw the breakers. Somewhere, lights die — or wake.',4); });
propDesk(-11.5,-30.0,1.8,0.8);
propPoster(signMat([{t:'DANGER',sz:24},{t:'HIGH',sz:18},{t:'VOLTAGE',sz:16}],'#dddd00','#000'),-17.4,1.7,-30.0,Math.PI/2,0.9,1.0);
propVent(-17.3,2.3,-36,Math.PI/2);
WORLD.hideSpots.push({x:-16,z:-33.0,r:0.9,kind:'boiler',id:'boiler_n'});

/* O_COLDSTORAGE (-6,-34) 6x8  — center-south; north wall z=-30 shared w/ T (d_cold) */
roomShell(-6,-34,6,8,H,{n:false,ng:[[-6,1.7]],e:false,eg:[[-34,2.4]]},MATS.floor,MATS.ceil,MATS.wallGrime); // east x=-3 → P (wide, gurneys)
ceilLight(-6,-34,0x9fc0d0,0.6,7,true,false);
propGurney(-7,-36,0); propGurney(-6,-36.8,0); propGurney(-5,-36,0);
deco(MATS.sheet,-7,1.0,-36,2.0,0.06,0.7); deco(MATS.sheet,-6,1.0,-36.8,2.0,0.06,0.7); deco(MATS.sheet,-5,1.0,-36,2.0,0.06,0.7);
propShelf(-7.6,-32,Math.PI/2,4);
box(MATS.metal,-4.0,0.9,-32.5,1.6,0.1,0.8,{uv:1});         // prep table
deco(MATS.glass,-6,1.5,-30.2,1.7,2.0,0.05);                // strip curtain (at the d_cold mouth)
box(MATS.dark,-8.4,1.4,-34,0.3,0.4,0.15,{uv:1});           // thermostat
addItem(-6,-36.8,2.0,'The nearest sheet',()=>say('','You lift a corner. You put it back. You know the name from the archive. They were never discharged.',8));
propVent(-8.4,2.3,-37,Math.PI/2);
addDoor(-3,-34,'z','d_cold_ship');                          // X-wall (x=-3) → 'z'  → to P
WORLD.hideSpots.push({x:-6,z:-37,r:1.0,kind:'gurney',id:'gurney_cold'});

/* P_SHIPPING (1.5,-32) 9x12  — east column, full height; west wall x=-3 shared w/ T,O */
roomShell(1.5,-32,9,12,H,{w:false,wg:[[-28,1.7],[-34,2.4]]},MATS.floor,MATS.ceil,MATS.wallGrime); // d_ship z=-28, d_cold_ship z=-34
ceilLight(1.5,-29,0xffd0a0,0.6,8,false,true); ceilLight(1.5,-35,0xffd0a0,0.5,8,false,true);
{const p=new THREE.PointLight(0xff6030,0.4,5,2);p.position.set(2,1.4,-37);WORLD.group.add(p);}
deco(MATS.exit,2,2.6,-37.9,1.0,0.3,0.05);                  // EXIT over dock
deco(MATS.metal,2,1.5,-37.9,3.0,3.0,0.1);                  // dock roll-up (alt exit) on south wall z=-38
for(let ix=0;ix<3;ix++)for(let iz=0;iz<3;iz++)propBox(0.5+ix*0.6,-35+iz*0.6); // crate pallet
box(MATS.metal,4.5,0.5,-30.5,1.2,1.0,1.8,{uv:1}); box(MATS.metal,4.5,1.6,-29.5,0.1,2.0,1.0,{uv:1}); // forklift
propDesk(4.5,-35.0,1.8,0.9);
addItem(4.5,-35.0,1.8,'Outbound manifest',()=>openNote('ASHGROVE — OUTBOUND',
`CONTENTS: 14 sessions (master tapes). Buyer reference withheld.
'fear response' sessions priced 3x. Flag the runners — they sell best.
Thank you for your contribution.`));
propShelf(-2.6,-32,Math.PI/2,4);
propPoster(signMat([{t:'SHIPPING',sz:18},{t:'RECEIVING',sz:14}],'#dddd00','#000'),5.8,2.2,-29.0,-Math.PI/2,1.0,0.7);
WORLD.hideSpots.push({x:0.5,z:-35,r:1.0,kind:'crates',id:'crates_ship'});
WORLD.hideSpots.push({x:4.5,z:-30.5,r:0.9,kind:'forklift',id:'fork_ship'});
WORLD.hideSpots.push({x:5.0,z:-31.0,r:0.9,kind:'forklift',id:'fork_ship'});
```

> **Implementer notes.**
> 1. Some `roomShell` openings above use `{wg:[...]}` / `{eg:[...]}` to place gaps in
>    a *closed* side. Confirm against the engine: `roomShell` only draws a wall when
>    `!open[side]`, and passes `open[side+'g']` as that wall's gaps — so to get a gap
>    in a wall, **leave the side closed and supply its `*g` array** (as done here).
>    The few places that say `{w:false, wg:[...]}` are explicit about this.
> 2. The basement `trigger()` uses `fade()` and `scene.fog.density` exactly as the
>    existing `startSleep()` does. Story agent owns final fog/ambient values.
> 3. Connector cells (`roomShell(...,{w:false,e:false})`) intentionally have **no
>    floor seams problems** because each draws its own floor slab; overlapping a 0.1
>    floor slab edge-to-edge is harmless (z-fighting avoided by identical y).
> 4. Add `cold:'Cold-room key'` to `KEYNAMES` only if you use the optional 3rd key;
>    otherwise leave `d_cold` unlocked (remove its `true` + msg).

---

## 10. SUMMARY (for the story agent)

- **24 areas** (20 canonical IDs + 4 added: `Q_NURSES`, `R_MRI`, `S_COURTYARD`,
  `T_PROCESSING`). All canonical IDs are used verbatim.
- **Footprint ≈ 1,580 m²** (ground ≈ 1,290 m² over X∈[−15.5,16]/Z∈[−22.5,18.5];
  basement ≈ 290 m² over X∈[−16.5,6]/Z∈[−39,−26]).
- **Key/lock progression:** **STAFF KEYCARD** (in G_EXAM drawer) → the behind-the-
  glass cluster (`d_obs`, `d_lab`, `d_lab_obs`, `d_intake_back`, `d_mri`,
  `d_rec_svc`); **BASEMENT KEY** (in I_OBSERVATION at the turn) → `d_stair`,
  `d_base`, the dock; optional **COLD KEY** (T_PROCESSING) → `d_cold`.
- **Connectivity guarantee:** BFS from B_LOBBY reaches all 24 areas with the two
  intended key pickups; the no-key set covers all of Acts I–II; E_ROOM4 is
  intentionally view-only (no key — you can't save the long subject) but its content
  is delivered through the door crack. Every door/gap is **1.7 or 2.4** wide
  (player diameter 0.64), so the player fits everywhere with margin.
- **~45-min flow:** consent (6) → wire-up & first sleep (8) → explore the patient
  wing + first paralysis + get staff card (10) → behind the glass / reveal + get
  basement key (9) → basement act (9) → ending + Fear Profile (3).
```
