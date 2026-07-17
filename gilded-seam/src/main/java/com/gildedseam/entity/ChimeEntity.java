package com.gildedseam.entity;

import com.gildedseam.infection.SeamHelper;

import java.util.EnumSet;

import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.AnimationState;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.control.FlyingMoveControl;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.ai.navigation.FlyingPathNavigation;
import net.minecraft.world.entity.ai.navigation.PathNavigation;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;

/**
 * <b>Chime</b> — Stage II, "the bellwether."
 *
 * <p>A serene porcelain mask the size of a shield, hanging in the air
 * where a head has no business being, with a halo of orbiting shard-petals
 * that never quite settle. It drifts just out of reach, tilts as if
 * listening, and then <i>rings</i> — a focused bell-tone you feel in your
 * teeth and your inner ear. The shards are only there to keep you from
 * getting close enough to make it stop.</p>
 */
public class ChimeEntity extends SeamMob {
    private static final byte EVENT_RING = 65;

    public final AnimationState ringAnimationState = new AnimationState();

    private int ringCooldown;

    public ChimeEntity(EntityType<? extends ChimeEntity> type, Level level) {
        super(type, level);
        this.xpReward = 10;
        this.moveControl = new FlyingMoveControl(this, 20, true);
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Monster.createMonsterAttributes()
                .add(Attributes.MAX_HEALTH, 18.0)
                .add(Attributes.MOVEMENT_SPEED, 0.3)
                .add(Attributes.FLYING_SPEED, 0.55)
                .add(Attributes.ATTACK_DAMAGE, 3.0)
                .add(Attributes.FOLLOW_RANGE, 32.0)
                .add(Attributes.FALL_DAMAGE_MULTIPLIER, 0.0)
                .add(Attributes.GRAVITY, 0.0);
    }

    @Override
    protected int minimumTier() {
        return SeamHelper.TIER_STONEWARE;
    }

    @Override
    protected PathNavigation createNavigation(Level level) {
        FlyingPathNavigation navigation = new FlyingPathNavigation(this, level);
        navigation.setCanFloat(true);
        return navigation;
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(2, new RingGoal());
        this.goalSelector.addGoal(3, new HoverNearTargetGoal());
        this.goalSelector.addGoal(5, new DriftGoal());
        this.goalSelector.addGoal(7, new LookAtPlayerGoal(this, Player.class, 16.0F));

        this.targetSelector.addGoal(1, new HurtByTargetGoal(this).setAlertOthers());
        this.targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, Player.class, true));
    }

    @Override
    public void aiStep() {
        super.aiStep();
        if (!this.level().isClientSide && this.ringCooldown > 0) {
            this.ringCooldown--;
        }
        if (this.level().isClientSide && this.random.nextInt(6) == 0) {
            this.level().addParticle(ParticleTypes.END_ROD,
                    this.getRandomX(0.8), this.getY() + 0.3 + this.random.nextDouble() * 0.4, this.getRandomZ(0.8),
                    0.0, -0.01, 0.0);
        }
    }

    @Override
    public void handleEntityEvent(byte id) {
        if (id == EVENT_RING) {
            this.ringAnimationState.start(this.tickCount);
        } else {
            super.handleEntityEvent(id);
        }
    }

    @Override
    protected SoundEvent getAmbientSound() {
        return SoundEvents.AMETHYST_BLOCK_CHIME;
    }

    @Override
    protected void playStepSound(BlockPos pos, net.minecraft.world.level.block.state.BlockState state) {
        // Nothing touches the ground.
    }

    /**
     * The ring: a two-second inhale of stillness, then a directed bell-tone
     * that damages through armor and leaves the ears swimming.
     */
    private class RingGoal extends Goal {
        private static final int WINDUP = 24;
        private int windupTicks;

        RingGoal() {
            this.setFlags(EnumSet.of(Goal.Flag.MOVE, Goal.Flag.LOOK));
        }

        @Override
        public boolean canUse() {
            ChimeEntity owner = ChimeEntity.this;
            LivingEntity target = owner.getTarget();
            return owner.ringCooldown <= 0 && target != null
                    && owner.distanceToSqr(target) <= 18.0 * 18.0
                    && owner.hasLineOfSight(target);
        }

        @Override
        public boolean canContinueToUse() {
            return this.windupTicks > 0 && ChimeEntity.this.getTarget() != null;
        }

        @Override
        public void start() {
            this.windupTicks = WINDUP;
            ChimeEntity owner = ChimeEntity.this;
            owner.getNavigation().stop();
            owner.level().broadcastEntityEvent(owner, EVENT_RING);
            owner.playSound(SoundEvents.AMETHYST_BLOCK_RESONATE, 1.4F, 1.8F);
        }

        @Override
        public boolean requiresUpdateEveryTick() {
            return true;
        }

        @Override
        public void tick() {
            ChimeEntity owner = ChimeEntity.this;
            LivingEntity target = owner.getTarget();
            if (target == null) {
                this.windupTicks = 0;
                return;
            }
            owner.getLookControl().setLookAt(target, 60.0F, 60.0F);

            if (--this.windupTicks == 0 && owner.level() instanceof ServerLevel level) {
                if (!owner.hasLineOfSight(target)) {
                    owner.ringCooldown = 40;
                    return;
                }
                Vec3 source = owner.position().add(0.0, 0.4, 0.0);
                Vec3 destination = target.getEyePosition();
                Vec3 step = destination.subtract(source).normalize();
                for (double d = 1.0; d < source.distanceTo(destination); d += 1.5) {
                    Vec3 point = source.add(step.scale(d));
                    level.sendParticles(ParticleTypes.SONIC_BOOM, point.x, point.y, point.z, 1, 0, 0, 0, 0);
                }

                target.hurtServer(level, level.damageSources().sonicBoom(owner), 5.0F + 2.0F * owner.getTier());
                target.addEffect(new MobEffectInstance(MobEffects.NAUSEA, 140, 0), owner);
                target.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, 60, 0), owner);
                SeamHelper.gild(target, 160, 0);

                level.playSound(null, owner.blockPosition(), SoundEvents.BELL_RESONATE,
                        SoundSource.HOSTILE, 2.0F, 1.4F);
                owner.ringCooldown = 90 + owner.random.nextInt(50);
            }
        }
    }

    /** Keeps a wary hover 7-11 blocks from the target, slightly above. */
    private class HoverNearTargetGoal extends Goal {
        HoverNearTargetGoal() {
            this.setFlags(EnumSet.of(Goal.Flag.MOVE));
        }

        @Override
        public boolean canUse() {
            return ChimeEntity.this.getTarget() != null;
        }

        @Override
        public boolean requiresUpdateEveryTick() {
            return true;
        }

        @Override
        public void tick() {
            ChimeEntity owner = ChimeEntity.this;
            LivingEntity target = owner.getTarget();
            if (target == null || !owner.getNavigation().isDone() && owner.tickCount % 7 != 0) {
                return;
            }
            double distSq = owner.distanceToSqr(target);
            Vec3 away = owner.position().subtract(target.position()).normalize();
            Vec3 goal;
            if (distSq < 6.0 * 6.0) {
                goal = owner.position().add(away.scale(6.0)).add(0.0, 2.0, 0.0);
            } else if (distSq > 12.0 * 12.0) {
                goal = target.position().add(away.scale(9.0)).add(0.0, 3.0, 0.0);
            } else {
                // Orbit sideways.
                Vec3 tangent = new Vec3(-away.z, 0.0, away.x);
                goal = owner.position().add(tangent.scale(4.0)).add(0.0,
                        (owner.random.nextDouble() - 0.4) * 2.0, 0.0);
            }
            owner.getNavigation().moveTo(goal.x, goal.y, goal.z, 1.0);
        }
    }

    /** Idle drift: wander gently through the air near the ground. */
    private class DriftGoal extends Goal {
        DriftGoal() {
            this.setFlags(EnumSet.of(Goal.Flag.MOVE));
        }

        @Override
        public boolean canUse() {
            ChimeEntity owner = ChimeEntity.this;
            return owner.getTarget() == null && owner.getNavigation().isDone()
                    && owner.random.nextInt(reducedTickDelay(40)) == 0;
        }

        @Override
        public void start() {
            ChimeEntity owner = ChimeEntity.this;
            Vec3 goal = owner.position().add(
                    (owner.random.nextDouble() - 0.5) * 12.0,
                    (owner.random.nextDouble() - 0.6) * 4.0,
                    (owner.random.nextDouble() - 0.5) * 12.0);
            owner.getNavigation().moveTo(goal.x, goal.y, goal.z, 0.8);
        }
    }
}
