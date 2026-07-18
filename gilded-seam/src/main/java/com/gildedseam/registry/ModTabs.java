package com.gildedseam.registry;

import net.fabricmc.fabric.api.itemgroup.v1.CreativeModeTabEvents;
import net.minecraft.world.item.CreativeModeTabs;

/**
 * Creative inventory placement. (Fabric API renamed ItemGroupEvents to
 * CreativeModeTabEvents in 26.1 to match official names.)
 */
public final class ModTabs {
    private ModTabs() {
    }

    public static void init() {
        CreativeModeTabEvents.modifyEntriesEvent(CreativeModeTabs.INGREDIENTS).register(entries -> {
            entries.accept(ModItems.PORCELAIN_SHARD);
            entries.accept(ModItems.GOLD_THREAD);
            entries.accept(ModItems.RIVENING_SALT);
            entries.accept(ModItems.AUTARCH_CROWN);
        });

        CreativeModeTabEvents.modifyEntriesEvent(CreativeModeTabs.COMBAT).register(entries -> {
            entries.accept(ModItems.KINTSUGI_BLADE);
            entries.accept(ModItems.SALT_RIFLE);
            entries.accept(ModItems.SALT_DART);
            entries.accept(ModItems.RIVENING_HEART);
        });

        CreativeModeTabEvents.modifyEntriesEvent(CreativeModeTabs.NATURAL_BLOCKS).register(entries -> {
            entries.accept(ModItems.SEAMSTONE_ITEM);
            entries.accept(ModItems.GILDED_VEIN_ITEM);
            entries.accept(ModItems.PORCELAIN_BLOOM_ITEM);
            entries.accept(ModItems.KILN_HEART_ITEM);
            entries.accept(ModItems.FIRED_SHELL_ITEM);
            entries.accept(ModItems.GILT_MASS_ITEM);
        });

        CreativeModeTabEvents.modifyEntriesEvent(CreativeModeTabs.SPAWN_EGGS).register(entries -> {
            entries.accept(ModEntities.SHARDLING_SPAWN_EGG);
            entries.accept(ModEntities.VESSEL_SPAWN_EGG);
            entries.accept(ModEntities.PORCELAIN_HOUND_SPAWN_EGG);
            entries.accept(ModEntities.SEAMSTRESS_SPAWN_EGG);
            entries.accept(ModEntities.KILNBORN_SPAWN_EGG);
            entries.accept(ModEntities.CHIME_SPAWN_EGG);
            entries.accept(ModEntities.FONT_OF_GOLD_SPAWN_EGG);
            entries.accept(ModEntities.MANIFOLD_SPAWN_EGG);
            entries.accept(ModEntities.RELIQUARY_COLOSSUS_SPAWN_EGG);
            entries.accept(ModEntities.PORCELAIN_AUTARCH_SPAWN_EGG);
            entries.accept(ModEntities.SALT_SWORN_SPAWN_EGG);
            entries.accept(ModEntities.GILDED_COW_SPAWN_EGG);
            entries.accept(ModEntities.GILDED_PIG_SPAWN_EGG);
            entries.accept(ModEntities.GILDED_SHEEP_SPAWN_EGG);
            entries.accept(ModEntities.GILDED_CHICKEN_SPAWN_EGG);
            entries.accept(ModEntities.GILDED_SPIDER_SPAWN_EGG);
            entries.accept(ModEntities.GILDED_CASK_SPAWN_EGG);
            entries.accept(ModEntities.REFUGEE_SPAWN_EGG);
            entries.accept(ModEntities.GILT_MAD_SPAWN_EGG);
            entries.accept(ModEntities.HALF_SEWN_SPAWN_EGG);
        });
    }
}
