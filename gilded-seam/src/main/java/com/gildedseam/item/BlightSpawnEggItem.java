package com.gildedseam.item;

import com.gildedseam.GildedSeam;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.context.UseOnContext;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockState;

/**
 * A spawn egg that actually holds on to what it spawns.
 *
 * <p>Vanilla's {@code SpawnEggItem} resolves its entity through machinery that
 * has moved repeatedly across versions, and the previous registration passed
 * the {@link EntityType} nowhere at all - every egg in the mod was an item that
 * spawned nothing. This keeps the type in a field and puts the mob in the world
 * itself, so the eggs work regardless of how vanilla wires its own.
 */
public class BlightSpawnEggItem extends Item {

    private final EntityType<? extends Mob> type;

    public BlightSpawnEggItem(EntityType<? extends Mob> type, Properties properties) {
        super(properties);
        this.type = type;
    }

    public EntityType<? extends Mob> getType() {
        return this.type;
    }

    @Override
    public InteractionResult useOn(UseOnContext context) {
        Level level = context.getLevel();
        if (!(level instanceof ServerLevel serverLevel)) {
            return InteractionResult.SUCCESS;
        }

        ItemStack stack = context.getItemInHand();
        BlockPos clicked = context.getClickedPos();
        Direction face = context.getClickedFace();
        BlockState state = level.getBlockState(clicked);

        // Stand the mob on top of the block when clicking a face it can rest
        // on, and beside it otherwise - the same feel as a vanilla egg.
        BlockPos spawnAt = state.getCollisionShape(level, clicked).isEmpty()
                ? clicked
                : clicked.relative(face);

        Entity spawned = this.type.spawn(serverLevel, spawnAt, EntitySpawnReason.SPAWN_ITEM_USE);
        if (spawned == null) {
            GildedSeam.LOGGER.warn("spawn egg for {} produced no entity",
                    EntityType.getKey(this.type));
            return InteractionResult.FAIL;
        }
        spawned.snapTo(spawnAt.getX() + 0.5, spawnAt.getY(), spawnAt.getZ() + 0.5,
                level.getRandom().nextFloat() * 360.0F, 0.0F);

        if (context.getPlayer() == null || !context.getPlayer().hasInfiniteMaterials()) {
            stack.shrink(1);
        }
        return InteractionResult.SUCCESS;
    }
}
