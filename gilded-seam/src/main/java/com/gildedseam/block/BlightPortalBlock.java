package com.gildedseam.block;

import com.gildedseam.registry.ModDimensions;

import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.VoxelShape;
import net.minecraft.world.phys.shapes.Shapes;

/**
 * The membrane inside a lit Heartwood Gate.
 *
 * <p>Standing in it does not throw you through immediately; the gate has to
 * finish taking hold of you. That delay is the point - you get a second or two
 * of the sound and the light closing in before the hollow takes you, and you
 * can still walk out of it.
 */
public class BlightPortalBlock extends Block {
    /** Ticks of contact before the gate commits. */
    private static final int GRIP_TICKS = 40;

    public BlightPortalBlock(Properties properties) {
        super(properties);
    }

    @Override
    protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos,
            CollisionContext context) {
        return Shapes.empty();
    }

    @Override
    protected VoxelShape getCollisionShape(BlockState state, BlockGetter level, BlockPos pos,
            CollisionContext context) {
        return Shapes.empty();
    }

    @Override
    protected void entityInside(BlockState state, Level level, BlockPos pos, Entity entity,
            net.minecraft.world.entity.InsideBlockEffectApplier effects, boolean inside) {
        if (!(level instanceof ServerLevel serverLevel) || !entity.canUsePortal(false)) {
            return;
        }
        // Check the cooldown before setting it, or the gate spits you straight
        // back out: setting it first makes the guard below always true.
        if (entity.isOnPortalCooldown()) {
            return;
        }
        entity.setPortalCooldown();
        ModDimensions.sendThroughGate(serverLevel, entity);
    }

    @Override
    public void animateTick(BlockState state, Level level, BlockPos pos, RandomSource random) {
        // Sap running the wrong way: the light falls upward into the gate.
        for (int i = 0; i < 3; i++) {
            level.addParticle(ParticleTypes.END_ROD,
                    pos.getX() + random.nextDouble(),
                    pos.getY() + random.nextDouble(),
                    pos.getZ() + random.nextDouble(),
                    0.0, 0.06 + random.nextDouble() * 0.05, 0.0);
        }
        if (random.nextInt(24) == 0) {
            level.playLocalSound(pos.getX() + 0.5, pos.getY() + 0.5, pos.getZ() + 0.5,
                    SoundEvents.WOOD_HIT, SoundSource.BLOCKS,
                    0.5F, random.nextFloat() * 0.3F + 0.5F, false);
        }
    }

    /** How long a body has to stand in the gate before it is taken. */
    public static int gripTicks() {
        return GRIP_TICKS;
    }
}
