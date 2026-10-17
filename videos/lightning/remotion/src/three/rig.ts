import type { PipState } from "./Pip";
// screen px → world units at z = 0 (camera fov 32° at z 6: 558 px per unit); Pip's root is at his feet
export const W2 = (sx: number, sy: number) => ({ x: (sx - 540) / 558, y: (960 - sy) / 558 });
export const port = (cx: number, cy: number, r: number, o: Partial<PipState> & { yOff?: number } = {}): PipState => {
  const scale = (0.72 * r) / 558;
  const { yOff = 0, ...rest } = o;
  return { ...W2(cx, cy + 1.05 * scale * 558 + yOff), scale, ...rest };
};
