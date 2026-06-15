# Small Hours — Proof of Concept

**Open `index.html` in any modern browser.** No build, no dependencies, no network.

A ~4-minute playable vertical slice that proves the three things the design promises
are real (not just words in a doc):

1. **The degraded-media filter** (`js/filter.js`) — VHS chroma split, scanlines,
   grain, green grade, head-switch noise band, tracking tears, and a diegetic
   REC/timecode HUD bound to your **real system clock**. Browser sibling of
   [`../tech/shaders/SmallHours_PostProcess.hlsl`](../tech/shaders/SmallHours_PostProcess.hlsl).
2. **The core loop** — breathe-to-sleep + the EEG dread-meter + a sleep-paralysis
   beat where the only thing you can move is your eyes.
3. **The Surprise** (`js/profiler.js`) — it quietly profiles *how you play* and
   reads it back to you in a clinical report at the end. Play twice, behave
   differently, and the clinic *remembers you.*

## Controls
| Input | Does |
|---|---|
| **Mouse** | Look / click buttons. In paralysis, this is your *eyes* — center = looking at it, edges = looking away. **What you do is logged.** |
| **Hold SPACE** | Breathe (in the sleep stage) to fall asleep. |
| **SHIFT** | Steady your breathing during paralysis. |
| **M** | Mute / unmute. |

## Flow
title → drive up → consent form *(do you read page 4?)* → wiring-up & the rules →
**breathe to sleep** → **sleep paralysis** *(look at it, or away?)* → behind the
glass *(the reveal)* → **your Fear Profile.**

> This is a *mood-and-mechanics* slice. Final-game character fidelity (MetaHuman
> humans, real skin/eye shaders) is impossible to author in a zero-asset browser
> page — that AAA target lives in [`../docs/01_ART_BIBLE.md`](../docs/01_ART_BIBLE.md).
> Everything here runs locally; nothing is uploaded. Clear the "clinic remembers
> you" data anytime with the **DELETE RECORD** button on the end-card.
