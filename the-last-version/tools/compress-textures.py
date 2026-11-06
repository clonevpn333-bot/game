# Recompresses downloaded JPEG textures to keep the repository small.
# Normal maps keep higher quality to avoid banding. Run: python3 tools/compress-textures.py
import os, sys
from PIL import Image
root = os.path.join(os.path.dirname(__file__), '..', 'assets')
saved = 0
for dp, _, files in os.walk(root):
    if 'arm.jpg' in files and 'rough.jpg' in files:
        os.remove(os.path.join(dp, 'rough.jpg')); files.remove('rough.jpg')
    for f in files:
        if not f.endswith('.jpg'): continue
        p = os.path.join(dp, f)
        if os.path.exists(p + '.done'): continue
        before = os.path.getsize(p)
        im = Image.open(p); im.load()
        normal = 'nor' in f
        q = 86 if normal else 78
        if im.mode not in ('RGB', 'L'): im = im.convert('RGB')
        im.save(p, 'JPEG', quality=q, optimize=True, progressive=True, subsampling=0 if normal else 2)
        saved += before - os.path.getsize(p)
print('saved MB', round(saved / 1e6, 1))
