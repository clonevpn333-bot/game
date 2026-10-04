// FILM.TIMELINE: "THE POISONED UMBRELLA" (WHY WE WONDER). Narration locked in ../vo (bm_george, 1.12x).
// 24 fps, 42 s. Cuts on the 0.25 s grid against the measured words.
(function () {
  'use strict';
  const FILM = window.FILM;
  FILM.TIMELINE = {
    title: 'The Poisoned Umbrella',
    bpm: 120,
    duration: 42,
    fps: 24,
    width: 1080,
    height: 1920,
    shots: [
      { id: 'rain-hook', file: '01-rain-hook.js', start: 0, end: 3, mode: 'schematic', title: 'A man was murdered', brief: '3D rainy London night. A man in a coat walks; umbrellas pass.' },
      { id: 'bridge-1978', file: '02-bridge-1978.js', start: 3, end: 8, mode: 'schematic', title: 'Waterloo Bridge, 1978', brief: 'Hybrid: 3D bridge bus stop + 2D annotations + PiP map window.' },
      { id: 'the-sting', file: '03-the-sting.js', start: 8, end: 12, mode: 'schematic', title: 'The sting', brief: '3D leg + umbrella tip, impact, freeze into 2D sketch, PiP thigh zoom, stranger path to taxi.' },
      { id: 'four-days', file: '04-four-days.js', start: 12, end: 15.25, mode: 'illustrated', title: 'Four days', brief: '2D hospital fever chart: the line rises over four days and stops.' },
      { id: 'pinhead-dive', file: '05-pinhead-dive.js', start: 15.25, end: 18.25, mode: 'schematic', title: 'Smaller than a pinhead', brief: 'HERO: dive from skin into the wound; tissue tunnel with 2D labels; ruler; pellet revealed; pinhead PiP.' },
      { id: 'pellet', file: '06-pellet.js', start: 18.25, end: 22.5, mode: 'schematic', title: 'The pellet', brief: '3D platinum pellet + blueprint dims + cross-section PiP + coating melting at 37°C.' },
      { id: 'ricin', file: '07-ricin.js', start: 22.5, end: 27.75, mode: 'illustrated', title: 'Ricin', brief: 'Microscope field: ricin leaves the pellet; castor bean PiP; 2D ricin A/B chains stop a ribosome.' },
      { id: 'evidence', file: '08-evidence.js', start: 27.75, end: 30.5, mode: 'illustrated', title: 'Found in his thigh', brief: '2D evidence board with X-ray PiP and magnified pellet, red curiosity string.' },
      { id: 'umbrella-gun', file: '09-umbrella-gun.js', start: 30.5, end: 33, mode: 'schematic', title: 'The umbrella was a gun', brief: '3D umbrella with an X-ray cutaway: barrel, pellet, trigger; it fires on "gun".' },
      { id: 'no-one', file: '10-no-one.js', start: 33, end: 35.25, mode: 'illustrated', title: 'No one was charged', brief: 'The board falls apart into darkness, leaving only the pellet.' },
      { id: 'weapon-end', file: '11-weapon-end.js', start: 35.25, end: 42, mode: 'schematic', title: '1.7 millimetres', brief: 'The pellet in darkness; THE MURDER WEAPON WAS 1.7 MILLIMETRES WIDE; WHY WE WONDER; STAY CURIOUS.' },
    ],
    cues: [],
  };
})();
