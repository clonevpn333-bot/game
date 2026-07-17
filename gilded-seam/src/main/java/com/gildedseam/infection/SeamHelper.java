package com.gildedseam.infection;

import com.gildedseam.entity.SeamMob;
import com.gildedseam.registry.ModBlocks;
import com.gildedseam.registry.ModEffects;

import net.minecraft.core.BlockPos;
import net.minecraft.util.RandomSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.LevelAccessor;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.world.phys.AABB;
import net.minecraft.tags.BlockTags;

/**
 * Shared logic for the Seam: which blocks belong to it, how saturated an
 * area is, and what firing tier a freshly-kilned creature should emerge at.
 *
 * <p>Firing tiers are local, not global: the Seam only grows stronger where
 * it has fed. A young hairline outbreak fires Bisque (tier 0) vessels; an
 * old, gold-drowned valley fires Lustre (tier 2) horrors.</p>
 */
public final class SeamHelper {
    /** Firing tiers. */
    public static final int TIER_BISQUE = 0;
    public static final int TIER_STONEWARE = 1;
    public static final int TIER_LUSTRE = 2;

    /** How many seam mobs may share a neighbourhood before spawning throttles. */
    public static final int LOCAL_MOB_CAP = 12;

    private SeamHelper() {
    }

    public static boolean isSeamBlock(BlockState state) {
        return state.is(ModBlocks.SEAMSTONE)
                || state.is(ModBlocks.GILDED_VEIN)
                || state.is(ModBlocks.PORCELAIN_BLOOM)
                || state.is(ModBlocks.KILN_HEART)
                || state.is(ModBlocks.FIRED_SHELL);
    }

    /** True for blocks the Seam is willing to gild over. */
    public static boolean isGildable(BlockState state) {
        return state.is(BlockTags.BASE_STONE_OVERWORLD)
                || state.is(BlockTags.DIRT)
                || state.is(Blocks.SAND)
                || state.is(Blocks.GRAVEL)
                || state.is(BlockTags.SAND);
    }

    /**
     * Counts seam blocks in a flat box around {@code center}, giving up as
     * soon as {@code cap} is reached so random ticks stay cheap.
     */
    public static int countSeamNear(LevelReader level, BlockPos center, int radius, int cap) {
        int count = 0;
        for (BlockPos pos : BlockPos.betweenClosed(
                center.offset(-radius, -3, -radius), center.offset(radius, 3, radius))) {
            if (isSeamBlock(level.getBlockState(pos))) {
                count++;
                if (count >= cap) {
                    return count;
                }
            }
        }
        return count;
    }

    /**
     * Rolls the firing tier for a creature emerging at {@code pos}.
     * Saturation (nearby seam blocks) and world age both push it upward.
     */
    public static int rollTier(LevelAccessor level, BlockPos pos, RandomSource random) {
        int saturation = countSeamNear(level, pos, 6, 48);
        long days = level.dayTime() / 24000L;

        int tier = TIER_BISQUE;
        if ((saturation >= 10 || days >= 8) && random.nextFloat() < 0.45F) {
            tier = TIER_STONEWARE;
        }
        if ((saturation >= 32 || (saturation >= 16 && days >= 20)) && random.nextFloat() < 0.35F) {
            tier = TIER_LUSTRE;
        }
        return tier;
    }

    /** Applies (or refreshes) the Gilded infection on a target. */
    public static void gild(LivingEntity target, int durationTicks, int amplifier) {
        if (target instanceof SeamMob) {
            return; // the Seam does not stitch its own
        }
        target.addEffect(new MobEffectInstance(ModEffects.GILDED, durationTicks, amplifier));
    }

    /** True if this neighbourhood is already crowded with seam creatures. */
    public static boolean isMobCapped(net.minecraft.server.level.ServerLevel level, BlockPos pos) {
        AABB box = AABB.ofSize(pos.getCenter(), 48.0, 24.0, 48.0);
        return level.getEntitiesOfClass(SeamMob.class, box).size() >= LOCAL_MOB_CAP;
    }

    /** Finds a surface position near {@code origin} suitable for a spawned mob. */
    public static BlockPos findSpawnPos(net.minecraft.server.level.ServerLevel level, BlockPos origin,
            RandomSource random, int spread) {
        int x = origin.getX() + random.nextInt(spread * 2 + 1) - spread;
        int z = origin.getZ() + random.nextInt(spread * 2 + 1) - spread;
        BlockPos column = new BlockPos(x, origin.getY(), z);
        // Walk down/up a little to find standable ground near the origin's height.
        for (int dy = 3; dy >= -3; dy--) {
            BlockPos candidate = column.offset(0, dy, 0);
            if (level.getBlockState(candidate).isAir()
                    && level.getBlockState(candidate.above()).isAir()
                    && level.getBlockState(candidate.below()).isSolidRender()) {
                return candidate;
            }
        }
        return level.getHeightmapPos(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, column);
    }
}
