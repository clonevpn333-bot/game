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
import net.minecraft.world.entity.monster.zombie.Zombie;
import net.minecraft.world.entity.npc.villager.AbstractVillager;
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
        if (entity instanceof SeamMob) {
            // A seam creature dying is not a loss to the blight; it is fuel.
            // Pressure is what makes attrition escalate rather than exhaust.
            HordeCall.feed();
            return;
        }
        if (entity instanceof Player) {
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

        // Fish alone are spared: gold sinks, and the Seam has learned not
        // to waste thread on water.
        if (entity instanceof net.minecraft.world.entity.animal.fish.WaterAnimal) {
            return;
        }

        // Every species is kept in its own shape. Bodies with hands are
        // mended into vessels; the farmyard is refired species by species;
        // anything without its own pattern is broken down for parts.
        if (entity instanceof AbstractVillager || entity instanceof Zombie || entity instanceof Raider
                || entity instanceof net.minecraft.world.entity.monster.skeleton.AbstractSkeleton
                || entity instanceof net.minecraft.world.entity.monster.piglin.AbstractPiglin) {
            mendIntoVessel(level, entity);
        } else if (entity instanceof Mob mob) {
            var beastType = beastFormOf(mob);
            if (beastType != null) {
                refireAsBeast(level, mob, beastType);
            } else {
                shatterIntoShardlings(level, entity);
            }
        }
    }

    @org.jetbrains.annotations.Nullable
    private static net.minecraft.world.entity.EntityType<com.gildedseam.entity.GildedBeastEntity> beastFormOf(Mob mob) {
        // Matched on the host's registry id rather than its class or a static
        // type constant. Both of those moved in 26.2 - the classes into
        // per-species packages, the constants out of EntityType entirely -
        // whereas "minecraft:cow" is the one name that never changes. It also
        // lets one blighted form cover a whole family of hosts.
        String host = net.minecraft.world.entity.EntityType.getKey(mob.getType()).toString();
        return switch (host) {
            case "minecraft:cow", "minecraft:mooshroom" -> ModEntities.GILDED_COW;
            case "minecraft:pig" -> ModEntities.GILDED_PIG;
            case "minecraft:sheep" -> ModEntities.GILDED_SHEEP;
            case "minecraft:chicken" -> ModEntities.GILDED_CHICKEN;
            case "minecraft:spider", "minecraft:cave_spider" -> ModEntities.GILDED_SPIDER;
            case "minecraft:creeper" -> ModEntities.GILDED_CASK;
            case "minecraft:wolf" -> ModEntities.GILDED_WOLF;
            case "minecraft:goat" -> ModEntities.GILDED_GOAT;
            case "minecraft:rabbit" -> ModEntities.GILDED_HARE;
            case "minecraft:fox" -> ModEntities.GILDED_FOX;
            case "minecraft:cat", "minecraft:ocelot" -> ModEntities.GILDED_CAT;
            case "minecraft:horse", "minecraft:donkey", "minecraft:mule",
                 "minecraft:camel" -> ModEntities.GILDED_HORSE;
            case "minecraft:llama", "minecraft:trader_llama" -> ModEntities.GILDED_LLAMA;
            default -> null;
        };
    }

    private static void refireAsBeast(ServerLevel level, Mob corpse,
            net.minecraft.world.entity.EntityType<com.gildedseam.entity.GildedBeastEntity> type) {
        com.gildedseam.entity.GildedBeastEntity beast = type.create(level, EntitySpawnReason.CONVERSION);
        if (beast == null) {
            return;
        }
        beast.snapTo(corpse.getX(), corpse.getY(), corpse.getZ(), corpse.getYRot(), 0.0F);
        beast.setTier(SeamHelper.rollTier(level, corpse.blockPosition(), level.getRandom()));
        level.addFreshEntity(beast);
        playMendingEffects(level, corpse.blockPosition());
    }

    private static void mendIntoVessel(ServerLevel level, LivingEntity corpse) {
        VesselEntity vessel = ModEntities.VESSEL.create(level, EntitySpawnReason.CONVERSION);
        if (vessel == null) {
            return;
        }
        vessel.snapTo(corpse.getX(), corpse.getY(), corpse.getZ(), corpse.getYRot(), 0.0F);
        vessel.setTier(SeamHelper.rollTier(level, corpse.blockPosition(), level.getRandom()));
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
                    corpse.getX() + (level.getRandom().nextDouble() - 0.5) * 0.6,
                    corpse.getY(),
                    corpse.getZ() + (level.getRandom().nextDouble() - 0.5) * 0.6,
                    level.getRandom().nextFloat() * 360.0F, 0.0F);
            shardling.setTier(SeamHelper.rollTier(level, corpse.blockPosition(), level.getRandom()));
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
