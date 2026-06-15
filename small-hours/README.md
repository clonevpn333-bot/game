# SMALL HOURS
### Episode One — *The Ashgrove Study*

> An original first-person psychological horror game in the spirit (and with the
> charm) of *Fears to Fathom*: mundane life, a relatable broke protagonist, a
> slow-burn night that turns wrong, and a gut-punch you carry home.

**Logline.** You are twenty, broke, and out of options, so you answer the ad:
*"Earn $1,200 in one night. Overnight sleep study. Healthy adults 18–30."*
All you have to do is show up at the Ashgrove Sleep Center, let them wire you to
a machine, and fall asleep. The catch is that someone is awake on the other side
of the glass, and they are not studying your sleep. They are studying **you.**

Target length: **~60 minutes**, single-player, no combat, narrative-driven.

---

## What's in this repository folder

This is a **design package + playable proof-of-concept**, organized by what the
brief asked for, in the order of importance the brief specified.

| Priority | Doc | What it covers |
|---|---|---|
| ⭐ MOST IMPORTANT | [`docs/01_ART_BIBLE.md`](docs/01_ART_BIBLE.md) | How the **humanoid models and textures** look and are built. Engine, MetaHuman pipeline, skin/eye/hair shaders, wardrobe, the degraded-media filter, environments, color script. |
| ⭐ 2ND | [`docs/02_STORY.md`](docs/02_STORY.md) | Full narrative, cast, lore, the twist, scene-by-scene script beats. |
| ⭐ 3RD | [`docs/03_GAMEPLAY_SYSTEMS.md`](docs/03_GAMEPLAY_SYSTEMS.md) | Controls, the core loop, the signature mechanics, and how the hour plays out. |
| ⭐ 4TH | [`docs/04_THE_SURPRISE.md`](docs/04_THE_SURPRISE.md) | **The thing no other AI has done.** (Spoiler-walled.) |
| — | [`docs/00_PITCH.md`](docs/00_PITCH.md) | One-page pitch / elevator version. |
| — | [`docs/05_PRODUCTION_PLAN.md`](docs/05_PRODUCTION_PLAN.md) | Engine, tools, team, schedule, audio, scope control to hit ~1 hour, accessibility. |
| — | [`docs/06_PACING_THE_HOUR.md`](docs/06_PACING_THE_HOUR.md) | Minute-by-minute beat sheet for the 60-minute playthrough. |
| — | [`tech/`](tech/) | Real artifacts: the post-process **shader code**, skin-shader notes, UE5 project structure. |
| — | [`poc/`](poc/) | **Playable browser proof-of-concept.** Open `poc/index.html`. |

## Play the proof-of-concept right now

```
small-hours/poc/index.html   →  open in any modern browser
```

No build step, no dependencies, no network — same philosophy as the rest of this
repo. The POC is a **mood-and-mechanics vertical slice**, not the final game. It
exists to prove three things are real and not just words on a page:

1. The **degraded-media post-processing pipeline** (VHS chroma bleed, head-switch
   noise, grain, chromatic aberration, timecode) — the *Fears to Fathom* "look."
2. The **breathe-to-sleep + EEG dread-meter** core loop.
3. **The surprise** — a system that quietly profiles *how you actually play* and
   reads it back to you at the end. See `docs/04_THE_SURPRISE.md`.

> Final-game character fidelity (MetaHuman-grade humans) is impossible to author
> inside a zero-asset browser page. The POC therefore proves the **feel and the
> mechanics**; the AAA character/texture target lives in the Art Bible.

---

*Anthology brand:* **Small Hours** — a planned series of standalone nights, each a
self-contained ~1-hour horror story. *The Ashgrove Study* is Episode One.
