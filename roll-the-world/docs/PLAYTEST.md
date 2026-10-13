# Playtest guide

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

## Rounds, bots and PvP
- **Bots** fill each round up to 8 balls, so solo play feels busy. One bot leaves for every real player who joins.
- **Roll up smaller balls** (about 1.3× smaller than you). The other player rides on top of your ball laughing. After 3.5 s they can hit **💥 BURST OFF**, which knocks props loose from you and respawns them with a comeback growth boost. Balls of similar size **bump** instead and scatter props.
- **Launch:** the last 10 seconds count down ("🚀 Launch in 10! Get BIG!"). Then every ball rockets into the sky, the camera rides along, and each ball pops into a planet. Your new planet appears in **My Galaxy**.

## World events (chaos)
Every round has two big events, at 2:00 and 4:30. Small surprises land about every 40–60 s in between. The same event never repeats within a round.

| Event | What happens |
|---|---|
| ☄️ Meteor Shower | Glowing Starfall props streak down near every player with flaming tails and impact rings |
| 🌧️ Sticky Rain | Everything is stickier: you can roll up bigger things than usual |
| 🌅 Golden Hour | Props near players turn Golden (extra Stardust), with warm lighting |
| 🦆 Stampede | A herd of critters runs across the map |
| 🌙 Low Gravity | Floaty, bouncy hops everywhere |
| 🦖 Giant Moment | A ball that isn't winning pops bigger and grows 3× faster for 18 s. RUN! |
| 📦 Supply Drop | A pile of goodies lands somewhere, marked with a sky beam and distance |
| ⚡ Growth Frenzy | Everyone grows 50% faster for 15 s |
| 🌠 Shooting Stars | A short burst of meteors |

To test any event on demand, press the tuning panel's **Event ▶** button repeatedly to cycle through them.

## Daily reasons to come back
Use the side menu on the left when you're between rounds, or walk up to the hub stations and press **E**.

- **🔥 Daily streak:** pops up on join. Rewards climb for 7 days, then the cycle repeats with a weekly bonus. Day 7 unlocks the Starlight shell, day 14 Golden, and day 30 Rainbow. Missing a day restarts the streak.
- **🧶 Nana's requests:** three new requests every day (easy / medium / hard), for example "Roll up 25 fruit things", "Grow to 80 cm" or "Roll up 3 other balls". Progress counts across rounds, and a small tracker shows it during a round. Claim rewards for Stardust; finishing all three gives a bonus. After 5 such days you earn Nana's Knit shell. You get one free swap per day.
- **📖 Rolledex:** every prop in every map. Undiscovered props are silhouettes with a hint. Dots show which mutation variants you've found. A red "!" appears on the menu when there's something new.
- **🛍️ Shop:** spend Stardust to unlock and level up **Cores** (Magnet, Bouncy, Heavy, Swift…) and to buy **Shells** (ball skins). Shells re-skin your ball instantly.
- **🌌 My Galaxy:** every launched ball becomes a planet orbiting Nana's star. Its colors come from what you rolled up, and winners get a golden ring. Tap a planet to rename it, see its signature props, or pin it so it's kept forever.

**Saving in Studio:** to test real saving, turn on *Game Settings → Security → Enable Studio Access to API Services*. Without it, the game uses an in-memory profile and shows a "progress isn't saved" notice. Profiles use session locking, so hopping servers can't lose or duplicate progress.

## Tuning panel (Studio only)
Press **F2** or click the 🔧 button. Change speed, acceleration, turn assist, brake, hop, dash, absorb ratio, growth and camera while rolling; changes apply instantly on client and server. **Print** writes the values to Output so they can be pasted into `src/shared/Config/Tuning.luau`. There are also buttons to change size, start the Final Roll, end the round, and cycle world events.

## Things only Studio can confirm (couldn't be verified headless)
- **Smooth meshes:** props are generated with EditableMesh. If a device or experience can't create editable meshes, the game automatically falls back to part-built props and logs one warning. If meshes render inside-out, set `Tuning.Graphics.FlipWinding = true`. If baked shading looks grey or washed out, set `Tuning.Graphics.VertexShading = false`.
- **Built-in sounds:** sound effects use sounds that ship with the Roblox client (`rbxasset://sounds/...`). Music slots are empty until licensed track ids are added in `Config/Sounds.luau`.
- **Feel numbers:** the growth curve was tuned with a headless simulator (`tools/sim`), but speed, camera and turn feel need hands on a controller.
