package com.gildedseam.client.render;

import com.gildedseam.GildedSeam;
import com.gildedseam.client.model.ModModelLayers;
import com.gildedseam.client.model.SaltSwornModel;
import com.gildedseam.client.render.state.SaltSwornRenderState;
import com.gildedseam.entity.SaltSwornEntity;

import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.ResourceLocation;

public class SaltSwornRenderer extends MobRenderer<SaltSwornEntity, SaltSwornRenderState, SaltSwornModel> {
    private static final ResourceLocation TEXTURE = GildedSeam.id("textures/entity/salt_sworn.png");

    public SaltSwornRenderer(EntityRendererProvider.Context context) {
        super(context, new SaltSwornModel(context.bakeLayer(ModModelLayers.SALT_SWORN)), 0.5F);
    }

    @Override
    public SaltSwornRenderState createRenderState() {
        return new SaltSwornRenderState();
    }

    @Override
    public void extractRenderState(SaltSwornEntity entity, SaltSwornRenderState state, float partialTick) {
        super.extractRenderState(entity, state, partialTick);
        state.hired = entity.isHired();
    }

    @Override
    public ResourceLocation getTextureLocation(SaltSwornRenderState state) {
        return TEXTURE;
    }
}
