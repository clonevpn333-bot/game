# 🫘 Bean Royale

A bite-sized, browser-based tribute to **Fall Guys: Ultimate Knockout** — built in
plain vanilla JavaScript on an HTML5 canvas (no build step, no dependencies).

Dive, bounce, jump and grab your way through a four-round **Show**. The field of
20 beans shrinks each round until one bean grabs the **Crown**.

## ▶ Play

The entire game is a **single self-contained file** — just open `index.html` in
any modern browser. No build step, no external CSS/JS, nothing to install.

## 🎮 Controls

| Action   | Keys                                   |
|----------|----------------------------------------|
| Move     | `W A S D` / Arrow keys                 |
| Jump     | `Space` — hop the sweepers & low bars  |
| Dive     | `Shift` — a fast lunge (slow recovery) |
| Grab     | `J` / `L` — grab a rival, release to fling |
| Gesture  | `1` `2` `3` `4` — your equipped emotes |
| Pause/Menu | `Esc`                                |

## 🏁 The Show (round types)

- **Door Dash** *(Race)* — smash the fake doors, bounce off the real ones, reach the finish.
- **The Whirlygig** *(Race)* — weave through spinning bars and swinging hammers.
- **Jump Club** *(Survival)* — time your jumps over the ramping sweeper or kiss the slime.
- **Hex-A-Gone** *(Final)* — tiles vanish under your feet; the last bean bouncing is crowned.

## 🎨 Customise & 🏆 Trophies

Mix **Colours, Patterns, Faceplates** and **Upper/Lower costumes** across five rarity
tiers, and set a four-slot **gesture loadout**. Progress, crowns, win streak and
trophies (incl. *Infallible*, *Head Turner*, *Big Tease*, *Flawless*) are saved to
`localStorage`.

## 🧱 Project layout

Everything ships in one file. Inside `index.html`, between the `GAME:START` /
`GAME:END` markers, the code is organised into labelled `<script>` sections
(shared global scope, loaded in dependency order):

```
index.html  ── the whole game in one file:
  <style>      page + loading-screen styling
  config       tuning constants + all game data (rounds, cosmetics, emotes, trophies)
  utils        math / RNG / geometry / canvas helpers
  input        keyboard + mouse
  save         localStorage profile + achievement logic
  entities     Bean (player + AI physics, ragdoll, render) + obstacle classes
  rounds       Round state machine + AI brains + the four course builders
  ui           menus, customise, HUD and overlay screens
  game         boot, main loop, screen state machine, Show progression
```

## 🧪 Tests

A headless smoke test extracts the inlined scripts straight from `index.html`,
mocks the canvas/DOM, runs every round to completion and a full Show through the
real pipeline, and renders every cosmetic — catching runtime errors, NaN physics
and balance regressions without a browser:

```
node test/smoke.js
```
