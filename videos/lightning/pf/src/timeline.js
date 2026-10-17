// FILM.TIMELINE — WHY WE WONDER episode 9: STRUCK 7 TIMES (Roy Sullivan, Shenandoah park ranger, 1942–1977).
// Score composed first (tools/score.py "Strike Count", 120 bpm). Narration + every cut on that grid. 24 fps, 36 s.
(function () {
  'use strict';
  const FILM = window.FILM;
  const S = (id, n, start, end, title, brief) => ({ id, file: `${n}-${id}.js`, start, end, mode: 'schematic', title, brief });
  FILM.STRIKES = [0.0, 0.5, 0.9, 1.15, 1.35, 1.55, 1.75];
  FILM.TIMELINE = {
    title: 'Episode 9', bpm: 120, duration: 36, fps: 24, width: 1080, height: 1920,
    shots: [
      S('hook', '01', 0, 3.0, 'Struck 7 times', 'Frame 1 is MID-STRIKE: a bolt slamming into his hat. Seven strikes accelerate into "seven", each a new angle, a new place, a new year.'),
      S('chase', '02', 3.0, 5.5, 'The cloud that chased him', 'SECOND HOOK: a storm cloud racing after his pickup down a mountain road, bolts walking up behind it.'),
      S('ranger', '03', 5.5, 9.75, 'Park ranger', 'Roy, close, under his hat; Blue Ridge layers drift; bolts flicker all round: LIGHTNING FOUND HIM EVERYWHERE.'),
      S('places', '04', 9.75, 13.25, 'Tower, truck, yard', 'Three fast cuts on three strikes: fire tower 1942, truck 1969, front yard 1970.'),
      S('burns', '05', 13.25, 17.25, 'Eyebrows, hair, twice', 'Roy close: eyebrows singe, then strike → hair on fire, strike again → TWICE.'),
      S('cloud', '06', 17.25, 23.75, 'It followed him', 'He sees the cloud, drives off, it follows; he steps out; silence; THE BOLT.'),
      S('wife', '07', 23.75, 26.5, 'His wife too', 'The laundry line in the wind; his wife hanging sheets; struck.'),
      S('fish', '08', 26.5, 30.75, 'Strike seven + the bear', 'Fishing by the river: strike seven; a black bear goes for his trout; THWACK.'),
      S('outro', '09', 30.75, 36, 'Would you?', 'Roy in the storm, bolts on the beat: WOULD YOU STAND NEXT TO HIM IN A STORM?'),
    ],
    cues: [],
  };
})();
