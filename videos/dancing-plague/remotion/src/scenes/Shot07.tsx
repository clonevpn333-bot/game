import React from "react";
import { ProcShot, ProcOverlay } from "../film/ProcCanvas";
import { PipLayer, type PipState } from "../three/Pip";
import { port } from "../three/rig";

// Shot 07 · ergot — woodcut 2D (pf) + Pip in 3D (three.js) + porthole ring overlay
const rig = (t: number): PipState => { const w = Math.min(1, Math.max(0, (t - 25.2) / 0.6)); return port(880, 330, 130, { turn: -0.4, lean: Math.sin(t * 3) * 0.2 * w, face: w > 0 ? { eyes: 'squeeze', mouth: 'wobble', blush: 1.4, sweat: 0.6 } : { eyes: 'narrow', mouth: 'flat', lookX: -0.7, lookY: 0.6 } }); };
const CLIP = [880, 330, 130];
export const Shot07: React.FC<{ start: number }> = ({ start }) => (
  <>
    <ProcShot id="ergot" />
    <PipLayer rig={rig} start={start} clip={CLIP} />
    <ProcOverlay sceneId="ergot-fg" shotId="ergot" />
  </>
);
