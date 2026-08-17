package com.gildedseam.client.render;

import com.gildedseam.GildedSeam;
import com.gildedseam.client.model.ModModelLayers;
import com.gildedseam.client.model.SeamstressModel;
import com.gildedseam.client.render.state.SeamstressRenderState;
import com.gildedseam.entity.SeamstressEntity;
import com.gildedseam.infection.SeamHelper;

import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.Identifier;

public class SeamstressRenderer extends MobRenderer<SeamstressEntity, SeamstressRenderState, SeamstressModel> {
    private static final Identifier TEXTURE = GildedSeam.id("textures/entity/seamstress.png");
    private static final Identifier TEXTURE_STONEWARE = GildedSeam.id("textures/entity/seamstress_stoneware.png");
    private static final Identifier TEXTURE_LUSTRE = GildedSeam.id("textures/entity/seamstress_lustre.png");

    public SeamstressRenderer(EntityRendererProvider.Context context) {
        super(context, new SeamstressModel(context.bakeLayer(ModModelLayers.SEAMSTRESS)), 0.45F);
    }

    @Override
    public SeamstressRenderState createRenderState() {
        return new SeamstressRenderState();
    }

    @Override
    public void extractRenderState(SeamstressEntity entity, SeamstressRenderState state, float partialTick) {
        super.extractRenderState(entity, state, partialTick);
        state.tier = entity.getTier();
        state.attackAnimationState.copyFrom(entity.attackAnimationState);
        state.lashAnimationState.copyFrom(entity.lashAnimationState);
        state.mendAnimationState.copyFrom(entity.mendAnimationState);
    }

    @Override
    public Identifier getTextureLocation(SeamstressRenderState state) {
        return switch (state.tier) {
            case SeamHelper.TIER_LUSTRE -> TEXTURE_LUSTRE;
            case SeamHelper.TIER_STONEWARE -> TEXTURE_STONEWARE;
            default -> TEXTURE;
        };
    }
}
