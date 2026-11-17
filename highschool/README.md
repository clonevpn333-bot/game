# Highschool

*A Calling of Aidan story.* One Friday at Highgate High keeps repeating. Do missions for the
friend group, survive the teachers' darker side, and remember what you learn for the next loop.

Open `index.html` in a browser. No build step. It plays on keyboard and touch, and saves
automatically at the start of every period.

**Controls:** ←/→ walk · E/Space talk & advance · M map · Q quest log · L backlog · A auto ·
S skip (or hold Ctrl) · Esc settings. Touch: on-screen ◀ ▶ / TALK / MAP, tap to advance.

## What's in it

- **Odd and even days:** every new Friday you choose. Odd days run Periods 1, 3, 5 (PE) and 7; even days run
  Periods 2, 4, 6 and 8 with eight different classes and teachers: History (Mr. Grieve), Art (Miss Dahl), Music
  (Mr. Fenwick), ICT (Mrs. Byte), Swimming (Mrs. Tarn), Woodwork (Mr. Oakes), Psychology (Dr. Lyle) and Assembly.
  Before school, break, lunch, home time and After School at **Fair City Mall** happen on both.
- **Classes are playable:** you pick who to sit next to, the teacher teaches, something goes wrong because of who's
  in the room, your neighbour whispers something real, and the bell sends everyone out.
- **The Highgate Archive:** 12 lore pages about what really happened on Friday 13 March 1987. Find them all for
  the secret ending.
  Each period you pick where to go. A mission scene ends the period, and dying restarts the day.
- **Mr. Adam**, the headteacher, loses his mind a little more every period: PA announcements, bursting
  into lessons, digging holes on the field, and a bomb at the bus loop at home time. Everyone talks about it.
- **Every lesson goes wrong:** random chaos, teachers killing kids in the background, Mr. Adam interruptions.
- **35 missions** (most in parts across the day), **17 deaths**, **16 collectibles**, **4 endings**,
  friendship bonds, cross-loop memories, and a curtain call.
  - *Aidan's Bad Day:* Ms. Balduf's English with Hasan, Corey and Aidan → show Omer the video →
    the fight at the lockers, with the whole school chanting and filming.
  - *Seat Wars:* Ms. Shermian's seating plan with Corey, Arjun, Alex, Dheva and Marcus.
  - *The Old Bat* (Ms. Sherman), *Any Reaction* (Ms. Loach), *The Back Fridge* (Mr. Voss),
    *The Beep Test* (Coach Dunmore), *Group Project* (Ms. Balduf).
  - *In Person* (Sean & Stella), *Corey Gets It* (Corey & Abby, PE).
  - New kids: *Locker 13* (Angelo), *Hat-Trick* (Alex), *Texture* (Dheva),
    *Good Morning, Highgate* (Marcus), *Royal Rumble* (Paul), *Buzzer Beater* (Kenneth), *Pushed* (Jacob).
  - *Emergencies Only:* sabotage Corey's purple C.U.R.L. curl cream and watch it go wrong at the bus loop in front of Abby.
  - *Head Case* (Mr. Adam's bomb), *Bake Off* (Mrs. Kettle, Food Tech), *Method* (Mr. Pratt, Drama).
  - Made-up students: *The Armoury* (Tez, 21, still in Year 11, sells weaponised stationery that changes
    how some deaths go), *Register* (Ollie, the Year 7 from 1987 nobody else can see), *Opps* (Kayden's
    four-foot-eleven "gang" and a Super Soaker drive-by at the mall).
  - At the mall: *Arjun, Alone* · *Hasan's Shot* · *Strike Two* · *Small Hours* · *Omer's Mum* · *Pushed Around*.
  - Catfishing and school drama: *@highgate.tea* (who runs the gossip account posting everyone's secrets
    every period?), *Jess from Fair City* (Kenneth is catfished), *Kai Vibes* (Nivaan's fake famous collab),
    *Screenshots* (the group-chat leak), *Leaked* (Kenneth trusts a stranger online who then posts his whole life). DMs and group chats open on a phone screen.
  - *The Calling:* the finale at home time, once you know why Friday keeps happening.

## Files

`js/engine.js` (canvas, audio/music, dialogue, stage, mini-games) · `js/art.js` (sprites, poses,
faces, gore) · `js/rooms.js` (12 backgrounds) · `js/school.js` (periods, roster, map, quest log,
settings, curtain call) · `js/missions-*.js` (all the content; `missions-d.js` has Mr. Adam, the new classes and the mall rooms).

`node tools/test.mjs [runsPerScene] [days]` runs every mission scene with random choices and
autoplays whole days in headless Chromium, failing on any error.

## Single-file builds

`python3 tools/build.py` writes:

- `dist/highschool.html` — the whole game in one file (font and scripts inlined). Works offline.
- `dist/highschool-blob.html` — a launcher with one button that opens the game in a new tab from a `blob:` URL.
  If pop-ups are blocked it opens in the same tab instead.
- `dist/highschool-safe.html` and `dist/highschool-safe-blob.html` — the **safe version**: Abby doesn't exist and
  Corey's love life never comes up (no *Corey Gets It*, no *Small Hours*). It's the normal game plus `js/edition-safe.js`.

Re-run the build after changing anything in `js/`.
