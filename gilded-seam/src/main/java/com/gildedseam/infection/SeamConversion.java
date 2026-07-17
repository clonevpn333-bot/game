package com.gildedseam.infection;

import com.gildedseam.entity.SeamMob;
import com.gildedseam.entity.ShardlingEntity;
import com.gildedseam.entity.VesselEntity;
import com.gildedseam.registry.ModEffects;
import com.gildedseam.registry.ModEntities;

import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.monster.Zombie;
import net.minecraft.world.entity.npc.AbstractVillager;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.raid.Raider;

/**
 * Death is where the Seam does its finest work. Anything that dies Gilded
 * — or dies to the Seam's own creatures — is not left to rot: the thread
 * pulls the pieces back together, fills the cracks with gold, and what
 * stands up afterwards is porcelain.
 *
 * <ul>
 *   <li>Humanoids (villagers, zombies, raiders) are mended into Vessels.</li>
 *   <li>Animals are broken down into one or two Shardlings.</li>
 *   <li>Players are spared conversion — but the Seam keeps the gold.</li>
 * </ul>
 */
public final class SeamConversion {
    private SeamConversion() {
    }

    public static void onLivingDeath(LivingEntity entity, DamageSource damageSource) {
        if (!(entity.level() instanceof ServerLevel level)) {
            return;
        }
        if (entity instanceof SeamMob || entity instanceof Player) {
            return;
        }

        boolean gilded = entity.hasEffect(ModEffects.GILDED);
        boolean killedBySeam = damageSource.getEntity() instanceof SeamMob;
        if (!gilded && !killedBySeam) {
            return;
        }
        if (SeamHelper.isMobCapped(level, entity.blockPosition())) {
            return;
        }

        if (entity instanceof AbstractVillager || entity instanceof Zombie || entity instanceof Raider) {
            mendIntoVessel(level, entity);
        } else if (entity instanceof Animal) {
            shatterIntoShardlings(level, entity);
        }
    }

    private static void mendIntoVessel(ServerLevel level, LivingEntity corpse) {
        VesselEntity vessel = ModEntities.VESSEL.create(level, EntitySpawnReason.CONVERSION);
        if (vessel == null) {
            return;
        }
        vessel.snapTo(corpse.getX(), corpse.getY(), corpse.getZ(), corpse.getYRot(), 0.0F);
        vessel.setTier(SeamHelper.rollTier(level, corpse.blockPosition(), level.random));
        vessel.beginRising();
        level.addFreshEntity(vessel);
        playMendingEffects(level, corpse.blockPosition());
    }

    private static void shatterIntoShardlings(ServerLevel level, LivingEntity corpse) {
        int count = corpse.getBbWidth() > 0.8F ? 2 : 1;
        for (int i = 0; i < count; i++) {
            ShardlingEntity shardling = ModEntities.SHARDLING.create(level, EntitySpawnReason.CONVERSION);
            if (shardling == null) {
                continue;
            }
            shardling.snapTo(
                    corpse.getX() + (level.random.nextDouble() - 0.5) * 0.6,
                    corpse.getY(),
                    corpse.getZ() + (level.random.nextDouble() - 0.5) * 0.6,
                    level.random.nextFloat() * 360.0F, 0.0F);
            shardling.setTier(SeamHelper.rollTier(level, corpse.blockPosition(), level.random));
            level.addFreshEntity(shardling);
        }
        playMendingEffects(level, corpse.blockPosition());
    }

    private static void playMendingEffects(ServerLevel level, BlockPos pos) {
        level.playSound(null, pos, SoundEvents.DECORATED_POT_INSERT, SoundSource.HOSTILE, 1.0F, 0.5F);
        level.playSound(null, pos, SoundEvents.AMETHYST_BLOCK_RESONATE, SoundSource.HOSTILE, 1.0F, 0.7F);
        level.sendParticles(ParticleTypes.WAX_ON,
                pos.getX() + 0.5, pos.getY() + 1.0, pos.getZ() + 0.5, 30, 0.5, 0.9, 0.5, 0.08);
    }

    /**
     * Called by seam mobs when they melee something: the bite always
     * threads a little gold in. Amplifier scales with the attacker's tier.
     */
    public static void infectOnHit(Mob attacker, LivingEntity target, int tier) {
        SeamHelper.gild(target, 160 + tier * 120, tier >= SeamHelper.TIER_LUSTRE ? 1 : 0);
    }
}
