# Breachpoint

A 5v5 tactical shooter that runs entirely in a browser tab. Bomb defusal, a buy
phase, learnable spray patterns, wall penetration, smokes that actually block
vision, bots, and peer-to-peer multiplayer with short room codes.

**The whole game is one file: `index.html`.** Open it and play. No install, no
build step to run it, no CDN, no asset downloads, no accounts.

---

## Playing

Open `index.html` in Chrome, Edge, Firefox or Safari. Or host the file anywhere
static (GitHub Pages, a USB stick, a school network share) and open the URL.

| | |
|---|---|
| Move | `W` `A` `S` `D` |
| Jump / crouch | `Space` / `Left Ctrl` |
| Walk silently | `Left Shift` |
| Fire / secondary fire | `Mouse 1` / `Mouse 2` |
| Reload | `R` |
| Buy menu | `B` |
| Plant, defuse, pick up | hold `E` |
| Weapon slots | `1` `2` `3` `4` `5`, scroll wheel, `Q` for last |
| Drop weapon / inspect | `G` / `F` |
| Scoreboard | hold `Tab` |
| Chat (all / team) | `Y` / `U` |
| Push to talk | `V` |

Every key is rebindable in Settings → Controls.

### Modes

- **Competitive** — MR12, first to 13, halftime at 12, optional overtime, full economy.
- **Casual** — first to 9, free armour, friendlier economy.
- **Deathmatch** — respawns, free weapons, ten minutes.
- **Practice** — bots, unlimited money, longer rounds.
- **Aim training** — pop-up targets on a range, with accuracy and reaction stats.

### Multiplayer

Create a match and you get a five-character room code. Friends enter it on the
main menu. Connections are browser-to-browser over WebRTC — game traffic never
touches a server; only the initial handshake goes through a public signalling
broker.

Voice chat is a separate peer-to-peer audio mesh with push-to-talk and a
team-only option.

> **On locked-down networks:** some school and corporate firewalls block
> peer-to-peer traffic outright. If a friend cannot connect, everything else —
> every mode, every map, every weapon — still works offline against bots.

---

## What is in it

**Gunplay.** Twenty-five weapons across pistols, SMGs, rifles, snipers,
shotguns and LMGs, each with its own damage, falloff curve, armour penetration,
wall-penetration power and movement speed. Every automatic weapon has a fixed,
learnable spray pattern — the same 30 shots every time, so practice pays off.
Standing still and crouching tighten your cone; running and jumping wreck it.
Headshots, four hit zones, armour and helmets, and armour-piercing values that
make the buy menu a real decision.

**Utility.** Smokes that block line of sight for real (including for bots),
flashbangs whose blindness depends on angle and distance, HE grenades with
line-of-sight falloff, and molotovs that spread fire across a limited patch of
ground and get extinguished by smoke. Grenades bounce off geometry with proper
physics, and support full throws, lobs and underhand tosses.

**Maps.** Three original competitive layouts — **Bazaar** (three lanes, long A,
tunnel B, mid doors), **Foundry** (vertical, catwalks, wallbangable sheet metal)
and **Villa** (tight courtyards, short rotations, balcony angles) — plus an
**Arena** training range. Each has two bombsites, mid routes, defender-side
power positions and callouts on the radar.

**Bots.** Four difficulty tiers that change perception and aim, never physics —
bots obey the same movement, recoil and accuracy rules you do. They buy by
economy, commit to a site as a team, rotate to gunfire and teammate deaths,
throw smokes and flashes before executing, plant, defuse, and control their
spray in proportion to their skill.

**Everything else on the round.** Buy zones and buy time, the loss-bonus ladder,
kill rewards per weapon, plant and defuse bonuses, MVPs, kill feed with
headshot/wallbang/through-smoke markers, round banners, a full scoreboard with
ADR and headshot percentage, spectating, team switching, team balancing, AFK
handover to a bot, optional friendly fire, and host-configurable rules.

**Presentation.** A custom WebGL renderer with baked sun shadows and ambient
occlusion, a tiling procedural texture per surface type — concrete with form
seams and cracks, rippled sand, planked wood, riveted panel metal, diamond
plate, grouted tile — procedural characters and weapon models, first-person viewmodel
animation (deploy, reload, inspect, fire kick, sway and bob), bullet-hole and
blood decals, shell casings, tracers, muzzle flashes, ragdolled corpses, and a
rotating radar. Weapon finishes, gloves and character models are all free and
purely cosmetic.

**Audio.** Every sound is synthesised in the browser with WebAudio — nothing is
downloaded. Gunfire is per-weapon-class, positioned in 3D, muffled through
walls and duller behind you. Footsteps change with the surface underfoot and go
silent when you walk. Bomb beeps accelerate. Flashbangs deafen you.

---

## Performance

The game targets 60 fps on integrated graphics and school laptops.

- The map is one draw call. A full 5v5 round is typically **under 30 draw calls**.
- Sun shadows and ambient occlusion are **baked into vertex colours at load**,
  so there is no shadow-map pass at runtime — soft, stable lighting for free.
- Collision is exact axis-aligned boxes in a uniform grid; bullet traces walk
  the grid rather than testing the world.
- Four graphics presets plus a resolution slider. **Low** turns off ambient
  occlusion baking, thins particles and renders at 72% scale.
- The simulation runs at a fixed 64 Hz and catches up correctly down to about
  5 fps, so a slow machine plays slowly-but-correctly rather than desyncing.

If frames are tight: drop **Resolution scale** first, then the preset.

---

## Multiplayer model

The host runs the authoritative simulation. Clients send a bounds-checked
command struct — movement axes, view angles and button states — and nothing
else. They never send positions, health, hits or damage.

- Every shot is traced on the host, from the host's copy of the world.
- The host rewinds all hitboxes to where the shooter saw them (lag
  compensation, capped at 250 ms) before tracing.
- Clients predict their own movement and reconcile smoothly against the host's
  snapshots; everyone else is interpolated 90 ms in the past.
- Buys are re-validated host-side and rate-limited.
- A player who disconnects mid-round is taken over by a bot so the round can
  finish; one who goes idle is handed over the same way.

This is not a substitute for a dedicated anti-cheat — a malicious *host* is
still the host — but a malicious *client* cannot teleport, give itself money,
or claim kills it did not earn.

---

## Building

`index.html` is generated from the modules in `src/`, which exist so the code
stays readable. To rebuild after editing:

```sh
node build.js
```

Source layout, in load order:

| File | What it does |
|---|---|
| `00_math.js` | vectors, angles, AABB/ray intersection, seeded hashing |
| `01_config.js` | tunables, rules, teams, settings persistence |
| `02_weapons.js` | weapon catalog, spray patterns, ballistics |
| `03_maps.js` | the map-building DSL and the four maps |
| `04_world.js` | collision, bullet tracing, penetration, navigation |
| `05_player.js` | movement, weapon state machine, inventory, economy |
| `06_grenades.js` | grenade physics, smoke, fire, flash |
| `07_match.js` | the authoritative rules engine |
| `08_bots.js` | bot perception, combat and navigation |
| `09_textures.js` | tiling procedural material textures |
| `10_gl.js` | matrices, shaders, buffers, textures |
| `11_geo.js` | map geometry and the lighting bake |
| `12_models.js` | characters, weapon models, cosmetics |
| `13_fx.js` | sprite batching, particles, decals, tracers |
| `14_render.js` | the renderer |
| `15_audio.js` | procedural audio |
| `16_net.js` | WebRTC transport and signalling |
| `17_voice.js` | voice chat |
| `18_ui.js` | menus, HUD, buy menu, scoreboard, radar |
| `19_game.js` | input, netcode glue, match lifecycle |
| `20_loop.js` | the main loop, camera, viewmodel, effects |

The core simulation modules (`00`–`08`) have no browser dependencies and can be
required directly in Node, which is how the ballistics, navigation, economy and
full-match tests were run during development.

---

## Notes

All weapon names, maps, teams and cosmetics are original. Nothing here ships any
third-party asset, library or trademark — the renderer, the audio engine and the
networking are all written from scratch, which is what keeps it to a single file.
