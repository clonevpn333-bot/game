/* 90_audio.js — WebAudio synthesis, music, ambience. OWNER: audio agent. STUB. */
VH.Audio = (function () {
  let unlocked = false;
  function init() {}
  function unlock() { unlocked = true; }
  function update() {}
  function play() { return null; }
  function music() {}
  function ambience() {}
  function voice() {}
  return { init, unlock, update, play, music, ambience, voice, get unlocked() { return unlocked; } };
})();
