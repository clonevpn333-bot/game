package com.gildedseam.entity;

import com.gildedseam.infection.SeamHelper;
import com.gildedseam.registry.ModBlocks;
import com.gildedseam.registry.ModEntities;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.AnimationState;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;

/**
 * <b>Font of Gold</b> — Stage II, "the wet nurse."
 *
 * <p>A squat, swollen amphora-body on rooted stump-legs, split down the
 * middle by one wide seam that never stops weeping molten gold. The Seam
 * plants fonts like orchard trees: they drip runners into the soil, keep
 * the local brood lacquered in resistance, and every so often the great
 * seam <i>opens</i> and pours out a newborn shardling, glistening and
 * ringing. Kill the font and the orchard starves.</p>
 */
public class FontOfGoldEntity extends SeamMob {
    private static final byte EVENT_BIRTH = 65;

    public final AnimationState birthAnimationState = new AnimationState();

    private int birthCooldown = 100;

    public FontOfGoldEntity(EntityType<? extends FontOfGoldEntity> type, Level level) {
        super(type, level);
        this.xpReward = 16;
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Monster.createMonsterAttributes()
                .add(Attributes.MAX_HEALTH, 40.0)
                .add(Attributes.MOVEMENT_SPEED, 0.14)
                .add(Attributes.ATTACK_DAMAGE, 3.0)
                .add(Attributes.KNOCKBACK_RESISTANCE, 1.0)
                .add(Attributes.FOLLOW_RANGE, 24.0);
    }

    @Override
    protected int minimumTier() {
        return SeamHelper.TIER_STONEWARE;
    }

    @Override
    protected double tierScaleStep() {
        return 0.2;
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(1, new FloatGoal(this));
        this.goalSelector.addGoal(6, new WaterAvoidingRandomStrollGoal(this, 0.6));
        this.goalSelector.addGoal(7, new LookAtPlayerGoal(this, Player.class, 8.0F));

        this.targetSelector.addGoal(1, new HurtByTargetGoal(this).setAlertOthers());
    }

    @Override
    public void aiStep() {
        super.aiStep();
        if (this.level().isClientSide) {
            if (this.random.nextInt(4) == 0) {
                this.level().addParticle(ParticleTypes.FALLING_HONEY,
                        this.getRandomX(0.5), this.getY() + 0.9 + this.random.nextDouble() * 0.5, this.getRandomZ(0.5),
                        0.0, -0.05, 0.0);
            }
            return;
        }
        if (!(this.level() instanceof ServerLevel level)) {
            return;
        }

        // Lacquer aura: nearby brood shrugs off blows.
        if (this.tickCount % 60 == 0) {
            for (SeamMob ally : level.getEntitiesOfClass(SeamMob.class,
                    this.getBoundingBox().inflate(8.0, 4.0, 8.0))) {
                ally.addEffect(new MobEffectInstance(MobEffects.RESISTANCE, 100, 0));
            }
        }

        // Drip runners into the soil.
        if (this.tickCount % 90 == 0 && this.onGround()) {
            BlockPos below = this.blockPosition().below();
            if (SeamHelper.isGildable(level.getBlockState(below))) {
                level.setBlockAndUpdate(below, ModBlocks.SEAMSTONE.defaultBlockState());
            } else {
                BlockPos side = this.blockPosition().relative(Direction.Plane.HORIZONTAL.getRandomDirection(this.random));
                if (level.getBlockState(side).isAir()
                        && level.getBlockState(side.below()).isFaceSturdy(level, side.below(), Direction.UP)) {
                    level.setBlockAndUpdate(side, ModBlocks.GILDED_VEIN.defaultBlockState());
                }
            }
        }

        // The seam opens.
        if (--this.birthCooldown <= 0) {
            this.birthCooldown = 240 + this.random.nextInt(160);
            Player nearest = level.getNearestPlayer(this, 24.0);
            if (nearest != null && !SeamHelper.isMobCapped(level, this.blockPosition())) {
                this.giveBirth(level);
            }
        }
    }

    private void giveBirth(ServerLevel level) {
        ShardlingEntity newborn = ModEntities.SHARDLING.create(level, EntitySpawnReason.MOB_SUMMONED);
        if (newborn == null) {
            return;
        }
        newborn.snapTo(
                this.getX() + (this.random.nextDouble() - 0.5),
                this.getY() + 0.2,
                this.getZ() + (this.random.nextDouble() - 0.5),
                this.random.nextFloat() * 360.0F, 0.0F);
        newborn.setTier(Math.min(this.getTier(), SeamHelper.TIER_STONEWARE));
        level.addFreshEntity(newborn);

        this.level().broadcastEntityEvent(this, EVENT_BIRTH);
        level.playSound(null, this.blockPosition(), SoundEvents.HONEY_BLOCK_BREAK, SoundSource.HOSTILE, 1.2F, 0.6F);
        level.playSound(null, this.blockPosition(), SoundEvents.AMETHYST_CLUSTER_BREAK, SoundSource.HOSTILE, 1.0F, 0.8F);
        level.sendParticles(ParticleTypes.FALLING_HONEY,
                this.getX(), this.getY() + 0.8, this.getZ(), 18, 0.4, 0.5, 0.4, 0.0);
    }

    @Override
    public boolean hurtServer(ServerLevel level, DamageSource source, float amount) {
        boolean hurt = super.hurtServer(level, source, amount);
        // Panic spasm: being struck can squeeze a newborn out early.
        if (hurt && this.isAlive() && this.random.nextFloat() < 0.25F
                && !SeamHelper.isMobCapped(level, this.blockPosition())) {
            this.giveBirth(level);
        }
        return hurt;
    }

    @Override
    public void handleEntityEvent(byte id) {
        if (id == EVENT_BIRTH) {
            this.birthAnimationState.start(this.tickCount);
        } else {
            super.handleEntityEvent(id);
        }
    }

    @Override
    protected SoundEvent getAmbientSound() {
        return SoundEvents.HONEY_BLOCK_STEP;
    }

    @Override
    protected float getSoundVolume() {
        return 0.9F;
    }
}
