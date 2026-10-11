// Applies the saved theme before first paint (an external file: the CSP forbids inline scripts).
(function () {
  var p = 'system';
  try {
    var s = localStorage.getItem('br-desktop-theme');
    if (s === 'light' || s === 'dark' || s === 'system') p = s;
  } catch {
    p = 'system';
  }
  if (p !== 'system') document.documentElement.dataset.theme = p;
})();
