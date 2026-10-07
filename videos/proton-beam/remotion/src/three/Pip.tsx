import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
// @ts-ignore — plain-JS rig shared with the HyperFrames Pip shorts
import { THREE, makeRenderer, makeBlob, withInk } from "./piplib.js";

// Pip, the channel's 3D blob, rendered with three.js on a transparent canvas over the 2D world.
// Everything is a pure function of the Sequence-local frame: `rig(t)` returns where Pip is and what he does.
export type PipState = {
  x: number; y: number; z?: number; scale?: number; // world position (camera looks down −z from z=6)
  sq?: number; lean?: number; armL?: number; armR?: number; hop?: number; turn?: number; stretch?: number;
  face?: Record<string, unknown>; spin?: number; tilt?: number; visible?: boolean; fov?: number;
};

export const PipLayer: React.FC<{ rig: (t: number) => PipState; start: number; clip?: number[] }> = ({ rig, start, clip }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctx = useRef<any>(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (!ctx.current) {
      const { renderer, env } = makeRenderer(canvas, { exposure: 1.05, shadows: false });
      const scene = new THREE.Scene();
      scene.environment = env;
      scene.add(new THREE.HemisphereLight(0xfff3e0, 0x2a2440, 0.8));
      const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
      key.position.set(3, 6, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xbfe4ff, 1.6);
      rim.position.set(-4, 3, -3);
      scene.add(rim);
      const pip = makeBlob({ sprout: true });
      scene.add(pip.root);
      const cam = new THREE.PerspectiveCamera(32, 1080 / 1920, 0.1, 100);
      cam.position.set(0, 0, 6);
      cam.lookAt(0, 0, 0);
      ctx.current = { renderer, scene, pip, cam };
    }
    const { renderer, scene, pip, cam } = ctx.current;
    const t = start + frame / fps;
    const s = rig(t);
    pip.root.visible = s.visible !== false;
    pip.root.position.set(s.x, s.y, s.z ?? 0);
    pip.root.scale.setScalar(s.scale ?? 1);
    pip.root.rotation.set(s.tilt ?? 0, s.spin ?? 0, 0);
    if (s.fov) { cam.fov = s.fov; cam.updateProjectionMatrix(); }
    pip.pose({ t, sq: s.sq ?? 0, lean: s.lean ?? 0, armL: s.armL ?? 0.35, armR: s.armR ?? 0.35, hop: s.hop ?? 0, turn: s.turn ?? 0, stretch: s.stretch ?? 1 });
    pip.setFace({ time: t, ...(s.face || {}) });
    renderer.render(scene, cam);
  }, [frame, fps, rig, start]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", clipPath: clip ? `circle(${clip[2]}px at ${clip[0]}px ${clip[1]}px)` : undefined }}>
      <canvas ref={ref} width={1080} height={1920} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
