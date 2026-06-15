# 03 — GAMEPLAY & SYSTEMS  ⭐ (THIRD MOST IMPORTANT)
### Controls, the core loop, the signature mechanics, and how the hour plays out

---

## Design philosophy
*Fears to Fathom* is not an action game. There is **no combat, no weapons, no
health bar.** You walk, you look, you interact, you text, you comply — and the
tension comes from realism, agency in small things, and dread in large ones.
Small Hours keeps that, and adds **one new core verb that no horror game has built
a whole game around: _sleep._** You are most powerful when awake and watching, and
the game is constantly asking you to surrender both.

---

## Controls (PC primary; full controller parity)

| Input | Action |
|---|---|
| WASD | Move (slow, tired, human; no sprint until panic — see Panic) |
| Mouse | Look (handheld sway; sensitivity drops under stress) |
| LMB / E | Interact / pick up / hold |
| RMB | Focus-look (racks DOF, reads small text, *and* is silently logged — see Surprise) |
| Hold **Space** | **Breathe** (the sleep mechanic — see below) |
| Tab | Phone |
| Shift | Steady your breathing (panic suppression) |
| C | Crouch / press ear to a surface to listen |
| Mouse wheel | Lean (peek around frames without exposing your body) |

Movement is deliberately *weighty and slow.* You cannot sprint freely; you are
exhausted, half-sedated, and tethered. This is a horror choice, not a limitation.

---

## The core loop

```
   ARRIVE → COMPLY (get wired up) →  ┌─────────────────────────────┐
                                     │   BREATHE-TO-SLEEP          │
                                     │        ↓                    │
                                     │   UNDER (dream / paralysis) │
                                     │        ↓                    │
                                     │   WAKE (room has changed)   │
                                     │        ↓                    │
                                     │   EXPLORE / READ THE EEG /  │
                                     │   RESIST THE TETHER         │
                                     └──────────┬──────────────────┘
                                                │ (escalates each cycle)
                                                ↓
                              BREAK OUT → BEHIND THE GLASS → ENDING + FEAR PROFILE
```

Each pass through the cycle escalates: the dreams get longer and less safe, the
room changes more, the filter degrades, the EEG spikes harder, and the tether
costs more to keep on.

---

## Signature mechanic 1 — **Breathe-to-Sleep (the Hypnagogia system)**

Falling asleep is something you *do*, with rhythm, not a cutscene.

- **Hold Space to exhale; release to inhale.** An on-screen breath guide (a soft
  expanding/contracting vignette + a low diegetic tone) sets a pace. Match it and
  your vision tunnels, the heartbeat slows, the screen softens — you go **under.**
- **It's a trust exercise the game weaponizes.** Sleeping is surrender. The longer
  you sleep, the longer the *under* sequence — and the more the room changes when
  you wake. But you *have* to sleep (the money, the locked doors, the EEG that
  flatlines "incomplete" if you never go under). You are forced to be vulnerable on
  a schedule.
- **Micro-sleeps:** late in the night, exhaustion forces involuntary blinks —
  1–2 second screen-blinks where, on each close-open, the world has *shifted* (the
  Visitor closer, an object moved). The player learns to fear the blink.
- **The faked wake:** sometimes you "wake" (filter stabilizes, cold blue returns)
  but you're still under — and the only tell is the **clock** (see below). Teaching
  the player to verify reality with a single trustworthy object, then making even
  that lie, is the dread spine of the whole hour.

---

## Signature mechanic 2 — **The EEG / Polysomnograph as your dread-meter**

Through the one-way glass (and on a small bedside readout) runs a **live EEG
waveform.** It is the only early-warning system you get.

- A calm trace = you're alone. A specific **spindle-and-spike pattern** precedes
  the Visitor. Learning to read it is survival — *the monitor knows before you do.*
- It is **diegetic** (no abstract meter floats on screen — you must choose to look
  at the readout, which means looking *away* from the room).
- It lies in dream states (flat when it shouldn't be), so trusting it is itself a
  risk. A correct read of "this trace is impossible" is how a savvy player detects
  a faked wake.
- A working browser version of this exact waveform + spike behavior drives the
  proof-of-concept ([`../poc/`](../poc/)).

---

## Signature mechanic 3 — **The Tether ("do not remove the sensors")**

You are physically wired to the bed. The wires are a **leash with a radius.**

- Move within radius: fine. Reach the edge: the leads **tug**, the harness pulls
  your skin (a wince SFX + a screen-edge tension cue), the EEG flags movement, and
  Vane's voice gently corrects you ("stay in the bed for me, champ").
- **To explore past the radius you must remove sensors** — but every sensor you
  pull is money lost ("incomplete session, no payout") *and* a step toward the
  panic threshold *and* logged. The game makes you weigh **fear vs. rent**, in
  real time, which is the entire thesis of the story expressed as a mechanic.
- Removing the IV is the point of no return for the "escape" branch. Leaving it in
  is the slow road to "Retained." The player chooses the ending with their hands,
  not a menu.

---

## Signature mechanic 4 — **Sleep paralysis (eyes-only)**

The scariest sequences. You wake *unable to move your body.* The only input that
works is **the mouse (your eyes/camera).** No WASD. No interact. You can only
*look* and *endure*, and:

- **What you look at matters.** Looking directly at the Visitor freezes it (Art
  Bible §5) but ratchets the EEG and the fear score; looking away lets it move but
  spares you the spike. There's no "right" answer — only the choice of *how* you're
  afraid, which the game is quietly recording (Surprise).
- Duration is player-tunable in accessibility (default ~20–40s; it feels like
  minutes). Steadying your breath (Shift, even though you can't move) shortens it —
  reintroducing tiny agency into total helplessness, which is more frightening than
  pure passivity because *you're complicit in enduring it.*

---

## Signature mechanic 5 — **Panic** (the only "fail-ish" state, and it's a story branch)

There is no death screen. Instead, fear accumulates:

- Sensory stress (the Visitor close, a blackout, the chase) raises a hidden
  **panic value.** High panic = breath ragged (audible), vision narrows, hands
  shake (interactions get harder), and you *can* finally run — clumsily.
- Cross the threshold and you **break**: you tear everything off in a reflex you
  don't fully control → routes the story toward "Incomplete Session" (Vane sedates
  you). It's not a game-over; it's *an ending,* and a believable, human one.
- **Hold Shift / breathe (Space)** to suppress panic — the same verbs that put you
  to sleep now keep you sane. Elegant economy: the game has two real verbs (move,
  breathe) and breathing means three different things depending on the moment.

---

## The phone (the texting charm + a horror device)

- Mundane realism early (Tab to read texts from Maya, Mom, the landlord; the bank
  app; the original ad). Replying is choice-based, lightly characterizing.
- Your **only portable light** once the fluorescents fail — and the battery drains,
  so you ration looking at it (looking at the phone = not looking at the room).
- Turns against you: phantom buzzes, wrong timestamps, messages from "Maya" that
  arrive while the phone is in your hand and didn't vibrate, finally a call from
  your own number. The player who *checks timestamps* catches the horror early;
  the player who just wants the comfort doesn't — and the game knows which you are.

---

## Exploration, puzzles, and "agency in small things"

No keys-in-locks adventure-game busywork. Progress is environmental and *earned by
attention*:
- Notice the **ajar ceiling tile** (set up in Act 1) → the vent route out.
- Time your move for when **Vane leaves his post** (readable through the glass).
- Use the **EEG** to know when it's safe to cross the room.
- Read the **clock** to know if you're really awake.
- Find the **fire door** someone propped with a wedge (a previous subject who
  didn't make it — environmental storytelling as a puzzle clue).

The puzzles are all *perception* puzzles: the game rewards looking, listening
(press ear to the wall, C), and remembering. That is fully in the *Fears to
Fathom* tradition.

---

## How the hour actually plays out (compressed)

| Time | Player is doing | Feeling |
|---|---|---|
| 0:00–0:08 | Drive, check in, read/sign forms, phone texts | Mundane, tired |
| 0:08–0:18 | Get wired up, learn rules, meet Vane | Trust, mild unease |
| 0:18–0:30 | First breathe-to-sleep, gentle dream, wake to small wrongness | The fuse lit |
| 0:30–0:42 | First paralysis, the room changes, tether starts to cost, phone turns | Dread |
| 0:42–0:54 | Break the radius, find the route, cross into the observation room, the reveal | Terror + understanding |
| 0:54–1:00 | The "shoot"/escape, branch resolves, drive home OR retained | Gut punch |
| credits | **Fear Profile end-card** (the Surprise) | *Oh.* |

Full beat sheet: [`06_PACING_THE_HOUR.md`](06_PACING_THE_HOUR.md).

---

## Replayability (and why a second run is a *different* game)
- **Three endings** driven by behavior, not menus.
- The **Fear Profile** (Surprise) makes every player's ending feel authored *for
  them*, and a second playthrough where you deliberately behave differently is
  visibly acknowledged by the system.
- A planned **New Game+ ("The Other Side")** flips perspective: you play **Vane's
  shift**, watching a subject through the glass — and the subject's behavior is a
  compressed replay of *your first playthrough.* You grade your own past fear. (See
  the Surprise doc; this is the single most novel structural idea in the project.)

---

## Accessibility & comfort (because "highest quality" includes this)
- Filter-intensity slider (grain/aberration/scanlines independently dialable).
- Paralysis duration slider (down to "brief"); a "skip paralysis" toggle that
  swaps the sequence for a non-interactive cutscene of equal story value.
- Photosensitivity-safe mode (caps flicker/strobe frequency, softens blackouts).
- Full subtitles + closed captions for the all-important sound design.
- Content warnings on launch (medical settings, needles, helplessness, the meta
  features) and **explicit opt-in** for every personalized/meta element (Surprise).
- Remappable everything; controller parity; a "reduce motion" option for the
  handheld camera sway.
