package com.gildedseam.client.render;

import com.gildedseam.GildedSeam;
import com.gildedseam.client.model.ModModelLayers;
import com.gildedseam.client.model.VesselModel;
import com.gildedseam.client.render.state.VesselRenderState;
import com.gildedseam.entity.VesselEntity;
import com.gildedseam.infection.SeamHelper;

import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.Identifier;

public class VesselRenderer extends MobRenderer<VesselEntity, VesselRenderState, VesselModel> {
    private static final Identifier TEXTURE = GildedSeam.id("textures/entity/vessel.png");
    private static final Identifier TEXTURE_STONEWARE = GildedSeam.id("textures/entity/vessel_stoneware.png");
    private static final Identifier TEXTURE_LUSTRE = GildedSeam.id("textures/entity/vessel_lustre.png");

    public VesselRenderer(EntityRendererProvider.Context context) {
        super(context, new VesselModel(context.bakeLayer(ModModelLayers.VESSEL)), 0.5F);
    }

    @Override
    public VesselRenderState createRenderState() {
        return new VesselRenderState();
    }

    @Override
    public void extractRenderState(VesselEntity entity, VesselRenderState state, float partialTick) {
        super.extractRenderState(entity, state, partialTick);
        state.tier = entity.getTier();
        state.attackSwing = entity.getAttackAnim(partialTick);
        state.rising = entity.isRising();
        state.attackAnimationState.copyFrom(entity.attackAnimationState);
        state.risingAnimationState.copyFrom(entity.risingAnimationState);
    }

    @Override
    public Identifier getTextureLocation(VesselRenderState state) {
        return switch (state.tier) {
            case SeamHelper.TIER_LUSTRE -> TEXTURE_LUSTRE;
            case SeamHelper.TIER_STONEWARE -> TEXTURE_STONEWARE;
            default -> TEXTURE;
        };
    }
}
