import type { ChapterLook } from '../render/Atmosphere';
import type { AudioPreset } from '../systems/Audio';
import type { Level } from './Level';

export interface ChapterDef {
  id: number;
  key: string;
  title: string;
  subtitle: string;
  /** 0..3 UI drain level. */
  uiDread: number;
  look: ChapterLook;
  audio: AudioPreset;
  /** Ori's emotional state (0 calm → 1 terrified) drives idle body language. */
  oriDread: number;
  parcelColor: string;
  build(lv: Level): void;
}

export const SPEAKERS: Record<string, { color: string; pitch: number }> = {
  Ori: { color: '#ffd46b', pitch: 640 },
  Mabel: { color: '#9fe3ff', pitch: 420 },
  'Mrs. Noor': { color: '#ffc2d6', pitch: 360 },
  Shopkeeper: { color: '#ffd8a8', pitch: 300 },
  Commuter: { color: '#c9b6ff', pitch: 380 },
  Kid: { color: '#b8f2c8', pitch: 820 },
  Clerk: { color: '#f5d0ff', pitch: 460 },
  'Lost & Found': { color: '#d9cfa0', pitch: 330 },
  Janitor: { color: '#c8d6c0', pitch: 260 },
  Pell: { color: '#c2b8a8', pitch: 300 },
  '???': { color: '#9d8fd0', pitch: 180 },
  'The Route': { color: '#e8e2ff', pitch: 140 },
  Sign: { color: '#ffe7b0', pitch: 500 },
  Note: { color: '#f2e6c9', pitch: 500 },
  Voice: { color: '#d0c8e8', pitch: 220 },
};
