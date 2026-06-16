# 08 — STORY + SCRIPT (45-MINUTE PLAYTHROUGH) ⭐
### *Small Hours — The Ashgrove Study*

> **FULL SPOILERS.** This is the complete plot, script, document library, phone
> thread, scare scripting, key/objective gating, endings, and end-card.
>
> **Implementation contract:** every beat below is tagged with a **CANONICAL AREA
> ID** matching the level-design build (`A_VESTIBULE` … `P_SHIPPING`). A parallel
> level agent is constructing geometry to those exact IDs. Reference them precisely.
> This document expands and deepens [`02_STORY.md`](02_STORY.md), [`04_THE_SURPRISE.md`](04_THE_SURPRISE.md),
> and [`06_PACING_THE_HOUR.md`](06_PACING_THE_HOUR.md) for a tighter ~45-minute cut. Where they conflict,
> this doc is canon **for the 45-minute build only.**

---

## CANONICAL AREA MAP (quick reference)

| ID | Area | Role in the night |
|---|---|---|
| `A_VESTIBULE` | Entry airlock / double doors | First & last threshold. The lock you'll remember. |
| `B_LOBBY` | Waiting room | Fish tank, infomercial, the last normal place. |
| `C_INTAKE` | Reception / intake desk | Renata. The consent form. Page 4. |
| `D_HALL_NORTH` | North patient corridor | Spine connecting lobby → rooms. Rooms 1–3. |
| `E_ROOM1` | Patient room 1 | Empty. A prior subject's residue. |
| `E_ROOM2` | Patient room 2 | Empty. Child's drawing. |
| `E_ROOM3` | Patient room — **YOURS** | Bed, harness, one-way mirror, REC dot. |
| `E_ROOM4` | Patient room — **THE LONG SUBJECT** | Locked from outside. 19 days under. |
| `E_ROOM5` | Patient room 5 | Recently "discharged." Adhesive rash on the sheets. |
| `E_ROOM6` | Patient room 6 | Storage now. Stacked gurneys, a smell. |
| `F_BATHROOM` | Shared washroom | Mirror. The first time you don't recognize the reflection. |
| `G_EXAM` | Exam / prep room | Where they wire you. IV. Staff keycard. |
| `H_SLEEPLAB` | Sleep lab core | Polysomnograph bay. The machine that scores fear. |
| `I_OBSERVATION` | Observation booth | Behind the glass. Vane's chair. The reveal. |
| `J_RECORDS` | Records / archive | Billing, incident reports, prior-subject files. |
| `K_BREAK` | Staff break room | Renata's locker. Her warning. A battery. |
| `L_HALL_SOUTH` | South service corridor | Behind the public clinic. Leads down. |
| `M_STAIR` | Stairwell | The descent. Real-clock countdown lives here. |
| `N_BOILER` | Boiler / mechanical | Why the building is warm. The maintenance memo. |
| `O_COLDSTORAGE` | Cold storage | Where the tapes live. And what else they keep cold. |
| `P_SHIPPING` | Shipping / loading dock | The manifest, the crate, the buyer's logo. The way out. |

---

## 1. LOGLINE & THEMES

**Logline.** Eli Mercer is twenty, two jobs short of rent, and forty-three dollars
in the red, so when an ad promises $1,200 for one night of sleep at the Ashgrove
Sleep Center, he signs the form he doesn't read and lies down in Room 3. Over the
small hours, the kind night technician on the other side of the glass slowly,
warmly, professionally turns Eli's fear into a product — and somewhere past three
in the morning, the part of the night that even the technician no longer controls
sits down at the foot of the bed.

**Themes.**
- **Desperation signs what it doesn't read.** Poverty is the trap; consent is the
  cover; *page 4* is the whole crime, and it's boring on purpose.
- **Being watched at your most defenseless.** The horror is institutional, not
  monstrous. A monster wants to hurt you. An *operation* has decided your terror is
  inventory and pays you for it.
- **The comfort you need vs. the comfort that's real.** The phone is the wound: you
  wanted your sister to be on the other end so badly you stopped checking whether
  she was.
- **Ambiguity as mercy and as cruelty.** Maybe the Visitor is the drug. Maybe the
  building summons what it sells. The game never says. The human evil is concrete;
  the rest is the cold spot you can't explain on the drive home.
- **Complicity.** Vane isn't a demon. He's a man who told himself the money was
  worth it — exactly the way you signed a form you didn't read. The night quietly
  asks if you're so different.

---

## 2. CHARACTER BIOS

### ELI MERCER — 20 — *you*
Community-college dropout-in-progress; two part-time jobs that don't cover one
room; bank balance **−$43.18**. Raises (and is raised by) his younger sister Maya
since their mom's hours got cut. Decent, exhausted, out of options. Bitten nails.
**You never see his face except in reflections** — and that matters (see *The
Surprise*, Layer 3). He is not brave. He is tired, and he needs the money, and
that is enough to keep him in the bed long past when he should have run.

### RENATA ORTIZ — Intake Coordinator — *the last normal human*
Late thirties, warm, overworked, sneakers under the scrubs. Genuinely kind in a
way that reads instantly real — which is why it lands when she leaves at 11:00 PM
and the door locks behind her. She is **not** in on the worst of it; she tells
herself it's a sleep lab because the alternative is unthinkable and the job is
steady. Late in the night you find evidence she's tried, in small cowardly ways,
to warn people: a sticky note she didn't dare make legible; a locker she keeps
packed to leave. Her tell-line — *"You're in good hands with Marcus"* — is the
thing she says to make it true.

### MARCUS VANE — Night Technician — *warm but wrong*
The only staff overnight. Patient, attentive, calls you "champ" and "Eli" in equal
measure. He has run the protocol so many times it's muscle memory; he can predict
the night to the minute because he's *steering* it. The warmth is real-seeming for
exactly as long as it needs to be. He is the **director**: he nudges the lights,
plays the sounds, opens a door, lets the Visitor in, and keeps the camera rolling.
He is not surprised when you get out, because **the ones who run make the best
tape.** His register is the engine of the whole game: never raises his voice, never
threatens, answers questions you didn't ask, and treats your terror as *good work.*

### THE LONG SUBJECT — *Room 4* — (canon name: **DANIEL ASH**, "DAN A.")
Checked in for one night, nineteen days ago. Still under. Beard grown in, eyes
open, vitals holding. He is proof of what this is, and a preview of one of your
endings. The clinic rotates his gel to keep him from building tolerance, because
the longer he's afraid the better the take. He does not look at you. He has been
here a long time. (The name **ASH** — Ashgrove — is a quiet, deniable joke the
operation finds funny. See `J_RECORDS`.)

### THE VISITOR — *the thing at the foot of the bed*
Unexplained by design. A tall, pallid, dilated-eyed figure that **only moves when
unobserved**. It appears first in paralysis, then stalks. Vane's notes treat it as
weather — something that "comes on its own now, when the fear runs high enough,"
in a building that's done this too many times. He stopped asking what it is. He
just keeps recording, **because that footage sells best.** The game offers three
readings (drug-induced hypnagogia / a thing the building summons / both) and
commits to none.

### MIRIAM "MIA" OKAFOR — *prior subject, voice in the documents only* (invented)
Subject #2231, three weeks before you. A nursing student who needed tuition money,
read more than she should have, and tried to leave. Her file is in `J_RECORDS`; her
letter — written to a brother she clearly never sent it to — is hidden in `K_BREAK`
inside Renata's locker. She is the **smart one who still didn't get out**, which is
scarier than a victim who never had a chance. Disposition on her file: redacted,
then "RETAINED," then a second line in different ink: *"reassigned — see cold."*

### THE VENDOR / THE BUYER — *unseen* (invented, kept faceless on purpose)
Never named. Present only as: a logo stamped on the shipping crate in `P_SHIPPING`
(a simple circle bisected by a line — the "open eye" the operation uses internally),
a "buyer reference withheld" line on every manifest, a standing purchase order that
prices *fear-response* sessions at 3× and flags "runners," and a single billing
line: **"PER STANDING ORDER — DELIVER ON COMPLETION."** The worst answer is the one
the player supplies. (`P_SHIPPING`, `J_RECORDS`.)

---

## 3. ACT STRUCTURE & MINUTE-BY-MINUTE BEAT SHEET (~45 MIN)

**Eight acts.** The night is organized as **sleep cycles**, alternating *awake-in-
the-clinic* (🟦) and *under* (dream / paralysis, 🟪) so the player can never trust
their footing. Emotional arc: **mundane → unease → dread → terror → gut punch.**

**Pacing law (enforced after the midpoint, ~0:22):** *never two quiet beats in a
row.* Every calm moment is immediately undercut. Tags: 🔋 phone · 🩺 EEG/dread ·
🎬 filter-escalation · ⭐ Profiler/Surprise beat · 👁 Visitor beat.

Times are target windows for a first-time player. **The real system clock is
canon** (see §7): the in-world clock reads real time once you're under; the worst
beats are scheduled relative to the player's actual 3 AM where possible.

---

### ACT I — ARRIVAL (0:00–0:05) · *the most normal you'll feel all night*
**Arc: mundane.**

| Time | Area | Beat | Objective | Emotional turn |
|---|---|---|---|---|
| 0:00 | `A_VESTIBULE` | Title over a black strip-mall lot, 10:38 PM, the buzzing **ASHGROVE SLEEP CENTER** sign. You walk from your car to the doors. | *Go inside.* | Tired calm. |
| 0:01 | `A_VESTIBULE` | 🔋 Phone buzzes in hand: Maya "did you GET it??", Mom "drive safe baby", landlord "rent was due the 1st", bank app **−$43.18**, the ad screenshot ($1,200/one night). | *Read your phone (TAB).* | The whole motivation in one glance. |
| 0:02 | `B_LOBBY` | Inside: warm light, a fish tank, a muted infomercial, two chairs, last week's magazines. Renata at the desk. | *Check in at reception.* | Relief. It's just a clinic. |
| 0:03 | `C_INTAKE` | Renata checks you in (script §4.1). Hands you the clipboard. **Page 4 is readable; whether you read it is logged.** | *Read & sign the consent.* ⭐ | Friendly. A little too easy. |
| 0:05 | `C_INTAKE` | Renata gives you the paper gown, points you down the hall. "Marcus runs the nights. You're in good hands with Marcus." She gathers her bag — *she's leaving.* | *Change, then go to Exam.* | The first faint wrong note: she can't wait to go. |

---

### ACT II — INTAKE & WIRING (0:05–0:12) · *trust, established to be betrayed*
**Arc: mundane → first unease.**

| Time | Area | Beat | Objective | Emotional turn |
|---|---|---|---|---|
| 0:06 | `B_LOBBY`→`A_VESTIBULE` | 🩺 Renata leaves. The **vestibule doors lock** behind her — a heavy magnetic *clack* you'll hear again at the end. Through the glass, her car pulls away. | *Find Marcus (Exam room).* | The last normal human is gone. |
| 0:07 | `D_HALL_NORTH` | Walk the patient corridor. Rooms 1–3 on the right; 4–6 left. All dark. Room 4's door has a card-reader and a faint shifting sound. A poster: *"SLEEP IS THE BEST MEDICINE."* | *Reach the Exam room.* | Quiet. Too quiet for a clinic at night. |
| 0:08 | `G_EXAM` | Meet **Vane**. Warmth itself (script §4.2). The "any history of nightmares? ever feel someone's in the room when you wake?" small-talk that's really intake. | *Sit for prep.* | Disarmed. He's nice. |
| 0:10 | `G_EXAM` | He wires you: cold gel, the cap, chest belt, pulse-ox, and the **IV "to keep you hydrated."** Lavish prop tactility; the player physically lets each one be attached. | *Let him finish the prep.* | Tactile dread under the friendliness. |
| 0:11 | `G_EXAM` | 🩺 The **three rules**, delivered kindly (script §4.3): stay in the bed / don't remove the sensors ("we can't pay out an incomplete session" — *the money is the leash*) / press the call button, "I'm right behind that glass all night." | *Go to Room 3.* | The kindness becomes a fence. |
| 0:12 | `D_HALL_NORTH` | You walk yourself to Room 3, trailing nothing yet — but you've agreed to be watched doing the one thing that requires not being watched. | *Get in bed.* | The trap clicks shut, gently. |

---

### ACT III — FIRST SLEEP (0:12–0:20) · *the fuse*
**Arc: unease. Teach safe, so it's worse later.**

| Time | Area | Beat | Objective | Emotional turn |
|---|---|---|---|---|
| 0:13 | `E_ROOM3` | The room: bed, bedside EEG monitor, the **one-way mirror**, a **red REC dot** in the corner. Vane's voice on the room speaker, gentle: "Lights down, Eli. Just sleep naturally." Lights dim. | *Lie down (look at bed, E).* | Resignation. Easy money. |
| 0:14 | `E_ROOM3` | 🟪 **First breathe-to-sleep.** Tutorialized by the on-screen breath guide. You go under. | *Breathe and sleep.* | Surrender. |
| 0:15 | `E_ROOM3`(dream) | 🟪 **First dream — home.** Warm kitchen light, Maya's laugh from the next room, the apartment. ~90s, almost safe, edges very slightly fraying (a humming fridge that's *too* loud, a door that won't quite open). | *(none — let it play)* | The only warmth in the game. Plant it to break it. |
| 0:17 | `E_ROOM3` | 🟦 🩺 **Wet inhale. Cold blue.** You wake. The bedside clock has **jumped** (now reads real-time-ish, ~1:50). The call button is **on the floor**. The bathroom door across the hall is open. A spike on the glass that wasn't your heart. | *Get your bearings.* | First real wrongness. |
| 0:19 | `E_ROOM3` | 🔋 🎬 Maya texts **"you up?"** — send time reads **3:33**, though the clock barely says 2, and **you never felt the buzz.** Grain ticks up. | *Check the phone (TAB). Did you check the timestamp?* ⭐ | The floor tilts. |

---

### ACT IV — THE NIGHT TURNS (0:20–0:28) · *the rules start to cost*
**Arc: unease → dread. Midpoint — pacing law now in force.**

| Time | Area | Beat | Objective | Emotional turn |
|---|---|---|---|---|
| 0:20 | `E_ROOM3` | 🟪 👁 **First sleep paralysis (eyes-only).** You wake unable to move; **the Visitor stands at the foot of the bed.** You can only move the camera (your eyes). Endure ~10s. ⭐ *What you look at is logged.* | *Endure. (Eyes only.)* | Pure helplessness. |
| 0:21 | `E_ROOM3` | 🟦 You can move. **The room isn't quite the room** (a chair turned, the mirror closer, the REC dot brighter). The call button does nothing. | *Find a way out of the room.* | Dread settles in to stay. |
| 0:22 | `D_HALL_NORTH` | 🩺 You step into the hall (the door is now ajar; it wasn't). Vane's speaker-voice follows you room to room, still kind, **answering things you didn't ask** (script §4.4). | *Explore. Find the keycard.* | Watched everywhere. |
| 0:23 | `F_BATHROOM` | 🎬 The bathroom **mirror up close**: for half a second the reflection's eyes are open when yours are shut — the first time you don't quite recognize yourself. **NIGHT LOG** doc here (Doc 03). | *Read what's here.* | Self becomes unreliable. |
| 0:24 | `E_ROOM1` / `E_ROOM2` | The adjacent rooms are unlocked and empty. `E_ROOM1`: a prior subject's residue (Doc 06). `E_ROOM2`: a **child's drawing** taped under the bed frame (Doc 07). | *Search the rooms.* | The clinic has a history. |
| 0:25 | `E_ROOM4` | 👁 **The Long Subject.** Through the crack in the door: a man in the bed, beard grown in, eyes open, not looking at you. Vane's voice: "Don't mind four. He's a long-term guest." | *Look (don't look too long).* | Recognition: *this is what they do.* |
| 0:26 | `G_EXAM` | 🔋 ⭐ Back near Exam, the **phone lights with new "Maya" texts while it sits in your hand and never buzzes.** The keycard is in the exam drawer. | *Take the staff keycard.* | The comfort is now the threat. |
| 0:27 | `D_HALL_NORTH` | The **first door you try locks — from the outside.** The trap is named aloud. 🎬 Filter degrades (tracking tears begin). | *Use the keycard. Find another way.* | The walls close. |

---

### ACT V — DEEPER IN (0:28–0:35) · *the clinic's real shape*
**Arc: dread. The public clinic peels back to the operation.**

| Time | Area | Beat | Objective | Emotional turn |
|---|---|---|---|---|
| 0:28 | `H_SLEEPLAB` | Keycard opens the **sleep lab core**: a polysomnograph bay, racks of gel cartridges, a wall of waveform printouts — yours among them, **scored by the minute** (Doc 10). The machine isn't measuring health. | *Understand the machine.* | The "study" is a meat-grinder. |
| 0:29 | `H_SLEEPLAB` | 🩺 👁 A printout still feeding: your fear graphed live, a column labeled **"YIELD."** A sound from the vent. The Visitor is moving when you're not looking. | *Keep moving toward Observation.* | You are the product on the page. |
| 0:30 | `E_ROOM5` | A room recently "discharged": stripped bed, a fresh **adhesive rash pattern** on the sheet, a discharge slip (Doc 11) — *paid, sent home, "returning customer likely."* | *Search.* | "Discharged" isn't safe; it's repeat business. |
| 0:31 | `J_RECORDS` | The **archive**: filing cabinets, banker's boxes. Prior-subject files incl. **Mia Okafor** (Doc 12), the **billing ledger** (Doc 14), an **incident report** (Doc 16), the **buyer's standing order** (Doc 15). | *Read the files. Find the booth key/route.* | The scale of it. Years of this. |
| 0:32 | `J_RECORDS` | ⭐ Among the files: **tonight's intake — yours — already stamped** with a projected yield and the note "high; runner-likely; prioritize." They planned your fear before you arrived. | *(read)* | They were always ahead of you. |
| 0:33 | `K_BREAK` | The **staff break room**: a coffee pot still warm, a schedule, lockers. **Renata's locker** (needs her code from a doc) hides her packed bag, **Mia's unsent letter** (Doc 17), and **Renata's hidden warning** (Doc 18). A **spare battery** on the table. | *Open Renata's locker. Grab the battery.* | The one decent person knew, and stayed. |
| 0:34 | `K_BREAK` | 🩺 👁 Lights stutter. Vane's voice, closer, no longer pretending to read vitals: "You're a long way from the bed, Eli." The Visitor crosses behind the lockers (seen only if you turn). | *Get to the observation booth.* | He knows exactly where you are. |
| 0:35 | `I_OBSERVATION` (door) | The observation booth door — **STAFF ONLY**, red reader. Your keycard works *here* but the route in is through the back. | *Enter the booth.* | One door from the truth. |

---

### ACT VI — BEHIND THE GLASS (0:35–0:40) · *the reveal*
**Arc: dread → terror. The truth, assembled from props, then Vane.**

| Time | Area | Beat | Objective | Emotional turn |
|---|---|---|---|---|
| 0:36 | `I_OBSERVATION` | 👁 You cross into the booth and see it **from his side**: the monitors, the IR feed of **your own empty bed on CAM 3**, the clipboard scoring your fear minute by minute, the dials for *lights / audio / door.* | *Look. Understand.* | The vertigo of the other side. |
| 0:37 | `I_OBSERVATION` | The **wall of tapes** — names, dates — **DAN A. (Room 4)** among them, **MIA OKAFOR**, **ORTIZ, R.**, and one that shouldn't exist yet: **MERCER, E. — TONIGHT — ● REC**, already labeled, already partly recorded (Doc 19). | *Read the tape wall.* | You are already a finished product. |
| 0:38 | `I_OBSERVATION` | ⭐ 🎬 **Vane, behind you, smiling, not surprised at all** (script §4.5). "You weren't supposed to be up yet. But honestly? This is even better." A half-second **clean frame** — the filter drops, perfect clarity on his face, on the Visitor in the glass. | *(forced beat)* | The kindness was always a camera angle. |
| 0:39 | `I_OBSERVATION`→`L_HALL_SOUTH` | The chase that's really a **shoot** begins. Vane doesn't run — he *directs.* The basement door (to `M_STAIR`) is the only way that isn't a locked loop. | *Get out. Go down.* | Not hunted — *filmed.* |
| 0:40 | `L_HALL_SOUTH` | 👁 The Visitor is now active and hunting (moves when unobserved). Vane's voice on every speaker, narrating you like footage. | *Reach the stairwell.* | Terror, sustained. |

---

### ACT VII — THE DESCENT (0:40–0:44) · *what they keep cold*
**Arc: terror. The basement is where the product lives.**

| Time | Area | Beat | Objective | Emotional turn |
|---|---|---|---|---|
| 0:41 | `M_STAIR` | 🩺 The stairwell down. **Real-clock beat:** a wall clock reads the player's actual time; a hand-written sign on the landing — *"DELIVERIES 0500. DON'T BE LATE."* The temperature drops. | *Descend.* | Cold, literal and otherwise. |
| 0:41 | `N_BOILER` | The boiler room explains the building's wrongness: **it's kept warm on purpose** — for the long-term guests, and for the machines. **Maintenance memo** here (Doc 13). A shortcut through to cold storage. | *Find the way to the dock.* | The clinic as a body keeping things alive. |
| 0:42 | `O_COLDSTORAGE` | 👁 **Cold storage.** Shelves of master tapes, breath fogging, and — past them — **occupied gurneys under sheets**, IV stands still dripping. One sheet's chest rises. Mia's reassignment ("see cold") pays off here. | *Get through to Shipping.* | The worst room. Quiet. |
| 0:43 | `O_COLDSTORAGE` | 🎬 The Visitor is *between you and the door* the instant you look away, then gone when you look back — its cruelest stalk. Heartbeat audio peaks. | *Reach the dock. Don't get caught.* | Cornered with the inventory. |
| 0:44 | `O_COLDSTORAGE`→`P_SHIPPING` | You break for the loading dock. Behind you, the cold-storage door seals with the same magnetic *clack* as the vestibule at 0:06 — *the night rhymes.* | *Get out through Shipping.* | The exit is in sight. |

---

### ACT VIII — THE BILL COMES DUE (0:44–0:45+) · *the gut punch & branch*
**Arc: gut punch. The ending is chosen by behavior, not a menu.** (See §9.)

| Time | Area | Beat | Objective | Emotional turn |
|---|---|---|---|---|
| 0:44 | `P_SHIPPING` | The loading dock: a half-loaded truck, a stack of crates stamped with the **buyer's logo**, the **shipping manifest** (Doc 20) — *"14 sessions… PER STANDING ORDER — DELIVER ON COMPLETION."* The roll-up door, and dawn behind it. | *Open the dock door and leave.* | So close to morning. |
| 0:45 | `P_SHIPPING` / `A_VESTIBULE` | ⭐ **Branch resolves by profile** (Discharged / Incomplete / Retained). The finale dream, where used, is **assembled from your own behavior** (the room you lingered in, the thing you avoided, your fear style). | *(resolves)* | The cruelty is that it's earned. |
| 0:45+ | end-card | ⭐ **The Fear Profile end-card** prints — the clinical report that's right about *you* (§9). Real date/time stamped. REC dot blinks out. | *(read it)* | The printout *is the monster.* |

---

## 4. FULL DIALOGUE (every spoken moment)

> **Delivery note.** Vane never raises his voice and never threatens. He treats
> your fear as *good work.* Renata is warm and a half-beat too eager to leave.
> Lines marked *(speaker)* are subtitled; bracketed *(stage)* notes are for the
> implementer. Keep lines short enough to fit the subtitle band.

### 4.1 — RENATA, intake (`C_INTAKE`)
> **RENATA:** "Eli? There you are. Come on in, hon, you're my last one tonight."
>
> *(handing the clipboard)* "Okay — easiest twelve hundred bucks you'll ever make.
> You sleep, we watch the little squiggles, you wake up rich. People do it twice."
>
> *(beat, tapping the page)* "Page four's just the legal stuff. Sign at the X.
> Nobody reads it — I'd be here till Tuesday."
>
> *(if the player lingers on page 4)* "...You're reading it. That's — good. Most
> people don't." *(a flicker of something, then the smile back)* "It's standard."

> **RENATA** *(handing over the gown, gathering her bag):*
> "Bathroom's down the hall to change. Marcus runs the nights — he'll get you
> wired up and settled. He's done it a thousand times."
>
> *(at the door, almost out)* "You're in good hands with Marcus. ...Sleep tight,
> Eli." *(she's gone faster than the line is warm)*

### 4.2 — VANE, first meeting (`G_EXAM`)
> **MARCUS:** "Eli. Welcome. Sit, sit — you're doing great already, you showed up."
> *(small laugh)* "Half of 'em chicken out in the lot."
>
> *(applying the gel)* "This stuff's a little cold, sorry. Everybody says that.
> You'll forget it's there in ten minutes."
>
> *(conversational, watching you)* "So — quick history for the chart. You sleep
> okay, normally? Any nightmares? Ever wake up and feel like somebody's standing
> right where I am now?" *(beat, whatever you'd answer)* "...No? Huh."
> *(a warm, private smile)* "You might tonight. It's the study. Totally normal.
> Don't let it spook you."

### 4.3 — VANE, the rules (`G_EXAM` → `E_ROOM3`)
> **MARCUS** *(seating the IV, gentle):* "Little pinch. That's hydration — keeps
> your numbers clean all night. There we go."
>
> *(standing back, kind and clear)* "Three rules, then I'll leave you be.
> One: stay in the bed. Two: don't pull the sensors — I know they itch, but if the
> session's incomplete, accounting won't pay out, and I'd hate that for you."
>
> *(pointing at the red dot, then the mirror)* "Three: there's a call button right
> here. I'm behind that glass all night, watching your readings. Anything at all,
> you press it, I'm there."
>
> *(at the door, warm)* "That's it. Just sleep naturally, champ. Easy money."
> *(the door clicks)*

### 4.4 — VANE, on the room speaker (3 AM, `E_ROOM3` / `D_HALL_NORTH`)
> *(early, soothing)* **MARCUS:** "Heart rate's climbing a little, Eli. That's
> great, actually — you're doing really well. Stay in the bed for me."
>
> *(when you leave the bed)* "...Hey. You're up. That's okay. I see you on three."
>
> *(answering a question you didn't ask, kind)* "No, you didn't dream that. And no,
> the door's not stuck — it's locked. Different thing. Go on back to bed."
>
> *(re: Room 4, as you pass)* "Don't mind four. He's a long-term guest. He's very
> comfortable. You will be too."
>
> *(when you find the records)* "You're a curious one. The vendor *loves* the
> curious ones — they're awake for it." *(no malice at all)*

### 4.5 — VANE, the turn (`I_OBSERVATION`)
> **MARCUS** *(behind you, delighted, not surprised):*
> "There he is. You weren't supposed to be up yet, Eli."
>
> *(stepping closer, genuinely pleased)* "But honestly? This is better. So much
> better. The ones who stay in the bed give us a nice clean read. The ones who
> *run...*" *(he gestures at the wall of tapes like a proud teacher)* "...they give
> us the good tape. The kind with a buyer waiting."
>
> *(soft, almost tender)* "Don't stop on my account. You're doing beautifully.
> Just — try to stay in frame."

### 4.6 — VANE, during the chase/shoot (`L_HALL_SOUTH` / `M_STAIR` / `O_COLDSTORAGE`)
> *(on every speaker, calm, narrating)* "Subject is mobile. Pulse one-sixty.
> Pupils blown. ...Gorgeous."
>
> *(when the Visitor is near you)* "Ah — there it is. I don't make that one, Eli.
> That one just comes now. You did that. Your fear called it." *(a pause)* "Keep
> going. It likes it when you go."
>
> *(near the dock)* "You think morning's outside that door. Morning's fine. We're
> open every night, Eli. And your account's already set up."

### 4.7 — THE ENDINGS (spoken fragments — full text in §9)
> **DISCHARGED — phone, in the car:** *(no voice — a bank notification chime)*
> on-screen: **+$1,200.00 — ASHGROVE WELLNESS LLC.**
>
> **INCOMPLETE — Vane sedating you (`E_ROOM3` / wherever you break):**
> "Hey. Hey, hey — you're okay. I've got you. Let's get you settled." *(the
> kindest, worst line in the game)*
>
> **RETAINED — Renata's voice, distant, looping (you are Room 4 now):**
> "...Easiest twelve hundred bucks you'll ever make. ...You're in good hands with
> Marcus."

---

## 5. DOCUMENT LIBRARY (26 readable documents/notes)

> **Format for implementer:** each = `openNote(TITLE, BODY)`. Placement is by AREA
> ID. Keep line breaks. These carry the lore and the length; they should reward the
> diligent player and feed the Profiler (reading vs. skipping is logged). **Count: 26.**

---

**DOC 01 — "ASHGROVE — PARTICIPANT CONSENT"** · `C_INTAKE` (the form you sign)
```
PARTICIPANT CONSENT  —  OVERNIGHT SLEEP STUDY
Subject: ___________________     Date: __/__/____

1. You agree to remain in the assigned bed for the full session.
2. You agree to keep all monitoring sensors attached for the duration.
3. You will be observed and recorded continuously for clinical purposes.
4. Compensation ($1,200.00) is paid for a COMPLETE session only.

------------------------------------------------------------------
[ p.4  DISCLOSURE — please initial ___ ]

Subject grants Ashgrove Wellness LLC a perpetual, irrevocable,
worldwide right to all session data and any derivative recordings —
physiological, audiovisual, and behavioral — for any purpose,
commercial or otherwise, in any medium now known or later devised,
without further notice, attribution, or compensation.

Subject waives any claim arising from images or recordings of the
subject in any state, including states of distress.

You will not remember most of this. That is normal.

Sign at the X.                                              X_______
```

**DOC 02 — "WELCOME TO ASHGROVE" (waiting-room pamphlet)** · `B_LOBBY`
```
WELCOME TO RESTFUL NIGHTS

At Ashgrove, your comfort is our science. While you sleep, our
caring staff monitor your rest to help researchers understand the
human mind at its most honest.

Did you know? You are never more truthful than when you are afraid.
We mean asleep. When you are asleep.

* Free parking      * Paid same-day      * Ask about returning!

"I came for the money. I keep coming back." — A. , repeat guest
```

**DOC 03 — "NIGHT LOG (loose page)"** · `F_BATHROOM` (Vane's handwriting)
```
Do not leave these in the rooms again.

4 has been under nineteen days. Vitals hold. Vendor says the longer
they stay afraid the better the take, so we rotate the gel weekly to
stop tolerance. He's stopped dreaming about home. Pity. Home reads
beautiful on the first night.

New one in 3 scored high on intake. Flag: runner-likely. Keep the
lights low and let it build. Don't waste the first paralysis.

— M.V.
```

**DOC 04 — "PATIENT INFORMATION: YOUR SLEEP STUDY"** · `D_HALL_NORTH` (framed poster text)
```
WHAT TO EXPECT TONIGHT

* You may experience vivid dreams. This is the study working.
* You may briefly wake unable to move. This is called sleep
  paralysis. It is harmless and will pass. Do not be alarmed.
* You may feel a presence in the room. Many subjects do.
  Remain in bed. Remain calm. It cannot be helped by leaving.

Press the call button only for emergencies.
Marcus is always watching.
```

**DOC 05 — "CALL BUTTON — OUT OF SERVICE"** · `E_ROOM3` (taped under the button)
```
[ small label, half peeled ]

CALL BUTTON DISCONNECTED — DO NOT REPLACE
per M.V. — "they press it too much, ruins the read"

The light still comes on. They like that it comes on.
```

**DOC 06 — "DISCHARGE NOTE (left behind)"** · `E_ROOM1`
```
DISCHARGE — SUBJECT 2247

Slept through. Compliant. No resistance, no flight. Low yield.
Paid in full. Sent home 6:10 AM.

Disposition: NOT INVITED BACK. Too calm. Nothing to sell.
The quiet ones are a waste of a bed.
```

**DOC 07 — "a child's drawing"** · `E_ROOM2` (taped under the bed frame; described + transcribed)
```
[ crayon on the back of an intake form. A house, a sun, three
  stick figures holding hands. Above them, a fourth, much taller,
  with no face and very long arms, drawn in black, pressed so hard
  the paper tore. ]

Underneath, in a kid's careful letters:

   "the tall man stands at the foot of mommys bed.
    she said dont look at him so i didnt.
    can we go home now"
```

**DOC 08 — "EQUIPMENT PREP CHECKLIST"** · `G_EXAM`
```
PREP — per subject

[x] EEG cap + conductive gel (BATCH 7 — the new mix)
[x] Chest belt, pulse-ox
[x] IV line — 0.9% saline + ADJUNCT (see fridge, COLD only)
        ** lowers wake threshold. makes the hypnagogic vivid.
        ** do NOT dose staff. ever. (see Incident 0419)
[x] Room mic + speaker LIVE
[x] CAM 1/2/3 — REC armed before lights down

Reminder: the saline bag is the leash. Keep them hydrated,
keep them flat, keep them recording.
```

**DOC 09 — "RULES FOR THE SUBJECT (laminated, bedside)"** · `E_ROOM3`
```
FOR YOUR RESTFUL NIGHT:

1. Please remain in bed.
2. Please keep your sensors attached.
3. Please do not be alarmed by anything you see or hear.
4. Please do not approach the glass.
5. Please do not attempt the doors.

Following these rules ensures a COMPLETE session and your
full payment. We want you to be paid. We want you to come back.
```

**DOC 10 — "POLYSOMNOGRAPH — SESSION 2251 (yours)"** · `H_SLEEPLAB`
```
SUBJECT 2251 — MERCER, E.        CHANNEL READOUT (live)

EEG ........ elevated theta — good hypnagogia
ECG ........ 96 → 148 bpm and climbing
EMG ........ paralysis onset confirmed 03:00
GSR ........ spiking (this is the money channel)

YIELD (est.) .......... HIGH
RUNNER FLAG ........... TRUE
NOTE: do not stabilize. let it climb. buyer is waiting on
      a fresh fear-response master. this one will do nicely.
```

**DOC 11 — "DISCHARGE SLIP — ROOM 5"** · `E_ROOM5`
```
DISCHARGE — SUBJECT 2249

Session complete. Good yield (resistance + one flight attempt).
Paid $1,200 at 6:30 AM. Adhesive rash on chest — gave them the
cream, told them it was the gel. (It is the gel.)

Disposition: RETURNING CUSTOMER LIKELY.
They always come back. The rent is always due again.
```

**DOC 12 — "SUBJECT FILE — OKAFOR, M. (#2231)"** · `J_RECORDS`
```
OKAFOR, MIRIAM    #2231    intake 3 wks prior

Nursing student. Needed tuition. Read the disclosure (rare).
Asked too many questions at intake. High intelligence — high
fear ceiling. Excellent subject.

Night 1: tried the doors at 04:10. Best flight footage of the
quarter. Vendor paid premium.

Disposition: RETAINED.
       [ second line, different ink ]  reassigned — see cold.
```

**DOC 13 — "MAINTENANCE MEMO — re: BASEMENT TEMP"** · `N_BOILER`
```
TO: night staff
RE: boiler / basement climate — STOP ADJUSTING IT

The basement stays warm. I know it feels wrong. It is not for
your comfort. The long-term guests downstairs and the master
storage both need stable temperature.

Cold storage is the EXCEPTION — keep it cold, keep it locked.
If you smell something on the south end, it is not the boiler.
Do not investigate. Log it and finish your shift.

— Facilities
```

**DOC 14 — "BILLING LEDGER (excerpt)"** · `J_RECORDS`
```
ASHGROVE WELLNESS LLC — RECEIVABLES (Q ____)

OUT: 14 master sessions ............. PER STANDING ORDER
     fear-response tier (x3 rate) .... 9 of 14
     "runner" premium ................ 4 flagged
BUYER REFERENCE .................... WITHHELD

IN:  subject payouts (1,200 ea) ...... a rounding error
NOTE: payouts are marketing. a paid subject is a returning
      subject. the product is upstairs in the beds.
```

**DOC 15 — "STANDING PURCHASE ORDER (buyer copy)"** · `J_RECORDS` (the unseen buyer)
```
STANDING ORDER  —  open, ongoing

DELIVER: master recordings, genuine fear-response, human.
         no actors. no simulations. authenticity verified by
         physiological channel (GSR/ECG).
PRICE:   tiered. fear-response x3. flight ("runner") premium.
TERMS:   PER STANDING ORDER — DELIVER ON COMPLETION.
         a "complete" session is one that ends.
         how it ends is the seller's discretion.

[ letterhead: a circle, bisected by a single line. no name. ]
```

**DOC 16 — "INCIDENT REPORT 0419"** · `J_RECORDS`
```
INCIDENT 0419 — RESTRICTED

A night tech (initials withheld) self-administered the IV
adjunct on a dare. Within 40 min reported the Visitor while
fully awake, on the floor of Observation, eyes open.

Subject (staff) could not distinguish the tape from the room.
Sedated. Did not return to work. Did not return calls.

CONCLUSION: the adjunct does not create the Visitor. It only
removes the difference between asleep and awake. The Visitor
was already in the building. It has been for some time.

ACTION: do NOT dose staff. Keep recording subjects. It sells.
```

**DOC 17 — "letter, unsent (Mia)"** · `K_BREAK` (inside Renata's locker)
```
Tobi —

If you're reading this I didn't get out and I'm sorry about the
tuition and everything. Don't come looking at Ashgrove. Don't
sign anything. Tell mom I was working a night job, that's all.

It's not a sleep place. They keep you under and they film what
you're scared of and there's a man, Marcus, who's so nice it
makes your skin crawl. And there's something else here that
isn't him. It stands at the foot of the bed. Don't look at it.
That's the only thing that helps and it doesn't even really help.

The lady at the front, Renata — I think she knows. I think she's
scared too. I'm giving her this. Maybe she'll mail it. Maybe she's
too scared. I would be.

I love you. Lock your doors.
— Mia
```

**DOC 18 — "Renata's note (hidden)"** · `K_BREAK` (folded in her locker, barely legible — she didn't dare make it clear)
```
[ a sticky note, written, scratched out, rewritten smaller ]

if you are reading this you got back here and that means youre
already in trouble. im sorry. i tell myself its a sleep clinic
because i have my own kids and the checks clear.

dont take the IV. dont stay in the bed. the front doors lock at
11 but the loading dock latch downstairs is broken, go DOWN not
out. go now. dont read the rest of the building. it makes it
worse, it makes IT closer.

im sorry. im so sorry. — R
(burn this)
```

**DOC 19 — "TAPE INVENTORY (observation wall)"** · `I_OBSERVATION`
```
MASTER SHELF — DO NOT REMOVE

  ASH, D.        (RM 4)   ...... 19 days, ongoing
  OKAFOR, M.     #2231    ...... see cold
  ORTIZ, R.      ........  RETAINED   [ ??? — that's the front desk ]
  ( 11 more, names taped over )
  ───────────────────────────────
  MERCER, E.     #2251    ...... TONIGHT   ● REC

This shelf is already labeled. Yours is already recording.
The tape exists before the night is over. So does the ending.
```

**DOC 20 — "OUTBOUND SHIPPING MANIFEST"** · `P_SHIPPING`
```
ASHGROVE WELLNESS LLC — OUTBOUND

CONTENTS: 14 sessions (master recordings)
CONSIGNEE: [ WITHHELD ]
HANDLING:  keep cold. do not view. do not duplicate.
PRICING:   fear-response tier x3 (9). runner premium (4).
SCHEDULE:  pickup 05:00. "DON'T BE LATE."

TERMS: PER STANDING ORDER — DELIVER ON COMPLETION.

[ every crate stamped with a circle, bisected by one line ]
Thank you for your contribution.
```

**DOC 21 — "FISH TANK MAINTENANCE CARD"** · `B_LOBBY` (mundane, quietly awful)
```
WAITING ROOM AQUARIUM — care log

Feed twice daily. Replace any that float.
The fish help subjects relax. Relaxed subjects sign faster.

Note: do not let the tank go dark at night. The light keeps
people from looking at the hallway.
```

**DOC 22 — "STAFF SCHEDULE (whiteboard)"** · `K_BREAK` (has Renata's locker code on it, plus dread)
```
THIS WEEK — NIGHTS

M  T  W  T  F  S  S
Marcus covers all overnights (as always).
Renata: intake until 23:00, then GO HOME. don't stay. (R, locker 0-2-3-1)
Day staff: do not enter rooms 4, do not go to cold.

"We never close." — M
```

**DOC 23 — "PRESCRIPTION PAD / GEL BATCH NOTE"** · `H_SLEEPLAB`
```
GEL — BATCH 7 ("the new mix")

Stronger adjunct uptake through the scalp. Onset faster.
Hypnagogia more vivid, paralysis more reliable, dreams more
suggestible — we can steer the first dream now. We give them
home. Then we take it.

Side effects (subjects): rash, missing time, "feeling watched"
for weeks. (Good for retention. They come back to feel safe and
we are the last place they felt anything at all.)
```

**DOC 24 — "NURSE/INTAKE STICKY (Renata's desk)"** · `C_INTAKE` (tiny, easy to miss, sets up her arc)
```
[ post-it on the monitor ]

— smile. don't let them read p.4.
— gown, then send to Marcus. do NOT walk them past 4.
— leave at 11. LEAVE AT 11.
— (they're somebody's kid. they're somebody's kid. stop it. clock out.)
```

**DOC 25 — "COLD STORAGE LOG"** · `O_COLDSTORAGE`
```
COLD STORAGE — ACCESS LOG

Tapes: master copies, climate-locked. Do not view.
Guests: "reassigned" long-term subjects. Keep flat, keep fed,
        keep the IV running. They don't need much down here.

Re: OKAFOR — moved here after Night 3. Still reads vitals.
Still reads fear, faintly, if you turn the gain up.
We don't. There's no buyer for a sleeping woman. Yet.
```

**DOC 26 — "AD SCREENSHOT (phone — pinned)"** · viewable in phone UI, conceptually `A_VESTIBULE`
```
[ saved image — the ad that started it ]

   EARN $1,200 — ONE NIGHT
   Ashgrove Sleep Center is seeking healthy adults 18–35
   for a paid overnight sleep study. Just sleep!
   Same-day payment. No experience necessary.
   * limited spots * we have helped hundreds rest *

   ( you screenshotted this at 11:51 PM, three weeks behind
     on rent. you didn't read the part below the fold. there
     wasn't a part below the fold. that was the whole ad.
     that was always the whole ad. )
```

---

## 6. THE PHONE THREAD (Maya, sister)

> **The emotional anchor and a horror instrument.** Three movements: *mundane →
> wrong → the quiet, mean realization.* **The Profiler logs whether the player ever
> checks the timestamps.** The cruelty: the comfort stopped being real around 3 AM,
> and you didn't notice, because you needed it. Implement with `phoneMsg(who, txt,
> time)`; `who` is `'them'` (Maya) or `'me'` (Eli). Times below are the *displayed*
> timestamps — their wrongness is the point.

### Movement 1 — Mundane (before & during arrival, real and warm)
```
them   9:51 PM   did you GET it?? the sleep thing??
me     9:53 PM   yeah i got in. $1200 for one night lol
them   9:53 PM   ELI. thats the rent AND the light bill 🙏🙏
them   9:54 PM   ok be safe. text me when youre done ok
me     9:55 PM   its just sleeping maya. ill text you in the am
them   9:55 PM   love you. dont be weird and not sleep
me     9:56 PM   love you too. go to bed its late
them   10:00 PM  mom says drive safe. i didnt tell her how broke we are
me     10:01 PM  good. dont. night 💚
```

### Movement 2 — Wrong (after you wake at "3:33" — the seams show)
```
them   3:33 AM   you up? 🙂
        ^ you never heard it buzz. it was just there.
them   3:33 AM   hows the sleep place
me     2:01 AM   maya why are you up?? its 2am
        ^ your send time and hers don't line up. you don't notice
          unless you look.
them   3:33 AM   i couldnt sleep either
them   3:34 AM   dont let him wire the iv
me     2:02 AM   what? who told you about the iv
them   3:34 AM   you did silly
        ^ you didn't.
them   3:40 AM   are you still in the bed? you should stay in the bed
me     2:04 AM   maya this isnt funny
them   3:33 AM   🙂
        ^ same timestamp as the first message. the conversation
          is folding back on itself.
```

### Movement 3 — The quiet, mean realization (late, the battery dying)
```
them   3:33 AM   im right here eli
them   3:33 AM   i never left
me     ??:??     [your battery is at 4%. your only light.]
me     2:09 AM   prove it. whats the dog we had when we were little
them   3:33 AM   🙂
them   3:33 AM   you dont have a dog
        ^ true. there was never a dog. you were testing it.
          it passed by failing.
them   3:33 AM   the maya you've been talking to went to bed at
                 10:01. you said night. she said night.
them   3:33 AM   everything after that was me.
                 you wanted it to be her so you didn't check.
                 we logged that.
me     [no signal]
[ a call comes in. the caller ID is YOUR OWN NUMBER. ]
[ if you answer: your own voice, recorded, from the bed:
  "...stay in the bed for me." ]
```

> **Profiler payoff (surfaced in the end-card):** *"Subject sought reassurance
> from contact 'Maya' N times after the contact stopped responding (≈3:00 AM)."*
> N = the number of times the player opened the phone or sent a reply after
> Movement 1 ended. If the player **never checked a timestamp**, the report adds:
> *"Subject did not verify. Subject needed it to be true."*

---

## 7. SCARE / EVENT SCRIPTING

> **Two golden rules, both already in the engine and both honored here:**
> 1. **The Visitor only moves when unobserved** (`updateVisitor`: it advances only
>    when not in the player's view cone / not lit). Every Visitor beat is built on
>    this — looking *stops* it, which makes looking away unbearable.
> 2. **Teach safe, punish later.** The first dream and first paralysis are
>    survivable so the player trusts the mechanic; then it turns.
>
> **The real system clock is canon.** Once you go under in Act III, the in-world
> clock reads the player's actual time; schedule the heaviest beats (paralysis,
> the cold-storage stalk) relative to the player's real ~3 AM where the session
> lands there. The end-card stamps the real date/time. *It happened tonight.*

### 7.1 — Atmosphere ramp (global)
- **Filter degradation** (`STORY.deg` / VHS `uDeg`): 0.32 (Acts I–II) → 0.45
  (wake at 3) → 0.62 (first paralysis) → climbs to ~0.85 by `O_COLDSTORAGE`, with
  one **clean frame** at the Vane turn (0:38): drop `uDeg` to ~0 for ~0.4 s for a
  half-second of perfect clarity on Vane and the Visitor, then snap back.
- **Composure/sanity drain** rises with proximity to the Visitor (`visitorDread`)
  and with darkness; recovers slowly in lit, Visitor-free rooms. Used to gate the
  *Incomplete* ending (if composure bottoms out, the player breaks).
- **Heartbeat audio** ties to dread (already wired): 60 bpm idle → up to ~130+ as
  the Visitor closes. Peaks in `O_COLDSTORAGE` (0:43).
- **Lights:** flicker frequency increases per act; `H_SLEEPLAB`, `K_BREAK`,
  `M_STAIR`, `O_COLDSTORAGE` get the worst stutters. The fish-tank light in
  `B_LOBBY` is the only steady light, by design (Doc 21).

### 7.2 — Scripted scares by area & trigger
| # | Area | Trigger | Event |
|---|---|---|---|
| S1 | `A_VESTIBULE` | Renata exits (0:06) | The magnetic door **clack**. Establish the sound; reuse at S14. |
| S2 | `E_ROOM3` | Wake at "3:33" (0:17) | Clock jump; call button on floor; bathroom door swings open on its own (no Visitor — yet). |
| S3 | `E_ROOM3` | Phone opened (0:19) | New Maya text appears **as you watch**, with no buzz. Grain ticks up. |
| S4 | `E_ROOM3` | ~9 s after wake (0:20) | **First paralysis.** Visitor at foot of bed, eyes-only, ~10 s. Survivable. Logs look-toward vs. look-away. |
| S5 | `F_BATHROOM` | Look into mirror up close (0:23) | Reflection's eyes open while yours blink-shut for 1 frame. No chase. Just *wrong.* |
| S6 | `E_ROOM4` | Look through door crack (0:25) | The Long Subject. If the player **stares >4 s**, his head turns toward the door, slowly, and Vane's speaker cuts in: "Don't mind four." |
| S7 | `G_EXAM` / nightstand | Open phone after 0:26 | Texts arrive while phone is **in hand, untouched** (Movement 2). |
| S8 | `D_HALL_NORTH` | First door tried after 0:27 | Locks **from the outside**; the bolt sound; Vane: "...the door's not stuck — it's locked." |
| S9 | `H_SLEEPLAB` | Enter (0:28) | Vent sound + a printout feeding live with **your** fear graph. Visitor advances in the dark behind the racks (only if you look away). |
| S10 | `K_BREAK` | Open Renata's locker (0:33) | Lights stutter; Visitor crosses behind the lockers — seen **only** if the player turns at the right moment. Vane: "You're a long way from the bed." |
| S11 | `I_OBSERVATION` | Read the tape wall (0:37) | CAM 3 shows your **empty bed**; then, for 1 frame, a figure **sitting up** in it. |
| S12 | `I_OBSERVATION` | Turn around (0:38) | **Vane is there.** The clean-frame moment (§7.1). The shoot begins. |
| S13 | `O_COLDSTORAGE` | Mid-room (0:43) | Visitor is **between you and the exit** when you look away, gone when you look back. A sheeted gurney's chest rises. Heartbeat peaks. |
| S14 | `O_COLDSTORAGE`→`P_SHIPPING` | Cross threshold (0:44) | Door seals with the **same clack as S1** — the night rhymes. |
| S15 | `P_SHIPPING` | Approach dock door (0:45) | Branch resolves (§9). In *Retained*, the Visitor is finally allowed to reach you here, in full clarity. |

### 7.3 — The Visitor's stalking escalation (act by act)
- **Act III (0:20):** *Apparition only.* Foot of the bed, paralysis. Cannot reach
  you. Teaches the look-rule safely.
- **Act IV (0:22–0:27):** *Peripheral.* Glimpsed in the hall, behind doors, in the
  mirror. Never closes distance. The dread meter starts to bite.
- **Act V (0:28–0:35):** *Active, slow.* `VIS.active = true`, low speed, roams; uses
  the unobserved rule to gain ground in `H_SLEEPLAB` and `K_BREAK`. First real
  "if you look away too long, it's closer" pressure.
- **Act VI (0:35–0:40):** *Hunting.* `VIS.state = 'hunt'`, speed up; Vane narrates
  it as *yours* ("your fear called it"). It paces the chase from `I_OBSERVATION`
  to `L_HALL_SOUTH`.
- **Act VII (0:40–0:44):** *Cruel.* In `O_COLDSTORAGE` it teleports to block exits
  the instant it leaves your view — its nastiest behavior. Catching you here =
  *Retained* (caught → `onCaught` → retained ending).
- **Act VIII (0:45):** *Resolution.* Only fully reaches/clarifies in the *Retained*
  branch. In *Discharged* it is **in the back seat** of the car (final shot). In
  *Incomplete* it is the last thing you half-see before Vane sedates you.

---

## 8. KEY / OBJECTIVE PROGRESSION (the 45-minute gate)

> Gating is intentionally light (this is a horror walking sim, not a puzzle box):
> **two physical keys + two information keys (codes/knowledge).** Each unlock opens
> the next act's space. Coordinate placement with the level agent's AREA IDs.

| Gate | Found in | Item / knowledge | Unlocks | Act |
|---|---|---|---|---|
| G0 | `C_INTAKE` | **Signed consent** (and the choice to read p.4 — Doc 01) | Progression to wiring; Profiler flag | I |
| G1 | `G_EXAM` (drawer) | **STAFF KEYCARD** (`giveKey('staff')`) | The `STAFF ONLY` red readers: `H_SLEEPLAB`, `I_OBSERVATION` | IV→V |
| G2 | `K_BREAK` whiteboard (Doc 22) | **Renata's locker code "0231"** (information key) | `K_BREAK` locker → Mia's letter (17), Renata's warning (18), **a spare battery**, and the hint to *go DOWN not out* | V |
| G3 | `J_RECORDS` / `H_SLEEPLAB` | **Knowledge:** the route to Observation is via the back; the dock latch is broken (from Doc 18/25) | Directs the player to `I_OBSERVATION`, then `M_STAIR` | V→VI |
| G4 | `N_BOILER` | **BASEMENT/COLD KEY** (`giveKey('basement')`) on a hook by the boiler | `O_COLDSTORAGE` → `P_SHIPPING` | VII |
| G5 | `P_SHIPPING` | **The broken dock latch** (per Renata's warning) | The roll-up door = the exit / branch resolution | VIII |

**Resource gating (soft):** the flashlight battery drains (`P.batt`). One spare in
`K_BREAK` (G2), one optional in `E_ROOM6` (storage). Running low forces the player
into the dark, which raises dread and tempts the *Incomplete* break. Encourage the
player to ration — the descent (`M_STAIR`→`O_COLDSTORAGE`) is the darkest stretch.

**Objective string (HUD `setObjective`):**
1. "Check in at the reception desk." (`C_INTAKE`)
2. "Read and sign the consent forms." (`C_INTAKE`)
3. "Change, then find Marcus in the exam room." (`G_EXAM`)
4. "Get in bed and rest." (`E_ROOM3`)
5. *(after wake)* "Something is wrong. Find a way out." (`E_ROOM3`)
6. "Find the staff keycard." (`G_EXAM`)
7. "Get past the staff-only doors." (`H_SLEEPLAB`)
8. "Open Renata's locker. (Find her code.)" (`K_BREAK`)
9. "Get into the observation booth." (`I_OBSERVATION`)
10. *(after Vane turn)* "Get out. Go DOWN, not out." (`M_STAIR`)
11. "Find the way to the loading dock." (`N_BOILER`→`O_COLDSTORAGE`)
12. "Get out through Shipping." (`P_SHIPPING`)

---

## 9. MULTIPLE ENDINGS + FEAR PROFILE END-CARD

> **The branch is chosen by behavior (the Profiler), not a menu** — consistent with
> [`04_THE_SURPRISE.md`](04_THE_SURPRISE.md). The player authors the ending with their hands across the
> whole night. All three roll into the same Fear Profile end-card.

### Branch logic (how the Profiler decides)
- **DISCHARGED** — the player **resists and escapes**: reaches `P_SHIPPING` and
  opens the dock door while keeping composure above the break threshold and
  evading the Visitor. (`endGame('discharged')`.) *Resistance, completed.*
- **INCOMPLETE** — the player **panics past the threshold**: composure bottoms out
  (sustained high dread, input-mashing, ripping sensors too early in Act III/IV),
  or tears off the harness before the route is open. Vane sedates them.
  (`endGame('incomplete')`.) *Resistance, collapsed.*
- **RETAINED** — the player **complies and never resists** (stays in bed, never
  flees, low agitation), **or** is **caught by the Visitor** in Acts VII–VIII
  (`onCaught` → retained). *Compliance, or capture.* You become Room 4.

> Tie-breakers feed the Profiler's existing fields: `PROFILER.run` (agitation),
> `PROFILER.hid`, `paralysisLook/Away`, `readDisclosure`, `readNotes`, and the
> phone-reassurance count. These also dress the **finale dream** (where used) from
> the player's own behavior — the room they lingered in, the prop they avoided, the
> fear they favored (Confrontation vs. Avoidance).

---

### ENDING A — "DISCHARGED" (you get out) · `P_SHIPPING` → car
On-screen, no narration:
```
You shove the broken latch. The roll-up door rattles up on a
gray parking lot and the first real light you've seen all night.
You don't look back. You don't stop until the car door shuts.
```
The car. Engine. Your phone buzzes — a bank notification:
> **+$1,200.00 — ASHGROVE WELLNESS LLC**

```
They paid you. Of course they paid you. You delivered.

You pull out of the lot. The clinic shrinks in the mirror.

And in the rear-view, in the back seat, the way it stood at the
foot of the bed — there is the shape of something, very tall,
very patient, that did not stay behind.

You'll need the money again next month. The ad is still up.
```
→ Fear Profile end-card. (Final shot: the Visitor in the back seat — the foot-of-
the-bed staging, re-deployed.)

### ENDING B — "INCOMPLETE SESSION" (you break; they sedate you) · wherever the player collapses
> **MARCUS** *(arriving, gentle, the worst kindness in the game):*
> "Hey. Hey, hey — you're okay. I've got you. Let's get you settled."

Fade to white, then:
```
You wake in your own bed. Daylight. You don't know what day.

There is a fresh adhesive rash across your chest. A bandage in
the crook of your arm. Twelve hundred dollars cleared three days
ago, the notification says. You don't remember the drive home.

You don't remember most of it. That's normal. The form said so.

Sometimes, at the foot of your bed, very late, the air is the
shape of someone patient. You've started leaving a light on.
You've started thinking about the money again.
```
→ Fear Profile end-card. (Implication: you're a returning customer now.)

### ENDING C — "RETAINED" (Room 4) · caught, or perfect compliance
```
You don't make it. Or you never tried.

You sleep through to a morning that isn't one. The IV keeps you
flat. The gel keeps it vivid. Somewhere a gain dial reads your
fear, faintly, when they turn it up. They don't, much. There's
no buyer for a sleeping man. Yet.
```
Distant, looping, Renata's intake voice (someone new is checking in):
> "...easiest twelve hundred bucks you'll ever make. ...You're in good hands with
> Marcus."
```
You are the long-term guest now. You are very comfortable.
You will be here a long time.
```
→ Fear Profile end-card.

---

### THE FEAR PROFILE END-CARD (all branches)
> Dot-matrix/fax aesthetic, REC dot blinking. Fields are filled from the live
> Profiler. **Real date/real timecode.** The horror is that it's *right about you.*

```
   ASHGROVE WELLNESS LLC  —  SESSION SUMMARY
   SUBJECT: Eli Mercer            SESSION: [real date / real timecode]
   ─────────────────────────────────────────────────────────────
   PRIMARY FEAR RESPONSE ...... {Confrontation — held the source in
                                 view  |  Avoidance — would not look
                                 directly at it}
   LATENCY TO COMPLIANCE ...... {mm:ss}   {"above average — promising"
                                 if high}
   THRESHOLD EVENT ............ {Subject removed sensors at HH:MM |
                                 Subject left the building at HH:MM |
                                 Subject did not resist}
   DILIGENCE .................. {Reviewed disclosure (p.4) — rare |
                                 Did not read disclosure (p.4)}
   NOTES RECOVERED ............ {k} / 26
   TIME HIDDEN ................ {n} attempt(s)
   AGITATION INDEX ............ {low | elevated | severe}
   REASSURANCE-SEEKING ........ Sought contact "Maya" {N} times after
                                 the contact stopped responding (3:00 AM).
                                 {"Subject did not verify." if no timestamp
                                  was ever checked}
   DISPOSITION ................ {Discharged | Incomplete — sedated |
                                 Retained}
   ─────────────────────────────────────────────────────────────
   NOTE: {one line, chosen by profile — see below}

   Thank you for your contribution.
   We've learned so much about you. We'll see you again soon.

   ● REC                                          [ visit #{v} ]
```

**The closing NOTE line (chosen by behavior):**
- *Did not read p.4:* "Subject did not read the disclosure before signing. They
  never do. It's why we keep the lights on."
- *Avoidance:* "Subject refused to look directly at it. Avoidant subjects produce
  our richest recordings. Please come back."
- *Confrontation:* "Subject faced it. Most cannot. We'll want you back for that."
- *Retained:* "No further sessions required. Subject is now an asset."
- *Returning (visit #>1):* append "Welcome back — visit #{v}. We told you we would
  see you again."

> **Found-footage made literal (per [`04_THE_SURPRISE.md`](04_THE_SURPRISE.md)):** the report and a short
> session tape are written to the player's local save (`/Ashgrove/sessions/`),
> opt-in, deletable. The clinic kept your tape. It's on your machine now.

---

## 10. VOICE & TONE GUIDE (for the implementer)

**The prime directive:** *the quietest, meanest beats land hardest.* Resist the
urge to escalate with volume. Escalate with **wrongness** and **specificity.**

1. **Vane is warm, never cruel out loud.** He compliments your fear. He says
   "champ" and "Eli" and "beautifully." He answers questions you didn't ask. He is
   never angry, never threatening — the friendliness *is* the threat. If a Vane line
   sounds like a villain, rewrite it kinder.
2. **Renata is real, and a half-beat too eager to leave.** Her warmth is genuine;
   her cowardice is human-sized. She never explains the plot. She just can't quite
   meet your eye on the way out.
3. **Documents are bureaucratic, not gothic.** The horror is that atrocity is
   written in the register of checklists, billing, and HR memos. "Payouts are
   marketing." "Keep them flat, keep them recording." Specific nouns (saline,
   GSR channel, batch 7, locker 0231) are scarier than adjectives.
4. **Mundane first, always.** Bank balance, rent, a fish tank, a child's drawing,
   an adhesive rash. The supernatural earns its keep only after the ordinary has
   been made airtight.
5. **Ambiguity is non-negotiable.** Never confirm what the Visitor is. The drug
   explanation and the haunting explanation must both stay alive. The human evil is
   concrete; the rest is the cold spot on the drive home. (Incident 0419 walks
   right up to the line and refuses to cross it — model your restraint on that doc.)
6. **The phone is a wound, not a jump-scare.** The meanest beat in the game is a
   timestamp. Let it be quiet. The player should realize, not be told, that the
   comfort stopped being real — and feel complicit for needing it.
7. **The clock is canon and the night is *tonight*.** Lean on real time. "We're
   open every night" should feel like a fact about the player's actual life.
8. **The end-card is the boss.** Spend the most polish-per-second here. It must be
   *accurate* about the player's behavior, phrased in the two registers that
   terrorized them all night — clinical and warm. The cruelty is that it's true.
9. **Subtitle discipline.** Lines fit the band; cut filler; one idea per line.
   Prefer "Just sleep naturally, champ. Easy money." over a paragraph.
10. **Never punch down at real fear.** Per ethics in [`04_THE_SURPRISE.md`](04_THE_SURPRISE.md): the
    personalization comments only on *in-game behavior*, never on the real person
    beyond the playful "you didn't read the form." Insightful, not cruel.

---

*End of 08_STORY_45MIN.md*
