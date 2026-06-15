# 05 — PRODUCTION PLAN
### Engine, tools, team, schedule, audio, scope control, accessibility

---

## Target & platform
- **Single-player**, ~60 minutes, narrative horror, no combat.
- **PC first** (Steam), Unreal Engine 5.4+. Console port (PS5/Xbox Series) feasible
  post-launch — the camcorder downscale makes performance forgiving.
- Price point in the indie-horror band ($7–13), the *Fears to Fathom* model:
  premium-but-cheap, episodic, word-of-mouth driven.

## Scope control (how we actually hit ~1 hour and ship)
The hour is built from **one hero set re-used in many states** — the single most
important scope decision:
- **One building** (the Ashgrove Sleep Center): waiting room, corridor, sleep room
  (your stage), observation room, basement. ~5 spaces.
- The **sleep room is re-dressed** for every dream/decay state (Art Bible §8)
  instead of building new levels — the horror *and* the budget both benefit.
- **~4 hero humans** (Eli's hands, Vane, Renata, the Long Subject) + the Visitor +
  a couple of background subjects. Character work is where the money goes (the
  brief's #1 priority), so the environment count is kept deliberately tight.
- No combat, no inventory system, no crafting — the verbs are *move, look,
  interact, breathe, text.* Tiny surface area, deep polish.

## Team (lean, ~6–8 + contractors), 12–14 months
| Role | Count | Focus |
|---|---|---|
| Creative director / writer | 1 | Story, the Surprise system, pacing |
| Character artist | 1–2 | The hero humans + the Visitor (the #1 priority) |
| Environment artist | 1 | The clinic + decay states |
| Technical artist | 1 | The degradation shader, skin shader, dream-decay tech |
| Gameplay/systems engineer | 1–2 | Loop, breathe/EEG/tether/paralysis, the Profiler |
| Audio designer/composer | 1 | Binaural sound (arguably co-#1 with character art) |
| QA / accessibility | 1 (+ external) | The meta features need careful, ethical QA |
| Contractors | — | Facial mocap, VO (Vane, Renata, Maya), additional sculpting |

## Milestones
1. **Vertical slice (M0–M3):** the sleep room, Vane wired-up scene, one breathe-
   to-sleep → paralysis → wake cycle, the degradation shader, one hero skin shader
   shipping. *Proves the look and the loop.* (The browser POC is a pre-viz of this.)
2. **First playable / full grey-box (M3–M6):** all five spaces, full beat flow,
   placeholder art, the Profiler logging end-to-end, the end-card generating.
3. **Content complete (M6–M10):** all hero characters final, all texturing, audio
   pass, the three endings, The Other Side (NG+).
4. **Polish & cert (M10–M14):** the filter-escalation tuning, accessibility, the
   ethics/opt-in flows, localization, performance, festival build.

## Audio (treat as co-most-important with character art)
Horror is 60% sound. Plan:
- **Binaural / HRTF** spatialization — directionality is survival (you listen at
  walls, behind the glass, for Room 4).
- **The body:** your own breathing (coupled to the Space mechanic), heartbeat in
  the dread band (~40–80 bpm, rising), the wet inhale of waking, the adhesive peel
  of pulling a sensor, the gel squelch, the IV tape.
- **The room:** fluorescent 60Hz hum, the water cooler, the camera's faint servo,
  the EEG pen, the vent, the clinic's HVAC breathing.
- **The dread band:** sustained content in 0.5–4kHz, infrasound-adjacent low end
  for unease, and — crucially — **silence** as the loudest tool (cut everything a
  beat before the Visitor).
- **Vane's voice** on the room speaker: warm, close-mic'd, ASMR-adjacent, which is
  exactly what makes it unbearable.
- **Music:** almost none. A single detuned tone motif; a music box for Maya/home
  that sours. The *Fears to Fathom* restraint.

## Risk register (top items)
| Risk | Mitigation |
|---|---|
| Hero faces fall into the uncanny valley *the wrong way* | MetaHuman rig + the camcorder filter; always review faces *through* the filter; Vane's wrongness is *designed*, not accidental |
| The meta/Profiler reads as gimmicky or creepy-invasive | Strict local-only + opt-in (Surprise §ethics); make it *insightful*, never accusatory about the real person |
| 1-hour scope balloons | One building, re-dressed; ruthless verb minimalism |
| Paralysis/helplessness alienates players | Tunable duration + skip toggle; agency-in-breathing keeps it interactive |
| Real-clock/file-on-disk features trip platform/AV flags | Sandboxed save dir, clearly disclosed, fully optional |

## Tech artifacts already in this repo
- The degradation post-process shader: [`../tech/shaders/SmallHours_PostProcess.hlsl`](../tech/shaders/SmallHours_PostProcess.hlsl)
- Skin shader build notes: [`../tech/shaders/SkinShader.md`](../tech/shaders/SkinShader.md)
- UE5 project structure & naming: [`../tech/project_structure.md`](../tech/project_structure.md)
- Playable proof-of-concept: [`../poc/`](../poc/)
