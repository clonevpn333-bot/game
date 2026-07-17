package com.gildedseam.entity;

import com.gildedseam.infection.SeamConversion;
import com.gildedseam.infection.SeamHelper;

import java.util.EnumSet;
import java.util.List;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.util.Mth;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.AnimationState;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
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
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.npc.AbstractVillager;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;

/**
 * <b>Seamstress</b> — Stage II, "the crazing."
 *
 * <p>Too tall, too calm, walking on back-bent stilt legs with four arms
 * working the air like looms. The upper pair throws <i>gold thread</i> —
 * a lash of molten wire that hooks into flesh and reels you across the
 * ground toward her. The lower pair never stops stitching: any wounded
 * seam creature that stays near a seamstress is quietly mended back to
 * wholeness, seam by glowing seam.</p>
 */
public class SeamstressEntity extends SeamMob {
    private static final byte EVENT_ATTACK = 64;
    private static final byte EVENT_LASH = 65;
    private static final byte EVENT_MEND = 66;

    public final AnimationState attackAnimationState = new AnimationState();
    public final AnimationState lashAnimationState = new AnimationState();
    public final AnimationState mendAnimationState = new AnimationState();

    private int lashCooldown;

    public SeamstressEntity(EntityType<? extends SeamstressEntity> type, Level level) {
        super(type, level);
        this.xpReward = 10;
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Monster.createMonsterAttributes()
                .add(Attributes.MAX_HEALTH, 30.0)
                .add(Attributes.MOVEMENT_SPEED, 0.3)
                .add(Attributes.ATTACK_DAMAGE, 5.0)
                .add(Attributes.FOLLOW_RANGE, 40.0)
                .add(Attributes.STEP_HEIGHT, 1.0);
    }

    @Override
    protected int minimumTier() {
        return SeamHelper.TIER_STONEWARE;
    }

    @Override
    protected double tierScaleStep() {
        return 0.12;
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(1, new FloatGoal(this));
        this.goalSelector.addGoal(2, new ThreadLashGoal());
        this.goalSelector.addGoal(3, new MendGoal());
        this.goalSelector.addGoal(4, new MeleeAttackGoal(this, 1.1, false));
        this.goalSelector.addGoal(6, new WaterAvoidingRandomStrollGoal(this, 0.8));
        this.goalSelector.addGoal(7, new LookAtPlayerGoal(this, Player.class, 12.0F));
        this.goalSelector.addGoal(8, new RandomLookAroundGoal(this));

        this.targetSelector.addGoal(1, new HurtByTargetGoal(this).setAlertOthers());
        this.targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, Player.class, true));
        this.targetSelector.addGoal(3, new NearestAttackableTargetGoal<>(this, AbstractVillager.class, true));
    }

    @Override
    public void aiStep() {
        super.aiStep();
        if (!this.level().isClientSide && this.lashCooldown > 0) {
            this.lashCooldown--;
        }
    }

    @Override
    public boolean doHurtTarget(ServerLevel level, Entity target) {
        boolean hit = super.doHurtTarget(level, target);
        if (hit) {
            this.level().broadcastEntityEvent(this, EVENT_ATTACK);
            if (target instanceof LivingEntity living) {
                SeamConversion.infectOnHit(this, living, this.getTier());
            }
        }
        return hit;
    }

    @Override
    public void handleEntityEvent(byte id) {
        switch (id) {
            case EVENT_ATTACK -> this.attackAnimationState.start(this.tickCount);
            case EVENT_LASH -> this.lashAnimationState.start(this.tickCount);
            case EVENT_MEND -> this.mendAnimationState.start(this.tickCount);
            default -> super.handleEntityEvent(id);
        }
    }

    @Override
    protected SoundEvent getAmbientSound() {
        return SoundEvents.AMETHYST_BLOCK_CHIME;
    }

    /** Draws a sparkling thread of particles between the seamstress and a point. */
    private void drawThread(ServerLevel level, Vec3 from, Vec3 to) {
        Vec3 delta = to.subtract(from);
        int steps = Math.max(4, (int) (delta.length() * 3.0));
        for (int i = 0; i <= steps; i++) {
            Vec3 point = from.add(delta.scale(i / (double) steps));
            level.sendParticles(ParticleTypes.WAX_ON, point.x, point.y, point.z, 1, 0.02, 0.02, 0.02, 0.0);
        }
    }

    /**
     * Gold-thread lash: hooks a target 5-14 blocks out, damages it, slows
     * it, and reels it toward the seamstress.
     */
    private class ThreadLashGoal extends Goal {
        private static final int WINDUP = 14;
        private int windupTicks;

        ThreadLashGoal() {
            this.setFlags(EnumSet.of(Goal.Flag.MOVE, Goal.Flag.LOOK));
        }

        @Override
        public boolean canUse() {
            SeamstressEntity owner = SeamstressEntity.this;
            LivingEntity target = owner.getTarget();
            if (owner.lashCooldown > 0 || target == null || !owner.hasLineOfSight(target)) {
                return false;
            }
            double distSq = owner.distanceToSqr(target);
            return distSq >= 5.0 * 5.0 && distSq <= 14.0 * 14.0;
        }

        @Override
        public boolean canContinueToUse() {
            return this.windupTicks > 0 && SeamstressEntity.this.getTarget() != null;
        }

        @Override
        public void start() {
            this.windupTicks = WINDUP;
            SeamstressEntity owner = SeamstressEntity.this;
            owner.getNavigation().stop();
            owner.level().broadcastEntityEvent(owner, EVENT_LASH);
            owner.playSound(SoundEvents.CROSSBOW_LOADING_START.value(), 1.0F, 1.6F);
        }

        @Override
        public boolean requiresUpdateEveryTick() {
            return true;
        }

        @Override
        public void tick() {
            SeamstressEntity owner = SeamstressEntity.this;
            LivingEntity target = owner.getTarget();
            if (target == null) {
                this.windupTicks = 0;
                return;
            }
            owner.getLookControl().setLookAt(target, 30.0F, 30.0F);

            if (--this.windupTicks == 0 && owner.level() instanceof ServerLevel level) {
                if (!owner.hasLineOfSight(target) || owner.distanceToSqr(target) > 16.0 * 16.0) {
                    owner.lashCooldown = 40;
                    return;
                }
                // The hook lands.
                Vec3 hand = owner.position().add(0.0, owner.getBbHeight() * 0.8, 0.0);
                Vec3 chest = target.position().add(0.0, target.getBbHeight() * 0.5, 0.0);
                owner.drawThread(level, hand, chest);

                target.hurtServer(level, owner.damageSources().mobAttack(owner), 3.0F);
                target.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, 80, 1), owner);
                SeamHelper.gild(target, 200, 0);

                // Reel them in.
                Vec3 pull = owner.position().subtract(target.position());
                double distance = pull.length();
                if (distance > 1.0E-4) {
                    Vec3 velocity = pull.normalize().scale(Mth.clamp(distance * 0.18, 0.4, 1.4)).add(0.0, 0.32, 0.0);
                    target.setDeltaMovement(velocity);
                    target.hurtMarked = true;
                }

                level.playSound(null, owner.blockPosition(), SoundEvents.FISHING_BOBBER_RETRIEVE,
                        net.minecraft.sounds.SoundSource.HOSTILE, 1.2F, 0.7F);
                owner.lashCooldown = 100 + owner.random.nextInt(40);
            }
        }
    }

    /**
     * Mending: kneel by the loom-arms and stitch nearby wounded seam
     * creatures back together.
     */
    private class MendGoal extends Goal {
        private static final int DURATION = 30;
        private int ticksLeft;
        private SeamMob patient;

        MendGoal() {
            this.setFlags(EnumSet.of(Goal.Flag.MOVE, Goal.Flag.LOOK));
        }

        @Override
        public boolean canUse() {
            SeamstressEntity owner = SeamstressEntity.this;
            if (owner.random.nextInt(reducedTickDelay(40)) != 0) {
                return false;
            }
            List<SeamMob> wounded = owner.level().getEntitiesOfClass(SeamMob.class,
                    owner.getBoundingBox().inflate(10.0, 4.0, 10.0),
                    mob -> mob != owner && mob.isAlive() && mob.getHealth() < mob.getMaxHealth() * 0.7F);
            if (wounded.isEmpty()) {
                return false;
            }
            this.patient = wounded.get(0);
            return true;
        }

        @Override
        public boolean canContinueToUse() {
            return this.ticksLeft > 0 && this.patient != null && this.patient.isAlive();
        }

        @Override
        public void start() {
            this.ticksLeft = DURATION;
            SeamstressEntity owner = SeamstressEntity.this;
            owner.getNavigation().stop();
            owner.level().broadcastEntityEvent(owner, EVENT_MEND);
            owner.playSound(SoundEvents.DECORATED_POT_INSERT, 1.0F, 1.2F);
        }

        @Override
        public boolean requiresUpdateEveryTick() {
            return true;
        }

        @Override
        public void tick() {
            SeamstressEntity owner = SeamstressEntity.this;
            if (this.patient == null) {
                this.ticksLeft = 0;
                return;
            }
            owner.getLookControl().setLookAt(this.patient, 30.0F, 30.0F);

            if (--this.ticksLeft == 0 && owner.level() instanceof ServerLevel level) {
                this.patient.heal(8.0F + 4.0F * owner.getTier());
                owner.drawThread(level,
                        owner.position().add(0.0, owner.getBbHeight() * 0.6, 0.0),
                        this.patient.position().add(0.0, this.patient.getBbHeight() * 0.5, 0.0));
                level.playSound(null, owner.blockPosition(), SoundEvents.AMETHYST_BLOCK_RESONATE,
                        net.minecraft.sounds.SoundSource.HOSTILE, 1.0F, 1.3F);
            }
        }

        @Override
        public void stop() {
            this.patient = null;
        }
    }
}
