# HIGHSCHOOL — full build prompt

> Paste everything below into the AI that will build the game. Edit anything in **[brackets]** first.

---

## 0. What you are building

Build **HIGHSCHOOL**, a dark-comedy horror puzzle adventure in **pixel art**, set over **one school day that keeps repeating** at **Westmoor High** (a fictional school).

The player is **You**, a student in a friend group that already exists from an earlier game, *The Calling of Aidan*. Every run is one school day, from the 8:00 bell to the end of detention. You pick a mission, scheme through the day with your friends, deal with teachers who range from useless to homicidal, and either pull it off, get expelled, or get killed. Then the day resets. What you learned carries over: who hides what where, which teacher snaps at what, which item opens which door. Clever players chain knowledge across days.

**Genre note:** it belongs to the same genre as time-loop school puzzle games like *Kindergarten*: a repeating day, missions from classmates, items and timing, dark twists. It must be **100% original**. Do **not** copy any existing game's characters, names, art, dialogue, music, locations, missions or story beats. Same genre; our own world.

Tone: an M-rated horror-comedy about a group of mates. Swearing, cartoon pixel gore, petty drama, real friendship and real romance. Teachers are the main threat. Funny first, then suddenly very dark, then funny again.

---

## 1. Content rules (follow these exactly)

- **Swearing:** yes, freely, the way teenagers actually talk.
- **Violence and gore:** yes, as cartoon pixel gore (blood sprays, a head rolling, a teacher killing a student, injuries that persist through the day). It should be shocking and darkly funny, never realistic or lingering.
- **No sexual content involving the students, ever.** Innuendo and double meanings are fine as jokes (Marcus lives on them). Never explicit, never acted out, never about anyone's body.
- **No slurs** and **no jokes about race, ethnicity, religion, disability or sexuality**. Characters have backgrounds; jokes come from personality, not stereotypes.
- **Arjun is cruel with words.** His insults are personal, cutting and specific (your haircut, your mum's car, the thing you cried about in Year 7). They make people actually dislike him. He never uses slurs, and his cruelty has consequences in the story: people stop inviting him, fights, a mission about it.
- Romance (Sean & Stella, Corey & Abby) is sweet, awkward and emotional: notes, hand-holding, a first kiss on the cheek at most.

---

## 2. Graphics: strict pixel art

Everything must look like hand-placed pixel art. This is non-negotiable.

### Canvas and rendering
- Logical canvas **320×180**. Render the backing canvas at a **whole-number multiple** (2×–5×, picked from the screen size) and scale with `image-rendering: pixelated`.
- **Every drawing call snaps to the 320×180 grid.** Use one primitive, `R(x, y, w, h, colour)`, rounding to whole pixels. Lines are pixel lines (Bresenham). Circles are filled row by row. **No smooth vector curves, ellipses, anti-aliased strokes or smooth gradients** on characters, creatures or props. Background gradients are stepped bands.
- **Camera zoom** for close-ups must keep pixels square and even. Either use integer zoom only, or snap every block to device pixels.
- **No rotation for leaning.** Lean and tilt by shifting rows sideways (pixel shear). The only rotations allowed are exact 90° turns (lying down).
- Repaint the **entire frame** every frame (sky, walls, floor). Never leave unpainted strips where effects can build up.
- 60 fps. One self-contained HTML file. No external images, fonts or audio. Everything is drawn and synthesised in code. Include a small pixel font (or a pixel-style web-safe fallback).

### Character sprites
- About **12 px wide × 24–30 px tall**, side-on, **two legs**, two arms, readable at 320×180.
- Built from parts: head (with hairstyle), torso, two-segment arms and legs, hands, shoes. Per-character palette: skin, hair, hairstyle, top, bottoms, plus accessories (glasses, cap, hood strings, headphones, lanyard, whistle).
- **Expressions:** neutral, talk (mouth flaps while speaking), blink, angry (brows down, gritted teeth), grin, smug, shock (O mouth), cry (tear pixels), sleepy (closed eyes), dead (X eyes, blood). **Mouths always sit two pixel rows below the eyes.** Never put dark-red mouth pixels directly under the eyes, or it reads as bloody tears.
- **Articulated poses** with a little skeleton: lean, two-part limbs and props. Each pose is specific to its situation:
  - Base poses: stand, walk (two-leg cycle), run, sit (chair / floor / desk), lie, crouch, kneel, beg.
  - Fighting: fighting stance, punch, kick, headbutt lunge, throw, wind-up and swing (with bat or object), hold someone back, pin someone down, carry overhead.
  - Reactions: hands on hips, crossed arms, facepalm, both hands on head, shrug, think (hand on chin), hand on heart, point.
  - Fun: wave, cheer, dance, finger guns, flex, peace sign.
  - Phone: on phone, filming (phone held sideways in both hands).
- **Signature idle pose per character** (listed in section 5), used when they're introduced or have a big moment.
- Hold props visibly: phones, trays, books, footballs, basketballs, wrestling belt, scissors, ruler, mop, fire extinguisher, hall pass.
- Characters can wear injuries all day: bruises, plaster, arm cast, limp, wheelchair, bandaged head.

### Environments (each a full pixel scene with props)
Homeroom (Ms. Shermian's room) · main corridor with lockers · cafeteria · gym and PE field · science lab · library / study hall (Ms. Loach) · principal's office (Ms. Sherman) · boys' toilets · courtyard · bus loop · teachers' lounge (forbidden) · boiler room basement · roof (locked) · nurse's office · music room · detention room.

Each needs:
- Stepped day lighting that changes from morning to afternoon to detention-evening.
- Small animated details: flickering tube light, steam from cafeteria trays, a fan, rain on windows.
- At least one hiding spot and one interactive object.

### Effects (pixel only)
- Blood sprays and pools, dust puffs, sweat drops and tear drops, all as pixel particles.
- Screen shake (can be turned off).
- A pixel speed-blur on dashes.
- Brief white flashes for camera flashes (can be reduced).
- **No anime-style fight presentation:** no cut-in panels, no impact frames, no speed-line bursts. Drama comes from poses, timing, camera and sound.

---

## 3. Audio
Synthesise everything with the Web Audio API:
- **Location music:** a jaunty homeroom loop, tense corridor, cafeteria funk, PE drums, an eerie library, a dread theme when a teacher snaps, a romance theme (soft, slightly sad indie), a chase theme, and a detention-at-dusk theme.
- **SFX:** school bell, locker slam, footsteps per floor type, whistle, ball bounce, chair scrape, punch, splat, scream, text-message blip, voice blips per character (pitch per person).
- A master volume, and a mute that remembers its setting.

---

## 4. Core structure: one day, on repeat

### The day
```
8:00  Homeroom (Ms. Shermian)        — seating plan, register, announcements
9:00  Period 1                       — science lab OR English
10:15 Break                          — corridor, courtyard, toilets
10:30 Period 2                       — library study hall (Ms. Loach) OR music
12:00 Lunch                          — cafeteria, field, behind the gym
13:00 Period 3: PE                   — gym / field (Coach)
14:15 Period 4                       — whatever your mission needs
15:30 Detention / after school       — Ms. Sherman, bus loop, roof
```

### How the day works
- **Time moves when you do things that matter.** Walking around is free. Big actions (a trade, a scheme step, a fight, a favour) cost time and push the clock towards the next bell. When the bell goes, everyone moves to their next location.
- **One main mission per day,** chosen at homeroom from a mission board ("Pick today's mess"). You can also do small **favours** for classmates, which give items, money or information, and set up future days.
- **Items:** you start with nothing except a few coins. You can find, buy, trade or steal things: a hall pass, a stapler, a teacher's lanyard, Dheva's texture powder, a basketball, chewing gum, a fire extinguisher, a permission slip, a burner phone, a fake doctor's note, the master key.
- **Money:** pocket money, the vending machine, Marcus's "shop", betting on PE matches.
- **Getting caught:** being seen somewhere you shouldn't be fills a **suspicion** meter for the teacher who saw you. Results escalate: a warning, then detention, then a call home, then expulsion (ends the day), then for some teachers death (ends the day).
- **Death and reset:** if you die, or something ends the day, you get a stylish death or ending card, then wake up at 8:00. **Knowledge carries over** (the Notebook, section 7). Missions you've completed stay completed. Their collectibles go in the **Yearbook**.
- **Day counter** with a running gag: the school notices it's "Tuesday" again.

---

## 5. Characters

> Returning palettes are from *The Calling of Aidan* so the sprites match. Hex colours are skin / hair / top / bottoms.

### Returning

| Character | Look (pixel spec) | Personality | Signature pose |
|---|---|---|---|
| **You** | skin #e8b890 · brown hair under a **blue cap** · **red hoodie** #c23b3b · navy jeans #2e3a5c | Answers the phone even when it's a bad idea. Everyone's go-between. | Fighting stance |
| **Hasan** | #d9a878 · short black hair · **big head** · grey hoodie #8d9099 · khaki trousers #b9a276 | Laughs first at jokes about his head so they land softer. Headbutts. Brutally unlucky. | Chest out, arms crossed |
| **Arjun** | #a87048 · fluffy black hair · a few spots · **orange tee** #d87a2e · dark jeans | Funniest person in school and the cruellest mouth. Says the hurtful thing on purpose and makes people genuinely dislike him. | Finger guns |
| **David** | #f0c8a0 · long brown hair · **glasses** · purple top #7a4fa0 · wide build | Kind, never leaves anyone out. A temper he's scared of ("it goes white"). | Hands on hips |
| **Omer** | #e0b088 · short dark hair · **green collared top** #3f9a52 · grey shorts | Writes everyone down in a laminated spreadsheet. Plans for everything. | Pushing glasses up, clipboard |
| **Nivaan** | #b98058 · curly black hair · grey hoodie · blue jeans with cuffs · short | Films everything, so no moment is lost. | Phone held sideways, filming |
| **Corey** | #c08860 · tight black curls · **black zip hoodie** · black trousers | Too good-looking for his own good. Lonely in plain sight. Into sad indie music. | Hand running through his curls |
| **Sean** | #f2cfae · wavy blond hair · black hoodie · grey baggy trousers | Big heart, panics around Stella. | Bat over his shoulder |
| **Stella** | #f0c8a8 · long blonde hair · pink top #c0408a · navy jeans | Plays baseball, braver than everyone, funny, kind but won't put up with nonsense. | Bat over her shoulder |
| **Abby** | #ecd2c4 · black hair with blue and purple streaks · purple eyes · dark alt clothes · headphones | Mysterious, dry, better than Corey at literally everything. | Leaning on a locker, one earbud in |
| **Aidan** | #e6c2a2 · brown **bowl cut** · blue jacket #2456c8 | The new kid. See the secret storyline (section 9). | Waving, half a second late |

### New

| Character | Look (pixel spec) | Personality and mechanics | Signature pose |
|---|---|---|---|
| **Angelo** | **[fill in: hair, clothes, build]** | **[fill in: personality, what he's known for, his catchphrase]**. He gets his own mission (section 6). | **[fill in]** |
| **Alex** | light skin · **wavy blond hair** · team jacket over a sports tee · trackies · always holding some kind of ball | Plays every sport. Triple-booked at all times. Golden-retriever energy. Very competitive. | Spinning a ball on one finger |
| **Dheva** | brown skin · **straighter, less puffy black hair** styled with texture powder (matte, piecey, a few strands up) · **plain black tee** · **baggy track pants** · clean trainers | Calm, stylish, dry. His texture powder is the most valuable item in school. Hates his hair being touched. | Fixing his hair in a reflection |
| **Marcus** | light-tan skin · neat black hair with one cowlick · oversized cardigan · odd socks · a notebook | Genuinely weird and lovable. Constant innuendo and double meanings (never explicit), weird facts, a secret notebook. Runs a black-market "shop" from his locker. | Peeking over his notebook |
| **Paul** | **very tall and lanky** (2–3 px taller than everyone, long thin limbs) · messy brown hair · oversized hoodie | Loves wrestling people (finishers, belts, commentary voice). Funny, harmless, unstoppable. | Arms out like a wrestler entering the ring |
| **Kenneth** | light skin · **dirty-blonde hair** · basketball vest over a tee · shorts · high socks | Class clown who's also really good at basketball. Trash-talks, then backs it up. | Ball on his hip, grinning |
| **Jacob** | dark-brown skin · short black hair · athletic build · PE kit even when it's not PE | Plays loads of sports and is good at all of them. Short fuse about fairness. Gets shoved around in games, but nobody makes fun of him: they respect him too much. When he snaps it's a big moment. | Arms crossed, jaw set |

Every new character needs:
- 15+ lines of idle small talk.
- Reactions to every teacher.
- An opinion on Arjun.
- A favour they can give or ask for.
- At least one mission (section 6).

---

## 6. Teachers and staff (the real threat)

Each teacher has a **mood meter** visible as an icon above their head. Missions are about reading and manipulating it.

### Ms. Shermian — homeroom and English
**Not to be confused with Ms. Sherman.**
- **Look:** tight bun, cat-eye glasses on a chain, pastel cardigan, a lanyard covered in gold-star stickers, a mug that says WORLD'S BEST TEACHER.
- **Personality:** wildly mood-swinging. One minute she's handing out cookies and gold stars ("my little sunflowers!"), the next she's screaming, throwing chairs, threatening you, and sometimes **killing a student**. She is the main horror engine of the game.
- **Obsession:** her **seating plan**. She loves splitting friends apart. Every morning the plan reshuffles. If friends are sat together when she checks, her mood drops.
- **Mood meter:** Sunshine → Sweet → Tense → Snapped. At Snapped she picks a victim. Some days she kills one student "as an example". The death is staged (pixel gore), then the class is told it never happened.
- **Darker side:** something in her bottom desk drawer, an old class photo with everyone's faces scratched out except one, and why she's been teaching the same day forever. Revealed across several missions.

### Ms. Sherman — principal
- **Look:** an old woman in a grey power suit, a lanyard of forty keys, a perm that hasn't moved since 1987, reading glasses on her nose, a whistle she isn't allowed to have.
- **Personality:** a modern, crotchety, power-tripping principal. A jackass to every student, all the time. She invents rules on the spot, loves detention, keeps a wall of "Most Wanted" student photos, and stomps instead of walking. An original character, not based on any existing cartoon principal.
- **Mechanics:** patrols the corridors on a fixed route that changes by period. Her office holds the master key, the permanent-record files and the PA microphone. Getting caught by her costs the most.

### Ms. Loach — library / study hall
- **Look:** cardigan, earbuds in, nail polish, true-crime podcast, feet on the desk.
- **Personality:** does not care what you do. At all.
- **Mechanic, the "How Low Can You Go" ladder:** students try worse and worse things to get any reaction out of her: paper planes, setting a bin on fire, releasing the science snake, a fake fire drill, a full wrestling match on the tables. Each rung is a set piece with its own reaction from her (nothing, a sigh, turning the podcast up). The final rung is something so horrendous she finally reacts. Design that reaction to be the funniest and most terrifying thing in the game.

### Other staff (weird and sketchy)
- **Coach Gripp (PE):** whistle, short shorts, takes PE like war. Picks favourites, punishes the losing team, secretly bets on student matches.
- **Mr. Fenwick (science):** too interested in "specimens". The lab has a locked cupboard that hums.
- **Dot (lunch lady):** ladle and hairnet. The mystery meat is a mystery for a reason. Knows every rumour.
- **Mr. Reeve (janitor):** never speaks and has every key. Sees everything. You can bribe him with very specific things.

---

## 7. Missions (each one is a full chain through the day)

Each mission needs:
- A title card.
- Steps tied to specific times and places.
- Items and favours.
- At least two choices that change the outcome.
- At least one way to die.
- A success ending.
- A collectible for the Yearbook.

Every narrated action must be visibly acted out.

1. **The Seating Plan** (Corey, Arjun, Alex, Dheva, Marcus vs Ms. Shermian). She splits the five up across the room. They plot to end the day sat together without her noticing: swapped name cards, a fake fire drill, bribing her with her favourite tea, and Marcus "distracting" her with weird facts. Arjun's mouth keeps tanking her mood. Ms. Shermian goes from sweet to Snapped. One version ends with a student dead in seat 14. The good ending gets a class photo of all five sat together.
2. **Detention Forever** (Ms. Sherman). Steal your permanent record from her office before 15:30, through her patrol route, the forty keys and the PA system. Hasan's head opens a door that was never meant to open.
3. **How Low Can You Go** (Ms. Loach). The escalation ladder in section 6, with the whole group taking turns. Paul's wrestling match is one rung.
4. **Stella, In Person** (Sean & Stella). Their romance from the first game, now face to face:
   - Notes in lockers.
   - Sharing headphones at break.
   - Batting practice at lunch, where she corrects his stance.
   - Sean panicking in PE.
   - Parker trying to wreck it.

   It ends with them holding hands on the bleachers at sunset. Make it genuinely lovely.
5. **Corey & Abby** (two versions):
   - **Version A, the long one:** library glances, a mixtape in her locker, a walk to the bus loop.
   - **Version B, "got it in PE":** everything goes right in one disastrous PE lesson. A dodgeball to the face, she patches him up in the nurse's office, she's better than him at every sport in the lesson, and he asks her out holding an ice pack.
6. **Paul's Royal Rumble.** Paul organises an illegal wrestling tournament behind the gym at lunch. Brackets, entrance music on someone's phone, a championship belt made of a bin lid. Coach Gripp is betting on it. Ms. Sherman is coming.
7. **Kenneth's Buzzer Beater.** Kenneth bets his whole reputation that he can beat Coach Gripp one-on-one in PE. Trash talk, training montages at break, sabotage. He dunks on a teacher.
8. **Jacob Doesn't Snap** (until he does). Jacob keeps getting shoved in PE by the same Year 11s while Coach looks away. Help him prove it fairly: footage from Nivaan, a witness, a rematch. Or don't, and watch the explosion.
9. **Marcus's Notebook.** Marcus's notebook goes missing. Everyone assumes it's full of innuendo. It's actually a map of every secret in the school, including the teachers' lounge, Ms. Shermian's drawer and the humming cupboard. Get it back before a teacher reads it.
10. **The Powder Economy** (Dheva). Dheva's texture powder becomes school currency. Someone steals his supply. A noir investigation across all four periods.
11. **Alex Is Triple-Booked.** Football, basketball and a swimming gala at the same time, and Alex promised all three. You run a body double, a fake injury and a very fast bike.
12. **Angelo's Mission.** **[fill in, or let the AI invent one that fits Angelo's personality]**
13. **Arjun Says The Thing.** Arjun says something unforgivable in homeroom and the whole year turns on him. Do you help him fix it? Can he? Does he even want to? It ends with either a real apology or Arjun eating lunch alone.
14. **David's Temper.** David has been holding it in all day. Someone keeps kicking his chair. Do you defuse it before it goes white? Callback to the bouncy chair.
15. **Omer's Laminated Heist.** Break into the teachers' lounge for the exam answers. Omer has a twelve-step laminated plan, and every step goes wrong.
16. **Nivaan Goes Viral.** One clip, one million views. What do you film, and what does it cost?
17. **Hasan vs The Head.** A school photo day where Hasan's head literally doesn't fit in the frame. Brutal and funny on Hasan, as always.

Each mission must have at least one **cross-mission consequence**. For example, finishing The Powder Economy means Dheva owes you, which unlocks a shortcut in The Seating Plan.

---

## 8. Systems and user friendliness

- **Notebook / quest log** (Q): a card per mission with an icon, a one-line pitch, status, next step, a locked reason ("Ms. Shermian is Snapped. Wait for her to calm down"), what you've learned, and the Yearbook collectible.
- **Next step** hint line on the HUD at all times. Can be switched off.
- **Map** (Tab): floors, rooms, where each teacher is right now, and the bell timer.
- **Dialogue:**
  - Name tag in each character's colour, text typewriter with a voice blip, and choices as numbered buttons.
  - **AUTO, SKIP (seen lines only) and LOG** buttons sit **above** the box and never cover text.
  - Backlog (L) holds the last 150 lines.
- **Settings** (O): text speed, auto-advance, skip-seen, volume, screen shake on/off, reduced flashing, controls list.
- **Controls:** WASD/arrows, E interact, R cycle targets, Q notebook, Tab map, L backlog, O settings, Esc close. Mobile on-screen d-pad and ACT button. Fully playable by touch.
- **Saves:** auto-save to localStorage after every step. Continue from the start of the current day.
- **Relationships:** a heart meter per classmate. It goes up with favours, missions and kindness, and down with cruelty. High hearts unlock a heart-to-heart conversation and change endings.
- **Yearbook:** a page per character with collectibles, endings found, deaths found ("Killed by Ms. Shermian: seat 14"), and a completion percentage.
- **Death and ending cards:** a stylish pixel card for each death, with a funny caption, then quick restart.
- **Offline copy:** a title-screen button that opens the game as a `blob:` URL, so it works with no internet.

---

## 9. Story spine and endings

- **The loop:** the day keeps repeating, and nobody but You notices at first.
- **The secret thread:** Aidan, from the first game, has transferred to Westmoor. He's the new kid in homeroom. Ms. Shermian's scratched photo, Marcus's map and the humming cupboard all point to him and to why the day won't end. Every time somebody ignores the new kid, the loop tightens.
- **Endings:**
  1. **Expelled.**
  2. **Killed** (several variants).
  3. **Graduation of One:** you escape alone.
  4. **Everyone Sits Together:** the Seating Plan ending.
  5. **The Last Bell:** the true ending. Everyone, Aidan included, walks out of the school gates together on Wednesday.
- **Post-credits:** after any standard ending, a short pixel musical number on the school stage. It's original song-and-dance chaos that falls apart into an absurd, gory, non-canon food fight or brawl. Then the curtain drops and everyone bows. It never plays after the secret ending, and the player can skip it.

---

## 10. How to build it (instructions for the builder)

1. Build in this order:
   1. Engine: pixel renderer, sprites and poses, camera, dialogue.
   2. One location and one character.
   3. The day clock and bells.
   4. Teachers' patrols and mood meters.
   5. Missions one at a time.
   6. Systems: notebook, saves, settings.
   7. Polish.
2. **Staging rule:** if a line says someone does something, it is shown. If a line says someone is somewhere else ("Sean's in the shower"), they are **not** on screen. Write an automated audit that plays every scene and flags lines describing action where nothing moves, and lines that contradict who is visible.
3. **Pixel rule check:** an automated test that fails if any character, creature or prop drawing uses `arc`, `ellipse`, `quadraticCurveTo`, `bezierCurveTo`, `rotate` (except 90°) or smooth gradients.
4. Test every mission branch automatically (choices cycled, characters dead or alive) in a fast mode with no errors. Play key scenes live and screenshot them to check the visuals.
5. Keep everything in one HTML file with no network requests, and make it work on Chromebooks and phones.

---

**Characters to fill in before sending:** Angelo's look, personality and mission (sections 5 and 7). Everything else is ready to go.
