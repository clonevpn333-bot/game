# The Amberblight

**A resin-infection mod for Minecraft Java Edition 26.2 (Fabric).**

## ⬇️ Download the mod

### **[→ DOWNLOAD THE JAR ←](https://github.com/clonevpn333-bot/game/releases/download/latest-blight/gilded-seam-1.0.0.jar)**

Put it in `.minecraft/mods` alongside [Fabric API](https://modrinth.com/mod/fabric-api) for **26.2**.

That link always serves the newest build. It is republished automatically every
time code lands on the mod branch, so it is never stale. If you would rather
browse: **[all releases](https://github.com/clonevpn333-bot/game/releases)** →
the one tagged `latest-blight`.

Build status and history: **[Actions](https://github.com/clonevpn333-bot/game/actions)**.
A green run means the jar at the link above built from that commit.

---

## What it is

Something in the pale garden started tapping the world for sap. It finds a
body, opens it along the grain, and fills what is left with resin. The animals
do not stop being animals — that is the horror of it. A cow keeps its hide, its
horns and its four legs, and grows a pair of hands.

| | |
| --- | --- |
| **13 host species** | cow, pig, sheep, chicken, spider, creeper, wolf, goat, hare, fox, cat, horse, llama — each keeping its vanilla silhouette and colouring, each with three mutation stages. Mooshroom, cave spider, ocelot, donkey, mule, camel and trader llama convert into the nearest form. |
| **Faces** | every infected host grows one: bulging eyeballs in sinew sockets, a chitin brow, spare eyes crowded on the skull, an unhinged jaw with two rows of teeth. Pupils are drawn to the species — bar for ungulates, slit for hunters, simple eyes for spiders, lit voids for creepers. |
| **Call of the Horde** | hit one and everything of the blight within 28 blocks turns on you. Every seam death raises the minimum firing tier of the next ones, so attrition makes the enemy worse. |
| **The Unmaking** | around a matured kiln heart the world stops being replaced and starts being subtracted — blocks light up, hang, and blow away into nothing. |
| **The Creaking hollow** | a real dimension, reached by building a pale oak gate and lighting it with a key made from the Sovereign's crown. |
| **The Mother Tree** | a 49×72×49 pale oak grown over the World Core, where the infection came from. |

Everything about the mod itself lives in **[`gilded-seam/README.md`](gilded-seam/README.md)**,
including the AmberBench modelling toolkit and the 26.2 porting notes.

## Building it yourself

```bash
cd gilded-seam
./gradlew build     # jar lands in build/libs/
```

Requires Java 25. The CI workflow in `.github/workflows/build-mod.yml` does
exactly this on every push and publishes the result.
