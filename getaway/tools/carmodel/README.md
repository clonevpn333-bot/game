# Car modelling pipeline (Blender, headless)

`pip install bpy` gives Blender's full modelling kernel as a Python module. Each car is a script:

    python3 tools/carmodel/strada.py      # -> assets/cars/strada.glb

`carlib.py` is the toolkit: crease-weighted subdivision-surface lofts (body + greenhouse, quad-dome end faces),
boolean cuts (wheel arches, panel gaps, handles, vents), surface ray-casting so every part sits on the real
body (`fz/rz/sx`), honeycomb grilles, swept tubes, lathed wheels (tyre with sidewall + tread, rim barrel + lip,
crossed spokes, hub, brake disc) + calipers, PBR materials, glTF export.

Naming contract with the game (src/vehicles/glbcars.js): `carpaint` is recoloured by the garage, `glass*` cracks,
`light_head / light_drl / light_tail / light_rev / light_ind_l / light_ind_r` follow the game's lights,
`wheel_FL/FR/RL/RR` spin + steer, `caliper_*` steer only. The single-file build embeds assets/cars/*.glb.
