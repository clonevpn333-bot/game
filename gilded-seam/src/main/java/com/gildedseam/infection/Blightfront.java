package com.gildedseam.infection;

import net.minecraft.core.BlockPos;
import net.minecraft.util.Mth;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.LevelReader;

/**
 * How far the blight has got. One number, and everything else asks it.
 *
 * <p>The mod used to switch on everywhere at once. Every hostile spawned in
 * every overworld biome from the first tick, kiln hearts were seeded across the
 * whole surface, and structures full of bosses sat within walking distance of
 * where you woke up. There was no <em>before</em> - nothing you did caused any
 * of it, nothing got worse, and the first thing a new world showed you was its
 * last act. A horror mod with no opening is just a difficulty setting.
 *
 * <p>So there is a front. It is a circle centred on the Mother Tree, and it
 * starts small enough that the tree and the sick ground around it are a
 * <em>landmark</em> rather than an ambush. Outside it the world is
 * ordinary Minecraft. Inside it, everything this mod does is allowed to happen.
 * The circle grows, and the growing is the game.
 *
 * <p>The radius is a function of world age rather than saved state, which is
 * deliberate. Saved data can desync, can fail to load, can be lost by a
 * crash, and is one more thing to get wrong across a version bump. World age
 * is already persisted by the game, is authoritative on both sides, and gives
 * the same answer to every system that asks - so the edge the player can see
 * is the same edge the spawner is using.
 */
public final class Blightfront {

    private Blightfront() {
    }

    /** Blocks the front covers on day one. Big enough to see, small enough to walk out of. */
    private static final double START = 320.0;

    /** How much further it reaches each day. Twenty days to a kilometre. */
    private static final double PER_DAY = 48.0;

    /** It stops growing eventually; past this the far world is a refuge, not a promise. */
    private static final double LIMIT = 4096.0;

    /** Ticks in a Minecraft day. */
    private static final double DAY = 24000.0;

    /**
     * How far the blight reaches right now, in blocks.
     *
     * <p>Outside the overworld this is unbounded: the Creaking's hollow is not
     * a place the blight is spreading into, it is where it came from.
     */
    public static double radius(LevelReader level) {
        if (!(level instanceof Level real) || !isOverworld(real)) {
            return Double.MAX_VALUE;
        }
        double days = real.getGameTime() / DAY;
        return Math.min(LIMIT, START + days * PER_DAY);
    }

    /**
     * The tree, and therefore the middle of it: the world origin.
     *
     * <p>Not the spawn point. `getSharedSpawnPos()` is gone in 26.2 - what
     * replaced it is `getRespawnData()`, a record about where players respawn,
     * which is a related but different question and one more API to get wrong
     * on the next version. The origin cannot move, cannot fail to load, is the
     * same on both sides without syncing anything, and is where Minecraft
     * starts looking for a spawn point in the first place - so in practice the
     * tree is a short walk from wherever you wake up. That is worth more than
     * being exactly underfoot.
     *
     * <p>The starting radius is generous for the same reason: it has to
     * comfortably contain a spawn point that was chosen by searching outward
     * from here.
     */
    public static BlockPos origin(Level level) {
        return BlockPos.ZERO;
    }

    /** Whether the blight has reached this block yet. */
    public static boolean reaches(LevelReader level, BlockPos pos) {
        if (!(level instanceof Level real) || !isOverworld(real)) {
            return true;
        }
        BlockPos heart = origin(real);
        double r = radius(level);
        double dx = pos.getX() - heart.getX();
        double dz = pos.getZ() - heart.getZ();
        return dx * dx + dz * dz <= r * r;
    }

    /**
     * How deep inside the front a position is, from 0 at the edge to 1 at the
     * tree. Systems that should be worse near the source scale on this rather
     * than inventing their own falloff.
     */
    public static float intensity(LevelReader level, BlockPos pos) {
        if (!(level instanceof Level real) || !isOverworld(real)) {
            return 1.0F;
        }
        BlockPos heart = origin(real);
        double r = radius(level);
        double dist = Math.sqrt(Mth.square((double) pos.getX() - heart.getX())
                + Mth.square((double) pos.getZ() - heart.getZ()));
        if (dist >= r) {
            return 0.0F;
        }
        return (float) (1.0 - dist / r);
    }

    /**
     * The quiet ring immediately around the tree.
     *
     * <p>You wake up near here. The tree is a short walk away and the ground
     * under it is already wrong, but nothing in this ring will hunt you on the
     * first night - a player who spawns into a fight they cannot win has not been
     * given a horror game, they have been given a death screen.
     */
    public static boolean isSanctuary(LevelReader level, BlockPos pos) {
        if (!(level instanceof Level real) || !isOverworld(real)) {
            return false;
        }
        BlockPos heart = origin(real);
        double dx = pos.getX() - heart.getX();
        double dz = pos.getZ() - heart.getZ();
        double dist2 = dx * dx + dz * dz;
        // The clearing itself is safe, but not the tree at the middle of it.
        return dist2 <= 96.0 * 96.0 && dist2 >= 14.0 * 14.0;
    }

    /** Whether this mod's mobs and block effects may act here at all. */
    public static boolean allows(LevelReader level, BlockPos pos) {
        return reaches(level, pos) && !isSanctuary(level, pos);
    }

    private static boolean isOverworld(Level level) {
        return level.dimension() == Level.OVERWORLD;
    }
}
