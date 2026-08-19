#!/usr/bin/env python3
"""Cross-check every animation against the geometry it animates.

GeckoLib does not complain about an animation track aimed at a bone that does
not exist - it looks the bone up, finds nothing, and moves on. The result is an
animation that plays and does nothing, which looks exactly like an animation
that was never wired up, which looks exactly like a renderer bug. There is no
error anywhere to tell the three apart.

So they are checked here instead. For each `<name>.animation.json` the matching
`<name>.geo.json` is read, every bone name in it collected, and every bone
named by every animation checked against that set. Anything unmatched is a
track that will silently do nothing in game.

    python3 tools/check_anims.py
"""

from __future__ import annotations

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "src", "main", "resources", "assets", "gildedseam")
GEO = os.path.normpath(os.path.join(ASSETS, "geo"))
ANIM = os.path.normpath(os.path.join(ASSETS, "animations"))


def bones_of(geo: dict) -> set[str]:
    out: set[str] = set()
    for entry in geo.get("minecraft:geometry", []):
        for bone in entry.get("bones", []):
            name = bone.get("name")
            if name:
                out.add(name)
    return out


def main() -> int:
    if not os.path.isdir(ANIM):
        print(f"no animations at {ANIM}")
        return 0
    problems = 0
    checked = 0
    for filename in sorted(os.listdir(ANIM)):
        if not filename.endswith(".animation.json"):
            continue
        stem = filename[:-len(".animation.json")]
        geo_path = os.path.join(GEO, f"{stem}.geo.json")
        if not os.path.exists(geo_path):
            print(f"{filename}: no {stem}.geo.json to animate")
            problems += 1
            continue
        with open(geo_path) as fh:
            known = bones_of(json.load(fh))
        with open(os.path.join(ANIM, filename)) as fh:
            animations = json.load(fh).get("animations", {})
        checked += 1
        for anim_name, body in animations.items():
            missing = sorted(b for b in body.get("bones", {}) if b not in known)
            if missing:
                shown = ", ".join(missing[:8])
                more = f" (+{len(missing) - 8} more)" if len(missing) > 8 else ""
                print(f"{filename}: {anim_name} drives bones that do not "
                      f"exist: {shown}{more}")
                problems += len(missing)
            if not body.get("bones"):
                print(f"{filename}: {anim_name} has no bone tracks at all")
                problems += 1
    print(f"{checked} model(s) checked, {problems} dead track(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
