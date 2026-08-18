package com.gildedseam.registry;

import com.gildedseam.GildedSeam;

import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;

/**
 * The Creaking hollow, and the trip through the gate into it.
 *
 * <p>The dimension itself is data-driven ({@code data/gildedseam/dimension}),
 * so the game builds it; this only handles moving a body between it and the
 * overworld, and making sure there is somewhere to stand on arrival.
 */
public final class ModDimensions {
    public static final ResourceKey<Level> CREAKING =
            ResourceKey.create(Registries.DIMENSION, GildedSeam.id("creaking"));

    private ModDimensions() {
    }

    /** Sends an entity through a lit gate, either into the hollow or back. */
    public static void sendThroughGate(ServerLevel from, Entity entity) {
        var server = from.getServer();
        if (server == null) {
            return;
        }
        boolean leaving = from.dimension().equals(CREAKING);
        ServerLevel target = server.getLevel(leaving ? Level.OVERWORLD : CREAKING);
        if (target == null || target == from) {
            return;
        }

        // The hollow has no surface to aim at, so a landing is carved rather
        // than searched for: better a small deliberate cave than dropping a
        // player inside solid heartwood.
        BlockPos landing = leaving
                ? target.getHeightmapPos(net.minecraft.world.level.levelgen.Heightmap.Types.MOTION_BLOCKING,
                        entity.blockPosition())
                : new BlockPos(entity.blockPosition().getX(), 96, entity.blockPosition().getZ());
        if (!leaving) {
            carveLanding(target, landing);
        }

        from.playSound(null, entity.blockPosition(), SoundEvents.WOOD_BREAK,
                SoundSource.BLOCKS, 1.4F, 0.4F);
        entity.teleportTo(target, landing.getX() + 0.5, landing.getY(), landing.getZ() + 0.5,
                java.util.Set.of(), entity.getYRot(), entity.getXRot(), true);
        target.playSound(null, landing, SoundEvents.WARDEN_HEARTBEAT,
                SoundSource.BLOCKS, 1.6F, 0.6F);
    }

    /** Hollows out a small chamber with a floor, so arrival is survivable. */
    private static void carveLanding(ServerLevel level, BlockPos centre) {
        BlockState floor = ModBlocks.FIRED_SHELL.defaultBlockState();
        for (int x = -3; x <= 3; x++) {
            for (int z = -3; z <= 3; z++) {
                level.setBlock(centre.offset(x, -1, z), floor, 2);
                for (int y = 0; y < 5; y++) {
                    level.setBlock(centre.offset(x, y, z), Blocks.AIR.defaultBlockState(), 2);
                }
            }
        }
    }
}
