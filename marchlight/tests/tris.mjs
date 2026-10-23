export default async ({ ev, log }) => {
  log(await ev(() => { const g = __game; const c = g.player.char.mesh.geometry; return { idx: c.index.count / 3, verts: c.attributes.position.count }; }));
};
