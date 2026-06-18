# 🫘 Bean Royale 3D

A bite-sized, browser-based **3D** tribute to **Fall Guys: Ultimate Knockout**,
built with [Three.js](https://threejs.org). Procedurally-modelled jelly-bean
characters with full procedural animation, real-time lighting + shadows, 3D
obstacle courses, a chase camera, AI rivals, deep cosmetics and trophies.

Dive, bounce, jump and grab your way through a four-round **Show**. A field of
20 beans shrinks each round until one bean grabs the **Crown**.

## ▶ Play

The whole game is a **single self-contained file** — just open `index.html`
in a modern browser. Three.js is loaded from a CDN via an import map, so the
first load needs an internet connection (everything else is inlined).

## 🎮 Controls

| Action   | Keys                                   |
|----------|----------------------------------------|
| Move     | `W A S D` / Arrow keys                 |
| Jump     | `Space` — hop the sweepers & low bars  |
| Dive     | `Shift` — a fast lunge (slow recovery) |
| Grab     | `J` / `L` — grab a rival, release to fling |
| Gesture  | `1` `2` `3` `4` — your equipped emotes  |
| Menu     | `Esc`                                  |

## 🏁 The Show

- **Door Dash** *(Race)* — smash the fake doors, bounce off the real ones.
- **The Whirlygig** *(Race)* — weave through spinning bars and swinging hammers.
- **Jump Club** *(Survival)* — time your jumps over the ramping sweeper.
- **Hex-A-Gone** *(Final)* — tiles vanish under your feet; last bean takes the Crown.

## 🎨 Customise & 🏆 Trophies

Mix **Colours, Patterns, Faceplates** and **Upper/Lower costumes** across five
rarity tiers (each rendered live on a rotating 3D bean preview), and set a
four-slot **gesture loadout**. Crowns, win streak and trophies (incl.
*Infallible*, *Head Turner*, *Big Tease*, *Flawless*) persist to `localStorage`.

## 🧱 How it's built

`index.html` is one file. Between the `GAME:START` / `GAME:END` markers it's a
single ES module (`import * as THREE from 'three'`) organised into labelled
sections that share module scope:

```
config / utils / input / save   data, helpers, controls, persistence
entities                         Bean + obstacle simulation (physics, ragdoll, AI hooks)
rounds                           Round state machine + AI brains + 4 course builders
view_bean                        procedural 3D bean model + all animations
view_world                       lights / sky / shadows + 3D obstacles + course geometry
game                             headless Show/round controller
ui                               DOM overlay: menus, customise, HUD, result screens
engine                           Three.js renderer/scene/camera/loop + glue + preview
```

The simulation is rendering-agnostic; the engine maps logical top-down
coordinates `(x, y, height)` into Three's Y-up world `(x, height, y)` and lets
each view position/animate itself.

## 🧪 Test

A headless test extracts the inlined module from `index.html`, swaps the CDN
import for a local Three.js, stubs WebGL + the DOM, and drives a full Show
through the real engine loop (every round's 3D scene, every UI screen, the
preview, FX and camera):

```
npm install three@0.160.0
node test/artifact_test.js
```
