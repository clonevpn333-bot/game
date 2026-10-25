// Finds floating props: shapes the level builders placed that touch nothing (no support below,
// beside or above, and not embedded in anything). Uses the builders' placement log, so it is fast.
// node tools/play.mjs tests/floating.mjs "http://localhost:8080/index.html?beat=market"
export default async ({ ev, log }) => {
  const out = await ev(() => {
    const THREE = __THREE, L = __game.propLog || [];
    const tol = 0.06, boxes = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3();
    for (const r of L) {
      r.parent.updateMatrixWorld(true);
      m.compose(new THREE.Vector3(...r.p), q.setFromEuler(e.set(...r.r)), new THREE.Vector3(1, 1, 1)).premultiply(r.parent.matrixWorld);
      const bb = new THREE.Box3();
      for (let i = 0; i < 8; i++) { v.set((i & 1 ? 0.5 : -0.5) * r.s[0], (i & 2 ? 0.5 : -0.5) * r.s[1], (i & 4 ? 0.5 : -0.5) * r.s[2]).applyMatrix4(m); bb.expandByPoint(v); }
      let root = r.parent; while (root.parent && !/district|exterior|cityRoot|ground/.test(root.name || '')) root = root.parent;
      boxes.push({ r, bb, where: root.name || r.parent.name || '?' });
    }
    // spatial hash on 4 m cells
    const cell = 4, grid = new Map(), key = (x, y, z) => x + ',' + y + ',' + z;
    boxes.forEach((b, i) => { const a = b.bb.min, c = b.bb.max; if (c.x - a.x > 60 || c.z - a.z > 60) { b.big = true; return; }
      for (let x = Math.floor(a.x / cell); x <= Math.floor(c.x / cell); x++) for (let y = Math.floor(a.y / cell); y <= Math.floor(c.y / cell); y++) for (let z = Math.floor(a.z / cell); z <= Math.floor(c.z / cell); z++) { const k = key(x, y, z); (grid.get(k) || grid.set(k, []).get(k)).push(i); } });
    const bigs = boxes.filter(b => b.big);
    const touches = (A, B) => A.min.x <= B.max.x + tol && A.max.x >= B.min.x - tol && A.min.y <= B.max.y + tol && A.max.y >= B.min.y - tol && A.min.z <= B.max.z + tol && A.max.z >= B.min.z - tol;
    const floating = [];
    boxes.forEach((b, i) => {
      if (b.big || b.r.kind === 'path' || b.r.kind === 'tube') return;
      const a = b.bb.min, c = b.bb.max, seen = new Set();
      let ok = bigs.some(o => o !== b && touches(b.bb, o.bb));
      for (let x = Math.floor((a.x - tol) / cell); !ok && x <= Math.floor((c.x + tol) / cell); x++) for (let y = Math.floor((a.y - tol) / cell); !ok && y <= Math.floor((c.y + tol) / cell); y++) for (let z = Math.floor((a.z - tol) / cell); !ok && z <= Math.floor((c.z + tol) / cell); z++)
        for (const j of grid.get(key(x, y, z)) || []) { if (j === i || seen.has(j)) continue; seen.add(j); if (touches(b.bb, boxes[j].bb)) { ok = true; break; } }
      if (!ok) floating.push(b);
    });
    const by = {}; floating.forEach(f => (by[f.where] = (by[f.where] || 0) + 1));
    return { total: boxes.length, floating: floating.length, by, list: floating.map(f => `${f.where} ${f.r.kind} ${f.r.mat} p=${f.r.p.map(n => +n.toFixed(2))} s=${f.r.s.map(n => +n.toFixed(2))}`) };
  });
  log('total', out.total, 'floating', out.floating, JSON.stringify(out.by));
  log(out.list.join('\n'));
};
