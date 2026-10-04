import React from "react";
import { ProcShot, ProcOverlay } from "../film/ProcCanvas";
import { PipLayer, type PipState } from "../three/Pip";
import { port } from "../three/rig";

// Shot 01 · street-1518 — woodcut 2D (pf) + Pip in 3D (three.js) + porthole ring overlay
const rig = (t: number): PipState => { const k = Math.min(1, Math.max(0, (t - 1.3) / 0.5)); const e = 1 - Math.pow(1 - k, 3); return port(850, 1180, 150, { yOff: (1 - e) * 220, turn: -0.5, face: { eyes: 'open', mouth: 'o', lookX: -0.6 } }); };
const CLIP = [850, 1180, 150];
export const Shot01: React.FC<{ start: number }> = ({ start }) => (
  <>
    <ProcShot id="street-1518" />
    <PipLayer rig={rig} start={start} clip={CLIP} />
    <ProcOverlay sceneId="street-1518-fg" shotId="street-1518" />
  </>
);
