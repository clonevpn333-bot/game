/* ============================================================
   AMONG US 3D — SHOP, COSMICUBES & CUSTOMIZATION
   Beans buy cosmetics and Cosmicubes; Pods unlock nodes inside
   a Cosmicube's branching paths, in path order.
   ============================================================ */
(function (AU) {
'use strict';

function $(id) { return document.getElementById(id); }
function el(tag, cls, html) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
  return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function walletHTML() {
  var p = AU.Save.p;
  return '<div class="chip beans">🫘 <span class="amt">' + p.beans + '</span></div>' +
         '<div class="chip stars">⭐ <span class="amt">' + p.stars + '</span></div>' +
         '<div class="chip pods">🧩 <span class="amt">' + p.pods + '</span></div>';
}
function refreshWallets() {
  ['menu-wallet', 'shop-wallet', 'cube-wallet'].forEach(function (id) {
    var e = $(id); if (e) e.innerHTML = walletHTML();
  });
  var acc = $('menu-account');
  if (acc) {
    var p = AU.Save.p;
    acc.innerHTML = esc(p.name) + ' · Level ' + p.level +
      ' · <span style="color:#7dffb0">' + p.multiplier.toFixed(2) + 'x Beans</span>' +
      '<div style="font-size:11px;color:#7f92b8">XP ' + p.xp + '/' + AU.Save.xpForLevel(p.level) + '</div>';
  }
}

/* Preview thumbnail for a cosmetic: render a crewmate wearing just that piece. */
function thumbFor(kind, id) {
  if (kind === 'nameplate') {
    var np = AU.cosmetic('nameplate', id);
    return '<div class="thumb" style="border-radius:8px;border:2px solid #0b1226;background:' +
      (np.css === 'transparent' ? '#1a2338' : np.css) + '"></div>';
  }
  var look = { color: AU.Save.p.color, hat: 'none', visor: 'none', skin: 'none', pet: 'none' };
  look[kind] = id;
  return '<img class="thumb" src="' + AU.Models.snapshot(look, 110, 128) + '" alt="">';
}

/* ============================================================
   SHOP
   ============================================================ */
var Shop = { tab: 'featured' };

Shop.render = function (tab) {
  Shop.tab = tab || Shop.tab;
  var body = $('shop-body');
  body.innerHTML = '';
  refreshWallets();
  document.querySelectorAll('#shop-tabs .tab').forEach(function (t) {
    t.classList.toggle('active', t.dataset.shop === Shop.tab);
  });

  if (Shop.tab === 'cosmicubes') { renderCubes(body); return; }
  if (Shop.tab === 'bundles')    { renderBundles(body); return; }
  if (Shop.tab === 'featured')   { renderFeatured(body); return; }
  renderCatalog(body, Shop.tab);
};

function card(kind, item) {
  var owned = AU.Save.owns(kind, item.id);
  var locked = !!item.cube && !owned;
  var c = el('div', 'shop-card' + (owned ? ' owned' : ''));
  c.innerHTML =
    '<div class="rar rar-' + (item.rarity === 'legend' ? 'legend' : item.rarity) + '">' +
      (item.rarity || 'common').toUpperCase() + '</div>' +
    thumbFor(kind, item.id) +
    '<div class="nm">' + esc(item.name) + '</div>' +
    '<div class="desc">' + (locked ? 'From the ' + esc((AU.cubeById(item.cube) || {}).name || 'Cosmicube') :
      (owned ? 'Owned' : '')) + '</div>';
  var b = el('button', 'au-btn small ' + (owned ? 'grey' : locked ? 'purple' : 'green'),
    owned ? (AU.Save.p.equipped[kind] === item.id ? 'EQUIPPED' : 'EQUIP')
          : locked ? 'IN CUBE' : '🫘 ' + item.price);
  b.onclick = function () {
    if (owned) {
      AU.Save.equip(kind, item.id);
      AU.Audio.play('click');
      Shop.render();
    } else if (locked) {
      AU.Audio.play('click');
      AU.Menu.go('shop');
      Shop.render('cosmicubes');
    } else if (AU.Save.spend({ beans: item.price })) {
      AU.Save.give(kind, item.id);
      AU.Audio.play('buy');
      Shop.render();
    } else { AU.Audio.play('deny'); AU.Menu.flash('Not enough Beans'); }
  };
  c.appendChild(b);
  return c;
}

function renderCatalog(body, kind) {
  AU.catalog(kind).forEach(function (item) {
    if (item.id === 'none') return;
    body.appendChild(card(kind, item));
  });
}
function renderFeatured(body) {
  var picks = [
    ['hat', 'crown'], ['pet', 'ufo'], ['skin', 'captain'], ['visor', 'scanner'],
    ['hat', 'mini'], ['nameplate', 'gold'], ['pet', 'dog'], ['hat', 'halo']
  ];
  picks.forEach(function (p) { body.appendChild(card(p[0], AU.cosmetic(p[0], p[1]))); });
}
function renderBundles(body) {
  AU.BUNDLES.forEach(function (b) {
    var c = el('div', 'shop-card');
    var costStr = b.cost.stars ? '⭐ ' + b.cost.stars : '🫘 ' + b.cost.beans;
    c.innerHTML = '<div class="thumb" style="display:flex;align-items:center;justify-content:center;font-size:44px">' +
      (b.give.beans ? '🫘' : '🧩') + '</div>' +
      '<div class="nm">' + esc(b.name) + '</div><div class="desc">' + esc(b.desc) + '</div>';
    var btn = el('button', 'au-btn small yellow', costStr);
    btn.onclick = function () {
      if (AU.Save.spend(b.cost)) { AU.Save.grant(b.give); AU.Audio.play('buy'); Shop.render(); }
      else { AU.Audio.play('deny'); AU.Menu.flash('Not enough currency'); }
    };
    c.appendChild(btn);
    body.appendChild(c);
  });
  var note = el('div', 'hint');
  note.style.gridColumn = '1 / -1';
  note.textContent = 'Stars are earned by winning matches — nothing here costs real money.';
  body.appendChild(note);
}
function renderCubes(body) {
  AU.COSMICUBES.forEach(function (cube) {
    var st = AU.Save.cube(cube.id);
    var total = cube.paths.reduce(function (a, p) { return a + p.nodes.length; }, 0);
    var c = el('div', 'shop-card');
    c.style.borderColor = cube.color;
    c.innerHTML = '<div class="thumb" style="display:flex;align-items:center;justify-content:center;font-size:52px;color:' +
      cube.color + '">🧊</div>' +
      '<div class="nm">' + esc(cube.name) + '</div>' +
      '<div class="desc">' + esc(cube.desc) + '</div>' +
      '<div class="price">' + st.unlocked.length + ' / ' + total + ' unlocked</div>';
    var b = el('button', 'au-btn small ' + (st.bought ? 'blue' : 'green'),
      st.bought ? 'OPEN' : '🫘 ' + cube.price);
    b.onclick = function () {
      if (st.bought) { AU.Audio.play('click'); AU.Shop.openCube(cube.id); }
      else if (AU.Save.spend({ beans: cube.price })) {
        st.bought = true; AU.Save.save(); AU.Audio.play('buy'); Shop.render();
      } else { AU.Audio.play('deny'); AU.Menu.flash('Not enough Beans'); }
    };
    c.appendChild(b);
    body.appendChild(c);
  });
}

/* ---- cosmicube detail ---- */
Shop.openCube = function (cubeId) {
  var cube = AU.cubeById(cubeId);
  if (!cube) return;
  AU.Menu.go('cube-view');
  $('cube-title').textContent = cube.name.toUpperCase();
  refreshWallets();
  var tree = $('cube-tree');
  tree.innerHTML = '';
  var st = AU.Save.cube(cubeId);
  cube.paths.forEach(function (path) {
    var wrap = el('div', 'cube-path');
    wrap.appendChild(el('h4', null, path.name));
    var nodes = el('div', 'cube-nodes');
    var blocked = false;
    path.nodes.forEach(function (n, i) {
      var have = AU.Save.cubeHas(cubeId, n.kind, n.id);
      var isNext = !have && !blocked;
      if (!have) blocked = true;
      var item = AU.cosmetic(n.kind, n.id);
      var node = el('div', 'cube-node' + (have ? ' unlocked' : isNext ? ' next' : ''));
      node.innerHTML = thumbFor(n.kind, n.id) +
        '<div class="nm">' + esc(item.name) + '</div>' +
        '<div class="cost">' + (have ? '✓ Unlocked' : '🧩 ' + n.pods) + '</div>';
      if (isNext) {
        var b = el('button', 'au-btn small purple', 'UNLOCK');
        b.onclick = function () {
          if (AU.Save.spend({ pods: n.pods })) {
            AU.Save.cubeUnlock(cubeId, n.kind, n.id);
            AU.Audio.play('buy');
            Shop.openCube(cubeId);
          } else { AU.Audio.play('deny'); AU.Menu.flash('Not enough Pods'); }
        };
        node.appendChild(b);
      }
      nodes.appendChild(node);
      if (i < path.nodes.length - 1) {
        var arrow = el('div', null, '→');
        arrow.style.cssText = 'align-self:center;color:#4a5566;font-size:22px;';
        nodes.appendChild(arrow);
      }
    });
    wrap.appendChild(nodes);
    tree.appendChild(wrap);
  });
};

/* ============================================================
   CUSTOMIZE
   ============================================================ */
var CZ = { tab: 'color', renderer: null, scene: null, cam: null, model: null, raf: 0 };

Shop.openCustomize = function () {
  AU.Menu.go('customize');
  $('cz-name').value = AU.Save.p.name;
  $('cz-name').oninput = function () {
    AU.Save.p.name = this.value.toUpperCase().slice(0, 10);
    AU.Save.save();
  };
  initPreview();
  Shop.renderCz(CZ.tab);
};

Shop.renderCz = function (tab) {
  CZ.tab = tab || CZ.tab;
  document.querySelectorAll('#cz-tabs .tab').forEach(function (t) {
    t.classList.toggle('active', t.dataset.cz === CZ.tab);
  });
  var grid = $('cz-grid');
  grid.innerHTML = '';
  var p = AU.Save.p;

  if (CZ.tab === 'color') {
    AU.COLORS.forEach(function (c) {
      var taken = AU.Menu.colorTaken && AU.Menu.colorTaken(c.id);
      var item = el('div', 'cz-item' + (p.color === c.id ? ' sel' : '') + (taken ? ' locked' : ''));
      item.innerHTML = '<div class="swatch" style="background:#' + c.hex.toString(16).padStart(6, '0') + '"></div>' +
        '<div class="nm">' + c.name + '</div>' + (taken ? '<div class="lock">🔒</div>' : '');
      item.onclick = function () {
        if (taken) { AU.Audio.play('deny'); return; }
        p.color = c.id; AU.Save.save(); AU.Audio.play('click');
        Shop.renderCz(); updatePreview();
        if (AU.Menu.onLookChanged) AU.Menu.onLookChanged();
      };
      grid.appendChild(item);
    });
    return;
  }

  AU.catalog(CZ.tab).forEach(function (item) {
    var owned = AU.Save.owns(CZ.tab, item.id);
    var d = el('div', 'cz-item' + (p.equipped[CZ.tab] === item.id ? ' sel' : '') + (owned ? '' : ' locked'));
    d.innerHTML = thumbFor(CZ.tab, item.id) + '<div class="nm">' + esc(item.name) + '</div>' +
      (owned ? '' : '<div class="lock">🔒</div>');
    d.onclick = function () {
      if (!owned) { AU.Audio.play('deny'); AU.Menu.flash('Buy it in the Shop first'); return; }
      AU.Save.equip(CZ.tab, item.id);
      AU.Audio.play('click');
      Shop.renderCz(); updatePreview();
      if (AU.Menu.onLookChanged) AU.Menu.onLookChanged();
    };
    grid.appendChild(d);
  });
};

function initPreview() {
  var host = $('cz-canvas');
  if (!CZ.renderer) {
    CZ.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    CZ.scene = new THREE.Scene();
    CZ.cam = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
    CZ.scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.0));
    var d = new THREE.DirectionalLight(0xffffff, 0.95); d.position.set(3, 5, 4); CZ.scene.add(d);
    var d2 = new THREE.DirectionalLight(0x9fc4ff, 0.4); d2.position.set(-3, 1, -3); CZ.scene.add(d2);
    host.appendChild(CZ.renderer.domElement);
    CZ.renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
  }
  updatePreview();
  if (!CZ.raf) loopPreview();
}
function updatePreview() {
  if (!CZ.scene) return;
  if (CZ.model) CZ.scene.remove(CZ.model);
  var p = AU.Save.p;
  var look = { color: p.color, hat: p.equipped.hat, visor: p.equipped.visor,
               skin: p.equipped.skin, pet: p.equipped.pet, nameplate: p.equipped.nameplate };
  CZ.model = AU.Models.buildCrewmate(look, {});
  var pet = AU.Models.buildPet(look);
  if (pet) { pet.position.set(-1.0, 0, 0.2); CZ.model.add(pet); }
  CZ.scene.add(CZ.model);
}
function loopPreview() {
  CZ.raf = requestAnimationFrame(loopPreview);
  var host = $('cz-canvas');
  if (!host || !host.clientWidth || $('customize').style.display === 'none') return;
  var w = host.clientWidth, h = host.clientHeight;
  CZ.renderer.setSize(w, h, false);
  CZ.cam.aspect = w / h; CZ.cam.updateProjectionMatrix();
  CZ.cam.position.set(0, 1.05, 6.4);
  CZ.cam.lookAt(0, 0.85, 0);
  if (CZ.model) CZ.model.rotation.y += 0.008;
  CZ.renderer.render(CZ.scene, CZ.cam);
}

Shop.refreshWallets = refreshWallets;
Shop.thumbFor = thumbFor;
AU.Shop = Shop;

})(window.AU);
