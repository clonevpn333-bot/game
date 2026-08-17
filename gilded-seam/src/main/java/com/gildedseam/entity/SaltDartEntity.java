package com.gildedseam.entity;

import com.gildedseam.registry.ModEntities;
import com.gildedseam.registry.ModItems;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.projectile.throwableitemprojectile.ThrowableItemProjectile;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.EntityHitResult;
import net.minecraft.world.phys.HitResult;

/**
 * A rivening-salt dart. To anything stitched together with gold thread it
 * is not a sedative — every seam in the body lets go at once. Porcelain
 * drops where it stands. Warm creatures just get very, very sleepy.
 */
public class SaltDartEntity extends ThrowableItemProjectile {
    /** Enough to fell any seam creature short of the crowned ones outright. */
    private static final float SEAM_DAMAGE = 200.0F;

    public SaltDartEntity(EntityType<? extends SaltDartEntity> type, Level level) {
        super(type, level);
    }

    public SaltDartEntity(Level level, LivingEntity shooter) {
        // 26.2 threw item projectiles carry their stack explicitly.
        super(ModEntities.SALT_DART, shooter, level,
                new net.minecraft.world.item.ItemStack(ModItems.SALT_DART));
    }

    @Override
    protected Item getDefaultItem() {
        return ModItems.SALT_DART;
    }

    @Override
    protected void onHitEntity(EntityHitResult result) {
        super.onHitEntity(result);
        if (!(this.level() instanceof ServerLevel level)) {
            return;
        }
        if (result.getEntity() instanceof LivingEntity target) {
            if (target instanceof SeamMob) {
                // The seams let go.
                target.hurtServer(level, level.damageSources().magic(), SEAM_DAMAGE);
                level.playSound(null, target.blockPosition(), SoundEvents.DECORATED_POT_SHATTER,
                        SoundSource.NEUTRAL, 1.4F, 1.3F);
                level.sendParticles(ParticleTypes.WAX_OFF,
                        target.getX(), target.getY() + target.getBbHeight() * 0.5, target.getZ(),
                        30, 0.5, 0.7, 0.5, 0.08);
            } else {
                // A genuine tranquilizer for the still-living.
                target.hurtServer(level, level.damageSources().magic(), 2.0F);
                target.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, 200, 3));
                target.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 200, 1));
            }
        }
    }

    @Override
    protected void onHit(HitResult result) {
        super.onHit(result);
        if (this.level() instanceof ServerLevel level) {
            level.sendParticles(ParticleTypes.SNOWFLAKE,
                    this.getX(), this.getY(), this.getZ(), 8, 0.15, 0.15, 0.15, 0.02);
            this.discard();
        }
    }
}
