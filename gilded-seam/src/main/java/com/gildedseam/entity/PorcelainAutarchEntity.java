package com.gildedseam.entity;

import com.gildedseam.infection.SeamConversion;
import com.gildedseam.infection.SeamHelper;
import com.gildedseam.registry.ModEntities;

import java.util.EnumSet;
import java.util.List;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.Mth;
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
import net.minecraft.world.phys.Vec3;

/**
 * <b>The Porcelain Autarch</b> — the Overlord King of the Seam.
 *
 * <p>Above the Reliquary Colossus there is exactly one thing, and it does
 * not walk: it is <i>carried</i>. A crowned idol the height of a chapel,
 * borne on a palanquin of eight gilded legs the court grew for the
 * purpose, with six arms, three counter-spinning halo rings, and a chest
 * window in which the original golden thread — the first seam ever sewn —
 * still glows. It waits enthroned in the Gilded Palace, where the cure is
 * kept. The Autarch does not consider you a threat. It considers you
 * <i>unfinished inventory</i>.</p>
 *
 * <p>Abilities: a court-summoning decree, a thread-storm that reels in
 * every player in the nave, a resonance nova when crowded, and sweeping
 * blows that clear pews. Below a third of its health the rings scream.</p>
 */
public class PorcelainAutarchEntity extends SeamMob {
    private static final byte EVENT_SWEEP = 64;
    private static final byte EVENT_AWAKEN = 65;
    private static final byte EVENT_STORM = 66;
    private static final byte EVENT_NOVA = 67;
    private static final byte EVENT_DECREE = 68;

    private static final EntityDataAccessor<Boolean> DATA_DORMANT =
            SynchedEntityData.defineId(PorcelainAutarchEntity.class, EntityDataSerializers.BOOLEAN);

    private static final int AWAKEN_DURATION = 70;

    public final AnimationState awakenAnimationState = new AnimationState();
    public final AnimationState sweepAnimationState = new AnimationState();
    public final AnimationState stormAnimationState = new AnimationState();
    public final AnimationState novaAnimationState = new AnimationState();
    public final AnimationState decreeAnimationState = new AnimationState();

    private final net.minecraft.server.level.ServerBossEvent bossEvent =
            new net.minecraft.server.level.ServerBossEvent(java.util.UUID.randomUUID(), this.getDisplayName(),
                    BossEvent.BossBarColor.RED, BossEvent.BossBarOverlay.NOTCHED_10);

    private int awakenTicks;
    private int stormCooldown = 200;
    private int novaCooldown = 100;
    private int decreeCooldown = 300;

    public PorcelainAutarchEntity(EntityType<? extends PorcelainAutarchEntity> type, Level level) {
        super(type, level);
        this.xpReward = 250;
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Monster.createMonsterAttributes()
                .add(Attributes.MAX_HEALTH, 600.0)
                .add(Attributes.MOVEMENT_SPEED, 0.2)
                .add(Attributes.ATTACK_DAMAGE, 18.0)
                .add(Attributes.ARMOR, 14.0)
                .add(Attributes.ARMOR_TOUGHNESS, 6.0)
                .add(Attributes.KNOCKBACK_RESISTANCE, 1.0)
                .add(Attributes.FOLLOW_RANGE, 80.0)
                .add(Attributes.STEP_HEIGHT, 2.0)
                .add(Attributes.ATTACK_KNOCKBACK, 2.5)
                .add(Attributes.SCALE, 1.75);
    }

    @Override
    protected int minimumTier() {
        return SeamHelper.TIER_LUSTRE;
    }

    @Override
    protected double tierScaleStep() {
        return 0.0;
    }

    // --- Dormancy ------------------------------------------------------------

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
        this.playSound(SoundEvents.VAULT_OPEN_SHUTTER, 2.0F, 0.4F);
        this.playSound(SoundEvents.BELL_RESONATE, 2.0F, 0.5F);
    }

    @Override
    protected boolean isImmobile() {
        return super.isImmobile() || this.isDormant();
    }

    // --- AI --------------------------------------------------------------------

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(1, new FloatGoal(this));
        this.goalSelector.addGoal(2, new ThreadStormGoal());
        this.goalSelector.addGoal(3, new DecreeGoal());
        this.goalSelector.addGoal(4, new AutarchMeleeGoal());
        this.goalSelector.addGoal(6, new WaterAvoidingRandomStrollGoal(this, 0.5));
        this.goalSelector.addGoal(7, new LookAtPlayerGoal(this, Player.class, 20.0F));

        this.targetSelector.addGoal(1, new HurtByTargetGoal(this).setAlertOthers());
        this.targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, Player.class, false));
        this.targetSelector.addGoal(3, new NearestAttackableTargetGoal<>(this, IronGolem.class, true));
    }

    @Override
    public void aiStep() {
        super.aiStep();

        if (this.level().isClientSide()) {
            if (!this.isDormant() && this.random.nextInt(3) == 0) {
                this.level().addParticle(ParticleTypes.WAX_ON,
                        this.getRandomX(0.9), this.getY() + 1.0 + this.random.nextDouble() * 4.0, this.getRandomZ(0.9),
                        0.0, 0.02, 0.0);
            }
            return;
        }
        if (!(this.level() instanceof ServerLevel level)) {
            return;
        }

        if (this.stormCooldown > 0) this.stormCooldown--;
        if (this.novaCooldown > 0) this.novaCooldown--;
        if (this.decreeCooldown > 0) this.decreeCooldown--;

        // A petitioner enters the throne room.
        if (this.isDormant() && this.awakenTicks == 0 && this.tickCount % 10 == 0) {
            Player intruder = level.getNearestPlayer(this, 14.0);
            if (intruder != null && !intruder.isCreative() && !intruder.isSpectator()) {
                this.beginAwakening();
            }
        }
        if (this.awakenTicks > 0 && --this.awakenTicks == 0) {
            this.entityData.set(DATA_DORMANT, false);
            this.playSound(SoundEvents.DECORATED_POT_SHATTER, 2.0F, 0.25F);
        }

        // Resonance nova: the King does not tolerate a crowd at his feet.
        if (!this.isDormant() && this.novaCooldown <= 0) {
            List<Player> tooClose = level.getEntitiesOfClass(Player.class,
                    this.getBoundingBox().inflate(6.0, 3.0, 6.0),
                    player -> !player.isCreative() && !player.isSpectator());
            if (!tooClose.isEmpty()) {
                this.novaCooldown = 200;
                this.level().broadcastEntityEvent(this, EVENT_NOVA);
                level.playSound(null, this.blockPosition(), SoundEvents.BELL_RESONATE,
                        SoundSource.HOSTILE, 3.0F, 0.4F);
                level.sendParticles(ParticleTypes.SONIC_BOOM,
                        this.getX(), this.getY() + 3.0, this.getZ(), 8, 2.5, 1.5, 2.5, 0.0);
                for (LivingEntity victim : level.getEntitiesOfClass(LivingEntity.class,
                        this.getBoundingBox().inflate(8.0, 4.0, 8.0),
                        entity -> entity != this && !(entity instanceof SeamMob))) {
                    victim.hurtServer(level, level.damageSources().sonicBoom(this), 9.0F);
                    Vec3 away = victim.position().subtract(this.position()).multiply(1, 0, 1).normalize();
                    victim.setDeltaMovement(away.x * 1.8, 0.7, away.z * 1.8);
                    victim.hurtMarked = true;
                }
            }
        }

        this.bossEvent.setProgress(this.getHealth() / this.getMaxHealth());
    }

    @Override
    protected boolean canRise() {
        return false;      // bosses die when they die
    }

    @Override
    public boolean hurtServer(ServerLevel level, DamageSource source, float amount) {
        if (this.isDormant()) {
            this.beginAwakening();
        }
        if (source.getDirectEntity() instanceof net.minecraft.world.entity.projectile.Projectile) {
            amount *= 0.4F;
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
            case EVENT_STORM -> this.stormAnimationState.start(this.tickCount);
            case EVENT_NOVA -> this.novaAnimationState.start(this.tickCount);
            case EVENT_DECREE -> this.decreeAnimationState.start(this.tickCount);
            default -> super.handleEntityEvent(id);
        }
    }

    // --- Boss bar / persistence -------------------------------------------------

    @Override
    public void startSeenByPlayer(ServerPlayer player) {
        super.startSeenByPlayer(player);
        this.bossEvent.addPlayer(player);
    }

    @Override
    public void stopSeenByPlayer(ServerPlayer player) {
        super.stopSeenByPlayer(player);
        this.bossEvent.removePlayer(player);
    }

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
            this.bossEvent.setName(this.getDisplayName());
        }
    }

    @Override
    protected SoundEvent getAmbientSound() {
        return this.isDormant() ? null : SoundEvents.AMETHYST_BLOCK_RESONATE;
    }

    @Override
    protected float getSoundVolume() {
        return 2.5F;
    }

    @Override
    public float getVoicePitch() {
        return 0.4F;
    }

    @Override
    public boolean removeWhenFarAway(double distance) {
        return false;
    }

    // --- Goals ---------------------------------------------------------------------

    private class AutarchMeleeGoal extends MeleeAttackGoal {
        AutarchMeleeGoal() {
            super(PorcelainAutarchEntity.this, 1.0, true);
        }

        @Override
        public boolean canUse() {
            return !PorcelainAutarchEntity.this.isDormant()
                    && !PorcelainAutarchEntity.this.isAwakening()
                    && super.canUse();
        }

        @Override
        protected void checkAndPerformAttack(LivingEntity target) {
            if (this.canPerformAttack(target)) {
                this.resetAttackCooldown();
                PorcelainAutarchEntity owner = PorcelainAutarchEntity.this;
                owner.level().broadcastEntityEvent(owner, EVENT_SWEEP);
                if (owner.level() instanceof ServerLevel level) {
                    Vec3 facing = Vec3.directionFromRotation(0.0F, owner.getYRot());
                    for (LivingEntity victim : level.getEntitiesOfClass(LivingEntity.class,
                            owner.getBoundingBox().inflate(4.5, 1.5, 4.5),
                            entity -> entity != owner && !(entity instanceof SeamMob))) {
                        Vec3 toVictim = victim.position().subtract(owner.position()).normalize();
                        if (facing.dot(toVictim) > 0.0) {
                            owner.doHurtTarget(level, victim);
                            victim.setDeltaMovement(toVictim.x * 1.8, 0.5, toVictim.z * 1.8);
                            victim.hurtMarked = true;
                        }
                    }
                    level.playSound(null, owner.blockPosition(), SoundEvents.PLAYER_ATTACK_SWEEP,
                            SoundSource.HOSTILE, 2.5F, 0.35F);
                }
            }
        }
    }

    /** The thread-storm: every player in the nave is hooked and reeled in. */
    private class ThreadStormGoal extends Goal {
        private static final int WINDUP = 30;
        private int windupTicks;

        ThreadStormGoal() {
            this.setFlags(EnumSet.of(Goal.Flag.MOVE, Goal.Flag.LOOK));
        }

        @Override
        public boolean canUse() {
            PorcelainAutarchEntity owner = PorcelainAutarchEntity.this;
            return !owner.isDormant() && !owner.isAwakening()
                    && owner.stormCooldown <= 0 && owner.getTarget() != null;
        }

        @Override
        public boolean canContinueToUse() {
            return this.windupTicks > 0;
        }

        @Override
        public void start() {
            this.windupTicks = WINDUP;
            PorcelainAutarchEntity owner = PorcelainAutarchEntity.this;
            owner.getNavigation().stop();
            owner.level().broadcastEntityEvent(owner, EVENT_STORM);
            owner.playSound(SoundEvents.CROSSBOW_LOADING_START.value(), 2.0F, 0.8F);
        }

        @Override
        public void stop() {
            PorcelainAutarchEntity.this.stormCooldown = 260 + PorcelainAutarchEntity.this.random.nextInt(100);
        }

        @Override
        public boolean requiresUpdateEveryTick() {
            return true;
        }

        @Override
        public void tick() {
            PorcelainAutarchEntity owner = PorcelainAutarchEntity.this;
            if (--this.windupTicks != 0 || !(owner.level() instanceof ServerLevel level)) {
                return;
            }
            for (Player victim : level.getEntitiesOfClass(Player.class,
                    owner.getBoundingBox().inflate(20.0, 8.0, 20.0),
                    player -> !player.isCreative() && !player.isSpectator())) {
                Vec3 pull = owner.position().subtract(victim.position());
                double distance = pull.length();
                if (distance < 1.0E-4) {
                    continue;
                }
                victim.hurtServer(level, owner.damageSources().mobAttack(owner), 6.0F);
                SeamHelper.gild(victim, 300, 1);
                Vec3 velocity = pull.normalize().scale(Mth.clamp(distance * 0.16, 0.5, 1.8)).add(0.0, 0.4, 0.0);
                victim.setDeltaMovement(velocity);
                victim.hurtMarked = true;
            }
            level.playSound(null, owner.blockPosition(), SoundEvents.FISHING_BOBBER_RETRIEVE,
                    SoundSource.HOSTILE, 2.5F, 0.5F);
            level.sendParticles(ParticleTypes.WAX_ON,
                    owner.getX(), owner.getY() + 3.0, owner.getZ(), 80, 8.0, 3.0, 8.0, 0.1);
        }
    }

    /** A decree: the court assembles. */
    private class DecreeGoal extends Goal {
        private static final int DURATION = 40;
        private int ticksLeft;

        DecreeGoal() {
            this.setFlags(EnumSet.of(Goal.Flag.MOVE, Goal.Flag.LOOK));
        }

        @Override
        public boolean canUse() {
            PorcelainAutarchEntity owner = PorcelainAutarchEntity.this;
            return !owner.isDormant() && !owner.isAwakening()
                    && owner.decreeCooldown <= 0 && owner.getTarget() != null
                    && !SeamHelper.isMobCapped((ServerLevel) owner.level(), owner.blockPosition());
        }

        @Override
        public boolean canContinueToUse() {
            return this.ticksLeft > 0;
        }

        @Override
        public void start() {
            this.ticksLeft = DURATION;
            PorcelainAutarchEntity owner = PorcelainAutarchEntity.this;
            owner.getNavigation().stop();
            owner.level().broadcastEntityEvent(owner, EVENT_DECREE);
            owner.playSound(SoundEvents.EVOKER_PREPARE_SUMMON, 2.5F, 0.5F);
        }

        @Override
        public void stop() {
            PorcelainAutarchEntity.this.decreeCooldown = 500 + PorcelainAutarchEntity.this.random.nextInt(200);
        }

        @Override
        public boolean requiresUpdateEveryTick() {
            return true;
        }

        @Override
        public void tick() {
            PorcelainAutarchEntity owner = PorcelainAutarchEntity.this;
            if (--this.ticksLeft != 0 || !(owner.level() instanceof ServerLevel level)) {
                return;
            }
            int roll = owner.random.nextInt(100);
            EntityType<? extends Mob> courtier =
                    roll < 40 ? ModEntities.SEAMSTRESS
                    : roll < 70 ? ModEntities.KILNBORN
                    : ModEntities.MANIFOLD;
            spawnCourtier(level, courtier);
            spawnCourtier(level, ModEntities.SHARDLING);
            spawnCourtier(level, ModEntities.SHARDLING);
            level.playSound(null, owner.blockPosition(), SoundEvents.EVOKER_CAST_SPELL,
                    SoundSource.HOSTILE, 2.5F, 0.4F);
        }

        private void spawnCourtier(ServerLevel level, EntityType<? extends Mob> type) {
            PorcelainAutarchEntity owner = PorcelainAutarchEntity.this;
            Mob courtier = type.create(level, EntitySpawnReason.MOB_SUMMONED);
            if (courtier == null) {
                return;
            }
            var pos = SeamHelper.findSpawnPos(level, owner.blockPosition(), owner.random, 6);
            courtier.snapTo(pos.getX() + 0.5, pos.getY(), pos.getZ() + 0.5,
                    owner.random.nextFloat() * 360.0F, 0.0F);
            if (courtier instanceof SeamMob seamMob) {
                seamMob.setTier(SeamHelper.TIER_LUSTRE);
            }
            courtier.setTarget(owner.getTarget());
            level.addFreshEntity(courtier);
        }
    }
}
