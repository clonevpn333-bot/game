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
- **Bots look like real players.** They wear real Roblox avatars (from people who've played the game, plus dressed-up random accounts), have normal-looking usernames, levels and titles, use ball skins, and chat ("gotcha 😂", "NOOO", "gg"). A few leave and new ones join between rounds, like a real server. They fill each round up to 8 balls, and one leaves for every real player who joins.
- **Roll up smaller balls** (about 1.3× smaller than you). The other player rides on top of your ball laughing. After 3.5 s they can hit **💥 BURST OFF**, which knocks props loose from you and respawns them with a comeback growth boost. Balls of similar size **bump** instead and scatter props.
- **Launch:** the last 10 seconds count down. Then:
  - Your ball rockets up while the junk stuck to it **breaks off in flames and falls away as fuel**.
  - The sky fades into starry space, and **your galaxy** appears above: Nana's star, orbit rings and all your previous planets.
  - Your ball flies into the open orbit, becomes your named planet and starts orbiting.

## Every round is different
- **Vote** on the next round while the results are up: three map + mode cards. Bots vote too.
- **Game modes:**

| Mode | How you win |
|---|---|
| 🌍 Classic Roll | Biggest ball |
| 🔴🔵 Team Roll | Red vs Blue: team sizes add up, and you can't roll up teammates |
| 👑 Crown Chase | The biggest ball wears a crown; whoever holds it longest wins |
| 💰 Gold Rush | The map is full of Golden things; most gold wins (shorter round) |
| 🌪️ Mayhem | Non-stop events and faster growth; biggest ball wins |

- **Round mutators** (most rounds): Bouncy Day, Speed Rush, Extra Sticky, Floaty, Rainbow Day, Critter Party, Growth Spurt, Night Roll. They're announced at round start and stack with world events.
- **Each map has its own layout**, not just its own colors:
  - **Kitchen Counter:** a giant mixing bowl to roll into, a sink full of water, cookbook staircases, a cutting-board bridge, flour heaps, pepper-mill towers, a spilled-milk trail and a round rug.
  - **Backyard BBQ:** a winding stream with stone banks and a wooden footbridge, grassy hills (one big one), leafy trees, a lily pond, a stone garden path and picnic blankets.
  - **Candy Shop:** a chocolate river with wafer bridges, candy-cane poles, lollipop trees, frosting hills, cookie staircases and a candy bowl.
  - Backyard and Candy Shop now have about 97–99 props each, close to the Kitchen's 98.

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
| 🏃 Golden Runner | A golden critter runs from everyone (follow the beam); catch it for +250 ✨ and XP |

To test any event on demand, press the tuning panel's **Event ▶** button repeatedly to cycle through them.

## Things to chase
Use the side menu on the left when you're between rounds, or walk up to the hub stations and press **E**.

- **⭐ Levels:** every round gives XP. Every level gives a reward: Stardust always, plus new shells at levels 5/10/15/20/30/40/50 and titles at milestones. The results card animates your XP bar and shows LEVEL UP.
- **🎖️ Titles:** shown under your name on your ball (for example « Ball Bully »). Earn them from levels, achievements and Rolledex sets, and wear them from the Shop's Titles tab.
- **🏅 Achievements:** 20 lifetime milestones (wins, podiums, things rolled up, balls rolled, size, discoveries, streak, planets) with Stardust, titles and a Champion shell.
- **🧩 Rolledex sets:** themed groups on each map ("Breakfast Club", "Toy Box"…). You get a live "3/5" ping when you find a missing piece. Finishing a set pays out; finishing every set on a map earns that map's Master title.
- **🏆 Records and leaderboards:** your personal best per map shows a NEW PERSONAL RECORD moment mid-round. The hub has boards for the biggest balls ever and the top levels.
- **🔥 Daily streak:** pops up on join. Day 7, 14 and 30 unlock exclusive shells.
- **🧶 Nana's requests:** three new ones every day; claim them for Stardust and a bonus.
- **🛍️ Shop:** spend Stardust on Cores, Shells and Titles.
- **🌌 My Galaxy:** every launched ball becomes a planet. Rename it or pin it.

**Saving in Studio:** to test real saving, turn on *Game Settings → Security → Enable Studio Access to API Services*. Without it, the game uses an in-memory profile and shows a "progress isn't saved" notice. Profiles use session locking, so hopping servers can't lose or duplicate progress.

## Tuning panel (Studio only)
Press **F2** or click the 🔧 button. Change speed, acceleration, turn assist, brake, hop, dash, absorb ratio, growth and camera while rolling; changes apply instantly on client and server. **Print** writes the values to Output so they can be pasted into `src/shared/Config/Tuning.luau`. There are also buttons to change size, start the Final Roll, end the round, and cycle world events.

## Sound
Collect sounds are now soft pops and thumps instead of the old electronic beep. Big pickups land with a low thump, streaks barely rise in pitch, and rapid pickups are thinned out. The effects bus has a warm EQ and a light room reverb. To make them even better, drop licensed Creator Store pop/plop sound ids into `Config/Sounds.luau`.

## Things only Studio can confirm (couldn't be verified headless)
- **Smooth meshes:** props are generated with EditableMesh. If a device or experience can't create editable meshes, the game automatically falls back to part-built props and logs one warning. If meshes render inside-out, set `Tuning.Graphics.FlipWinding = true`. If baked shading looks grey or washed out, set `Tuning.Graphics.VertexShading = false`.
- **Built-in sounds:** sound effects use sounds that ship with the Roblox client (`rbxasset://sounds/...`). Music slots are empty until licensed track ids are added in `Config/Sounds.luau`.
- **Bot avatars** load from Roblox's avatar service. In a brand-new server the first bots may use simple fallback looks for a few seconds until real avatars are fetched.
- **Feel numbers:** the growth curve was tuned with a headless simulator (`tools/sim`), but speed, camera and turn feel need hands on a controller.
