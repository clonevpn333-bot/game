# Skin Shader — build notes
*The most important material in the game.* Companion to Art Bible §3.2.

The goal isn't "realistic skin" in the abstract — it's skin that survives the
camcorder filter (`SmallHours_PostProcess.hlsl`) and still reads as a *living
person.* Most game skin dies under heavy post because all its life was painted
into the albedo (which the filter then smears). Ours puts the life in **light
transport** (SSS + dual-lobe spec), which the filter degrades *gracefully* — the
way real skin looks on real tape.

## Layer stack (UE5 — Subsurface Profile shading model)
1. **Base color** — authored flat. No baked shadow, no painted "definition."
   Capillary discoloration, lip bleed, vellus tint only. Treat it like makeup
   foundation: it must look slightly *boring* on its own.
2. **Subsurface Profile** (Burley/Christensen-Burley) — the hero of the look.
   - Mean-free-path tuned per-character; redder/longer on thin areas.
   - **Thickness map** drives backlit glow: ears, nostrils, eyelids, fingertips,
     web of the thumb. *This is the single biggest "is it human?" lever.*
3. **Dual-lobe specular**
   - Lobe A: broad, soft sheen across the whole face (roughness ~0.45).
   - Lobe B: tight oily highlight on T-zone/nose/lips (roughness ~0.25), masked.
   - **Micro-roughness breakup** map so highlights *shimmer/boil* slightly in
     motion — never a clean plastic hotspot.
4. **Macro normal** — ZBrush wrinkles, scars, asymmetry. Asymmetry is mandatory;
   symmetric faces read synthetic.
5. **Micro-normal (tiled pores)** — one tiling detail map, blended by a region
   mask (dense on nose/cheeks/forehead, sparse on lips/eyelids). Tied to a
   distance fade so pores don't shimmer at range.
6. **Curvature/cavity** — drives dirt accumulation and the blood-flow tint.

## Dynamic material parameters (wired to the stress/Dread system)
| Param | 0.0 | 1.0 |
|---|---|---|
| `Flush` | neutral | ears/cheeks/knuckles redden (stress), capillary push |
| `Pallor` | living SSS | drained, waxy, **embalmed** (dream/paralysis & the Visitor) |
| `Sweat` | dry | clearcoat sheen + local roughness drop on hairline/lip/sternum, grows over the hour |
| `Goosebumps` | flat | forearm normal/tessellation pop on scares |
| `EyeWet` | wet meniscus + catchlight | **dead-eye**: catchlight off, corneal SSS flat, saccades frozen |

The `Pallor`/`EyeWet`→dead-eye combo is how a face we've trusted all night goes
*off* in three frames — the cheapest, most effective scare in the kit.

## Vane (the antagonist) — the one face dialed the "wrong" way
- `Micro-normal` intensity **reduced** (he wears makeup; less visible pore detail
  than the subjects → he reads slightly *less* real, which is the point).
- Smile blendshape underweights **orbicularis oculi** (eyes don't crinkle).
- Default `EyeWet` blink-rate authored low; holds eye contact a beat too long.
- Escalation pass ramps his `Pallor` + pore detail *up* in observed/dream states:
  the warmth was the makeup; under it he's the same cold as the Visitor.

## The Visitor — skin built to read as "thing, not person"
- **Subsurface Profile contribution ≈ 0** (no SSS) → wet-paper-over-bone.
- Roughness inverted to a faint sickly *moist* sheen; albedo grey-violet.
- All micro-jitter/saccades frozen → *too still.* (Behavior, not material: see
  Art Bible §5.)

## QA: always review skin THROUGH the filter
Never sign off a face on a clean render. Grade and approve every character at
**540p through `SmallHours_PostProcess.hlsl`** at baseline `Degradation = 0.3`.
If it reads human on the dirty tape, it ships. If it only works clean, it fails.
