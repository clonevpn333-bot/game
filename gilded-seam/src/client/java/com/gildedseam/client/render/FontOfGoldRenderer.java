package com.gildedseam.client.render;

import com.gildedseam.GildedSeam;
import com.gildedseam.client.model.FontOfGoldModel;
import com.gildedseam.client.model.ModModelLayers;
import com.gildedseam.client.render.state.FontOfGoldRenderState;
import com.gildedseam.entity.FontOfGoldEntity;

import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.ResourceLocation;

public class FontOfGoldRenderer extends MobRenderer<FontOfGoldEntity, FontOfGoldRenderState, FontOfGoldModel> {
    private static final ResourceLocation TEXTURE = GildedSeam.id("textures/entity/font_of_gold.png");

    public FontOfGoldRenderer(EntityRendererProvider.Context context) {
        super(context, new FontOfGoldModel(context.bakeLayer(ModModelLayers.FONT_OF_GOLD)), 0.6F);
    }

    @Override
    public FontOfGoldRenderState createRenderState() {
        return new FontOfGoldRenderState();
    }

    @Override
    public void extractRenderState(FontOfGoldEntity entity, FontOfGoldRenderState state, float partialTick) {
        super.extractRenderState(entity, state, partialTick);
        state.tier = entity.getTier();
        state.birthAnimationState.copyFrom(entity.birthAnimationState);
    }

    @Override
    public ResourceLocation getTextureLocation(FontOfGoldRenderState state) {
        return TEXTURE;
    }
}
