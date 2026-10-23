// Sculpts character pieces off the main thread (see sculptpool.js).
import { runJob, keyOf } from './anatomy.js';

const buffers = (o, out = []) => {
  if (ArrayBuffer.isView(o)) { if (!out.includes(o.buffer)) out.push(o.buffer); }
  else if (o && typeof o === 'object') for (const k in o) buffers(o[k], out);
  return out;
};
self.onmessage = (e) => {
  const j = e.data;
  const data = runJob(j);
  self.postMessage({ id: j.id, key: keyOf(j.kind, j.P, j.L, j.lod), data }, buffers(data));
};
