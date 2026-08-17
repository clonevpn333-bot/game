package com.gildedseam.entity;

import com.gildedseam.infection.SeamConversion;
import com.gildedseam.infection.SeamHelper;
import com.gildedseam.registry.ModDamageTypes;
import com.gildedseam.registry.ModEntities;

import java.util.EnumSet;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.BossEvent;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.AnimationState;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.animal.golem.IronGolem;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

/**
 * <b>Reliquary Colossus</b> — Stage III, "the cathedral."
 *
 * <p>Where an outbreak has fed long enough, the Seam builds itself a
 * church. The Colossus is found sitting — a vast six-armed idol of
 * crazed porcelain, hands folded in three tiers of prayer, dust on its
 * shoulders, gold pooled and hardened in its lap. It does not sleep;
 * it <i>waits to be worshipped</i>. Step into its nave and the head
 * lifts, six arms unfold finger by finger, and the reliquary stands up
 * wearing the roof.</p>
 *
 * <p>In battle it sweeps whole rooms aside, slams the floor hard enough
 * to crack it into shardlings, and — kneeling briefly back into prayer —
 * raises fresh vessels from the ground as if they had always been buried
 * there. Below a third of its health the gold in its lap boils.</p>
 */
public class ReliquaryColossusEntity extends SeamMob {
    private static final byte EVENT_SWEEP = 64;
    private static final byte EVENT_AWAKEN = 65;
    private static final byte EVENT_SLAM = 66;
    private static final byte EVENT_SUMMON = 67;

    private static final EntityDataAccessor<Boolean> DATA_DORMANT =
            SynchedEntityData.defineId(ReliquaryColossusEntity.class, EntityDataSerializers.BOOLEAN);

    private static final int AWAKEN_DURATION = 60;

    public final AnimationState awakenAnimationState = new AnimationState();
    public final AnimationState sweepAnimationState = new AnimationState();
    public final AnimationState slamAnimationState = new AnimationState();
    public final AnimationState summonAnimationState = new AnimationState();

    private final ServerBossEventHolder bossEvent = new ServerBossEventHolder(this);

    private int awakenTicks;
    private int slamCooldown = 100;
    private int summonCooldown = 200;

    public ReliquaryColossusEntity(EntityType<? extends ReliquaryColossusEntity> type, Level level) {
        super(type, level);
        this.xpReward = 80;
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Monster.createMonsterAttributes()
                .add(Attributes.MAX_HEALTH, 300.0)
                .add(Attributes.MOVEMENT_SPEED, 0.23)
                .add(Attributes.ATTACK_DAMAGE, 14.0)
                .add(Attributes.ARMOR, 10.0)
                .add(Attributes.KNOCKBACK_RESISTANCE, 1.0)
                .add(Attributes.FOLLOW_RANGE, 64.0)
                .add(Attributes.STEP_HEIGHT, 1.5)
                .add(Attributes.ATTACK_KNOCKBACK, 2.0);
    }

    @Override
    protected int minimumTier() {
        return SeamHelper.TIER_LUSTRE;
    }

    @Override
    protected double tierScaleStep() {
        return 0.0; // The cathedral is already the size it intends to be.
    }

    // --- Dormancy -----------------------------------------------------------

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder builder) {
        super.defineSynchedData(builder);
        builder.define(DATA_DORMANT, true);
    }

    public boolean isDormant() {
        return this.entityData.get(DATA_DORMANT);
    }

    public boolean isAwakening() {
        return this.awakenTicks > 0;
    }

    private void beginAwakening() {
        if (!this.isDormant() || this.awakenTicks > 0) {
            return;
        }
        this.awakenTicks = AWAKEN_DURATION;
        this.level().broadcastEntityEvent(this, EVENT_AWAKEN);
        this.playSound(SoundEvents.VAULT_OPEN_SHUTTER, 2.0F, 0.5F);
        this.playSound(SoundEvents.AMETHYST_BLOCK_RESONATE, 2.0F, 0.4F);
    }

    @Override
    protected boolean isImmobile() {
        return super.isImmobile() || this.isDormant();
    }

    // --- AI ----------------------------------------------------------------------

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(1, new FloatGoal(this));
        this.goalSelector.addGoal(2, new SlamGoal());
        this.goalSelector.addGoal(3, new SummonCongregationGoal());
        this.goalSelector.addGoal(4, new ColossusMeleeGoal());
        this.goalSelector.addGoal(6, new WaterAvoidingRandomStrollGoal(this, 0.6));
        this.goalSelector.addGoal(7, new LookAtPlayerGoal(this, Player.class, 16.0F));

        this.targetSelector.addGoal(1, new HurtByTargetGoal(this).setAlertOthers());
        this.targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, Player.class, false));
        this.targetSelector.addGoal(3, new NearestAttackableTargetGoal<>(this, IronGolem.class, true));
    }

    @Override
    public void aiStep() {
        super.aiStep();

        if (this.level().isClientSide()) {
            if (!this.isDormant() && this.getHealth() < this.getMaxHealth() / 3.0F
                    && this.random.nextInt(4) == 0) {
                this.level().addParticle(ParticleTypes.FLAME,
                        this.getRandomX(0.7), this.getY() + 1.0 + this.random.nextDouble() * 1.5, this.getRandomZ(0.7),
                        0.0, 0.03, 0.0);
            }
            return;
        }

        if (this.slamCooldown > 0) this.slamCooldown--;
        if (this.summonCooldown > 0) this.summonCooldown--;

        // A worshipper approaches.
        if (this.isDormant() && this.awakenTicks == 0 && this.tickCount % 10 == 0) {
            Player intruder = this.level().getNearestPlayer(this, 11.0);
            if (intruder != null && !intruder.isCreative() && !intruder.isSpectator()) {
                this.beginAwakening();
            }
        }

        if (this.awakenTicks > 0 && --this.awakenTicks == 0) {
            this.entityData.set(DATA_DORMANT, false);
            this.playSound(SoundEvents.DECORATED_POT_SHATTER, 2.0F, 0.3F);
        }

        this.bossEvent.update();
    }

    @Override
    public boolean hurtServer(ServerLevel level, DamageSource source, float amount) {
        // Waking the church the rude way also works.
        if (this.isDormant()) {
            this.beginAwakening();
        }
        // Old porcelain shrugs off arrows: the seams only open for edges held in hands.
        if (source.getDirectEntity() instanceof net.minecraft.world.entity.projectile.Projectile) {
            amount *= 0.5F;
        }
        return super.hurtServer(level, source, amount);
    }

    @Override
    public boolean doHurtTarget(ServerLevel level, Entity target) {
        boolean hit = super.doHurtTarget(level, target);
        if (hit && target instanceof LivingEntity living) {
            SeamConversion.infectOnHit(this, living, this.getTier());
        }
        return hit;
    }

    @Override
    public void handleEntityEvent(byte id) {
        switch (id) {
            case EVENT_SWEEP -> this.sweepAnimationState.start(this.tickCount);
            case EVENT_AWAKEN -> this.awakenAnimationState.start(this.tickCount);
            case EVENT_SLAM -> this.slamAnimationState.start(this.tickCount);
            case EVENT_SUMMON -> this.summonAnimationState.start(this.tickCount);
            default -> super.handleEntityEvent(id);
        }
    }

    // --- Boss bar -------------------------------------------------------------------

    @Override
    public void startSeenByPlayer(ServerPlayer player) {
        super.startSeenByPlayer(player);
        this.bossEvent.event.addPlayer(player);
    }

    @Override
    public void stopSeenByPlayer(ServerPlayer player) {
        super.stopSeenByPlayer(player);
        this.bossEvent.event.removePlayer(player);
    }

    /** Small holder so the boss event can be created after the entity's name exists. */
    private static final class ServerBossEventHolder {
        final net.minecraft.server.level.ServerBossEvent event;
        private final ReliquaryColossusEntity owner;

        ServerBossEventHolder(ReliquaryColossusEntity owner) {
            this.owner = owner;
            this.event = new net.minecraft.server.level.ServerBossEvent(
                    owner.getDisplayName(), BossEvent.BossBarColor.YELLOW, BossEvent.BossBarOverlay.NOTCHED_6);
        }

        void update() {
            this.event.setProgress(this.owner.getHealth() / this.owner.getMaxHealth());
        }
    }

    // --- Persistence -------------------------------------------------------------------

    @Override
    protected void addAdditionalSaveData(ValueOutput output) {
        super.addAdditionalSaveData(output);
        output.putBoolean("Dormant", this.isDormant());
    }

    @Override
    protected void readAdditionalSaveData(ValueInput input) {
        super.readAdditionalSaveData(input);
        this.entityData.set(DATA_DORMANT, input.getBooleanOr("Dormant", true));
        if (this.hasCustomName()) {
            this.bossEvent.event.setName(this.getDisplayName());
        }
    }

    // --- Presentation ----------------------------------------------------------------------

    @Override
    protected SoundEvent getAmbientSound() {
        return this.isDormant() ? null : SoundEvents.AMETHYST_BLOCK_RESONATE;
    }

    @Override
    protected float getSoundVolume() {
        return 2.0F;
    }

    @Override
    public boolean removeWhenFarAway(double distance) {
        return false;
    }

    // --- Goals -----------------------------------------------------------------------------

    /** Melee, but announced: every swing is a two-handed sweep through a wide arc. */
    private class ColossusMeleeGoal extends MeleeAttackGoal {
        ColossusMeleeGoal() {
            super(ReliquaryColossusEntity.this, 1.0, true);
        }

        @Override
        public boolean canUse() {
            return !ReliquaryColossusEntity.this.isDormant()
                    && !ReliquaryColossusEntity.this.isAwakening()
                    && super.canUse();
        }

        @Override
        protected void checkAndPerformAttack(LivingEntity target) {
            if (this.canPerformAttack(target)) {
                this.resetAttackCooldown();
                ReliquaryColossusEntity owner = ReliquaryColossusEntity.this;
                owner.level().broadcastEntityEvent(owner, EVENT_SWEEP);

                if (owner.level() instanceof ServerLevel level) {
                    // The sweep catches everything in the front half-disc.
                    Vec3 facing = Vec3.directionFromRotation(0.0F, owner.getYRot());
                    AABB arc = owner.getBoundingBox().inflate(3.5, 1.0, 3.5);
                    for (LivingEntity victim : level.getEntitiesOfClass(LivingEntity.class, arc,
                            entity -> entity != owner && !(entity instanceof SeamMob))) {
                        Vec3 toVictim = victim.position().subtract(owner.position()).normalize();
                        if (facing.dot(toVictim) > 0.1) {
                            owner.doHurtTarget(level, victim);
                            victim.setDeltaMovement(toVictim.x * 1.4, 0.45, toVictim.z * 1.4);
                            victim.hurtMarked = true;
                        }
                    }
                    level.playSound(null, owner.blockPosition(), SoundEvents.PLAYER_ATTACK_SWEEP,
                            SoundSource.HOSTILE, 2.0F, 0.4F);
                }
            }
        }
    }

    /** Both fists into the floor: shockwave, launched debris, and the floor answers back. */
    private class SlamGoal extends Goal {
        private static final int WINDUP = 22;
        private int windupTicks;

        SlamGoal() {
            this.setFlags(EnumSet.of(Goal.Flag.MOVE, Goal.Flag.LOOK));
        }

        @Override
        public boolean canUse() {
            ReliquaryColossusEntity owner = ReliquaryColossusEntity.this;
            LivingEntity target = owner.getTarget();
            if (owner.isDormant() || owner.isAwakening() || owner.slamCooldown > 0 || target == null) {
                return false;
            }
            double distSq = owner.distanceToSqr(target);
            return distSq <= 7.0 * 7.0 && owner.onGround();
        }

        @Override
        public boolean canContinueToUse() {
            return this.windupTicks > 0;
        }

        @Override
        public void start() {
            this.windupTicks = WINDUP;
            ReliquaryColossusEntity owner = ReliquaryColossusEntity.this;
            owner.getNavigation().stop();
            owner.level().broadcastEntityEvent(owner, EVENT_SLAM);
            owner.playSound(SoundEvents.RAVAGER_ROAR, 2.0F, 0.5F);
        }

        @Override
        public void stop() {
            ReliquaryColossusEntity.this.slamCooldown = 140 + ReliquaryColossusEntity.this.random.nextInt(60);
        }

        @Override
        public boolean requiresUpdateEveryTick() {
            return true;
        }

        @Override
        public void tick() {
            ReliquaryColossusEntity owner = ReliquaryColossusEntity.this;
            if (--this.windupTicks != 0 || !(owner.level() instanceof ServerLevel level)) {
                return;
            }

            level.playSound(null, owner.blockPosition(), SoundEvents.GENERIC_EXPLODE.value(),
                    SoundSource.HOSTILE, 1.6F, 0.6F);
            level.sendParticles(ParticleTypes.EXPLOSION,
                    owner.getX(), owner.getY() + 0.2, owner.getZ(), 4, 1.5, 0.2, 1.5, 0.0);
            level.sendParticles(ParticleTypes.WAX_ON,
                    owner.getX(), owner.getY() + 0.4, owner.getZ(), 40, 2.5, 0.3, 2.5, 0.1);

            for (LivingEntity victim : level.getEntitiesOfClass(LivingEntity.class,
                    owner.getBoundingBox().inflate(5.5, 2.0, 5.5),
                    entity -> entity != owner && !(entity instanceof SeamMob) && entity.onGround())) {
                victim.hurtServer(level,
                        level.damageSources().source(ModDamageTypes.RELIQUARY_SLAM, owner),
                        10.0F + 2.0F * owner.getTier());
                Vec3 away = victim.position().subtract(owner.position()).normalize();
                victim.setDeltaMovement(away.x * 0.9, 0.8, away.z * 0.9);
                victim.hurtMarked = true;
                victim.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, 60, 1), owner);
            }

            // The cracked floor gives up its dead.
            if (!SeamHelper.isMobCapped(level, owner.blockPosition())) {
                for (int i = 0; i < 2; i++) {
                    ShardlingEntity shard = ModEntities.SHARDLING.create(level, EntitySpawnReason.MOB_SUMMONED);
                    if (shard != null) {
                        var pos = SeamHelper.findSpawnPos(level, owner.blockPosition(), owner.random, 4);
                        shard.snapTo(pos.getX() + 0.5, pos.getY(), pos.getZ() + 0.5,
                                owner.random.nextFloat() * 360.0F, 0.0F);
                        shard.setTier(SeamHelper.TIER_STONEWARE);
                        level.addFreshEntity(shard);
                    }
                }
            }
        }
    }

    /** Kneel back into prayer and raise a congregation of vessels. */
    private class SummonCongregationGoal extends Goal {
        private static final int DURATION = 40;
        private int ticksLeft;

        SummonCongregationGoal() {
            this.setFlags(EnumSet.of(Goal.Flag.MOVE, Goal.Flag.LOOK));
        }

        @Override
        public boolean canUse() {
            ReliquaryColossusEntity owner = ReliquaryColossusEntity.this;
            return !owner.isDormant() && !owner.isAwakening()
                    && owner.summonCooldown <= 0 && owner.getTarget() != null
                    && !SeamHelper.isMobCapped((ServerLevel) owner.level(), owner.blockPosition());
        }

        @Override
        public boolean canContinueToUse() {
            return this.ticksLeft > 0;
        }

        @Override
        public void start() {
            this.ticksLeft = DURATION;
            ReliquaryColossusEntity owner = ReliquaryColossusEntity.this;
            owner.getNavigation().stop();
            owner.level().broadcastEntityEvent(owner, EVENT_SUMMON);
            owner.playSound(SoundEvents.EVOKER_PREPARE_SUMMON, 2.0F, 0.6F);
        }

        @Override
        public void stop() {
            ReliquaryColossusEntity.this.summonCooldown = 400 + ReliquaryColossusEntity.this.random.nextInt(200);
        }

        @Override
        public boolean requiresUpdateEveryTick() {
            return true;
        }

        @Override
        public void tick() {
            ReliquaryColossusEntity owner = ReliquaryColossusEntity.this;
            if (--this.ticksLeft != 0 || !(owner.level() instanceof ServerLevel level)) {
                return;
            }

            int raised = 0;
            for (int i = 0; i < 3 && raised < 3; i++) {
                Mob congregant = owner.random.nextBoolean()
                        ? ModEntities.VESSEL.create(level, EntitySpawnReason.MOB_SUMMONED)
                        : ModEntities.SHARDLING.create(level, EntitySpawnReason.MOB_SUMMONED);
                if (congregant == null) {
                    continue;
                }
                var pos = SeamHelper.findSpawnPos(level, owner.blockPosition(), owner.random, 6);
                congregant.snapTo(pos.getX() + 0.5, pos.getY(), pos.getZ() + 0.5,
                        owner.random.nextFloat() * 360.0F, 0.0F);
                if (congregant instanceof SeamMob seamMob) {
                    seamMob.setTier(SeamHelper.TIER_STONEWARE);
                }
                if (congregant instanceof VesselEntity vessel) {
                    vessel.beginRising();
                }
                congregant.setTarget(owner.getTarget());
                level.addFreshEntity(congregant);
                raised++;
            }

            level.playSound(null, owner.blockPosition(), SoundEvents.EVOKER_CAST_SPELL,
                    SoundSource.HOSTILE, 2.0F, 0.5F);
        }
    }
}
