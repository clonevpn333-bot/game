package com.gildedseam.client.render;

import com.gildedseam.GildedSeam;
import com.gildedseam.client.model.ModModelLayers;
import com.gildedseam.client.model.PorcelainAutarchModel;
import com.gildedseam.client.render.state.PorcelainAutarchRenderState;
import com.gildedseam.entity.PorcelainAutarchEntity;
import com.gildedseam.infection.SeamHelper;

import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.Identifier;

public class PorcelainAutarchRenderer
        extends MobRenderer<PorcelainAutarchEntity, PorcelainAutarchRenderState, PorcelainAutarchModel> {
    private static final Identifier TEXTURE = GildedSeam.id("textures/entity/porcelain_autarch.png");
    private static final Identifier TEXTURE_STONEWARE = GildedSeam.id("textures/entity/porcelain_autarch_stoneware.png");
    private static final Identifier TEXTURE_LUSTRE = GildedSeam.id("textures/entity/porcelain_autarch_lustre.png");

    public PorcelainAutarchRenderer(EntityRendererProvider.Context context) {
        super(context, new PorcelainAutarchModel(context.bakeLayer(ModModelLayers.PORCELAIN_AUTARCH)), 1.4F);
    }

    @Override
    public PorcelainAutarchRenderState createRenderState() {
        return new PorcelainAutarchRenderState();
    }

    @Override
    public void extractRenderState(PorcelainAutarchEntity entity, PorcelainAutarchRenderState state,
            float partialTick) {
        super.extractRenderState(entity, state, partialTick);
        state.tier = entity.getTier();
        state.attackSwing = entity.getAttackAnim(partialTick);
        state.dormant = entity.isDormant();
        state.enraged = entity.getHealth() < entity.getMaxHealth() / 3.0F;
        state.awakenAnimationState.copyFrom(entity.awakenAnimationState);
        state.sweepAnimationState.copyFrom(entity.sweepAnimationState);
        state.stormAnimationState.copyFrom(entity.stormAnimationState);
        state.novaAnimationState.copyFrom(entity.novaAnimationState);
        state.decreeAnimationState.copyFrom(entity.decreeAnimationState);
    }

    @Override
    public Identifier getTextureLocation(PorcelainAutarchRenderState state) {
        return switch (state.tier) {
            case SeamHelper.TIER_LUSTRE -> TEXTURE_LUSTRE;
            case SeamHelper.TIER_STONEWARE -> TEXTURE_STONEWARE;
            default -> TEXTURE;
        };
    }
}
