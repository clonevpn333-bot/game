package com.gildedseam.item;

import com.gildedseam.registry.ModEffects;

import net.minecraft.core.particles.ParticleTypes;
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
 * Rivening salt: coarse crystals of quenched brine and bone-ash. Rubbed
 * into the seams it makes the golden thread contract and snap — the only
 * field cure for the Gilded infection. Stings like judgement.
 */
public class RiveningSaltItem extends Item {
    public RiveningSaltItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResult use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (!player.hasEffect(ModEffects.GILDED)) {
            return InteractionResult.PASS;
        }

        if (level instanceof ServerLevel serverLevel) {
            player.removeEffect(ModEffects.GILDED);
            serverLevel.playSound(null, player.blockPosition(), SoundEvents.DECORATED_POT_SHATTER,
                    SoundSource.PLAYERS, 1.0F, 1.6F);
            serverLevel.sendParticles(ParticleTypes.WAX_OFF,
                    player.getX(), player.getY() + player.getBbHeight() * 0.5, player.getZ(),
                    24, 0.4, 0.6, 0.4, 0.05);
            stack.consume(1, player);
            player.getCooldowns().addCooldown(stack, 40);
        }
        return InteractionResult.SUCCESS;
    }
}
