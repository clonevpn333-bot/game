# DREAM COURIER — Design

## Design brief

- **Player promise:** You are Ori, a courier who carries sealed dreams across the Route — and you are carrying them deeper than anyone was meant to go.
- **Target feeling:** begin with *"I want to explore this beautiful dream world"*, slide into *"this place is getting weird"*, end at *"I have gone too far into something human minds were never meant to fully see."*
- **Primary verb:** travel (walk / run / sprint / jump / mantle / vault) through a linear dream route.
- **Secondary verbs:** deliver parcels, use the active parcel's power at dream anchors (Dream Pulse), talk to residents, sneak past Lost Couriers, swing the courier bag at Parcel Husks, outrun Static Figures and The Sleepless.
- **Every 5–30 s:** a traversal beat (a jump, a ledge, a vault, a moving platform) or a discovery (a resident line, a dream stamp, a view of the distant layer).
- **Across 1–5 min:** a delivery arc — receive parcel → reach anchor → parcel changes the world → path opens → deliver.
- **Lose / learn / restart:** Lucidity (5 petals). Husk hits cost petals; being caught by a Lost Courier, Static Figure, or Sleepless, or falling into the cloud sea "wakes" Ori → fade → respawn at last checkpoint within ~2 s. Fail always shows what caught you.
- **Rewarded:** exploration (Dream Stamps, 3 per chapter, shown in pause), clean stealth, completing deliveries (world blooms, story advances).
- **Risk:** falls, patrol cones, chases, decaying lucidity in the Yellow Rooms.
- **Better player:** reads patrol timing, uses sprint+vault lines through chases, finds stamps on optional ledges.
- **Next decision communicated by:** a soft parcel-glow waypoint ribbon, anchor light pillars visible through fog, objective text, residents' hints.
- **Non-goals:** open world, loot/economy, skill trees, multiplayer, photoreal art.

## Core loop contract

`Ori travels the Route to deliver a parcel while the dream itself (gaps, patrols, decay, pursuers) creates risk; success transforms the world and opens the next stretch, failure wakes Ori at the last checkpoint.`

| Clause | Proof in code |
| --- | --- |
| Verb mapped to real input | WASD/stick move, Space jump, Shift sprint, C/Ctrl crouch, E interact, Q/RMB Dream Pulse, LMB/F bag swing, mouse/right-stick camera, touch stick + buttons |
| Objective visible | HUD objective line + world waypoint beacon + anchor light pillars |
| Pressure within first playable minute (late chapters) / within chapter (early) | Ch1 pressure = falls; Ch3 husks; Ch4 static chase; Ch5 patrols; Ch8 decay + Sleepless |
| Reward changes state | parcel effects mutate the level (bridges grow, blocks become stairs, hidden walkways, tide shifts, fragments assemble) |
| Failure teaches | wake-up overlay names the cause ("A Lost Courier saw you") then respawns at checkpoint |
| Fast restart | ~1.6 s fade + respawn; checkpoints every 30–90 s of play; saved to localStorage |

## Tone curve

| # | Chapter | Palette / light | Population | Threats | Uncanny level |
| --- | --- | --- | --- | --- | --- |
| 1 | Cloud District | peach-pink morning, cream clouds, lavender shadow | lively residents | none (falls only) | 0 — one odd line |
| 2 | Velvet Station | violet dusk, brass, rose lanterns | commuters, clerk | none, one distant Watcher | 1 |
| 3 | Playroom Quarter | warm afternoon, crayon primaries | kids, one counts forever | small Parcel Husks (combat intro) | 2 |
| 4 | Quiet Mall | pale teal skylights, peach floor | nearly empty, a looping janitor | Static Figures + chase | 4 |
| 5 | The Long Hall | amber sunset through blinds | none — echoes | Lost Courier patrols (stealth), loop corridor | 5 |
| 6 | Below the Route | cyan work-lights, rust | one Lost Courier who remembers | patrols + husks | 6 |
| 7 | The Sleeping Sea | silver overcast, mirror water | memory statues | Watchers that get closer | 6 |
| 8 | The Yellow Rooms | mono-yellow fluorescent | nothing | lucidity decay, The Sleepless chase | 8 |
| 9 | The Unfinished Dream | unlit grey, wire edges, inverted sky | frozen copies of earlier residents | statics, husks | 9 |
| 10 | The Sleepless Core | black-violet, cloud ceiling indoors, white core | Mabel's voice | Sleepless chase + core | 10 |

Global uncanny parameter `dread ∈ [0,1]` per chapter drives: saturation, post grain, chromatic aberration, edge vignette, audio detune, resident behaviours, fog density, and sky warping.

## World scale rule (every chapter)

1. **Playable layer** — the collidable route.
2. **Extended layer** — non-collidable surrounding streets/rooms/corridors that read as reachable (they continue past fog).
3. **Distant layer** — massive silhouettes: floating districts, cloud highways, mega-towers, repeating room shells, skyline rings, rendered cheap (instanced, unlit-ish, fogged) to sell scale.

## Level plans

Player run speed 6.5 m/s, sprint 9.5 m/s, jump apex ≈1.6 m, mantle reach 2.4 m. Route runs mostly toward −Z.

### 1 — Cloud District
- **Start:** Ori's courier booth on a pillowy rooftop, Dispatcher Mabel gives the *Jar of Morning* parcel. Movement + camera taught by a short rooftop path with low gaps.
- **First decision:** two rooftops — short safe hop vs. higher route with a Dream Stamp.
- **Landmarks:** the Lighthouse of the sleeping grandmother far ahead (beacon), cloud highway above, floating neighbourhood ring in the distance.
- **Beats:** cloud bridge → resident street (shopkeeper, kids, umbrella commuter) → Faded Garden (grey, silent) → Dream Pulse at anchor restores colour, grows flower stairs → mantle tutorial → lighthouse delivery → Mabel hands over a train ticket.
- **Wrongness:** a commuter: "It's been four o'clock for a while now."

### 2 — The Velvet Station
- Grand velvet concourse, brass clocks, a masked clerk checks the ticket. Scripted train ride across the sky (set piece). Train stops at a platform "not on the map". Ticket parcel at anchor prints a staircase of tickets to a path that should not exist. Signal gantries platforming, luggage vaults. A commuter repeats "next stop… next stop…". Lost & Found clerk: the parcel arrived *already opened*. A tall Watcher stands on a far platform, gone when you look back.

### 3 — The Playroom Quarter
- Ori is tiny in a giant bedroom. Toy-block platforming, book stairs, duvet hills. The Sleeping Room is grey and still; Wake-Up Parcel at the alarm-clock anchor wakes it: blocks slide into stairs, toy train becomes a moving platform, the mobile spins. A child counting "…98, 99, 100" forever. Parcel Husks introduce combat (bag swing, pulse stun). Ends in a school hallway that goes too far — lockers repeating into fog.

### 4 — The Quiet Mall
- Huge atrium, skylights, escalators, storefronts, endless muzak slowly detuning. A janitor sweeps the same tile: "Store closes at never." Lens Parcel reveals hidden walkways across the atrium void (visible only for a few seconds after a pulse). Static Figures (mannequin-like) move only when unobserved. Finale: lights die section by section, statics pursue — sprint to the service corridor.

### 5 — The Long Hall
- Hotel/office/apartment hybrid at endless sunset. The **loop corridor**: walking to the end seamlessly returns you to the start unless you take the door whose light is on (it moves each loop). Office floor stealth past Lost Couriers with lantern view cones, cubicle cover, crouch. Lullaby Parcel calms static figures. Delivery to Room 0: the addressee is *Ori*. The parcel holds Ori's own courier badge, years old.

### 6 — Below the Route
- Maintenance layer: pipes, vents, conveyor belts carrying used dream pieces back upward (the recycling reveal). Climb pipes, ride conveyors, sneak past patrols, fight husks. Memory Parcel makes the Lost Courier **Pell** remember: exposition about the Route holding dreams together.

### 7 — The Sleeping Sea
- Flooded mirror-sea at overcast twilight; drifting houses as moving platforms; memory rooms frozen mid-moment. Tide Parcel lowers the water to reveal a causeway, then raises it to float a house into place. Watchers stand in the water, closer every time you look away.

### 8 — The Yellow Rooms
- Backrooms. Mono-yellow wallpaper, wet carpet, fluorescent hum. Lucidity slowly decays while still; moving keeps you lucid. The parcel hums louder toward the exit (audio + glow navigation). The Sleepless appear: chase through the rooms to a door that should not be there.

### 9 — The Unfinished Dream
- Floating fragments of every earlier chapter, untextured and grey, wire edges, upside-down apartment blocks overhead, looping staircases. Fragment Parcel snaps floating chunks into a bridge. Frozen copies of earlier residents. Static + husk gauntlet.

### 10 — The Sleepless Core
- A vast dark atrium with clouds somehow above. Mabel's voice breaks apart. Sleepless chase across a collapsing route, then the Core: a sphere of every dream ever delivered. **Choice:** deliver the Last Parcel into the Core (restore dreaming — the world blooms) or seal it (shut the Route — everyone wakes to a quiet sunrise). Epilogue + credits.
