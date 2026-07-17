package com.gildedseam.entity;

import com.gildedseam.infection.SeamConversion;

import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
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
import net.minecraft.world.entity.animal.IronGolem;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.npc.AbstractVillager;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;

/**
 * <b>Vessel</b> — Stage I, "the mended."
 *
 * <p>What the Seam makes of a body it gets to keep: every crack filled
 * with gold, every joint rebuilt in glazed porcelain, the face replaced
 * with a serene, eyeless mask. Vessels walk with the patience of things
 * that have already died once. At Lustre firing the Seam adds a second
 * pair of arms below the first — not because the body needed them, but
 * because the thread had gold left over.</p>
 *
 * <p>Vessels raised from a fresh corpse spend their first two seconds
 * being stitched upright — the {@code rising} animation.</p>
 */
public class VesselEntity extends SeamMob {
    private static final byte EVENT_ATTACK = 64;
    private static final int RISING_DURATION = 44;

    private static final EntityDataAccessor<Boolean> DATA_RISING =
            SynchedEntityData.defineId(VesselEntity.class, EntityDataSerializers.BOOLEAN);

    public final AnimationState attackAnimationState = new AnimationState();
    public final AnimationState risingAnimationState = new AnimationState();

    private int risingTicks;

    public VesselEntity(EntityType<? extends VesselEntity> type, Level level) {
        super(type, level);
        this.xpReward = 6;
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Monster.createMonsterAttributes()
                .add(Attributes.MAX_HEALTH, 22.0)
                .add(Attributes.MOVEMENT_SPEED, 0.25)
                .add(Attributes.ATTACK_DAMAGE, 4.0)
                .add(Attributes.FOLLOW_RANGE, 32.0)
                .add(Attributes.ARMOR, 2.0);
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(1, new FloatGoal(this));
        this.goalSelector.addGoal(4, new MeleeAttackGoal(this, 1.2, false));
        this.goalSelector.addGoal(6, new WaterAvoidingRandomStrollGoal(this, 0.9));
        this.goalSelector.addGoal(7, new LookAtPlayerGoal(this, Player.class, 8.0F));
        this.goalSelector.addGoal(8, new RandomLookAroundGoal(this));

        this.targetSelector.addGoal(1, new HurtByTargetGoal(this).setAlertOthers());
        this.targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, Player.class, true));
        this.targetSelector.addGoal(3, new NearestAttackableTargetGoal<>(this, AbstractVillager.class, true));
        this.targetSelector.addGoal(4, new NearestAttackableTargetGoal<>(this, IronGolem.class, true));
    }

    // --- Rising ---------------------------------------------------------------

    /** Marks this vessel as freshly mended: it spends ~2s being stitched upright. */
    public void beginRising() {
        this.entityData.set(DATA_RISING, true);
        this.risingTicks = RISING_DURATION;
    }

    public boolean isRising() {
        return this.entityData.get(DATA_RISING);
    }

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder builder) {
        super.defineSynchedData(builder);
        builder.define(DATA_RISING, false);
    }

    @Override
    public void tick() {
        super.tick();
        if (this.level().isClientSide) {
            if (this.isRising()) {
                this.risingAnimationState.startIfStopped(this.tickCount);
            } else {
                this.risingAnimationState.stop();
            }
        } else if (this.isRising() && --this.risingTicks <= 0) {
            this.entityData.set(DATA_RISING, false);
        }
    }

    @Override
    protected boolean isImmobile() {
        return super.isImmobile() || this.isRising();
    }

    // --- Combat ------------------------------------------------------------------

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
        if (id == EVENT_ATTACK) {
            this.attackAnimationState.start(this.tickCount);
        } else {
            super.handleEntityEvent(id);
        }
    }

    // --- Persistence ----------------------------------------------------------------

    @Override
    protected void addAdditionalSaveData(ValueOutput output) {
        super.addAdditionalSaveData(output);
        output.putInt("RisingTicks", this.risingTicks);
    }

    @Override
    protected void readAdditionalSaveData(ValueInput input) {
        super.readAdditionalSaveData(input);
        this.risingTicks = input.getIntOr("RisingTicks", 0);
        if (this.risingTicks <= 0) {
            this.entityData.set(DATA_RISING, false);
        }
    }

    // --- Presentation -----------------------------------------------------------------

    @Override
    protected SoundEvent getAmbientSound() {
        return SoundEvents.AMETHYST_BLOCK_CHIME;
    }

    @Override
    protected float getSoundVolume() {
        return 0.6F;
    }
}
