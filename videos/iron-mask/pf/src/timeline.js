// FILM.TIMELINE — WHY WE WONDER episode 6: the Man in the Iron Mask. Narration locked in ../vo. 24 fps, 40 s.
(function () {
  'use strict';
  const FILM = window.FILM;
  const S = (id, n, start, end, title, brief) => ({ id, file: `${n}-${id}.js`, start, end, mode: 'schematic', title, brief });
  FILM.TIMELINE = {
    title: 'Episode 6', bpm: 120, duration: 40.0, fps: 24, width: 1080, height: 1920,
    shots: [
      S('hook', '01', 0, 5.5, 'Hidden for 34 years', '3D masked bust; HIS FACE WAS HIDDEN / FOR 34 YEARS on frame 1; NOBODY KNOWS WHO HE WAS.'),
      S('king', '02', 5.5, 8.0, 'The King of France, 1669', 'Royal-blue fleur-de-lis plate; the Sun King medallion flips in; 1669.'),
      S('locked', '03', 8.0, 11.0, 'Locked away in secret', 'Dungeon door slams, key turns, red wax seal: SECRET.'),
      S('order', '04', 11.0, 15.75, 'The order', 'The written order inks in; KILL HIM circled; the jailer’s hand goes to his sword.'),
      S('prisons', '05', 15.75, 18.75, 'Four prisons', 'Map of France; four forts numbered; the curiosity line routes the masked prisoner.'),
      S('bastille', '06', 18.75, 23.5, 'The Bastille, 1703', '3D Bastille orbit at night; PiP of the burial register: MARCHIOLY.'),
      S('burned', '07', 23.5, 25.75, 'Everything burned', 'His cell things engraved, then consumed by engraved fire.'),
      S('twin', '08', 25.75, 28.75, 'The king’s twin?', 'Mirror: the King’s medallion and the masked bust either side of the curiosity line.'),
      S('velvet', '09', 28.75, 33.5, 'Never iron', 'IRON struck out; the mask turns to black velvet in a sweep.'),
      S('outro', '10', 33.5, 40.0, 'Outro', 'Velvet-masked bust in darkness → THE IRON MASK WAS VELVET → WHY WE / WONDER → STAY CURIOUS.'),
    ],
    cues: [],
  };
})();
