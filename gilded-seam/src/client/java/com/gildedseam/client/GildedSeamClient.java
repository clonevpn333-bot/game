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
import net.fabricmc.fabric.api.client.rendering.v1.EntityModelLayerRegistry;
import net.fabricmc.fabric.api.client.rendering.v1.EntityRendererRegistry;

public final class GildedSeamClient implements ClientModInitializer {
    @Override
    public void onInitializeClient() {
        EntityModelLayerRegistry.registerModelLayer(ModModelLayers.SHARDLING, ShardlingModel::createBodyLayer);
        EntityModelLayerRegistry.registerModelLayer(ModModelLayers.VESSEL, VesselModel::createBodyLayer);
        EntityModelLayerRegistry.registerModelLayer(ModModelLayers.PORCELAIN_HOUND, PorcelainHoundModel::createBodyLayer);
        EntityModelLayerRegistry.registerModelLayer(ModModelLayers.SEAMSTRESS, SeamstressModel::createBodyLayer);
        EntityModelLayerRegistry.registerModelLayer(ModModelLayers.KILNBORN, KilnbornModel::createBodyLayer);
        EntityModelLayerRegistry.registerModelLayer(ModModelLayers.CHIME, ChimeModel::createBodyLayer);
        EntityModelLayerRegistry.registerModelLayer(ModModelLayers.FONT_OF_GOLD, FontOfGoldModel::createBodyLayer);
        EntityModelLayerRegistry.registerModelLayer(ModModelLayers.MANIFOLD, ManifoldModel::createBodyLayer);
        EntityModelLayerRegistry.registerModelLayer(ModModelLayers.RELIQUARY_COLOSSUS, ReliquaryColossusModel::createBodyLayer);

        EntityRendererRegistry.register(ModEntities.SHARDLING, ShardlingRenderer::new);
        EntityRendererRegistry.register(ModEntities.VESSEL, VesselRenderer::new);
        EntityRendererRegistry.register(ModEntities.PORCELAIN_HOUND, PorcelainHoundRenderer::new);
        EntityRendererRegistry.register(ModEntities.SEAMSTRESS, SeamstressRenderer::new);
        EntityRendererRegistry.register(ModEntities.KILNBORN, KilnbornRenderer::new);
        EntityRendererRegistry.register(ModEntities.CHIME, ChimeRenderer::new);
        EntityRendererRegistry.register(ModEntities.FONT_OF_GOLD, FontOfGoldRenderer::new);
        EntityRendererRegistry.register(ModEntities.MANIFOLD, ManifoldRenderer::new);
        EntityRendererRegistry.register(ModEntities.RELIQUARY_COLOSSUS, ReliquaryColossusRenderer::new);
    }
}
