# CRUX — four scouts, one island

A co-op climbing game in the spirit of PEAK. Your plane goes down on the shore
of an island, and the only way off it is up.

The shipped game is a **single HTML file** — `dist/index.html` — that pulls
three.js r128 and PeerJS from cdnjs and needs nothing else. Open it, click, climb.

## How climbing works

You get close to a wall, **hold the grab key**, and move with WASD. That is the
whole verb. Almost any face on the island takes a hand — anything steeper than
about 35°, which is most of it — so there is no route to find, no marked line
and nothing that grabs on for you.

Climbing costs stamina every second you are on the rock, and it costs some just
to hang there. It never comes back while you are holding on. Let go of the grab
key and you drop, immediately, from wherever you are. Run the bar dry mid-climb
and your grip goes: you slide down the face, faster and faster, and whatever you
hit at the bottom is going to hurt.

That is the entire tension of the game. Everything else is arithmetic on the bar.

- **Shift** on a wall is a lunge — a short upward surge for a chunk of stamina.
- **Shift** on the ground is a sprint, and it costs too.
- **Space** on a wall shoves you off it, which is how you cross a gap.
- A **piton** hammered into the rock is the one place off the ground where you
  can get your breath back.
- A **rope** is most of the work already done — climbing one is cheap.

## The stamina bar

One bar, and everything eats into it. The green is what you have left. Statuses
fill in from the right, each with its own colour, so the width of the green *is*
the answer to "how much further can I go".

| | |
|---|---|
| ⚖ weight | everything in your pack, and anyone on your shoulders |
| ◔ hunger | creeps up the whole run; food pushes it back |
| ✚ injury | from landing badly |
| ☠ poison | jungle rain and bad mushrooms |
| ❄ cold | the snow face, worse in a gust |
| ▲ heat | volcanic rock, worse inside the caldera |
| ✦ thorns | walking through the wrong bush |
| ☾ drowsy | mushrooms, and the crash after a lollipop |
| ✧ curse | the caldera does not like visitors |

Fill the bar with statuses and there is no room left for stamina at all: the
scout goes down. Alone you have about twenty seconds; with company, over a
minute — long enough for somebody to reach you.

Behind the green there is a second, paler bar: **bonus stamina** from eating,
worth more if you cook it at a fire. It is only spent on a wall, only after the
green is gone, and it never comes back on its own.

## Looking after each other

**Right click with empty hands puts out a helping hand.** Anyone in front of you
and within reach gets hauled in. It is the main thing you do for each other and
it works on someone dangling, sliding or unconscious.

Beyond that: shoulder a downed scout and carry them (they weigh on your bar),
hold **F** to revive them, deploy a rope spool from high ground so the others
can follow, fire a rope cannon at a wall you cannot reach, and ping a line with
**Q**.

## The island

Six zones in fixed order, each asking something different:

| zone | what it is | what it does to you |
|---|---|---|
| shore | warm sand, palms, the wreck | nothing yet |
| jungle | deep wet green, ferns, thorns | rain and poison, thorns underfoot |
| snow face | pale blue-white, ice, dead pines | cold, and gusts that make it worse |
| volcanic | black basalt, ember cracks | heat, and hot rock that burns |
| caldera | a dark moat under the summit | heat, darkness, and a creeping curse |
| peak | the flare stand | the way home |

A **campfire** sits at the top of each zone. Lighting it lifts the **fog wall**
above it, and until you do, that fog is a ceiling you cannot climb past. Fires
also warm you, mend you, cook your food for extra value, and are where everyone
wakes up.

And the whole time, **fog is rising from the sea**. It starts climbing a couple
of minutes in and does not stop. Get caught below it and it takes you apart.
That is the clock.

The island regenerates on a daily schedule, so everyone climbing on the same day
gets the same rock. Loose food and suitcase contents reroll every run.

## Controls

Pointer lock is always on — click once and the mouse is yours.

| | |
|---|---|
| `WASD` | move |
| **`E`** (hold) | **grab** — rebindable in the options; left mouse always works too |
| `Shift` | sprint on the ground, lunge on a wall |
| `Space` | jump; on a wall, shove off it |
| `RMB` | helping hand (empty hands only) |
| `F` | take gear / open a suitcase · hold to revive · tap to carry |
| `C` | use the held item |
| `1`–`3` | pack slot |
| `X` | drop |
| `Q` | ping (hold for danger) |
| `V` | first / third person |

The grab key defaults to a **held keyboard key** rather than a held mouse
button, because holding left click while steering a camera on a trackpad is
miserable. Rebind it in the options panel.

## Multiplayer

Real peer-to-peer over the internet. One player hosts and gets a four-character
room code; friends anywhere type it in. Position, facing, animation state, the
whole stamina bar, held item, downed state, carries, revives, helping-hand
pulls, pings, ropes, pitons, opened suitcases, taken loot and lit campfires all
sync. Someone joining late gets a snapshot of the run so far and starts at the
group's highest lit fire.

Signalling goes through the public PeerJS broker; the scouts then talk directly
to each other over WebRTC. If the broker cannot be reached the menu says so and
solo climbing still works.

## Building and testing

Source lives in `src/` as small ordered fragments; `tools/build.js` inlines them
into one HTML file.

```
node tools/build.js dist/index.html   # build
node tools/verify.js                  # the acceptance list, below
node tools/smoke.js                   # boot, generation, render, restart
node tools/systems.js                 # climbing detail, statuses, co-op, protocol
node tools/shots.js '[{"name":"a","camp":2}]'
```

`tools/fetch-vendor.sh` populates `vendor/` with local copies of the two CDN
libraries so the tests can run offline. The shipped file always points at cdnjs.

### What `verify.js` actually checks

It loads the game, spawns in, and drives it:

- the ground is never culled away (front-face render matches double-sided)
- no geometry in the world is missing a material or a position buffer
- every spawn point the game can use sits on top of the ground, not in it
- you land standing, undamaged
- fog holds you below its wall until the fire is lit
- **walking into a wall does not climb it**
- **holding grab does climb it**, and letting go drops you off
- stamina drains just from hanging, and never goes up while climbing
- stamina comes back on the ground
- running the bar dry on a wall puts you into a slide
- a short drop is free; a fall from height hurts
- the camera never ends up inside the rock, over 42 random placements
- no loot or suitcase is floating in the air or sunk in the rock
- no console or page errors throughout

## How it is put together

| file | what it does |
|---|---|
| `01-core` | constants, the six zones, the status list, seeded RNG |
| `02-noise` | seeded gradient noise, fbm, ridged noise |
| `03-terrain` | height field: radial profile, domain warp, terracing, the caldera crown, camp placement |
| `04-tquery` | height / normal / surface queries, ray marching, and the placement rules everything spawns through |
| `05-tmesh` | flat-shaded terrain in three draw groups (matte, icy, glowing) |
| `06-geo` | primitive merging, lumpy rocks, spatially bucketed instancing |
| `07-scenery` | per-zone props and boulder collision |
| `08-items` | the item table with weights, suitcases, loose loot |
| `09-landmarks` | crash site, campfires, fog walls, the flare stand |
| `10-figure` | the scouts: round heads, flat-shape faces, two-bone reach so mittens land on the rock |
| `11-input` | keyboard, mouse, pointer lock, the rebindable grab key |
| `12-camera` | third/first person rig that lifts over obstructions instead of clipping |
| `13-player` | walking, falling, and the grab-only climbing system |
| `14-survival` | the stamina bar, statuses, hazards, pack, camps, respawn |
| `15-coop` | helping hand, pitons, ropes, carrying, reviving, pings |
| `16-remote` | other scouts, interpolated ~120 ms behind |
| `17-net` | PeerJS transport, room codes, snapshots, event protocol |
| `18-fx` | wind, per-zone weather, embers, and the rising fog |
| `19-sky` | gradient sky, zone-driven sun and fog, the cloud sea |
| `20-hud` | the bar, who is with you, what is in your hand |
| `21-game` | renderer, world build/teardown, main loop |
| `22-menu` | title, host/join, options, key rebinding |
| `23-boot` | startup and failure messages |

### Notes on the terrain

The island is a height field. A smooth radial profile is domain-warped, given
spurs by ridged noise, then **terraced**: each step of height is spent mostly on
a near-flat shelf and then a short, near-vertical riser. Shelves are where the
bar refills; risers are what you spend it on.

Detail noise stays deliberately long-wavelength. Anything finer adds more slope
than the island has of its own, which crushes every shelf below the width of one
grid cell and leaves a featureless ramp with nowhere to stand.

Near the axis a **crown** overrides the cone: a rim, a moat dropped behind it,
and the summit spire rising out of the middle. That moat is the caldera.

Two rules the generator holds to, because breaking either produced real bugs:
triangles are wound counter-clockwise seen from above (get it backwards and the
renderer culls the ground out from under the player), and nothing — camp, spawn,
suitcase, prop or marker pole — is ever placed at a guessed height. Everything
resolves real ground first and is rejected if that ground is underwater, too
steep to stand on, or already occupied by a boulder.
