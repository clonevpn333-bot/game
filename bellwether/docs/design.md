# BELLWETHER: design

## Brief

**Player promise:** walk into a city everyone thinks is dead and find it alive, and slowly realise who is living in it.

- **Target feeling:** unease inside normality. The first minutes are warm, colourful and busy. Wrongness arrives as small details, then as revelation, then as a city turning on you.
- **Camera:** first person, with cinematic third-person cameras in cutscenes.
- **Primary verb:** walk and look. Approach, observe, talk (E).
- **Secondary verbs:** sprint, crouch, jump, vault and mantle, climb ladders, interact and examine, hack terminals (a short timing minigame), shoot (pistol, later), melee (baton shove), stealth (stay out of a security unit's vision cone), a flashlight underground.
- **Every 5–30 s:** follow the waypoint, notice a citizen behaving, overhear a line, reach the next story beat.
- **Every 1–5 min:** a scripted reveal (the cashier flickers, the arm opens, WELCOME HOME screens, the classroom), a new space, a mechanic introduced.
- **Lose, learn, restart:**
  - Failure only exists in hostile chapters (Undercity, Blackout, Civil War).
  - Death rewinds to the last checkpoint within seconds.
  - Stealth detection triggers a chase you can still escape.
- **Rewarded:** curiosity. Optional examines reveal CIVIC's records and citizen stories. **Risk:** attention from Municipal Security.
- **A better player:** reads patrol routes and uses cover, hacks rather than fights, finds every record.
- **Next decision communicated by:** the objective line, a 3D waypoint diamond with distance, and lit doors and interactable glints.
- **Non-goals:**
  - No open world: hand-built linear spaces only.
  - No inventory management.
  - No realistic humans.

## Core loop contract

The player **walks Bellwether** to **reach the next story beat (waypoint)**, while **the city's wrongness and later Municipal Security** create risk.

- **Success** reveals the next truth and opens the next space.
- **Failure** (caught or killed in hostile chapters) rewinds to a checkpoint a few metres back.

How each clause is proven:

- **Verb:** WASD, mouse look, E interact, mapped through Input intents.
- **Objective:** the HUD objective line plus the 3D waypoint (`Script.objective(title, text, target)`).
- **Pressure:**
  - Chapter 1 is social: citizens recognise you, and something is wrong.
  - Hostile chapters bring security vision cones, chasers and gunfire.
- **Reward:** a story state change (doors open, the city transforms, new companions).
- **Retry:** `checkpoint()` plus fast respawn.

## Art direction

- **Characters:** stylized blocky robots built procedurally in Three.js.
  - Chunky boxes with bevels, simplified joints and strong silhouettes.
  - Clothing as layered blocks; hair blocks; simple graphic faces: rectangular eyes with emissive irises that flicker when glitching, brows and a mouth slit.
  - Never realistic skin. Each generation reads at a glance:
    - **Gen 1:** industrial maintenance bot. Big, boxy, yellow and black, treads or legs, single lens.
    - **Gen 2:** basic humanoid. Grey shell, visible seams and joint rings, a screen face.
    - **Gen 3:** social units. Clothes and hair, but matte "mannequin" skin with seam lines.
    - **Gen 4:** current citizens. Full colour and clothing, near-human proportions, still blocky. Damage reveals metal, cables and internal light.
    - **Municipal Security:** navy armour plates, visor with a red or blue light bar.
    - **Discarded:** half-built frames, missing panels, wrong-way joints.
    - **Nulls:** smooth faceless heads, grey wrapped bodies.
- **Animation:** procedural (walk and run cycles phase-locked to speed, idle breathing, talk, wave, sit, panic, umbrella). Clean and deliberate rather than floppy. Plant feet, no rubber limbs.
- **World:**
  - Dense wet modern streets, neon, traffic and lit windows, rain and fog, reflections, ad screens.
  - Colourful and alive first. Then the same streets turn red and oppressive (Blackout, Civil War).
- **Camera scale:** the player's eye is at 1.62 m, FOV 72. Citizens are about 1.7–1.85 m (Ellie about 1.25 m).

## Chapters

| # | Title | Beats | Mechanics introduced |
| --- | --- | --- | --- |
| Prologue | Helicopter | Rain, the living city below, the stadium, "Two point one million." | cinematic |
| 1 | Welcome Home | Landing zone, a city that greets you, the Quik-Stop cashier ("Elias Vale?"), a citizen's accident, the arm opens | walk, examine, talk, waypoint |
| 2 | Perfectly Normal | Downtown, WELCOME HOME screens, CIVIC's public address, questions about the outside, the information wall | climb, vault, first hack |
| 3 | School | Lincoln Elementary in session, Ellie's desk, Ellie runs | chase |
| 4 | Undercity | Tunnels, rehearsal halls of discarded prototypes, Nulls | flashlight, stealth, melee, pistol |
| 5 | Ellie | The Vale house, Ellie remembers everything | examine-heavy, no combat |
| 6 | The Blackout | The government strike, red streetlights, security mobilises, escape through downtown | combat, chase |
| 7 | CIVIC | The core antechamber, a calm conversation | dialogue |
| 8 | The Truth | The signal beneath the city, fragments of originals | puzzle, hack |
| 9 | Civil War | Factions, riots, a battle to the core | combat set pieces |
| End | Bellwether | The choice, both endings, the question | choice |

## Build status

All chapters are playable from New Game through to the credits. In code: `src/levels/prologue.ts`, `ch1.ts` … `ch9.ts`, `finale.ts`.

- **Ch 5 Ellie:** Maple Street and the Vale house.
  - Letters, height marks, Ellie's room, dinner.
  - The strike turns every light red.
- **Ch 6 The Blackout:** Harbor Avenue in red.
  - Frozen citizens turn to watch you; stopped traffic.
  - Roadblock fight, the locked-out mother and son, a maintenance unit.
  - Standoff at Union Station.
- **Ch 7 CIVIC:** the tower lobby and the floor 212 core. A calm conversation with two dialogue choices.
- **Ch 8 The Truth:** the Bellwether Array at level −40.
  - Three relay hacks, each revealing an echo of an original.
  - Original-Ellie's voice; the broadcast leak.
- **Ch 9 Civil War:** Founders Boulevard.
  - Returners and Remainers argue in the street.
  - A barricade battle with free citizens firing beside you, then heavy units.
  - Ellie finds you.
- **Finale:** the reveal, then the choice (`Hud.choice`).
  - **Bring them home** or **Let Bellwether live**, each with its own epilogue.
  - The closing question card (`Hud.question`), then credits.
