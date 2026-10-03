# HOMO CURIOSUS — REMOTION RULES

REMOTION IS THE EDITOR, TIMELINE, COMPOSITOR AND RENDERER.
REMOTION IS NOT AUTOMATICALLY THE ART STYLE.

Primary visual engines: 1. JavaScript Canvas 2D · 2. SVG · 3. Three.js · 4. Procedural drawing systems · 5. Blender / Hyperframe renders when true 3D is justified.

Remotion owns: composition timing, scene ordering, exact frame timing, audio placement, narration timing, captions,
transitions between render systems, importing Blender clips, final 9:16 assembly, previewing, rendering, export.

1. DO NOT DEFAULT TO DIV ANIMATION. No <div>text+icon+gradient</div> with opacity/scale. If a shot can be illustrated
   through Canvas, SVG, procedural geometry, particles, Three.js or Blender, prefer those. React organizes the film; it does not replace illustration.
2. FRAME-DETERMINISTIC MOTION. Everything derives from useCurrentFrame(), useVideoConfig(), frame, fps, interpolate(), spring(),
   deterministic seeded noise/math. Never setTimeout, setInterval, Date.now, unseeded Math.random, free-running requestAnimationFrame.
   The same frame number must always produce the same visual result.
3. CANVAS IS THE PRIMARY 2D ART ENGINE: hand-drawn characters, organic linework, particles, environments, procedural textures,
   hatching, ink, stippling, wobble, microscopy, abstract science visualization, frame-by-frame-looking motion. Very complex drawing functions are acceptable.
4. SVG FOR PRECISION: typography geometry, paths, maps, diagrams, fingerprints, clocks, DNA, charts, morphing line art, masks, routes,
   scientific illustration. SVG should feel like illustration and motion design, not web UI.
5. THREE.JS ONLY WHEN DEPTH MATTERS: real spatial depth, thousands of particles, shaders, 3D camera travel, starfields, galaxies,
   black holes, tunnels, impossible geometry, 2.5D environments. Use the simplest renderer that produces the strongest result.
6. BLENDER/HYPERFRAME FOR REAL 3D (character animation, physics, destruction, cinematic environments, complex lighting): render
   externally, import into Remotion, combine with typography/captions/graphics/sound. Do not recreate strong Blender work badly in React.
7. NO GENERIC AI MOTION: no repetitive opacity 0→1 / scale .8→1 / move up 20px / centred title / wait / fade. Different objects need
   different physical behaviour. Entrances combine position, rotation, shape, mask, path, camera movement, cropping, tracking,
   letter spacing, stroke reveal, particle assembly, geometry transformation. Motion should express meaning.
8. CONTINUITY BETWEEN SHOTS: one scene physically becomes the next (line → orbit → clock → measurement line → bridge beam → crack →
   lightning → neuron → map route). Transfer position, shape, velocity, direction, colour, rotation, meaning. Cut arbitrarily only on purpose.
9. SEQUENCES MUST BE MODULAR: src/scenes/Shot01.tsx, Shot02.tsx… Never one enormous component. Any shot rebuildable alone.
10. AUDIO LEADS TIMING: finalize narration first, measure exact duration and word timings, then animate to it. Motion beats land on audio beats.
11. CAPTIONS are part of the visual system: 2–5 words at once, phone-readable, never cover subject matter, emphasis on key terms,
    HOMO CURIOSUS typography, tight word timing, subtle animation, no distracting karaoke.
12. TYPOGRAPHY can become scenery (stretch, rotate, fracture, mask, path, particles, geometry, object, transition). No plain subtitles
    floating over unrelated art. Max two main font systems unless a historical scene justifies an exception.
13. PREVIEW BEFORE FINAL RENDER: build rough scenes → Studio → preview whole timeline → low-res animatic → contact sheet → inspect
    composition → inspect timing → revise → final render.
14. CRITIQUE WEAK SHOTS after every preview: HOOK, COMPOSITION, MOVEMENT, TRANSITIONS, TYPOGRAPHY, VISUAL VARIETY, PACING, AUDIO SYNC,
    BRAND IDENTITY, ENDING. Rebuild anything empty, generic, template-like, static, too centred, too web-design-like, or too similar to the previous shot.
15. HOMO CURIOSUS BRAND: midnight navy / near-black, warm ivory, curiosity yellow, burnt orange; occasional cyan, violet, warning red.
    Recurring motif THE CURIOSITY LINE (orbit, timeline, crack, DNA, path, graph, constellation, waveform, fingerprint, question mark, letter) —
    intentional, not repetitive.
16. FINAL TECH SELECTION per shot: expressive illustrated 2D → Canvas · precise geometry/typography → SVG · real spatial depth → Three.js ·
    real 3D character/environment/physics → Blender/Hyperframe · timing/audio/captions/compositing → Remotion.
    Never choose a technology merely because it is installed. Choose the simplest system capable of producing the strongest visual.
