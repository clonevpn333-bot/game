# Downscales every JPEG texture under assets/ to at most MAX px (keeps filenames).
# The owner wants small builds; 512 px photo detail is plenty at game distances.
import os, sys
from PIL import Image
MAX = int(sys.argv[1]) if len(sys.argv) > 1 else 512
root = os.path.join(os.path.dirname(__file__), '..', 'assets')
before = after = 0
for dp, _, files in os.walk(root):
    for f in files:
        if not f.lower().endswith(('.jpg', '.jpeg')): continue
        p = os.path.join(dp, f); before += os.path.getsize(p)
        im = Image.open(p); im.load()
        if max(im.size) > MAX:
            im = im.resize((MAX * im.size[0] // max(im.size), MAX * im.size[1] // max(im.size)), Image.LANCZOS)
        normal = 'nor' in f
        if im.mode not in ('RGB', 'L'): im = im.convert('RGB')
        im.save(p, 'JPEG', quality=88 if normal else 80, optimize=True, progressive=True, subsampling=0 if normal else 2)
        after += os.path.getsize(p)
print(f'{before/1e6:.1f} MB -> {after/1e6:.1f} MB')
