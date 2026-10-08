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

**On foot (third-person over-the-shoulder; V toggles first-person)**

| Input | Action |
|---|---|
| Click | Capture the mouse |
| WASD · Shift · Space | Move · sprint · jump (a crouch, then a heavy launch and a hard landing). Hold Space in the air to fire the jet-pack. |
| LMB · R | Fire VK-7 Arc Carbine · reload (mag out, fresh mag from the belt, charging handle) |
| RMB (or two-finger click) | **Toggle aim mode.** Click once to lock into aim (tighter over-the-shoulder camera, steadier and more accurate fire, slower walk); click again to exit. Press and hold for a temporary aim instead. |
| C · T | Swap the camera shoulder · throw a grenade (4 carried; refilled at your camps) |
| 1–7 | Orbital directives (throws a beacon): Orbital Lance, Reinforce, Bastion Sentry, Mend Field, Strider Drop (rank 4), **Ordnance** (your flagship's biggest bomb: Kinetic Rod → Thermobaric → Tactical Nuke → Fusion Lance → Sunfire Torpedo → World-Breaker), Fleet Barrage (rank 5) |
| F · G · H | Squad: form on me · assault the point you're aiming at · hold position |
| Q (hold) | **Tame**: relaxed, grazing creatures can be tamed outright and go to work for your colony. Hostile ones must be weakened first (below 40% health; titans below 25%), then they fight for you. |
| E | Interact: attune monoliths, offer alliance to the Kith, plant a banner on a nest, open the colony terminal |
| X (hold) | Call extraction back to your ship |
| Esc | Pause: volume, graphics quality, soundtrack |

**Flying the Ember Wake (in every star system)**

| Input | Action |
|---|---|
| Mouse | Pitch / yaw |
| A · D | Roll |
| W · S | Throttle up / down |
| Shift | Afterburner (builds heat) |
| J | Cruise drive (×30 speed; drops out near planets) |
| LMB · RMB | Twin cannons (they lead the selected target) · homing missile at the locked target |
| E | Context: **dive into a planet's atmosphere** (re-entry, then your flagship descends over the drop zone and ejects the pods; any key skips), **board** a rival cruiser or dreadnought, **jump** through a hyperlane gate to the next system |
| V | Chase camera / bridge cockpit |
| Tab | Command panels: empire, colonies, fleets, doctrine; releases the mouse |
| M | Galaxy map. Drag to rotate, right-drag to pan, wheel to zoom. Set course for automatic multi-jump travel. |

## The loop

**10 soldiers → outpost → planet → fleet → solar system → interstellar empire.**

1. **Fly.** Each system is a real space you pilot through: the star, planets with atmospheres, clouds and city lights, orbital stations with traffic, asteroid belts, hyperlane gates to every neighbouring system, and any rival warships parked there. You fight those warships with your escorts; every ship you destroy is removed from the galaxy simulation.
2. **Drop.** Fly close to a planet and press E. The ship turns and dives through the atmosphere in a plasma sheath. On the surface, your flagship descends through the sky, hovers over the drop zone on retro-jets, kicking up a dust storm, and fires you and your squad down in drop pods before climbing away.
3. **Conquer.** Every uplink sits inside a **fortified enemy camp**: palisades and huts on primitive worlds, stone keeps on feudal ones, bunkers, turrets and pylons on industrial and atomic ones. The camp farthest from your landing zone is the **stronghold**, which is bigger, has a double garrison and, on advanced worlds, a heavy walker. Clear the defenders (the banner won't move while any remain; once five or fewer are left they're marked ✕ on your compass), then hold the ring to raise your banner. Walls stop you on foot, but a jet-pack hop clears them. Each taken camp drops three reinforcements and becomes a **resupply point** that heals you and refills ammo and grenades. Optional **raider outposts** between the main camps give you forward bases. Also **destroy the hostile nests** (kill the aggressive species), and destroy any rival bastion. Relaxed, grazing herds can be **tamed** with Q, and they'll haul bricks for your colony. Advanced worlds have a **native civilisation** with a city and army; topple its citadel (or bomb it into surrender) and, from Atomic tier up, break its **shield dome** by destroying the pylons. Each planet type has its own natives, and the way you deal with them becomes a permanent trait of the colony:
   - **Exterminate**: destroy every nest. *+15% construction.*
   - **Tame**: weaken the apex titan and hold Q to bond it. It fights for you. *Beasts guard the colony.*
   - **Pacify**: attune every Resonance Monolith while their creatures attack you. *+30% population growth.*
   - **Ally**: pass the Kith trial by defending their village for 60 s. *+30 colonists, Kith warriors join your squad.*
   - **Dominate**: kill the apex and plant Dominion banners on the nests. *+30% resources.*
4. **Govern.** Choose one of three governors (Architect, Warden, Matriarch, Quartermaster, Beastwarden or Shipwright) and decide how many of your colonists settle the world.
5. **Build, brick by brick.** When you visit a colony you can watch it grow. Every unfinished structure is a construction site whose walls rise course by course from individual bricks. The newest bricks swing in on the crane hook, haulers carry bricks from the stockpiles, builders kneel and hammer, and tamed beasts drag loads. **Leave** and the colony keeps building in real time. Structures go through foundation, scaffold, shell and lit-up stages. In order, it builds habitats, hydro domes, foundries, aether refineries, barracks, turrets, two rings of ramparts and watchtowers, a spaceport, an Aegis shield dome, arcologies, a 260 m Citadel Spire, an orbital cannon and monuments. Garrisons grow, resources accumulate and colonists emigrate to your flagship. Rough pacing (it changes with the governor and doctrines): Outpost in about 2 min, Fortified Town about 10 min, City about 20 min, Fortress City about 30 min, Megacity at 45–60 min. Progress continues while the tab is closed (up to 4 h of catch-up) and you get a *While You Were Away* report when you return.
6. **Expand.** Recruit troops, muster garrisons onto the flagship, commission frigates, cruisers and dreadnoughts at spaceports, detach task forces, auto-invade with fleets, and spend renown on Doctrines.
7. **Defend.** Rivals raid you, and they come for weak new colonies first. You get *INCOMING* and then *WARNING — THE IRON SYNOD IS INVADING VEGA III* alerts, each with actions: **Return & defend** (drop into a wave defense of your own city, alongside its garrison and turrets), **Send fleet**, **Fortify** (that world and its neighbours), **Counterattack** (hit the attacker's nearest world), or **Abandon**. Fleet engagements let you **board the enemy flagship** and fight on its hull to seize the bridge.

8. **Grow your power.** Colonies pay **credits** in taxes. Spend them on the **Flagship** tab:
   - Rebuild the flagship up through Corvette → Frigate → Destroyer → Battlecruiser → Dreadnought → Throneship. That means more troops, more court berths and bigger ordnance, and the ship model grows.
   - Buy **commander gear**: Sovereign Plate, Aegis Emitter, Arc Carbine mods and Jump Thrusters.
   - Bombard planets from orbit. Weak bombs bounce off advanced shields, a big enough bomb makes a civilisation sue for surrender, and the World-Breaker glasses a world.
9. **Rule your court.** Every world's governor is a person with loyalty, ambition and a quirk. Summon them to live aboard the flagship, where they're easier to keep loyal. You can also send gifts, spy on them or purge them.
   - Ambitious rulers make secret contact with your rivals. That brings *WHISPERS OF TREASON* alerts and, if you do nothing, **betrayal**: the world defects with its garrison.
   - A traitor living aboard the flagship stages a **mutiny on the throne deck**, which you fight on foot.

Rank follows the size of your empire: Drop Captain → Outpost Warden → Planetary Marshal → Fleet Admiral → System Sovereign → Star Regent → Interstellar Ascendant. Higher ranks raise the field squad cap from 10 up to 70 and unlock directives.

## Worlds

Each world also has a **civilisation tier**:

- **Feral**: beasts only.
- **Tribal**: Kith villages.
- **Feudal**: walled keeps and spear legions.
- **Industrial**: gas-masked rifle armies, factories and smokestacks.
- **Atomic**: bunkers, missile silos, walkers and shield domes.
- **Stellar**: crystal spires, plasma legions and heavy shield domes.

Higher tiers are tougher, field heavier armies and need bigger bombs.


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
- **Every change to the state is a command** (`Sim.issue → transport → Sim.apply`): `TRAVEL`, `CONQUER`, `MISSION_END`, `COMMISSION`, `RECRUIT`, `MUSTER`, `GARRISON`, `FORTIFY`, `ABANDON`, `INVADE`, `MERGE`, `DETACH`, `DOCTRINE`, `RETREAT`, `BOARD_RESULT`, plus the empire layer's `FLAG_UPGRADE`, `GEAR`, `BOMBARD`, `COURT`, `MUTINY_END` (court politics, loyalty drift and defections run inside the deterministic step, so they replay identically on every lockstep client).
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
- All art is procedural (no external asset generation keys were available). Characters are sculpted in code:
  - **Bodies:** lofted from spline cross-sections.
  - **Armour:** plates cut from the body surface, given thickness and chamfered edges.
  - **Animation:** IK arms on the weapon grips. The legs keep their feet planted, and the hips drop and jolt on each footfall. The body leans into acceleration and banks into turns. Jumps have an anticipation crouch, a tuck while rising and a heavy landing crouch. Weapon poses include low-ready, hip-fire, a bladed aim stance, sprint and airborne. Recoil kicks back and up and rolls the gun. A full reload is animated (the support hand pulls the mag, stows it, seats a fresh one and racks the charging handle), and so is the grenade throw. Also flinch, death, hammering and carrying.
  - **Rigging:** jointed, not skinned. There is a model studio test state (`studio`, `studio-rivals`, `studio-natives`, `studio-civ`).
- Graphics:
  - **Atmosphere:** height fog that pools in valleys and rolls across the ground in drifting banks, aerial-perspective haze and sun in-scatter on every material, sun shafts, and drifting light motes.
  - **Clouds:** cloud shadows sweep across the terrain and every lit surface. Lit billboard cumulus sits on the horizon, a cloud sea hugs the far ranges, low mist pools in the valleys, and the sky has a domain-warped cloud layer.
  - **Mood:** each planet type has its own colour grade (split-toned shadows and highlights, lifted tinted blacks, wide soft bloom, exposure) and a rim light on characters.
  - **Vegetation:** leaf-card tree canopies with alpha-cut leaves and dappled shadows, and dense colour-varied grass.
  - **Post and materials:** MSAA, GTAO, bloom, colour grade, procedural normal maps, and a triplanar terrain shader. The Performance setting in the pause menu turns off ambient occlusion and lowers shadow and render resolution for weaker GPUs.
- Performance was only measured with software rendering. Dense ground scenes draw about 4–8 M triangles per frame, counting the shadow and ambient-occlusion passes. The leaf-card forests and dense grass are the main cost; the Performance setting drops terrain resolution, leaf density, grass density, sun shafts, GTAO and shadow resolution. Real-GPU frame rates haven't been measured, so use the Performance setting if it stutters.
- Mid-mission ground state isn't saved. If you reload, the drop restarts, but its effects on the galaxy (troop losses, natives killed) are recorded when you extract.
