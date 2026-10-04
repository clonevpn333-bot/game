import type { CharName } from '../actors/Characters';
import type { Game, Script } from '../game/Game';
import type { EnvSettings, World } from '../world/World';
import * as THREE from 'three';
import { ch1 } from './ch1';
import { ch2 } from './ch2';
import { ch3 } from './ch3';

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

export const CHAPTERS: Chapter[] = [ch1, ch2, ch3];
