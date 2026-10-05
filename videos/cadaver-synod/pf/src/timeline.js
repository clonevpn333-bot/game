// FILM.TIMELINE — WHY WE WONDER episode 5: the Cadaver Synod (Rome, 897). Narration locked in ../vo. 24 fps, 37 s.
(function () {
  'use strict';
  const FILM = window.FILM;
  const S = (id, n, start, end, title, brief) => ({ id, file: `${n}-${id}.js`, start, end, mode: 'schematic', title, brief });
  FILM.SHIFT = 2.02; // shots after the hook keep their v1 timings internally (T + SHIFT); narration from line 4 on is unchanged
  FILM.TIMELINE = {
    title: 'Episode 5', bpm: 120, duration: 37.23, fps: 24, width: 1080, height: 1920,
    shots: [
      S('hook', '01', 0, 4.25, 'Dead nine months', 'Lightning: a skull in a papal tiara fills the frame; DEAD / 9 MONTHS / ON TRIAL stamped.'),
      S('popes', '03', 4.25, 7.0, 'Stephen hated Formosus', 'Two stained-glass windows; the old pope’s cracks and shatters in 3D.'),
      S('exhume', '04', 7.0, 9.23, 'Dug up the corpse', 'Graveyard, gravedigger, the coffin lid bursts open.'),
      S('nave', '05', 9.23, 11.23, 'Robes and a throne', '3D candle-lit nave dolly to the robed corpse on its throne.'),
      S('deacon', '06', 11.23, 14.73, 'The deacon and the scream', 'Deacon trembling beside the corpse; Stephen screams, candles gutter.'),
      S('guilty', '07', 14.73, 16.48, 'Guilty', 'Silence, one candle, the skull; GUILTY slams in with lightning.'),
      S('fingers', '08', 16.48, 19.23, 'The blessing fingers', 'Skeletal blessing hand; blade flash; three finger bones tumble in 3D.'),
      S('tiber', '09', 19.23, 20.98, 'Into the river', 'Moonlit Tiber in perspective; the shrouded body drops and splashes.'),
      S('uprising', '10', 20.98, 23.23, 'Rome was horrified', 'Torch-lit crowd marching toward camera in 3D rows.'),
      S('prison', '11', 23.23, 25.98, 'Prison… strangled', 'Stephen behind bars in a moon shaft; the candle is snuffed.'),
      S('title', '12', 25.98, 30.48, 'The Cadaver Synod', 'Illuminated manuscript page flips in 3D; blackletter title; miniature of the trial.'),
      S('outro', '13', 30.48, 37.23, 'Outro', 'Skull + tiara in darkness → fact line → WHY WE / WONDER → STAY CURIOUS.'),
    ],
    cues: [],
  };
})();
