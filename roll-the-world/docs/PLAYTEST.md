# Playtest guide: first-60-seconds feel slice

## Open it
- **Quickest:** open `roll-the-world/RollTheWorld.rbxlx` in Roblox Studio and press **Play** (F5).
- **Live sync while iterating:** install the Rojo plugin, run `rojo serve` in `roll-the-world/`, then click Connect.

On join, the camera slowly orbits the map while the props around spawn finish building, which takes a second or two. Then the camera swoops down from high above, framing your tiny ball against the giant landmark, and you're rolling on the counter surrounded by crumbs. There's no lobby.

## Controls
| | PC / MacBook trackpad | Phone | Gamepad |
|---|---|---|---|
| Roll | WASD / arrows | thumbstick (left side) | left stick |
| Hop | Space | ⬆️ button | A |
| Dash | Shift | 💨 button | X / R2 |
| Orbit camera | Q / E, or click-drag | drag on the right side | right stick |
| Zoom | two-finger scroll | pinch | – |

The camera follows your direction of travel automatically, so you never need right-click.

## What to judge (the first 60 seconds)
1. **Rolling:** does turning feel crisp? Does the ball keep satisfying momentum? Does it feel zippy small and heavy-but-powerful big? (Use the panel's **Size ×2** to jump sizes.)
2. **Absorbing:** do things pop onto the ball instantly, pitched by size and climbing in pitch on streaks? Do props visibly stick out and roll with the ball?
3. **Bonking:** hit something too big at speed. You should get a bounce, a bonk sound, stars, a shockwave, camera shake, and at full speed a couple of props knocked loose.
4. **Growing:** watch the big counter tick up, the "+cm" floaters, and the **next target** card (icon + 🔒 + progress bar). When you pass it you get a "✓ … can be rolled up now!" moment.
5. **Combo and vacuum:** roll through a crumb field. Tiny things get hoovered in from slightly further away, the pops climb in pitch, and a ×N combo counter builds up, with SWEEP! at 12 and WOW! at 25.
6. **Bonk gauge:** bonk something too big. A 🔒 bar over it shows how close you are to rolling it up.
7. **Goals in the distance:** the landmark (fridge / treehouse oak / gumball tower) has a marker that turns into "⭐ ROLL IT UP!" in the Final Roll. Props you're *almost* big enough for glow with a warm outline.

## Tuning panel (Studio only)
Press **F2** or click the 🔧 button. Change speed, acceleration, turn assist, brake, hop, dash, absorb ratio, growth and camera while rolling; changes apply instantly on client and server. **Print** writes the values to Output so they can be pasted into `src/shared/Config/Tuning.luau`. There are also buttons to change size, start the Final Roll, and end the round.

## Things only Studio can confirm (couldn't be verified headless)
- **Smooth meshes:** props are generated with EditableMesh. If a device or experience can't create editable meshes, the game automatically falls back to part-built props and logs one warning. If meshes render inside-out, set `Tuning.Graphics.FlipWinding = true`. If baked shading looks grey or washed out, set `Tuning.Graphics.VertexShading = false`.
- **Built-in sounds:** sound effects use sounds that ship with the Roblox client (`rbxasset://sounds/...`). Music slots are empty until licensed track ids are added in `Config/Sounds.luau`.
- **Feel numbers:** the growth curve was tuned with a headless simulator (`tools/sim`), but speed, camera and turn feel need hands on a controller.
