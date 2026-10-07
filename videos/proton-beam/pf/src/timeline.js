// FILM.TIMELINE — WHY WE WONDER episode 7: the man who put his head in a particle accelerator (Anatoli Bugorski, 1978).
// Score composed first (tools/score.py, 120 bpm: beat 0.5 s, bar 2 s); narration lines + every cut sit on that grid. 24 fps, 40 s.
(function () {
  'use strict';
  const FILM = window.FILM;
  const S = (id, n, start, end, title, brief) => ({ id, file: `${n}-${id}.js`, start, end, mode: 'schematic', title, brief });
  FILM.TIMELINE = {
    title: 'Episode 7', bpm: 120, duration: 40, fps: 24, width: 1080, height: 1920,
    shots: [
      S('hook', '01', 0, 3.0, 'Through his head', 'Beat cuts at 1.0/2.0: profile head pierced by the beam; X-ray with THROUGH sliced by it; pull back; the beam straightens.'),
      S('ussr', '02', 3.0, 6.5, 'USSR 1978', 'The beam line morphs into the USSR outline; THE SOVIET UNION; red star; 1978; pin on Protvino; zoom into the pin.'),
      S('ring', '03', 6.5, 9.5, 'The U-70', 'The pin becomes the U-70 ring: aerial engraved 3D ring, protons racing; Bugorski medallion PiP; PARTICLE ACCELERATOR rides the ring.'),
      S('tunnel', '04', 9.5, 12.0, 'A broken part', 'Dive into the tunnel: magnets recede, beam pipe; the open BROKEN PART; his head leans in.'),
      S('safety', '05', 12.0, 16.0, 'The beam was still on', 'Safety panel — FAILED stamped; the beam races down the pipe toward his head; STILL ON; freeze to black.'),
      S('flash', '06', 16.0, 19.5, 'A thousand suns', 'DROP: whiteout, the beam through the 3D head; 1,000 suns pop on 16ths; AND NO PAIN.'),
      S('dose', '07', 19.5, 23.0, 'The dose', 'The beam turns vertical into a bar chart: lethal vs his dose — bar shoots off the top; HUNDREDS OF TIMES.'),
      S('clinic', '08', 23.0, 27.0, 'Sent to die', 'The bar becomes the line splitting his face; half swells; the line becomes a heart monitor; flatline.'),
      S('lift', '09', 27.0, 32.0, 'He didn’t', 'The flatline spikes back; the line climbs as his life: PhD, back to work; curls into the same ring.'),
      S('outro', '10', 32.0, 40.0, 'Outro', 'The head alone in the dark with the beam scar → THE ONLY PERSON KNOWN… → beam writes WHY WE / WONDER → STAY CURIOUS.'),
    ],
    cues: [],
  };
})();
