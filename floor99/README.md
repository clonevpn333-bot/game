# FLOOR 99

**THE AUDIENCE WANTS A SHOW.**

A cinematic third-person action game show for the browser, built from scratch in three.js.
You are Contestant 99, dropped into a 99-floor televised death-tower. Each floor is a
different action set piece. The audience votes to change the arena while you fight, and the
host, Mr. Halo, comments on everything you do.

Nothing is pre-made: every model, animation, texture, sound effect and piece of music is
generated procedurally in your browser. There are no asset downloads and no build step.

## Run it

**Easiest:** open `dist/floor99-performance.html` (fast, no shadows/bloom) or
`dist/floor99-cinematic.html` (shadows, bloom, higher resolution) in Chrome, Edge or Firefox. Each is
the whole game in one self-contained file (three.js, code, styles, fonts and the recorded voice clips
inlined), so it needs no server and no install. The **⧉ BLOB LINK** button (top-right on the boot and
menu screens) re-opens the game from a `blob:` URL and can save a copy.
To rebuild after changing the source: `npm i -D esbuild && node tools/build-single.mjs`.
From source, add `?fast` to the URL for the performance profile.

**From source:**

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
Right mouse: a click toggles aim (two-finger click on a trackpad), holding it aims while held.
`B` hides the studio chat. `F8` opens the Animation Studio (inspect every clip, grip and IK target).

## What's in this build

| Floor | Status | Highlights |
| --- | --- | --- |
| 1 — Welcome To The Show | **Playable** | Holding cell → arena drop, tutorial-through-action, sponsor drops (shotgun, double jump), SkyCams, the first audience vote (hydraulic pistons or a spinning stage with sweeper arms), the Bruiser, Iris's first transmission, then the studio is demolished by giant presses and you escape through a gauntlet (slam press, slide-under press, moving platform over a pit) to the elevator. |
| 2 — The Cleanup Crew | **Playable** | Service level: a road-case arena against the "cleanup crew", the AD-BREAK SMG, a laser security sweep, and Scrub-O-Matic stations hiding 98 sets of scorch marks. |
| 3 — The Locker Room | **Playable** | Contestant lockers 01–98, a shower-block laser grid, the WARDROBE CHECK spotlight hold, and the Bruiser on the catwalks. Locker 98 is welded shut. |
| 4 — The Factory | **Playable** | Conveyor belts that carry you, hydraulic presses, robotic arms that swat, a fabricator building Clankers on the line, molten-metal channels, a crane pouring a crucible, catwalks, the gravity-cannon prototype, the stamping hall, and **The Foreman**, a ceiling-rail boss with breakable arms. Then the factory tears itself apart. |
| 5 — The Floor Is Lava | **Playable** | A checkerboard game-show set over real lava: stepping stones, moving platforms, grapple rings, drones, the CONFETTI CANNON (arcing party bombs), and a winner's-spot hold. |
| 6 — Neon District | **Playable** | Billboards, neon and parked cars; smash three AD TOWER relays (Iris learns every "viewer" comes from one server), a spinning laser show, then a Bruiser street fight. |
| 7 — The Archive | **Playable** | Dark shelves and banker lamps, Stalkers, data vaults, a 25-second download hold, and the discovery that every contestant file reads RETAINED. |
| 8 — The Boiler Room | **Playable** | Conveyor belts that push you back under presses, timed steam jets, the furnace crew, and three pressure valves to blow (the studio lights flicker; there's a door marked RETENTION). |
| 9 — The Vents | **Playable** | No cameras: lights-out duct mazes with a flashlight and glowing arrows, Stalkers, a drone nest, an exit laser grid, and Iris finally talks about her brother. |
| 10 — Act One Finale | **Playable** | The main stage with hologram audience balconies, a spotlight hold, and **The Co-Host**: Halo's body double on speaker-stack legs. Break its speakers, shoot its screen; jump/slide its spotlight beam, jump the stomp shockwave, dodge the confetti mortar. Unlocks the PRIME-TIME SPOTLIGHT beam gun. |
| 11 — Security | **Playable** | Wall and ceiling turrets to disable, a lockdown laser grid, and the Security Chief. Iris loops the camera feeds and finds Floor 13 is hidden, not skipped. |
| 12 — Aquarium Apocalypse | **Playable** | Gallery of giant tanks with schools of fish, a glass tunnel the shark swims over, the rigged "SHATTER THE GLASS" vote, a flooding chamber (robots short-circuit, debris and containers float), swimming, the railgun, and **Megamouth-9**, a mechanical shark that leaps out of the water at you. |
| 23, 38, 51, 76, 90, 99 | Designed, **not built** | Shown as "in production" in Floor Select. |
| 13 — The Machine Level | **Playable** | The floor that doesn't exist: server racks, vote servers to smash, an upload hold, and the reveal that the "audience" is generated here to train something. |
| 14 — The Greenhouse | **Playable** | Grow-light hydroponics, an acid nutrient vat to cross, a pollination hold and irrigation pumps. Every crate ships to "the Family Suites". |
| 15 — The House Always Wins | **Playable** | Halo's casino: slot banks, card tables, a plasma high-roller pit, SPIN THE WHEEL, and two Bruisers. One server places every bet. |
| 16 — Cold Storage | **Playable** | Slippery ice floors, 98 numbered cryo pods (all empty), the ARC CASTER (chain lightning), cryo turrets, and the log line "minds: retained". |
| 17 — Studio Kitchen | **Playable** | Cooking With Halo: sushi conveyor belts, the tenderizer press hall, and a plating hold judged by Halo. |
| 18 — Broadcast Control | **Playable** | Walls of Halo monitors, turrets, transmitters, a firewall laser grid, and the edit logs: every winner walks into a white room and the feed cuts. |
| 19+ | Not built yet | Being built five at a time on the procedural floor system (`src/floors/proc.js`). |

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
