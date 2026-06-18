# 🫘 Bean Royale

A bite-sized, browser-based tribute to **Fall Guys: Ultimate Knockout** — built in
plain vanilla JavaScript on an HTML5 canvas (no build step, no dependencies).

Dive, bounce, jump and grab your way through a four-round **Show**. The field of
20 beans shrinks each round until one bean grabs the **Crown**.

## ▶ Play

Just open `index.html` in any modern browser. That's it.

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

```
index.html          entry point, loads scripts in dependency order
css/style.css        page + loading-screen styling
js/config.js         tuning constants + all game data (rounds, cosmetics, emotes, trophies)
js/utils.js          math / RNG / geometry / canvas helpers
js/input.js          keyboard + mouse
js/save.js           localStorage profile + achievement logic
js/entities.js       Bean (player + AI physics, ragdoll, render) + obstacle classes
js/rounds.js         Round state machine + AI brains + the four course builders
js/ui.js             menus, customise, HUD and overlay screens
js/game.js           boot, main loop, screen state machine, Show progression
```

## 🧪 Tests

A headless smoke test mocks the canvas/DOM, runs every round to completion and a
full Show through the real pipeline, and renders every cosmetic — catching runtime
errors, NaN physics and balance regressions without a browser:

```
node test/smoke.js
```
