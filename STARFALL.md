# STARFALL DOMINION

A third-person sci-fi planetary conquest game in one HTML file: **`starfall.html`**.

You start as a Drop Captain with **ten soldiers and one ship**, the *Ember Wake*. You land on alien worlds and fight next to your troops. You capture uplinks and decide what to do with each world's natives. Then you appoint a governor and settle the world, and while you're off fighting somewhere else, that colony grows from a landing camp into a walled megacity in real time. Three rival empires expand, invade and react to you across the same galaxy.

## Running it

Open `starfall.html` in a desktop browser (Chrome, Edge or Firefox) **over HTTP**. Module import maps don't work from `file://` in every browser.

```bash
npx http-server -p 8080 .        # or: python3 -m http.server 8080
# open http://localhost:8080/starfall.html
```

Three.js r160 loads from jsDelivr through an import map. Everything else is generated in code: models, planets, textures, sound effects and music. There are no asset files.

## Controls

| Input | Action |
|---|---|
| Click | Capture the mouse (ground combat) |
| WASD · Shift · Space | Move · sprint · jump / jet-pack (hold in the air) |
| LMB · RMB · R | Fire VK-7 Arc Carbine · aim down sights · reload |
| 1–6 | Orbital directives (throws a beacon): Orbital Lance, Reinforce, Bastion Sentry, Mend Field, Strider Drop (rank 4), Fleet Barrage (rank 5) |
| F · G · H | Squad: form on me · assault the point you're aiming at · hold position |
| Q (hold) | **Bond** a weakened creature (below 40% health) or titan (below 25%). It joins your legion. |
| E | Interact: attune monoliths, offer alliance to the Kith, plant a banner on a nest, open the colony terminal |
| X (hold) | Call extraction back to orbit |
| M | Galaxy map (from orbit or warp) · drag to rotate, right-drag to pan, wheel to zoom |
| Esc | Pause, volume and the soundtrack jukebox |

## The loop

**10 soldiers → outpost → planet → fleet → solar system → interstellar empire.**

1. **Drop.** Your pod falls from orbit and the squad's pods rain down around you.
2. **Conquer.** Capture every uplink, and destroy any rival bastion. Each planet type has its own natives, and the way you deal with them becomes a permanent trait of the colony:
   - **Exterminate**: destroy every nest. *+15% construction.*
   - **Tame**: weaken the apex titan and hold Q to bond it. It fights for you. *Beasts guard the colony.*
   - **Pacify**: attune every Resonance Monolith while their creatures attack you. *+30% population growth.*
   - **Ally**: pass the Kith trial by defending their village for 60 s. *+30 colonists, Kith warriors join your squad.*
   - **Dominate**: kill the apex and plant Dominion banners on the nests. *+30% resources.*
3. **Govern.** Choose one of three governors (Architect, Warden, Matriarch, Quartermaster, Beastwarden or Shipwright) and decide how many of your colonists settle the world.
4. **Leave.** The colony keeps building in real time. Structures go through foundation, scaffold, shell and lit-up stages. In order, it builds habitats, hydro domes, foundries, aether refineries, barracks, turrets, two rings of ramparts and watchtowers, a spaceport, an Aegis shield dome, arcologies, a 260 m Citadel Spire, an orbital cannon and monuments. Garrisons grow, resources accumulate and colonists emigrate to your flagship. Rough pacing (it changes with the governor and doctrines): Outpost in about 2 min, Fortified Town about 10 min, City about 20 min, Fortress City about 30 min, Megacity at 45–60 min. Progress continues while the tab is closed (up to 4 h of catch-up) and you get a *While You Were Away* report when you return.
5. **Expand.** Recruit troops, muster garrisons onto the flagship, commission frigates, cruisers and dreadnoughts at spaceports, detach task forces, auto-invade with fleets, and spend renown on Doctrines.
6. **Defend.** Rivals raid you, and they come for weak new colonies first. You get *INCOMING* and then *WARNING — THE IRON SYNOD IS INVADING VEGA III* alerts, each with actions: **Return & defend** (drop into a wave defense of your own city, alongside its garrison and turrets), **Send fleet**, **Fortify** (that world and its neighbours), **Counterattack** (hit the attacker's nearest world), or **Abandon**. Fleet engagements let you **board the enemy flagship** and fight on its hull to seize the bridge.

Rank follows the size of your empire: Drop Captain → Outpost Warden → Planetary Marshal → Fleet Admiral → System Sovereign → Star Regent → Interstellar Ascendant. Higher ranks raise the field squad cap from 10 up to 70 and unlock directives.

## Worlds

There are eight planet types plus enemy hulls, and every world is seeded differently. The playable area is about 1.9 km across. Beyond it, a far terrain ring runs to 12 km, and above it a sky dome holds a gas giant, rings and moons, with your fleet and rival fleets hanging in orbit overhead. Battles rage on the horizon of contested worlds.

| Planet type | Landmarks | Apex |
|---|---|---|
| Verdant Titanwood | kilometre-tall world-trees, walking giants | Spine Colossus |
| Cinder Forge | lava seas, erupting volcanoes, obsidian spires | Cinder Colossus |
| Amber Megacanyon | canyon mazes, buried colossal statues, mega-arch | Dune Leviathan (burrows and erupts) |
| Glass Ocean | frozen sea, leviathan skeleton, crashed ancient ship, aurora | Rime Leviathan |
| Sporewild | 1.5 km mushrooms, spore storms | Mycel Colossus |
| Engine World | planet-machine towers, standing megastructure ring | Ancient Sentinel (laser sweeps) |
| Shattered Sky | floating continents above a cloud abyss, waterfalls | Storm Skyray (flying) |
| Brood Nest | hive spires, a buried mother-beast | Brood Mother |
| Capital Hull | the deck of an enemy dreadnought in orbit (boarding actions) | Bridge core |

The rivals are **The Iron Synod** (machine theocracy: plasma drones, chicken-walkers), **The Choir of Vael** (crystal-singers: beam zealots, floating seraphs) and **The Thousandfold Brood** (swarm empire: broodlings, ravagers, acid). Each has its own units, turrets, ships and city style, and conquered rival cities keep their architecture.

## Soundtrack: *Starfall Dominion — Original Score*

The music is composed in code and synthesised live with WebAudio (`AUDIO` / `Music` in the source). It uses brass, strings, a formant choir, FM bells, taiko and sub-bass voices, built around a recurring *Dominion motif*. You can play any cue from **Esc → Soundtrack** or the title screen.

1. **Ten Soldiers, One Ship**: main theme
2. **The Long Dark Between**: galaxy map
3. **Hyperlane**: warp travel
4. **Boots on Alien Soil**: exploration (its mode changes with the planet type)
5. **The Front Line**: adaptive combat; layers come in with the fight's intensity
6. **Hymn for a Fallen Titan**: titan encounters
7. **Hold the Walls**: invasion defense
8. **What We Built While You Were Gone**: your colonies

There are also victory, defeat, alert and *planet secured* stingers.

## Architecture (multiplayer-ready)

All the code lives in one `<script type="module">`, split into labelled sections: CORE, SIM, AI, NET, AUDIO, RENDER, MODELS, WORLD, FX, GROUND, SPACE, UI and MAIN.

- **The galaxy is a deterministic simulation** (`Sim`): seeded RNG kept in the state, a fixed 1-second step, JSON-serialisable state, and a pure function for each colony's layout (`colonyPlan`), so building positions are never stored.
- **Every change to the state is a command** (`Sim.issue → transport → Sim.apply`): `TRAVEL`, `CONQUER`, `MISSION_END`, `COMMISSION`, `RECRUIT`, `MUSTER`, `GARRISON`, `FORTIFY`, `ABANDON`, `INVADE`, `MERGE`, `DETACH`, `DOCTRINE`, `RETREAT`, `BOARD_RESULT`.
- **Commanders are slots.** Each has `controller: 'local' | 'ai' | 'remote'`. The AI (`AI.think`) only reads state and applies commands, exactly as a human client would, so any rival slot can be taken over by a person.
- **Ground battles run on the client.** Their results go back to the simulation as `MISSION_END` / `CONQUER` / `BOARD_RESULT` commands.
- **Transports.** `LocalTransport` runs single-player in-process. `LockstepSocketTransport` is a working WebSocket client for a lockstep relay; activate it with `starfall.html?relay=wss://host:port&name=YourName`.

  ```
  client → relay   {type:'hello', name, want:'P'|'SYN'|'CHO'|'BRO'}   {type:'cmd', cmd}
  relay  → client  {type:'welcome', cid, seed, snapshot|null}  {type:'tick', n, cmds:[...]}  {type:'slot', cid, controller}
  ```

  The relay only orders commands and sends 1 Hz ticks. Every client steps the same deterministic sim. **No relay server ships with this repo**, so multiplayer isn't available until one is written against the protocol above. Single-player against the AI is complete.

Saves go to `localStorage` (`starfall.dominion.save.v1`) every 10 s and when the tab is hidden.

## Known limitations

- Desktop only: mouse and keyboard, no touch controls.
- All art is procedural (no external asset generation keys were available). Characters are built from authored primitives, not skinned meshes.
- Performance was measured with software rendering in CI. On the densest city and combat views the renderer reports about 100–150 draw calls and 0.75–0.8 M triangles. Real-GPU frame rates haven't been measured.
- Mid-mission ground state isn't saved. If you reload, the drop restarts, but its effects on the galaxy (troop losses, natives killed) are recorded when you extract.
