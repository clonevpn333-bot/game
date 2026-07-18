# Porting & review notes

This mod targets **Minecraft 26.2 / Fabric Loader 0.19.3 / Fabric API
0.152.x / Loom 1.15 / Gradle 9.4 / Java 25** and is written directly against
official (Mojang) names, which are the shipped names since the game became
unobfuscated in 26.1.

It was authored in an offline environment (no access to the 26.2 jar), so
while every file parses clean and the API usage follows the current
documented patterns, a handful of call sites are the most likely places to
need a one-line touch-up if Mojang or Fabric moved something between 1.21.x
and 26.2. Checklist for the first `./gradlew build`:

| Area | Call site | Note |
| --- | --- | --- |
| Creative tabs | `ModTabs` | Fabric renamed `ItemGroupEvents` → `CreativeModeTabEvents` in 26.1. If the package differs, it lives under `net.fabricmc.fabric.api.itemgroup.v1` in older API; check the Fabric API 26.1 porting guide rename table. |
| Model layer registration | `GildedSeamClient` | `EntityModelLayerRegistry.registerModelLayer` — the functional interface was renamed from Yarn's `TexturedModelData` terms; method references to `Model::createBodyLayer` should satisfy either shape. |
| Tool material | `ModItems.PORCELAIN_MATERIAL` | `ToolMaterial` record constructor order: `(incorrectBlocksForDrops, durability, speed, attackDamageBonus, enchantmentValue, repairItems)` as of 1.21.5+. |
| Sword properties | `ModItems.KINTSUGI_BLADE` | `Item.Properties.sword(material, damage, speed)` (SwordItem class was removed in 1.21.5). |
| Spawn placements | `ModSpawns` | Calls vanilla `SpawnPlacements.register(...)` directly. If it is no longer public in 26.2, switch to Fabric API's spawn-placement hook. |
| Entity positioning | `KilnHeartBlock`, `SeamConversion`, entity goals | Uses `Entity.snapTo(x, y, z, yRot, xRot)` (renamed from `moveTo` in 1.21.5). |
| Entity save data | `SeamMob` etc. | Uses the 1.21.6+ `ValueInput`/`ValueOutput` API (`putInt`/`getIntOr`). |
| Damage entry point | `SeamMob.hurtServer`, effect ticks | Uses `LivingEntity.hurtServer(ServerLevel, DamageSource, float)` (1.21.2+ split). |
| Block neighbor updates | `GildedVeinBlock`, `PorcelainBloomBlock` | Uses the 1.21.2+ `updateShape(state, level, scheduledTick, pos, dir, neighborPos, neighborState, random)` signature. |
| Keyframe animations | model classes | Uses the 1.21.6+ baked pattern: `AnimationDefinition.bake(root)` → `KeyframeAnimation.apply(animState, ageInTicks)`. |
| Advancement background | `data/gildedseam/advancement/root.json` | Uses the sprite-id form (`minecraft:gui/advancements/backgrounds/stone`). If the toast shows a missing texture, switch to the full texture path form. |
| Loom config | `build.gradle` | `splitEnvironmentSourceSets()` + `loom.mods` retained from Loom 1.x; if Loom 1.15 renamed either, the error message at configuration time will say so. |
| Portal ambience | `KilnHeartBlock.tryBreachNether` | Uses `SoundEvents.PORTAL_TRIGGER` and dimension lookup via `ServerLevel.getServer().getLevel(Level.NETHER)`; both stable since 1.16, but verify the Nether seed position clamp (`findNetherSeedPos`) against 26.2's dimension height constants. |
| Advancement award | `RiveningCascade` finale | Awards `gildedseam:the_rivening` via `player.getAdvancements().award(holder, "done")` after a `ServerAdvancementManager.get(id)` lookup — method names for the manager lookup are the likeliest rename risk. |
| Dialogue delivery | `RefugeeEntity`, `GiltMadEntity` | Uses `Player.displayClientMessage(Component, true)` for the action-bar speech lines (stable), and `ItemTags.SWORDS` for the convince-check. |

Everything else — registries with `ResourceKey` + `setId`, entity types built
via `EntityType.Builder...build(key)`, `FabricDefaultAttributeRegistry`,
`EntityRendererRegistry`, render states with `extractRenderState`/`copyFrom`,
`MobRenderer` generics, goal AI, boss events, `BiomeModifications` — follows
the current Fabric documentation for the unobfuscated era.

## Regenerating assets

Model geometry and entity textures come from the same declarative source
(`tools/modelgen/models.py`). If you edit geometry there:

1. `python3 tools/modelgen/gen.py`
2. Copy the regenerated method body from `tools/modelgen/out/<name>_layer.java.txt`
   into the matching model class `createBodyLayer()`.

Textures land directly in `src/main/resources`.
