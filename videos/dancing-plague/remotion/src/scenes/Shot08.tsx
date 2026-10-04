import React from "react";
import { ProcShot } from "../film/ProcCanvas";
import { PipLayer, type PipState } from "../three/Pip";
import { W2 } from "../three/rig";

// Shot 08 · fear — woodcut 2D (pf) + Pip in 3D (three.js)
const rig = (t: number): PipState => { const f = Math.floor(t * 12); return { ...W2(540 + ((f * 37) % 9 - 4) * 1.5, 1880), scale: 0.4, armL: 0.08, armR: 0.08, sq: -0.05, face: { eyes: 'open', mouth: 'frown', browUp: 1, sad: 0.6, sweat: 1, lookX: (t > 31.4 ? 0 : -0.3), lookY: t > 31.4 ? -0.8 : 0 } }; };
export const Shot08: React.FC<{ start: number }> = ({ start }) => (
  <>
    <ProcShot id="fear" />
    <PipLayer rig={rig} start={start} />
  </>
);
