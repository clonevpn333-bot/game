// FILM.TIMELINE — WHY WE WONDER episode 5: the Cadaver Synod (Rome, 897). Narration locked in ../vo. 24 fps, 37 s.
(function () {
  'use strict';
  const FILM = window.FILM;
  const S = (id, n, start, end, title, brief) => ({ id, file: `${n}-${id}.js`, start, end, mode: 'schematic', title, brief });
  FILM.TIMELINE = {
    title: 'Episode 5', bpm: 120, duration: 37, fps: 24, width: 1080, height: 1920,
    shots: [
      S('hook', '01', 0, 3.5, 'Dead nine months', 'Lightning: a skull in a papal tiara fills the frame; DEAD / 9 MONTHS / ON TRIAL stamped.'),
      S('rome', '02', 3.5, 5.25, 'Rome, 897', 'Flight over a blood-moon Rome skyline, ravens; ROMA · DCCCXCVII.'),
      S('popes', '03', 5.25, 9.0, 'Stephen hated Formosus', 'Two stained-glass windows; the old pope’s cracks and shatters in 3D.'),
      S('exhume', '04', 9.0, 11.25, 'Dug up the corpse', 'Graveyard, gravedigger, the coffin lid bursts open.'),
      S('nave', '05', 11.25, 13.25, 'Robes and a throne', '3D candle-lit nave dolly to the robed corpse on its throne.'),
      S('deacon', '06', 13.25, 16.75, 'The deacon and the scream', 'Deacon trembling beside the corpse; Stephen screams, candles gutter.'),
      S('guilty', '07', 16.75, 18.5, 'Guilty', 'Silence, one candle, the skull; GUILTY slams in with lightning.'),
      S('fingers', '08', 18.5, 21.25, 'The blessing fingers', 'Skeletal blessing hand; blade flash; three finger bones tumble in 3D.'),
      S('tiber', '09', 21.25, 23.0, 'Into the river', 'Moonlit Tiber in perspective; the shrouded body drops and splashes.'),
      S('uprising', '10', 23.0, 25.25, 'Rome was horrified', 'Torch-lit crowd marching toward camera in 3D rows.'),
      S('prison', '11', 25.25, 28.0, 'Prison… strangled', 'Stephen behind bars in a moon shaft; the candle is snuffed.'),
      S('title', '12', 28.0, 32.5, 'The Cadaver Synod', 'Illuminated manuscript page flips in 3D; blackletter title; miniature of the trial.'),
      S('outro', '13', 32.5, 37.0, 'Outro', 'Skull + tiara in darkness → fact line → WHY WE / WONDER → STAY CURIOUS.'),
    ],
    cues: [],
  };
})();
