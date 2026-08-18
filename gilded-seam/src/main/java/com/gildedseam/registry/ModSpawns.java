package com.gildedseam.registry;

import net.fabricmc.fabric.api.biome.v1.BiomeModifications;
import net.fabricmc.fabric.api.biome.v1.BiomeSelectors;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.entity.SpawnPlacementTypes;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.level.levelgen.Heightmap;

/**
 * Natural spawning. Only the Hairline-stage chaff (shardlings, vessels,
 * hounds) and the rare wandering seamstress turn up on their own at night;
 * everything heavier must be fired out of a mature kiln-heart, so outbreaks
 * escalate where the Seam is allowed to feed rather than everywhere at once.
 */
public final class ModSpawns {
    private ModSpawns() {
    }

    /** The first kiln heart in a world is not placed by a structure. */
    public static final net.minecraft.resources.ResourceKey<
            net.minecraft.world.level.levelgen.placement.PlacedFeature> BLIGHT_SCAR =
            net.minecraft.resources.ResourceKey.create(
                    net.minecraft.core.registries.Registries.PLACED_FEATURE,
                    com.gildedseam.GildedSeam.id("blight_scar"));

    public static void init() {
        // Without this the infection could only ever be found inside a
        // structure, which means most worlds would never see it start. A rare
        // surface kiln heart is the seed: it gilds the ground around itself,
        // lays veins, and begins firing creatures once it matures.
        BiomeModifications.create(com.gildedseam.GildedSeam.id("blight_seed"))
                .add(net.fabricmc.fabric.api.biome.v1.ModificationPhase.ADDITIONS,
                        BiomeSelectors.foundInOverworld(),
                        context -> context.getGenerationSettings().addFeature(
                                net.minecraft.world.level.levelgen.GenerationStep.Decoration
                                        .VEGETAL_DECORATION,
                                BLIGHT_SCAR));
        BiomeModifications.addSpawn(BiomeSelectors.foundInOverworld(), MobCategory.MONSTER,
                ModEntities.SHARDLING, 24, 2, 4);
        BiomeModifications.addSpawn(BiomeSelectors.foundInOverworld(), MobCategory.MONSTER,
                ModEntities.VESSEL, 16, 1, 2);
        BiomeModifications.addSpawn(BiomeSelectors.foundInOverworld(), MobCategory.MONSTER,
                ModEntities.PORCELAIN_HOUND, 10, 2, 3);
        BiomeModifications.addSpawn(BiomeSelectors.foundInOverworld(), MobCategory.MONSTER,
                ModEntities.SEAMSTRESS, 3, 1, 1);

        registerGroundPlacement(ModEntities.SHARDLING);
        registerGroundPlacement(ModEntities.VESSEL);
        registerGroundPlacement(ModEntities.PORCELAIN_HOUND);
        registerGroundPlacement(ModEntities.SEAMSTRESS);
        registerGroundPlacement(ModEntities.KILNBORN);
        registerGroundPlacement(ModEntities.CHIME);
        registerGroundPlacement(ModEntities.FONT_OF_GOLD);
        registerGroundPlacement(ModEntities.MANIFOLD);
        registerGroundPlacement(ModEntities.RELIQUARY_COLOSSUS);
        registerGroundPlacement(ModEntities.PORCELAIN_AUTARCH);
        BiomeModifications.addSpawn(BiomeSelectors.foundInOverworld(), MobCategory.MONSTER,
                ModEntities.HALF_SEWN, 8, 1, 2);
        for (var type : java.util.List.of(ModEntities.GILDED_COW, ModEntities.GILDED_PIG,
                ModEntities.GILDED_SHEEP, ModEntities.GILDED_CHICKEN, ModEntities.GILDED_SPIDER,
                ModEntities.GILDED_CASK, ModEntities.GILDED_WOLF,
                ModEntities.GILDED_GOAT, ModEntities.GILDED_HARE,
                ModEntities.GILDED_FOX, ModEntities.GILDED_CAT, ModEntities.GILDED_HORSE, ModEntities.GILDED_LLAMA,
                ModEntities.HALF_SEWN)) {
            registerGroundPlacement(type);
        }
        registerGroundPlacement(ModEntities.REFUGEE);
        registerGroundPlacement(ModEntities.GILT_MAD);

        // The Salt-Sworn walk the daylight roads, rare as good news.
        BiomeModifications.addSpawn(BiomeSelectors.foundInOverworld(), MobCategory.CREATURE,
                ModEntities.SALT_SWORN, 2, 1, 1);
        net.minecraft.world.entity.SpawnPlacements.register(ModEntities.SALT_SWORN,
                SpawnPlacementTypes.ON_GROUND, Heightmap.Types.MOTION_BLOCKING_NO_LEAVES,
                (type, level, reason, pos, random) ->
                        level.getBlockState(pos.below()).isSolidRender());
    }

    private static <T extends Mob> void registerGroundPlacement(EntityType<T> type) {
        net.minecraft.world.entity.SpawnPlacements.register(type, SpawnPlacementTypes.ON_GROUND,
                Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, Monster::checkMonsterSpawnRules);
    }
}
