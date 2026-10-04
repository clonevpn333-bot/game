import type { CharName } from '../actors/Characters';
import type { Game, Script } from '../game/Game';
import type { EnvSettings, World } from '../world/World';
import * as THREE from 'three';
import { ch1 } from './ch1';
import { ch2 } from './ch2';
import { ch3 } from './ch3';
import { ch4 } from './ch4';
import { ch5 } from './ch5';
import { ch6 } from './ch6';
import { ch7 } from './ch7';
import { ch8 } from './ch8';
import { ch9 } from './ch9';
import { ch10 } from './ch10';
import { ch11 } from './ch11';
import { ending } from './ending';

export interface Chapter {
  id: string;
  num: string;
  title: string;
  sub?: string;
  env: EnvSettings;
  seed?: number;
  chars: CharName[];
  echoUnlocked?: boolean;
  gun?: boolean;
  flashlight?: boolean;
  build(W: World, g: Game): void;
  run(s: Script): Promise<void>;
  ambience?(g: Game): void;
  titleCam?(t: number): { pos: THREE.Vector3; look: THREE.Vector3 };
  shots?: Record<string, (g: Game) => void>;
}

export const CHAPTERS: Chapter[] = [ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8, ch9, ch10, ch11, ending];
