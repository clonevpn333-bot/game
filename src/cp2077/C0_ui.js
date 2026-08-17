<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 14 — INTERFACE
   HUD, menus, cartography, dialogue presentation, notifications.
   ========================================================================== */
const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag);
  if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };

const UI = {
  screen: null, dlgNode: null, dlgTree: null, dlgSel: 0, dlgTyping: null,
  notes: [], dmgPool: [], mkrPool: [], tab: "inv", invSel: 0, shopSel: 0,
  mapCam: { x:0, z:0, zoom:0.14, drag:false, lx:0, ly:0 },
  compassEls: [],

/* ------------------------------------------------------------------ boot */
boot(pct, msg) {
  $("bootBar").style.right = (100 - pct*100) + "%";
  if (msg) $("bootMsg").textContent = msg;
},
bootDone() {
  $("boot").style.transition = "opacity .55s";
  $("boot").style.opacity = "0";
  setTimeout(() => { $("boot").style.display = "none"; }, 600);
},
show(id) {
  for (const s of document.querySelectorAll(".screen")) s.classList.remove("on");
  if (id) $(id).classList.add("on");
  if (typeof AUDIO !== "undefined" && AUDIO.ready) AUDIO.ui(id ? "open" : "close");
  this.screen = id;
  $("hud").classList.toggle("on", !id && GAME.started);
},
fade(on, cb) {
  $("fade").classList.toggle("on", on);
  if (cb) setTimeout(cb, 520);
},

/* ------------------------------------------------------------- init ---- */
init() {
  /* RAM cells */
  const rw = $("ramWrap");
  for (let i = 0; i < 12; i++) rw.appendChild(el("div", "ramCell"));
  const wa = $("wanted");
  for (let i = 0; i < 5; i++) wa.appendChild(el("div", "star"));
  /* compass ticks */
  const track = $("compassTrack");
  const cards = { 0:"N", 45:"NE", 90:"E", 135:"SE", 180:"S", 225:"SW", 270:"W", 315:"NW" };
  for (let a = 0; a < 360; a += 5) {
    if (cards[a]) { const c = el("div", "cCard", cards[a]); c.dataset.a = a; track.appendChild(c); this.compassEls.push(c); }
    else { const t = el("div", "cTick"); t.dataset.a = a; track.appendChild(t); this.compassEls.push(t); }
  }
  /* main menu */
  for (const b of document.querySelectorAll(".mmBtn"))
    b.onclick = () => this.menuAction(b.dataset.a);
  $("mmGpu").textContent = "GPU: " + (GX.caps.renderer || "—").slice(0, 54);
  $("deathBtn").onclick = () => GAME.respawn();
  /* pause tabs */
  for (const t of $("pTabs").children) t.onclick = () => this.setTab(t.dataset.t);
  /* creator tabs */
  for (const t of $("ccTabs").children) t.onclick = () => { this.ccTab = t.dataset.t;
    for (const o of $("ccTabs").children) o.classList.toggle("on", o === t); this.drawCC(); };
  $("ccGo").onclick = () => GAME.beginGame();
  $("ccBack").onclick = () => this.show("mm");
  window.addEventListener("resize", () => { if (this.screen === "pause" && this.tab === "map") this.drawMap(); });
},

menuAction(a) {
  if (a === "new") { GAME.newGame(); }
  else if (a === "cont") { GAME.loadGame(); }
  else if (a === "set") { this.show("pause"); this.setTab("set"); this.fromMenu = true; }
  else if (a === "cred") { this.showCredits(); }
},

/* =========================== HUD ======================================= */
updateHUD(P) {
  const hpPct = sat(P.hp/P.maxHp);
  $("hpNum").textContent = round(P.hp);
  $("hpMax").textContent = "/" + P.maxHp;
  $("hpFill").style.right = (100 - hpPct*100) + "%";
  if (hpPct < (this._chip === undefined ? 1 : this._chip)) this._chipT = 0.5;
  this._chip = hpPct;
  $("hpChip").style.right = (100 - sat(this._chipShown === undefined ? hpPct : this._chipShown)*100) + "%";
  $("armTag").textContent = "ARM " + round(P.armor);
  $("armFill").style.right = (100 - sat(P.armor/200)*100) + "%";
  $("stamFill").style.right = (100 - sat(P.stam/P.maxStam)*100) + "%";
  const cells = $("ramWrap").children;
  for (let i = 0; i < cells.length; i++)
    cells[i].classList.toggle("full", i < round(P.ram));
  /* weapon panel — hidden entirely when you are empty-handed, since an
     ammo readout for fists is noise */
  const w = P.weapon;
  const bare = !w || w.W.sys === WSYS.MELEE && w.id === "fist";
  $("wpn").style.display = bare ? "none" : "block";
  if (w && !bare) {
    $("wName").textContent = w.W.name;
    $("wMode").textContent = WSYS_NAME[w.W.sys] + " · " + w.W.cls.toUpperCase();
    if (w.W.mag > 0) $("ammo").innerHTML = w.ammo + "<small>/" + w.reserve + "</small>";
    else $("ammo").innerHTML = "∞<small></small>";
    $("wFill").style.right = (100 - (w.W.mag ? w.ammo/w.W.mag : 1)*100) + "%";
    $("reloadTag").textContent = w.reloading > 0 ? "RELOADING" : (w.needsReload() ? "PRESS R" : "");
    $("grenTag").textContent = "GRENADE ×" + P.grenades + "  [G]";
    $("ammo").style.display = w.W.mag > 0 ? "block" : "none";
    $("wBar").style.display = w.W.mag > 0 ? "block" : "none";
  }
  /* quick bar: what you are actually carrying, always visible */
  this.quickBar(P);
  /* clock + district */
  const t = RENDER.env.time % 86400;
  const hh = (t/3600)|0, mm = ((t%3600)/60)|0;
  $("clock").textContent = pad2(hh) + ":" + pad2(mm);
  $("district").textContent = CITY.districtName(P.x, P.z).toUpperCase();
  /* wanted */
  const stars = $("wanted").children;
  for (let i = 0; i < stars.length; i++) stars[i].classList.toggle("on", i < P.wanted);
  /* compass */
  /* forward is (-sin yaw, cos yaw) and north is -Z, so bearing = 180 + yaw */
  const deg = ((180 + P.yaw*R2D) % 360 + 360) % 360;
  const W = $("compass").clientWidth, PPD = W/90;
  for (const e of this.compassEls) {
    let d = (+e.dataset.a - deg + 540) % 360 - 180;
    e.style.left = (W/2 + d*PPD) + "px";
    e.style.display = abs(d) > 52 ? "none" : "block";
  }
  /* quest tracker */
  const q = GAME.activeQuest;
  if (q) {
    $("qName").textContent = q.name;
    const box = $("qObjs");
    if (box.dataset.q !== q.id + ":" + GAME.questStage) {
      box.dataset.q = q.id + ":" + GAME.questStage;
      box.innerHTML = "";
      q.stages.forEach((s, i) => {
        if (i > GAME.questStage + 1) return;
        const d = el("div", "qObj" + (i < GAME.questStage ? " done" : ""), s.obj);
        if (i === GAME.questStage) d.id = "qActive";
        box.appendChild(d);
      });
    }
    /* live distance on the active objective so you always know where to go */
    const act = $("qActive");
    const mk = q.stages[GAME.questStage] && q.stages[GAME.questStage].marker;
    if (act && mk) {
      const d = round(hypot(P.x-mk.x, P.z-mk.z));
      if (act.dataset.d !== String(d)) {
        act.dataset.d = String(d);
        act.textContent = q.stages[GAME.questStage].obj + "  ·  " +
          (d > 999 ? (d/1000).toFixed(1) + " km" : d + " m");
      }
    }
    $("quest").style.display = "block";
  } else $("quest").style.display = "none";
},
/* A compact always-on readout of consumables, grenades and equipped hacks,
   so the inventory is legible without opening a menu. */
quickBar(P) {
  const box = $("quick");
  if (!box) return;
  const sig = P.inv.length + "|" + P.grenades + "|" + P.hacks.join(",") + "|" +
              P.slots.join(",") + "|" + P.slot + "|" + P.money;
  if (box.dataset.sig === sig) return;
  box.dataset.sig = sig;
  box.innerHTML = "";
  const add = (icon, label, sub, cls) => {
    const d = el("div", "qItem" + (cls ? " " + cls : ""));
    d.innerHTML = "<i>" + icon + "</i><b>" + label + "</b>" +
                  (sub ? "<s>" + sub + "</s>" : "");
    box.appendChild(d);
  };
  P.slots.forEach((wid, i) => {
    if (!wid) return;
    const W = WEAPONS[wid];
    add(String(i+1), W.name, W.cls, i === P.slot ? "on" : "");
  });
  if (P.grenades > 0) add("G", "×" + P.grenades, "GRENADE");
  const consum = {};
  for (const it of P.inv) {
    if (!it.i) continue;
    const d = ITEMS[it.i];
    if (d && d.kind === "consumable") consum[it.i] = (consum[it.i]||0) + it.n;
  }
  for (const k in consum) add(ITEMS[k].icon, "×" + consum[k], ITEMS[k].name.split(" ")[0]);
  for (const h of P.hacks) add(ITEMS[h].icon, ITEMS[h].name.split(" ")[0], ITEMS[h].ram + " RAM", "hack");
  add("€", fmt(P.money), "EDDIES", "money");
},

tickChip(dt) {
  if (this._chipShown === undefined) this._chipShown = 1;
  this._chipShown = damp(this._chipShown, this._chip === undefined ? 1 : this._chip, 2.2, dt);
},

/* ---- notifications ---------------------------------------------------- */
note(txt, cls) {
  if (typeof AUDIO !== "undefined" && AUDIO.ready)
    AUDIO.ui(cls === "xp" ? "xp" : cls === "bad" ? "bad" : "notify");
  const n = el("div", "note" + (cls ? " " + cls : ""));
  n.innerHTML = txt;
  $("notes").appendChild(n);
  this.notes.push({ e: n, t: 4.2 });
  if (this.notes.length > 7) { const o = this.notes.shift(); o.e.remove(); }
},
tickNotes(dt) {
  for (let i = this.notes.length-1; i >= 0; i--) {
    const n = this.notes[i];
    n.t -= dt;
    if (n.t < 0.6) n.e.style.opacity = String(sat(n.t/0.6));
    if (n.t <= 0) { n.e.remove(); this.notes.splice(i, 1); }
  }
},
/* ---- floating damage numbers ------------------------------------------ */
dmgNum(x, y, z, amt, crit) {
  let d = this.dmgPool.find(p => !p.live);
  if (!d) { d = { e: el("div", "dmgN"), live: false }; $("worldUI").appendChild(d.e); this.dmgPool.push(d); }
  d.live = true; d.t = 1.0; d.x = x; d.y = y; d.z = z;
  d.vx = (Math.random()-.5)*0.5; d.vy = 1.6;
  d.e.className = "dmgN" + (crit ? " crit" : "");
  d.e.textContent = round(amt);
  d.e.style.display = "block";
},
tickWorldUI(dt) {
  const R = RENDER, vp = R.vp;
  const cw = GX.canvas.clientWidth, ch = GX.canvas.clientHeight;
  for (const d of this.dmgPool) {
    if (!d.live) continue;
    d.t -= dt; d.y += d.vy*dt; d.vy -= 2.4*dt; d.x += d.vx*dt;
    if (d.t <= 0) { d.live = false; d.e.style.display = "none"; continue; }
    const px = vp[0]*d.x + vp[4]*d.y + vp[8]*d.z + vp[12];
    const py = vp[1]*d.x + vp[5]*d.y + vp[9]*d.z + vp[13];
    const pw = vp[3]*d.x + vp[7]*d.y + vp[11]*d.z + vp[15];
    if (pw <= 0) { d.e.style.display = "none"; continue; }
    d.e.style.display = "block";
    d.e.style.left = ((px/pw*0.5+0.5)*cw) + "px";
    d.e.style.top = ((1-(py/pw*0.5+0.5))*ch) + "px";
    d.e.style.opacity = String(sat(d.t*1.4));
    d.e.style.transform = "translate(-50%,-50%) scale(" + (1 + (1-d.t)*0.25) + ")";
  }
},
/* ---- world markers (objectives, hostiles) ------------------------------ */
markers(list) {
  const R = RENDER, vp = R.vp;
  const cw = GX.canvas.clientWidth, ch = GX.canvas.clientHeight;
  let i = 0;
  for (const m of list) {
    let e = this.mkrPool[i];
    if (!e) { e = el("div", "mkr"); e.innerHTML = "<b class='gl'></b><span></span>";
      $("worldUI").appendChild(e); this.mkrPool[i] = e; }
    const px = vp[0]*m.x + vp[4]*m.y + vp[8]*m.z + vp[12];
    const py = vp[1]*m.x + vp[5]*m.y + vp[9]*m.z + vp[13];
    const pw = vp[3]*m.x + vp[7]*m.y + vp[11]*m.z + vp[15];
    if (pw <= 0) { e.style.display = "none"; i++; continue; }
    const sx = (px/pw*0.5+0.5)*cw, sy = (1-(py/pw*0.5+0.5))*ch;
    if (sx < -60 || sx > cw+60 || sy < -60 || sy > ch+60) { e.style.display = "none"; i++; continue; }
    e.style.display = "block";
    e.className = "mkr" + (m.hostile ? " hostile" : "");
    e.style.left = sx + "px"; e.style.top = sy + "px";
    e.lastChild.textContent = m.label + (m.dist !== undefined ? "  " + round(m.dist) + "m" : "");
    e.style.opacity = String(sat(1 - (m.dist||0)/900));
    i++;
  }
  for (; i < this.mkrPool.length; i++) this.mkrPool[i].style.display = "none";
},

/* ---- interaction prompt / scanner -------------------------------------- */
prompt(txt, key) {
  const p = $("prompt");
  if (!txt) { p.classList.remove("on"); return; }
  p.classList.add("on");
  p.innerHTML = "<em>" + (key||"E") + "</em>" + txt;
},
scan(target) {
  const sp = $("scanPanel");
  if (!target) { sp.classList.remove("on"); return; }
  sp.classList.add("on");
  const rows = $("scanRows");
  const data = target.rows;
  if (rows.dataset.k !== target.key) {
    rows.dataset.k = target.key;
    rows.innerHTML = "";
    for (const r of data) {
      const d = el("div", "sRow");
      d.appendChild(el("span", null, r[0]));
      d.appendChild(el("b", null, r[1]));
      rows.appendChild(d);
    }
  }
},

/* =========================== DIALOGUE ================================== */
startDialogue(treeId, onEnd) {
  const tree = DIALOGUE[treeId];
  if (!tree) { if (onEnd) onEnd(null); return; }
  this.dlgTree = tree; this.dlgEnd = onEnd;
  this.gotoNode(tree.start);
  $("dlg").classList.add("on");
  GAME.inDialogue = true;
  GAME.releasePointer();
},
gotoNode(id) {
  const n = this.dlgTree[id];
  if (!n) return this.endDialogue(null);
  this.dlgNode = n; this.dlgSel = 0;
  const who = CAST[n.who];
  $("dlgWho").textContent = who ? who.name : (n.who || "").toUpperCase();
  $("dlgWho").style.color = who ? who.col : "#fcee0a";
  const box = $("dlgTxt");
  box.textContent = "";
  this.dlgFull = n.text; this.dlgChars = 0;
  this.renderOpts();
},
renderOpts() {
  const box = $("dlgOpts");
  box.innerHTML = "";
  const n = this.dlgNode;
  if (!n.opts) return;
  n.opts.forEach((o, i) => {
    let locked = false, tag = "";
    if (o.skill) {
      const have = GAME.P.attrs[o.skill] || 0;
      locked = have < o.need;
      tag = ATTRS[o.skill].name.slice(0,4).toUpperCase() + " " + o.need;
    }
    if (o.path && GAME.P.lifepath !== o.path) locked = true;
    const d = el("div", "dOpt" + (o.skill ? " skill" : "") + (locked ? " lock" : "") + (i === this.dlgSel ? " on" : ""));
    d.innerHTML = "<i>" + (tag || ("0"+(i+1))) + "</i>" + o.t;
    d.onclick = () => { if (!locked) this.choose(i); };
    d.onmouseenter = () => { this.dlgSel = i; this.renderOpts(); };
    box.appendChild(d);
  });
},
choose(i) {
  const o = this.dlgNode.opts[i];
  if (!o) return;
  if (o.skill && (GAME.P.attrs[o.skill]||0) < o.need) return;
  if (o.act === "bonus") GAME.P.money += 4500, this.note("NEGOTIATED · <b>+€$4,500</b>", "xp");
  if (o.rom) GAME.addAffinity(o.rom, o.romBig ? 22 : 9);
  const to = o.to;
  if (to && to.indexOf("ROMANCE:") === 0) return this.endDialogue(to);
  if (to === "END") return this.endDialogue(null);
  if (to === "ADVANCE") return this.endDialogue("advance");
  if (to === "SHOP") { this.endDialogue(null); GAME.openShop(); return; }
  if (to && to.indexOf("FINISH:") === 0) return this.endDialogue("finish:" + to.slice(7));
  this.gotoNode(to);
},
tickDialogue(dt) {
  if (!GAME.inDialogue) return;
  if (this.dlgChars < this.dlgFull.length) {
    this.dlgChars = min(this.dlgFull.length, this.dlgChars + dt*68);
    $("dlgTxt").textContent = this.dlgFull.slice(0, this.dlgChars|0);
  }
},
endDialogue(result) {
  $("dlg").classList.remove("on");
  GAME.inDialogue = false;
  const cb = this.dlgEnd; this.dlgEnd = null;
  if (cb) cb(result);
  GAME.capturePointer();
},

/* ---- holocall --------------------------------------------------------- */
call(whoId, text, dur) {
  const who = CAST[whoId];
  const box = $("call");
  box.classList.add("on");
  $("callName").textContent = who ? who.short : whoId;
  $("callName").style.color = who ? who.col : "#fcee0a";
  $("callTxt").textContent = text;
  const cv = $("callCv"), av = $("callAv");
  if (av.clientWidth) { cv.width = av.clientWidth; cv.height = av.clientHeight; }
  this.drawCallAvatar(who);
  clearTimeout(this._callT);
  this._callT = setTimeout(() => box.classList.remove("on"), (dur||6)*1000);
},
/* screen-space rect of the call portrait, in 0..1 GL coords (y up) */
callRect() {
  const box = $("callAv");
  if (!box || !$("call").classList.contains("on")) return null;
  const r = box.getBoundingClientRect();
  const W = window.innerWidth, H = window.innerHeight;
  return [r.left/W, 1 - (r.bottom/H), r.width/W, r.height/H];
},
drawCallAvatar(who) {
  /* Only the overlay furniture: the 3D portrait itself is drawn by the engine
     into the WebGL canvas behind this element. */
  const c = $("callCv"), g = c.getContext("2d");
  const col = who ? who.col : "#fcee0a";
  g.clearRect(0, 0, c.width, c.height);
  g.strokeStyle = "rgba(255,255,255,.05)";
  for (let y = 0; y < c.height; y += 3) { g.beginPath(); g.moveTo(0,y); g.lineTo(c.width,y); g.stroke(); }
  g.strokeStyle = col; g.globalAlpha = .85; g.lineWidth = 1;
  const m = 6, L = 16;
  g.beginPath();
  g.moveTo(m, m+L); g.lineTo(m, m); g.lineTo(m+L, m);
  g.moveTo(c.width-m-L, m); g.lineTo(c.width-m, m); g.lineTo(c.width-m, m+L);
  g.moveTo(c.width-m, c.height-m-L); g.lineTo(c.width-m, c.height-m); g.lineTo(c.width-m-L, c.height-m);
  g.moveTo(m+L, c.height-m); g.lineTo(m, c.height-m); g.lineTo(m, c.height-m-L);
  g.stroke();
  g.globalAlpha = 1;
  g.fillStyle = col; g.font = "9px monospace";
  g.fillText("\u25CF LIVE", 12, 20);
  g.fillText("ENCRYPTED", c.width-64, c.height-12);
},

/* ---- subtitles -------------------------------------------------------- */
sub(who, txt, dur) {
  const s = $("subs");
  if (!txt) { s.classList.remove("on"); return; }
  s.classList.add("on");
  s.innerHTML = "<b>" + who + "</b>" + txt;
  clearTimeout(this._subT);
  this._subT = setTimeout(() => s.classList.remove("on"), (dur||4)*1000);
},

/* ======================= CARTOGRAPHY =================================== */
DCOL: { "Watson":"#3d6f8f", "City Center":"#8f7d3d", "Westbrook":"#8f3d6c",
  "Heywood":"#3d8f5a", "Santo Domingo":"#8f5a3d", "Pacifica":"#5a3d8f", "Badlands":"#6b6047" },

worldToScreen(x, z, cv, cam) {
  return { x: (x - cam.x)*cam.zoom + cv.width/2, y: (z - cam.z)*cam.zoom + cv.height/2 };
},
screenToWorld(sx, sy, cv) {
  const c = this.mapCam;
  const r = cv.getBoundingClientRect();
  const px = sx * (cv.width/r.width), py = sy * (cv.height/r.height);
  return { x: (px - cv.width/2)/c.zoom + c.x, z: (py - cv.height/2)/c.zoom + c.z };
},

drawMapInto(cv, cam, opts) {
  const g = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  g.fillStyle = "#04060a"; g.fillRect(0,0,W,H);
  const S = (x,z) => this.worldToScreen(x, z, cv, cam);
  /* --- water --- */
  g.fillStyle = "#071722";
  for (const w of CITY.waterRects) {
    const a = S(w.x0, w.z0), b = S(w.x1, w.z1);
    g.fillRect(a.x, a.y, b.x-a.x, b.y-a.y);
  }
  /* --- district washes --- */
  for (let i = CITY.districts.length-1; i >= 0; i--) {
    const d = CITY.districts[i];
    if (d.id === "badlands") continue;
    const a = S(d.x0, d.z0), b = S(d.x1, d.z1);
    g.fillStyle = this.DCOL[d.parent] || "#444";
    g.globalAlpha = d.parent === d.name ? 0.10 : 0.16;
    g.fillRect(a.x, a.y, b.x-a.x, b.y-a.y);
    g.globalAlpha = 1;
  }
  /* --- roads --- */
  const z = cam.zoom;
  g.lineCap = "round";
  for (const r of CITY.roads) {
    if (r.w < CITY.ROADW.arterial && z < 0.10) continue;
    const a = S(r.x0, r.z0), b = S(r.x1, r.z1);
    if ((a.x < -50 && b.x < -50) || (a.x > W+50 && b.x > W+50)) continue;
    if ((a.y < -50 && b.y < -50) || (a.y > H+50 && b.y > H+50)) continue;
    g.strokeStyle = r.w >= CITY.ROADW.arterial ? "rgba(150,160,175,.55)" : "rgba(105,115,130,.34)";
    g.lineWidth = max(0.6, r.w*z*0.55);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }
  /* --- building footprints (only when zoomed in) --- */
  if (z > 0.18) {
    for (const b of CITY.buildings) {
      const s = S(b.x, b.z);
      if (s.x < -20 || s.x > W+20 || s.y < -20 || s.y > H+20) continue;
      const hw = b.hw*z, hd = b.hd*z;
      const shade = sat(b.h/220);
      g.fillStyle = "rgba(" + (110+shade*80|0) + "," + (118+shade*80|0) + "," + (132+shade*70|0) + ",.5)";
      g.save(); g.translate(s.x, s.y); g.rotate(b.rot);
      g.fillRect(-hw, -hd, hw*2, hd*2);
      g.restore();
    }
  }
  /* --- highways --- */
  if (CITY.highways) for (const hwy of CITY.highways) {
    g.strokeStyle = "rgba(252,238,10,.5)"; g.lineWidth = max(1, 26*z*0.5);
    g.beginPath();
    hwy.pts.forEach((p, i) => { const s = S(p[0], p[1]); i ? g.lineTo(s.x, s.y) : g.moveTo(s.x, s.y); });
    g.stroke();
  }
  /* --- metro lines --- */
  for (const l of CITY.metro.lines) {
    g.strokeStyle = l.col; g.globalAlpha = .85; g.lineWidth = max(1.1, 3*z*6);
    g.beginPath();
    l.stops.forEach((sid, i) => { const st = CITY.metro.byId[sid]; if (!st) return;
      const s = S(st.x, st.z); i ? g.lineTo(s.x, s.y) : g.moveTo(s.x, s.y); });
    g.stroke(); g.globalAlpha = 1;
  }
  for (const st of CITY.metro.stations) {
    const s = S(st.x, st.z);
    if (s.x < -10 || s.x > W+10 || s.y < -10 || s.y > H+10) continue;
    g.fillStyle = "#c07bff"; g.strokeStyle = "#fff"; g.lineWidth = 1.2;
    g.beginPath(); g.arc(s.x, s.y, max(2.6, 5*z*6), 0, TAU); g.fill(); g.stroke();
    if (z > 0.22) { g.fillStyle = "#e8f4ff"; g.font = "9px monospace";
      g.fillText(st.name, s.x+8, s.y+3); }
  }
  /* --- district labels --- */
  if (opts && opts.labels) {
    g.textAlign = "center";
    for (const d of CITY.districts) {
      if (d.id === "badlands") continue;
      const s = S((d.x0+d.x1)/2, (d.z0+d.z1)/2);
      if (s.x < 0 || s.x > W || s.y < 0 || s.y > H) continue;
      const major = d.name === d.parent;
      if (!major && z < 0.13) continue;
      g.fillStyle = major ? "rgba(252,238,10,.92)" : "rgba(232,244,255,.55)";
      g.font = (major ? "bold " : "") + (major ? max(11, 15*z*6) : max(9, 10*z*6)) + "px Arial Narrow, sans-serif";
      g.fillText(d.name.toUpperCase(), s.x, s.y);
    }
    g.textAlign = "left";
  }
  /* --- landmarks --- */
  if (z > 0.09) for (const b of CITY.landmarks) {
    const s = S(b.x, b.z);
    if (s.x < 0 || s.x > W || s.y < 0 || s.y > H) continue;
    g.fillStyle = "#fcee0a";
    g.beginPath(); g.moveTo(s.x, s.y-5); g.lineTo(s.x+5, s.y); g.lineTo(s.x, s.y+5); g.lineTo(s.x-5, s.y); g.fill();
    if (z > 0.2) { g.fillStyle = "rgba(252,238,10,.85)"; g.font = "9px monospace";
      g.fillText(b.name, s.x+8, s.y+3); }
  }
  /* --- quest markers --- */
  const q = GAME.activeQuest;
  if (q && q.stages[GAME.questStage] && q.stages[GAME.questStage].marker) {
    const m = q.stages[GAME.questStage].marker;
    const s = S(m.x, m.z);
    g.strokeStyle = "#fcee0a"; g.lineWidth = 2;
    g.beginPath(); g.arc(s.x, s.y, 9, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(s.x, s.y-14); g.lineTo(s.x+7, s.y-4); g.lineTo(s.x-7, s.y-4); g.closePath();
    g.fillStyle = "#fcee0a"; g.fill();
  }
  if (GAME.waypoint) {
    const s = S(GAME.waypoint.x, GAME.waypoint.z);
    g.strokeStyle = "#00f0ff"; g.lineWidth = 2;
    g.beginPath(); g.arc(s.x, s.y, 7, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(s.x-11, s.y); g.lineTo(s.x+11, s.y); g.moveTo(s.x, s.y-11); g.lineTo(s.x, s.y+11); g.stroke();
  }
  /* --- player --- */
  const P = GAME.P;
  const ps = S(P.x, P.z);
  g.save(); g.translate(ps.x, ps.y); g.rotate(PI - P.yaw);
  g.fillStyle = "#fcee0a";
  g.beginPath(); g.moveTo(0,-8); g.lineTo(6,7); g.lineTo(0,4); g.lineTo(-6,7); g.closePath(); g.fill();
  g.restore();
},

drawMap() {
  const cv = $("mapCv");
  const wrap = $("mapWrap");
  if (!wrap) return;
  cv.width = wrap.clientWidth; cv.height = wrap.clientHeight;
  this.drawMapInto(cv, this.mapCam, { labels: true });
},
mapHover(sx, sy) {
  const cv = $("mapCv");
  const w = this.screenToWorld(sx, sy, cv);
  const tip = $("mapTip");
  const d = CITY.districtAt(w.x, w.z);
  let label = d.name + " · " + d.parent;
  for (const st of CITY.metro.stations)
    if (hypot(st.x-w.x, st.z-w.z) < 60/this.mapCam.zoom*0.1) label = "NCART · " + st.name + " (" + st.lines.join(" ") + ")";
  tip.style.display = "block";
  tip.style.left = (sx+14) + "px"; tip.style.top = (sy+14) + "px";
  tip.textContent = label;
},

/* ---- minimap ---------------------------------------------------------- */
drawMini(P) {
  const cv = $("mini"), g = cv.getContext("2d");
  const cam = { x: P.x, z: P.z, zoom: 0.42 };
  const W = cv.width, H = cv.height;
  g.save();
  g.beginPath(); g.rect(0,0,W,H); g.clip();
  g.translate(W/2, H/2); g.rotate(PI - P.yaw); g.translate(-W/2, -H/2);
  const S = (x,z) => ({ x:(x-cam.x)*cam.zoom + W/2, y:(z-cam.z)*cam.zoom + H/2 });
  g.fillStyle = "#050a10"; g.fillRect(-W, -H, W*3, H*3);
  g.fillStyle = "#08131c";
  for (const w of CITY.waterRects) { const a=S(w.x0,w.z0), b=S(w.x1,w.z1);
    g.fillRect(a.x,a.y,b.x-a.x,b.y-a.y); }
  const near = CITY.roadGrid.query(P.x, P.z, 300, []);
  const seen = new Set();
  for (const r of near) {
    if (seen.has(r)) continue; seen.add(r);
    const a = S(r.x0, r.z0), b = S(r.x1, r.z1);
    g.strokeStyle = r.w >= CITY.ROADW.arterial ? "rgba(140,150,168,.7)" : "rgba(96,106,122,.45)";
    g.lineWidth = max(1, r.w*cam.zoom*0.5);
    g.beginPath(); g.moveTo(a.x,a.y); g.lineTo(b.x,b.y); g.stroke();
  }
  const bl = CITY.bldGrid.query(P.x, P.z, 280, []);
  for (const b of bl) {
    const s = S(b.x, b.z);
    g.fillStyle = "rgba(122,132,148,.45)";
    g.save(); g.translate(s.x,s.y); g.rotate(b.rot);
    g.fillRect(-b.hw*cam.zoom, -b.hd*cam.zoom, b.hw*2*cam.zoom, b.hd*2*cam.zoom);
    g.restore();
  }
  for (const st of CITY.metro.stations) {
    if (hypot(st.x-P.x, st.z-P.z) > 300) continue;
    const s = S(st.x, st.z);
    g.fillStyle = "#c07bff"; g.beginPath(); g.arc(s.x,s.y,4,0,TAU); g.fill();
  }
  for (const n of NPCS.list) {
    if (n.state === "dead") continue;
    const d = hypot(n.x-P.x, n.z-P.z); if (d > 240) continue;
    const s = S(n.x, n.z);
    g.fillStyle = n.hostile ? "#ff003c" : (n.faction === "ncpd" ? "#2f9dff" : "rgba(200,215,230,.55)");
    g.beginPath(); g.arc(s.x, s.y, n.hostile ? 3.2 : 2, 0, TAU); g.fill();
  }
  for (const c of TRAFFIC.cars) {
    const d = hypot(c.p[0]-P.x, c.p[2]-P.z); if (d > 260) continue;
    const s = S(c.p[0], c.p[2]);
    g.fillStyle = "rgba(255,220,120,.5)";
    g.fillRect(s.x-1.6, s.y-1.6, 3.2, 3.2);
  }
  const q = GAME.activeQuest;
  const mk = q && q.stages[GAME.questStage] && q.stages[GAME.questStage].marker;
  if (mk) { const s = S(mk.x, mk.z);
    const cx = clamp(s.x, 10, W-10), cy = clamp(s.y, 10, H-10);
    g.fillStyle = "#fcee0a"; g.beginPath();
    g.moveTo(cx, cy-6); g.lineTo(cx+6, cy); g.lineTo(cx, cy+6); g.lineTo(cx-6, cy); g.fill(); }
  if (GAME.waypoint) { const s = S(GAME.waypoint.x, GAME.waypoint.z);
    const cx = clamp(s.x, 8, W-8), cy = clamp(s.y, 8, H-8);
    g.strokeStyle = "#00f0ff"; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, 5, 0, TAU); g.stroke(); }
  g.restore();
  /* player arrow (unrotated, always up) */
  g.fillStyle = "#fcee0a";
  g.beginPath(); g.moveTo(W/2, H/2-8); g.lineTo(W/2+6, H/2+6); g.lineTo(W/2, H/2+2); g.lineTo(W/2-6, H/2+6);
  g.closePath(); g.fill();
  g.strokeStyle = "rgba(252,238,10,.35)"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(W/2, H/2); g.lineTo(W/2 - 60, H/2 - 90); g.moveTo(W/2, H/2); g.lineTo(W/2 + 60, H/2 - 90);
  g.stroke();
},

/* ======================= PAUSE MENU ==================================== */
setTab(t) {
  if (typeof AUDIO !== "undefined" && AUDIO.ready && this.tab !== t) AUDIO.ui("tab");
  this.tab = t;
  for (const o of $("pTabs").children) o.classList.toggle("on", o.dataset.t === t);
  const titles = { inv:"INVENTORY", chr:"CHARACTER", cyb:"CYBERWARE", jrn:"JOURNAL",
                   map:"NIGHT CITY", phn:"MESSAGES", set:"SETTINGS" };
  $("pTitleTxt").textContent = titles[t] || "";
  $("pMoney").textContent = "€$ " + fmt(GAME.P.money);
  const body = $("pBody");
  body.innerHTML = "";
  if (t === "inv") this.buildInv(body);
  else if (t === "chr") this.buildChar(body);
  else if (t === "cyb") this.buildCyber(body);
  else if (t === "jrn") this.buildJournal(body);
  else if (t === "map") this.buildMap(body);
  else if (t === "phn") this.buildPhone(body);
  else if (t === "set") this.buildSettings(body);
},

panel(parent, title, flex, w) {
  const c = el("div", "col panel cut-s");
  if (w) c.style.width = w; if (flex) c.style.flex = flex;
  c.appendChild(el("div", "hdr", title));
  const s = el("div", "scroll"); s.style.flex = "1"; s.style.padding = "8px";
  c.appendChild(s); parent.appendChild(c);
  return s;
},

buildInv(body) {
  const P = GAME.P;
  const left = this.panel(body, "CARRIED · " + P.inv.length + " ITEMS", "1.4");
  const right = this.panel(body, "DETAILS", null, "min(360px,30vw)");
  const equip = this.panel(body, "LOADOUT", null, "min(280px,24vw)");
  const show = (item, idx) => {
    right.innerHTML = "";
    if (!item) return;
    const def = item.w ? WEAPONS[item.w] : ITEMS[item.i];
    right.appendChild(el("div", "pTitle q" + (def.tier||def.q||1), def.name));
    right.appendChild(el("div", "rSub", (def.cls || def.kind || "").toUpperCase() +
      (def.sys !== undefined ? " · " + WSYS_NAME[def.sys] : "")));
    const p = el("div", "pFlav", def.desc || "");
    right.appendChild(p);
    const stats = [];
    if (def.dmg) stats.push(["Damage", def.dmg]);
    if (def.rpm) stats.push(["Rate of fire", def.rpm + " rpm"]);
    if (def.mag) stats.push(["Magazine", def.mag]);
    if (def.crit) stats.push(["Crit multiplier", "x" + def.crit]);
    if (def.range) stats.push(["Effective range", def.range + " m"]);
    if (def.reload) stats.push(["Reload", def.reload + " s"]);
    if (def.heal) stats.push(["Restores", round(def.heal*100) + "% health"]);
    if (def.ram) stats.push(["RAM", "+" + def.ram]);
    if (def.armor) stats.push(["Armour", "+" + def.armor]);
    if (def.price) stats.push(["Value", "€$ " + fmt(def.price)]);
    for (const s of stats) {
      const d = el("div", "stat");
      d.appendChild(el("span", null, s[0]));
      d.appendChild(el("b", null, String(s[1])));
      right.appendChild(d);
    }
    const bar = el("div"); bar.style.cssText = "display:flex;gap:6px;margin-top:14px;flex-wrap:wrap";
    if (item.w) { const b = el("button", "btn", "EQUIP");
      b.onclick = () => { GAME.equip(item.w); this.setTab("inv"); }; bar.appendChild(b); }
    if (def.kind === "consumable") { const b = el("button", "btn", "USE");
      b.onclick = () => { GAME.useItem(idx); this.setTab("inv"); }; bar.appendChild(b); }
    if (def.kind === "hack") { const b = el("button", "btn gh", "EQUIP HACK");
      b.onclick = () => { GAME.equipHack(item.i); this.setTab("inv"); }; bar.appendChild(b); }
    const d = el("button", "btn gh", "DROP");
    d.onclick = () => { GAME.P.inv.splice(idx,1); this.setTab("inv"); };
    bar.appendChild(d);
    right.appendChild(bar);
  };
  P.inv.forEach((item, i) => {
    const def = item.w ? WEAPONS[item.w] : ITEMS[item.i];
    if (!def) return;
    const r = el("div", "row" + (i === this.invSel ? " on" : ""));
    const ic = el("div", "ico", def.icon || "▮"); r.appendChild(ic);
    const c = el("div");
    c.appendChild(el("div", "rName q" + (def.tier||def.q||1), def.name + (item.n > 1 ? "  ×" + item.n : "")));
    c.appendChild(el("div", "rSub", (def.cls || def.kind || "").toUpperCase()));
    r.appendChild(c);
    const rt = el("div", "rRight", def.dmg ? ("DMG " + def.dmg) : ("€$" + fmt(def.price||0)));
    r.appendChild(rt);
    r.onclick = () => { this.invSel = i; this.setTab("inv"); };
    left.appendChild(r);
    if (i === this.invSel) show(item, i);
  });
  if (!P.inv.length) left.appendChild(el("div", "rSub", "EMPTY — LOOT SOMETHING"));
  /* loadout */
  for (let s = 0; s < 3; s++) {
    const wid = P.slots[s];
    const def = wid ? WEAPONS[wid] : null;
    const r = el("div", "row" + (P.slot === s ? " on" : ""));
    r.appendChild(el("div", "ico", String(s+1)));
    const c = el("div");
    c.appendChild(el("div", "rName", def ? def.name : "— empty —"));
    c.appendChild(el("div", "rSub", def ? def.cls : "SLOT " + (s+1)));
    r.appendChild(c);
    r.onclick = () => { GAME.selectSlot(s); this.setTab("inv"); };
    equip.appendChild(r);
  }
  equip.appendChild(el("div", "hdr", "QUICKHACKS"));
  P.hacks.forEach((h) => {
    const d = ITEMS[h];
    const r = el("div", "row");
    r.appendChild(el("div", "ico", d.icon));
    const c = el("div");
    c.appendChild(el("div", "rName", d.name));
    c.appendChild(el("div", "rSub", d.ram + " RAM"));
    r.appendChild(c);
    equip.appendChild(r);
  });
},

buildChar(body) {
  const P = GAME.P;
  const left = this.panel(body, "ATTRIBUTES · " + P.attrPoints + " POINTS", "1");
  const mid = this.panel(body, "PERKS · " + P.perkPoints + " POINTS", "1.3");
  const right = this.panel(body, "RECORD", null, "min(300px,26vw)");
  for (const k in ATTRS) {
    const row = el("div", "attrRow");
    row.appendChild(el("div", "an", ATTRS[k].name));
    const minus = el("button", null, "−");
    const v = el("div", "av", String(P.attrs[k]));
    const plus = el("button", null, "+");
    plus.disabled = P.attrPoints <= 0 || P.attrs[k] >= 20;
    minus.disabled = true;
    plus.onclick = () => { P.attrs[k]++; P.attrPoints--; GAME.recalc(); this.setTab("chr"); };
    row.appendChild(minus); row.appendChild(v); row.appendChild(plus);
    left.appendChild(row);
    const d = el("div", "rSub"); d.textContent = ATTRS[k].desc;
    d.style.cssText = "padding:0 0 9px 0;line-height:1.6;text-transform:none;letter-spacing:.02em";
    left.appendChild(d);
  }
  for (const p of PERKS) {
    const owned = P.perks.indexOf(p.id) >= 0;
    const locked = (p.req && P.attrs[p.attr] < p.req) || P.perkPoints < p.cost;
    const r = el("div", "row" + (owned ? " on" : ""));
    r.appendChild(el("div", "ico", owned ? "★" : "☆"));
    const c = el("div");
    c.appendChild(el("div", "rName", p.name));
    c.appendChild(el("div", "rSub", ATTRS[p.attr].name + (p.req ? " " + p.req + "+" : "") + " · " + p.cost + " pt"));
    r.appendChild(c);
    const d = el("div", "rRight"); d.textContent = owned ? "OWNED" : (locked ? "LOCKED" : "BUY");
    r.appendChild(d);
    if (!owned && !locked) r.onclick = () => { P.perks.push(p.id); P.perkPoints -= p.cost;
      GAME.recalc(); this.note("PERK UNLOCKED · <b>" + p.name + "</b>", "xp"); this.setTab("chr"); };
    mid.appendChild(r);
    const dd = el("div", "rSub"); dd.textContent = p.desc;
    dd.style.cssText = "padding:0 0 8px 50px;line-height:1.6;text-transform:none;letter-spacing:.02em";
    mid.appendChild(dd);
  }
  const rec = [
    ["Handle", P.name], ["Lifepath", LIFEPATHS[P.lifepath].name],
    ["Level", P.level], ["Street cred", P.street],
    ["XP", fmt(P.xp) + " / " + fmt(GAME.xpForLevel(P.level+1))],
    ["Eddies", "€$ " + fmt(P.money)],
    ["Kills", P.stats.kills], ["Headshots", P.stats.headshots],
    ["Distance travelled", round(P.stats.dist) + " m"],
    ["Vehicles driven", P.stats.drives],
    ["Jobs completed", P.stats.quests],
    ["Days in Night City", 1 + ((RENDER.env.time/86400)|0)],
  ];
  for (const s of rec) { const d = el("div", "stat");
    d.appendChild(el("span", null, s[0])); d.appendChild(el("b", null, String(s[1]))); right.appendChild(d); }
  if (P.shard) {
    right.appendChild(el("div", "hdr", "NEURAL MATRIX"));
    const b = el("div", "bar"); const i = el("i");
    i.style.width = round(P.integrity*100) + "%";
    i.style.background = P.integrity > .5 ? "#fcee0a" : "#ff003c";
    b.appendChild(i); b.style.margin = "8px 0";
    right.appendChild(b);
    const t = el("div", "rSub", "MATRIX INTEGRITY " + round(P.integrity*100) + "% · " +
      round(P.integrity*21) + " DAYS");
    t.style.textTransform = "none";
    right.appendChild(t);
  }
},

buildCyber(body) {
  const P = GAME.P;
  const left = this.panel(body, "INSTALLED", "1");
  const right = this.panel(body, "AVAILABLE AT RIPPERDOCS", "1.2");
  const slots = ["nervous","skin","eyes","deck","legs","circ","arms"];
  const names = { nervous:"Nervous System", skin:"Integumentary", eyes:"Ocular",
    deck:"Cyberdeck", legs:"Skeleton · Legs", circ:"Circulatory", arms:"Arms" };
  for (const s of slots) {
    const inst = P.cyber[s];
    const d = ITEMS[inst];
    const r = el("div", "row" + (inst ? " on" : ""));
    r.appendChild(el("div", "ico", d ? d.icon : "○"));
    const c = el("div");
    c.appendChild(el("div", "rName", d ? d.name : "— empty —"));
    c.appendChild(el("div", "rSub", names[s]));
    r.appendChild(c);
    left.appendChild(r);
    if (d) { const dd = el("div", "rSub", d.desc);
      dd.style.cssText = "padding:0 0 8px 50px;line-height:1.6;text-transform:none"; left.appendChild(dd); }
  }
  for (const k in ITEMS) {
    const d = ITEMS[k];
    if (d.kind !== "cyber") continue;
    const owned = P.cyber[d.slot] === k;
    const r = el("div", "row" + (owned ? " on" : ""));
    r.appendChild(el("div", "ico", d.icon));
    const c = el("div");
    c.appendChild(el("div", "rName q" + d.q, d.name));
    c.appendChild(el("div", "rSub", names[d.slot]));
    r.appendChild(c);
    r.appendChild(el("div", "rRight", owned ? "INSTALLED" : "€$" + fmt(d.price)));
    if (!owned) r.onclick = () => GAME.buyCyber(k);
    right.appendChild(r);
    const dd = el("div", "rSub", d.desc);
    dd.style.cssText = "padding:0 0 8px 50px;line-height:1.6;text-transform:none";
    right.appendChild(dd);
  }
},

buildJournal(body) {
  const P = GAME.P;
  const left = this.panel(body, "JOBS", "1");
  const right = this.panel(body, "BRIEF", "1.3");
  const showQ = (q) => {
    right.innerHTML = "";
    right.appendChild(el("div", "pTitle", q.name));
    right.appendChild(el("div", "rSub", q.main ? "MAIN JOB · ACT " + q.act :
      "GIG · " + (CAST[q.fixer] ? CAST[q.fixer].short : "")));
    const b = el("div", "pFlav", q.brief); b.style.fontStyle = "normal"; right.appendChild(b);
    const done = P.questsDone.indexOf(q.id) >= 0;
    const active = GAME.activeQuest && GAME.activeQuest.id === q.id;
    q.stages.forEach((s, i) => {
      const st = done ? "done" : (active && i < GAME.questStage ? "done" : "");
      const d = el("div", "qObj " + st, s.obj);
      d.style.marginBottom = "7px";
      if (!done && active && i > GAME.questStage) d.style.opacity = ".35";
      if (!done && !active && i > 0) d.style.opacity = ".35";
      right.appendChild(d);
    });
    if (q.reward) { right.appendChild(el("div", "hdr", "PAYOUT"));
      const r1 = el("div", "stat"); r1.appendChild(el("span", null, "Eddies"));
      r1.appendChild(el("b", null, "€$ " + fmt(q.reward.money))); right.appendChild(r1);
      const r2 = el("div", "stat"); r2.appendChild(el("span", null, "XP"));
      r2.appendChild(el("b", null, fmt(q.reward.xp))); right.appendChild(r2);
      const r3 = el("div", "stat"); r3.appendChild(el("span", null, "Street cred"));
      r3.appendChild(el("b", null, fmt(q.reward.street))); right.appendChild(r3); }
    if (!active && !done && GAME.canStart(q)) {
      const b2 = el("button", "btn", "TRACK THIS JOB");
      b2.style.marginTop = "14px";
      b2.onclick = () => { GAME.startQuest(q.id); this.setTab("jrn"); };
      right.appendChild(b2);
    }
  };
  let first = null;
  for (const k in QUESTS) {
    const q = QUESTS[k];
    const done = P.questsDone.indexOf(q.id) >= 0;
    const active = GAME.activeQuest && GAME.activeQuest.id === q.id;
    const avail = GAME.canStart(q);
    if (!done && !active && !avail) continue;
    const r = el("div", "row" + (active ? " on" : ""));
    r.appendChild(el("div", "ico", q.main ? "◆" : "◇"));
    const c = el("div");
    c.appendChild(el("div", "rName", q.name));
    c.appendChild(el("div", "rSub", done ? "COMPLETED" : (active ? "ACTIVE" : "AVAILABLE")));
    r.appendChild(c);
    r.onclick = () => showQ(q);
    left.appendChild(r);
    if (!first || active) first = q;
  }
  if (first) showQ(first);
  /* lore shards */
  const sh = this.panel(body, "SHARDS · " + P.shards.length, null, "min(300px,26vw)");
  P.shards.forEach(idx => {
    const s = SHARDS[idx];
    const d = el("div"); d.style.marginBottom = "12px";
    d.appendChild(el("div", "rName", s.t));
    const b = el("div", "rSub", s.b);
    b.style.cssText = "line-height:1.7;text-transform:none;letter-spacing:.02em;margin-top:4px";
    d.appendChild(b);
    sh.appendChild(d);
  });
  if (!P.shards.length) sh.appendChild(el("div", "rSub", "NO SHARDS RECOVERED"));
},

buildMap(body) {
  const wrap = el("div"); wrap.id = "mapWrap";
  wrap.style.cssText = "position:relative;flex:1;min-height:0;overflow:hidden";
  const cv = el("canvas"); cv.id = "mapCv";
  wrap.appendChild(cv);
  const tip = el("div"); tip.id = "mapTip"; wrap.appendChild(tip);
  const leg = el("div"); leg.id = "mapLegend";
  leg.innerHTML = Object.keys(this.DCOL).map(k =>
    "<b style='background:" + this.DCOL[k] + "'></b>" + k).join("<br>") +
    "<br><b style='background:#c07bff'></b>NCART STATION" +
    "<br><b style='background:#fcee0a'></b>OBJECTIVE / LANDMARK";
  wrap.appendChild(leg);
  body.appendChild(wrap);
  /* first open frames the whole city; afterwards the view is remembered */
  if (!this._mapOpened) {
    this._mapOpened = true;
    this.mapCam.x = (CITY.MINX + CITY.MAXX) / 2;
    this.mapCam.z = (CITY.MINZ + CITY.MAXZ) / 2 - 200;
    requestAnimationFrame(() => {
      const c = $("mapCv");
      if (c) this.mapCam.zoom = min(c.width / 5600, c.height / 6600) * 0.94;
      this.drawMap();
    });
  }
  /* re-bind after DOM rebuild */
  requestAnimationFrame(() => { this.init2Map(); this.drawMap(); });
},
init2Map() {
  const mc = $("mapCv"); if (!mc) return;
  mc.onmousedown = (e) => { this.mapCam.drag = true; this.mapCam.lx = e.clientX; this.mapCam.ly = e.clientY; };
  mc.onmousemove = (e) => {
    const r = mc.getBoundingClientRect();
    if (this.mapCam.drag) {
      const sc = mc.width/r.width;
      this.mapCam.x -= (e.clientX-this.mapCam.lx)*sc/this.mapCam.zoom;
      this.mapCam.z -= (e.clientY-this.mapCam.ly)*sc/this.mapCam.zoom;
      this.mapCam.lx = e.clientX; this.mapCam.ly = e.clientY; this.drawMap();
    }
    this.mapHover(e.clientX-r.left, e.clientY-r.top);
  };
  mc.onmouseleave = () => { const t = $("mapTip"); if (t) t.style.display = "none"; };
  mc.onwheel = (e) => { e.preventDefault();
    this.mapCam.zoom = clamp(this.mapCam.zoom*(e.deltaY<0?1.16:1/1.16), 0.035, 1.4); this.drawMap(); };
  mc.onclick = (e) => { const r = mc.getBoundingClientRect();
    const w = this.screenToWorld(e.clientX-r.left, e.clientY-r.top, mc);
    GAME.setWaypoint(w.x, w.z); this.drawMap(); };
},

buildPhone(body) {
  const P = GAME.P;
  const left = this.panel(body, "CONTACTS", null, "min(300px,26vw)");
  const right = this.panel(body, "THREAD", "1");
  const showThread = (id) => {
    right.innerHTML = "";
    const c = CAST[id];
    right.appendChild(el("div", "pTitle", c.name));
    right.appendChild(el("div", "rSub", c.role));
    const bio = el("div", "pFlav", c.bio); right.appendChild(bio);
    right.appendChild(el("div", "hdr", "MESSAGES"));
    const msgs = P.messages.filter(m => m.from === id);
    if (!msgs.length) right.appendChild(el("div", "rSub", "NO MESSAGES"));
    for (const m of msgs) {
      const d = el("div");
      d.style.cssText = "background:rgba(255,255,255,.04);padding:9px 12px;margin-bottom:6px;border-left:2px solid " + c.col;
      d.appendChild(el("div", "rSub", m.t));
      const b = el("div", null, m.b);
      b.style.cssText = "font-size:13px;line-height:1.65;margin-top:4px";
      d.appendChild(b);
      right.appendChild(d);
    }
    const rel = P.rel && P.rel[id];
    if (ROMANCE[id] && rel !== undefined) {
      right.appendChild(el("div", "hdr", "RELATIONSHIP"));
      const R = ROMANCE[id];
      const stage = min(3, (rel / 26) | 0);
      const b = el("div", "bar"); const fi = el("i");
      fi.style.width = round(sat(rel/100)*100) + "%";
      fi.style.background = P.romance === id ? "#ff2b6d" : c.col;
      b.appendChild(fi); b.style.margin = "8px 0";
      right.appendChild(b);
      const st = el("div", "rSub", (P.romance === id ? "TOGETHER" : R.stages[stage]) +
        " · " + round(rel) + "/100");
      st.style.textTransform = "none";
      right.appendChild(st);
      const bl = el("div", "pFlav", R.blurb);
      right.appendChild(bl);
      if (P.romanceReady && P.romanceReady[id] && !(P.romanceDone && P.romanceDone[id])) {
        const g = el("div", "rSub", "WAITING FOR YOU AT " + R.place.label);
        g.style.color = "var(--yl)";
        right.appendChild(g);
        const bb = el("button", "btn", "SET WAYPOINT");
        bb.onclick = () => { GAME.setWaypoint(R.place.x, R.place.z); this.closeMenus(); };
        right.appendChild(bb);
      }
    }
    if (GAME.canCall(id)) {
      const b = el("button", "btn", "CALL " + c.short.toUpperCase());
      b.style.marginTop = "12px";
      b.onclick = () => { GAME.phoneCall(id); this.closeMenus(); };
      right.appendChild(b);
    }
  };
  let first = null;
  for (const k in CAST) {
    if (P.contacts.indexOf(k) < 0) continue;
    const c = CAST[k];
    const unread = P.messages.filter(m => m.from === k && !m.read).length;
    const r = el("div", "row");
    const ic = el("div", "ico", c.short[0]); ic.style.color = c.col; r.appendChild(ic);
    const cc = el("div");
    cc.appendChild(el("div", "rName", c.short));
    cc.appendChild(el("div", "rSub", c.role));
    r.appendChild(cc);
    if (unread) r.appendChild(el("div", "rRight", "● " + unread));
    r.onclick = () => showThread(k);
    left.appendChild(r);
    if (!first) first = k;
  }
  if (first) showThread(first);
},

buildSettings(body) {
  const S = RENDER.settings;
  const left = this.panel(body, "GRAPHICS", "1");
  const right = this.panel(body, "GAMEPLAY", "1");
  const row = (parent, label, ctrl, hint) => {
    const r = el("div", "setRow");
    r.appendChild(el("label", null, label));
    r.appendChild(ctrl);
    if (hint) r.appendChild(el("span", "hint", hint));
    parent.appendChild(r); return r;
  };
  const sel = (opts, cur, cb) => {
    const s = el("select");
    opts.forEach((o, i) => { const op = el("option", null, o); op.value = String(i); s.appendChild(op); });
    s.value = String(cur);
    s.onchange = () => cb(+s.value);
    return s;
  };
  const tog = (on, cb) => {
    const t = el("div", "toggle" + (on ? " on" : "")); t.appendChild(el("i"));
    t.onclick = () => { const nv = !t.classList.contains("on"); t.classList.toggle("on", nv); cb(nv); };
    return t;
  };
  const slide = (min_, max_, step, val, cb, fmtF) => {
    const w = el("div"); w.style.cssText = "display:flex;align-items:center;gap:10px;flex:1";
    const i = el("input"); i.type = "range"; i.min = min_; i.max = max_; i.step = step; i.value = val;
    i.style.flex = "1";
    const v = el("span", "v", fmtF ? fmtF(val) : String(val));
    i.oninput = () => { v.textContent = fmtF ? fmtF(+i.value) : i.value; cb(+i.value); };
    w.appendChild(i); w.appendChild(v);
    return w;
  };
  row(left, "Quality preset", sel(["Performance","Balanced","High","Ultra"], RENDER.quality,
    v => { GAME._manualQuality = true; RENDER.applyQuality(v); this.setTab("set"); }), "resets the options below");
  row(left, "Resolution scale", slide(50, 100, 5, S.resScale*100, v => { S.resScale = v/100; RENDER.resize(true); },
    v => v + "%"));
  row(left, "Shadow cascades", sel(["Off","2 cascades","3 cascades"], S.shadows, v => S.shadows = v));
  row(left, "Ambient occlusion", tog(!!S.ssao, v => S.ssao = v?1:0));
  row(left, "Screen-space reflections", tog(!!S.ssr, v => S.ssr = v?1:0), "wet streets");
  row(left, "Volumetric fog", tog(!!S.volumetrics, v => S.volumetrics = v?1:0));
  row(left, "Bloom", tog(!!S.bloom, v => S.bloom = v?1:0));
  row(left, "Motion blur", tog(!!S.motionBlur, v => S.motionBlur = v?1:0));
  row(left, "FXAA", tog(!!S.fxaa, v => S.fxaa = v?1:0));
  row(left, "Film grain", slide(0, 12, 1, S.grain*100, v => S.grain = v/100, v => v));
  row(left, "Chromatic aberration", slide(0, 10, 1, S.aberration*1000, v => S.aberration = v/1000, v => v));
  row(left, "Vignette", slide(0, 100, 5, S.vignette*100, v => S.vignette = v/100, v => v + "%"));
  row(left, "Draw distance", slide(800, 3400, 100, S.drawDist, v => S.drawDist = v, v => v + "m"));

  row(right, "Field of view", slide(60, 110, 1, S.fov, v => S.fov = v, v => v + "°"));
  row(right, "Mouse sensitivity", slide(10, 300, 5, GAME.sens*1000, v => GAME.sens = v/1000, v => v));
  row(right, "Invert Y axis", tog(GAME.invertY, v => GAME.invertY = v));
  row(right, "Toggle aim", tog(GAME.toggleAim, v => GAME.toggleAim = v));
  row(right, "Auto-reload", tog(GAME.autoReload, v => GAME.autoReload = v));
  row(right, "Damage numbers", tog(GAME.showDmg, v => GAME.showDmg = v));
  row(right, "Time scale (world clock)", slide(0, 200, 10, GAME.clockScale, v => GAME.clockScale = v, v => v + "×"));
  row(right, "Rain", slide(0, 100, 5, RENDER.env.rain*100, v => { RENDER.env.rain = v/100; }, v => v + "%"));
  row(right, "Time of day", slide(0, 1439, 5, (RENDER.env.time/60)|0,
    v => RENDER.env.time = v*60, v => pad2((v/60)|0) + ":" + pad2(v%60)));
  const bar = el("div"); bar.style.cssText = "display:flex;gap:8px;margin-top:16px;flex-wrap:wrap";
  const sv = el("button", "btn", "SAVE GAME");
  sv.onclick = () => { GAME.saveGame(); this.note("PROGRESS SAVED", "xp"); };
  const ld = el("button", "btn gh", "LOAD GAME");
  ld.onclick = () => { GAME.loadGame(); this.closeMenus(); };
  const mm = el("button", "btn gh", "MAIN MENU");
  mm.onclick = () => { GAME.toMainMenu(); };
  bar.appendChild(sv); bar.appendChild(ld); bar.appendChild(mm);
  right.appendChild(bar);
},

/* Staged title cards — used for the opening brief and act transitions. */
cards(list) {
  const box = $("cards");
  if (!box) return;
  let i = 0;
  const step = () => {
    if (i >= list.length) { box.classList.remove("on"); box.innerHTML = ""; return; }
    const c = list[i++];
    box.innerHTML = (c.t ? "<h2>" + c.t + "</h2>" : "") + "<p>" + c.s + "</p>";
    box.classList.remove("on");
    void box.offsetWidth;
    box.classList.add("on");
    if (typeof AUDIO !== "undefined" && AUDIO.ready) AUDIO.ui("tab");
    setTimeout(step, c.d * 1000);
  };
  step();
},

closeMenus() { this.show(null); GAME.capturePointer(); },

/* ======================= CHARACTER CREATOR ============================= */
ccTab: "path",
ccCfg: null,
initCC() {
  const R = rng(Date.now() & 0xffff);
  this.ccCfg = {
    name: "V", lifepath: "street", height: 1.78, build: .42,
    skin: SKIN_TONES[2].slice(), fem: false,
    face: { chin:1, brow:1, nose:1, cheek:1, lips:1, jaw:1, hair:1, hairStyle:0,
            hairCol: HAIR_COLS[0].slice(), eyeCol:[.22,.32,.42], eyeGlow:0 },
    clothes: { torso:"jacket", torsoCol:[.16,.17,.20], sleeves:"long", pads:true,
               padCol:[.10,.10,.12], bulk:.05, legs:"fabric", legCol:[.10,.10,.12],
               bootCol:[.08,.08,.09], bootHigh:true, head:"none", headCol:[.2,.2,.2] },
    cyber: { optics:true, opticCol:[0,.9,1] },
    seed: (Math.random()*1e9)|0,
    attrs: { body:3, ref:3, tech:3, int:3, cool:3 }, points: 7,
  };
  Object.assign(this.ccCfg.attrs, LIFEPATHS.street.attrs);
  this.ccDirty = true;
  this.drawCC();
},
drawCC() {
  const panel = $("ccPanel");
  panel.innerHTML = "";
  const C = this.ccCfg;
  const t = this.ccTab;
  const slider = (label, val, min_, max_, cb, fmtF) => {
    const w = el("div", "slider");
    w.appendChild(el("label", null, label));
    const i = el("input"); i.type = "range"; i.min = min_; i.max = max_; i.step = (max_-min_)/100;
    i.value = val;
    const v = el("span", "v", fmtF ? fmtF(val) : String(round(val*100)/100));
    i.oninput = () => { cb(+i.value); v.textContent = fmtF ? fmtF(+i.value) : String(round(+i.value*100)/100);
      this.ccDirty = true; };
    w.appendChild(i); w.appendChild(v);
    panel.appendChild(w);
  };
  const swatches = (label, cols, cur, cb) => {
    panel.appendChild(el("div", "hdr", label));
    const w = el("div", "swatches");
    cols.forEach(c => {
      const s = el("div", "sw" + (c === cur || (cur && c[0]===cur[0]&&c[1]===cur[1]&&c[2]===cur[2]) ? " on" : ""));
      s.style.background = rgb2css(c);
      s.onclick = () => { cb(c.slice()); this.ccDirty = true; this.drawCC(); };
      w.appendChild(s);
    });
    panel.appendChild(w);
  };
  const chips = (label, opts, cur, cb) => {
    panel.appendChild(el("div", "hdr", label));
    const w = el("div", "chips");
    opts.forEach(o => {
      const c = el("div", "chip" + (o[1] === cur ? " on" : ""), o[0]);
      c.onclick = () => { cb(o[1]); this.ccDirty = true; this.drawCC(); };
      w.appendChild(c);
    });
    panel.appendChild(w);
  };
  if (t === "path") {
    panel.appendChild(el("div", "hdr", "HANDLE"));
    const inp = el("input"); inp.type = "text"; inp.value = C.name; inp.maxLength = 14;
    inp.style.cssText = "width:100%;margin-bottom:12px";
    inp.oninput = () => { C.name = inp.value.toUpperCase().slice(0,14) || "V"; };
    panel.appendChild(inp);
    panel.appendChild(el("div", "hdr", "LIFEPATH"));
    for (const k in LIFEPATHS) {
      const L = LIFEPATHS[k];
      const d = el("div", "lifepath" + (C.lifepath === k ? " on" : ""));
      d.appendChild(el("h4", null, L.name));
      d.appendChild(el("p", null, L.blurb));
      const p = el("p"); p.style.marginTop = "6px"; p.style.color = "var(--cy)";
      p.textContent = L.perk; d.appendChild(p);
      d.onclick = () => { C.lifepath = k; Object.assign(C.attrs, L.attrs);
        C.points = 7; this.drawCC(); };
      panel.appendChild(d);
    }
  } else if (t === "body") {
    chips("FRAME", [["Masculine", false], ["Feminine", true]], C.fem, v => { C.fem = v;
      C.height = v ? 1.68 : 1.80; C.build = v ? .28 : .45; });
    slider("HEIGHT", C.height, 1.52, 2.0, v => C.height = v, v => round(v*100) + "cm");
    slider("BUILD", C.build, 0, 1, v => C.build = v);
    swatches("SKIN TONE", SKIN_TONES, C.skin, v => C.skin = v);
    chips("TORSO", [["Jacket","jacket"],["Coat","coat"],["Shirt","shirt"],["Crop","crop"]], C.clothes.torso, v => C.clothes.torso = v);
    swatches("GARMENT COLOUR", [[.16,.17,.20],[.62,.08,.32],[.06,.52,.58],[.72,.55,.05],
      [.35,.10,.62],[.10,.32,.18],[.55,.05,.12],[.85,.85,.88]], C.clothes.torsoCol, v => C.clothes.torsoCol = v);
    chips("LEGS", [["Fabric","fabric"],["Leather","leather"],["Shorts","shorts"]], C.clothes.legs, v => C.clothes.legs = v);
    chips("HEAD", [["None","none"],["Cap","cap"],["Beanie","beanie"],["Visor","visor"]], C.clothes.head, v => C.clothes.head = v);
  } else if (t === "face") {
    slider("CHIN", C.face.chin, .3, 1.8, v => C.face.chin = v);
    slider("JAW WIDTH", C.face.jaw, .2, 1.8, v => C.face.jaw = v);
    slider("BROW", C.face.brow, .2, 1.8, v => C.face.brow = v);
    slider("NOSE", C.face.nose, .3, 1.8, v => C.face.nose = v);
    slider("CHEEKBONES", C.face.cheek, .2, 1.8, v => C.face.cheek = v);
    slider("LIPS", C.face.lips, .3, 1.8, v => C.face.lips = v);
    slider("HAIR VOLUME", C.face.hair, 0, 1.4, v => C.face.hair = v);
    chips("HAIR STYLE", [["Crop",0],["Mohawk",1],["Tied back",2],["Buzz",3]],
      C.face.hairStyle, v => C.face.hairStyle = v);
    swatches("HAIR COLOUR", HAIR_COLS, C.face.hairCol, v => C.face.hairCol = v);
    swatches("EYES", [[.22,.32,.42],[.30,.22,.14],[.16,.36,.22],[.42,.42,.46],
      [1,.35,.05],[0,.9,1],[1,.1,.3],[.7,.2,1]], C.face.eyeCol, v => { C.face.eyeCol = v;
        C.face.eyeGlow = (v[0]>.6||v[1]>.6||v[2]>.6) && (v[0]+v[1]+v[2] < 2.2) ? 2.0 : 0; });
    chips("OCULAR CHROME", [["None", false],["Kiroshi", true]], !!C.cyber.optics, v => C.cyber.optics = v);
  } else if (t === "attr") {
    panel.appendChild(el("div", "hdr", "POINTS REMAINING · " + C.points));
    for (const k in ATTRS) {
      const row = el("div", "attrRow");
      row.appendChild(el("div", "an", ATTRS[k].name));
      const minus = el("button", null, "−");
      const v = el("div", "av", String(C.attrs[k]));
      const plus = el("button", null, "+");
      const base = LIFEPATHS[C.lifepath].attrs[k];
      minus.disabled = C.attrs[k] <= base;
      plus.disabled = C.points <= 0 || C.attrs[k] >= 9;
      minus.onclick = () => { C.attrs[k]--; C.points++; this.drawCC(); };
      plus.onclick = () => { C.attrs[k]++; C.points--; this.drawCC(); };
      row.appendChild(minus); row.appendChild(v); row.appendChild(plus);
      panel.appendChild(row);
      const d = el("div", "rSub", ATTRS[k].desc);
      d.style.cssText = "padding:0 0 10px 0;line-height:1.6;text-transform:none;letter-spacing:.02em";
      panel.appendChild(d);
    }
  }
},

showCredits() {
  this.show("pause");
  this.setTab("jrn");
  const body = $("pBody");
  body.innerHTML = "";
  $("pTitleTxt").textContent = "CREDITS";
  const p = this.panel(body, "CYBERPUNK 2077 :: GHOSTLINE", "1");
  const add = (h, t) => { p.appendChild(el("div", "hdr", h));
    const d = el("div", "rSub", t);
    d.style.cssText = "line-height:1.9;text-transform:none;letter-spacing:.02em;padding:8px 4px 16px";
    p.appendChild(d); };
  add("ENGINE", "Custom WebGL2 deferred renderer written for this project. Tiled deferred PBR shading, three-cascade shadow maps with rotated-Poisson PCF, hemisphere-kernel SSAO, screen-space reflections with binary refinement, ray-marched volumetric scattering, Jimenez bloom, ACES filmic tonemapping and FXAA. No external libraries, no CDN, no downloaded assets — the whole thing is one HTML file.");
  add("WORLD", "Night City reconstructed at 1:1 metric scale across 5.2 x 6.4 km from published district geography — Watson, City Center, Westbrook, Heywood, Santo Domingo, Pacifica and the surrounding Badlands — with the four canonical architectural registers (Entropism, Kitsch, Neo-Militarism, Neo-Kitsch) driving massing, palette and detail per district. Arasaka Tower stands at its published 620 m. NCART runs five lines over nineteen stations.");
  add("MATERIALS", "Every texture in the game is synthesised at load: albedo, height, roughness and metalness painted procedurally, then differentiated with a Sobel kernel into tangent-space normals and packed into GPU array textures.");
  add("CHARACTERS", "Procedurally generated humans on a 24-bone skeleton at true anatomical proportions, with analytically sculpted heads and a fully procedural animation set — no keyframe data exists in this project.");
  add("STORY", "GHOSTLINE is an original narrative. Odessa Nakamura-Vance, Wren Achebe, Ryder Cross, Ilse Bergmann, Teodora Alcaraz, Kazimir Sendo, Aurelia Vex, Kado Ishimura and Marisol Quintero are original characters written for this project, as is Sendo-Kuroi Biodynamics and every line of dialogue.");
  add("NOTE", "This is a fan reconstruction and homage. Cyberpunk 2077 and Night City are the property of CD PROJEKT RED. No assets from the original game are used, referenced at runtime, or included in this file.");
},
};
</script>
