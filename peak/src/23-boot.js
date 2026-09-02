// ============================================================ BOOT
(function () {
  function fail(msg) {
    var b = document.getElementById('boot');
    b.classList.remove('hidden');
    b.innerHTML = '<span style="max-width:420px;text-align:center;line-height:1.7;letter-spacing:.04em">' + msg + '</span>';
  }
  function start() {
    if (typeof THREE === 'undefined') {
      fail('three.js did not load. this build pulls r128 from cdnjs — check the connection and reload.');
      return;
    }
    if (typeof Peer === 'undefined') {
      // networking is optional: a solo climb still works
      window.Peer = function () { throw new Error('peerjs unavailable'); };
    }
    try {
      Game.init();
    } catch (e) {
      fail('the mountain would not load: ' + (e && e.message ? e.message : e));
      throw e;
    }
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(start, 0);
  else window.addEventListener('DOMContentLoaded', start);
})();
