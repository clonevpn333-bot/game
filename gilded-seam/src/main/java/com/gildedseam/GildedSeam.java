package com.gildedseam;

import com.gildedseam.infection.SeamConversion;
import com.gildedseam.registry.ModBlocks;
import com.gildedseam.registry.ModEffects;
import com.gildedseam.registry.ModEntities;
import com.gildedseam.registry.ModItems;
import com.gildedseam.registry.ModSpawns;
import com.gildedseam.registry.ModTabs;

import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.entity.event.v1.ServerLivingEntityEvents;
import net.minecraft.resources.Identifier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The Gilded Seam — a porcelain infection.
 *
 * <p>A parasitic golden thread that "mends" the living and the dead into
 * glazed porcelain vessels, fires them ever harder in kiln-hearts, and
 * stitches the world shut one crack at a time. The deeper the Seam feeds,
 * the higher its firing tier climbs: Bisque, then Stoneware, then Lustre —
 * bigger bodies, harder glaze, and more gilded limbs than anything needs.</p>
 */
public final class GildedSeam implements ModInitializer {
    public static final String MOD_ID = "gildedseam";
    public static final Logger LOGGER = LoggerFactory.getLogger("The Gilded Seam");

    @Override
    public void onInitialize() {
        ModBlocks.init();
        ModItems.init();
        ModEffects.init();
        ModEntities.init();
        ModSpawns.init();
        ModTabs.init();

        ServerLivingEntityEvents.AFTER_DEATH.register(SeamConversion::onLivingDeath);
        net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents.END_SERVER_TICK
                .register(com.gildedseam.infection.RiveningCascade::tickAll);
        net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents.END_SERVER_TICK
                .register(com.gildedseam.infection.Quickening::tickAll);
        net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents.END_SERVER_TICK
                .register(com.gildedseam.infection.Unmaking::tickAll);
        // The Mother Tree is not an item you place. It is already there when
        // you arrive, at world spawn, and everything else radiates from it.
        net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents.SERVER_STARTED
                .register(com.gildedseam.infection.Rooting::onServerStarted);

        LOGGER.info("The Gilded Seam is threading its first needle.");
    }

    public static Identifier id(String path) {
        return Identifier.fromNamespaceAndPath(MOD_ID, path);
    }
}
