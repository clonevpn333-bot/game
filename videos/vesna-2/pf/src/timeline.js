// FILM.TIMELINE — WHY WE WONDER episode 8, PART 2 "The Lie?": the 2009 shoot-down claim vs the official record.
// Score composed first (tools/score.py "Cover-Up", 120 bpm). Narration + every cut on that grid. 24 fps, 34 s.
(function () {
  'use strict';
  const FILM = window.FILM;
  const S = (id, n, start, end, title, brief) => ({ id, file: `${n}-${id}.js`, start, end, mode: 'schematic', title, brief });
  FILM.TIMELINE = {
    title: 'Episode 8 · Part 2', bpm: 120, duration: 34, fps: 24, width: 1080, height: 1920,
    shots: [
      S('hook', '01', 0, 2.5, 'Might never have happened', 'Frame 1: the torn record certificate, the line slicing it again; 1.25 the altimeter 33,330 glitches and is struck out.'),
      S('radar', '02', 2.5, 6.0, 'Shot down by mistake', 'SECOND HOOK: radar sweep, the jet blip, a crosshair locks on the beats; missile streak → flash on SHOT DOWN; BY MISTAKE.'),
      S('fighter', '03', 6.0, 9.75, 'Not a bomb?', 'A bomb icon struck out; a MiG-21 crosses under the DC-9 with an afterburner trail.'),
      S('rewind', '04', 9.75, 15.0, 'A few hundred meters', 'Her 33,330 ft fall line beside Everest is struck out and shrinks to a stub of a few hundred metres.'),
      S('cover', '05', 15.0, 18.5, 'A cover story?', 'The certificate under a lamp; a SECRET dossier slides in; COVER STORY? stamped; silence.'),
      S('blackbox', '06', 18.5, 21.5, 'The black boxes', 'PIVOT: the flight recorder slams in; its altitude trace draws flat at cruising height and marks the blast up there.'),
      S('vesna', '07', 21.5, 24.25, 'She rejected it', 'Vesna in warm light; the shoot-down dossier is stamped REJECTED.'),
      S('memory', '08', 24.25, 27.5, 'She never remembered', 'A filmstrip of her memory: COPENHAGEN, then frames going dark — the fall is blank.'),
      S('outro', '09', 27.5, 34, 'Which do you believe?', 'The certificate halves rejoin: OFFICIALLY, SHE STILL HOLDS THE RECORD; WHICH DO YOU BELIEVE?; WHY WE WONDER.'),
    ],
    cues: [],
  };
})();
