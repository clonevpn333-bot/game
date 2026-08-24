/* =========================================================================
 * ITEM ICONS FOR THE DOM UI — block items are drawn as isometric cubes from
 * their own baked tiles, everything else as the 16x16 item sprite.
 * ========================================================================= */

var ICON_CACHE = {};
var _tileCanvasCache = {};

function tileCanvas(layer) {
  var c = _tileCanvasCache[layer];
  if (c) return c;
  var d = TEX_LAYERS[layer];
  c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  var ctx = c.getContext('2d');
  var img = ctx.createImageData(16, 16);
  if (d) img.data.set(d);
  ctx.putImageData(img, 0, 0);
  _tileCanvasCache[layer] = c;
  return c;
}
function tintedTile(layer, mul, tint) {
  var key = layer + '|' + mul.toFixed(2) + '|' + (tint || '');
  var c = _tileCanvasCache[key];
  if (c) return c;
  var d = TEX_LAYERS[layer];
  c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  var ctx = c.getContext('2d');
  var img = ctx.createImageData(16, 16);
  var tr = 1, tg = 1, tb = 1;
  if (tint) { var tc = col(tint); tr = tc[0] / 255; tg = tc[1] / 255; tb = tc[2] / 255; }
  if (d) for (var i = 0; i < 1024; i += 4) {
    img.data[i] = Math.min(255, d[i] * mul * tr);
    img.data[i + 1] = Math.min(255, d[i + 1] * mul * tg);
    img.data[i + 2] = Math.min(255, d[i + 2] * mul * tb);
    img.data[i + 3] = d[i + 3];
  }
  ctx.putImageData(img, 0, 0);
  _tileCanvasCache[key] = c;
  return c;
}

var ICON_SIZE = 64;
function itemIcon(name) {
  var c = ICON_CACHE[name];
  if (c) return c;
  var S = ICON_SIZE;
  c = document.createElement('canvas');
  c.width = S; c.height = S;
  var ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  var it = ITEMS[name];
  if (it && it.block && BID[it.block] !== undefined) drawBlockIcon(ctx, S, BID[it.block]);
  else if (ITEM_LAYER[name] !== undefined) {
    ctx.drawImage(tileCanvas(ITEM_LAYER[name]), 0, 0, 16, 16, 0, 0, S, S);
  } else {
    ctx.fillStyle = '#b040b0'; ctx.fillRect(0, 0, S, S);
  }
  ICON_CACHE[name] = c;
  return c;
}
function drawBlockIcon(ctx, S, id) {
  var b = BLOCKS[id];
  if (!b.layers) return;
  var tint = null;
  if (b.tint === 1) tint = '#79c05a';
  else if (b.tint === 2) tint = '#59ae30';
  else if (b.tint === 3) tint = '#3f76e4';

  /* flat sprites: plants, torches, rails — draw the tile square */
  if (b.render === 'cross' || b.render === 'flat' || b.render === 'crop' || b.render === 'torch' ||
    b.render === 'rail' || b.render === 'pane' || b.render === 'ladder' || b.render === 'sign' ||
    b.render === 'door' || b.render === 'chain' || b.render === 'rod' || b.render === 'endrod') {
    var lay = b.frontLayer !== undefined && b.frontLayer !== null ? b.frontLayer : b.layers[4];
    ctx.drawImage(tint ? tintedTile(lay, 1, tint) : tileCanvas(lay), 0, 0, 16, 16, 0, 0, S, S);
    return;
  }

  var topL = b.layers[2], leftL = b.layers[5], rightL = b.layers[0];
  var top = tintedTile(topL, 1.00, b.tint === 1 || b.tint === 2 ? tint : (b.tint === 3 ? tint : null));
  var left = tintedTile(leftL, 0.66, b.tint === 2 || b.tint === 3 ? tint : null);
  var right = tintedTile(rightL, 0.84, b.tint === 2 || b.tint === 3 ? tint : null);

  /* the cube is squashed a little vertically so it sits inside the slot */
  var h = 1.0, m = S * 0.02;
  var W = S - m * 2;
  function face(img, ax, ay, bx, by, ox, oy) {
    ctx.save();
    ctx.setTransform(ax * W / 16, ay * W / 16, bx * W / 16, by * W / 16, m + ox * W, m + oy * W);
    ctx.drawImage(img, 0, 0, 16, 16, 0, 0, 16, 16);
    ctx.restore();
  }
  /* half-height blocks (slabs, carpets, layers) sit lower in the icon */
  var isSlab = b.render === 'slab' || b.render === 'carpet' || b.render === 'layer' || b.render === 'plate';
  var yOff = isSlab ? 0.25 : 0;
  var hMul = isSlab ? 0.5 : 1;
  face(top, 0.5, -0.25, 0.5, 0.25, 0, 0.25 + yOff);
  face(left, 0.5, 0.25, 0, 0.5 * hMul, 0, 0.25 + yOff);
  face(right, 0.5, -0.25, 0, 0.5 * hMul, 0.5, 0.5 + yOff);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/* CSS background helper — data URLs are cached per item */
var _iconURL = {};
function itemIconURL(name) {
  var u = _iconURL[name];
  if (u) return u;
  u = itemIcon(name).toDataURL();
  _iconURL[name] = u;
  return u;
}
