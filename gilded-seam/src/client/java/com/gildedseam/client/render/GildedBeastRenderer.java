package com.gildedseam.client.render;

import com.gildedseam.GildedSeam;
import com.gildedseam.client.model.GildedBeastModel;
import com.gildedseam.client.render.state.GildedBeastRenderState;
import com.gildedseam.entity.GildedBeastEntity;
import com.gildedseam.infection.SeamHelper;

import net.minecraft.client.model.geom.ModelLayerLocation;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.Identifier;

/** One renderer for the whole gilded farmyard; species picked by name. */
public class GildedBeastRenderer extends MobRenderer<GildedBeastEntity, GildedBeastRenderState, GildedBeastModel> {
    private final Identifier texture;
    private final Identifier textureStoneware;
    private final Identifier textureLustre;

    public GildedBeastRenderer(EntityRendererProvider.Context context, ModelLayerLocation layer, String name) {
        super(context, new GildedBeastModel(context.bakeLayer(layer), GildedBeastModel.CONFIGS.get(name), name), 0.5F);
        this.texture = GildedSeam.id("textures/entity/" + name + ".png");
        this.textureStoneware = GildedSeam.id("textures/entity/" + name + "_stoneware.png");
        this.textureLustre = GildedSeam.id("textures/entity/" + name + "_lustre.png");
    }

    @Override
    public GildedBeastRenderState createRenderState() {
        return new GildedBeastRenderState();
    }

    @Override
    public void extractRenderState(GildedBeastEntity entity, GildedBeastRenderState state, float partialTick) {
        super.extractRenderState(entity, state, partialTick);
        state.tier = entity.getTier();
        state.attackSwing = entity.getAttackAnim(partialTick);
        state.attackAnimationState.copyFrom(entity.attackAnimationState);
        state.downed = entity.isDowned();
        state.deathAnimationState.copyFrom(entity.deathAnimationState);
        state.riseAnimationState.copyFrom(entity.riseAnimationState);
    }

    @Override
    public Identifier getTextureLocation(GildedBeastRenderState state) {
        return switch (state.tier) {
            case SeamHelper.TIER_LUSTRE -> this.textureLustre;
            case SeamHelper.TIER_STONEWARE -> this.textureStoneware;
            default -> this.texture;
        };
    }
}
