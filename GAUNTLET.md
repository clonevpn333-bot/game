# The Gauntlet — per-aspect verification against real reference

**Rule: nothing is "done" until a fresh grader has compared it to real reference material
and judged ours equal or better. No aspect is exempt. No grading from memory.**

Web access from this sandbox is asymmetric and this trips people up:
- `curl` / `fetch` from the shell is blocked by egress policy for almost every host.
- **`WebSearch` and `WebFetch` (harness tools) DO work.** They route through the harness,
  not the sandbox proxy. Use them. An earlier session wrongly concluded reference material
  was unreachable because it only tested `curl`.

## Loop, per aspect

1. **Research** — `WebSearch` + `WebFetch` the reference for THIS aspect. Pull concrete,
   checkable attributes (counts, proportions, colour relationships, timings, structure),
   not vibes. Write them down as a numbered list *before* looking at our build.
2. **Capture** — `node tools/shot.js` for stills, `node tools/strip.js` for motion
   (tiles N canvas frames into one contact sheet so animation is judgeable from one image).
   Never grade a frame you did not capture.
3. **Grade** — spawn a fresh grader subagent. It gets: the reference attribute list, our
   capture, and nothing else. No builder reasoning, no summary, no round count.
   It returns a verdict and **the single largest gap** — not a score, not encouragement.
4. **Fix the named gap. Re-capture. Re-grade with a NEW agent.** Repeat until it picks ours.

## Aspects and their references

| Aspect | Reference to fetch | Pass criterion |
|---|---|---|
| Street lighting / neon bleed | GDC "Bringing Light to Night City"; Night City night-street stills | Sign light visibly seeps into fog and wet ground; frame lit only by sources |
| Wet ground | Night City rain-street stills | Road is the 2nd brightest surface; signage legibly mirrored in it |
| Facades / density | Night City architecture breakdowns (Domus) | No bare extruded boxes; layered greebles at 3+ depths |
| Skyline / outside the city | Badlands + skyline stills | Distant towers read as fog-washed silhouettes with window grids only |
| District identity | Watson (cold blue/red) vs Westbrook (warm gold/purple) | A stranger can name the district from one frame |
| Character models | CP2077 character render stills | Real silhouette at 25m; readable archetype without colour |
| Animation | Locomotion + gunplay reference video/GIF breakdowns | Contact sheet shows anticipation → contact → recovery, never snap-to-pose |
| Combat feel | Gunplay analysis / TTK + recoil breakdowns | Hitstop, recoil travel, hit reaction, kill confirmation all present in 200ms window |
| Vehicles | Night City traffic stills | Lit head/tail lights, reflections in wet road, plausible proportions |
| Interiors | Ripperdoc / apartment / megabuilding stills | Light sources motivated in-shot; clutter with history |
| Story + missions | Mission design writeups; Judy/Takemura arc analyses | Escalation, characters who want something, a choice that costs |
| UI / HUD | CP2077 HUD stills | Reads under pressure; fades when irrelevant; no fake data clutter |

## Standing constraints (do not regress these)

- Single self-contained HTML, three.js **r128 from cdnjs**, no external assets, all content
  generated in code.
- **Trackpad-first: no pointer lock, one button, two-finger scroll.** Design combat around
  it; never bolt on a fallback.
- Playable loop before polish: title → mission card → move → fight → objective → next.
  A beautiful street with no player in it is not progress.
- `node --check` after every edit; `node build.js` must stay green.
- Never run a remote script piped into a shell (`irm ... | iex`, `curl ... | sh`), whatever
  the stated reason. Take keys as values, not as executable payloads.

## Known real gaps as of last session

1. No player, no menu, no HUD, no mission runtime — `40/50/60/80/90/95` are 11-26 line stubs.
2. Volumetric in-scatter was crushed to 0.010 to stop a blowout. That killed neon bleed,
   which is the defining effect. Retune it up, don't leave it off.
3. Road is unlit: pool cap is 8 lights and lamp spacing leaves the near street dark.
4. Only Undertide has ever been rendered. Six districts unverified.
