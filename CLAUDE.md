# Project rules (GETAWAY! — `getaway/`)

## Character art — HARD RULE from the owner
- Characters are built from **clean geometric shapes** (boxes, rounded boxes, cylinders, capsules, spheres, cones)
  assembled into a stylized figure. Every part should read as a deliberate shape.
- **NEVER** use sculpted / organic / "MakeHuman"-style bodies: no SDF or metaball blobs, no smooth-blended
  seamless skin meshes, no surface-nets / marching-cubes bodies, no imported or scanned human models. This was
  tried (a smooth skinned SDF body) and rejected outright. Do not try it again in any form.
- Improve characters by refining the shapes (proportions, silhouettes, colour blocking, clothing pieces made of
  shapes, simple graphic faces) and by better animation — not by making them smoother or more realistic-organic.

## Working rules
- The owner hates freezes and crashes: no mid-game shader compiles or long main-thread work; test before shipping.
- Report honestly what was and wasn't verified.
- Develop on the session's designated branch; ship the single-file build `getaway/dist/getaway.html`.
