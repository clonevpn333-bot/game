// ============================================================ GAME
var Game = {
  renderer: null, scene: null, cam: null, world: null,
  last: 0, runT: 0, t: 0, mode: 'menu', detail: 1, built: false,
  acc: 0, fps: 60, frames: 0, fpsT: 0, fpsLast: 0,
};

Game.init = function () {
  var canvas = document.getElementById('view');
  Game.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  Game.renderer.setSize(window.innerWidth, window.innerHeight, false);
  Game.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  Game.renderer.outputEncoding = THREE.sRGBEncoding;
  Game.renderer.shadowMap.enabled = true;
  Game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  Game.renderer.setClearColor(0x10131a);

  Game.scene = new THREE.Scene();
  Game.cam = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.14, 1600);

  initMaterials();
  IN.init(canvas);
  HUD.init();
  Menu.init();

  IN.onLockChange = function (on) {
    if (Game.mode !== 'play') return;
    HUD.blocked = !on;
    document.getElementById('pause').classList.toggle('hidden', on);
  };

  window.addEventListener('resize', Game.resize);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && Game.mode === 'play') IN.unlock();
  });

  // a handle for tinkering from the console (and for the test harness)
  window.CRUX = {
    Game: Game, P: P, T: T, K: K, CAM: CAM, IN: IN, HUD: HUD, Net: Net, Coop: Coop,
    Survive: Survive, Remote: Remote, WI: WI, Camps: Camps, Summit: Summit,
    FX: FX, Sky: Sky, Props: Props, Wind: Wind, Menu: Menu, groundH: groundH,
  };

  document.getElementById('boot').classList.add('hidden');
  requestAnimationFrame(Game.loop);
};

Game.resize = function () {
  var w = window.innerWidth, h = window.innerHeight;
  Game.renderer.setSize(w, h, false);
  Game.cam.aspect = w / h;
  Game.cam.updateProjectionMatrix();
};

// ---------------------------------------------------------------- world
Game.buildWorld = function (seed, detail, done) {
  Game.detail = detail;
  Game.renderer.setPixelRatio(detail ? Math.min(window.devicePixelRatio || 1, 2) : 1);
  document.getElementById('boot').classList.remove('hidden');

  setTimeout(function () {
    if (Game.world) Game.teardown();
    var g = Game.world = new THREE.Group();

    T.build(seed);
    Wind.init(seed);
    g.add(T.buildMesh());
    g.add(Props.build(seed, detail));
    g.add(Camps.build());
    g.add(Summit.build());
    g.add(WI.init());
    WI.spawnAll(seed);
    g.add(Coop.init());
    g.add(Remote.init());
    g.add(FX.init(detail));

    Sky.build(Game.scene);
    Sky.setQuality(detail);

    var figRoot = P.init(P.slot, P.name);
    g.add(figRoot);

    Game.scene.add(g);
    Game.built = true;
    document.getElementById('boot').classList.add('hidden');
    if (done) done();
  }, 60);
};

Game.teardown = function () {
  Game.scene.remove(Game.world);
  var shared = [];
  for (var k in MAT) shared.push(MAT[k]);
  Game.world.traverse(function (o) {
    if (o.geometry) o.geometry.dispose();
    if (!o.material) return;
    var list = Array.isArray(o.material) ? o.material : [o.material];
    for (var i = 0; i < list.length; i++) {
      // the shared palette outlives the world it built
      if (shared.indexOf(list[i]) < 0) list[i].dispose();
    }
  });
  if (Sky.mesh) { Game.scene.remove(Sky.mesh); Game.scene.remove(Sky.cloud); Game.scene.remove(Sky.sun); Game.scene.remove(Sky.sun.target); Game.scene.remove(Sky.hemi); Game.scene.remove(Sky.fill); }
  Game.world = null; Game.built = false;
  WI.list = []; WI.thrown = [];
  Coop.pitons = []; Coop.anchors = []; Coop.pings = [];
  Remote.list = []; Remote.map = {};
};

Game.begin = function (campIdx) {
  var c = Camps.list[campIdx || 0];
  P.spawnAt(c.x + rngRange(Math.random, -2, 2), c.y + 1.2, c.z + 2.6);
  P.hp = K.HP_MAX; P.st = K.ST_MAX; P.hunger = K.HU_MAX; P.temp = K.TP_MAX;
  P.inv = [{ k: 'bar', n: 1 }, { k: 'rope', n: 1 }, null, null];
  P.sel = 0; P.summited = false; P.inj.leg = 0; P.inj.arm = 0;
  P.stats = { start: now(), climbed: 0, falls: 0, revives: 0 };
  Game.runT = Game.runT || 0;
  CAM.yaw = Math.atan2(-c.x, -c.z);
  CAM.pitch = -0.05;
  CAM.smoothTgt.set(P.pos.x, P.pos.y + K.EYE, P.pos.z);
  Game.mode = 'play';
  Net.started = true;
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('over').classList.add('hidden');
  HUD.show(true);
  HUD.blocked = true;
  document.getElementById('pause').classList.remove('hidden');
  HUD.el.room.textContent = Net.solo ? '' : 'ROOM ' + Net.code;
  HUD.toast('reach the summit. look after each other.', '#ffd646');
};

Game.quit = function () {
  Game.mode = 'menu';
  Net.reset();
  Remote.clear();
  HUD.show(false);
  IN.unlock();
  document.getElementById('pause').classList.add('hidden');
  document.getElementById('over').classList.add('hidden');
  document.getElementById('menu').classList.remove('hidden');
  Menu.reset();
};

// ---------------------------------------------------------------- loop
var _bT = 0, _figOpt = {};
Game.loop = function (ts) {
  requestAnimationFrame(Game.loop);
  var dt = Math.min(0.05, (ts - Game.last) / 1000);
  if (!(dt > 0)) dt = 0.016;
  Game.last = ts;
  Game.t += dt;

  Game.frames++;
  Game.fpsT += Math.min(0.5, (ts - Game.fpsLast) / 1000);
  Game.fpsLast = ts;
  if (Game.fpsT > 0.5) { Game.fps = Game.frames / Game.fpsT; Game.frames = 0; Game.fpsT = 0; }

  Wind.tick(dt);

  if (Game.mode === 'play' && Game.built) {
    if (!HUD.blocked) {
      Game.runT += dt;
      CAM.applyMouse(IN.mx, IN.my);
      if (IN.view()) CAM.first = !CAM.first;
      P.update(dt);
      Coop.tick(dt, Game.t);
      Survive.tick(dt);
    }
    Remote.update(dt, Game.t);
    Net.tick(dt);
    WI.tick(dt, Game.t);
    Camps.tick(dt, Game.t);
    Summit.tick(dt, Game.t);

    CAM.update(Game.cam, P, dt);

    // pose the local climber
    P.fig.root.position.copy(P.pos);
    P.fig.root.rotation.y = P.yaw;
    P.fig.root.visible = !CAM.hideBody;
    P.fig.setHeld(P.inv[P.sel] ? P.inv[P.sel].k : null);
    P.fig.setParka(P.parka);
    _figOpt.t = Game.t;
    _figOpt.speed = Math.hypot(P.vel.x, P.vel.z);
    _figOpt.state = P.state;
    _figOpt.climbing = P.climbing;
    _figOpt.brace = P.brace;
    _figOpt.carrying = !!P.carrying;
    _figOpt.cold = P.temp < 45;
    _figOpt.tired = P.st < 22;
    _figOpt.vy = P.vel.y;
    P.fig.pose(dt, _figOpt);
    if (P.fig.torchLight) P.fig.torchLight.visible = !!P.torchOn;

    // breath in the cold, or when the lungs are gone
    _bT += dt;
    if (_bT > 0.55 && (P.temp < 62 || P.st < 26)) {
      _bT = 0;
      var f = CAM.flatForward(_tmpA);
      FX.breath(P.pos.x + f.x * 0.3, P.pos.y + 1.5, P.pos.z + f.z * 0.3, f.x, f.z);
    }

    FX.tick(dt, Game.cam.position, P.pos.y);
    Sky.update(dt, Game.t, P.pos.y, Game.cam.position);
    HUD.tick(dt, Game.cam);
  } else if (Game.built) {
    // slow drift around the peak behind the menus
    Game.menuCam(dt);
    Sky.update(dt, Game.t, 150, Game.cam.position);
  }

  IN.flush();
  Game.renderer.render(Game.scene, Game.cam);
};

var _mcT = 0;
Game.menuCam = function (dt) {
  _mcT += dt * 0.055;
  var r = 210, y = 170;
  Game.cam.position.set(Math.cos(_mcT) * r, y + Math.sin(_mcT * 0.7) * 30, Math.sin(_mcT) * r);
  Game.cam.lookAt(0, 150, 0);
};
