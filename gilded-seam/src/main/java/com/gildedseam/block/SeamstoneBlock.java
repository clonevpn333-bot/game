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
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;

/**
 * Porcelain-fired stone. Where the Seam has fed, the ground itself is
 * glazed white and shot through with gold. Creeps slowly into neighbouring
 * stone and soil while a kiln-heart or gilded vein keeps it warm, and
 * occasionally sprouts a porcelain bloom. Standing on it lets the thread in.
 */
public class SeamstoneBlock extends Block {
    public static final MapCodec<SeamstoneBlock> CODEC = simpleCodec(SeamstoneBlock::new);

    public SeamstoneBlock(Properties properties) {
        super(properties);
    }

    @Override
    protected MapCodec<? extends Block> codec() {
        return CODEC;
    }

    @Override
    protected void randomTick(BlockState state, ServerLevel level, BlockPos pos, RandomSource random) {
        // Seamstone only stays "hot" enough to creep while the hive is close.
        if (SeamHelper.countSeamNear(level, pos, 4, 6) < 3 && random.nextInt(3) != 0) {
            return;
        }

        // Creep into one random neighbour: ground gilds, forests die.
        Direction direction = Direction.getRandom(random);
        BlockPos targetPos = pos.relative(direction);
        if (random.nextInt(3) == 0) {
            SeamHelper.gildWorld(level, targetPos, random);
        }

        // Rarely sprout a bloom on top.
        BlockPos above = pos.above();
        if (random.nextInt(24) == 0 && level.getBlockState(above).isAir()) {
            level.setBlockAndUpdate(above, ModBlocks.PORCELAIN_BLOOM.defaultBlockState());
        }
    }

    @Override
    public void stepOn(Level level, BlockPos pos, BlockState state, Entity entity) {
        if (!level.isClientSide && entity instanceof LivingEntity living && level.random.nextInt(20) == 0) {
            SeamHelper.gild(living, 120, 0);
        }
        super.stepOn(level, pos, state, entity);
    }
}
