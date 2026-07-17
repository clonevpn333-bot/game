package com.gildedseam.client.render;

import com.gildedseam.GildedSeam;
import com.gildedseam.client.model.ChimeModel;
import com.gildedseam.client.model.ModModelLayers;
import com.gildedseam.client.render.state.ChimeRenderState;
import com.gildedseam.entity.ChimeEntity;

import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.ResourceLocation;

public class ChimeRenderer extends MobRenderer<ChimeEntity, ChimeRenderState, ChimeModel> {
    private static final ResourceLocation TEXTURE = GildedSeam.id("textures/entity/chime.png");

    public ChimeRenderer(EntityRendererProvider.Context context) {
        super(context, new ChimeModel(context.bakeLayer(ModModelLayers.CHIME)), 0.3F);
    }

    @Override
    public ChimeRenderState createRenderState() {
        return new ChimeRenderState();
    }

    @Override
    public void extractRenderState(ChimeEntity entity, ChimeRenderState state, float partialTick) {
        super.extractRenderState(entity, state, partialTick);
        state.tier = entity.getTier();
        state.ringAnimationState.copyFrom(entity.ringAnimationState);
    }

    @Override
    public ResourceLocation getTextureLocation(ChimeRenderState state) {
        return TEXTURE;
    }
}
