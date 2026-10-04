import React from "react";
import { ProcShot } from "../film/ProcCanvas";
import { PipLayer, type PipState } from "../three/Pip";
import { W2 } from "../three/rig";

// Shot 05 · the-cure — woodcut 2D (pf) + Pip in 3D (three.js)
const rig = (t: number): PipState => { const on = t > 16.28; const b = Math.sin(Math.PI * 2 * t); return { ...W2(840, 1880), scale: 0.42, hop: on ? Math.abs(b) * 0.28 : 0, lean: on ? b * 0.16 : 0, armL: on ? 1.2 + b * 1.0 : 0.35, armR: on ? 1.2 - b * 1.0 : 0.35, sq: on ? (1 - Math.abs(b)) * 0.12 : 0, turn: -0.2, face: on ? { eyes: 'happy', mouth: 'grin' } : { eyes: 'open', mouth: 'smirk', lookX: -0.5 } }; };
export const Shot05: React.FC<{ start: number }> = ({ start }) => (
  <>
    <ProcShot id="the-cure" />
    <PipLayer rig={rig} start={start} />
  </>
);
