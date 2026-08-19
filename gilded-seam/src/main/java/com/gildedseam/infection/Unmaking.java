package com.gildedseam.infection;

import java.util.ArrayList;
import java.util.List;

import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.Mth;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;

/**
 * The Unmaking - the world going away rather than merely dying.
 *
 * <p>Rot and gilt mass are the blight eating the world's surface. This is the
 * stage after that: around a fully matured Kiln Heart, the world stops being
 * replaced and starts being <em>subtracted</em>. Blocks lift, hang for a beat
 * with the light coming apart around them, and are gone - leaving holes that
 * widen until whole shelves of terrain are simply missing.
 *
 * <p>It is deliberately slow and deliberately loud. A player should be able to
 * stand at the edge and watch the ground disassemble itself a block at a time,
 * and should be able to run out of the radius before it reaches them. Bedrock
 * is never taken, so the world can rot through without becoming a void seam.
 */
public final class Unmaking {
    /** How far from the anchor the subtraction reaches. */
    private static final int RADIUS = 22;
    /** Blocks considered for removal each tick. */
    private static final int SAMPLES_PER_TICK = 26;
    /** Ticks a site glows before the block actually goes. */
    private static final int DWELL = 20;

    private static final List<Unmaking> ACTIVE = new ArrayList<>();

    private final ServerLevel level;
    private final BlockPos anchor;
    private final List<Pending> pending = new ArrayList<>();
    private int age;

    private record Pending(BlockPos pos, int dueTick) {
    }

    private Unmaking(ServerLevel level, BlockPos anchor) {
        this.level = level;
        this.anchor = anchor;
    }

    /** Begins (or refreshes) an unmaking centred on a matured kiln heart. */
    public static void begin(ServerLevel level, BlockPos anchor) {
        for (Unmaking existing : ACTIVE) {
            if (existing.level == level && existing.anchor.closerThan(anchor, 24.0)) {
                return;
            }
        }
        ACTIVE.add(new Unmaking(level, anchor));
        level.playSound(null, anchor, SoundEvents.BEACON_DEACTIVATE, SoundSource.BLOCKS,
                2.4F, 0.35F);
    }

    public static void stopAll() {
        ACTIVE.clear();
    }

    public static void tickAll(MinecraftServer server) {
        ACTIVE.removeIf(Unmaking::tick);
    }

    /** @return true once this site is spent and should be dropped. */
    private boolean tick() {
        this.age++;
        RandomSource random = this.level.getRandom();

        // Anything whose dwell has elapsed goes now.
        this.pending.removeIf(p -> {
            if (this.age < p.dueTick()) {
                return false;
            }
            take(p.pos());
            return true;
        });

        // The anchor has to survive for the site to keep working; break the
        // kiln heart and the unmaking stops spreading.
        if (this.age % 40 == 0
                && this.level.getBlockState(this.anchor).isAir()) {
            return true;
        }

        // The world is only allowed to come apart where the blight has
        // actually reached. An anchor outside the front does nothing at all -
        // which is what stops a player finding a hole in the ground on their
        // first morning, a thousand blocks from anything they did.
        // `true` here means "this site is finished", which is the right answer:
        // an anchor the front has not reached is not paused, it is not a site.
        if (!Blightfront.allows(this.level, this.anchor)) {
            return true;
        }
        for (int i = 0; i < SAMPLES_PER_TICK; i++) {
            int dx = random.nextInt(RADIUS * 2 + 1) - RADIUS;
            int dz = random.nextInt(RADIUS * 2 + 1) - RADIUS;
            int dy = random.nextInt(24) - 8;
            // Round hole, and thinner the further out you go, so the edge
            // frays instead of ending on a cliff.
            double dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > RADIUS || random.nextFloat() < dist / RADIUS) {
                continue;
            }
            BlockPos pos = this.anchor.offset(dx, dy, dz);
            BlockState state = this.level.getBlockState(pos);
            if (state.isAir() || state.is(Blocks.BEDROCK)
                    || state.getDestroySpeed(this.level, pos) < 0.0F) {
                continue;
            }
            markForUnmaking(pos);
        }
        return false;
    }

    /** Lights a block up so the player can see it about to go. */
    private void markForUnmaking(BlockPos pos) {
        for (Pending p : this.pending) {
            if (p.pos().equals(pos)) {
                return;
            }
        }
        this.pending.add(new Pending(pos, this.age + DWELL));
        this.level.sendParticles(ParticleTypes.END_ROD,
                pos.getX() + 0.5, pos.getY() + 0.5, pos.getZ() + 0.5,
                3, 0.25, 0.25, 0.25, 0.005);
        if (this.level.getRandom().nextInt(6) == 0) {
            this.level.playSound(null, pos, SoundEvents.AMETHYST_BLOCK_CHIME,
                    SoundSource.BLOCKS, 0.5F, 0.6F + this.level.getRandom().nextFloat() * 0.5F);
        }
    }

    /** Removes a block with the flourish it deserves. */
    private void take(BlockPos pos) {
        BlockState state = this.level.getBlockState(pos);
        if (state.isAir()) {
            return;
        }
        double x = pos.getX() + 0.5;
        double y = pos.getY() + 0.5;
        double z = pos.getZ() + 0.5;
        // A shred of the block flies apart, then nothing is left behind it.
        this.level.sendParticles(ParticleTypes.REVERSE_PORTAL, x, y, z, 8,
                0.2, 0.2, 0.2, 0.06);
        this.level.sendParticles(ParticleTypes.ASH, x, y, z, 5, 0.3, 0.3, 0.3, 0.01);
        this.level.setBlock(pos, Blocks.AIR.defaultBlockState(), 3);
        if (this.level.getRandom().nextInt(9) == 0) {
            this.level.playSound(null, pos, SoundEvents.SCULK_BLOCK_BREAK,
                    SoundSource.BLOCKS, 0.7F, 0.4F);
        }
    }

    /**
     * How complete the unmaking around a point is, 0 to 1. Used for ambience
     * and for the Rivening's own accounting.
     */
    public static float progressNear(ServerLevel level, BlockPos pos) {
        for (Unmaking site : ACTIVE) {
            if (site.level == level && site.anchor.closerThan(pos, RADIUS)) {
                return Mth.clamp(site.age / 6000.0F, 0.0F, 1.0F);
            }
        }
        return 0.0F;
    }
}
