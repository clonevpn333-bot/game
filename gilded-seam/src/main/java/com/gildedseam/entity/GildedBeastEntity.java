package com.gildedseam.entity;

import com.gildedseam.infection.LustreGifts;
import com.gildedseam.infection.SeamConversion;
import com.gildedseam.infection.SeamHelper;
import com.gildedseam.registry.ModEntities;

import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.AnimationState;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.LeapAtTargetGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.npc.villager.AbstractVillager;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;

/**
 * The gilded livestock: one class, many shapes. Every farmyard animal the
 * Seam keeps comes back through here — the Chinaware Bull, the Tithe
 * Swine, the Thread-Fleece, the Cloche Hen, the Tureen Spider, and the
 * Crackle Cask (a creeper, refired; it does not explode — it
 * <i>disburses</i>). Species differences (stats, sounds, quirks) hang off
 * the {@link EntityType}; mutation stages come from {@link SeamMob}.
 */
public class GildedBeastEntity extends SeamMob {
    private static final byte EVENT_ATTACK = 64;

    public final AnimationState attackAnimationState = new AnimationState();

    public GildedBeastEntity(EntityType<? extends GildedBeastEntity> type, Level level) {
        super(type, level);
        this.xpReward = 5;
    }

    /** Ticks until this one can use its gift again. */
    private int giftCooldown;

    /**
     * At full maturity a blighted animal stops being a bigger version of the
     * stage below and starts doing something the animal never could. Each
     * species gets its own; see {@link LustreGifts}.
     */
    @Override
    public void aiStep() {
        super.aiStep();
        if (!(this.level() instanceof ServerLevel level)) {
            return;
        }
        if (this.giftCooldown > 0) {
            this.giftCooldown--;
            return;
        }
        if (this.getTier() < SeamHelper.TIER_LUSTRE) {
            return;
        }
        LivingEntity target = this.getTarget();
        if (target == null || !target.isAlive() || !this.hasLineOfSight(target)) {
            return;
        }
        int wait = LustreGifts.fire(this, level, target);
        if (wait > 0) {
            // Stagger, so a herd never fires in unison.
            this.giftCooldown = wait + this.random.nextInt(40);
        }
    }

    public static AttributeSupplier.Builder createAttributes(double health, double speed, double damage) {
        return Monster.createMonsterAttributes()
                .add(Attributes.MAX_HEALTH, health)
                .add(Attributes.MOVEMENT_SPEED, speed)
                .add(Attributes.ATTACK_DAMAGE, damage)
                .add(Attributes.FOLLOW_RANGE, 28.0)
                .add(Attributes.STEP_HEIGHT, 1.0);
    }

    private boolean isSpider() {
        return this.getType() == ModEntities.GILDED_SPIDER;
    }

    private boolean isCask() {
        return this.getType() == ModEntities.GILDED_CASK;
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(1, new FloatGoal(this));
        if (this.isSpider() || this.isCask()) {
            this.goalSelector.addGoal(3, new LeapAtTargetGoal(this, 0.4F));
        }
        this.goalSelector.addGoal(4, new MeleeAttackGoal(this, 1.25, true));
        this.goalSelector.addGoal(6, new WaterAvoidingRandomStrollGoal(this, 0.9));
        this.goalSelector.addGoal(7, new LookAtPlayerGoal(this, Player.class, 8.0F));
        this.goalSelector.addGoal(8, new RandomLookAroundGoal(this));

        this.targetSelector.addGoal(1, new HurtByTargetGoal(this).setAlertOthers());
        this.targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, Player.class, true));
        this.targetSelector.addGoal(3, new NearestAttackableTargetGoal<>(this, AbstractVillager.class, true));
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
    public void die(DamageSource source) {
        super.die(source);
        // The Crackle Cask disburses its contents on breaking.
        if (this.isCask() && this.level() instanceof ServerLevel level
                && !SeamHelper.isMobCapped(level, this.blockPosition())) {
            for (int i = 0; i < 2; i++) {
                ShardlingEntity shard = ModEntities.SHARDLING.create(level, EntitySpawnReason.MOB_SUMMONED);
                if (shard != null) {
                    shard.snapTo(this.getX() + (this.random.nextDouble() - 0.5),
                            this.getY(), this.getZ() + (this.random.nextDouble() - 0.5),
                            this.random.nextFloat() * 360.0F, 0.0F);
                    shard.setTier(this.getTier());
                    level.addFreshEntity(shard);
                }
            }
        }
    }

    @Override
    public void handleEntityEvent(byte id) {
        if (id == EVENT_ATTACK) {
            this.attackAnimationState.start(this.tickCount);
        } else {
            super.handleEntityEvent(id);
        }
    }

    @Override
    protected SoundEvent getAmbientSound() {
        return this.isCask() ? SoundEvents.AMETHYST_BLOCK_RESONATE : SoundEvents.DECORATED_POT_STEP;
    }
}
