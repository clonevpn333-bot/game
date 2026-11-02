(async () => { try {
  const G = __G, g = __game; const run = async (s) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(s * 30); i++) { g.frame(true); await Promise.resolve(); } window.__fixedDt = 0; };
  await run(1);
  const fr = new (G.camera.constructor === Object ? Object : window.__THREE_FRUSTUM || Object)(); const list = [];
  G.scene.traverse((o) => { if (!(o.isMesh || o.isInstancedMesh) || !o.visible) return; let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) vis = false; if (!vis) return; const geo = o.geometry; const tri = (geo.index ? geo.index.count : geo.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); list.push([tri, (o.name || o.type) + ' parent=' + (o.parent && (o.parent.name || o.parent.type)) + (o.isInstancedMesh ? ' inst=' + o.count : '') + ' mat=' + (Array.isArray(o.material) ? o.material.map((m) => m.type).join('+') : o.material.type)]); });
  list.sort((a, b) => b[0] - a[0]); const total = list.reduce((s, x) => s + x[0], 0);
  return 'TOTAL ' + Math.round(total) + ' in ' + list.length + ' meshes\n' + list.slice(0, 25).map((x) => Math.round(x[0]) + '  ' + x[1]).join('\n');
  } catch (e) { return 'ERR ' + e.stack; } })()
