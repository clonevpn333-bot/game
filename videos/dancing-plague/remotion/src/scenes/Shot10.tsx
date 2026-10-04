import React from "react";
import { ProcShot } from "../film/ProcCanvas";
import { PipLayer, type PipState } from "../three/Pip";
import { W2 } from "../three/rig";

// Shot 10 · outro — woodcut 2D (pf) + Pip in 3D (three.js)
const rig = (t: number): PipState => { const k = Math.min(1, Math.max(0, (t - 39.15) / 0.3)); return { ...W2(900, 1800 + (1 - k) * 300), scale: 0.2, visible: t > 39.1, armR: 2.6 + Math.sin(t * 14) * 0.4, armL: 0.4, face: { eyes: 'happy', mouth: 'grin' } }; };
export const Shot10: React.FC<{ start: number }> = ({ start }) => (
  <>
    <ProcShot id="outro" />
    <PipLayer rig={rig} start={start} />
  </>
);
