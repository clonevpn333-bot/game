# CRUX — four friends, one mountain, no gear

A co-op mountain climbing game in the spirit of PEAK. One 300-metre mountain,
four climbers, and a stamina bar that runs out at exactly the wrong moment.

The shipped game is a **single HTML file** — `dist/index.html` — that pulls
three.js r128 and PeerJS from cdnjs and needs nothing else. Open it in a
browser and click.

## The run

You land at base camp with an energy bar and a rope. The summit is 300 m
straight up through four bands of rock:

| band | from | what it is |
|---|---|---|
| grass | 0 m | warm green apron, brown dirt cliffs, pine forest |
| rock face | 56 m | grey and rust, exposed ledges, loose scree |
| alpine | 152 m | pale blue-white, ice sheen, thin air |
| summit | 244 m | dark stone, ember glow, harsh contrast |

Five campfires sit on the route. Walking up to one lights it: it warms you,
mends you, cooks your food for extra value, and becomes where the whole group
respawns. Reaching the cairn at the top ends the run.

Every run reseeds the mountain — the route spirals a different way, the
terraces fall in different places, and the gear is scattered somewhere new.

## Climbing

Anything under 48° you walk. Steeper than that you grab on, and stamina drains
the whole time you are on the wall — including while you hang still. It comes
back only on flat ground or hanging off a piton.

- **Ice** burns stamina about twice as fast, and is slippery underfoot.
- **Overhangs** (past ~80°) cost double.
- **Loose rock** tears out about a second after you grab it and takes you with it.
- **Roots and vines** are a free hold — no drain at all.
- **Pitons** hammered into the face are free holds *and* let you get your breath back.
- **Wind gusts** shove you sideways on exposed faces and cost extra grip.
- **Leaping off a wall** crosses gaps but eats a quarter of the bar.

When stamina hits zero your fingers open. Falls under about 4.5 m are free;
past that they cost health by the metre, a hard landing leaves you with a
wrenched shoulder (slower climbing) or a turned ankle (slower walking), and a
bad enough one puts you on the floor. You are never dead — just down, and
someone has to come get you.

## Looking after each other

- **Rope** — plant an anchor (`R`). Anyone who falls within 15 m of it gets
  caught instead of hitting the ground. Press `R` at your own anchor to coil it back up.
- **Boost** — press `F` to brace. A mate can stand on your shoulders and jump
  off them to reach a lip nobody could reach alone.
- **Carry** — tap `E` on a downed mate to shoulder them. You move at half
  speed and climbing costs nearly double, but you can haul them to a fire.
- **Revive** — hold `E` for four seconds. You are both stuck in the open the
  whole time.
- **Pass gear** — `G` throws the selected item to the nearest mate.
- **Ping** — tap `Q` to mark a route, hold it to mark danger. Everyone sees it.

## Staying alive

Hunger drains slowly and, once it is low, caps how much stamina you can hold.
Above the alpine line the cold sets in — a parka slows it, a lit torch helps,
a campfire reverses it, and once you are properly frozen it starts taking
health. Your pack holds four things, so choosing what to carry is the game.

## Multiplayer

Real peer-to-peer over the internet, not bots. One player hosts and gets a
four-character room code; friends anywhere type it in and join. The host owns
the world seed and relays traffic between everyone, so all four climbers are on
the same mountain with the same gear in the same places.

Position, facing, animation state, health, stamina, hunger, temperature, held
item, downed state, carries, revives, pings, rope anchors, pitons, crumbled
holds, lit checkpoints and item pickups all sync. Someone who joins late gets
a snapshot of the world so far and starts at the group's highest lit fire.

Signalling goes through the public PeerJS broker; media never touches it —
climbers talk directly to each other over WebRTC. If the broker cannot be
reached the menu says so and solo climbing still works.

## Controls

Pointer lock is always on — click once and the mouse is yours.

| | |
|---|---|
| `WASD` | move |
| `Space` | jump; on a wall, leap off it |
| `Shift` | sprint |
| `Mouse` | look |
| `LMB` (hold) | grip — hang on without climbing |
| `E` | take gear · tap on a downed mate to carry · hold to revive |
| `C` | use the selected item |
| `1`–`4` | select a pack slot |
| `X` | drop the selected item |
| `R` | plant / recover a rope anchor |
| `F` | brace so a mate can climb you |
| `G` | throw the selected item to the nearest mate |
| `Q` | ping a route (hold for danger) |
| `V` | first / third person |
| `Tab` | roster |

Moving into a steep face grabs it automatically, so a trackpad never needs a
chord to climb.

## Building it

Source lives in `src/` as small ordered fragments; `tools/build.js` inlines
them into one HTML file.

```
node tools/build.js dist/index.html          # build
node tools/smoke.js                          # boot, world gen, movement, falls, rope
node tools/systems.js                        # surfaces, survival, co-op, wire protocol
node tools/shots.js '[{"name":"a","camp":2}]' # framed screenshots
```

The test harness swaps the two cdnjs tags for local copies in `vendor/` so it
can run offline. Run `tools/fetch-vendor.sh` once to populate that directory
(it just `npm pack`s three 0.128.0 and peerjs 1.5.4). The shipped file always
points at cdnjs.

## How it is put together

| file | what it does |
|---|---|
| `01-core` | constants and tuning, seeded RNG, room codes |
| `02-noise` | seeded gradient noise, fbm, ridged noise |
| `03-terrain` | height field: radial profile, domain warp, route spine, terracing |
| `04-tquery` | height / normal / surface queries, ray marching, surface classification |
| `05-tmesh` | flat-shaded terrain mesh in three draw groups (matte, icy, glowing) |
| `06-geo` | primitive merging, lumpy rocks, spatially bucketed instancing |
| `07-scenery` | pines, boulders, vines, icicles, scree, pitons; boulder collision |
| `08-items` | item table, pickup meshes, thrown items |
| `09-landmarks` | campfires, tents, trail cairns, the summit |
| `10-figure` | the climbers: built from boxes, posed by hand every frame |
| `11-input` | keyboard, mouse, pointer lock |
| `12-camera` | third/first person rig that lifts over obstructions instead of clipping |
| `13-player` | walking, falling, and the whole climbing system |
| `14-survival` | stamina, hunger, cold, injuries, inventory, camps, respawn |
| `15-coop` | rope, pitons, carrying, reviving, passing, pings |
| `16-remote` | other climbers, interpolated ~120 ms behind |
| `17-net` | PeerJS transport, room codes, snapshots, event protocol |
| `18-fx` | wind, snow, dust, debris, breath, embers |
| `19-sky` | gradient sky, altitude-driven sun and fog, the cloud sea |
| `20-hud` | vitals, mates, belt, prompts, world-space tags |
| `21-game` | renderer, world build/teardown, main loop |
| `22-menu` | title, host/join, options |
| `23-boot` | startup and failure messages |

### Notes on the terrain

The mountain is a height field, not a mesh sculpt. A smooth radial profile is
domain-warped, given spurs by ridged noise, then **terraced**: each step of
height is spent mostly on a near-flat shelf and then a short, near-vertical
riser. That is what turns a steep cone into something you can actually climb —
shelves to stand and breathe on, walls between them. Along the seeded route the
shelves widen and the risers shorten, so there is always a line a tired group
can follow, with harder ground either side of it.

Detail noise is deliberately long-wavelength: anything finer adds more slope
than the mountain has of its own and crushes every shelf below the width of a
grid cell, leaving a featureless ramp.

Typical result on the route: median wall about 11 m, with pitons spaced roughly
every 13 m of height on the long faces.
