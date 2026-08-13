/* 50_combat.js — player controller, weapons, damage, camera target. OWNER: combat agent. STUB. */
VH.Combat = (function () {
  const weapons = {};
  function init() {}
  function spawnPlayer(pos) {
    const p = VH.Chars.create('kas', { kind: 'player', team: 0 });
    p.group.position.copy(pos || new THREE.Vector3());
    VH.ctx.scene.add(p.group); VH.ctx.player = p; VH.ctx.actors.push(p);
    return p;
  }
  function update(dt) {
    const p = VH.ctx.player; if (!p) return;
    const ax = VH.Input.axis();
    p.group.position.x += ax.x * 6 * dt; p.group.position.z += ax.z * 6 * dt;
    const t = VH.Core.camTarget;
    t.pos.set(p.group.position.x, p.group.position.y + 3.1, p.group.position.z + 6.2);
    t.look.set(p.group.position.x, p.group.position.y + 1.5, p.group.position.z);
  }
  function damage(target, amount) {
    if (!target || !target.alive) return;
    target.hp -= amount;
    if (target.hp <= 0) { target.alive = false; VH.emit('kill', { target }); }
  }
  function giveWeapon() {}
  return { init, update, spawnPlayer, damage, giveWeapon, weapons };
})();
