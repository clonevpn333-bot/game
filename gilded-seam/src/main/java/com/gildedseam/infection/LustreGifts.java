package com.gildedseam.infection;

import java.util.List;

import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

import com.gildedseam.entity.SeamMob;
import com.gildedseam.registry.ModBlocks;

/**
 * What each species gets when the resin finishes with it.
 *
 * <p>At the third stage a blighted animal stops being a bigger version of the
 * second stage and starts doing something the animal could never do. The point
 * is that each one is <em>the animal's own trick, taken too far</em> - a llama
 * spits, so the amberlit llama spits something that sets; a wolf howls for its
 * pack, so this one howls and the pack answers from further away than it
 * should be able to hear. Fighting a herd at full maturity should feel like
 * fighting thirteen different problems, not one problem thirteen times.
 *
 * <p>Dispatch is on the registry id rather than on a class, because every
 * blighted animal shares one entity class and is distinguished only by its
 * {@link EntityType} - the same reason {@code SeamConversion} matches that way.
 */
public final class LustreGifts {

    private LustreGifts() {
    }

    /** Ticks between uses. Species scale this so nothing feels identical. */
    private static final int BASE_COOLDOWN = 130;

    /**
     * Called once per tick from a matured seam mob. Returns the cooldown to
     * set, or 0 if this species has no gift.
     */
    public static int fire(SeamMob mob, ServerLevel level, LivingEntity target) {
        String id = EntityType.getKey(mob.getType()).getPath();
        double dist = mob.distanceTo(target);

        switch (id) {
            case "gilded_cow" -> {
                // Bellow: everything nearby is thrown off its feet.
                if (dist > 7.0) {
                    return 0;
                }
                shove(level, mob, 6.5, 0.62, 70, 1);
                boom(level, mob, SoundEvents.RAVAGER_ROAR, 1.4F, 0.5F);
                return BASE_COOLDOWN + 40;
            }
            case "gilded_pig" -> {
                // Farrow: it comes apart, and the parts keep coming.
                if (dist > 9.0) {
                    return 0;
                }
                for (int i = 0; i < 2; i++) {
                    spawnAlly(level, mob, com.gildedseam.registry.ModEntities.SHARDLING);
                }
                boom(level, mob, SoundEvents.HONEY_BLOCK_STEP, 1.1F, 0.6F);
                return BASE_COOLDOWN + 120;
            }
            case "gilded_sheep" -> {
                // The fleece sets hard. For six seconds it barely notices you.
                mob.addEffect(new MobEffectInstance(MobEffects.RESISTANCE, 120, 1));
                mob.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, 120, 0));
                puff(level, mob, ParticleTypes.WHITE_ASH, 40, 1.2);
                boom(level, mob, SoundEvents.AMETHYST_BLOCK_RESONATE, 1.0F, 0.6F);
                return BASE_COOLDOWN + 100;
            }
            case "gilded_goat" -> {
                // Ram. Goats already do this; this one does not stop.
                if (dist > 12.0 || dist < 2.0) {
                    return 0;
                }
                Vec3 at = target.position().subtract(mob.position()).normalize();
                mob.setDeltaMovement(at.x * 1.5, 0.42, at.z * 1.5);
                mob.hasImpulse = true;
                boom(level, mob, SoundEvents.WOOD_HIT, 1.2F, 0.6F);
                return BASE_COOLDOWN;
            }
            case "gilded_horse" -> {
                // Trample: it runs, and the ground gilds where it lands.
                mob.addEffect(new MobEffectInstance(MobEffects.SPEED, 100, 2));
                BlockPos under = mob.blockPosition().below();
                if (level.getBlockState(under).isSolidRender()
                        && level.getBlockState(mob.blockPosition()).isAir()) {
                    level.setBlock(under, ModBlocks.GILDED_VEIN.defaultBlockState(), 3);
                }
                boom(level, mob, SoundEvents.HONEY_BLOCK_STEP, 1.0F, 0.5F);
                return 40;
            }
            case "gilded_llama" -> {
                // It always spat. Now what it spits sets in about four seconds.
                if (dist > 14.0) {
                    return 0;
                }
                target.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, 120, 2), mob);
                target.addEffect(new MobEffectInstance(MobEffects.BLINDNESS, 60, 0), mob);
                line(level, mob, target, ParticleTypes.FALLING_HONEY);
                boom(level, mob, SoundEvents.DISPENSER_FAIL, 1.2F, 0.6F);
                return BASE_COOLDOWN + 30;
            }
            case "gilded_chicken" -> {
                // There is never one chicken.
                if (dist > 10.0) {
                    return 0;
                }
                spawnAlly(level, mob, com.gildedseam.registry.ModEntities.GILDED_CHICKEN);
                boom(level, mob, SoundEvents.DECORATED_POT_INSERT, 1.3F, 0.5F);
                return BASE_COOLDOWN + 160;
            }
            case "gilded_wolf" -> {
                // Howl. The pack answers from further away than it should hear.
                HordeCall.answer(mob, level, target);
                for (SeamMob ally : level.getEntitiesOfClass(SeamMob.class,
                        mob.getBoundingBox().inflate(26.0))) {
                    ally.addEffect(new MobEffectInstance(MobEffects.SPEED, 160, 1));
                    ally.setTarget(target);
                }
                boom(level, mob, SoundEvents.WARDEN_SONIC_CHARGE, 1.6F, 0.5F);
                return BASE_COOLDOWN + 90;
            }
            case "gilded_fox" -> {
                // It takes something and carries it back toward the hearts.
                if (dist > 4.0 || !(target instanceof Player player)) {
                    return 0;
                }
                if (!player.getOffhandItem().isEmpty()) {
                    player.getOffhandItem().shrink(1);
                    boom(level, mob, SoundEvents.FISHING_BOBBER_RETRIEVE, 1.1F, 0.7F);
                    mob.setDeltaMovement(mob.position().subtract(target.position())
                            .normalize().scale(0.9).add(0, 0.35, 0));
                    mob.hasImpulse = true;
                    return BASE_COOLDOWN + 200;
                }
                return 0;
            }
            case "gilded_cat" -> {
                // Gone, then behind you.
                if (dist > 12.0 || dist < 3.0) {
                    return 0;
                }
                Vec3 behind = target.position()
                        .subtract(target.getLookAngle().scale(2.2));
                mob.snapTo(behind.x, target.getY(), behind.z, mob.getYRot(), 0.0F);
                puff(level, mob, ParticleTypes.SMOKE, 24, 0.6);
                boom(level, mob, SoundEvents.AMETHYST_CLUSTER_HIT, 1.0F, 0.7F);
                return BASE_COOLDOWN + 60;
            }
            case "gilded_hare" -> {
                // Three leaps, badly aimed, extremely fast.
                if (dist > 14.0) {
                    return 0;
                }
                Vec3 to = target.position().subtract(mob.position()).normalize();
                mob.setDeltaMovement(to.x * 1.15, 0.72, to.z * 1.15);
                mob.hasImpulse = true;
                return 26;
            }
            case "gilded_spider" -> {
                // Resin instead of silk. It does not break like silk either.
                if (dist > 8.0) {
                    return 0;
                }
                BlockPos at = target.blockPosition();
                if (level.getBlockState(at).isAir()) {
                    level.setBlock(at, Blocks.COBWEB.defaultBlockState(), 3);
                }
                target.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, 80, 2), mob);
                boom(level, mob, SoundEvents.WOOD_HIT, 1.2F, 0.5F);
                return BASE_COOLDOWN + 50;
            }
            case "gilded_cask" -> {
                // It does not hiss. It leaks, and then the ground is wrong.
                if (dist > 5.0) {
                    return 0;
                }
                for (LivingEntity victim : level.getEntitiesOfClass(LivingEntity.class,
                        mob.getBoundingBox().inflate(4.5),
                        e -> !(e instanceof SeamMob))) {
                    victim.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, 140, 2), mob);
                    victim.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 140, 0), mob);
                }
                BlockPos under = mob.blockPosition();
                for (BlockPos p : BlockPos.betweenClosed(under.offset(-2, -1, -2),
                        under.offset(2, 0, 2))) {
                    if (level.getBlockState(p).isAir()
                            && level.getBlockState(p.below()).isSolidRender()
                            && level.getRandom().nextInt(3) == 0) {
                        level.setBlock(p, ModBlocks.GILDED_VEIN.defaultBlockState(), 3);
                    }
                }
                puff(level, mob, ParticleTypes.FALLING_HONEY, 60, 2.0);
                boom(level, mob, SoundEvents.HONEY_BLOCK_BREAK, 1.4F, 0.5F);
                return BASE_COOLDOWN + 140;
            }
            default -> {
                return 0;
            }
        }
    }

    // -----------------------------------------------------------------------

    private static void shove(ServerLevel level, SeamMob mob, double radius,
            double force, int ticks, int amp) {
        AABB reach = mob.getBoundingBox().inflate(radius);
        List<LivingEntity> caught = level.getEntitiesOfClass(LivingEntity.class, reach,
                e -> !(e instanceof SeamMob) && e.isAlive());
        for (LivingEntity victim : caught) {
            Vec3 away = victim.position().subtract(mob.position()).normalize();
            victim.push(away.x * force, 0.42, away.z * force);
            victim.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, ticks, amp), mob);
        }
        puff(level, mob, ParticleTypes.SCULK_CHARGE_POP, 50, radius * 0.5);
    }

    private static void spawnAlly(ServerLevel level, SeamMob mob, EntityType<?> type) {
        var spawned = type.spawn(level, mob.blockPosition(),
                net.minecraft.world.entity.EntitySpawnReason.MOB_SUMMONED);
        if (spawned instanceof SeamMob ally) {
            ally.setTier(SeamHelper.TIER_STONEWARE);
            ally.setTarget(mob.getTarget());
        }
    }

    private static void puff(ServerLevel level, SeamMob mob,
            net.minecraft.core.particles.ParticleOptions particle, int count, double spread) {
        level.sendParticles(particle, mob.getX(), mob.getY() + mob.getBbHeight() * 0.5,
                mob.getZ(), count, spread, spread * 0.6, spread, 0.02);
    }

    private static void line(ServerLevel level, SeamMob mob, LivingEntity target,
            net.minecraft.core.particles.ParticleOptions particle) {
        Vec3 from = mob.getEyePosition();
        Vec3 to = target.getEyePosition();
        for (int i = 0; i <= 12; i++) {
            Vec3 p = from.lerp(to, i / 12.0);
            level.sendParticles(particle, p.x, p.y, p.z, 1, 0.05, 0.05, 0.05, 0.0);
        }
    }

    private static void boom(ServerLevel level, SeamMob mob,
            net.minecraft.sounds.SoundEvent sound, float volume, float pitch) {
        level.playSound(null, mob.blockPosition(), sound, SoundSource.HOSTILE,
                volume, pitch);
    }
}
