/* =========================================================================
 * CHARACTER MODELS — the humans.
 *
 * A player is not a mob wearing a colour: the head carries a painted face
 * with hair that wraps over the crown and down the back, the shirt has a
 * collar and a hem, and the hands and shoes are separate pieces that ride
 * the limbs so the silhouette reads as a person rather than six boxes.
 * ========================================================================= */

var PLAYER_SKINS = [
  { name: 'Steve', skin: '#b58762', hair: '#3a2519', shirt: '#00a3a3', pants: '#4a46a0',
    shoe: '#46422f', eye: '#4a6f9c' },
  { name: 'Alex', skin: '#f7c396', hair: '#c4802f', shirt: '#4fae5c', pants: '#7a6b4c',
    shoe: '#3f3226', eye: '#4f8a42' },
  { name: 'Ari', skin: '#7d5c3f', hair: '#241a12', shirt: '#bc4b40', pants: '#36426e',
    shoe: '#2e2a24', eye: '#3d2c1c' },
  { name: 'Noor', skin: '#8f5c3c', hair: '#1b1311', shirt: '#8d61b8', pants: '#303642',
    shoe: '#23211d', eye: '#4c3221' },
  { name: 'Sunny', skin: '#e8ba90', hair: '#e4c35c', shirt: '#e2a32e', pants: '#4c515a',
    shoe: '#34312c', eye: '#6f9c4a' },
  { name: 'Zuri', skin: '#61432f', hair: '#2c1d15', shirt: '#e8e8e8', pants: '#212734',
    shoe: '#181818', eye: '#31221a' }
];

/* one painted face and one painted shirt per character */
(function () {
  for (var v = 0; v < PLAYER_SKINS.length; v++) {
    (function (s, v) {
      CT('pface' + v, function (p) {
        faceBase(p, s.skin, 0.035);
        /* hair: a cap over the crown with sideburns down past the eyes */
        p.rect(0, 0, 16, 3, s.hair);
        p.rect(0, 3, 2, 3, s.hair); p.rect(14, 3, 2, 3, s.hair);
        p.rect(1, 3, 14, 1, shade(s.hair, 1.18));
        /* brows, then eyes with a real white and a pupil */
        p.rect(3, 5, 3, 1, s.hair); p.rect(10, 5, 3, 1, s.hair);
        p.rect(3, 6, 3, 2, '#f2f2f2'); p.rect(10, 6, 3, 2, '#f2f2f2');
        p.rect(4, 6, 2, 2, s.eye); p.rect(10, 6, 2, 2, s.eye);
        p.rect(4, 7, 1, 1, '#141414'); p.rect(11, 7, 1, 1, '#141414');
        /* nose, mouth and a touch of colour on the cheeks */
        p.rect(7, 8, 2, 2, shade(s.skin, 0.90));
        p.rect(6, 11, 4, 1, shade(s.skin, 0.66));
        p.rect(6, 12, 4, 1, shade(s.skin, 0.86));
        p.rect(2, 9, 2, 2, shade(s.skin, 1.07)); p.rect(12, 9, 2, 2, shade(s.skin, 1.07));
        return p;
      });
      CT('pbody' + v, function (p) {
        p.fill(s.shirt).noise(0.035);
        p.rect(0, 0, 16, 2, shade(s.shirt, 0.84));       /* collar */
        p.rect(0, 2, 16, 1, shade(s.shirt, 1.10));
        p.rect(7, 3, 2, 9, shade(s.shirt, 1.07));        /* placket down the front */
        p.rect(0, 12, 16, 2, shade(s.pants, 0.88));      /* hem over the waistband */
        p.rect(0, 14, 16, 2, s.pants);
        return p;
      });
    })(PLAYER_SKINS[v], v);
  }
})();

function playerModel(v) {
  var s = PLAYER_SKINS[v];
  var head = P('head', [0, 24, 0], [-4, 0, -4, 8, 8, 8], s.skin, { tex: 'pface' + v });
  head.kids = [
    P('hair', [0, 6.2, 0], [-4, 0, -4, 8, 1.9, 8], s.hair, { inflate: 0.30 }),
    P('hairback', [0, 1.2, 3.6], [-4, 0, 0, 8, 5.2, 0.5], s.hair, { inflate: 0.28 })
  ];
  var body = P('body', [0, 12, 0], [-4, 0, -2, 8, 12, 4], s.shirt,
    { tex: 'pbody' + v, texAll: true });
  /* short sleeves: the lower half of each arm is bare, drawn as a sleeve of
     skin sitting just proud of the shirt so it is never swallowed by it */
  var armL = P('armL', [4, 22, 0], [0, -10, -2, 4, 12, 4], s.shirt);
  armL.kids = [P('handL', [0, -10, 0], [0, 0, -2, 4, 6, 4], s.skin, { inflate: 0.10 })];
  var armR = P('armR', [-4, 22, 0], [-4, -10, -2, 4, 12, 4], s.shirt);
  armR.kids = [P('handR', [0, -10, 0], [-4, 0, -2, 4, 6, 4], s.skin, { inflate: 0.10 })];
  var legL = P('legL', [2, 12, 0], [-2, -12, -2, 4, 12, 4], s.pants);
  legL.kids = [P('shoeL', [0, -12, 0], [-2, 0, -2.3, 4, 2.2, 4.6], s.shoe, { inflate: 0.10 })];
  var legR = P('legR', [-2, 12, 0], [-2, -12, -2, 4, 12, 4], s.pants);
  legR.kids = [P('shoeR', [0, -12, 0], [-2, 0, -2.3, 4, 2.2, 4.6], s.shoe, { inflate: 0.10 })];
  return { parts: [head, body, armL, armR, legL, legR], eye: 1.62, plan: 'biped' };
}

/* One mob type per character, so a remote player is drawn by exactly the same
   path as everything else that walks around. */
(function () {
  for (var v = 0; v < PLAYER_SKINS.length; v++) {
    defMob('player' + v, {
      model: playerModel(v),
      w: 0.6, h: 1.8, hp: 20, speed: 0, player: true, spawn: null, persist: true,
      anim: function (e, pose, t) {
        animBiped(e, pose, t);
        /* crouching tips the body forward and drops the head, the way the
           real one does — it is how you tell at a glance that someone is
           sneaking up on you */
        if (e.sneaking) {
          pose.body = { rx: 0.5, ty: -2 };
          pose.head = pose.head || {};
          pose.head.ty = -2.4; pose.head.tz = 1.6;
          pose.armL = pose.armL || {}; pose.armR = pose.armR || {};
          pose.armL.rx = (pose.armL.rx || 0) + 0.4; pose.armL.ty = -1;
          pose.armR.rx = (pose.armR.rx || 0) + 0.4; pose.armR.ty = -1;
        }
      }
    });
  }
})();
