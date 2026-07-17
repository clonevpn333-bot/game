package com.gildedseam.block;

import com.gildedseam.infection.SeamHelper;

import com.mojang.serialization.MapCodec;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.ScheduledTickAccess;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * A blind porcelain flower: a fluted cup of glaze on a gold stem. When
 * something warm lingers nearby it rings once, softly, and exhales a
 * glittering cloud of thread-spore that starts the Gilded infection.
 */
public class PorcelainBloomBlock extends Block {
    public static final MapCodec<PorcelainBloomBlock> CODEC = simpleCodec(PorcelainBloomBlock::new);
    private static final VoxelShape SHAPE = Block.box(4.0, 0.0, 4.0, 12.0, 11.0, 12.0);
    private static final double SPORE_RANGE = 3.5;

    public PorcelainBloomBlock(Properties properties) {
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
    protected VoxelShape getCollisionShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
        return Shapes.empty();
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
        AABB reach = new AABB(pos).inflate(SPORE_RANGE, 2.0, SPORE_RANGE);
        var victims = level.getEntitiesOfClass(LivingEntity.class, reach,
                entity -> !(entity instanceof com.gildedseam.entity.SeamMob) && !entity.isSpectator());
        if (victims.isEmpty()) {
            return;
        }

        level.playSound(null, pos, SoundEvents.AMETHYST_BLOCK_RESONATE, SoundSource.BLOCKS, 0.8F, 1.4F);
        level.sendParticles(ParticleTypes.WAX_ON,
                pos.getX() + 0.5, pos.getY() + 0.8, pos.getZ() + 0.5,
                24, 1.2, 0.6, 1.2, 0.02);
        for (LivingEntity victim : victims) {
            SeamHelper.gild(victim, 300, 0);
        }
    }

    @Override
    public void animateTick(BlockState state, Level level, BlockPos pos, RandomSource random) {
        if (random.nextInt(6) == 0) {
            level.addParticle(ParticleTypes.END_ROD,
                    pos.getX() + 0.3 + random.nextDouble() * 0.4,
                    pos.getY() + 0.6 + random.nextDouble() * 0.3,
                    pos.getZ() + 0.3 + random.nextDouble() * 0.4,
                    0.0, 0.015, 0.0);
        }
    }
}
