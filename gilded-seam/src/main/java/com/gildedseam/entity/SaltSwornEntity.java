package com.gildedseam.entity;

import com.gildedseam.registry.ModEffects;

import java.util.EnumSet;
import java.util.UUID;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.PathfinderMob;
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
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;

import org.jetbrains.annotations.Nullable;

/**
 * <b>Salt-Sworn</b> — a lamplighter who took the old oath.
 *
 * <p>Not everyone the Seam touched was kept. The Salt-Sworn walk the
 * gilded roads in brine-cured coats, hunting the porcelain with blade,
 * lantern, and pocketfuls of rivening salt. Pay one a <b>gold ingot or an
 * emerald</b> and they'll walk your road instead: following you, cutting
 * down seam creatures on sight, and rubbing the salt into your seams when
 * the gold starts taking you (they cure your Gilded infection, free of
 * further charge). Feed a hired one more gold to patch them up.</p>
 */
public class SaltSwornEntity extends PathfinderMob {
    @Nullable
    private UUID employerId;
    private int cureCooldown;

    public SaltSwornEntity(EntityType<? extends SaltSwornEntity> type, Level level) {
        super(type, level);
        this.xpReward = 0;
    }

    public static AttributeSupplier.Builder createAttributes() {
        return PathfinderMob.createMobAttributes()
                .add(Attributes.MAX_HEALTH, 30.0)
                .add(Attributes.MOVEMENT_SPEED, 0.32)
                .add(Attributes.ATTACK_DAMAGE, 6.0)
                .add(Attributes.FOLLOW_RANGE, 32.0)
                .add(Attributes.ARMOR, 4.0);
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(1, new FloatGoal(this));
        this.goalSelector.addGoal(3, new MeleeAttackGoal(this, 1.25, true));
        this.goalSelector.addGoal(4, new FollowEmployerGoal());
        this.goalSelector.addGoal(6, new WaterAvoidingRandomStrollGoal(this, 0.8));
        this.goalSelector.addGoal(7, new LookAtPlayerGoal(this, Player.class, 8.0F));
        this.goalSelector.addGoal(8, new RandomLookAroundGoal(this));

        this.targetSelector.addGoal(1, new HurtByTargetGoal(this));
        this.targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, SeamMob.class, true));
    }

    public boolean isHired() {
        return this.employerId != null;
    }

    @Nullable
    public Player getEmployer() {
        return this.employerId == null ? null : this.level().getPlayerByUUID(this.employerId);
    }

    @Override
    protected InteractionResult mobInteract(Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        boolean payment = stack.is(Items.GOLD_INGOT) || stack.is(Items.EMERALD);
        if (!payment) {
            return super.mobInteract(player, hand);
        }

        if (this.level() instanceof ServerLevel level) {
            stack.consume(1, player);
            if (!this.isHired()) {
                this.employerId = player.getUUID();
                this.playSound(SoundEvents.VILLAGER_TRADE, 1.0F, 0.9F);
            } else {
                this.heal(10.0F);
                this.playSound(SoundEvents.VILLAGER_YES, 1.0F, 0.9F);
            }
            level.sendParticles(ParticleTypes.HAPPY_VILLAGER,
                    this.getX(), this.getY() + 1.5, this.getZ(), 8, 0.4, 0.5, 0.4, 0.0);
        }
        return InteractionResult.SUCCESS;
    }

    @Override
    public void aiStep() {
        super.aiStep();
        if (this.level().isClientSide()) {
            return;
        }
        if (this.cureCooldown > 0) {
            this.cureCooldown--;
        }

        // The salt is for sharing: cure a gilded employer standing close.
        Player employer = this.getEmployer();
        if (employer != null && this.cureCooldown <= 0
                && employer.hasEffect(ModEffects.GILDED)
                && this.distanceToSqr(employer) < 8.0 * 8.0
                && this.level() instanceof ServerLevel level) {
            employer.removeEffect(ModEffects.GILDED);
            this.cureCooldown = 400;
            level.playSound(null, this.blockPosition(), SoundEvents.DECORATED_POT_SHATTER,
                    net.minecraft.sounds.SoundSource.NEUTRAL, 1.0F, 1.7F);
            level.sendParticles(ParticleTypes.WAX_OFF,
                    employer.getX(), employer.getY() + 1.0, employer.getZ(), 20, 0.4, 0.6, 0.4, 0.05);
        }
    }

    @Override
    protected void addAdditionalSaveData(ValueOutput output) {
        super.addAdditionalSaveData(output);
        if (this.employerId != null) {
            output.putString("Employer", this.employerId.toString());
        }
    }

    @Override
    protected void readAdditionalSaveData(ValueInput input) {
        super.readAdditionalSaveData(input);
        String id = input.getStringOr("Employer", "");
        this.employerId = id.isEmpty() ? null : UUID.fromString(id);
    }

    @Override
    protected SoundEvent getAmbientSound() {
        return SoundEvents.VILLAGER_AMBIENT;
    }

    @Override
    public float getVoicePitch() {
        return 0.8F;
    }

    @Override
    public boolean removeWhenFarAway(double distance) {
        return !this.isHired();
    }

    /** Keeps a hired blade at their employer's shoulder. */
    private class FollowEmployerGoal extends Goal {
        FollowEmployerGoal() {
            this.setFlags(EnumSet.of(Goal.Flag.MOVE));
        }

        @Override
        public boolean canUse() {
            SaltSwornEntity owner = SaltSwornEntity.this;
            Player employer = owner.getEmployer();
            return employer != null && owner.getTarget() == null
                    && owner.distanceToSqr(employer) > 8.0 * 8.0;
        }

        @Override
        public boolean requiresUpdateEveryTick() {
            return true;
        }

        @Override
        public void tick() {
            SaltSwornEntity owner = SaltSwornEntity.this;
            Player employer = owner.getEmployer();
            if (employer == null) {
                return;
            }
            if (owner.tickCount % 10 == 0) {
                owner.getNavigation().moveTo(employer, 1.1);
            }
            if (owner.distanceToSqr(employer) > 40.0 * 40.0) {
                // Lost the trail entirely: catch up the lamplighter way.
                owner.snapTo(employer.getX(), employer.getY(), employer.getZ(),
                        owner.getYRot(), owner.getXRot());
            }
        }
    }
}
