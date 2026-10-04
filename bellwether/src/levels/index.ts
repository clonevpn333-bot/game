import type { World, EnvSettings } from '../world/World';
import type { Game, Script } from '../game/Game';
import type { Weapon } from '../game/Player';
import { prologue } from './prologue';
import { ch1 } from './ch1';
import { ch2 } from './ch2';
import { ch3 } from './ch3';
import { ch4 } from './ch4';
import { ch5 } from './ch5';

export interface Chapter {
  id: string;
  num: string;
  title: string;
  sub?: string;
  env: EnvSettings;
  seed?: number;
  weapon?: Weapon;
  flashlight?: boolean;
  build(W: World, g: Game, mode: 'play' | 'title' | 'state'): void;
  run(s: Script): Promise<void>;
  ambience?(g: Game): void;
  titleCam?(t: number): { pos: import('three').Vector3; look: import('three').Vector3 };
  shots?: Record<string, (g: Game) => void>;
}

export const CHAPTERS: Chapter[] = [prologue, ch1, ch2, ch3, ch4, ch5];
