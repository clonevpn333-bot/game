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

    public static void init() {
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
