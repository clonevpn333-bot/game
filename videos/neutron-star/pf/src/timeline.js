// FILM.TIMELINE — WHY WE WONDER episode 4: the neutron star. Narration locked in ../vo (bm_george 1.15x). 24 fps.
(function () {
  'use strict';
  const FILM = window.FILM;
  const S = (id, n, start, end, title, brief) => ({ id, file: `${n}-${id}.js`, start, end, mode: 'schematic', title, brief });
  FILM.TIMELINE = {
    title: 'Episode 4', bpm: 120, duration: 34.5, fps: 24, width: 1080, height: 1920,
    shots: [
      S('teaspoon', '01', 0, 3.75, 'One teaspoon', 'Glowing spoon slams a balance pan; Everest drops on the other pan and the beam levels.'),
      S('reveal', '02', 3.75, 5.25, 'A neutron star', 'The spoon glow zooms into a 3D neutron star; field lines draw on.'),
      S('supernova', '03', 5.25, 8.0, 'Crushed core', 'A red giant collapses inward on "crushed" and explodes on "exploded".'),
      S('the-sun', '04', 8.0, 10.25, 'More mass than the Sun', 'The 3D Sun, squeezed by blueprint press plates into a tiny ball.'),
      S('city', '05', 10.25, 12.0, 'Size of a city', 'The ball hovers over a blueprint city map; ≈ 20 KM bracket.'),
      S('spin', '06', 12.0, 16.5, '716 spins a second', 'Pulsar spins up, beams sweep, counter to 716 / SECOND.'),
      S('pen-drop', '07', 16.5, 21.25, 'Drop a pen', 'Pen vanishes into an impact; slow-mo replay with speed PiP to 7,000,000 KM/H.'),
      S('craziest', '08', 21.25, 23.0, 'The craziest part', 'The curiosity line draws a huge question mark.'),
      S('crash', '09', 23.0, 25.5, 'They make gold', 'Two neutron stars spiral and collide; gold bursts out; 79 Au tile.'),
      S('ring', '10', 25.5, 29.75, 'Your gold', 'Gold streams into a ray-marched 3D ring; PiP of the real 2017 kilonova.'),
      S('outro', '11', 29.75, 34.5, 'Outro', 'Neutron star alone → fact line → WHY WE / WONDER → STAY CURIOUS.'),
    ],
    cues: [],
  };
})();
