package com.gildedseam.client.render;

import com.gildedseam.GildedSeam;
import com.gildedseam.client.model.KilnbornModel;
import com.gildedseam.client.model.ModModelLayers;
import com.gildedseam.client.render.state.KilnbornRenderState;
import com.gildedseam.entity.KilnbornEntity;

import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.ResourceLocation;

public class KilnbornRenderer extends MobRenderer<KilnbornEntity, KilnbornRenderState, KilnbornModel> {
    private static final ResourceLocation TEXTURE = GildedSeam.id("textures/entity/kilnborn.png");

    public KilnbornRenderer(EntityRendererProvider.Context context) {
        super(context, new KilnbornModel(context.bakeLayer(ModModelLayers.KILNBORN)), 0.7F);
    }

    @Override
    public KilnbornRenderState createRenderState() {
        return new KilnbornRenderState();
    }

    @Override
    public void extractRenderState(KilnbornEntity entity, KilnbornRenderState state, float partialTick) {
        super.extractRenderState(entity, state, partialTick);
        state.tier = entity.getTier();
        state.overfired = entity.isOverfired();
        state.attackAnimationState.copyFrom(entity.attackAnimationState);
        state.chargeAnimationState.copyFrom(entity.chargeAnimationState);
    }

    @Override
    public ResourceLocation getTextureLocation(KilnbornRenderState state) {
        return TEXTURE;
    }
}
