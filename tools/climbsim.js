/* Proves a generated mountain is climbable: a bot follows the route from the
 * beach to the summit using only the real shared movement code.
 * Usage: node tools/climbsim.js [seed] */
import { createWorld } from '../site/games/summit/shared/mountain.js';
import { step, newMoveState, newModifiers } from '../site/games/summit/shared/locomotion.js';
import { PHASE, PLAYER, STAMINA } from '../site/games/summit/shared/constants.js';

const seed = process.argv[2] || 'CLIMB1';
const w = createWorld(seed);
const s = newMoveState(w.beach.x, w.height(w.beach.x, w.beach.z), w.beach.z);
const mod = newModifiers();
const DT = 1 / 30;
let node = 0, t = 0, stuck = 0, maxStuck = 0, rests = 0, falls = 0, lastY = s.y;

while (t < 60 * 60 && node < w.route.length) {
  const target = w.route[node];
  const dx = target.x - s.x, dz = target.z - s.z;
  const d = Math.hypot(dx, dz);
  if (d < 6) { node++; continue; }
  const yaw = Math.atan2(dx, dz) + Math.PI;   // forward = (-sin,-cos)
  const slope = w.slope(s.x, s.z);
  const steep = slope < PLAYER.maxSlopeWalk;
  // rest when the tank runs dry, exactly like a player would
  const resting = s.stamina < 12 && !steep;
  if (resting) rests += DT;
  step(s, {
    mv: resting ? { x: 0, y: 0 } : { x: 0, y: 1 },
    yaw, pitch: 0, jump: false, sprint: false, grab: steep, dt: DT,
  }, w, mod, PHASE.CLIMB);
  if (s.impact > 11.5) falls++;
  if (Math.abs(s.y - lastY) < 0.002 && !resting) { stuck += DT; maxStuck = Math.max(maxStuck, stuck); } else stuck = 0;
  lastY = s.y;
  t += DT;
  if (Math.floor(t) % 120 === 0 && Math.abs(t % 120) < DT) {
    console.log(`t=${(t / 60).toFixed(0)}min  node ${node}/${w.route.length}  y=${s.y.toFixed(0)}  stam=${s.stamina.toFixed(0)}`);
  }
}
const summited = node >= w.route.length - 2 || Math.hypot(s.x, s.z) < 45;
console.log(`\nseed ${seed}`);
console.log(`  reached      y=${s.y.toFixed(0)} of ${w.route.at(-1).y.toFixed(0)}   node ${node}/${w.route.length}`);
console.log(`  time         ${(t / 60).toFixed(1)} min   rested ${(rests / 60).toFixed(1)} min`);
console.log(`  hard falls   ${falls}      longest stall ${maxStuck.toFixed(1)}s`);
console.log(summited ? '  ROUTE CLIMBABLE' : '  ROUTE FAILED');
process.exit(summited ? 0 : 1);
