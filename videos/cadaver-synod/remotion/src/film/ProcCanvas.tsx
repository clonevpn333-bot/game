import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";

// Canvas text needs its webfonts loaded before the first draw (Cinzel, UnifrakturMaguntia, Fraunces, JetBrains Mono).
const FONTS = ['700 64px "Cinzel"', '900 64px "Cinzel"', '400 64px "UnifrakturMaguntia"', '600 64px "Fraunces"', '600 30px "JetBrains Mono"'];
let fontsReady: Promise<unknown> | null = null;
const loadFonts = () => (fontsReady ??= Promise.all(FONTS.map((f) => document.fonts.load(f))).catch(() => null));
const useFonts = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("canvas fonts"));
  useEffect(() => { loadFonts().then(() => { setReady(true); continueRender(handle); }); }, [handle]);
  return ready;
};
import { FILM, shotById } from "./pf";

// One procedural-film shot drawn on a Canvas at the Sequence-local frame. Pure function of the frame:
// the same frame always yields the same pixels (seeded engine, no clocks).
export const ProcShot: React.FC<{ id: string }> = ({ id }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const shot = shotById(id);
  const T = shot.start + frame / fps;
  const ready = useFonts();
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx && ready) FILM.drawShotAt(ctx, id, T);
  }, [id, T, ready]);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={width} height={height} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};

// A transparent overlay scene (registered by a shot file under its own id) drawn over 3D layers.
export const ProcOverlay: React.FC<{ sceneId: string; shotId: string }> = ({ sceneId, shotId }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const shot = shotById(shotId);
  const T = shot.start + frame / fps;
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) FILM.drawOverlayAt(ctx, sceneId, shotId, T);
  }, [sceneId, shotId, T]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <canvas ref={ref} width={width} height={height} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
