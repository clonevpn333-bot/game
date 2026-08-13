/* 95_ui.js — HUD, menus, dialogue, codex. OWNER: ui agent. STUB. */
VH.UI = (function () {
  let root;
  function init() { root = document.getElementById('ui'); }
  function update() {}
  function showDialogue(node, cb) { if (cb) cb(); }
  function hideDialogue() {}
  function setObjectives() {}
  function toast() {}
  function titleScreen() {}
  function missionCard(m, cb) { if (cb) cb(); }
  return { init, update, showDialogue, hideDialogue, setObjectives, toast, titleScreen, missionCard };
})();
