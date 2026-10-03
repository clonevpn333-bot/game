import React from "react";
import { ProcOverlay, ProcShot } from "../film/ProcCanvas";

// Shot 07 · line-to-moon — Canvas background + Three.js layer + Canvas overlay.
// The Three.js layer is added by its owner in ../three/ (placeholder until then).
export const Shot07: React.FC = () => (
  <>
    <ProcShot id="line-to-moon" />
    <ProcOverlay sceneId="line-to-moon-fg" shotId="line-to-moon" />
  </>
);
