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
- Random chaos happens around the school (`js/chaos.js`): free, quick, edgy.
- Characters you’re mid-quest with come back the next day if they die.
- Apples are only spent on doing things (quest steps, investigating, picking things up), never on chatting.
- Show how quests turned out during the two weeks: couples together around school, posters, gossip, changed chat lines.
- Small talk should differ from day to day.
- Later quest steps should be available at every sensible time (break and lunch, etc.), not one slot.
- Quest steps must not appear before the scene that sets them up.
- Never refer to “always Friday” or a repeating Friday for the living characters (only the 1987 ghost lore keeps it).
- The school is walkable (`js/world.js`): hallways left to right, doors you walk up into, stairs to the second floor. No map teleporting; M is a floor plan only.
- Every day ends with a ride home on the 43 (`js/busride.js`): a couple of events per ride, story moments for whatever quests are in progress, then a night text on your phone. Paul Jones’s arc ends on the last school day (day 12).
- Week two (days 8–12): metal detector at the front doors, back way in through the woods (`js/detectors.js`). Fair City Mall has robberies after school (`js/robbery.js`).
- Guns and school violence are story events the player reacts to (talk down, disarm, hide). The player is never the shooter.
- Classes go in timetable order. Returns: walk into any empty classroom in odd Period 3.
- Every timetabled lesson is different each time across the two weeks (`js/lessons2.js`), and the teacher gets more hostile each time. No repeating mini-action menus in class.

## Characters
- Kids talk like real kids (short, casual, slangy), not like characters in a book.
- Animation: poses glide (`js/motion.js`), speed set by emotion; people fall over, they don’t snap to the floor.
- Look and act like *The Calling of Aidan* (branch `claude/elegant-pasteur-0012uv`, `aidan/index.html`).
- Abby: pale, long black hair with subtle faded blue and purple strands, dark clothes, no headphones, no purple brows.
- Angelo: Hispanic, straight hair, baggy black pants, brown tee.
- Each teacher speaks in their own voice (`VOICE` in `js/clarity.js`): never give one teacher another’s catchphrases.
- Teachers kill sneakily when a class is watching, and openly only with one or two kids around.

## Tone and content
- M-rated: swearing, gore, dark comedy and edgy teen humor are wanted.
- No slurs and no disguised slurs (not even made-up words that sound like them).
- No sexual content involving the kids. Adult-only innuendo is fine.
- American English everywhere.
- The “safe version” has no Abby and no Corey romance. Call it “safe version”, never “no Abby”.

## Craft
- After an update, send the user screenshots of the new stuff with short captions.
- Pixel art at 320×180, full-screen game with a floating text box. Keyboard and touch both work.
- Music is calm, mellow and slow.
- Test with `node tools/test.mjs` (normal) and `HS_URL=.../dist/highschool-safe.html` (safe). Build with `python3 tools/build.py`.
- Always rebuild `dist/` and send all four HTML files after changes.
