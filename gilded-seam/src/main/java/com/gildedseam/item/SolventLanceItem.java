package com.gildedseam.item;

import com.gildedseam.entity.SaltDartEntity;

import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.ItemUseAnimation;
import net.minecraft.world.level.Level;

/**
 * The Solvent Lance - the only thing that hurts the Creaking.
 *
 * <p>It is not a rifle you spam. Holding right-click works the pump: the
 * charge builds over about a second and a half, the model walks through its
 * reload states as it goes, and releasing early throws a weak shot. Held to
 * full it fires a solvent charge heavy enough to matter to a boss, and the
 * recoil shoves you backwards.
 *
 * <p>The reload is the fight's rhythm. You cannot hold the trigger down while
 * the hand is beating on you; you have to buy the pump with distance, which is
 * what the minion waves are really for.
 */
public class SolventLanceItem extends Item {
    /** Ticks of pumping for a full charge. */
    public static final int FULL_CHARGE = 30;
    private static final int COOLDOWN_TICKS = 12;

    public SolventLanceItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResult use(Level level, Player player, InteractionHand hand) {
        player.startUsingItem(hand);
        if (!level.isClientSide()) {
            level.playSound(null, player.blockPosition(), SoundEvents.PISTON_CONTRACT,
                    SoundSource.PLAYERS, 0.8F, 0.7F);
        }
        return InteractionResult.CONSUME;
    }

    @Override
    public ItemUseAnimation getUseAnimation(ItemStack stack) {
        return ItemUseAnimation.BOW;
    }

    @Override
    public int getUseDuration(ItemStack stack, LivingEntity entity) {
        return 72000;
    }

    /** Fired when the trigger is released. */
    @Override
    public boolean releaseUsing(ItemStack stack, Level level, LivingEntity entity,
            int timeLeft) {
        if (!(entity instanceof Player player)) {
            return false;
        }
        int used = this.getUseDuration(stack, entity) - timeLeft;
        float charge = Math.min(1.0F, used / (float) FULL_CHARGE);
        if (charge < 0.25F) {
            return false;
        }

        if (level instanceof ServerLevel serverLevel) {
            SaltDartEntity bolt = new SaltDartEntity(serverLevel, player);
            bolt.setPos(player.getX(), player.getEyeY() - 0.1, player.getZ());
            bolt.shootFromRotation(player, player.getXRot(), player.getYRot(), 0.0F,
                    1.6F + 2.6F * charge, 0.3F - 0.22F * charge);
            serverLevel.addFreshEntity(bolt);

            serverLevel.playSound(null, player.blockPosition(), SoundEvents.WARDEN_SONIC_BOOM,
                    SoundSource.PLAYERS, 0.7F + 0.5F * charge, 1.5F - 0.4F * charge);
            serverLevel.playSound(null, player.blockPosition(), SoundEvents.CROSSBOW_SHOOT,
                    SoundSource.PLAYERS, 1.0F, 0.7F);
            // Recoil: a full charge moves you, which matters on a ledge.
            player.push(-player.getLookAngle().x * 0.42F * charge, 0.12F * charge,
                    -player.getLookAngle().z * 0.42F * charge);
            player.getCooldowns().addCooldown(stack, COOLDOWN_TICKS);
            if (player instanceof net.minecraft.server.level.ServerPlayer served) {
                stack.hurtAndBreak(1, serverLevel, served, item -> { });
            }
        }
        return true;
    }

    /** 0 to 1 across the pump, for the model to read. */
    public static float chargeOf(ItemStack stack, LivingEntity entity) {
        if (entity == null || !entity.isUsingItem() || entity.getUseItem() != stack) {
            return 0.0F;
        }
        int used = 72000 - entity.getUseItemRemainingTicks();
        return Math.min(1.0F, used / (float) FULL_CHARGE);
    }
}
