package com.gildedseam.registry;

import com.gildedseam.GildedSeam;
import com.gildedseam.block.GildedVeinBlock;
import com.gildedseam.block.KilnHeartBlock;
import com.gildedseam.block.PorcelainBloomBlock;
import com.gildedseam.block.SeamstoneBlock;

import java.util.function.Function;

import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.core.Registry;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;

public final class ModBlocks {
    public static final Block SEAMSTONE = register("seamstone", SeamstoneBlock::new,
            BlockBehaviour.Properties.of()
                    .mapColor(MapColor.QUARTZ)
                    .strength(1.6F, 6.0F)
                    .requiresCorrectToolForDrops()
                    .randomTicks()
                    .sound(SoundType.DECORATED_POT));

    public static final Block GILDED_VEIN = register("gilded_vein", GildedVeinBlock::new,
            BlockBehaviour.Properties.of()
                    .mapColor(MapColor.GOLD)
                    .strength(0.3F)
                    .noOcclusion()
                    .randomTicks()
                    .sound(SoundType.AMETHYST));

    public static final Block PORCELAIN_BLOOM = register("porcelain_bloom", PorcelainBloomBlock::new,
            BlockBehaviour.Properties.of()
                    .mapColor(MapColor.QUARTZ)
                    .strength(0.2F)
                    .noOcclusion()
                    .randomTicks()
                    .lightLevel(state -> 3)
                    .sound(SoundType.DECORATED_POT));

    public static final Block KILN_HEART = register("kiln_heart", KilnHeartBlock::new,
            BlockBehaviour.Properties.of()
                    .mapColor(MapColor.GOLD)
                    .strength(3.0F, 9.0F)
                    .requiresCorrectToolForDrops()
                    .randomTicks()
                    .lightLevel(state -> 7 + state.getValue(KilnHeartBlock.AGE) * 2)
                    .sound(SoundType.DECORATED_POT));

    /** What the deep Seam finally sets into: dead weight, pure gilt. */
    public static final Block GILT_MASS = register("gilt_mass", Block::new,
            BlockBehaviour.Properties.of()
                    .mapColor(MapColor.GOLD)
                    .strength(3.0F, 6.0F)
                    .requiresCorrectToolForDrops()
                    .sound(SoundType.METAL));

    public static final Block FIRED_SHELL = register("fired_shell", Block::new,
            BlockBehaviour.Properties.of()
                    .mapColor(MapColor.QUARTZ)
                    .strength(1.2F, 4.0F)
                    .sound(SoundType.DECORATED_POT));

    private ModBlocks() {
    }

    private static Block register(String name, Function<BlockBehaviour.Properties, Block> factory,
            BlockBehaviour.Properties properties) {
        ResourceKey<Block> key = ResourceKey.create(Registries.BLOCK, GildedSeam.id(name));
        return Registry.register(BuiltInRegistries.BLOCK, key, factory.apply(properties.setId(key)));
    }

    public static void init() {
        // Static initialisers run registration.
    }
}
