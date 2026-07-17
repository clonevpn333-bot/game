package com.gildedseam.block;

import com.gildedseam.infection.SeamHelper;
import com.gildedseam.registry.ModBlocks;

import com.mojang.serialization.MapCodec;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.ScheduledTickAccess;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * A mat of golden thread lying over the ground like spilled solder — the
 * Seam's runners. Veins crawl outward from kiln-hearts, gild the block
 * beneath them into seamstone, and infect anything that walks the thread.
 */
public class GildedVeinBlock extends Block {
    public static final MapCodec<GildedVeinBlock> CODEC = simpleCodec(GildedVeinBlock::new);
    private static final VoxelShape SHAPE = Block.box(0.0, 0.0, 0.0, 16.0, 1.0, 16.0);

    public GildedVeinBlock(Properties properties) {
        super(properties);
    }

    @Override
    protected MapCodec<? extends Block> codec() {
        return CODEC;
    }

    @Override
    protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
        return SHAPE;
    }

    @Override
    protected boolean canSurvive(BlockState state, LevelReader level, BlockPos pos) {
        BlockPos below = pos.below();
        return level.getBlockState(below).isFaceSturdy(level, below, Direction.UP);
    }

    @Override
    protected BlockState updateShape(BlockState state, LevelReader level, ScheduledTickAccess scheduledTick,
            BlockPos pos, Direction direction, BlockPos neighborPos, BlockState neighborState, RandomSource random) {
        if (direction == Direction.DOWN && !this.canSurvive(state, level, pos)) {
            return Blocks.AIR.defaultBlockState();
        }
        return super.updateShape(state, level, scheduledTick, pos, direction, neighborPos, neighborState, random);
    }

    @Override
    protected void randomTick(BlockState state, ServerLevel level, BlockPos pos, RandomSource random) {
        // Gild the block we lie on.
        BlockPos below = pos.below();
        if (SeamHelper.isGildable(level.getBlockState(below)) && random.nextInt(4) == 0) {
            level.setBlockAndUpdate(below, ModBlocks.SEAMSTONE.defaultBlockState());
            return;
        }

        // Crawl outward: pick a nearby column and drape a new runner on it.
        int dx = random.nextInt(3) - 1;
        int dz = random.nextInt(3) - 1;
        if (dx == 0 && dz == 0) {
            return;
        }
        for (int dy = 1; dy >= -1; dy--) {
            BlockPos targetPos = pos.offset(dx, dy, dz);
            if (level.getBlockState(targetPos).isAir()
                    && this.canSurvive(state, level, targetPos)) {
                level.setBlockAndUpdate(targetPos, ModBlocks.GILDED_VEIN.defaultBlockState());
                return;
            }
        }
    }

    @Override
    public void stepOn(Level level, BlockPos pos, BlockState state, Entity entity) {
        if (!level.isClientSide && entity instanceof LivingEntity living && level.random.nextInt(10) == 0) {
            SeamHelper.gild(living, 200, 0);
        }
        super.stepOn(level, pos, state, entity);
    }
}
