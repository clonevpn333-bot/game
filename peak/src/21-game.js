// ============================================================ GAME
var Game = {
  renderer: null, scene: null, cam: null, world: null,
  last: 0, runT: 0, t: 0, mode: 'menu', detail: 1, built: false,
  fps: 60, frames: 0, fpsT: 0, fpsLast: 0,
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
  Game.cam = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.14, 1600);

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

  window.CRUX = {
    Game: Game, P: P, T: T, K: K, CAM: CAM, IN: IN, HUD: HUD, Net: Net, Coop: Coop,
    Survive: Survive, Remote: Remote, WI: WI, Camps: Camps, Walls: Walls, Summit: Summit,
    FX: FX, Fog: Fog, Sky: Sky, Props: Props, Wind: Wind, Menu: Menu, groundH: groundH,
    ZONES: ZONES, Z: Z, STATUS: STATUS, ST: ST,
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

Game.buildWorld = function (seed, lootSeed, detail, done) {
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
    g.add(Walls.build());
    g.add(Summit.build());
    g.add(WI.init());
    WI.spawnAll(lootSeed);
    g.add(Coop.init());
    g.add(Remote.init());
    g.add(FX.init(detail));
    g.add(Fog.build());

    Sky.build(Game.scene);
    Sky.setQuality(detail);

    g.add(P.init(P.slot, P.name));

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
    for (var i = 0; i < list.length; i++) if (shared.indexOf(list[i]) < 0) list[i].dispose();
  });
  if (Sky.mesh) {
    [Sky.mesh, Sky.cloud, Sky.sun, Sky.sun.target, Sky.hemi, Sky.fill].forEach(function (o) { Game.scene.remove(o); });
  }
  Game.world = null; Game.built = false;
  WI.list = []; WI.cases = []; WI.thrown = [];
  Coop.pitons = []; Coop.ropes = []; Coop.pings = [];
  Remote.list = []; Remote.map = {};
};

Game.begin = function (campIdx) {
  var c = Camps.list[campIdx || 0];
  P.spawnAt(c.x + 2.6, c.z + 2.2, c.y);
  P.hp = K.HP_MAX; P.extra = 0; P.summited = false;
  for (var i = 0; i < STATUS.length; i++) P.status[STATUS[i].k] = 0;
  P.inv = [null, null, null]; P.sel = 0;
  P.carrying = null; P.carriedBy = null; P.rope = null;
  Survive.recalcMax();
  P.st = P.stMax;
  P.stats = { climbed: 0, falls: 0, saves: 0 };
  Survive.deaths = 0;
  CAM.yaw = Math.atan2(-P.pos.x, -P.pos.z);
  CAM.pitch = -0.04; CAM.lift = 0; CAM.dist = CAM.want;
  CAM.smoothTgt.set(P.pos.x, P.pos.y + K.EYE, P.pos.z);
  Game.mode = 'play';
  Net.started = true;
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('over').classList.add('hidden');
  HUD.show(true);
  HUD.blocked = true;
  document.getElementById('pause').classList.remove('hidden');
  HUD.el.room.textContent = Net.solo ? '' : 'ROOM ' + Net.code;
  HUD.toast('hold ' + IN.keyLabel(IN.grabKey) + ' to grab the rock. get to the top.', '#ffd646');
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

var _figOpt = {};
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
    Walls.tick(dt, Game.t);
    Summit.tick(dt, Game.t);
    Fog.tick(dt, Game.runT, Game.cam.position);

    CAM.update(Game.cam, P, dt);

    P.fig.root.position.copy(P.pos);
    P.fig.root.rotation.y = P.yaw;
    P.fig.root.visible = !CAM.hideBody;
    P.fig.setHeld(P.inv[P.sel] ? P.inv[P.sel].k : null);
    _figOpt.t = Game.t;
    _figOpt.speed = Math.hypot(P.vel.x, P.vel.z);
    _figOpt.state = P.state;
    _figOpt.climbing = P.climbing;
    _figOpt.carrying = !!P.carrying;
    _figOpt.cold = P.status.cold > 45;
    _figOpt.tired = P.st < 18;
    _figOpt.vy = P.vel.y;
    _figOpt.hand = P.handOutT > 0.4;
    _figOpt.handL = P.handOn ? P.handL : null;
    _figOpt.handR = P.handOn ? P.handR : null;
    P.fig.pose(dt, _figOpt);
    if (P.fig.torchLight) P.fig.torchLight.visible = !!P.torchOn;

    FX.tick(dt, Game.cam.position, P.pos.y);
    Sky.update(dt, Game.t, P.pos.y, Game.cam.position);
    HUD.tick(dt, Game.cam);
  } else if (Game.built) {
    Game.menuCam(dt);
    Sky.update(dt, Game.t, 150, Game.cam.position);
  }

  IN.flush();
  Game.renderer.render(Game.scene, Game.cam);
};

var _mcT = 0;
Game.menuCam = function (dt) {
  _mcT += dt * 0.055;
  var r = 230, y = 165;
  Game.cam.position.set(Math.cos(_mcT) * r, y + Math.sin(_mcT * 0.7) * 30, Math.sin(_mcT) * r);
  Game.cam.lookAt(0, K.SUMMIT_H * 0.55, 0);
};
