package com.gildedseam.item;

import com.gildedseam.registry.ModBlocks;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.context.UseOnContext;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;

/**
 * The Heartwood Key: what you make of the Sovereign once he is dead.
 *
 * <p>The gate is not a vanilla portal and is not lit with flint. You build a
 * standing frame of pale oak - the same wood the blight came out of - and put
 * the key to the inside of it. The frame has to be closed and empty, which
 * makes opening the way a deliberate piece of construction rather than an
 * accident, and it means the hollow can only be reached by someone who has
 * already killed the thing guarding the palace.
 */
public class HeartwoodKeyItem extends Item {
    /** Largest inner opening the key will fill. */
    private static final int MAX_SPAN = 5;

    public HeartwoodKeyItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResult useOn(UseOnContext context) {
        Level level = context.getLevel();
        BlockPos clicked = context.getClickedPos().relative(context.getClickedFace());
        if (!(level instanceof ServerLevel serverLevel)) {
            return InteractionResult.SUCCESS;
        }
        if (!level.getBlockState(clicked).isAir()) {
            return InteractionResult.PASS;
        }

        // Try both standing orientations; a frame can face either way.
        for (Direction.Axis axis : new Direction.Axis[] {Direction.Axis.X, Direction.Axis.Z}) {
            if (light(serverLevel, clicked, axis)) {
                serverLevel.playSound(null, clicked, SoundEvents.WARDEN_SONIC_BOOM,
                        SoundSource.BLOCKS, 1.2F, 0.5F);
                serverLevel.sendParticles(ParticleTypes.SCULK_SOUL,
                        clicked.getX() + 0.5, clicked.getY() + 0.5, clicked.getZ() + 0.5,
                        40, 1.2, 1.6, 1.2, 0.02);
                context.getItemInHand().hurtAndBreak(1, serverLevel,
                        (net.minecraft.server.level.ServerPlayer) null, item -> { });
                return InteractionResult.SUCCESS;
            }
        }
        return InteractionResult.PASS;
    }

    /**
     * Walks the opening out from the clicked block, checks the whole ring is
     * pale oak, and fills the inside with gate.
     */
    private static boolean light(ServerLevel level, BlockPos origin, Direction.Axis axis) {
        Direction across = axis == Direction.Axis.X ? Direction.EAST : Direction.SOUTH;
        int left = run(level, origin, across.getOpposite());
        int right = run(level, origin, across);
        int down = run(level, origin, Direction.DOWN);
        int up = run(level, origin, Direction.UP);
        int width = left + right + 1;
        int height = down + up + 1;
        if (width < 2 || height < 3 || width > MAX_SPAN || height > MAX_SPAN) {
            return false;
        }

        BlockPos corner = origin.relative(across.getOpposite(), left).below(down);
        // Every block of the ring must be frame, and every inner block empty.
        for (int w = -1; w <= width; w++) {
            for (int h = -1; h <= height; h++) {
                BlockPos at = corner.relative(across, w).above(h);
                boolean ring = (w == -1 || w == width || h == -1 || h == height);
                boolean corners = (w == -1 || w == width) && (h == -1 || h == height);
                if (corners) {
                    continue;
                }
                if (ring) {
                    if (!isFrame(level.getBlockState(at))) {
                        return false;
                    }
                } else if (!level.getBlockState(at).isAir()) {
                    return false;
                }
            }
        }

        BlockState gate = ModBlocks.BLIGHT_PORTAL.defaultBlockState();
        for (int w = 0; w < width; w++) {
            for (int h = 0; h < height; h++) {
                level.setBlock(corner.relative(across, w).above(h), gate, 2);
            }
        }
        return true;
    }

    /** Counts empty blocks from {@code from} in one direction, up to the span. */
    private static int run(ServerLevel level, BlockPos from, Direction dir) {
        int n = 0;
        while (n < MAX_SPAN && level.getBlockState(from.relative(dir, n + 1)).isAir()) {
            n++;
        }
        return n;
    }

    private static boolean isFrame(BlockState state) {
        return state.is(Blocks.PALE_OAK_LOG) || state.is(Blocks.PALE_OAK_WOOD)
                || state.is(ModBlocks.FIRED_SHELL);
    }
}
