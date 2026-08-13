/* 80_missions.js — mission runtime, triggers, cutscenes, flow. OWNER: missions agent. STUB. */
VH.Missions = (function () {
  let cur = null;
  function init() {}
  function start(id) { cur = { id, objectives: [] }; VH.emit('missionStart', { id }); }
  function update() {}
  function complete() { if (cur) VH.emit('missionEnd', { id: cur.id, outcome: 'success' }); }
  function fail(r) { if (cur) VH.emit('missionEnd', { id: cur.id, outcome: 'fail', reason: r }); }
  function goto(id) { start(id); }
  return { init, start, update, complete, fail, goto, get current() { return cur; } };
})();
