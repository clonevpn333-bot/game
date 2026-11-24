# HIGHSCHOOL — rules for working on this game

These come from the person making this game. Follow all of them every time.

## The big one: if the text says it, the screen shows it
Anything described in dialogue, narration (`N(...)`), quest text, tips or choices must
physically happen in the game and be animated: the right characters on screen, the right
poses, props and effects, in the right room. Before writing a line, check that the scene
actually stages it. If it can't be staged, reword the line. This is the most common mistake,
so check every line.
- Nobody vanishes from a scene: they walk, run, get thrown or carried off.
- Nobody slides: they walk, run or get thrown.
- A prompt or label must match what is visible (who is there, what they are doing, what they hold).
- When a character is mentioned as present, put them in the scene.

## Story and world
- Two-week calendar (14 days). Monday’s odd/even pick sets the week, alternating. Weekends have side quests.
- Dying replays the same day from its start. NPC deaths last for the rest of that week; everyone is back after the weekend.
- Quest progress carries across days: a quest picks up where it was left, never restarts.
- Quests reset every two weeks (a new run). Deaths reset every weekend.
- Don’t make quests wait for tomorrow. Make big quests longer with chaotic in-between scenes between their steps instead (`js/flow.js`).
- The main story moves as soon as the last chapter’s thing is done, in any free time (not only break/lunch). Inspection Day stays on day 12.
- Every quest has a blunt `goal`, and its next step says where to walk (`routeText` in `js/world.js`). The HUD's RIGHT NOW list, the floor plan and the quest log's Right Now tab show what's doable this period (`js/guidance.js`).
- Quest lines that promise a time (“at break”, “home time”) must match when the next step can actually happen.
- Keep feelings real-sized: heartfelt scenes get a joke or a deflection; nobody becomes your best friend after one quest.
- The quest log (`js/questlog.js`, Q) opens on DO NOW: what you can do this period (started quests first, only 3 new ones unless expanded), your class, a later-today timeline. 📌 Track puts one line under the clock and an in-world arrow to the next door/edge. At most 2 new-quest “!” marks per room. The TODAY tab is the tracker (`js/tracker.js`, also T): today’s classes, the main story, every started quest with when/where its next step is, and where everyone is now and next period. Under the clock there’s always a 📚 next-class line. A quest pickup spot needs a `mis` tag or the guidance can’t see it. If a quest’s next step lives in another quest, add it to `VIA`. Check stalls with `node tools/audit-quests.mjs`.
- The player DOES things in quests (`js/jobs.js`): many quest steps are jobs: fetch an item from another room and hand it over, plant something, shove (X or E) or fight (mash) someone. Add new ones with `J(mission, step, {...})`; items are drawn where they wait. X shoves anyone; teachers who see it punish you.
- Side Hustles (`js/gigs.js`): three generated gigs every school day (deliver, shove, fight, plant), in ⚡ Do Now, paying cash and rep.
- When the bell goes, everyone in the room runs off-screen before the next period starts (`js/tracker.js`).
- Shoving has payback (`js/payback.js`): hot-headed kids swing back, pull a weapon (run/fight/beg; losing can kill you: Shanked/Jumped deaths) or hold a grudge and ambush you later with backup. 7th/8th graders (Jaxon, Kaylee, Brayden + 8th graders) do Bin Day outside: carry you and dump you in the big trash can, or pull a weapon.
- Real-time roam events (`js/live.js`) every 30–45 s so walking around is never dead time: dodge a thrown ball or a sprinting kid (move up/down; streak rewards), sneak-grab by 7th/8th graders (mash LEFT+RIGHT to pull away or get binned), loose cash to race for, and people with a quest for you walk up and start it themselves (new quests and next steps of started ones; tracked quest first). Walking is faster and text is faster by default. Pixel font has no arrow glyphs: write LEFT/RIGHT.
- Variety (`js/variety.js`): ~45% of steps of STARTED quests get a playable complication first (chase a snatcher, lockpick, Simon handshake/patrol, throw at a moving target, race a rival), win = bonus, lose = small cost, quest continues. Three daily challenges (top of ⚡ Do Now) pay $5 + 🍎 each, $10 for all three.
- Random chaos happens around the school (`js/chaos.js`): free, quick, edgy.
- Characters you’re mid-quest with come back the next day if they die.
- Apples are only spent on doing things (quest steps, investigating, picking things up), never on chatting.
- Show how quests turned out during the two weeks: couples together around school, posters, gossip, changed chat lines.
- Small talk should differ from day to day.
- Later quest steps should be available at every sensible time (break and lunch, etc.), not one slot.
- Quest steps must not appear before the scene that sets them up.
- Never refer to “always Friday” or a repeating Friday for the living characters (only the 1987 ghost lore keeps it).
- The school is walkable (`js/world.js`): hallways left to right, doors you walk up into, a real stairwell room between the floors (`js/stairs.js`). No map teleporting; M is a floor plan only.
- Wandering pays (`js/roam.js`): lockers, teachers’ desks in empty classrooms, coins, vending snacks (+1 apple), overheard gossip that points at quests.
- Every day ends with a ride home on the 43 (`js/busride.js`): a couple of events per ride, story moments for whatever quests are in progress, then a night text on your phone. Paul Jones’s arc ends on the last school day (day 12).
- Week two (days 8–12): metal detector at the front doors, back way in through the woods (`js/detectors.js`). Fair City Mall has robberies after school (`js/robbery.js`).
- Guns and school violence are story events the player reacts to (talk down, disarm, hide). The player never brings or starts with a gun; the only exception is the real lockdown (`js/lockdown2.js`, week two, once a run, in both versions), a long cinematic level: alarm + doors slamming + heartbeat, the reveal, then a real-time stealth hall (he patrols with a sight cone; hide at a door, fire alarm at the far end opposite his entry, or E behind him for a takedown), slow-motion takedown with the gun skidding away, then pin / knock out / pick it up and shoot, then police lights and an end card. Played serious, not as a joke. `cineFall()` + `slowmo()` are the reusable special falls.
- Hall fights (`js/spice.js`): passing-period fights with a chanting ring; watch, bet, break up or jump in. Quest-givers who walk up grab your arm: E listen, walk away to pull free, and the second time X slaps them (they tear up and leave, no more asks that day).
- “Start a New Two Weeks” is on the title screen and pause menu (click twice to confirm).
- Classes go in timetable order. Returns: walk into any empty classroom in odd Period 3.
- Every timetabled lesson is different each time across the two weeks (`js/lessons2.js`), and the teacher gets more hostile each time. No repeating mini-action menus in class.

## Characters
- Kids talk like real kids (short, casual, slangy), not like characters in a book.
- Animation: poses glide (`js/motion.js`), speed set by emotion; people fall over, they don’t snap to the floor. Position jumps inside a room glide as quick steps and sitting settles (`js/polish.js`).
- Weapons are gripped, not pasted on (`js/grip.js`): the hand closes round the handle, the weapon points where the pose needs it, and picking one up is a grab (reach low, close, swing up). New weapons go in `GRIP_W` with a handle and a business end.
- Look and act like *The Calling of Aidan* (branch `claude/elegant-pasteur-0012uv`, `aidan/index.html`).
- Abby: pale, long black hair with subtle faded blue and purple strands, dark clothes, no headphones, no purple brows.
- Aidan: really short (shortest of the kids, below Nivaan) but normal human proportions.
- Smirk = steady eyes, one brow cocked up, flat mouth tucked up at one corner. Never a wink.
- Background kids’ hair must contrast with their skin (`exHair` in `js/ambience.js`): no same-brown hair and skin.
- Stairs in the hallways are stairwell fire doors (`drawStairs` in `js/world.js`); the stairs themselves are only in the stairwell room.
- Angelo: Hispanic, straight hair, baggy black pants, brown tee.
- Each teacher speaks in their own voice (`VOICE` in `js/clarity.js`): never give one teacher another’s catchphrases.
- Teachers kill sneakily when a class is watching, and openly only with one or two kids around.

## Tone and content
- M-rated: swearing, gore, dark comedy and edgy teen humor are wanted.
- No slurs and no disguised slurs (not even made-up words that sound like them).
- No sexual content involving the kids. Raunchy = actually filthy, not innuendo: the ADULTS (teachers, parents, randos) can be explicitly crude, with sex stuff happening just off-screen (heard, van rocking, gear found), plus gross-out. Kids react, puke, film, roast, get revenge, never take part. Sex jokes and joking mentions of adult nudity are wanted (dialogue, chats, audio); nothing sexual or nude is drawn on screen. These quests are tagged 🔞 FILTHY (`js/filthy.js`: add new ones to FILTHY): Parental Advisory card on first start, Filth-o-Meter, Settings on/off (off by default in the safe version). See `js/raunch.js` and `js/hotmic.js`. Gross-out hits the audience on screen with `spew()`/`pukeChain()`/`stain()` in `js/splash.js` (puke, brown, milk, chili only).
- American English everywhere.
- The “safe version” has no Abby and no Corey romance. Call it “safe version”, never “no Abby”.

## Craft
- After an update, send the user screenshots of the new stuff with short captions.
- The HUD box stays compact on phones (tap to expand). Don’t let on-screen text cover the action.
- Pixel art at 320×180, full-screen game with a floating text box. Keyboard and touch both work.
- New rooms must be drawn to the forest glow-up standard: cached static layer with light, shade, texture and clutter, plus small animated touches (see `js/glowup.js`).
- Soundtrack (`js/music.js`): the Definitive score is CALM and creepy-cute (slow music box / toy piano nursery tunes in minor over a soft pulse, pad and low sub; no hard drums), all original; Classic score selectable in Settings. Ambience is LOUD and alive: room beds, distant chatter, birds, everyone's footsteps, lockers, cutlery. Voices (`js/voice.js`): dialogue is a separated “ahh” per syllable (voice-box through the 'a' formants, each character's own pitch, Undertale-style); the background crowd is an airport-terminal hum: 14 distant synthesized voices (mm-ah) nearly always talking with drifting pitch and vowels, blended with a soft speech-shaped wash and a big hall reverb, ducking under dialogue (the user likes it: it sounds like cars passing the school; keep it, a little quiet). On top, the kids on screen audibly mumble short mm-ahh phrases in their own pitch (gossip bubbles speak too), louder when near, ducking under dialogue. Settings has voice and crowd-hum loudness.
- Raunch happens behind closed doors / off-screen: thumping, rattling doors, things flying out, muffled lines (`doorbang` chaos in `js/final.js`). No moms in filthy quests; kids only bet, film, react.
- Skip/fast-forward only runs in cutscenes (Ctrl or ⏩); S and A are movement keys. Every room change uses the one dip-to-black in `js/fixes.js`.
- Definitive Edition layer (`js/remaster.js`): squash & stretch, blinking, talk gestures, startle hops, run dust, footsteps, sliding cutscene bars, NEW/UPDATED/COMPLETE quest banners (top right), sprite rim light, time-of-day grade and dust motes (Settings → Remaster effects). Version shown on title + settings.
- Quick check after each change: `tools/quick.sh` (~2 min, normal + safe). Full run only at milestones: `node tools/test.mjs` and `HS_URL=.../dist/highschool-safe.html` (~25 min). Build with `python3 tools/build.py`.
- Always rebuild `dist/` and send all four HTML files after changes.
