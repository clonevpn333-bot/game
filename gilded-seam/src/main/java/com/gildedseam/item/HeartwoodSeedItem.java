package com.gildedseam.item;

import com.gildedseam.infection.Quickening;

import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.context.UseOnContext;
import net.minecraft.world.level.Level;

/**
 * Plant it, step back, and watch the Mother Tree happen.
 *
 * <p>Structures that appear all at once have no weight - they are simply
 * there, and always were. This one takes about three minutes and you can stand
 * underneath it the whole time while the roots take hold, the buttress swells,
 * the trunk climbs, the boughs are thrown out and the canopy closes over you.
 */
public class HeartwoodSeedItem extends Item {

    public HeartwoodSeedItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResult useOn(UseOnContext context) {
        Level level = context.getLevel();
        if (!(level instanceof ServerLevel serverLevel)) {
            return InteractionResult.SUCCESS;
        }
        if (Quickening.isGrowingNear(serverLevel, context.getClickedPos())) {
            if (context.getPlayer() != null) {
                context.getPlayer().sendOverlayMessage(
                        Component.literal("Something is already growing here."));
            }
            return InteractionResult.FAIL;
        }
        Quickening.begin(serverLevel, context.getClickedPos().above());
        if (context.getPlayer() == null || !context.getPlayer().hasInfiniteMaterials()) {
            context.getItemInHand().shrink(1);
        }
        return InteractionResult.SUCCESS;
    }
}
