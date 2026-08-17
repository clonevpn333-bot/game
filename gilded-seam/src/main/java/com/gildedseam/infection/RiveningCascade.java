package com.gildedseam.infection;

import com.gildedseam.entity.SeamMob;
import com.gildedseam.registry.ModBlocks;
import com.gildedseam.registry.ModEffects;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import net.minecraft.advancements.AdvancementHolder;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

/**
 * <b>The Rivening</b> — the ending, and it is cinematic.
 *
 * <p>Strike the {@code Rivening Heart} against a Kiln Heart and the cure
 * stops being a tool and becomes a <i>wave</i>: an expanding ring of
 * white salt-light that rolls outward for half a minute, unsewing
 * everything it passes — seam blocks crack back to stone, gold runners
 * flake to nothing, porcelain creatures come apart at every seam, and
 * every living thing is purged of the Gilded. Bells toll faster and
 * higher as the ring grows, and when it reaches its full hundred blocks
 * the whole valley answers with one final resonant boom. Everyone who
 * witnessed it earns the last task: <i>The Rivening</i>.</p>
 */
public final class RiveningCascade {
    private static final float MAX_RADIUS = 96.0F;
    private static final float SPEED_PER_TICK = 0.6F;
    private static final int SAMPLES_PER_TICK = 700;
    private static final Identifier FINAL_ADVANCEMENT =
            Identifier.fromNamespaceAndPath("gildedseam", "the_rivening");

    private static final List<RiveningCascade> ACTIVE = new ArrayList<>();

    private final ServerLevel level;
    private final BlockPos center;
    private float radius = 1.0F;

    private RiveningCascade(ServerLevel level, BlockPos center) {
        this.level = level;
        this.center = center;
    }

    public static void start(ServerLevel level, BlockPos center) {
        ACTIVE.add(new RiveningCascade(level, center));
        level.playSound(null, center, SoundEvents.DECORATED_POT_SHATTER, SoundSource.BLOCKS, 3.0F, 0.5F);
        level.playSound(null, center, SoundEvents.BELL_RESONATE, SoundSource.BLOCKS, 3.0F, 0.5F);
        for (ServerPlayer player : level.getPlayers(p -> p.distanceToSqr(Vec3.atLowerCornerOf(center).add(0.5, 0.5, 0.5)) < 160.0 * 160.0)) {
            player.sendSystemMessage(Component.translatable("gildedseam.rivening.begins"));
        }
    }

    /** Hooked from {@code ServerTickEvents.END_SERVER_TICK}. */
    public static void tickAll(MinecraftServer server) {
        Iterator<RiveningCascade> iterator = ACTIVE.iterator();
        while (iterator.hasNext()) {
            if (iterator.next().tick()) {
                iterator.remove();
            }
        }
    }

    private boolean tick() {
        this.radius += SPEED_PER_TICK;
        float inner = this.radius - SPEED_PER_TICK;

        // Unsew a band of world. Random sampling keeps each tick cheap while
        // the repeated passes leave nothing standing.
        for (int i = 0; i < SAMPLES_PER_TICK; i++) {
            float angle = this.level.getRandom().nextFloat() * Mth.TWO_PI;
            float dist = inner + this.level.getRandom().nextFloat() * SPEED_PER_TICK * 2.0F;
            int dy = this.level.getRandom().nextInt(33) - 16;
            BlockPos pos = this.center.offset(
                    Mth.floor(Mth.cos(angle) * dist), dy, Mth.floor(Mth.sin(angle) * dist));
            cleanse(this.level, pos);
        }

        // The visible ring.
        if (this.level.getGameTime() % 2 == 0) {
            int points = Math.max(12, (int) (this.radius * 1.5F));
            for (int i = 0; i < points; i++) {
                float angle = (Mth.TWO_PI / points) * i;
                double x = this.center.getX() + 0.5 + Mth.cos(angle) * this.radius;
                double z = this.center.getZ() + 0.5 + Mth.sin(angle) * this.radius;
                double y = this.level.getHeight(net.minecraft.world.level.levelgen.Heightmap.Types.MOTION_BLOCKING,
                        Mth.floor(x), Mth.floor(z)) + 1.0;
                this.level.sendParticles(ParticleTypes.WAX_OFF, x, y, z, 2, 0.2, 0.6, 0.2, 0.02);
                if (i % 6 == 0) {
                    this.level.sendParticles(ParticleTypes.END_ROD, x, y + 1.0, z, 1, 0.1, 0.4, 0.1, 0.01);
                }
            }
        }

        // Rising bells.
        if (this.level.getGameTime() % 12 == 0) {
            float pitch = 0.6F + (this.radius / MAX_RADIUS) * 1.2F;
            this.level.playSound(null, this.center, SoundEvents.AMETHYST_BLOCK_RESONATE,
                    SoundSource.BLOCKS, 2.5F, pitch);
        }

        // The wavefront purges the living and unmakes the porcelain.
        AABB band = AABB.ofSize(Vec3.atLowerCornerOf(this.center).add(0.5, 0.5, 0.5), this.radius * 2.0 + 4.0, 64.0, this.radius * 2.0 + 4.0);
        for (LivingEntity entity : this.level.getEntitiesOfClass(LivingEntity.class, band)) {
            double dist = Math.sqrt(Math.pow(entity.getX() - this.center.getX() - 0.5, 2)
                    + Math.pow(entity.getZ() - this.center.getZ() - 0.5, 2));
            if (dist < inner - 2.0 || dist > this.radius + 2.0) {
                continue;
            }
            if (entity instanceof SeamMob seamMob) {
                seamMob.hurtServer(this.level, this.level.damageSources().magic(), 40.0F);
                this.level.sendParticles(ParticleTypes.WAX_OFF,
                        seamMob.getX(), seamMob.getY() + 1.0, seamMob.getZ(), 16, 0.4, 0.6, 0.4, 0.05);
            } else {
                entity.removeEffect(ModEffects.GILDED);
            }
        }

        if (this.radius < MAX_RADIUS) {
            return false;
        }

        // Finale.
        this.level.playSound(null, this.center, SoundEvents.GENERIC_EXPLODE.value(), SoundSource.BLOCKS, 3.0F, 0.5F);
        this.level.playSound(null, this.center, SoundEvents.BELL_RESONATE, SoundSource.BLOCKS, 3.0F, 2.0F);
        this.level.sendParticles(ParticleTypes.SONIC_BOOM,
                this.center.getX() + 0.5, this.center.getY() + 2.0, this.center.getZ() + 0.5,
                24, 6.0, 3.0, 6.0, 0.0);
        AdvancementHolder advancement = this.level.getServer().getAdvancements().get(FINAL_ADVANCEMENT);
        for (ServerPlayer player : this.level.getPlayers(
                p -> p.distanceToSqr(Vec3.atLowerCornerOf(this.center).add(0.5, 0.5, 0.5)) < 200.0 * 200.0)) {
            player.sendSystemMessage(Component.translatable("gildedseam.rivening.done"));
            if (advancement != null) {
                player.getAdvancements().award(advancement, "done");
            }
        }
        return true;
    }

    private static void cleanse(ServerLevel level, BlockPos pos) {
        BlockState state = level.getBlockState(pos);
        if (state.is(ModBlocks.SEAMSTONE) || state.is(ModBlocks.GILT_MASS)) {
            level.setBlockAndUpdate(pos, Blocks.STONE.defaultBlockState());
        } else if (state.is(ModBlocks.GILDED_VEIN) || state.is(ModBlocks.PORCELAIN_BLOOM)) {
            level.setBlockAndUpdate(pos, Blocks.AIR.defaultBlockState());
        } else if (state.is(ModBlocks.KILN_HEART)) {
            level.setBlockAndUpdate(pos, Blocks.MAGMA_BLOCK.defaultBlockState());
        } else if (state.is(ModBlocks.FIRED_SHELL)) {
            level.setBlockAndUpdate(pos, Blocks.STONE.defaultBlockState());
        }
    }

}
