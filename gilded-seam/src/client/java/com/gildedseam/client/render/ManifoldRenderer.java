package com.gildedseam.client.render;

import com.gildedseam.GildedSeam;
import com.gildedseam.client.model.ManifoldModel;
import com.gildedseam.client.model.ModModelLayers;
import com.gildedseam.client.render.state.ManifoldRenderState;
import com.gildedseam.entity.ManifoldEntity;

import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.ResourceLocation;

public class ManifoldRenderer extends MobRenderer<ManifoldEntity, ManifoldRenderState, ManifoldModel> {
    private static final ResourceLocation TEXTURE = GildedSeam.id("textures/entity/manifold.png");

    public ManifoldRenderer(EntityRendererProvider.Context context) {
        super(context, new ManifoldModel(context.bakeLayer(ModModelLayers.MANIFOLD)), 0.8F);
    }

    @Override
    public ManifoldRenderState createRenderState() {
        return new ManifoldRenderState();
    }

    @Override
    public void extractRenderState(ManifoldEntity entity, ManifoldRenderState state, float partialTick) {
        super.extractRenderState(entity, state, partialTick);
        state.tier = entity.getTier();
        state.climbing = entity.isClimbing();
        state.attackAnimationState.copyFrom(entity.attackAnimationState);
        state.constrictAnimationState.copyFrom(entity.constrictAnimationState);
    }

    @Override
    public ResourceLocation getTextureLocation(ManifoldRenderState state) {
        return TEXTURE;
    }
}
