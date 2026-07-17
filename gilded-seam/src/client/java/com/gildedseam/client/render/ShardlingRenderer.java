package com.gildedseam.client.render;

import com.gildedseam.GildedSeam;
import com.gildedseam.client.model.ModModelLayers;
import com.gildedseam.client.model.ShardlingModel;
import com.gildedseam.client.render.state.ShardlingRenderState;
import com.gildedseam.entity.ShardlingEntity;
import com.gildedseam.infection.SeamHelper;

import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.ResourceLocation;

public class ShardlingRenderer extends MobRenderer<ShardlingEntity, ShardlingRenderState, ShardlingModel> {
    private static final ResourceLocation TEXTURE = GildedSeam.id("textures/entity/shardling.png");
    private static final ResourceLocation TEXTURE_STONEWARE = GildedSeam.id("textures/entity/shardling_stoneware.png");
    private static final ResourceLocation TEXTURE_LUSTRE = GildedSeam.id("textures/entity/shardling_lustre.png");

    public ShardlingRenderer(EntityRendererProvider.Context context) {
        super(context, new ShardlingModel(context.bakeLayer(ModModelLayers.SHARDLING)), 0.35F);
    }

    @Override
    public ShardlingRenderState createRenderState() {
        return new ShardlingRenderState();
    }

    @Override
    public void extractRenderState(ShardlingEntity entity, ShardlingRenderState state, float partialTick) {
        super.extractRenderState(entity, state, partialTick);
        state.tier = entity.getTier();
        state.attackAnimationState.copyFrom(entity.attackAnimationState);
    }

    @Override
    public ResourceLocation getTextureLocation(ShardlingRenderState state) {
        return switch (state.tier) {
            case SeamHelper.TIER_LUSTRE -> TEXTURE_LUSTRE;
            case SeamHelper.TIER_STONEWARE -> TEXTURE_STONEWARE;
            default -> TEXTURE;
        };
    }
}
