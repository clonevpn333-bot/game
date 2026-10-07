// FILM.TIMELINE — WHY WE WONDER episode 7: the man who put his head in a particle accelerator (Anatoli Bugorski, 1978).
// Score composed first (tools/score.py, 120 bpm: beat 0.5 s, bar 2 s); narration lines + every cut sit on that grid. 24 fps, 40 s.
(function () {
  'use strict';
  const FILM = window.FILM;
  const S = (id, n, start, end, title, brief) => ({ id, file: `${n}-${id}.js`, start, end, mode: 'schematic', title, brief });
  FILM.TIMELINE = {
    title: 'Episode 7', bpm: 120, duration: 33.5, fps: 24, width: 1080, height: 1920,
    shots: [
      S('hook', '01', 0, 2.0, 'Through his head', 'Frame 1: the beam already blasting through his head; A PROTON BEAM / SHOT THROUGH / HIS HEAD. all on screen. 1.0 X-ray; the beam slides onto L0 (→ map).'),
      S('ussr', '02', 2.0, 3.75, 'A Soviet scientist', 'HE WAS A SOVIET SCIENTIST: the beam line bends into the USSR; his medallion pins to Protvino; star, 1978; dive into the pin.'),
      S('ring', '03', 3.75, 5.5, 'The U-70', 'The pin becomes the U-70 ring; PARTICLE ACCELERATOR; Bugorski medallion; dive.'),
      S('tunnel', '04', 5.5, 8.5, 'A broken part', 'Tunnel dolly; his head leans in; BROKEN PART; the pipe lights up with the beam.'),
      S('safety', '05', 8.5, 12.0, 'The beam was still on', 'The pipe line bends into a gauge needle; it climbs, SLAMS red (9.75), FAILED; the red lamp becomes the beam front racing into his head; freeze.'),
      S('flash', '06', 12.0, 15.5, 'A thousand suns', 'BIG HIT: whiteout, beam through the head; 1,000 suns; PAIN: 0 → HE FELT NOTHING.'),
      S('dose', '07', 15.5, 17.0, 'The dose', 'The beam stands up into a bar that shoots off the chart: THE DOSE WAS ENORMOUS.; it thins into one vertical line.'),
      S('clinic', '08', 17.0, 21.5, 'Sent to die', 'The line splits his face; half swells; the line becomes a heart monitor; flatline; silence.'),
      S('lift', '09', 21.5, 27.0, 'He didn’t', 'HIT: the flatline spikes; the line climbs as his life: PhD, back to work; curls into the same ring.'),
      S('outro', '10', 27.0, 33.5, 'Outro', 'The head alone with the beam → THE ONLY PERSON KNOWN… → beam writes WHY WE / WONDER → STAY CURIOUS.'),
    ],
    cues: [],
  };
})();
