package com.gildedseam.item;

import com.gildedseam.entity.SeamMob;
import com.gildedseam.infection.SeamHelper;
import com.gildedseam.registry.ModBlocks;
import com.gildedseam.registry.ModEffects;

import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;

/**
 * <b>The Rivening Heart</b> — the cure, kept where the King can watch it.
 *
 * <p>A fist of salt crystal grown around the only piece of thread that
 * ever refused to stitch. Struck once, it unsews everything in earshot:
 * the Gilded infection is purged from every living thing nearby, seam
 * blocks crack back into honest stone, and porcelain creatures caught in
 * the wave come apart at every seam. It is not consumed — but it needs
 * ten seconds between beats.</p>
 */
public class RiveningHeartItem extends Item {
    private static final int RADIUS = 12;
    private static final int COOLDOWN_TICKS = 200;
    private static final float SEAM_MOB_DAMAGE = 16.0F;

    public RiveningHeartItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResult useOn(net.minecraft.world.item.context.UseOnContext context) {
        Level level = context.getLevel();
        if (level.getBlockState(context.getClickedPos()).is(ModBlocks.KILN_HEART)
                && level instanceof ServerLevel serverLevel) {
            serverLevel.setBlockAndUpdate(context.getClickedPos(),
                    net.minecraft.world.level.block.Blocks.MAGMA_BLOCK.defaultBlockState());
            com.gildedseam.infection.RiveningCascade.start(serverLevel, context.getClickedPos());
            if (context.getPlayer() != null) {
                context.getPlayer().getCooldowns().addCooldown(context.getItemInHand(), 600);
            }
            return InteractionResult.SUCCESS;
        }
        return super.useOn(context);
    }

    @Override
    public InteractionResult use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (!(level instanceof ServerLevel serverLevel)) {
            return InteractionResult.SUCCESS;
        }

        BlockPos center = player.blockPosition();

        // Purge the infection from everything living.
        for (LivingEntity entity : serverLevel.getEntitiesOfClass(LivingEntity.class,
                player.getBoundingBox().inflate(RADIUS, RADIUS / 2.0, RADIUS))) {
            if (entity instanceof SeamMob seamMob) {
                seamMob.hurtServer(serverLevel, serverLevel.damageSources().magic(), SEAM_MOB_DAMAGE);
            } else {
                entity.removeEffect(ModEffects.GILDED);
            }
        }

        // Unsew the ground.
        for (BlockPos pos : BlockPos.betweenClosed(
                center.offset(-RADIUS, -RADIUS / 2, -RADIUS),
                center.offset(RADIUS, RADIUS / 2, RADIUS))) {
            BlockState state = serverLevel.getBlockState(pos);
            if (state.is(ModBlocks.SEAMSTONE)) {
                serverLevel.setBlockAndUpdate(pos, Blocks.STONE.defaultBlockState());
            } else if (state.is(ModBlocks.GILDED_VEIN) || state.is(ModBlocks.PORCELAIN_BLOOM)) {
                serverLevel.setBlockAndUpdate(pos, Blocks.AIR.defaultBlockState());
            } else if (state.is(ModBlocks.KILN_HEART)) {
                serverLevel.setBlockAndUpdate(pos, Blocks.MAGMA_BLOCK.defaultBlockState());
            }
        }

        serverLevel.playSound(null, center, SoundEvents.DECORATED_POT_SHATTER,
                SoundSource.PLAYERS, 2.0F, 0.6F);
        serverLevel.playSound(null, center, SoundEvents.AMETHYST_BLOCK_RESONATE,
                SoundSource.PLAYERS, 2.0F, 1.8F);
        serverLevel.sendParticles(ParticleTypes.WAX_OFF,
                player.getX(), player.getY() + 1.0, player.getZ(), 120, RADIUS * 0.6, 3.0, RADIUS * 0.6, 0.1);
        serverLevel.sendParticles(ParticleTypes.SNOWFLAKE,
                player.getX(), player.getY() + 1.0, player.getZ(), 60, RADIUS * 0.5, 2.0, RADIUS * 0.5, 0.05);

        player.getCooldowns().addCooldown(stack, COOLDOWN_TICKS);
        return InteractionResult.SUCCESS;
    }

    @Override
    public boolean isFoil(ItemStack stack) {
        return true;
    }
}
