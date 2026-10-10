# Character head models

The heads are hand-modeled: every cage vertex in `head_female.py` / `head_male.py` and every hair, ponytail,
bun and cap point in `hair_*.py` / `cap.py` was placed by hand. `characters.py` holds each character's
hand edits (individual vertex moves), skin / hair / eye colors and hair style.

`build_head.py` does the modeling-tool work in Blender (mirror, eye and mouth openings, lid and mouth-bag
extrusions, subdivision, UV unwrap, AO bake, painting at landmark vertices, blink / jawOpen shape keys).

Rebuild (needs the `bpy` and `pillow` Python packages):

    python export_heads.py /abs/path/heads.glb [/abs/preview_prefix]
    node -e "..."   # base64 the glb into ../../assets/heads.js (window.ASSET_HEADS)

Clay preview of a cage: `python build_head.py render head_female /abs/prefix`
