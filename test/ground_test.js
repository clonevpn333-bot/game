'use strict';
/* Proves the ground-alignment fix: the bean's feet sit at world y=0 AND
   each course's walkable surface top is at world y=0, so beans stand ON
   the floor (not inside it). Uses real three.js + a mocked canvas. */
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const THREE = require('three');
const grad = { addColorStop() {} };
const ctx2d = () => new Proxy({}, { get: (o, k) =>
    (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => grad :
    k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) :
    k === 'canvas' ? { width: 64, height: 64 } : () => {} });
const documentMock = { createElement: () => ({ width: 64, height: 64, getContext: () => ctx2d(), style: {} }) };

const bean = fs.readFileSync(path.join(__dirname, '..', 'build', 'view_bean.js'), 'utf8');
const world = fs.readFileSync(path.join(__dirname, '..', 'build', 'view_world.js'), 'utf8');
const driver = `
(function(){
  const A = (c) => new BeanView({ color:'#ff5fa2', pattern:'solid', upper:c.u||'none', lower:c.l||'none', visor:'#fff' });
  const restBean = { x:0,y:0,z:0,vx:0,vy:0,vz:0,facing:0,r:17,grounded:true,diveT:0,proneT:0,
                     ragdoll:0,spin:0,falling:false,squash:1,emoteAnim:null,emoteT:0,blink:3,isPlayer:true };
  // bean feet on ground
  let worstFoot = 0;
  for (const c of [{},{u:'crown',l:'rocket'},{u:'dino',l:'tail'}]) {
    const bv = A(c); bv.update(restBean, 0.016, 0);
    const bb = new THREE.Box3().setFromObject(bv.object3d);
    if (bb.min.y < worstFoot) worstFoot = bb.min.y;
  }
  if (worstFoot < -1.5) throw new Error('bean feet clip below ground: min.y=' + worstFoot.toFixed(2));

  function surfaceTopOf(course, h, w) {
    let top = null;
    course.object3d.updateMatrixWorld(true);
    course.object3d.traverse(o => {
      if (o.isMesh && o.geometry.parameters && Math.abs(o.geometry.parameters.height - h) < 0.01 &&
          (w == null || Math.abs((o.geometry.parameters.width||0) - w) < 0.01 ||
                         Math.abs((o.geometry.parameters.radiusTop||0) - w) < 0.01)) {
        const wp = new THREE.Vector3(); o.getWorldPosition(wp);
        top = wp.y + h / 2;
      }
    });
    return top;
  }
  const race = new CourseView({ kind:'race', minX:200, maxX:1080, minY:240, maxY:2680, finishY:420, cx:640, platform:{r:0} });
  const rt = surfaceTopOf(race, 20, 880);
  if (rt == null || Math.abs(rt) > 1) throw new Error('race track top not at 0: ' + rt);

  const surv = new CourseView({ kind:'survival', minX:0, maxX:1280, minY:0, maxY:720, platform:{cx:640,cy:380,r:300} });
  const st = surfaceTopOf(surv, 40, 300);
  if (st == null || Math.abs(st) > 1) throw new Error('survival disc top not at 0: ' + st);

  // hex tile walkable top
  const hv = makeObstacleView({ kind:'hex', cx:500, cy:300, size:33, color:'#ff8fd0', state:'solid' });
  hv.update({ kind:'hex', cx:500, cy:300, size:33, color:'#ff8fd0', state:'solid' }, 0.016, 0);
  hv.object3d.updateMatrixWorld(true);
  const hb = new THREE.Box3().setFromObject(hv.object3d);
  if (Math.abs(hb.max.y) > 2) throw new Error('hex tile top not at 0: ' + hb.max.y.toFixed(2));

  console.log('bean feet min.y = ' + worstFoot.toFixed(2) + '  (>= -1.5 OK)');
  console.log('race track top  = ' + rt.toFixed(2) + '  survival disc top = ' + st.toFixed(2) + '  hex top = ' + hb.max.y.toFixed(2));
  console.log('GROUND OK — beans stand on the surface');
})();
`;
const sandbox = { THREE, console, Math, Date, document: documentMock, window: { devicePixelRatio: 1 } };
try { vm.runInNewContext(bean + '\n;\n' + world + '\n;\n' + driver, sandbox, { filename: 'ground.js' }); }
catch (e) { console.error('GROUND TEST FAILED:', e && e.message ? e.message : e); process.exit(1); }
