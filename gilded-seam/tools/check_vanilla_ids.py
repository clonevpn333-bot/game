#!/usr/bin/env python3
"""Checks that every vanilla id this mod's data files name actually exists.

Four times now a version bump has moved something out from under us, and three
of those times it failed *silently* - a renamed key is simply not read, and a
biome with no fog is indistinguishable from a biome whose fog you forgot. The
jar knows every id it has. So rather than trusting that `pale_moss_block` and
`ambient.warped_forest.loop` are still spelled that way, read the list out of
the jar and compare.

Usage:  python3 tools/check_vanilla_ids.py <path-to-minecraft.jar>

Exits non-zero and prints every unknown id. Ids in our own namespace are not
checked here - they are checked by the game refusing to start.
"""

from __future__ import annotations

import json
import os
import re
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "src", "main", "resources", "data")

# Which JSON key means which registry. The key is how the file says what kind
# of thing the id is; there is no other signal in the text itself.
BY_KEY = {
    "Name": "block",
    "block": "block",
    "sound": "sound",
    "biome_is": "biome",
    "biome": "biome",
    "feature": "placed_feature",
}

# Lists whose *elements* are ids of a known kind.
BY_LIST_KEY = {
    "carvers": "configured_carver",
    "values": None,          # tag files: kind depends on the tag, skip
}


def jar_registries(path):
    """Everything the jar can name, grouped by kind."""
    known = {kind: set() for kind in
             ("block", "sound", "biome", "placed_feature", "configured_feature",
              "configured_carver", "noise_settings", "dimension_type")}
    dirs = {
        "assets/minecraft/blockstates/": "block",
        "data/minecraft/worldgen/biome/": "biome",
        "data/minecraft/worldgen/placed_feature/": "placed_feature",
        "data/minecraft/worldgen/configured_feature/": "configured_feature",
        "data/minecraft/worldgen/configured_carver/": "configured_carver",
        "data/minecraft/worldgen/noise_settings/": "noise_settings",
        "data/minecraft/dimension_type/": "dimension_type",
    }
    with zipfile.ZipFile(path) as jar:
        for entry in jar.namelist():
            for prefix, kind in dirs.items():
                if entry.startswith(prefix) and entry.endswith(".json"):
                    name = entry[len(prefix):-len(".json")]
                    if "/" not in name:
                        known[kind].add("minecraft:" + name)
        try:
            sounds = json.loads(jar.read("assets/minecraft/sounds.json"))
            known["sound"] = {"minecraft:" + k for k in sounds}
        except KeyError:
            pass
    return known


def scan(node, kind_of_key=None, found=None):
    """Collects (kind, id) pairs from a JSON tree using the enclosing key."""
    if found is None:
        found = set()
    if isinstance(node, dict):
        for key, value in node.items():
            if isinstance(value, str) and key in BY_KEY:
                found.add((BY_KEY[key], value))
            elif isinstance(value, list) and key in BY_LIST_KEY:
                kind = BY_LIST_KEY[key]
                if kind:
                    for item in value:
                        if isinstance(item, str):
                            found.add((kind, item))
                else:
                    continue
            scan(value, kind_of_key, found)
    elif isinstance(node, list):
        for item in node:
            scan(item, kind_of_key, found)
    return found


# `features` is a list of lists of placed feature ids, keyed by decoration
# step - the shape is positional, so it needs its own pass.
def scan_features(node, found):
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "features" and isinstance(value, list):
                for step in value:
                    if isinstance(step, list):
                        for item in step:
                            if isinstance(item, str):
                                found.add(("placed_feature", item))
            scan_features(value, found)
    elif isinstance(node, list):
        for item in node:
            scan_features(item, found)
    return found


def main(argv):
    if len(argv) < 2:
        print(__doc__.strip())
        return 2
    jar = argv[1]
    if not os.path.exists(jar):
        print("no jar at " + jar + " - skipping id check")
        return 0
    known = jar_registries(jar)
    for kind, ids in sorted(known.items()):
        print("  jar knows %-20s %4d" % (kind, len(ids)))

    bad = []
    unverifiable = {}
    checked = 0
    for base, _dirs, files in os.walk(DATA):
        for name in files:
            if not name.endswith(".json"):
                continue
            path = os.path.join(base, name)
            try:
                with open(path) as handle:
                    tree = json.load(handle)
            except ValueError as problem:
                bad.append((path, "not JSON", str(problem)))
                continue
            found = scan(tree)
            scan_features(tree, found)
            for kind, ident in sorted(found):
                if not ident.startswith("minecraft:"):
                    continue
                if ident.startswith("minecraft:#") or ident.startswith("#"):
                    continue
                pool = known.get(kind)
                if not pool:
                    # A kind we reference that the jar gave us no list for. Skipping
                    # it quietly would make this whole check a no-op that reports
                    # success, which is the exact failure mode it exists to catch.
                    unverifiable.setdefault(kind, set()).add(ident)
                    continue
                checked += 1
                if ident not in pool:
                    bad.append((os.path.relpath(path, ROOT), kind, ident))

    print("checked %d vanilla ids across the mod's data" % checked)
    if unverifiable:
        print("\nno list in the jar for these kinds - the check cannot see them:")
        for kind, ids in sorted(unverifiable.items()):
            print("  %-18s %d ids, e.g. %s" % (kind, len(ids), sorted(ids)[0]))
        return 1
    if bad:
        print("\nunknown ids - these will fail at load, or worse, be ignored:")
        for where, kind, ident in bad:
            print("  %-58s %-18s %s" % (where, kind, ident))
        return 1
    print("every vanilla id this mod names exists in the jar")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
