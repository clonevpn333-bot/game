package com.gildedseam.block;

import com.gildedseam.infection.SeamHelper;
import com.gildedseam.registry.ModBlocks;
import com.gildedseam.registry.ModEntities;

import com.mojang.serialization.MapCodec;

import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.IntegerProperty;

/**
 * The kiln-heart: a buried furnace organ of stacked porcelain chambers
 * around a molten gold core. It matures through four firing stages
 * ({@code AGE 0-3}), gilding the ground around it, laying vein runners,
 * and — once white-hot — firing new vessels out into the world.
 *
 * <p>Break the heart and the local outbreak loses its forge: seamstone
 * stops creeping and nothing new is fired until another heart is laid.</p>
 */
public class KilnHeartBlock extends Block {
    public static final MapCodec<KilnHeartBlock> CODEC = simpleCodec(KilnHeartBlock::new);
    public static final IntegerProperty AGE = BlockStateProperties.AGE_3;

    public KilnHeartBlock(Properties properties) {
        super(properties);
        this.registerDefaultState(this.stateDefinition.any().setValue(AGE, 0));
    }

    @Override
    protected MapCodec<? extends Block> codec() {
        return CODEC;
    }

    @Override
    protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
        builder.add(AGE);
    }

    @Override
    protected void randomTick(BlockState state, ServerLevel level, BlockPos pos, RandomSource random) {
        int age = state.getValue(AGE);

        // Mature.
        if (age < 3 && random.nextInt(3) == 0) {
            level.setBlock(pos, state.setValue(AGE, age + 1), Block.UPDATE_CLIENTS);
            level.playSound(null, pos, SoundEvents.DECORATED_POT_INSERT, SoundSource.BLOCKS, 1.0F,
                    0.7F + 0.15F * age);
            return;
        }

        // Gild the surroundings: convert ground, strip forests, lay runners.
        for (int attempt = 0; attempt < 2 + age; attempt++) {
            BlockPos targetPos = pos.offset(
                    random.nextInt(9) - 4,
                    random.nextInt(5) - 2,
                    random.nextInt(9) - 4);
            BlockState target = level.getBlockState(targetPos);
            if (SeamHelper.gildWorld(level, targetPos, random)) {
                break;
            }
            if (target.isAir() && random.nextInt(3) == 0) {
                BlockState vein = ModBlocks.GILDED_VEIN.defaultBlockState();
                if (level.getBlockState(targetPos.below()).isFaceSturdy(level, targetPos.below(),
                        net.minecraft.core.Direction.UP)) {
                    level.setBlockAndUpdate(targetPos, vein);
                    break;
                }
            }
        }

        // A white-hot heart fires new vessels.
        if (age == 3 && random.nextInt(4) == 0 && !SeamHelper.isMobCapped(level, pos)) {
            fireMob(level, pos, random);
        }

        // The breach: gold thread follows heat. A mature heart standing near
        // a nether portal spools itself through and seeds a heart on the
        // other side — the portal streams gold the whole while.
        if (age == 3 && random.nextInt(8) == 0) {
            tryBreachNether(level, pos);
        }

        // The Unmaking: past a certain saturation the heart stops replacing
        // the world and starts subtracting it. Break the heart to stop it.
        if (age == 3 && random.nextInt(24) == 0
                && SeamHelper.countSeamNear(level, pos, 6, 48) >= 40) {
            com.gildedseam.infection.Unmaking.begin(level, pos);
        }
    }

    private static void tryBreachNether(ServerLevel level, BlockPos pos) {
        if (level.dimension() != net.minecraft.world.level.Level.OVERWORLD) {
            return;
        }
        BlockPos portalPos = null;
        for (BlockPos candidate : BlockPos.betweenClosed(pos.offset(-8, -4, -8), pos.offset(8, 4, 8))) {
            if (level.getBlockState(candidate).is(net.minecraft.world.level.block.Blocks.NETHER_PORTAL)) {
                portalPos = candidate.immutable();
                break;
            }
        }
        if (portalPos == null) {
            return;
        }
        ServerLevel nether = level.getServer().getLevel(net.minecraft.world.level.Level.NETHER);
        if (nether == null) {
            return;
        }
        BlockPos seed = findNetherSeedPos(nether, portalPos.getX() / 8, portalPos.getZ() / 8);
        if (seed == null || SeamHelper.countSeamNear(nether, seed, 8, 4) > 0) {
            return;
        }
        nether.setBlockAndUpdate(seed, ModBlocks.KILN_HEART.defaultBlockState());
        for (net.minecraft.core.Direction dir : net.minecraft.core.Direction.Plane.HORIZONTAL) {
            BlockPos side = seed.relative(dir);
            if (nether.getBlockState(side).isAir()) {
                nether.setBlockAndUpdate(side, ModBlocks.GILDED_VEIN.defaultBlockState());
            }
        }
        // Both mouths of the thread announce it.
        level.playSound(null, portalPos, SoundEvents.PORTAL_TRIGGER, SoundSource.BLOCKS, 2.0F, 0.5F);
        level.playSound(null, portalPos, SoundEvents.AMETHYST_BLOCK_RESONATE, SoundSource.BLOCKS, 2.0F, 0.5F);
        level.sendParticles(ParticleTypes.WAX_ON,
                portalPos.getX() + 0.5, portalPos.getY() + 1.0, portalPos.getZ() + 0.5,
                80, 0.6, 1.4, 0.6, 0.15);
        nether.playSound(null, seed, SoundEvents.DECORATED_POT_SHATTER, SoundSource.BLOCKS, 2.0F, 0.4F);
        nether.sendParticles(ParticleTypes.WAX_ON,
                seed.getX() + 0.5, seed.getY() + 1.0, seed.getZ() + 0.5, 60, 1.0, 1.0, 1.0, 0.1);
    }

    private static BlockPos findNetherSeedPos(ServerLevel nether, int x, int z) {
        for (int y = 96; y > 34; y--) {
            BlockPos pos = new BlockPos(x, y, z);
            if (nether.getBlockState(pos).isAir() && !nether.getBlockState(pos.below()).isAir()
                    && nether.getBlockState(pos.below()).isSolidRender()) {
                return pos;
            }
        }
        return null;
    }

    private static void fireMob(ServerLevel level, BlockPos pos, RandomSource random) {
        int saturation = SeamHelper.countSeamNear(level, pos, 6, 48);
        EntityType<? extends Mob> type = pickType(random, saturation);

        Mob mob = type.create(level, EntitySpawnReason.SPAWNER);
        if (mob == null) {
            return;
        }
        BlockPos spawnPos = SeamHelper.findSpawnPos(level, pos, random, 3);
        mob.snapTo(spawnPos.getX() + 0.5, spawnPos.getY(), spawnPos.getZ() + 0.5,
                random.nextFloat() * 360.0F, 0.0F);
        mob.finalizeSpawn(level, level.getCurrentDifficultyAt(spawnPos), EntitySpawnReason.SPAWNER, null);
        level.addFreshEntity(mob);

        level.playSound(null, pos, SoundEvents.DECORATED_POT_SHATTER, SoundSource.BLOCKS, 1.2F, 0.6F);
        level.sendParticles(ParticleTypes.FLAME,
                pos.getX() + 0.5, pos.getY() + 1.0, pos.getZ() + 0.5, 12, 0.4, 0.5, 0.4, 0.01);
        level.sendParticles(ParticleTypes.WAX_ON,
                spawnPos.getX() + 0.5, spawnPos.getY() + 0.8, spawnPos.getZ() + 0.5, 20, 0.5, 0.8, 0.5, 0.05);
    }

    private static EntityType<? extends Mob> pickType(RandomSource random, int saturation) {
        // Young hearts fire chaff; saturated hearts fire the crazing broods.
        if (saturation >= 24) {
            int roll = random.nextInt(100);
            if (roll < 25) return ModEntities.SEAMSTRESS;
            if (roll < 45) return ModEntities.KILNBORN;
            if (roll < 60) return ModEntities.CHIME;
            if (roll < 66) return ModEntities.FONT_OF_GOLD;
            if (roll < 70) return ModEntities.MANIFOLD;
            if (roll < 85) return ModEntities.VESSEL;
            return ModEntities.SHARDLING;
        }
        int roll = random.nextInt(100);
        if (roll < 45) return ModEntities.SHARDLING;
        if (roll < 75) return ModEntities.VESSEL;
        return ModEntities.PORCELAIN_HOUND;
    }

    @Override
    public void animateTick(BlockState state, Level level, BlockPos pos, RandomSource random) {
        int age = state.getValue(AGE);
        for (int i = 0; i <= age; i++) {
            if (random.nextInt(3) == 0) {
                level.addParticle(ParticleTypes.WAX_ON,
                        pos.getX() + random.nextDouble(),
                        pos.getY() + 1.0 + random.nextDouble() * 0.3,
                        pos.getZ() + random.nextDouble(),
                        0.0, 0.03, 0.0);
            }
        }
        if (age == 3 && random.nextInt(4) == 0) {
            level.addParticle(ParticleTypes.FLAME,
                    pos.getX() + 0.35 + random.nextDouble() * 0.3,
                    pos.getY() + 0.9,
                    pos.getZ() + 0.35 + random.nextDouble() * 0.3,
                    0.0, 0.02, 0.0);
        }
        if (random.nextInt(10) == 0) {
            level.playLocalSound(pos.getX() + 0.5, pos.getY() + 0.5, pos.getZ() + 0.5,
                    SoundEvents.CAMPFIRE_CRACKLE, SoundSource.BLOCKS,
                    0.5F + random.nextFloat() * 0.3F, 0.5F, false);
        }
    }
}
