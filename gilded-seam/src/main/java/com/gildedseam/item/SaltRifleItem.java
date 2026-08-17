package com.gildedseam.item;

import com.gildedseam.entity.SaltDartEntity;
import com.gildedseam.registry.ModItems;

import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;

/**
 * The riving carbine: a long brass-and-porcelain air rifle that fires
 * rivening-salt darts. One dart drops any seam creature short of the
 * crowned ones on the spot; against warm targets it is merely the most
 * humane thing in the mod. Needs {@link ModItems#SALT_DART}s in your
 * inventory (creative mode shoots for free).
 */
public class SaltRifleItem extends Item {
    private static final int COOLDOWN_TICKS = 30;

    public SaltRifleItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResult use(Level level, Player player, InteractionHand hand) {
        ItemStack rifle = player.getItemInHand(hand);

        ItemStack darts = findDarts(player);
        if (darts.isEmpty() && !player.hasInfiniteMaterials()) {
            if (!level.isClientSide()) {
                player.playSound(SoundEvents.DISPENSER_FAIL, 1.0F, 1.2F);
            }
            return InteractionResult.FAIL;
        }

        if (level instanceof ServerLevel serverLevel) {
            SaltDartEntity dart = new SaltDartEntity(serverLevel, player);
            dart.setPos(player.getX(), player.getEyeY() - 0.1, player.getZ());
            dart.shootFromRotation(player, player.getXRot(), player.getYRot(), 0.0F, 3.2F, 0.2F);
            serverLevel.addFreshEntity(dart);

            serverLevel.playSound(null, player.blockPosition(), SoundEvents.CROSSBOW_SHOOT,
                    SoundSource.PLAYERS, 1.0F, 1.5F);
            if (!player.hasInfiniteMaterials()) {
                darts.shrink(1);
            }
            player.getCooldowns().addCooldown(rifle, COOLDOWN_TICKS);
        }
        return InteractionResult.SUCCESS;
    }

    private static ItemStack findDarts(Player player) {
        for (int slot = 0; slot < player.getInventory().getContainerSize(); slot++) {
            ItemStack stack = player.getInventory().getItem(slot);
            if (stack.is(ModItems.SALT_DART)) {
                return stack;
            }
        }
        return ItemStack.EMPTY;
    }
}
