# Project rules (from the owner) — THE LAST VERSION (`the-last-version/`)

These are the owner's standing rules across all of their games. Read them before changing anything.

## Look at the earlier games first
This repo's other branches hold finished games by the same owner. Reuse their code and look before
writing new systems:
- `getaway/` on `origin/claude/lucid-mendel-9t0gmn` — driving: vehicle physics (`src/vehicles/vehicle.js`),
  chase camera (`src/core/camera.js`), police, traffic, block humanoids. Its single-file build is ~4 MB.
- `marchlight/` on `origin/claude/confident-bardeen-xba2zh` — block characters (`src/characters/rig.js`,
  `anim.js`), cutscene director, testing tools.
- Fetch with `git fetch --depth=1 origin '+refs/heads/*:refs/remotes/origin/*'`.

## Character art — HARD RULE
- Characters are built from **clean geometric shapes** (rounded boxes, cylinders, capsules, spheres),
  one shape per body part, rigidly bound to a bone. Faces are blocks too (block eyes that squash to
  blink, block brows, block mouth that opens with the jaw).
- **Never** sculpted / organic / SDF / surface-nets / marching-cubes / metaball bodies, smooth skinned
  realistic meshes, or imported/scanned human models. This was tried here and rejected outright.
- Exception the owner approved: the horror entity in Chapter 3 (the Clerk) may stay as it is.

## Feel and performance
- Gameplay feel comes first. Driving must feel like Getaway's (arcade player handling: the car turns
  where you steer and only slides when you ask with the handbrake).
- Nothing may phase through anything — cars collide in gameplay *and* in cutscenes.
- Keep the build small. Prefer procedural textures; do not ship large photo-scan texture/model sets.
  Check the single-file size (`node tools/build-single.mjs`) after asset changes.
- No freezes: no long main-thread work mid-game.

## Working rules
- Test in the actual game before calling anything finished; report honestly what was and wasn't verified.
- Develop on the session's designated branch.
