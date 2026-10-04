"""
MakeHuman (CC0) base mesh + morph target utilities for the Blender character pipeline.
Base mesh hm08 and targets were released CC0 by the MakeHuman team (makehumancommunity.org).
"""
import os
import collections
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'mhdata')

_base = None
_npz = None


def load_base():
    global _base
    if _base is not None:
        return _base
    V = []
    groups = collections.defaultdict(list)  # group -> list of faces (vertex index lists)
    g = None
    with open(os.path.join(DATA, 'base.obj')) as fh:
        for line in fh:
            if line.startswith('v '):
                V.append([float(x) for x in line.split()[1:4]])
            elif line.startswith('g '):
                g = line.split()[1]
            elif line.startswith('f '):
                groups[g].append([int(t.split('/')[0]) - 1 for t in line.split()[1:]])
    _base = (np.array(V, dtype=np.float64), dict(groups))
    return _base


def npz():
    global _npz
    if _npz is None:
        _npz = np.load(os.path.join(DATA, 'targets.npz'), allow_pickle=False)
    return _npz


def has_target(name):
    return f'targets/{name}.index' in npz().files


def target(name):
    d = npz()
    idx = d[f'targets/{name}.index'].astype(np.int64)
    vec = d[f'targets/{name}.vector'].astype(np.float64) * 1e-3
    return idx, vec


def apply(V, name, w):
    if abs(w) < 1e-6 or not has_target(name):
        return False
    idx, vec = target(name)
    V[idx] += vec * w
    return True


def _three(v, lo='min', mid='average', hi='max'):
    """MakeHuman three-way interpolation weights for a 0..1 slider."""
    if v < 0.5:
        return {lo: 1 - v * 2, mid: v * 2, hi: 0.0}
    return {lo: 0.0, mid: 1 - (v - 0.5) * 2, hi: (v - 0.5) * 2}


def age_weights(a):
    if a < 0.5:
        baby = max(0.0, 1 - a * 5.333)
        young = max(0.0, (a - 0.1875) * 3.2)
        child = max(0.0, min(1.0, 5.333 * a) - young)
        return {'baby': baby, 'child': child, 'young': young, 'old': 0.0}
    old = max(0.0, a * 2 - 1)
    return {'baby': 0.0, 'child': 0.0, 'young': 1 - old, 'old': old}


def age_years_to_value(years):
    if years < 11:
        return 0.1875 * max(0.0, years - 1) / 10
    if years < 25:
        return 0.1875 + (years - 11) / 14 * 0.3125
    return 0.5 + (years - 25) / 65 * 0.5


def apply_macros(V, gender, age_years, muscle, weight, proportions=0.5, race=None, height=0.5):
    race = race or {'caucasian': 1.0}
    tot = sum(race.values())
    race = {k: v / tot for k, v in race.items()}
    gW = {'female': 1 - gender, 'male': gender}
    aW = age_weights(age_years_to_value(age_years))
    mW = {k + 'muscle': v for k, v in _three(muscle).items()}
    wW = {k + 'weight': v for k, v in _three(weight).items()}
    for g, gw in gW.items():
        if gw <= 0:
            continue
        for a, aw in aW.items():
            if aw <= 0:
                continue
            for r, rw in race.items():
                apply(V, f'macrodetails/{r}-{g}-{a}', gw * aw * rw)
            for m, mw in mW.items():
                if mw <= 0:
                    continue
                for w, ww in wW.items():
                    if ww <= 0:
                        continue
                    base = gw * aw * mw * ww
                    apply(V, f'macrodetails/universal-{g}-{a}-{m}-{w}', base)
                    if height != 0.5:
                        hk = 'maxheight' if height > 0.5 else 'minheight'
                        apply(V, f'macrodetails/height/{g}-{a}-{m}-{w}-{hk}', base * abs(height - 0.5) * 2)
                    if proportions != 0.5:
                        pk = 'idealproportions' if proportions > 0.5 else 'uncommonproportions'
                        apply(V, f'macrodetails/proportions/{g}-{a}-{m}-{w}-{pk}', base * abs(proportions - 0.5) * 2)


def to_blender(V):
    """MakeHuman (x right=char left, y up, z forward) decimetres -> Blender (Z up, front -Y)."""
    out = np.empty_like(V)
    out[:, 0] = V[:, 0]
    out[:, 1] = -V[:, 2]
    out[:, 2] = V[:, 1]
    return out


def group_verts(groups, name):
    s = set()
    for f in groups.get(name, []):
        s.update(f)
    return sorted(s)


def joint_positions(Vb, groups):
    J = {}
    for g, faces in groups.items():
        if g.startswith('joint-'):
            idx = group_verts(groups, g)
            J[g[6:]] = Vb[idx].mean(axis=0)
    return J


def expression_deltas(race='caucasian'):
    """Delta arrays (full vertex count) for game facial morphs, built from MakeHuman expression units."""
    V0, _ = load_base()
    n = len(V0)

    def unit(name, w=1.0):
        d = np.zeros((n, 3))
        key = f'expression/units/{race}/{name}'
        if has_target(key):
            idx, vec = target(key)
            d[idx] += vec * w
        return d

    return {
        'blink': unit('eye-left-closure') + unit('eye-right-closure'),
        'jaw_open': unit('mouth-open', 0.55) + unit('mouth-parling', 0.3),
        'worry': unit('eyebrows-left-inner-up') + unit('eyebrows-right-inner-up') + unit('mouth-depression', 0.25),
        'frown': unit('eyebrows-left-down') + unit('eyebrows-right-down') + unit('mouth-compression', 0.4),
        'smile': unit('mouth-corner-puller', 0.8) + unit('eye-left-slit', 0.25) + unit('eye-right-slit', 0.25),
        'fear': unit('eye-left-opened-up') + unit('eye-right-opened-up') + unit('eyebrows-left-up', 0.7) + unit('eyebrows-right-up', 0.7) + unit('mouth-open', 0.25),
    }
