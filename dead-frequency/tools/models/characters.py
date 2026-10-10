# Per-character looks for the hand-modeled heads. 'base' picks the head cage module;
# 'edit' lists hand moves of individual cage vertices: (row, col, (dx, dy, dz)) in cm.
# Rows: 0 cap,1 crown,2 hairline,3 forehead,4 brow,5 upper lid,6 eye mid,7 lower lid,8 under eye,9 nose tip,
# 10 nose base,11 upper lip,12 mouth top,13 mouth bottom,14 lower lip,15 chin crease,16 jaw border,17 under jaw,18 throat,19 neck,20 neck base
CHARS = {
  'marcy': {
    'base': 'head_female', 'skin': (222, 176, 150), 'hair': (112, 68, 42), 'iris': (86, 104, 72),
    'face': {'lips': (168, 104, 100), 'makeup': 0.6, 'age': 0.2},
    'edit': [], 'hair_style': 'hair_ponytail',
  },
  'jo': {
    'base': 'head_female', 'skin': (226, 192, 162), 'hair': (30, 25, 23), 'iris': (52, 36, 26),
    'face': {'lips': (178, 112, 106), 'makeup': 0.35, 'age': 0.05},
    'edit': [(5, 0, (0, 0, -0.45)), (6, 0, (0, 0, -0.45)), (7, 0, (0, 0, -0.3)), (4, 0, (0, 0, -0.3)), (4, 1, (0, 0, -0.3)), (4, 2, (0, -0.1, -0.3)),
             (5, 3, (0, -0.14, -0.05)), (7, 3, (0, 0.08, 0)), (5, 2, (0, -0.06, 0)), (5, 4, (0, 0.05, 0)), (6, 4, (0, 0.15, 0)),
             (8, 5, (0.3, 0, 0.1)), (9, 5, (0.2, 0, 0)), (9, 0, (0, 0.1, -0.45)), (9, 1, (0.1, 0, -0.2)), (16, 0, (0, 0.2, -0.2)), (16, 1, (0, 0.2, -0.2))],
    'hair_style': 'hair_bun',
  },
  'mom': {
    'base': 'head_female', 'skin': (230, 190, 166), 'hair': (134, 96, 64), 'iris': (72, 92, 112),
    'face': {'lips': (170, 104, 102), 'makeup': 0.3, 'age': 0.5},
    'edit': [(16, 4, (0.25, -0.1, 0)), (16, 5, (0.25, -0.1, 0)), (15, 4, (0.15, 0, 0)), (8, 4, (0, -0.1, 0)), (9, 0, (0, -0.1, 0.1))],
    'hair_style': 'hair_bob',
  },
  'dale': {
    'base': 'head_male', 'skin': (204, 154, 126), 'hair': (128, 124, 118), 'iris': (88, 106, 116),
    'face': {'lips': (150, 100, 92), 'stubble': 0.6, 'age': 0.75, 'brows': (110, 104, 98), 'mustache': (120, 114, 106)},
    'edit': [(15, 4, (0.3, 0, 0)), (15, 5, (0.3, 0, 0)), (16, 4, (0.35, -0.1, 0)), (16, 5, (0.35, -0.1, 0)), (9, 0, (0, -0.1, 0.25)), (9, 1, (0.15, 0, 0))],
    'hair_style': 'hair_fringe', 'hair_scale': 1.035, 'cap': {'color': (52, 66, 48)},
  },
  'deputy': {
    'base': 'head_male', 'skin': (212, 166, 134), 'hair': (48, 37, 28), 'iris': (64, 52, 42),
    'face': {'lips': (160, 104, 94), 'stubble': 0.25, 'age': 0.3},
    'edit': [(16, 0, (0, -0.1, 0.2)), (16, 1, (0.15, -0.1, 0.15))],
    'hair_style': 'hair_short', 'hair_scale': 1.035,
  },
  'walt': {
    'base': 'head_male', 'skin': (220, 178, 154), 'hair': (214, 212, 206), 'iris': (92, 112, 122),
    'face': {'lips': (162, 112, 106), 'age': 1.0, 'brows': (200, 198, 192)},
    'edit': [(9, 0, (0, -0.25, 0.2)), (14, 0, (0, 0.1, -0.15)), (16, 4, (0.1, -0.3, 0)), (16, 5, (0.1, -0.3, 0))],
    'hair_style': 'hair_fringe', 'hair_scale': 1.035, 'glasses': True,
  },
}
