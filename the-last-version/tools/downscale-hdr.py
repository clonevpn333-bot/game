# Halves Radiance .hdr environment maps (RLE decode -> 2x2 box filter -> flat RGBE).
# They are only used for prefiltered (blurry) reflections, so 512x256 is enough.
import sys, struct, math, os
def read_hdr(p):
    d = open(p, 'rb').read(); i = d.index(b'\n\n') + 2; j = d.index(b'\n', i)
    dims = d[i:j].split(); h, w = int(dims[1]), int(dims[3]); pos = j + 1
    px = [[0.0] * (w * 3) for _ in range(h)]
    for y in range(h):
        if d[pos] == 2 and d[pos + 1] == 2:
            pos += 4; ch = [bytearray(w) for _ in range(4)]
            for c in range(4):
                x = 0
                while x < w:
                    n = d[pos]; pos += 1
                    if n > 128: n -= 128; ch[c][x:x + n] = bytes([d[pos]]) * n; pos += 1
                    else: ch[c][x:x + n] = d[pos:pos + n]; pos += n
                    x += n
            row = list(zip(*ch))
        else:
            row = [tuple(d[pos + k * 4:pos + k * 4 + 4]) for k in range(w)]; pos += w * 4
        r = px[y]
        for x, (R, G, B, E) in enumerate(row):
            f = math.ldexp(1.0, E - 136) if E else 0.0
            r[x * 3] = R * f; r[x * 3 + 1] = G * f; r[x * 3 + 2] = B * f
    return w, h, px
def write_hdr(p, w, h, px):
    out = bytearray(b'#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n' + f'-Y {h} +X {w}\n'.encode())
    for row in px:
        for x in range(w):
            r, g, b = row[x * 3:x * 3 + 3]; m = max(r, g, b)
            if m < 1e-32: out += b'\0\0\0\0'; continue
            mant, e = math.frexp(m); s = mant * 256.0 / m
            out += bytes([int(r * s), int(g * s), int(b * s), e + 128])
    open(p, 'wb').write(out)
for p in sys.argv[1:]:
    w, h, px = read_hdr(p); W, H = w // 2, h // 2
    half = [[0.0] * (W * 3) for _ in range(H)]
    for y in range(H):
        a, b = px[2 * y], px[2 * y + 1]
        for x in range(W):
            for c in range(3):
                half[y][x * 3 + c] = (a[6 * x + c] + a[6 * x + 3 + c] + b[6 * x + c] + b[6 * x + 3 + c]) / 4
    write_hdr(p, W, H, half); print(p, f'{w}x{h} -> {W}x{H}', os.path.getsize(p) // 1024, 'KB')
