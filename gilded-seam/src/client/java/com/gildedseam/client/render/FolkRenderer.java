package com.gildedseam.client.render;

import com.gildedseam.GildedSeam;
import com.gildedseam.client.model.FolkModel;
import com.gildedseam.client.render.state.FolkRenderState;
import com.gildedseam.entity.SeamMob;
import com.gildedseam.infection.SeamHelper;

import net.minecraft.client.model.geom.ModelLayerLocation;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.Identifier;
import net.minecraft.world.entity.Mob;

/** One renderer for all the human folk; the half-sewn gets tier textures. */
public class FolkRenderer extends MobRenderer<Mob, FolkRenderState, FolkModel> {
    private final Identifier texture;
    private final Identifier textureStoneware;
    private final Identifier textureLustre;
    private final boolean tiered;

    public FolkRenderer(EntityRendererProvider.Context context, ModelLayerLocation layer,
            String name, boolean tiered) {
        super(context, new FolkModel(context.bakeLayer(layer), FolkModel.CONFIGS.get(name)), 0.5F);
        this.texture = GildedSeam.id("textures/entity/" + name + ".png");
        this.textureStoneware = tiered ? GildedSeam.id("textures/entity/" + name + "_stoneware.png") : null;
        this.textureLustre = tiered ? GildedSeam.id("textures/entity/" + name + "_lustre.png") : null;
        this.tiered = tiered;
    }

    @Override
    public FolkRenderState createRenderState() {
        return new FolkRenderState();
    }

    @Override
    public void extractRenderState(Mob entity, FolkRenderState state, float partialTick) {
        super.extractRenderState(entity, state, partialTick);
        state.tier = entity instanceof SeamMob seamMob ? seamMob.getTier() : 0;
        state.attackSwing = entity.getAttackAnim(partialTick);
    }

    @Override
    public Identifier getTextureLocation(FolkRenderState state) {
        if (!this.tiered) {
            return this.texture;
        }
        return switch (state.tier) {
            case SeamHelper.TIER_LUSTRE -> this.textureLustre;
            case SeamHelper.TIER_STONEWARE -> this.textureStoneware;
            default -> this.texture;
        };
    }
}
