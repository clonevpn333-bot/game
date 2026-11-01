// GETAWAY! — traffic signal timing (shared by traffic AI, pedestrians and the light props)
export const CYCLE = 27;
// axis: 'ns' for travel along Z, 'ew' for travel along X. Returns 'g' | 'y' | 'r'
export function signal(node, axis, t) {
  if (!node || !node.light) return 'g';
  if (node.override) return node.override[axis] || 'r';
  const p = ((t + node.phase) % CYCLE + CYCLE) % CYCLE;
  const first = axis === 'ns';
  const q = first ? p : (p + CYCLE / 2) % CYCLE;
  if (q < 10) return 'g'; if (q < 12.5) return 'y'; return 'r';
}
// pedestrians may cross a road running along `roadAxis` when the cross traffic (other axis) has red & the parallel has green
export function walkSignal(node, crossingRoadAxis, t) {
  if (!node || !node.light) return true;
  const parallel = crossingRoadAxis === 'ew' ? 'ns' : 'ew';
  return signal(node, parallel, t) === 'g' && signal(node, crossingRoadAxis, t) === 'r';
}
