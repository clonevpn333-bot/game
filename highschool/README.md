# Highschool

*A Calling of Aidan story.* One Friday at Highgate High keeps repeating. Do missions for the
friend group, survive the teachers' darker side, and remember what you learn for the next loop.

Open `index.html` in a browser. No build step. It plays on keyboard and touch, and saves
automatically at the start of every period.

**Controls:** ←/→ walk · E/Space talk & advance · M map · Q quest log · L backlog · A auto ·
S skip (or hold Ctrl) · Esc settings. Touch: on-screen ◀ ▶ / TALK / MAP, tap to advance.

## What's in it

- **The day:** Before School → Period 1 → Break → Period 2 → Lunch → PE → Period 3 → Home Time.
  Each period you pick where to go. A mission scene ends the period, and dying restarts the day.
- **17 missions** (most in parts across the day), **13 deaths**, **12 collectibles**, **4 endings**,
  friendship bonds, cross-loop memories, and a curtain call.
  - *Aidan's Bad Day:* Ms. Balduf's English with Hasan, Corey and Aidan → show Omer the video →
    the fight at the lockers, with the whole school chanting and filming.
  - *Seat Wars:* Ms. Shermian's seating plan with Corey, Arjun, Alex, Dheva and Marcus.
  - *The Old Bat* (Ms. Sherman), *Any Reaction* (Ms. Loach), *The Back Fridge* (Mr. Voss),
    *The Beep Test* (Coach Dunmore), *Group Project* (Ms. Balduf).
  - *In Person* (Sean & Stella), *Corey Gets It* (Corey & Abby, PE).
  - New kids: *Locker 13* (Angelo), *Hat-Trick* (Alex), *Texture* (Dheva),
    *Good Morning, Highgate* (Marcus), *Royal Rumble* (Paul), *Buzzer Beater* (Kenneth), *Pushed* (Jacob).
  - *The Calling:* the finale at home time, once you know why Friday keeps happening.

## Files

`js/engine.js` (canvas, audio/music, dialogue, stage, mini-games) · `js/art.js` (sprites, poses,
faces, gore) · `js/rooms.js` (12 backgrounds) · `js/school.js` (periods, roster, map, quest log,
settings, curtain call) · `js/missions-*.js` (all the content).

`node tools/test.mjs [runsPerScene] [days]` runs every mission scene with random choices and
autoplays whole days in headless Chromium, failing on any error.
