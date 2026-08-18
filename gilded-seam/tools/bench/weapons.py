"""The Solvent Lance, built as real geometry rather than a sprite.

Authored in the same DSL as the creatures, then baked to an item model, so the
gun in your hand is an actual object with a receiver, a tank, a sliding pump
and a toothed muzzle - and the reload animation is that pump physically
travelling, not a redrawn picture of one.
"""

from __future__ import annotations

from core import Box, Model, Part

# The lance lies along Z so it points away from the hand when held.


def solvent_lance(pump: float = 0.0, lit: bool = False) -> Model:
    """`pump` runs 0 (forward, ready to work) to 1 (drawn fully back)."""
    parts: list[Part] = []
    slide = 3.4 * pump

    # Receiver: the heavy middle the whole thing is built around.
    parts.append(Part("receiver", "root", (0.0, 0.0, 0.0), (0, 0, 0), [
        Box((-1.5, -1.5, -3.0), (3, 3, 7), "heartwood"),
        Box((-1.7, -1.9, -1.0), (3.4, 1.0, 4.0), "chitin"),
    ]))

    # Barrel, tapering, with a toothed muzzle ring at the end.
    parts.append(Part("barrel", "receiver", (0.0, -0.2, -3.0), (0, 0, 0), [
        Box((-1.0, -1.0, -8.0), (2, 2, 8), "iron"),
        Box((-1.2, -1.2, -3.4), (2.4, 2.4, 1.4), "chitin"),
    ]))
    parts.append(Part("muzzle", "barrel", (0.0, 0.0, -8.0), (0, 0, 0), [
        Box((-1.4, -1.4, -1.6), (2.8, 2.8, 1.8), "chitin"),
    ]))
    for i in range(4):
        ang = (i * 90.0) * 0.0174533
        import math as _m
        parts.append(Part(f"tooth{i}", "muzzle",
                          (_m.sin(ang) * 1.1, _m.cos(ang) * 1.1, -1.6), (0, 0, 0),
                          [Box((-0.4, -0.4, -1.2), (0.8, 0.8, 1.2), "tooth")]))

    # Solvent tank slung under the barrel; the window shows the charge.
    parts.append(Part("tank", "receiver", (0.0, 1.6, -3.2), (0, 0, 0), [
        Box((-1.3, 0, -4.2), (2.6, 2.6, 5.0), "palewood"),
        Box((-1.45, 0.5, -4.0), (2.9, 1.4, 4.6),
            "amberglow" if lit else "amber"),
    ]))
    parts.append(Part("feed", "tank", (0.0, 0.4, -4.2), (0, 0, 0), [
        Box((-0.5, -0.5, -1.6), (1, 1, 1.8), "iron"),
    ]))

    # The pump: the part that actually moves during a reload.
    parts.append(Part("pump", "receiver", (0.0, -0.1, -2.2 + slide), (0, 0, 0), [
        Box((-1.5, -1.2, -1.6), (3, 2.4, 3.2), "heartwood"),
        Box((-1.7, -1.4, -0.6), (3.4, 2.8, 1.0), "chitin"),
    ]))

    # Grip and stock, angled back into the shoulder.
    parts.append(Part("grip", "receiver", (0.0, 1.4, 1.4), (22 * 0.0174533, 0, 0), [
        Box((-1.0, 0, -1.2), (2, 4.4, 2.4), "bark"),
    ]))
    parts.append(Part("stock", "receiver", (0.0, -0.4, 4.0), (0, 0, 0), [
        Box((-1.2, -1.0, 0), (2.4, 2.6, 4.5), "bark"),
        Box((-1.3, 0.4, 3.0), (2.6, 2.0, 2.0), "chitin"),
    ]))

    # Sight rail, so it reads as something aimed.
    parts.append(Part("sight", "receiver", (0.0, -1.9, -1.4), (0, 0, 0), [
        Box((-0.4, -1.0, -0.4), (0.8, 1.0, 0.8), "iron"),
        Box((-0.9, -0.5, 2.0), (1.8, 0.6, 0.8), "iron"),
    ]))

    return Model(f"solvent_lance_{int(pump * 10)}", parts, tex=64)
