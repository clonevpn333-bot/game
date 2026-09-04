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

**Ten biomes, six per run.** The slots are fixed — shore, then a lower, a
middle, an upper and an inner band, then the peak — but which biome fills the
middle four is rolled from the day's seed, the way PEAK swaps its variants in
and out. The height field underneath is the same either way; everything on top
of it changes.

| slot | biome | what it is | what it does to you |
|---|---|---|---|
| 1 | **shore** | warm sand, palms, the wreck | nothing yet |
| 2 | **tropics** | deep wet green, ferns, thorns | rain brings poison; thorns underfoot |
| 2 | **roots** | purple rock, giant caps, root arches | spore mist: drowsy everywhere, poison in the drifts. The caps are springy — land on one and it throws you |
| 3 | **alpine** | pale blue-white, ice, dead pines | cold, and gusts that make it worse |
| 3 | **mesa** | red rock, saguaro, tumbleweed | a blistering sun; the only relief is the faces turned away from it |
| 4 | **caldera** | black basalt, ember cracks | heat, and hot rock that burns |
| 4 | **gloom** | a haunted purple murk, huge dark trees, hanging bells | the fog puts you to sleep, and once you are drowsy enough the cold sets in |
| 5 | **the kiln** | the volcano's inside, near-black | heat, a creeping curse, and rock that costs 40% more to climb |
| 5 | **the citadel** | a stone tower, pillars and ruins | wind and exposure |
| 6 | **the peak** | the flare stand | the way home |

A **campfire** sits at the top of each slot. Lighting it lifts the **fog wall**
above it, and until you do, that fog is a ceiling you cannot climb past. Fires
also warm you, mend you, cook your food for extra value, and are where everyone
wakes up.

And the whole time, **fog is rising from the sea**. It starts climbing a couple
of minutes in and does not stop. Get caught below it and it takes you apart.
That is the clock.

The island regenerates on a daily schedule, so everyone climbing on the same day
gets the same rock and the same four middle biomes. Loose food and suitcase
contents reroll every run.

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

## Look and camera settings

The options panel opens from the title screen **and from the pause screen**, so
you can tune the feel without leaving a run. It starts expanded — the
sensitivity slider is the first thing under the controls list, not behind a
click. Everything persists.

| setting | range | default |
|---|---|---|
| Sensitivity | 0.20 – 4.00 | 1.00 |
| Vertical | 0.40 – 1.60 of the horizontal | 1.00 |
| Invert X · Invert Y | independent | off |
| Field of view | 60 – 100 | 70 |
| Climbing FOV | 0 – 50 extra, eased in on the wall | 40 |
| Reduce bobbing | on / off | off |
| Photosensitivity | cuts screen shake to 15% | off |

Sensitivity is radians of turn per pixel of mouse travel, based at 0.0022 and
scaled by the slider, so one trackpad flick is a look and not a spin. The
vertical axis is a multiplier on top of the horizontal rather than a separate
number, which keeps the two in step when you change the main slider. The FOV
pair matches PEAK's: a base field of view and a separate amount it opens by
while you are on a wall.

## How it looks

The art is low-poly and flat-shaded on purpose, but low-poly is not the same as
bare. Four things carry it:

**Occlusion.** Every vertex of the terrain asks how much sky it can actually
see — eight directions, six distances each — and that answer is baked into its
colour. Gullies and the undersides of overhangs go dark, ridges stay bright.
Without it a field of flat facets reads as flat paper no matter how many
facets you give it.

**Grain.** A tiling noise map is projected down all three world axes and
blended by the face normal, so a vertical cliff gets the same density of
detail as the shelf above it instead of a smeared streak. It is sampled at two
scales: one for the shape of the rock, one for the bite up close.

**Beds.** Rock is laid down in layers, so the shading is banded by height —
warped, so the beds are not dead level, and strongest on steep faces where a
real bed would be exposed. Underneath that, a broad drift of light and shade
picks the second palette tone in coherent patches. That one matters on flat
ground, where the beds are edge-on and show nothing.

**Ratio.** The sky used to light the island nearly as hard as the sun, which
is the surest way to make a scene look flat: with no ratio between them,
nothing has a lit side and a dark side. The sun now runs about three and a
half times the ambient, through filmic tone mapping so the highlights roll off
instead of clipping.

The render mesh is subdivided finer than the height field it stands on, with a
high-frequency wobble the collision field never sees — gameplay reads the
coarse field, so the detail can never narrow a shelf you have to stand on.
Detail: low drops the subdivision and halves the shadow map.

Scouts are built from bevelled boxes rather than plain ones; the chamfer costs
a few triangles per limb and catches the sun along every edge. They walk with
a twist through the waist and their weight rolling onto the planted foot, they
absorb a landing through the knees, their heads hold their own line while the
body works underneath, and the scarf is a chain of three damped springs, so it
keeps moving after they stop.

**Hands grip.** A climbing hand holds one world position while the body climbs
past it, then lets go and arcs to a new hold, with the two hands half a cycle
apart so there is always one on the rock. The body leans onto whichever hand
is bearing weight, and lies down against a slab or stands off a vertical face
depending on what it is actually on.

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
- **W goes where the camera looks, D strafes right and A strafes left**, checked
  at three different yaws against three.js's own camera basis
- sensitivity scales the turn, the two inverts work independently, the vertical
  multiplier is its own, and the field of view opens on the wall
- all ten biomes exist, every one gets rolled, and a run is six slots
- the render mesh is subdivided past the height field, occlusion gives the rock
  a real tonal range, the grain map carries contrast, and the triplanar shader
  patch actually found its anchors (a silent miss falls back to sampling a uv
  attribute that is not there, and flat-tints the whole island)
- the sun out-lights the sky it works against
- a climbing hand grips its hold instead of sliding, and the camp flag moves
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
| `05-tmesh` | terrain mesh: subdivision, baked occlusion, strata, and the triplanar grain shader |
| `06-geo` | primitive merging, bevelled boxes, lumpy rocks, spatially bucketed instancing |
| `07-scenery` | per-zone props and boulder collision |
| `08-items` | the item table with weights, suitcases, loose loot |
| `09-landmarks` | crash site, campfires, fog walls, the flare stand |
| `10-figure` | the scouts: round heads, flat-shape faces, two-bone reach, spring scarf, walk and climb cycles |
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

Three rules the generator holds to, because breaking any of them produced real
bugs: triangles are wound counter-clockwise seen from above (get it backwards
and the renderer culls the ground out from under the player); nothing — camp,
spawn, suitcase, prop or marker pole — is ever placed at a guessed height, but
resolves real ground first and is rejected if that ground is underwater, too
steep to stand on, or already occupied by a boulder; and the camera's basis
vectors are checked against the quaternion three.js builds for the same look
direction, because a flipped `right` mirrors strafe and D walks you left.
