// Word-timed, chunked captions (1–3 words) driven by window.TIMING; adds tweens to a GSAP timeline.
window.buildCaptions = function (tl, opts) {
  opts = opts || {};
  var T = window.TIMING;
  var skip = opts.skip || [];
  var hi = opts.highlight || "#ffd23f";
  var root = document.getElementById("captions");
  var chunks = [];
  T.lines.forEach(function (line) {
    if (skip.indexOf(line.i) >= 0) return;
    var cur = [];
    line.words.forEach(function (w, k) {
      cur.push(w);
      var punct = /[,?.!]$/.test(w.w);
      var next = line.words[k + 1];
      var len = cur.map(function (x) { return x.w; }).join(" ").length;
      if (!next || punct || cur.length >= 3 || (len >= 13 && next && next.w.length > 2)) {
        chunks.push({ words: cur, end: line.speechEnd + 0.25 });
        cur = [];
      }
    });
  });
  chunks.forEach(function (c, i) {
    c.start = Math.max(0, c.words[0].s - 0.06);
    var nxt = chunks[i + 1];
    c.stop = nxt && nxt.words[0].s - 0.06 < c.end + 0.6 ? Math.min(nxt.words[0].s - 0.06, c.end + 0.6) : c.end;
    var el = document.createElement("div");
    el.className = "cap";
    el.id = "cap-" + i;
    c.words.forEach(function (w, k) {
      var s = document.createElement("span");
      s.className = "cw";
      s.id = "cap-" + i + "-" + k;
      s.textContent = w.w.replace(/[,.]+$/, "").replace(/\.\.\.$/, "");
      el.appendChild(s);
    });
    root.appendChild(el);
    tl.set(el, { opacity: 1 }, c.start);
    tl.fromTo(el, { scale: 0.72, y: 26 }, { scale: 1, y: 0, duration: 0.2, ease: "back.out(3)" }, c.start);
    tl.set(el, { opacity: 0 }, c.stop);
    c.words.forEach(function (w, k) {
      var sp = document.getElementById("cap-" + i + "-" + k);
      tl.set(sp, { color: hi }, Math.max(c.start, w.s - 0.02));
      var nw = c.words[k + 1];
      if (nw) tl.set(sp, { color: "#ffffff" }, nw.s - 0.02);
    });
  });
  return chunks;
};
