package com.gildedseam.client.render;

import com.gildedseam.GildedSeam;
import com.gildedseam.client.model.ChimeModel;
import com.gildedseam.client.model.ModModelLayers;
import com.gildedseam.client.render.state.ChimeRenderState;
import com.gildedseam.entity.ChimeEntity;
import com.gildedseam.infection.SeamHelper;

import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.ResourceLocation;

public class ChimeRenderer extends MobRenderer<ChimeEntity, ChimeRenderState, ChimeModel> {
    private static final ResourceLocation TEXTURE = GildedSeam.id("textures/entity/chime.png");
    private static final ResourceLocation TEXTURE_STONEWARE = GildedSeam.id("textures/entity/chime_stoneware.png");
    private static final ResourceLocation TEXTURE_LUSTRE = GildedSeam.id("textures/entity/chime_lustre.png");

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
        return switch (state.tier) {
            case SeamHelper.TIER_LUSTRE -> TEXTURE_LUSTRE;
            case SeamHelper.TIER_STONEWARE -> TEXTURE_STONEWARE;
            default -> TEXTURE;
        };
    }
}
