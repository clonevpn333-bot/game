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
        // Kiln hearts used to be scattered across every overworld biome as a
        // seed, on the reasoning that otherwise a world might never see the
        // infection start. The effect was the opposite of the intent: the
        // infection did not start, it was simply already everywhere, including
        // under the player's feet on the first morning.
        //
        // The Mother Tree at world spawn is the seed now, and the blight
        // reaches out from it - see Blightfront. Nothing is pre-sown.
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

    /**
     * Ground placement, gated on how far the blight has actually got.
     *
     * <p>This is the single change that gives the mod an opening. The vanilla
     * monster rules still apply - light level, spawnable block, the usual - and
     * then the front has to allow it as well. Outside the front the overworld
     * is untouched; inside the sanctuary ring at spawn nothing hunts you at
     * all. Everything else in the mod asks the same question of the same
     * object, so the edge the player can see is the edge the spawner uses.
     */
    private static <T extends Mob> void registerGroundPlacement(EntityType<T> type) {
        net.minecraft.world.entity.SpawnPlacements.register(type, SpawnPlacementTypes.ON_GROUND,
                Heightmap.Types.MOTION_BLOCKING_NO_LEAVES,
                (spawned, level, reason, pos, random) ->
                        com.gildedseam.infection.Blightfront.allows(level, pos)
                                && Monster.checkMonsterSpawnRules(spawned, level, reason, pos, random));
    }
}
