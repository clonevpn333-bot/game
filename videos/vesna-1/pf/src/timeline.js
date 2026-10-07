// FILM.TIMELINE — WHY WE WONDER episode 8, PART 1 "The Fall": Vesna Vulović, JAT Flight 367, 26 January 1972.
// Score composed first (tools/score.py "Freefall", 120 bpm). Narration + every cut on that grid. 24 fps, 35.5 s.
(function () {
  'use strict';
  const FILM = window.FILM;
  const S = (id, n, start, end, title, brief) => ({ id, file: `${n}-${id}.js`, start, end, mode: 'schematic', title, brief });
  FILM.TIMELINE = {
    title: 'Episode 8 · Part 1', bpm: 120, duration: 35.5, fps: 24, width: 1080, height: 1920,
    shots: [
      S('hook', '01', 0, 3.0, 'She fell 33,000 feet', 'Frame 1: Vesna falling through clouds, altimeter racing; 1.5 the altimeter + NO PARACHUTE stamp; 2.75 everything rewinds.'),
      S('board', '02', 3.0, 5.5, 'Never supposed to be there', 'SECOND HOOK on the 3.0 hit: split-flap board clacks to JAT 367 · CREW: VESNA — a red box slams round her name.'),
      S('cards', '03', 5.5, 9.0, 'The wrong Vesna', 'Two crew cards, both VESNA; ASSIGNED: JAT 367 stamps hers; the card shrinks into the night sky.'),
      S('jet', '04', 9.0, 11.0, '1972', 'The DC-9 at 33,330 ft over Czechoslovakia, clouds sliding below.'),
      S('blast', '05', 11.0, 12.75, 'The blast', 'DROP: whiteout, the jet tears into three pieces, fire and debris.'),
      S('fall', '06', 12.75, 17.0, 'The fall', '28 seats, 27 go dark, one stays lit; the cutaway: a fuselage section tumbling, her outline pinned by a food cart, altimeter racing to 0.'),
      S('forest', '07', 17.0, 20.25, 'Snowy forest', 'CRASH into a snowy slope of firs; a villager walks to the wreck, sound rings.'),
      S('alive', '08', 20.25, 23.0, 'Alive', 'X-ray: skull fracture cracks, broken legs PiP, heartbeat: ALIVE.'),
      S('record', '09', 23.0, 26.75, 'The record', 'The fall line stands next to Everest — higher; the world-record certificate stamps.'),
      S('cliff', '10', 26.75, 30.75, 'Was it a lie?', 'Decades later: newspaper spins in; on LIE the curiosity line rips the certificate in half.'),
      S('outro', '11', 30.75, 35.5, 'Subscribe for Part 2', 'Her head alone in the dark; SUBSCRIBE FOR PART 2; WHY WE WONDER.'),
    ],
    cues: [],
  };
})();
