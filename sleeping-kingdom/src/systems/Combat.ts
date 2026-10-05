import * as THREE from 'three';

export type HitInfo = { damage: number; poise: number; from: THREE.Vector3; heavy: boolean };

export interface Combatant {
  readonly pos: THREE.Vector3;
  readonly radius: number;
  alive: boolean;
  readonly name: string;
  takeHit(hit: HitInfo): void;
  /** World point used for lock-on framing. */
  focusPoint(target: THREE.Vector3): THREE.Vector3;
}

/** Events the gameplay emits; audio, VFX, HUD and camera feedback subscribe to them. */
export type GameEvent =
  | { type: 'swing'; heavy: boolean; pos: THREE.Vector3 }
  | { type: 'hit-enemy'; pos: THREE.Vector3; heavy: boolean; kind: string; killed: boolean }
  | { type: 'hit-player'; pos: THREE.Vector3; damage: number; heavy: boolean }
  | { type: 'blocked-roll'; pos: THREE.Vector3 }
  | { type: 'roll'; pos: THREE.Vector3 }
  | { type: 'flask'; pos: THREE.Vector3 }
  | { type: 'footstep'; pos: THREE.Vector3; heavy: boolean }
  | { type: 'hoof'; pos: THREE.Vector3 }
  | { type: 'enemy-telegraph'; pos: THREE.Vector3; kind: string }
  | { type: 'enemy-attack'; pos: THREE.Vector3; kind: string }
  | { type: 'slam'; pos: THREE.Vector3; radius: number }
  | { type: 'toll'; pos: THREE.Vector3 }
  | { type: 'player-dead' }
  | { type: 'enemy-dead'; pos: THREE.Vector3; kind: string };

export class EventBus {
  private readonly handlers: Array<(e: GameEvent) => void> = [];
  on(h: (e: GameEvent) => void): void {
    this.handlers.push(h);
  }
  emit(e: GameEvent): void {
    for (const h of this.handlers) h(e);
  }
}
