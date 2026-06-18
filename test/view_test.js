'use strict';
/* Headless integration test for the agent-built 3D view modules
   (build/view_bean.js + build/view_world.js). Loads REAL three.js, mocks a
   2D canvas + document so CanvasTexture paths run, then exercises BeanView,
   makeObstacleView and CourseView across every state / kind. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const THREE = require('three');

function ctx2d() {
    const grad = { addColorStop() {} };
    const p = new Proxy({}, { get: (o, k) => {
        if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
        if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
        if (k === 'measureText') return () => ({ width: 10 });
        if (k === 'canvas') return { width: 128, height: 128 };
        return () => {};
    }});
    return p;
}
const documentMock = {
    createElement: (tag) => {
        if (tag === 'canvas') return { width: 128, height: 128, getContext: () => ctx2d(), style: {} };
        return { style: {}, appendChild() {}, setAttribute() {} };
    },
};

const beanCode  = fs.readFileSync(path.join(__dirname, '..', 'build', 'view_bean.js'), 'utf8');
const worldCode = fs.readFileSync(path.join(__dirname, '..', 'build', 'view_world.js'), 'utf8');

const driver = `
(function () {
  const out = [];
  // ---- BeanView across every state + emote ----
  const looks = [
    { color:'#ff7eb6', pattern:'galaxy', upper:'crown', lower:'rocket', visor:'#ffd23f' },
    { color:'#6cc6ff', pattern:'tiger',  upper:'dino',  lower:'tail',   visor:'#23e0a0' },
    { color:'#74e0a8', pattern:'check',  upper:'pirate',lower:'tutu',   visor:'#ff8fb0' },
    { color:'#ffd95a', pattern:'tiedye', upper:'pigeon',lower:'shoes',  visor:'#3fd2ff' },
  ];
  const views = looks.map(a => new BeanView(a));
  const scene = new THREE.Scene();
  views.forEach(v => { if (!(v.object3d instanceof THREE.Object3D)) throw new Error('BeanView.object3d not Object3D'); scene.add(v.object3d); });
  const emotes = ['wave','dance','crouch','think','flex','spin','point','heart'];
  const bean = { x:0,y:0,z:0,vx:0,vy:0,vz:0,facing:0,r:17,grounded:true,diveT:0,proneT:0,
                 ragdoll:0,spin:0,falling:false,squash:1,emoteAnim:null,emoteT:0,blink:3,isPlayer:true,name:'You' };
  let t=0;
  for (let f=0; f<420; f++){
    t+=1/60;
    const ph = f % 60;
    bean.x = Math.sin(t)*50; bean.y = Math.cos(t)*50; bean.facing = t;
    bean.vx = Math.cos(t)*180; bean.vy = Math.sin(t)*180;
    bean.blink = (f%90<6)?0.05:3;
    // cycle through states
    bean.grounded=true; bean.z=0; bean.vz=0; bean.diveT=0; bean.proneT=0; bean.ragdoll=0; bean.falling=false; bean.squash=1; bean.emoteAnim=null;
    const phase = Math.floor(f/40)%11;
    if (phase===1){ bean.z=40; bean.grounded=false; bean.vz=200; bean.squash=1.2; }   // airborne up
    else if (phase===2){ bean.z=20; bean.grounded=false; bean.vz=-200; bean.squash=0.9; } // coming down
    else if (phase===3){ bean.diveT=0.3; }                                              // diving
    else if (phase===4){ bean.proneT=0.3; }                                             // prone recover
    else if (phase===5){ bean.ragdoll=0.5; bean.spin=t*8; }                              // ragdoll
    else if (phase===6){ bean.falling=true; bean.z=-30; bean.spin=t*9; }                 // falling into slime
    else if (phase>=7){ bean.emoteAnim = emotes[(phase-7)%emotes.length]; bean.emoteT=1.2; } // emotes
    views.forEach(v => v.update(bean, 1/60, t));
  }
  views[0].setAppearance(looks[1]);  // live swap
  views[0].update(bean, 1/60, t);
  views.forEach(v => v.dispose());
  out.push('BeanView: 4 looks x 420 frames across idle/run/air/dive/prone/ragdoll/fall/8 emotes OK');

  // ---- World: lights + sky + every obstacle kind + every course ----
  const scene2 = new THREE.Scene();
  const env = setupEnvironment(scene2);
  if (env && env.update) for (let f=0; f<60; f++) env.update(1/60, f/60);
  const obstacles = [
    { kind:'spinner',  cx:640, cy:1500, len:250, thick:20, angle:0, height:9999, arms:2, color:'#7b46d6', pushOut:false },
    { kind:'spinner',  cx:640, cy:380,  len:294, thick:22, angle:0, height:42,   arms:2, color:'#ffd23f', pushOut:true },
    { kind:'hammer',   cx:640, cy:1250, amp:300, phase:0, headR:32, height:120 },
    { kind:'doorwall', y:1200, x0:200, x1:1080, thick:26, segs:[{x0:200,x1:400,fake:true,broken:false},{x0:400,x1:600,fake:false,broken:false},{x0:600,x1:1080,fake:true,broken:false}] },
    { kind:'bouncepad',x:470, y:1880, r:40 },
    { kind:'hex',      cx:500, cy:300, size:33, color:'#ff8fd0', state:'solid' },
  ];
  const ovs = obstacles.map(o => { const v = makeObstacleView(o); if (!(v.object3d instanceof THREE.Object3D)) throw new Error('obstacle '+o.kind+' object3d bad'); scene2.add(v.object3d); return v; });
  for (let f=0; f<150; f++){
    obstacles[0].angle += 0.02; obstacles[1].angle += 0.03; obstacles[2].phase += 0.04;
    if (f===60){ obstacles[3].segs[0].broken=true; }
    if (f===40){ obstacles[5].state='dissolving'; } if (f===110){ obstacles[5].state='gone'; }
    ovs.forEach((v,i)=> v.update(obstacles[i], 1/60, f/60));
  }
  ovs.forEach(v => v.dispose && v.dispose());
  out.push('World: setupEnvironment + 6 obstacle kinds x 150 frames OK');

  const rounds = [
    { kind:'race',     minX:200, maxX:1080, minY:240, maxY:2680, finishY:420, cx:640, platform:{cx:0,cy:0,r:0} },
    { kind:'survival', minX:0, maxX:1280, minY:0, maxY:720, finishY:0, cx:640, platform:{cx:640,cy:380,r:300} },
    { kind:'final',    minX:300, maxX:980, minY:130, maxY:630, finishY:0, cx:640, platform:{cx:640,cy:380,r:0} },
  ];
  for (const r of rounds){
    const cv = new CourseView(r);
    if (!(cv.object3d instanceof THREE.Object3D)) throw new Error('CourseView object3d bad for '+r.kind);
    for (let f=0; f<30; f++) cv.update(r, 1/60, f/60);
    cv.dispose();
  }
  out.push('Course: race/survival/final built + updated OK');

  console.log(out.join('\\n'));
  console.log('VIEW TEST OK');
})();
`;

const sandbox = { THREE, console, Math, Date, document: documentMock, window: { devicePixelRatio: 1 } };
try {
    vm.runInNewContext(beanCode + '\n;\n' + worldCode + '\n;\n' + driver, sandbox, { filename: 'view-bundle.js' });
} catch (e) {
    console.error('VIEW TEST FAILED:', e && e.stack ? e.stack : e);
    process.exit(1);
}
