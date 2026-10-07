export interface Settings {
  master: number;
  music: number;
  sfx: number;
  sensitivity: number;
  invertY: boolean;
  reducedMotion: boolean;
  highQuality: boolean;
  hints: boolean;
}

export interface SaveData {
  version: 1;
  chapter: number;
  checkpoint: number;
  unlocked: number;
  stamps: Record<string, string[]>;
  ending: 'restore' | 'shutdown' | null;
  settings: Settings;
}

const KEY = 'dream-courier.save.v1';

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  music: 0.7,
  sfx: 0.9,
  sensitivity: 1,
  invertY: false,
  reducedMotion: false,
  highQuality: true,
  hints: true,
};

export function freshSave(): SaveData {
  return { version: 1, chapter: 0, checkpoint: 0, unlocked: 0, stamps: {}, ending: null, settings: { ...DEFAULT_SETTINGS } };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const d = JSON.parse(raw) as Partial<SaveData>;
    if (d.version !== 1) return freshSave();
    return { ...freshSave(), ...d, settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) } } as SaveData;
  } catch {
    return freshSave();
  }
}

export function writeSave(d: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // storage unavailable (private mode); progress lives for this session only
  }
}

export function hasProgress(d: SaveData): boolean {
  return d.chapter > 0 || d.checkpoint > 0;
}
