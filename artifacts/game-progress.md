# Dream Courier — progress log

## Intent and constraints
- Linear third-person dream adventure, 10 chapters: soft and cloudy at the start, liminal and backrooms-horror by the end.
- Built with the threejs-game-skills pack (director → gameplay-systems, aaa-graphics-builder, game-ui-designer, debug-profiler, qa-release).
- Credential probe: `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`, so models, textures and audio are all procedural.
- Browser: Claude in Chrome can't reach this cloud container. QA uses the pre-installed Chromium (Playwright 1.56.1 matched to `/opt/pw-browsers/chromium-1194`). The container has no GPU, so WebGL runs on SwiftShader (CPU), about 1–3 s per frame. Frame-rate numbers here are **not** performance evidence; renderer counts and pixels are.

## Decisions
- Stack: Vite + TypeScript + three r186 + pmndrs `postprocessing` + bundled Fredoka/Nunito fonts.
- Custom kinematic character controller (cylinder vs AABB/ramp colliders): step-up, ground snap, moving-platform carry, ledge mantle, sprint-vault. Rapier was rejected because the level is box-built and authored feel matters more than simulation.
- Dream shading is injected into every material: sun- and height-tinted fog, rim light, and optional vertex "breathing". A sky dome shares the same fog function, so the horizon blends seamlessly.
- Static geometry is merged per material and layer, with vertex colours and baked vertical AO, to keep draw calls low.
- Ori is a procedural rig:
  - merged per-joint meshes;
  - damped procedural pose clips;
  - verlet scarf and spring bag;
  - facial expressions driven per dialogue line.
- Audio is generative Web Audio: chord pads, music box, mall muzak, ambience beds, convolution reverb, and event SFX.

## Completed
- Engine, UI, save/checkpoints, test hooks (`setState`, `setPausedForScreenshot`, `simulate`, `teleport`, `skipDialogue`).
- Chapters 1–10 including both endings.

## Remaining / next
- Full QA pass: captures per chapter, bot progression checks, production build, scorecard, final-evidence.md.
