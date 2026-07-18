package com.gildedseam.entity;

import java.util.UUID;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.tags.ItemTags;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.PathfinderMob;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.AvoidEntityGoal;
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
 * <b>Refugee</b> — the scared ones. They run from anything porcelain and
 * hide in the hamlets. Talk to them (right-click, empty hand) and they'll
 * tell you what they saw. Hand them <b>bread</b> (courage) or <b>any
 * sword</b> (a reason) and they rally: from then on they follow you and
 * fight the Seam at your side.
 */
public class RefugeeEntity extends PathfinderMob {
    private static final EntityDataAccessor<Boolean> DATA_RALLIED =
            SynchedEntityData.defineId(RefugeeEntity.class, EntityDataSerializers.BOOLEAN);
    private static final int DIALOGUE_LINES = 4;

    @Nullable
    private UUID leaderId;

    public RefugeeEntity(EntityType<? extends RefugeeEntity> type, Level level) {
        super(type, level);
    }

    public static AttributeSupplier.Builder createAttributes() {
        return PathfinderMob.createMobAttributes()
                .add(Attributes.MAX_HEALTH, 20.0)
                .add(Attributes.MOVEMENT_SPEED, 0.34)
                .add(Attributes.ATTACK_DAMAGE, 4.0)
                .add(Attributes.FOLLOW_RANGE, 24.0);
    }

    public boolean isRallied() {
        return this.entityData.get(DATA_RALLIED);
    }

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder builder) {
        super.defineSynchedData(builder);
        builder.define(DATA_RALLIED, false);
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(1, new FloatGoal(this));
        // Fear, until they find a reason not to be afraid.
        this.goalSelector.addGoal(2, new AvoidEntityGoal<>(this, SeamMob.class, 12.0F, 1.2, 1.5) {
            @Override
            public boolean canUse() {
                return !RefugeeEntity.this.isRallied() && super.canUse();
            }
        });
        this.goalSelector.addGoal(3, new MeleeAttackGoal(this, 1.2, true) {
            @Override
            public boolean canUse() {
                return RefugeeEntity.this.isRallied() && super.canUse();
            }
        });
        this.goalSelector.addGoal(4, new FollowLeaderGoal());
        this.goalSelector.addGoal(6, new WaterAvoidingRandomStrollGoal(this, 0.8));
        this.goalSelector.addGoal(7, new LookAtPlayerGoal(this, Player.class, 8.0F));
        this.goalSelector.addGoal(8, new RandomLookAroundGoal(this));

        this.targetSelector.addGoal(1, new HurtByTargetGoal(this));
        this.targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, SeamMob.class, true) {
            @Override
            public boolean canUse() {
                return RefugeeEntity.this.isRallied() && super.canUse();
            }
        });
    }

    @Override
    protected InteractionResult mobInteract(Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);

        if (!this.isRallied() && (stack.is(Items.BREAD) || stack.is(ItemTags.SWORDS))) {
            if (this.level() instanceof ServerLevel level) {
                stack.consume(1, player);
                this.entityData.set(DATA_RALLIED, true);
                this.leaderId = player.getUUID();
                player.displayClientMessage(
                        Component.translatable("dialogue.gildedseam.refugee.rallied"), false);
                level.sendParticles(ParticleTypes.HAPPY_VILLAGER,
                        this.getX(), this.getY() + 1.5, this.getZ(), 10, 0.4, 0.5, 0.4, 0.0);
                this.playSound(SoundEvents.VILLAGER_YES, 1.0F, 1.0F);
            }
            return InteractionResult.SUCCESS;
        }

        if (stack.isEmpty()) {
            if (!this.level().isClientSide) {
                String key = this.isRallied()
                        ? "dialogue.gildedseam.refugee.rallied_idle"
                        : "dialogue.gildedseam.refugee." + this.random.nextInt(DIALOGUE_LINES);
                player.displayClientMessage(Component.translatable(key), false);
                this.playSound(SoundEvents.VILLAGER_AMBIENT, 1.0F, 1.1F);
            }
            return InteractionResult.SUCCESS;
        }
        return super.mobInteract(player, hand);
    }

    @Override
    protected void addAdditionalSaveData(ValueOutput output) {
        super.addAdditionalSaveData(output);
        output.putBoolean("Rallied", this.isRallied());
        if (this.leaderId != null) {
            output.putString("Leader", this.leaderId.toString());
        }
    }

    @Override
    protected void readAdditionalSaveData(ValueInput input) {
        super.readAdditionalSaveData(input);
        this.entityData.set(DATA_RALLIED, input.getBooleanOr("Rallied", false));
        String id = input.getStringOr("Leader", "");
        this.leaderId = id.isEmpty() ? null : UUID.fromString(id);
    }

    @Override
    protected SoundEvent getAmbientSound() {
        return SoundEvents.VILLAGER_AMBIENT;
    }

    @Override
    public float getVoicePitch() {
        return this.isRallied() ? 1.0F : 1.25F;
    }

    @Override
    public boolean removeWhenFarAway(double distance) {
        return false;
    }

    private class FollowLeaderGoal extends Goal {
        FollowLeaderGoal() {
            this.setFlags(java.util.EnumSet.of(Goal.Flag.MOVE));
        }

        @Override
        public boolean canUse() {
            RefugeeEntity owner = RefugeeEntity.this;
            if (!owner.isRallied() || owner.leaderId == null || owner.getTarget() != null) {
                return false;
            }
            Player leader = owner.level().getPlayerByUUID(owner.leaderId);
            return leader != null && owner.distanceToSqr(leader) > 7.0 * 7.0;
        }

        @Override
        public boolean requiresUpdateEveryTick() {
            return true;
        }

        @Override
        public void tick() {
            RefugeeEntity owner = RefugeeEntity.this;
            Player leader = owner.leaderId == null ? null : owner.level().getPlayerByUUID(owner.leaderId);
            if (leader != null && owner.tickCount % 10 == 0) {
                owner.getNavigation().moveTo(leader, 1.1);
            }
        }
    }
}
