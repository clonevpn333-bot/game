// FILM.TIMELINE — WHY WE WONDER episode 6: the Man in the Iron Mask. Narration locked in ../vo. 24 fps, 40 s.
(function () {
  'use strict';
  const FILM = window.FILM;
  const S = (id, n, start, end, title, brief) => ({ id, file: `${n}-${id}.js`, start, end, mode: 'schematic', title, brief });
  FILM.OFF1 = 0.625; // locked/order keep their v1 clocks (line 3–4 audio unchanged, now 0.625 s earlier)
  FILM.OFF2 = 7 / 24; // bastille → outro keep their v1 clocks (now 7 frames earlier)
  FILM.TIMELINE = {
    title: 'Episode 6', bpm: 120, duration: 39.75, fps: 24, width: 1080, height: 1920,
    shots: [
      S('hook', '01', 0, 3.0, 'Hidden for 34 years', 'Three hard cuts: mask extreme close-up, candle + door slam, the bust in torchlight; FRANCE HID THIS MAN’S FACE / FOR 34 YEARS.'),
      S('king', '02', 3.0, 7.375, 'Nobody knows · 1669', 'The Sun King medallion flips in under NOBODY KNOWS WHO HE WAS; 1669; KING LOUIS XIV OF FRANCE.'),
      S('locked', '03', 7.375, 10.375, 'Locked away in secret', 'Dungeon door slams, key turns, red wax seal: SECRET.'),
      S('order', '04', 10.375, 14.875, 'The order', 'The written order inks in; KILL HIM circled; the jailer’s hand goes to his sword.'),
      S('prisons', '05', 14.875, 383 / 24, 'Four prisons', 'Map of France: four forts pop, the route snaps across — 4 PRISONS.'),
      S('jailer', '05b', 383 / 24, 403 / 24, 'Same jailer', 'The jailer, close and lit — SAME JAILER.'),
      S('hidden', '05c', 403 / 24, 18.75 - 7 / 24, 'Face kept hidden', 'The masked bust close — HIS FACE, KEPT HIDDEN.'),
      S('bastille', '06', 18.75 - 7 / 24, 23.5 - 7 / 24, 'The Bastille, 1703', '3D Bastille orbit at night; PiP of the burial register: MARCHIOLY.'),
      S('burned', '07', 23.5 - 7 / 24, 25.75 - 7 / 24, 'Everything burned', 'His cell things engraved, then consumed by engraved fire.'),
      S('twin', '08', 25.75 - 7 / 24, 28.75 - 7 / 24, 'The king’s twin?', 'Mirror: the King’s medallion and the masked bust either side of the curiosity line.'),
      S('velvet', '09', 28.75 - 7 / 24, 33.5 - 7 / 24, 'Never iron', 'IRON struck out; the mask turns to black velvet in a sweep.'),
      S('outro', '10', 33.5 - 7 / 24, 39.75, 'Outro', 'Velvet-masked bust in darkness → THE IRON MASK WAS VELVET → WHY WE / WONDER → STAY CURIOUS.'),
    ],
    cues: [],
  };
})();
