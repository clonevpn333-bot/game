# 10 — FEARS TO FATHOM DIRECTION ⭐⭐ (AUTHORITATIVE REDESIGN — LEAD DESIGNER)
### *Small Hours — The Ashgrove Study* — the document everything conforms to

> **Status: CANON. Supersedes the survival-horror framing wherever they conflict.**
> Subagents (optimization, models, bugs) and the implementer align to *this*. Where
> `03_GAMEPLAY_SYSTEMS.md`, `06_PACING_THE_HOUR.md`, `07_MAP_SPEC.md`, or
> `08_STORY_45MIN.md` describe stamina, sanity/composure meters, a flashlight
> battery economy, hide-from-stalker loops, or a constantly-hunting Visitor, **this
> document overrides them.** The map geometry (canonical area IDs `A_VESTIBULE` …
> `P_SHIPPING`), the story, the documents, the phone thread, and the characters are
> all **kept**. The *genre* is what changes.
>
> **Research note (read this):** Outbound `WebFetch` to Wikipedia and the Fandom
> wiki was **HTTP-403 blocked** in this environment. One `WebSearch` succeeded and
> confirmed the anthology framing, developer (Rayll), and episode list. The detailed
> gameplay characterization below therefore draws on **my own training knowledge of
> the series** (Fears to Fathom is well within my knowledge cutoff), corroborated by
> that single search. Treat the *pillars* as authoritative design intent; treat any
> episode-specific micro-claim as "best recollection," not gospel.

---

## 0. THE PROBLEM, STATED PLAINLY

The user is right. As built, `SMALL_HOURS.html` is a **Puppet Combo / Outlast
survival game wearing a Fears-to-Fathom skin.** The evidence is in the engine:

- **Three survival meters on screen** (`#bars`): `FLASHLIGHT`, `STAMINA`,
  `COMPOSURE`, updated every frame (`tick()` lines ~1086–1088).
- **A flashlight + battery economy** (`P.flashOn`, `P.batt`, drain in
  `updatePlayer`, spare batteries as pickups in `E_ROOM5`/`K_BREAK`).
- **Stamina-gated sprinting** (`SHIFT` run, `P.stam` drain/regen) and **crouch**
  (`C`) — the movement vocabulary of a chase game.
- **A sanity/dread system** that drives vignette, blood-vignette, and VHS
  degradation from *darkness and monster proximity* (`P.san`, `visitorDread()`).
- **A roaming stalker AI** (`VIS`, `updateVisitor`): it advances when unobserved,
  switches to `hunt`, closes distance, and `onCaught()` kills you → "retained."
- **A hide-and-seek loop**: `WORLD.hideSpots` in nearly every room, `enterHide()`/
  `exitHide()`, "You hold your breath."

That is *Outlast's* grammar: a predator hunts you through a building, you manage
light/stamina/sanity, you hide in lockers and under beds, the fail state is being
caught. **Fears to Fathom does almost none of this.** FtF is a first-person
narrative game about doing **mundane, realistic tasks** while dread accumulates
through **normalcy, texting, and waiting**, punctuated by a **small number of sharp,
scripted jumpscares** and a **gut-punch ending**. The threat is usually a
**grounded human predator**; you are rarely "hunted" in the action-game sense, and
when danger comes it is a **scripted set-piece**, not an AI chasing you with a
stamina bar ticking down.

We have a beautiful clinic, a genuinely great story, a cruel phone thread, and a
fear-profile end-card that *is* FtF in spirit. We bolted the wrong engine under it.
This document rips out the wrong engine and specifies the right one.

---

## 1. PILLARS WE HIT / TROPES WE REMOVE

### 1A. The Fears to Fathom pillars (what we ARE)

1. **First-person, grounded, mundane realism first.** You sign a form. You change
   into a gown. You let a technician attach sensors. You lie down. You read texts on
   a phone that looks like a phone. The first third must feel like a *boring real
   errand* — that is the horror engine priming.
2. **Slow burn through normalcy + texting + waiting.** Dread is built by
   *ordinariness curdling*, not by a monster appearing. The clock, the phone, a
   coffee mug still warm, a door that's ajar when it wasn't.
3. **A grounded threat.** The real antagonist is **human and institutional**:
   Marcus Vane and the Ashgrove operation. They harvest fear as product. The
   **Visitor is ambiguous and used sparingly** — for scripted scare beats and the
   finale only. *It is never a free-roaming hunter you evade with mechanics.*
4. **Minimal HUD.** An interact prompt, a subtitle line, one objective line, and
   the phone. **No bars. No meters. Nothing that says "video game" between you and
   the room.**
5. **VHS / found-footage filter.** Keep it. This is core FtF texture and we already
   have a good `VHS_SHADER`. It degrades with *story escalation*, not sanity.
6. **A few sharp, well-placed scripted jumpscares + a gut-punch ending.** Five to
   eight, each authored: a precise trigger, a precise payload, and a **deliberate
   return to calm** afterward so the next one can land. The end-card is the boss.

### 1B. The survival-horror tropes we REMOVE (non-negotiable)

| Remove | Why it's wrong for FtF |
|---|---|
| **Flashlight + battery economy** (`P.flashOn`, `P.batt`, battery pickups, drain) | Resource-survival grammar. FtF lighting is environmental and scripted (a light switch, a lamp, a phone flashlight used briefly), never a managed fuel gauge. |
| **Stamina + sprint** (`P.stam`, `SHIFT` run gate) | Chase-game grammar. FtF walks. There is one short scripted run at the very end, with no stamina meter. |
| **Sanity / composure** (`P.san`, the `COMPOSURE` bar, sanity-driven vignette/blood) | A meter that turns fear into a number you manage. FtF never quantifies your mind on screen. Dread is felt, not metered. |
| **Hide-from-stalker loop** (`WORLD.hideSpots`, `enterHide/exitHide`, lockers/under-beds as hides) | The entire stealth verb set of Outlast. Delete the *mechanic.* (Hide *spaces* may remain as scenery; you cannot "enter" them.) |
| **The constantly-hunting Visitor** (`VIS` roaming AI, `updateVisitor` pursuit, `hunt` state, `onCaught` death) | This is the single biggest offender. The Visitor must become a **scripted apparition**, present only during specific authored beats, never an AI that pathfinds toward you and kills you. |
| **"Caught → death/retained" fail state via AI** | FtF rarely has a lose-by-monster fail state mid-level. Our endings are chosen by *behavior across the night*, not by being tagged by a chaser. |

> **One sentence for the implementer:** *Strip the survival simulator down to a
> walking-and-interacting narrative shell, and re-express every "scare" as a
> hand-placed scripted event with a calm reset.*

---

## 2. THE NEW CORE LOOP

**Loop:** *Receive a simple objective → walk there → perform a mundane interaction
(read / sign / change / lie down / open / look) → the world shifts slightly wrong →
read the phone / a document → next objective.* Dread accrues. **At authored points,
a single scripted scare fires, then the game returns you to calm** and hands you the
next ordinary task.

This is a **first-person narrative "chore-and-investigate" loop**, the FtF spine.
The player is **never** asked to manage a resource, evade an AI, or win a fight.
They are asked to **do the next normal thing in an increasingly abnormal night.**

### 2A. The three movements (matching FtF's mundane → wrong → gut-punch)

- **MOVEMENT 1 — NORMAL (Acts I–III, ~the first 12–15 min).** Pure mundane realism.
  Check in, sign, change, get wired, lie down, sleep. The only "horror" is texture
  (a too-eager goodbye, a warm-but-wrong technician, the phone). **Zero monster.**
  At most **one** soft scare (S2 below: you wake and small things are wrong — *no
  Visitor yet*).
- **MOVEMENT 2 — WRONG (Acts IV–VI).** The investigative middle. You explore the
  clinic, read documents, find the keycard, piece together what Ashgrove is. The
  Visitor appears **only** as authored apparitions (paralysis, mirror, the doorway).
  The phone thread folds back on itself (the timestamp horror). Filter degrades.
- **MOVEMENT 3 — GUT PUNCH (Acts VII–VIII).** The reveal behind the glass, **one
  short scripted "get out" sequence** (a walk-with-pressure, not a stamina chase),
  the basement, and the ending chosen by your behavior. The end-card prints.

### 2B. The scripted jumpscare doctrine (THE most important section)

Every scare obeys all five rules:

1. **Authored trigger** — a specific area + a specific player action (cross a line,
   open a thing, look at a thing for N seconds, open the phone). Never "the AI got
   close."
2. **Single payload** — one clear beat (a figure appears / a sound + visual snap / a
   reflection wrongness / a door slam). No sustained pursuit.
3. **Bounded duration** — it resolves on its own in seconds. The player endures or
   witnesses; they do not have to *out-play* it.
4. **Reset to calm** — immediately after, the threat is **gone**, the music settles,
   the lights restore, and a **new mundane objective** appears. This breathing room
   is what makes the *next* scare work. (FtF lives in the exhale.)
5. **Restraint** — quiet and specific beats hardest. Most scares are *unsettling*,
   not loud. Reserve the one genuinely loud snap (the Vane turn, S7) for maximum
   effect.

### 2C. THE JUMPSCARE LIST (7 scares + 1 finale beat)

> Mapped to canonical area IDs. "Trigger" is the exact condition; "Reset" is the
> mandated return-to-calm. These **replace** the 15-entry roaming-scare table in
> `08_STORY_45MIN.md §7.2`. Fewer, sharper, all scripted.

| # | Area | Trigger | What happens | Reset to calm |
|---|---|---|---|---|
| **S1 — the lock** | `A_VESTIBULE` | Renata's exit fires (Movement 1, after consent) | A heavy magnetic **door clack** + her headlights sweep the glass and pull away. *No figure.* Establishes the sound we reuse at the finale. | Lights steady. Objective: *"Find Marcus in the exam room."* The clinic is just quiet now. |
| **S2 — the wrong wake** | `E_ROOM3` | Player "wakes" after first sleep (Act III) | Cut to cold blue. Clock has **jumped to ~3:33**. The call button is **on the floor**. The hall door drifts **open on its own**. A single soft tone. **No Visitor.** | Tone fades, room holds. Phone has a new text waiting. Objective: *"Get your bearings."* |
| **S3 — paralysis** | `E_ROOM3` | ~8–10 s after S2, player still near bed | Forced lie-down: **eyes only.** The **Visitor stands at the foot of the bed**, motionless, ~8 s. Looking *at* it vs *away* is logged (Profiler). It does **not** approach; it **vanishes** when control returns. | You can move. It's gone. Heartbeat audio drops to idle. Objective: *"Get up. Find a way out of the room."* |
| **S4 — the reflection** | `F_BATHROOM` | Player looks into the sink mirror at close range | For **one frame**, the reflection's eyes are open while the player "blinks." A wet tap-drip stinger. No chase. Just *wrong.* The **NIGHT LOG** doc is here to reward the approach. | Mirror normal on the next glance. Quiet. Objective continues (explore / find keycard). |
| **S5 — the long subject** | `E_ROOM4` | Player looks through the door crack **> ~4 s** | The bedridden subject's **head turns slowly toward the crack**, eyes open, still not "seeing" you. Vane's speaker, gentle: *"Don't mind four. He's a long-term guest."* | Head settles back. Speaker clicks off. Objective: *"Find the staff keycard."* The dread is *recognition*, not danger. |
| **S6 — behind the lockers** | `K_BREAK` | Player opens Renata's locker (code 0231) | Lights **stutter once**; in the stutter, the **Visitor is glimpsed crossing behind the lockers** — seen only if the player happens to face that way; gone instantly regardless. Vane: *"You're a long way from the bed, Eli."* | Lights restore. Locker contents (Mia's letter, Renata's warning, a note) are readable. Objective: *"Get to the observation booth."* |
| **S7 — the turn** (the loud one) | `I_OBSERVATION` | Player reads the tape wall, then the script turns them / they turn around | **Vane is standing right there, smiling.** A **half-second clean frame** (filter snaps to 0 — perfect clarity on his face and, in the glass, the Visitor) then snaps back. The single sharpest beat in the game. | Vane keeps talking, warm. **No chase yet.** A beat of stillness. Objective: *"Get out. Go down — not out."* |
| **S8 — finale apparition** | `O_COLDSTORAGE` → `P_SHIPPING` | Player crosses toward the dock during the get-out sequence | A **sheeted gurney's chest rises**; as the player looks away, the **Visitor is briefly between them and the door**, then gone on the next look; the cold-storage door **seals with the S1 clack** (the night rhymes). | The dock is ahead; dawn light past the roll-up. The ending resolves by profile (see §8 / Story §9). |

**That's the budget: 8 authored beats.** S1 is atmosphere; S2/S4/S5/S6/S8 are
unsettling; S3 and S7 are the two "real" jumpscares. Do **not** add roaming-monster
pressure between them. The silence between scares is the product.

### 2D. The Visitor's role, redefined

The Visitor is **a scripted apparition, not an AI opponent.** It is *spawned at a
known position, shown for a bounded time, and despawned* during S3, S6, S7 (in the
glass), and S8. It **never pathfinds toward the player, never has a `hunt` state,
never catches the player, and never ends the game by contact.** Its "only moves
when unobserved" gimmick is preserved **only as a staging trick inside S8** (it
appears to reposition between glances) — implemented as discrete teleports between
two authored anchor points, not continuous pursuit. Ambiguity (drug vs. haunting)
is preserved exactly as the story specifies; we just stop treating it like a Xenomorph.

---

## 3. THE CHORE / OBJECTIVE SCRIPT (ordered, ~25–35 min, FtF-paced)

> One objective on screen at a time (`setObjective`). Each step is a concrete
> mundane interaction tied to a canonical area ID. This is the playthrough spine.
> Times are soft targets for a first-timer. **Pacing law:** Movement 1 is allowed
> to be slow and quiet — *resist adding scares there.*

### MOVEMENT 1 — NORMAL (≈ 0:00–0:13)
1. **`A_VESTIBULE` / phone** — *"Read your phone."* Open phone (the verb is taught
   here). See Maya's texts, Mom, the landlord, the bank (−$43.18), the ad
   ($1,200/night). The whole motive in one screen. → *"Go inside."*
2. **`B_LOBBY`** — *"Check in at the reception desk."* Walk to Renata. Fish tank,
   muted infomercial, last-week magazines. She greets you (warm).
3. **`C_INTAKE`** — *"Read and sign the consent forms."* Pick up the clipboard;
   `openNote` the consent (page 4 readable; **whether you read it is logged** —
   Profiler). Sign at the X. *(Mundane paperwork as horror priming.)*
4. **`C_INTAKE`** — *"Change into the gown, then find Marcus in the exam room."*
   Renata hands you the gown and her too-eager goodbye. **NEW chore:** interact with
   the gown / a changing spot to "change" (a fade + line: *"You fold your clothes on
   the chair."*). This is peak FtF mundanity — do it.
5. **`A_VESTIBULE` (audio/event)** — **S1**: the door **clack**; her car pulls away.
   *"Find Marcus."*
6. **`D_HALL_NORTH`** — walk the corridor (rooms dark, Room 4's reader, a poster).
   No scare. Just the quiet of an empty clinic at night.
7. **`G_EXAM`** — *"Sit for the prep."* Meet Vane (warmth itself). **Chore: get
   wired up** — a short sequence where each sensor is "attached": gel, cap, chest
   belt, pulse-ox, the **IV**. Tactile, slow, friendly-wrong. Vane delivers the
   three rules (stay in bed / don't pull sensors — *the money is the leash* / press
   the call button). → *"Go to Room 3 and get in bed."*
8. **`E_ROOM3`** — *"Lie down and rest. (Look at the bed, press E.)"* Vane's room-
   speaker: *"Lights down, Eli. Just sleep naturally."* Lights dim. A breath-guide
   sleep transition (fade). The only warmth in the game: a brief **home dream**
   (warm kitchen, Maya's laugh), edges very slightly fraying. Let it play. *(Plant
   it to break it later.)*

### MOVEMENT 2 — WRONG (≈ 0:13–0:32)
9. **`E_ROOM3`** — **S2** (the wrong wake): clock jumped, call button on floor, door
   ajar. → *"Get your bearings."*
10. **`E_ROOM3` / phone** — **S3 setup**: a new Maya text appears *as you watch*,
    no buzz, timestamp **3:33** though the clock barely reads 2 (the timestamp
    horror begins). → then **S3 (paralysis)** fires. → *"Get up. Find a way out."*
11. **`D_HALL_NORTH`** — *"Look around. Find the staff keycard."* The hall door is
    ajar (it wasn't). Vane's speaker follows you room to room, answering things you
    didn't ask. (No monster — *voice* is the pressure.)
12. **`F_BATHROOM`** — *"See what's here."* **S4 (reflection)** + read the **NIGHT
    LOG**.
13. **`E_ROOM1` / `E_ROOM2`** — *"Search the empty rooms."* Discharge note (residue
    of a prior subject); a child's drawing taped under the bed frame.
14. **`E_ROOM4`** — **S5 (the long subject)**, looked at through the crack. *"Find
    the keycard."*
15. **`G_EXAM`** — *"Take the staff keycard."* (drawer). The phone lights with new
    "Maya" texts **while it sits in your hand and never buzzes.** The comfort is now
    the threat.
16. **`H_SLEEPLAB`** (keycard) — *"Understand the machine."* The polysomnograph that
    scores fear; **your** waveform among the printouts, a column labeled YIELD. Read
    the scoring clipboard. *(Clinical half of the reveal.)*
17. **`E_ROOM5` / `J_RECORDS`** — *"Read the files."* Discharge-as-repeat-business;
    Mia Okafor's file; the billing ledger ("payouts are marketing"); the buyer's
    standing order; **tonight's intake — yours — already stamped** "runner-likely."
18. **`K_BREAK`** — *"Open Renata's locker."* Get the code (0231) from the
    whiteboard; **S6 (behind the lockers)**; read Mia's unsent letter + Renata's
    warning (**go DOWN, not out**). → *"Get to the observation booth."*

### MOVEMENT 3 — GUT PUNCH (≈ 0:32–end)
19. **`I_OBSERVATION`** (back route, keycard) — *"Look. Understand."* The monitors,
    the IR feed of your **own empty bed (CAM 3)**, the dials for lights/audio/door,
    the **wall of tapes** with **MERCER, E. — TONIGHT — ● REC** already labeled. →
    **S7 (the turn)**: Vane behind you, the clean frame. → *"Get out. Go down — not
    out."*
20. **`I_OBSERVATION` → `L_HALL_SOUTH` → `M_STAIR`** — **the one scripted run.** A
    short, **timer-free, pressure-forward** get-out: Vane narrates you over every
    speaker; the basement door is the only non-looping way. **No stamina, no AI
    chase** — the pressure is audio + a couple of scripted slams. Descend.
21. **`N_BOILER`** — *"Find the way to the dock."* Why the building is warm; grab the
    **basement/cold key** off the hook.
22. **`O_COLDSTORAGE`** — *"Get through to Shipping."* The master tapes; the
    sheeted, occupied gurneys; Mia's "see cold" pays off. **S8 (finale apparition)**
    + the sealing **clack**.
23. **`P_SHIPPING`** — *"Open the dock door and leave."* The manifest, the buyer's
    logo, the roll-up, dawn behind it. → **the ending resolves by your behavior**
    (Discharged / Incomplete / Retained — Story §9), then the **Fear Profile
    end-card** prints with the real date/time. **The end-card is the monster.**

> **Total interactions ≈ 22 ordered beats** across ~24 areas, ~25–35 min,
> back-loaded for scares and front-loaded for mundanity. That curve *is* FtF.

---

## 4. MINIMAL HUD SPEC

**Keep exactly four HUD elements. Delete the rest.**

| Keep | Element | Notes |
|---|---|---|
| ✅ | **Interact prompt** (`#prompt`, the `E` chip + label) | Core. Keep the crosshair `#cross` dot + its `.act` scale-up on hover. |
| ✅ | **Subtitle / dialogue** (`#sub`, with `.spk` speaker tag) | Core. One idea per line; fits the band. |
| ✅ | **Single objective line** (`#obj` / `#objt`) | Keep, but show **only the current objective** (no growing list on screen; the journal is fine as a TAB-style aside if retained). |
| ✅ | **The phone** (`#phone` overlay, `phoneMsg`/`renderPhone`) | Core FtF. See §5. |
| ❌ | **`#bars`** (FLASHLIGHT / STAMINA / COMPOSURE) | **DELETE the whole block** from DOM + CSS + `tick()` updates. |
| ❌ | **`#inv`** battery/key inventory line | Simplify: keys can be acknowledged via a one-line subtitle ("Picked up: staff keycard"). No persistent battery counter. A minimal key list is acceptable but **no battery count**. |
| ❌ | **`#blood`** (proximity blood-vignette) | Delete (it was sanity/Visitor driven). |
| ⚠️ | **`#vig`** (vignette) | Keep a **static, gentle** vignette for mood, but **stop driving it from `P.san`.** Constant, subtle. |
| ⚠️ | **`#dmg`** (red damage flash) | Remove from the "caught" path (no caught). May reuse as a one-frame snap inside S3/S7 if desired. |
| ✅ | **`#scan` / VHS** | Keep. Found-footage texture is core. Drive `uDeg` from **`STORY.deg` (story escalation) only**, not sanity. |

**Net HUD = crosshair + interact prompt + subtitle + objective + phone.** Nothing
on screen quantifies the player's body or mind. That is the FtF look.

---

## 5. PHONE / TEXTING DESIGN (the FtF charm) + how mundane realism carries Act I

The phone is **the emotional anchor and the meanest instrument in the game**, and
it is the clearest single signal that this is a Fears-to-Fathom game. We already
have `#phone`, `phoneMsg(who, txt, time)`, and `renderPhone()` — **expand them.**

### 5A. Make it feel like a phone
- A status bar (time, battery %, signal). The displayed **time and battery are
  diegetic props, not mechanics** — the battery "draining" to 4% in Movement 3 is a
  *scripted story beat* (your only light is dying), **not** a resource you manage.
- Messages render as chat bubbles (have this). Add **delivery ticks, a typing
  "…" indicator** that appears before a "them" message lands, and a soft
  notification chime — *which is then withheld* in Movement 2 (texts arrive with
  **no buzz**; that wrongness is the point).
- TAB opens/closes; it pauses movement and frees the mouse (already wired).

### 5B. The three-movement thread (from Story §6 — implement verbatim in spirit)
- **Movement 1 — mundane & warm** (before/at arrival): the rent, "be safe," "love
  you," "go to bed it's late." Real, warm, human. *This is the bait.*
- **Movement 2 — wrong** (after the 3:33 wake): timestamps stop lining up; "them"
  messages all read **3:33**; replies arrive Eli "never sent"; the thread **folds
  back on itself.** *"You didn't hear it buzz."*
- **Movement 3 — the quiet, mean realization** (battery at 4%): *"the Maya you've
  been talking to went to bed at 10:01. Everything after that was me. You wanted it
  to be her so you didn't check. We logged that."* Then a call from **your own
  number**; if answered, your own recorded voice: *"…stay in the bed for me."*

### 5C. The Profiler hook (kept)
Log **how many times the player opens/answers the phone after Movement 1 ended**,
and **whether they ever notice a timestamp**. Surface both on the end-card:
*"Subject sought reassurance N times after the contact stopped responding."* and,
if no timestamp was checked, *"Subject did not verify. Subject needed it to be true."*

### 5D. How mundane realism carries the first third
Movement 1 has **no monster and (at most) one soft beat (S1, a sound).** It is
carried entirely by **texture and chores**: reading a phone that knows your life,
signing a boring form, *changing into a gown*, letting a kind man tape sensors to
your chest, lying down because you need $1,200. The dread is *situational* — you've
agreed to be watched, sedated-adjacent, and alone. If the implementer is tempted to
"add something scary" to Act I, the correct move is to make the *ordinary* more
specific (the gel is cold; the cap pinches; Renata can't quite meet your eye), not
to add a scare. **The airtight mundanity is what makes Movement 2 detonate.**

---

## 6. CONVERTING THE EXISTING SYSTEMS (delete / keep / add — implementer-ready)

### 6A. DELETE (rip out)
1. **Flashlight/battery economy.**
   - In `P`: remove `flashOn`, `batt`. Remove the `KeyF` handler. Remove battery
     drain in `updatePlayer` (the `if(P.flashOn){P.batt=…}` block).
   - Remove battery `addItem`s (`E_ROOM5` line ~542; `placeNight` break-room line
     ~972). Remove `INV.batteries`, the `▮ Batteries ×` line in `updateInv`.
   - **Lighting replacement:** the camera-mounted spotlight (`flashlight` in
     `initThree`) may stay as a **soft, always-on personal light** (so the player is
     never in pure black) — but it is **not toggled and not fueled.** Better: reduce
     it and lean on the existing `ceilLight` fixtures + the personal `fill`
     PointLight already on the camera. Light is **environmental**, set by rooms and
     by story (lights die northward as escalation).
2. **Stamina + sprint.**
   - In `P`: remove `stam`, `run`. In `updatePlayer`, delete the `running`
     branch and all `P.stam` math; movement is a **single walk speed** (keep `speed`
     ≈ 2.7, maybe a touch higher for comfort). Remove the `ShiftLeft` run check.
   - Keep `KeyC` crouch **only** if a scripted beat needs a low pose; otherwise
     remove crouch too (FtF doesn't crouch-sneak). Default: **remove crouch.**
3. **Sanity / composure.**
   - In `P`: remove `san`. Delete the sanity drain block in `updatePlayer`
     (`const lit=…; const near=visitorDread(); P.san=…`) and the sanity-driven
     `#vig` / `#blood` writes. Delete `COMPOSURE` from `#bars`.
4. **Hide-from-stalker.**
   - Remove `WORLD.hideSpots` population's *gameplay* (the `for(const hs of
     WORLD.hideSpots)` hover/interact block in `updatePlayer`), `enterHide`,
     `exitHide`, `P.hiding`, `P.hideSpot`, `PROFILER.hid` usage as a verb. The
     physical furniture stays as decoration; you just can't "hide" in it.
     - *(End-card field "TIME HIDDEN" → repurpose or drop; suggest dropping.)*
5. **The roaming Visitor AI + caught-death.**
   - Gut `updateVisitor` of pursuit: remove the "moves when unobserved → toward
     player," the `hunt` speed-up, and the `if(d<1.0) onCaught()` kill. Remove
     `VIS.state` transitions to `roam`/`hunt`. Remove `onCaught()` entirely (and the
     `'retained'` ending via capture — Retained becomes a **behavior** outcome, per
     Story §9).
   - Remove `visitorDread()` as a continuous driver of heartbeat/vig/VHS. Heartbeat
     becomes **scripted** (ramped during S3 and the Movement-3 sequence only).
6. **The three `#bars`** in HTML (`#fillFlash`, `#fillStam`, `#fillSan`) and their
   per-frame writes in `tick()`.

### 6B. KEEP (already right or close)
- The whole **world build** (`buildClinic`, all area IDs, props, doors, lights).
- **Doors + keys** (`addDoor`, `keyNeed`, `giveKey`, staff keycard, basement key) —
  this is FtF-appropriate light gating. Keep `d_obs`, `d_lab`, `d_stair`, etc.
- **Documents** (`openNote`) and the **phone** (`phoneMsg`) — core.
- **Objectives** (`setObjective`) — but show one at a time (§4).
- **VHS shader** (`VHS_SHADER`, `vhsPass`) — drive `uDeg` from `STORY.deg` only.
- **Characters** (`buildHuman`, Renata, Vane, the long subject, the Visitor *rig*) —
  keep the models; change *how the Visitor is used.*
- **Fade/teleport** (`fade`, the `M_STAIR` descend trigger) — keep.
- **The Fear Profile end-card** (`showReport`) — keep and **expand** to the full
  Story §9 field set (remove battery/hide-flavored fields; add reassurance-seeking,
  timestamp-checked, disclosure-read, primary fear response, disposition).
- **Triggers** (`trigger`, `checkTriggers`) — this is our scripting backbone; the
  new scares are all built on it.

### 6C. ADD (new for FtF)
1. **A scripted-event system for the 8 scares (§2C).** Each = a `trigger(...)` (or
   an interaction callback) that: spawns/positions the Visitor rig (or fires the
   reflection/door/clack effect), runs for a bounded time, then **despawns and
   restores calm** (lights up, heartbeat idle, new objective). Reuse `fade`,
   `say`, `setObjective`, `SOUND`.
2. **Mundane chore interactions:** "change into the gown" (fade + line), the
   step-by-step **wiring sequence** in `G_EXAM` (each sensor a small interact or a
   timed line), the consent **sign** action. These are new `addItem`/trigger beats.
3. **Phone upgrades (§5):** typing indicator, delivery ticks, diegetic battery/time
   display, the call-from-your-own-number beat, the folding-timestamp Movement 2/3
   content (port Story §6 verbatim in spirit).
4. **Story-driven light/atmosphere ramp:** lights die northward per act (set
   `rec.on=0` on northmost fixtures at the right beats); `STORY.deg` steps:
   0.32 → 0.45 (S2) → 0.62 (S3) → ~0.85 (`O_COLDSTORAGE`), with the **clean frame**
   (`uDeg`→0 for ~0.4 s) at **S7**.
5. **The one scripted run (step 20):** a pressure sequence that is audio + scripted
   slams + a clear forward path. No stamina, no AI. If a "don't dawdle" feel is
   wanted, use a soft scripted catch-up (a fade-to-Incomplete) **only** if the
   player stops for a very long time — not a chaser.
6. **Behavior-driven ending selection** (Story §9): Discharged (resist + reach the
   dock), Incomplete (panic/break — e.g., tore sensors early, or stalls out in the
   run), Retained (perfect compliance / never resisted). Wire from the Profiler
   fields that survive the deletions.

---

## 7. "FEELS-LIKE-FTF" CHECKLIST (test against this before shipping)

Tick every box. Any unchecked box is a bug against this direction.

- [ ] **No bars/meters on screen.** No flashlight, stamina, or sanity/composure UI.
- [ ] **No managed flashlight/battery.** Light is environmental + scripted; nothing
      drains.
- [ ] **No sprint, no stamina gate.** One walking speed. (One scripted run, no meter.)
- [ ] **No hide-in-locker mechanic.** You cannot "enter" a hide spot.
- [ ] **The Visitor never hunts you.** It only appears in S3/S6/S7/S8 as a scripted
      apparition; it never pathfinds toward you or catches you; there is **no
      death-by-monster** fail state.
- [ ] **The first ~12 minutes are mundane** — check in, sign, change, get wired, lie
      down — with **at most one soft scare (S1)** and **no monster.**
- [ ] **There are 5–8 scripted scares**, each with a precise trigger and a
      **deliberate reset to calm + a new objective** afterward.
- [ ] **At most two scares are "loud."** The rest are quiet/unsettling. The loudest
      is the Vane turn (S7).
- [ ] **The phone feels like a phone** and carries real emotional weight; the
      **timestamp horror** is implemented and is quiet, not a jump-scare.
- [ ] **Dread comes from normalcy curdling** (warm-but-wrong Vane, the ajar door,
      the warm coffee, the folding texts), not from a chase.
- [ ] **The VHS filter degrades by story progress**, not by sanity, with one clean
      frame at the turn.
- [ ] **The threat is grounded** (Vane / the operation / the paperwork). The
      supernatural stays **ambiguous** and **rare**.
- [ ] **One objective at a time**, always concrete and mundane in phrasing
      ("Read and sign the consent," not "Survive the night").
- [ ] **The ending is chosen by behavior**, not by being caught, and the
      **Fear Profile end-card** prints with the real date/time and is *accurate
      about the player.*
- [ ] **A first-time player is never confused about what to do next** (FtF is
      legible) and is **never asked to out-play a monster** (FtF is not a chase).

---

## 8. SUMMARY FOR THE TEAM (what changes, in one screen)

**DELETE:** flashlight + battery economy · stamina + sprint · sanity/composure +
the three `#bars` · hide-in-locker loop (`hideSpots`/`enterHide`) · the roaming
Visitor AI + `onCaught` death · `visitorDread`-driven heartbeat/vignette/VHS.

**NEW CORE LOOP:** first-person *chore-and-investigate* — get a simple objective →
walk → do a mundane interaction (read/sign/change/lie down/open/look) → the world
shifts wrong → read phone/docs → next objective. Mundane → wrong → gut punch. The
phone (with the timestamp horror) carries the first third. Threat is **Vane / the
operation**; the **Visitor is a scripted apparition only.**

**THE 8 SCARES (all scripted, each resets to calm):**
S1 vestibule door-clack (Renata leaves) · S2 the wrong wake in Room 3 · S3 sleep
paralysis (Visitor at foot of bed, eyes-only) · S4 bathroom mirror reflection ·
S5 the long subject's head turns (Room 4 crack) · S6 Visitor glimpsed behind the
break-room lockers · **S7 the Vane turn in Observation (the loud one, clean frame)**
· S8 cold-storage finale apparition + the sealing clack.

**CHORE ORDER (canonical IDs):** phone (`A_VESTIBULE`) → check in (`B_LOBBY`) → sign
consent (`C_INTAKE`) → change into gown (`C_INTAKE`) → S1 → walk hall
(`D_HALL_NORTH`) → get wired + three rules (`G_EXAM`) → lie down + home dream
(`E_ROOM3`) → **S2** → phone/3:33 → **S3** → explore + Vane's voice
(`D_HALL_NORTH`) → **S4** + Night Log (`F_BATHROOM`) → search empties
(`E_ROOM1/2`) → **S5** (`E_ROOM4`) → keycard (`G_EXAM`) → the machine
(`H_SLEEPLAB`) → the files (`J_RECORDS`) → locker code + **S6** (`K_BREAK`) →
booth + tape wall + **S7** (`I_OBSERVATION`) → **the one scripted run** →
basement key (`N_BOILER`) → **S8** (`O_COLDSTORAGE`) → dock + ending + Fear
Profile end-card (`P_SHIPPING`).

**HUD:** crosshair + interact prompt + subtitle + one objective line + phone.
Nothing else.

*Build the quiet. The scares are the punctuation, not the sentence.*

— Lead Designer (subagent 4)

*End of 10_FTF_DIRECTION.md*
