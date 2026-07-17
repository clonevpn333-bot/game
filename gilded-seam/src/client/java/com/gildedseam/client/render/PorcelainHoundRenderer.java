package com.gildedseam.client.render;

import com.gildedseam.GildedSeam;
import com.gildedseam.client.model.ModModelLayers;
import com.gildedseam.client.model.PorcelainHoundModel;
import com.gildedseam.client.render.state.PorcelainHoundRenderState;
import com.gildedseam.entity.PorcelainHoundEntity;
import com.gildedseam.infection.SeamHelper;

import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.ResourceLocation;

public class PorcelainHoundRenderer extends MobRenderer<PorcelainHoundEntity, PorcelainHoundRenderState, PorcelainHoundModel> {
    private static final ResourceLocation TEXTURE = GildedSeam.id("textures/entity/porcelain_hound.png");
    private static final ResourceLocation TEXTURE_STONEWARE = GildedSeam.id("textures/entity/porcelain_hound_stoneware.png");
    private static final ResourceLocation TEXTURE_LUSTRE = GildedSeam.id("textures/entity/porcelain_hound_lustre.png");

    public PorcelainHoundRenderer(EntityRendererProvider.Context context) {
        super(context, new PorcelainHoundModel(context.bakeLayer(ModModelLayers.PORCELAIN_HOUND)), 0.55F);
    }

    @Override
    public PorcelainHoundRenderState createRenderState() {
        return new PorcelainHoundRenderState();
    }

    @Override
    public void extractRenderState(PorcelainHoundEntity entity, PorcelainHoundRenderState state, float partialTick) {
        super.extractRenderState(entity, state, partialTick);
        state.tier = entity.getTier();
        state.attackAnimationState.copyFrom(entity.attackAnimationState);
        state.howlAnimationState.copyFrom(entity.howlAnimationState);
    }

    @Override
    public ResourceLocation getTextureLocation(PorcelainHoundRenderState state) {
        return switch (state.tier) {
            case SeamHelper.TIER_LUSTRE -> TEXTURE_LUSTRE;
            case SeamHelper.TIER_STONEWARE -> TEXTURE_STONEWARE;
            default -> TEXTURE;
        };
    }
}
