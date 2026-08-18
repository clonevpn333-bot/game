package com.gildedseam.client;

import com.gildedseam.client.model.ChimeModel;
import com.gildedseam.client.model.FontOfGoldModel;
import com.gildedseam.client.model.KilnbornModel;
import com.gildedseam.client.model.ManifoldModel;
import com.gildedseam.client.model.ModModelLayers;
import com.gildedseam.client.model.PorcelainHoundModel;
import com.gildedseam.client.model.ReliquaryColossusModel;
import com.gildedseam.client.model.SeamstressModel;
import com.gildedseam.client.model.ShardlingModel;
import com.gildedseam.client.model.VesselModel;
import com.gildedseam.client.render.ChimeRenderer;
import com.gildedseam.client.render.FontOfGoldRenderer;
import com.gildedseam.client.render.KilnbornRenderer;
import com.gildedseam.client.render.ManifoldRenderer;
import com.gildedseam.client.render.PorcelainHoundRenderer;
import com.gildedseam.client.render.ReliquaryColossusRenderer;
import com.gildedseam.client.render.SeamstressRenderer;
import com.gildedseam.client.render.ShardlingRenderer;
import com.gildedseam.client.render.VesselRenderer;
import com.gildedseam.registry.ModEntities;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.rendering.v1.ModelLayerRegistry;
import net.fabricmc.fabric.api.client.rendering.v1.EntityRendererRegistry;

public final class GildedSeamClient implements ClientModInitializer {
    @Override
    public void onInitializeClient() {
        ModelLayerRegistry.registerModelLayer(ModModelLayers.SHARDLING, ShardlingModel::createBodyLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.VESSEL, VesselModel::createBodyLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.PORCELAIN_HOUND, PorcelainHoundModel::createBodyLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.SEAMSTRESS, SeamstressModel::createBodyLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.KILNBORN, KilnbornModel::createBodyLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.CHIME, ChimeModel::createBodyLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.FONT_OF_GOLD, FontOfGoldModel::createBodyLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.MANIFOLD, ManifoldModel::createBodyLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.RELIQUARY_COLOSSUS, ReliquaryColossusModel::createBodyLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.PORCELAIN_AUTARCH,
                com.gildedseam.client.model.PorcelainAutarchModel::createBodyLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.SALT_SWORN,
                com.gildedseam.client.model.SaltSwornModel::createBodyLayer);

        EntityRendererRegistry.register(ModEntities.SHARDLING, ShardlingRenderer::new);
        EntityRendererRegistry.register(ModEntities.VESSEL, VesselRenderer::new);
        EntityRendererRegistry.register(ModEntities.PORCELAIN_HOUND, PorcelainHoundRenderer::new);
        EntityRendererRegistry.register(ModEntities.SEAMSTRESS, SeamstressRenderer::new);
        EntityRendererRegistry.register(ModEntities.KILNBORN, KilnbornRenderer::new);
        EntityRendererRegistry.register(ModEntities.CHIME, ChimeRenderer::new);
        EntityRendererRegistry.register(ModEntities.FONT_OF_GOLD, FontOfGoldRenderer::new);
        EntityRendererRegistry.register(ModEntities.MANIFOLD, ManifoldRenderer::new);
        EntityRendererRegistry.register(ModEntities.RELIQUARY_COLOSSUS, ReliquaryColossusRenderer::new);
        EntityRendererRegistry.register(ModEntities.PORCELAIN_AUTARCH,
                com.gildedseam.client.render.PorcelainAutarchRenderer::new);
        EntityRendererRegistry.register(ModEntities.SALT_SWORN,
                com.gildedseam.client.render.SaltSwornRenderer::new);
        EntityRendererRegistry.register(ModEntities.SALT_DART,
                net.minecraft.client.renderer.entity.ThrownItemRenderer::new);

        ModelLayerRegistry.registerModelLayer(ModModelLayers.GILDED_COW,
                com.gildedseam.client.model.GildedBeastLayers::createGildedCowLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.GILDED_PIG,
                com.gildedseam.client.model.GildedBeastLayers::createGildedPigLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.GILDED_SHEEP,
                com.gildedseam.client.model.GildedBeastLayers::createGildedSheepLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.GILDED_CHICKEN,
                com.gildedseam.client.model.GildedBeastLayers::createGildedChickenLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.GILDED_SPIDER,
                com.gildedseam.client.model.GildedBeastLayers::createGildedSpiderLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.GILDED_CASK,
                com.gildedseam.client.model.GildedBeastLayers::createGildedCaskLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.REFUGEE,
                com.gildedseam.client.model.FolkLayers::createRefugeeLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.GILT_MAD,
                com.gildedseam.client.model.FolkLayers::createGiltMadLayer);
        ModelLayerRegistry.registerModelLayer(ModModelLayers.HALF_SEWN,
                com.gildedseam.client.model.FolkLayers::createHalfSewnLayer);

        registerBeast(ModEntities.GILDED_COW, ModModelLayers.GILDED_COW, "gilded_cow");
        registerBeast(ModEntities.GILDED_PIG, ModModelLayers.GILDED_PIG, "gilded_pig");
        registerBeast(ModEntities.GILDED_SHEEP, ModModelLayers.GILDED_SHEEP, "gilded_sheep");
        registerBeast(ModEntities.GILDED_CHICKEN, ModModelLayers.GILDED_CHICKEN, "gilded_chicken");
        registerBeast(ModEntities.GILDED_SPIDER, ModModelLayers.GILDED_SPIDER, "gilded_spider");
        registerBeast(ModEntities.GILDED_CASK, ModModelLayers.GILDED_CASK, "gilded_cask");

        EntityRendererRegistry.register(ModEntities.REFUGEE, context ->
                new com.gildedseam.client.render.FolkRenderer(context, ModModelLayers.REFUGEE, "refugee", false));
        EntityRendererRegistry.register(ModEntities.GILT_MAD, context ->
                new com.gildedseam.client.render.FolkRenderer(context, ModModelLayers.GILT_MAD, "gilt_mad", false));
        EntityRendererRegistry.register(ModEntities.HALF_SEWN, context ->
                new com.gildedseam.client.render.FolkRenderer(context, ModModelLayers.HALF_SEWN, "half_sewn", true));
    }

    private static void registerBeast(net.minecraft.world.entity.EntityType<com.gildedseam.entity.GildedBeastEntity> type,
            net.minecraft.client.model.geom.ModelLayerLocation layer, String name) {
        EntityRendererRegistry.register(type, context ->
                new com.gildedseam.client.render.GildedBeastRenderer(context, layer, name));
    }
}
