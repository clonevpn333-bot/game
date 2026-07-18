package com.gildedseam.entity;

import com.gildedseam.infection.SeamHelper;

import net.minecraft.network.chat.Component;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.PathfinderMob;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;

/**
 * <b>Gilt-Mad</b> — the crazy ones. Prophets of the kiln who walk toward
 * the outbreaks everyone else is fleeing, half-mask of hammered gold over
 * their eyes, ringing a handbell and preaching the Mending. They gild
 * <i>themselves</i> on purpose and consider it devotion. Harmless — to
 * you. Never to themselves.
 */
public class GiltMadEntity extends PathfinderMob {
    private static final int DIALOGUE_LINES = 4;

    public GiltMadEntity(EntityType<? extends GiltMadEntity> type, Level level) {
        super(type, level);
    }

    public static AttributeSupplier.Builder createAttributes() {
        return PathfinderMob.createMobAttributes()
                .add(Attributes.MAX_HEALTH, 20.0)
                .add(Attributes.MOVEMENT_SPEED, 0.3)
                .add(Attributes.FOLLOW_RANGE, 16.0);
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(1, new FloatGoal(this));
        this.goalSelector.addGoal(6, new WaterAvoidingRandomStrollGoal(this, 0.9));
        this.goalSelector.addGoal(7, new LookAtPlayerGoal(this, Player.class, 10.0F));
        this.goalSelector.addGoal(8, new RandomLookAroundGoal(this));
    }

    @Override
    public void aiStep() {
        super.aiStep();
        if (this.level().isClientSide) {
            return;
        }
        // The bell, and the devotion.
        if (this.random.nextInt(300) == 0) {
            this.playSound(SoundEvents.BELL_BLOCK, 1.0F, 1.6F);
        }
        if (this.random.nextInt(600) == 0) {
            SeamHelper.gild(this, 200, 0);
            this.playSound(SoundEvents.VILLAGER_CELEBRATE, 1.0F, 0.8F);
        }
    }

    @Override
    protected InteractionResult mobInteract(Player player, InteractionHand hand) {
        if (player.getItemInHand(hand).isEmpty()) {
            if (!this.level().isClientSide) {
                player.displayClientMessage(Component.translatable(
                        "dialogue.gildedseam.gilt_mad." + this.random.nextInt(DIALOGUE_LINES)), false);
                this.playSound(SoundEvents.BELL_BLOCK, 0.8F, 1.8F);
            }
            return InteractionResult.SUCCESS;
        }
        return super.mobInteract(player, hand);
    }

    @Override
    protected SoundEvent getAmbientSound() {
        return SoundEvents.VILLAGER_AMBIENT;
    }

    @Override
    public float getVoicePitch() {
        return 0.75F;
    }
}
