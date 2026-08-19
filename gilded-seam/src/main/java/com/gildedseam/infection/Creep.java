package com.gildedseam.infection;

import net.minecraft.core.BlockPos;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.levelgen.Heightmap;

import com.gildedseam.registry.ModBlocks;

/**
 * The blight taking ground, on its own, where you can see it happen.
 *
 * <p>Gilded vein already spreads - it crawls a block at a time on
 * {@code randomTick}. The trouble is what that means in practice: a random tick
 * reaches a given block about once every fifty seconds, so a single runner takes
 * most of an hour to cross a garden, and there were no runners on the ground to
 * begin with. The infection was technically contagious and observably inert.
 *
 * <p>So the front does the work itself. Every second, for each player standing
 * inside it, a handful of surface blocks near them are considered; ground that
 * is already sick spreads to its neighbours, and clean ground deep inside the
 * front starts turning on its own. It is deliberately anchored to players
 * rather than run over every loaded chunk - the world does not need to rot
 * where nobody is looking, and rotting only where someone is means the player
 * always sees it happening rather than only ever finding it already done.
 *
 * <p>The rate scales on {@link Blightfront#intensity}: at the edge almost
 * nothing, near the tree relentless. That gradient is the whole reason the
 * front is a circle rather than a switch.
 */
public final class Creep {

    private Creep() {
    }

    /** How often a player's surroundings are considered. */
    private static final int PERIOD = 20;

    /** Blocks looked at per player per turn, before intensity scales it down. */
    private static final int SAMPLES = 40;

    /** How far around the player the blight will take ground. */
    private static final int REACH = 24;

    public static void tickAll(MinecraftServer server) {
        if (server.getTickCount() % PERIOD != 0) {
            return;
        }
        ServerLevel level = server.getLevel(Level.OVERWORLD);
        if (level == null || !level.getGameRules()
                .getBoolean(net.minecraft.world.level.GameRules.RULE_DO_MOB_SPAWNING)) {
            return;
        }
        for (ServerPlayer player : level.players()) {
            if (player.isSpectator() || player.isCreative()) {
                continue;
            }
            creepAround(level, player.blockPosition());
        }
    }

    private static void creepAround(ServerLevel level, BlockPos centre) {
        float intensity = Blightfront.intensity(level, centre);
        if (intensity <= 0.0F || Blightfront.isSanctuary(level, centre)) {
            return;
        }
        RandomSource random = level.getRandom();
        int budget = Math.max(1, Math.round(SAMPLES * intensity));
        for (int i = 0; i < budget; i++) {
            int dx = random.nextInt(REACH * 2 + 1) - REACH;
            int dz = random.nextInt(REACH * 2 + 1) - REACH;
            BlockPos column = centre.offset(dx, 0, dz);
            if (!Blightfront.allows(level, column)) {
                continue;
            }
            BlockPos at = level.getHeightmapPos(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, column)
                    .below();
            if (!level.isLoaded(at)) {
                continue;
            }
            if (!SeamHelper.isGildable(level.getBlockState(at))) {
                continue;
            }
            // Ground touching sick ground goes first; clean ground only goes
            // deep inside the front, so the edge advances as a ragged line
            // rather than as scattered spots in an untouched field.
            boolean touching = SeamHelper.countSeamNear(level, at, 3, 1) > 0;
            if (!touching && random.nextFloat() > intensity * 0.25F) {
                continue;
            }
            SeamHelper.gildWorld(level, at, random);
            if (level.getBlockState(at.above()).isAir() && random.nextInt(5) == 0) {
                level.setBlockAndUpdate(at.above(),
                        ModBlocks.GILDED_VEIN.defaultBlockState());
            }
        }
    }
}
