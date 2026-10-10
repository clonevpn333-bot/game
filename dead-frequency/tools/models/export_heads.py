# Build every character head and export them (with eyes) into one GLB.
#   python export_heads.py /abs/out.glb [/abs/preview_prefix] [only_char]
import sys, os, importlib, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import bpy
import build_head as BH
from characters import CHARS
out = sys.argv[1]; prev = sys.argv[2] if len(sys.argv) > 2 else None; only = sys.argv[3] if len(sys.argv) > 3 else None
TEX = 1024
tmp = os.path.join(os.path.dirname(out), '_tex'); os.makedirs(tmp, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
made = []
for name, look in CHARS.items():
    if only and name != only: continue
    H0 = importlib.import_module(look['base'])
    rows = [list(r) for r in H0.ROWS]
    for (r, c, d) in look.get('edit', []):
        p = rows[r][c]; rows[r][c] = (p[0] + d[0], p[1] + d[1], p[2] + d[2])
    H = BH.Var(H0, rows)
    ob = BH.head_object(H, 'head_' + name, level=1)
    BH.unwrap(ob)
    ao = BH.bake_ao(ob, TEX)
    if look.get('hair_style') == 'hair_fringe':
        FH = importlib.import_module('hair_fringe'); look = dict(look, fringe_paths=[[BH.scale_pt(p, look.get('hair_scale', 1.0)) for p in path] for path in FH.PATHS])
    img = BH.paint_head(H, look, ao, TEX)
    tp = os.path.join(tmp, f'{name}_skin.jpg'); img.save(tp, quality=88)
    ob.data.materials.clear()
    ob.data.materials.append(BH.material(name + '_skin', tp, 0.55))
    ob.data.materials.append(BH.material(name + '_skin', tp, 0.55))
    ep = os.path.join(tmp, f'{name}_eye.jpg'); BH.eye_texture(look['iris']).save(ep, quality=90)
    em = BH.material(name + '_eye', ep, 0.1)
    eyes = BH.eyeballs(H, em)
    eyes[0].name = 'eye_' + name; bpy.data.objects.remove(eyes[1])
    eyes[0].location = (0, 0, 0)   # the game positions the eyes itself
    ob['eye_center'] = list(H.EYE_CENTER); ob['eye_radius'] = H.EYE_RADIUS
    extra = []
    if look.get('hair_style'):
        Hh = importlib.import_module(look['hair_style'])
        hob = BH.hair_object(Hh, 'hair_' + name, S=look.get('hair_scale', 1.0))
        hp = os.path.join(tmp, f'{name}_hair.png'); BH.hair_texture(look['hair']).save(hp)
        hm = BH.material(name + '_hair', hp, 0.5)
        hm.blend_method = 'CLIP' if hasattr(hm, 'blend_method') else None
        tn = [n for n in hm.node_tree.nodes if n.type == 'TEX_IMAGE'][0]
        hm.node_tree.links.new(tn.outputs['Alpha'], hm.node_tree.nodes['Principled BSDF'].inputs['Alpha'])
        hob.data.materials.append(hm); extra.append(hob)
        if getattr(Hh, 'TIE', None):
            c, r = Hh.TIE
            bpy.ops.mesh.primitive_torus_add(major_radius=r / 100, minor_radius=0.0028, location=BH.B(c), rotation=(math.radians(90), 0, 0), major_segments=16, minor_segments=6)
            tie = bpy.context.active_object; tie.name = 'tie_' + name
            tm = bpy.data.materials.new('tie'); tm.use_nodes = True; tm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.02, 0.02, 0.025, 1)
            tie.data.materials.append(tm); extra.append(tie)
    if look.get('cap'):
        import cap as CAPM
        cob = BH.cap_object(CAPM, 'cap_' + name, S=look.get('hair_scale', 1.0))
        cp = os.path.join(tmp, f'{name}_cap.jpg'); BH.cap_texture(look['cap']['color']).save(cp, quality=88)
        cm = BH.material(name + '_cap', cp, 0.85); cob.data.materials.append(cm); extra.append(cob)
    made.append((ob, eyes[0], extra))
if prev:
    cam = BH.setup_render()
    for k, (ob, e, extra) in enumerate(made):
        for o2 in bpy.data.objects:
            if o2.type == 'MESH': o2.hide_render = not (o2 is ob or o2 in extra)
        ex = []
        for sx in (1, -1):
            e2 = e.copy(); e2.data = e.data; bpy.context.collection.objects.link(e2)
            c = ob['eye_center']; e2.location = BH.B((c[0] * sx, c[1], c[2])); e2.hide_render = False; ex.append(e2)
        BH.render_views(f'{prev}_{ob.name}', cam)
        for e2 in ex: bpy.data.objects.remove(e2)
for o2 in bpy.data.objects: o2.select_set(o2.type == 'MESH' and (o2.name.split('_')[0] in ('head', 'eye', 'hair', 'tie', 'cap')))
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=False, export_morph=True, export_morph_normal=False,
                          export_image_format='JPEG', export_jpeg_quality=88, export_extras=True, export_yup=True)
print('EXPORTED', out, os.path.getsize(out))
