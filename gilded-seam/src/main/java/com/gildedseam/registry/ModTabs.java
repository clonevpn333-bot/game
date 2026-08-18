package com.gildedseam.registry;

import com.gildedseam.GildedSeam;

import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.ItemStack;

/**
 * The mod's own page in the creative inventory.
 *
 * <p>Everything the Amberblight adds lives in one tab of its own rather than
 * being scattered through the vanilla ones, so the whole mod can be browsed
 * in a single place: blocks first, then the tools that fight it, then the
 * bestiary as spawn eggs.
 */
public final class ModTabs {
    public static final ResourceKey<CreativeModeTab> AMBERBLIGHT_KEY =
            ResourceKey.create(Registries.CREATIVE_MODE_TAB, GildedSeam.id("amberblight"));

    public static CreativeModeTab amberblight;

    private ModTabs() {
    }

    public static void init() {
        amberblight = Registry.register(BuiltInRegistries.CREATIVE_MODE_TAB, AMBERBLIGHT_KEY,
                CreativeModeTab.builder(CreativeModeTab.Row.TOP, 0)
                        .title(Component.translatable("itemGroup.gildedseam.amberblight"))
                        .icon(() -> new ItemStack(ModItems.KILN_HEART_ITEM))
                        .displayItems((params, out) -> {
                            // The infection itself.
                            out.accept(ModItems.KILN_HEART_ITEM);
                            out.accept(ModItems.SEAMSTONE_ITEM);
                            out.accept(ModItems.GILDED_VEIN_ITEM);
                            out.accept(ModItems.PORCELAIN_BLOOM_ITEM);
                            out.accept(ModItems.GILT_MASS_ITEM);
                            out.accept(ModItems.FIRED_SHELL_ITEM);

                            // What it leaves behind, and what you make of it.
                            out.accept(ModItems.PORCELAIN_SHARD);
                            out.accept(ModItems.GOLD_THREAD);
                            out.accept(ModItems.RIVENING_SALT);

                            // How you fight back.
                            out.accept(ModItems.KINTSUGI_BLADE);
                            out.accept(ModItems.SALT_RIFLE);
                            out.accept(ModItems.SOLVENT_LANCE);
                            out.accept(ModItems.SALT_DART);
                            out.accept(ModItems.RIVENING_HEART);
                            out.accept(ModItems.AUTARCH_CROWN);
                            out.accept(ModItems.HEARTWOOD_KEY);

                            // The bestiary.
                            out.accept(ModEntities.SHARDLING_SPAWN_EGG);
                            out.accept(ModEntities.VESSEL_SPAWN_EGG);
                            out.accept(ModEntities.PORCELAIN_HOUND_SPAWN_EGG);
                            out.accept(ModEntities.SEAMSTRESS_SPAWN_EGG);
                            out.accept(ModEntities.KILNBORN_SPAWN_EGG);
                            out.accept(ModEntities.CHIME_SPAWN_EGG);
                            out.accept(ModEntities.FONT_OF_GOLD_SPAWN_EGG);
                            out.accept(ModEntities.MANIFOLD_SPAWN_EGG);
                            out.accept(ModEntities.RELIQUARY_COLOSSUS_SPAWN_EGG);
                            out.accept(ModEntities.PORCELAIN_AUTARCH_SPAWN_EGG);
                            out.accept(ModEntities.GILDED_COW_SPAWN_EGG);
                            out.accept(ModEntities.GILDED_PIG_SPAWN_EGG);
                            out.accept(ModEntities.GILDED_SHEEP_SPAWN_EGG);
                            out.accept(ModEntities.GILDED_CHICKEN_SPAWN_EGG);
                            out.accept(ModEntities.GILDED_SPIDER_SPAWN_EGG);
                            out.accept(ModEntities.GILDED_CASK_SPAWN_EGG);
                            out.accept(ModEntities.GILDED_WOLF_SPAWN_EGG);
                            out.accept(ModEntities.GILDED_GOAT_SPAWN_EGG);
                            out.accept(ModEntities.GILDED_HARE_SPAWN_EGG);
                            out.accept(ModEntities.GILDED_FOX_SPAWN_EGG);
                            out.accept(ModEntities.GILDED_CAT_SPAWN_EGG);
                            out.accept(ModEntities.GILDED_HORSE_SPAWN_EGG);
                            out.accept(ModEntities.GILDED_LLAMA_SPAWN_EGG);
                            out.accept(ModEntities.HALF_SEWN_SPAWN_EGG);

                            // The living.
                            out.accept(ModEntities.SALT_SWORN_SPAWN_EGG);
                            out.accept(ModEntities.REFUGEE_SPAWN_EGG);
                            out.accept(ModEntities.GILT_MAD_SPAWN_EGG);
                        })
                        .build());
    }
}
