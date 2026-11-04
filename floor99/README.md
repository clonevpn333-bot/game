# FLOOR 99

**THE AUDIENCE WANTS A SHOW.**

A cinematic third-person action game show for the browser, built from scratch in three.js.
You are Contestant 99, dropped into a 99-floor televised death-tower. Each floor is a
different action set piece. The audience votes to change the arena while you fight, and the
host, Mr. Halo, comments on everything you do.

Nothing is pre-made: every model, animation, texture, sound effect and piece of music is
generated procedurally in your browser. There are no asset downloads and no build step.

## Run it

You need Node 18+ (only to serve files; the game has no npm dependencies):

```bash
cd floor99
node tools/serve.mjs
```

Then open <http://localhost:8099>. Any static file server works (`npx serve`, `python3 -m http.server`).
Opening `index.html` directly from disk will not work, because ES modules need http.

Use Chrome, Edge or Firefox on a desktop. Headphones are recommended.

## Controls

| Action | Key |
| --- | --- |
| Move / sprint | `W A S D` / `Shift` |
| Jump · double jump · wall-jump | `Space` |
| Slide (while running), or slam-slide from the air | `C` |
| Dodge (invulnerable, also works in mid-air) | `Q` |
| Grapple to blue rings or any surface; chain-yank light robots | `E` |
| Melee (blade combo or Shock Hammer; hammer in mid-air = ground pound) | `F` / `V` / middle mouse |
| Fire / aim | left / right mouse |
| Reload | `R` |
| Weapons | `1 2 3` or mouse wheel |
| Pause | `Esc` |

Wall-run by jumping at a wall while holding `W`. Running at a ledge vaults over it automatically.
On a MacBook trackpad, a two-finger click aims. Sensitivity is in Settings.

## What's in this build

| Floor | Status | Highlights |
| --- | --- | --- |
| 1 — Welcome To The Show | **Playable** | Holding cell → arena drop, tutorial-through-action, sponsor drops (shotgun, double jump), SkyCams, the first audience vote (hydraulic pistons or a spinning stage with sweeper arms), the Bruiser, Iris's first transmission, then the studio is demolished by giant presses and you escape through a gauntlet (slam press, slide-under press, moving platform over a pit) to the elevator. |
| 4 — The Factory | **Playable** | Conveyor belts that carry you, hydraulic presses, robotic arms that swat, a fabricator building Clankers on the line, molten-metal channels, a crane pouring a crucible, catwalks, the gravity-cannon prototype, the stamping hall, and **The Foreman**, a ceiling-rail boss with breakable arms. Then the factory tears itself apart. |
| 12 — Aquarium Apocalypse | **Playable** | Gallery of giant tanks with schools of fish, a glass tunnel the shark swims over, the rigged "SHATTER THE GLASS" vote, a flooding chamber (robots short-circuit, debris and containers float), swimming, the railgun, and **Megamouth-9**, a mechanical shark that leaps out of the water at you. |
| 23, 38, 51, 76, 90, 99 | Designed, **not built** | Shown as "in production" in Floor Select. |
| All other floors | Not built | Shown as not yet built. |

The full design for every signature floor, the story and the ending is in [DESIGN.md](DESIGN.md).

### Systems

- **Movement:** acceleration-based running and sprinting, coyote time, jump buffering,
  variable jump height, double jump with a flip, momentum slides (faster down slopes),
  wall-running and wall-jumps, auto-vault and mantle, dodge rolls with i-frames and air
  dashes, a swinging grapple with pulls and slingshots, swimming with oxygen, moving-platform
  and conveyor carry, ice physics.
- **Arsenal:** Peacemaker revolver, Sponsor's Choice shotgun (10 pellets, shell reloads, pump
  animation), Ratings Rifle (bloom, physical magazine drops), Prime Time railgun (charge,
  pierces armour and shields), Applause gravity cannon (blast, grab, throw robots and barrels),
  Hardlight Blades (3-hit combo, lunge, deflects drone bolts), and the Shock Hammer
  (ground-pound shockwave). Each has its own model, recoil, sounds, tracers, shells and impacts.
- **Enemies:** Clanker (fast melee, pounces), SkyCam drone (telegraphed plasma, spirals down
  burning), Bruiser (armoured front, exposed core, charges into walls and stuns itself), Bouncer
  shield unit, Stalker (cloaks, dodges when aimed at), The Beast (summoned by the audience),
  Piranha-bots, The Foreman and Megamouth-9. Robots break apart into physical parts.
- **The Audience:** live votes with animated tallies (simulated crowd plus real spectator ballots),
  disasters, chaos events and gifts that change the arena: flood, low gravity, gravity reversal,
  barrel rain, meteor shower, lights out, double robots, release the beast, freeze (on Floor 12
  this freezes the water so you can walk on it), fire storm, moving laser grid, speed, giant mode,
  invincibility, free weapons, ammo. Floors add their own events: hydraulics, rotate the arena,
  accelerate or reverse the lines, molten overflow, shatter the glass, feed the sharks.
- **Mr. Halo and Iris:** an animated host face rendered live on HUD portraits and in-world
  screens, a priority dialogue queue with hundreds of contextual lines (no-repeat bags,
  tone shifting by floor), optional browser text-to-speech, and Iris's encrypted channel.
- **Soundtrack:** six original adaptive tracks synthesised live (industrial breakbeat, acid
  factory techno, liquid drum & bass, an orchestral and choir boss theme, lounge bossa). Layers
  crossfade through calm, combat, vote, disaster and boss states. Victory, death, vote and unlock
  stingers are included, and a soundtrack player is in the menu.
- **Progression:** a Contestant Lounge with Next Floor, Loadout, Wardrobe, Shop (fan currency,
  mods and cosmetics), Records, Jukebox, Floor Select and Challenge Variations. Floors are scored
  with stars, have checkpoints and instant retry, and can be replayed.

## Live spectator voting

Open `spectator.html` in another tab or window of the same browser while a floor is running.
When the audience votes, buttons appear there and every tap counts as a real ballot. This goes
through a `BroadcastChannel`. The `VoteSource` interface in `src/game/audience.js` is written so
that a WebSocket source for real online spectators or multiplayer voting can be added later.

## Project layout

```
index.html            app shell and UI markup
spectator.html        live voting booth (second tab)
css/main.css          broadcast-style UI
src/main.js           app flow: boot, menu, lounge, elevator, floors, death/complete
src/engine/           renderer + post FX, input, physics, particles/FX, procedural textures, materials
src/audio/            audio engine + SFX, adaptive music sequencer, composed tracks
src/game/             game session, player, model/animation, weapons, enemies, audience, events, host, dialogue, nav
src/floors/           kit (presses, hatches, movers, elevator...), floor01, floor04, floor12
src/ui/               HUD, menus/lounge panels, 3D backdrop scenes
tools/serve.mjs       zero-dependency static server
tools/smoke.mjs       headless boot + input smoke test (needs Playwright)
tools/playtest.mjs    headless full-floor bot playthrough (needs Playwright)
```

## Testing

`tools/playtest.mjs` drives the real player controller, weapons, physics and floor scripts
with an aim-assisted bot in fixed simulation steps. It logs objectives, deaths and console
errors, and saves screenshots:

```bash
node tools/playtest.mjs 1 420 shots/floor1
```

## Credits

three.js r170 (MIT). Fonts: Anton and Chakra Petch (SIL Open Font License, in `vendor/fonts`).
Everything else is original to this project.
