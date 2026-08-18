package com.gildedseam.registry;

import com.gildedseam.GildedSeam;
import com.gildedseam.item.RiveningSaltItem;

import java.util.function.Function;

import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.tags.TagKey;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.Rarity;
import net.minecraft.world.item.SpawnEggItem;
import net.minecraft.world.item.ToolMaterial;
import net.minecraft.world.level.block.Block;
import net.minecraft.tags.BlockTags;

public final class ModItems {
    /** Items that can repair the kintsugi blade (porcelain shards). */
    public static final TagKey<Item> KINTSUGI_REPAIR =
            TagKey.create(Registries.ITEM, GildedSeam.id("kintsugi_repair"));

    /**
     * Fired-and-gilded porcelain: brittle-sharp, quick, mid-tier durability.
     * Repaired with the Seam's own shards, naturally.
     */
    public static final ToolMaterial PORCELAIN_MATERIAL = new ToolMaterial(
            BlockTags.INCORRECT_FOR_IRON_TOOL, 587, 7.0F, 2.5F, 20, KINTSUGI_REPAIR);

    // --- Materials ---------------------------------------------------------

    public static final Item PORCELAIN_SHARD = register("porcelain_shard",
            properties -> new Item(properties));

    public static final Item GOLD_THREAD = register("gold_thread",
            properties -> new Item(properties.rarity(Rarity.UNCOMMON)));

    // --- Tools & cures ------------------------------------------------------

    public static final Item KINTSUGI_BLADE = register("kintsugi_blade",
            properties -> new Item(properties
                    .sword(PORCELAIN_MATERIAL, 3.0F, -2.2F)
                    .rarity(Rarity.RARE)));

    public static final Item RIVENING_SALT = register("rivening_salt",
            properties -> new RiveningSaltItem(properties.stacksTo(16)));

    public static final Item SALT_DART = register("salt_dart",
            properties -> new Item(properties.stacksTo(16)));

    public static final Item SALT_RIFLE = register("salt_rifle",
            properties -> new com.gildedseam.item.SaltRifleItem(
                    properties.stacksTo(1).durability(256).rarity(Rarity.RARE)));

    /** The cure. Found only in the Gilded Palace, under the King's eye. */
    public static final Item RIVENING_HEART = register("rivening_heart",
            properties -> new com.gildedseam.item.RiveningHeartItem(
                    properties.stacksTo(1).rarity(Rarity.EPIC).fireResistant()));

    /** Made from the Sovereign's crown; opens the way into the hollow. */
    public static final Item HEARTWOOD_KEY = register("heartwood_key",
            properties -> new com.gildedseam.item.HeartwoodKeyItem(
                    properties.stacksTo(1).durability(8).rarity(Rarity.EPIC)));

    /** Proof you took the kingdom apart. */
    public static final Item AUTARCH_CROWN = register("autarch_crown",
            properties -> new Item(properties.stacksTo(1).rarity(Rarity.EPIC)));

    // --- Block items --------------------------------------------------------

    public static final Item SEAMSTONE_ITEM = registerBlockItem("seamstone", ModBlocks.SEAMSTONE);
    public static final Item GILDED_VEIN_ITEM = registerBlockItem("gilded_vein", ModBlocks.GILDED_VEIN);
    public static final Item PORCELAIN_BLOOM_ITEM = registerBlockItem("porcelain_bloom", ModBlocks.PORCELAIN_BLOOM);
    public static final Item KILN_HEART_ITEM = registerBlockItem("kiln_heart", ModBlocks.KILN_HEART);
    public static final Item FIRED_SHELL_ITEM = registerBlockItem("fired_shell", ModBlocks.FIRED_SHELL);
    public static final Item GILT_MASS_ITEM = registerBlockItem("gilt_mass", ModBlocks.GILT_MASS);

    private ModItems() {
    }

    private static Item register(String name, Function<Item.Properties, Item> factory) {
        ResourceKey<Item> key = ResourceKey.create(Registries.ITEM, GildedSeam.id(name));
        return Registry.register(BuiltInRegistries.ITEM, key, factory.apply(new Item.Properties().setId(key)));
    }

    private static Item registerBlockItem(String name, Block block) {
        ResourceKey<Item> key = ResourceKey.create(Registries.ITEM, GildedSeam.id(name));
        return Registry.register(BuiltInRegistries.ITEM, key,
                new BlockItem(block, new Item.Properties().setId(key).useBlockDescriptionPrefix()));
    }

    /** Spawn eggs are registered late, once entity types exist. */
    static Item registerSpawnEgg(String name, EntityType<? extends net.minecraft.world.entity.Mob> type) {
        ResourceKey<Item> key = ResourceKey.create(Registries.ITEM, GildedSeam.id(name + "_spawn_egg"));
        return Registry.register(BuiltInRegistries.ITEM, key,
                // 26.2 spawn eggs resolve their entity from the item id
                // (<entity>_spawn_egg), so the type is only used for naming.
                new SpawnEggItem(new Item.Properties().setId(key)));
    }

    public static void init() {
        // Static initialisers run registration.
    }
}
