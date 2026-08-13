/* 60_ai.js — enemy brains, squads, spawning. OWNER: ai agent. STUB. */
VH.AI = (function () {
  function init() {}
  function update() {}
  function spawn(archetype, pos, opts) {
    const a = VH.Chars.create(archetype, opts);
    a.group.position.copy(pos);
    VH.ctx.scene.add(a.group); VH.ctx.actors.push(a); VH.ctx.enemies.push(a);
    return a;
  }
  function clearAll() {
    VH.ctx.enemies.forEach(e => { if (e.group.parent) e.group.parent.remove(e.group); });
    VH.ctx.enemies.length = 0;
  }
  function setAlert() {}
  return { init, update, spawn, clearAll, setAlert };
})();
