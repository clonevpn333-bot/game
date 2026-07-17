package com.gildedseam.client.render;

import com.gildedseam.GildedSeam;
import com.gildedseam.client.model.ModModelLayers;
import com.gildedseam.client.model.ReliquaryColossusModel;
import com.gildedseam.client.render.state.ReliquaryColossusRenderState;
import com.gildedseam.entity.ReliquaryColossusEntity;

import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.ResourceLocation;

public class ReliquaryColossusRenderer
        extends MobRenderer<ReliquaryColossusEntity, ReliquaryColossusRenderState, ReliquaryColossusModel> {
    private static final ResourceLocation TEXTURE = GildedSeam.id("textures/entity/reliquary_colossus.png");

    public ReliquaryColossusRenderer(EntityRendererProvider.Context context) {
        super(context, new ReliquaryColossusModel(context.bakeLayer(ModModelLayers.RELIQUARY_COLOSSUS)), 1.1F);
    }

    @Override
    public ReliquaryColossusRenderState createRenderState() {
        return new ReliquaryColossusRenderState();
    }

    @Override
    public void extractRenderState(ReliquaryColossusEntity entity, ReliquaryColossusRenderState state,
            float partialTick) {
        super.extractRenderState(entity, state, partialTick);
        state.tier = entity.getTier();
        state.dormant = entity.isDormant();
        state.awakenAnimationState.copyFrom(entity.awakenAnimationState);
        state.sweepAnimationState.copyFrom(entity.sweepAnimationState);
        state.slamAnimationState.copyFrom(entity.slamAnimationState);
        state.summonAnimationState.copyFrom(entity.summonAnimationState);
    }

    @Override
    public ResourceLocation getTextureLocation(ReliquaryColossusRenderState state) {
        return TEXTURE;
    }
}
