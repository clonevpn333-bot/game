package com.gildedseam.entity;

import com.gildedseam.infection.SeamConversion;
import com.gildedseam.infection.SeamHelper;

import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.AnimationState;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.ai.navigation.PathNavigation;
import net.minecraft.world.entity.ai.navigation.WallClimberNavigation;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.npc.villager.AbstractVillager;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;

/**
 * <b>Manifold</b> — Stage III, "the surplus."
 *
 * <p>By Lustre firing the Seam has stopped imitating animals. The
 * Manifold is bookkeeping made flesh: every spare arm the hive owed
 * somebody, knotted around a molten core and taught to walk. Eleven
 * hands, no face, a gait like a dropped marionette that keeps arriving.
 * It climbs sheer walls arm-over-arm-over-arm-over-arm, and what it
 * catches, it <i>keeps</i> — dragging victims back into the knot with
 * every strike. Every fifth hand-hold is a constriction that would
 * flatten a barrel.</p>
 */
public class ManifoldEntity extends SeamMob {
    private static final byte EVENT_ATTACK = 64;
    private static final byte EVENT_CONSTRICT = 65;

    private static final EntityDataAccessor<Boolean> DATA_CLIMBING =
            SynchedEntityData.defineId(ManifoldEntity.class, EntityDataSerializers.BOOLEAN);

    public final AnimationState attackAnimationState = new AnimationState();
    public final AnimationState constrictAnimationState = new AnimationState();

    private int grabCount;

    public ManifoldEntity(EntityType<? extends ManifoldEntity> type, Level level) {
        super(type, level);
        this.xpReward = 20;
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Monster.createMonsterAttributes()
                .add(Attributes.MAX_HEALTH, 60.0)
                .add(Attributes.MOVEMENT_SPEED, 0.36)
                .add(Attributes.ATTACK_DAMAGE, 7.0)
                .add(Attributes.KNOCKBACK_RESISTANCE, 0.5)
                .add(Attributes.FOLLOW_RANGE, 48.0)
                .add(Attributes.STEP_HEIGHT, 1.5);
    }

    @Override
    protected int minimumTier() {
        return SeamHelper.TIER_LUSTRE;
    }

    @Override
    protected double tierScaleStep() {
        return 0.1;
    }

    @Override
    protected PathNavigation createNavigation(Level level) {
        return new WallClimberNavigation(this, level);
    }

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder builder) {
        super.defineSynchedData(builder);
        builder.define(DATA_CLIMBING, false);
    }

    public boolean isClimbing() {
        return this.entityData.get(DATA_CLIMBING);
    }

    @Override
    public boolean onClimbable() {
        return this.isClimbing();
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(1, new FloatGoal(this));
        this.goalSelector.addGoal(4, new MeleeAttackGoal(this, 1.3, true));
        this.goalSelector.addGoal(6, new WaterAvoidingRandomStrollGoal(this, 1.0));
        this.goalSelector.addGoal(7, new LookAtPlayerGoal(this, Player.class, 10.0F));
        this.goalSelector.addGoal(8, new RandomLookAroundGoal(this));

        this.targetSelector.addGoal(1, new HurtByTargetGoal(this).setAlertOthers());
        this.targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, Player.class, true));
        this.targetSelector.addGoal(3, new NearestAttackableTargetGoal<>(this, AbstractVillager.class, true));
    }

    @Override
    public void tick() {
        super.tick();
        if (!this.level().isClientSide()) {
            this.entityData.set(DATA_CLIMBING, this.horizontalCollision);
        }
    }

    @Override
    public boolean doHurtTarget(ServerLevel level, Entity target) {
        boolean hit = super.doHurtTarget(level, target);
        if (!hit) {
            return false;
        }

        this.grabCount++;
        boolean constriction = this.grabCount % 5 == 0;
        this.level().broadcastEntityEvent(this, constriction ? EVENT_CONSTRICT : EVENT_ATTACK);

        if (target instanceof LivingEntity living) {
            SeamConversion.infectOnHit(this, living, this.getTier());

            // Every hand that lands, pulls.
            Vec3 pull = this.position().subtract(living.position()).multiply(1.0, 0.0, 1.0);
            if (pull.lengthSqr() > 1.0E-4) {
                Vec3 velocity = pull.normalize().scale(0.6).add(0.0, 0.2, 0.0);
                living.setDeltaMovement(living.getDeltaMovement().scale(0.2).add(velocity));
                living.hurtMarked = true;
            }
            living.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, 50, 1), this);

            if (constriction) {
                living.hurtServer(level, this.damageSources().mobAttack(this), 6.0F + 2.0F * this.getTier());
                this.playSound(SoundEvents.DECORATED_POT_SHATTER, 1.2F, 0.4F);
            }
        }
        return true;
    }

    @Override
    public void handleEntityEvent(byte id) {
        switch (id) {
            case EVENT_ATTACK -> this.attackAnimationState.start(this.tickCount);
            case EVENT_CONSTRICT -> this.constrictAnimationState.start(this.tickCount);
            default -> super.handleEntityEvent(id);
        }
    }

    @Override
    protected SoundEvent getAmbientSound() {
        // A knot of arms drumming its fingers, all of them.
        return SoundEvents.AMETHYST_CLUSTER_PLACE;
    }

    @Override
    public float getVoicePitch() {
        return 0.55F + this.random.nextFloat() * 0.2F;
    }

    @Override
    protected float nextStep() {
        // Twice the footsteps: there are simply more hands than feet.
        return this.moveDist + 0.35F;
    }
}
