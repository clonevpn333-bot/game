package com.gildedseam.entity;

import com.gildedseam.infection.SeamConversion;

import java.util.EnumSet;
import java.util.List;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
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
import net.minecraft.world.entity.ai.goal.LeapAtTargetGoal;
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
import net.minecraft.world.phys.AABB;

/**
 * <b>Porcelain Hound</b> — Stage I, "the courser."
 *
 * <p>Built greyhound-lean out of fluted vase-work, with a mane of broken
 * saucer-edges and a jaw that opens far past where a jaw should stop.
 * Hunts in loping silence — porcelain paws barely click — until it has
 * your scent, and then it <i>peals</i>: a struck-bell howl that speeds
 * every seam creature in earshot and points them all at you.</p>
 */
public class PorcelainHoundEntity extends SeamMob {
    private static final byte EVENT_ATTACK = 64;
    private static final byte EVENT_HOWL = 65;

    public final AnimationState attackAnimationState = new AnimationState();
    public final AnimationState howlAnimationState = new AnimationState();

    private int howlCooldown;

    public PorcelainHoundEntity(EntityType<? extends PorcelainHoundEntity> type, Level level) {
        super(type, level);
        this.xpReward = 6;
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Monster.createMonsterAttributes()
                .add(Attributes.MAX_HEALTH, 20.0)
                .add(Attributes.MOVEMENT_SPEED, 0.38)
                .add(Attributes.ATTACK_DAMAGE, 4.0)
                .add(Attributes.FOLLOW_RANGE, 40.0)
                .add(Attributes.STEP_HEIGHT, 1.0);
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(1, new FloatGoal(this));
        this.goalSelector.addGoal(2, new PealGoal());
        this.goalSelector.addGoal(3, new LeapAtTargetGoal(this, 0.4F));
        this.goalSelector.addGoal(4, new MeleeAttackGoal(this, 1.4, true));
        this.goalSelector.addGoal(6, new WaterAvoidingRandomStrollGoal(this, 1.0));
        this.goalSelector.addGoal(7, new LookAtPlayerGoal(this, Player.class, 10.0F));
        this.goalSelector.addGoal(8, new RandomLookAroundGoal(this));

        this.targetSelector.addGoal(1, new HurtByTargetGoal(this).setAlertOthers());
        this.targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, Player.class, true));
        this.targetSelector.addGoal(3, new NearestAttackableTargetGoal<>(this, AbstractVillager.class, true));
    }

    @Override
    public void aiStep() {
        super.aiStep();
        if (!this.level().isClientSide && this.howlCooldown > 0) {
            this.howlCooldown--;
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
            case EVENT_HOWL -> this.howlAnimationState.start(this.tickCount);
            default -> super.handleEntityEvent(id);
        }
    }

    @Override
    protected SoundEvent getAmbientSound() {
        return SoundEvents.AMETHYST_CLUSTER_HIT;
    }

    /**
     * The peal: stand, ring like a struck bell, and rally the Seam.
     * Every seam mob within 24 blocks gains speed and inherits the
     * hound's target.
     */
    private class PealGoal extends Goal {
        private static final int DURATION = 36;
        private int ticksLeft;

        PealGoal() {
            this.setFlags(EnumSet.of(Goal.Flag.MOVE, Goal.Flag.LOOK));
        }

        @Override
        public boolean canUse() {
            return PorcelainHoundEntity.this.howlCooldown <= 0
                    && PorcelainHoundEntity.this.getTarget() != null
                    && PorcelainHoundEntity.this.onGround();
        }

        @Override
        public boolean canContinueToUse() {
            return this.ticksLeft > 0 && PorcelainHoundEntity.this.getTarget() != null;
        }

        @Override
        public void start() {
            this.ticksLeft = DURATION;
            PorcelainHoundEntity hound = PorcelainHoundEntity.this;
            hound.getNavigation().stop();
            hound.level().broadcastEntityEvent(hound, EVENT_HOWL);
            hound.playSound(SoundEvents.AMETHYST_BLOCK_RESONATE, 2.0F, 0.55F);
            hound.playSound(SoundEvents.BELL_RESONATE, 1.2F, 0.8F);
        }

        @Override
        public void stop() {
            PorcelainHoundEntity.this.howlCooldown = 400 + PorcelainHoundEntity.this.random.nextInt(200);
        }

        @Override
        public boolean requiresUpdateEveryTick() {
            return true;
        }

        @Override
        public void tick() {
            this.ticksLeft--;
            PorcelainHoundEntity hound = PorcelainHoundEntity.this;
            LivingEntity target = hound.getTarget();
            if (target != null) {
                hound.getLookControl().setLookAt(target, 30.0F, 30.0F);
            }

            if (this.ticksLeft == DURATION / 2 && hound.level() instanceof ServerLevel level) {
                level.sendParticles(ParticleTypes.NOTE,
                        hound.getX(), hound.getY() + 1.4, hound.getZ(), 6, 0.6, 0.4, 0.6, 0.0);
                AABB range = hound.getBoundingBox().inflate(24.0, 12.0, 24.0);
                List<SeamMob> pack = level.getEntitiesOfClass(SeamMob.class, range);
                for (SeamMob ally : pack) {
                    ally.addEffect(new MobEffectInstance(MobEffects.SPEED, 300, 1));
                    if (target != null && ally != hound && ally.getTarget() == null) {
                        ally.setTarget(target);
                    }
                }
                level.playSound(null, hound.blockPosition(), SoundEvents.BELL_BLOCK,
                        SoundSource.HOSTILE, 2.0F, 0.5F);
            }
        }
    }
}
