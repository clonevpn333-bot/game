package com.gildedseam.entity;

import com.gildedseam.GildedSeam;
import com.gildedseam.infection.SeamConversion;
import com.gildedseam.infection.SeamHelper;

import java.util.EnumSet;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.AnimationState;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.animal.IronGolem;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

/**
 * <b>Kilnborn</b> — Stage II, "the oven that walks."
 *
 * <p>The Seam's answer to siegecraft: a hunched furnace of chamber-pot
 * armor with a ribcage that glows from the inside, embers sifting out
 * of every joint. It charges like a dropped kiln rolling downhill, and
 * when its glaze finally starts to crack it <i>overfires</i> — flooding its
 * own seams with molten gold, hardening the shell, and burning everything
 * that touches it.</p>
 */
public class KilnbornEntity extends SeamMob {
    private static final byte EVENT_ATTACK = 64;
    private static final byte EVENT_CHARGE = 65;

    private static final EntityDataAccessor<Boolean> DATA_OVERFIRED =
            SynchedEntityData.defineId(KilnbornEntity.class, EntityDataSerializers.BOOLEAN);

    private static final ResourceLocation OVERFIRE_ARMOR_ID = GildedSeam.id("overfire_armor");

    public final AnimationState attackAnimationState = new AnimationState();
    public final AnimationState chargeAnimationState = new AnimationState();

    private int chargeCooldown;

    public KilnbornEntity(EntityType<? extends KilnbornEntity> type, Level level) {
        super(type, level);
        this.xpReward = 14;
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Monster.createMonsterAttributes()
                .add(Attributes.MAX_HEALTH, 50.0)
                .add(Attributes.MOVEMENT_SPEED, 0.26)
                .add(Attributes.ATTACK_DAMAGE, 9.0)
                .add(Attributes.ARMOR, 6.0)
                .add(Attributes.KNOCKBACK_RESISTANCE, 0.6)
                .add(Attributes.FOLLOW_RANGE, 35.0)
                .add(Attributes.STEP_HEIGHT, 1.0)
                .add(Attributes.ATTACK_KNOCKBACK, 1.5);
    }

    @Override
    protected int minimumTier() {
        return SeamHelper.TIER_STONEWARE;
    }

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder builder) {
        super.defineSynchedData(builder);
        builder.define(DATA_OVERFIRED, false);
    }

    public boolean isOverfired() {
        return this.entityData.get(DATA_OVERFIRED);
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(1, new FloatGoal(this));
        this.goalSelector.addGoal(2, new KilnChargeGoal());
        this.goalSelector.addGoal(4, new MeleeAttackGoal(this, 1.1, true));
        this.goalSelector.addGoal(6, new WaterAvoidingRandomStrollGoal(this, 0.7));
        this.goalSelector.addGoal(7, new LookAtPlayerGoal(this, Player.class, 10.0F));
        this.goalSelector.addGoal(8, new RandomLookAroundGoal(this));

        this.targetSelector.addGoal(1, new HurtByTargetGoal(this).setAlertOthers());
        this.targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, Player.class, true));
        this.targetSelector.addGoal(3, new NearestAttackableTargetGoal<>(this, IronGolem.class, true));
    }

    @Override
    public void aiStep() {
        super.aiStep();
        if (this.level().isClientSide) {
            if (this.isOverfired() && this.random.nextInt(3) == 0) {
                this.level().addParticle(ParticleTypes.FLAME,
                        this.getRandomX(0.6), this.getY() + 0.6 + this.random.nextDouble() * 1.2, this.getRandomZ(0.6),
                        0.0, 0.02, 0.0);
            }
            return;
        }

        if (this.chargeCooldown > 0) {
            this.chargeCooldown--;
        }

        // Overfire below 40% health: the shell floods with molten gold.
        if (!this.isOverfired() && this.getHealth() < this.getMaxHealth() * 0.4F) {
            this.entityData.set(DATA_OVERFIRED, true);
            AttributeInstance armor = this.getAttribute(Attributes.ARMOR);
            if (armor != null) {
                armor.removeModifier(OVERFIRE_ARMOR_ID);
                armor.addPermanentModifier(new AttributeModifier(OVERFIRE_ARMOR_ID, 8.0,
                        AttributeModifier.Operation.ADD_VALUE));
            }
            this.playSound(SoundEvents.BLAZE_AMBIENT, 1.5F, 0.6F);
            this.playSound(SoundEvents.DECORATED_POT_SHATTER, 1.5F, 0.4F);
            if (this.level() instanceof ServerLevel server) {
                server.sendParticles(ParticleTypes.LAVA, this.getX(), this.getY() + 1.2, this.getZ(),
                        16, 0.5, 0.7, 0.5, 0.0);
            }
        }

        // An overfired shell scalds attackers that press against it.
        if (this.isOverfired() && this.tickCount % 20 == 0 && this.level() instanceof ServerLevel server) {
            for (LivingEntity toucher : server.getEntitiesOfClass(LivingEntity.class,
                    this.getBoundingBox().inflate(0.4),
                    entity -> entity != this && !(entity instanceof SeamMob))) {
                toucher.setRemainingFireTicks(Math.max(toucher.getRemainingFireTicks(), 60));
            }
        }
    }

    @Override
    public boolean doHurtTarget(ServerLevel level, Entity target) {
        boolean hit = super.doHurtTarget(level, target);
        if (hit) {
            this.level().broadcastEntityEvent(this, EVENT_ATTACK);
            if (target instanceof LivingEntity living) {
                SeamConversion.infectOnHit(this, living, this.getTier());
                if (this.isOverfired()) {
                    living.setRemainingFireTicks(Math.max(living.getRemainingFireTicks(), 80));
                }
            }
        }
        return hit;
    }

    @Override
    public void handleEntityEvent(byte id) {
        switch (id) {
            case EVENT_ATTACK -> this.attackAnimationState.start(this.tickCount);
            case EVENT_CHARGE -> this.chargeAnimationState.start(this.tickCount);
            default -> super.handleEntityEvent(id);
        }
    }

    @Override
    protected SoundEvent getAmbientSound() {
        return SoundEvents.BLAZE_BURN;
    }

    @Override
    protected float getSoundVolume() {
        return 0.8F;
    }

    /**
     * The kiln-charge: lower the shoulder-plates and roll. Anything in the
     * lane is bowled over, burned, and launched.
     */
    private class KilnChargeGoal extends Goal {
        private static final int MAX_DURATION = 60;
        private Vec3 direction = Vec3.ZERO;
        private int ticksRunning;

        KilnChargeGoal() {
            this.setFlags(EnumSet.of(Goal.Flag.MOVE, Goal.Flag.LOOK));
        }

        @Override
        public boolean canUse() {
            KilnbornEntity owner = KilnbornEntity.this;
            LivingEntity target = owner.getTarget();
            if (owner.chargeCooldown > 0 || target == null
                    || !owner.onGround() || !owner.hasLineOfSight(target)) {
                return false;
            }
            double distSq = owner.distanceToSqr(target);
            return distSq >= 5.0 * 5.0 && distSq <= 16.0 * 16.0;
        }

        @Override
        public boolean canContinueToUse() {
            return this.ticksRunning < MAX_DURATION && KilnbornEntity.this.getTarget() != null;
        }

        @Override
        public void start() {
            KilnbornEntity owner = KilnbornEntity.this;
            LivingEntity target = owner.getTarget();
            this.ticksRunning = 0;
            this.direction = target.position().subtract(owner.position()).multiply(1.0, 0.0, 1.0).normalize();
            owner.level().broadcastEntityEvent(owner, EVENT_CHARGE);
            owner.playSound(SoundEvents.RAVAGER_ROAR, 1.2F, 0.7F);
        }

        @Override
        public void stop() {
            KilnbornEntity.this.chargeCooldown = 160 + KilnbornEntity.this.random.nextInt(80);
        }

        @Override
        public boolean requiresUpdateEveryTick() {
            return true;
        }

        @Override
        public void tick() {
            this.ticksRunning++;
            KilnbornEntity owner = KilnbornEntity.this;
            LivingEntity target = owner.getTarget();
            if (target != null && this.ticksRunning % 5 == 0) {
                // Gentle steering: kilns do not corner well.
                Vec3 toTarget = target.position().subtract(owner.position()).multiply(1.0, 0.0, 1.0).normalize();
                this.direction = this.direction.scale(0.8).add(toTarget.scale(0.2)).normalize();
            }

            owner.setYRot((float) (Mth.atan2(this.direction.z, this.direction.x) * Mth.RAD_TO_DEG) - 90.0F);
            owner.setDeltaMovement(
                    this.direction.x * 0.55,
                    owner.getDeltaMovement().y,
                    this.direction.z * 0.55);

            if (owner.level() instanceof ServerLevel level) {
                level.sendParticles(ParticleTypes.FLAME,
                        owner.getX(), owner.getY() + 0.3, owner.getZ(), 2, 0.3, 0.1, 0.3, 0.01);

                // Bowl over everything in the lane.
                AABB lane = owner.getBoundingBox().inflate(0.6);
                for (LivingEntity victim : level.getEntitiesOfClass(LivingEntity.class, lane,
                        entity -> entity != owner && !(entity instanceof SeamMob))) {
                    victim.hurtServer(level, owner.damageSources().mobAttack(owner),
                            8.0F + 2.0F * owner.getTier());
                    victim.setDeltaMovement(this.direction.x * 1.2, 0.5, this.direction.z * 1.2);
                    victim.hurtMarked = true;
                    victim.setRemainingFireTicks(Math.max(victim.getRemainingFireTicks(), 60));
                    this.ticksRunning = MAX_DURATION; // impact ends the charge
                }
            }

            if (owner.horizontalCollision) {
                // Ran into a wall: ring every bell in the parish.
                owner.playSound(SoundEvents.DECORATED_POT_SHATTER, 1.5F, 0.5F);
                this.ticksRunning = MAX_DURATION;
            }
        }
    }
}
