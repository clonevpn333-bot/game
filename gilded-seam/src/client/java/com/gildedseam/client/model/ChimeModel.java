package com.gildedseam.client.model;

import com.gildedseam.client.anim.ChimeAnimations;
import com.gildedseam.client.render.state.ChimeRenderState;
import com.gildedseam.infection.SeamHelper;

import net.minecraft.client.animation.KeyframeAnimation;
import net.minecraft.client.model.EntityModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.model.geom.PartPose;
import net.minecraft.client.model.geom.builders.CubeListBuilder;
import net.minecraft.client.model.geom.builders.LayerDefinition;
import net.minecraft.client.model.geom.builders.MeshDefinition;
import net.minecraft.client.model.geom.builders.PartDefinition;
import net.minecraft.util.Mth;

/**
 * Chime: a hanging mask and its orbit of shard-petals. The mask bobs on
 * an unseen thread; the halo spins slowly and counter-tilts; the rods
 * swing with the drift.
 */
public class ChimeModel extends EntityModel<ChimeRenderState> {
    private final ModelPart mask;
    private final ModelPart halo;
    private final ModelPart halo2;
    private final ModelPart rod0;
    private final ModelPart rod1;
    private final ModelPart rod2;
    private final KeyframeAnimation ringAnimation;

    public ChimeModel(ModelPart root) {
        super(root);
        this.mask = root.getChild("mask");
        this.halo = root.getChild("halo");
        this.halo2 = root.getChild("halo_2");
        this.rod0 = this.mask.getChild("rod_0");
        this.rod1 = this.mask.getChild("rod_1");
        this.rod2 = this.mask.getChild("rod_2");
        this.ringAnimation = ChimeAnimations.RING.bake(root);
    }

    public static LayerDefinition createBodyLayer() {
MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition mask = root.addOrReplaceChild("mask",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-5.0F, -6.0F, -1.0F, 10.0F, 12.0F, 2.0F)
                        .texOffs(0, 22).addBox(-5.0F, -8.0F, -2.0F, 10.0F, 2.0F, 3.0F)
                        .texOffs(32, 22).addBox(-3.0F, 6.0F, -1.5F, 6.0F, 2.0F, 2.0F)
                        .texOffs(51, 0).addBox(-1.0F, -2.0F, -2.0F, 2.0F, 5.0F, 1.0F),
                PartPose.offset(0.0F, 8.0F, 0.0F));
        PartDefinition bell = mask.addOrReplaceChild("bell",
                CubeListBuilder.create()
                        .texOffs(25, 0).addBox(-3.0F, -2.0F, 0.0F, 6.0F, 6.0F, 4.0F),
                PartPose.offset(0.0F, -1.0F, 1.0F));
        PartDefinition rod0 = mask.addOrReplaceChild("rod_0",
                CubeListBuilder.create()
                        .texOffs(35, 15).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 5.0F, 1.0F),
                PartPose.offset(-3.0F, 8.0F, 0.0F));
        PartDefinition rod1 = mask.addOrReplaceChild("rod_1",
                CubeListBuilder.create()
                        .texOffs(46, 0).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 6.0F, 1.0F),
                PartPose.offset(0.0F, 8.0F, 0.0F));
        PartDefinition rod2 = mask.addOrReplaceChild("rod_2",
                CubeListBuilder.create()
                        .texOffs(27, 22).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 4.0F, 1.0F),
                PartPose.offset(3.0F, 8.0F, 0.0F));
        PartDefinition halo = root.addOrReplaceChild("halo",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 8.0F, 0.0F));
        PartDefinition petal0 = halo.addOrReplaceChild("petal_0",
                CubeListBuilder.create()
                        .texOffs(58, 0).addBox(-1.0F, -2.5F, 6.5F, 2.0F, 5.0F, 1.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition petal1 = halo.addOrReplaceChild("petal_1",
                CubeListBuilder.create()
                        .texOffs(0, 15).addBox(-1.0F, -2.5F, 6.5F, 2.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 1.0472F, 0.0F));
        PartDefinition petal2 = halo.addOrReplaceChild("petal_2",
                CubeListBuilder.create()
                        .texOffs(7, 15).addBox(-1.0F, -2.5F, 6.5F, 2.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 2.0944F, 0.0F));
        PartDefinition petal3 = halo.addOrReplaceChild("petal_3",
                CubeListBuilder.create()
                        .texOffs(14, 15).addBox(-1.0F, -2.5F, 6.5F, 2.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 3.1416F, 0.0F));
        PartDefinition petal4 = halo.addOrReplaceChild("petal_4",
                CubeListBuilder.create()
                        .texOffs(21, 15).addBox(-1.0F, -2.5F, 6.5F, 2.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 4.1888F, 0.0F));
        PartDefinition petal5 = halo.addOrReplaceChild("petal_5",
                CubeListBuilder.create()
                        .texOffs(28, 15).addBox(-1.0F, -2.5F, 6.5F, 2.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 5.236F, 0.0F));
        PartDefinition halo2 = root.addOrReplaceChild("halo_2",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 8.0F, 0.0F));
        PartDefinition petalI0 = halo2.addOrReplaceChild("petal_i0",
                CubeListBuilder.create()
                        .texOffs(49, 22).addBox(-1.0F, -1.5F, 4.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.5236F, 0.0F));
        PartDefinition petalI1 = halo2.addOrReplaceChild("petal_i1",
                CubeListBuilder.create()
                        .texOffs(56, 22).addBox(-1.0F, -1.5F, 4.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 1.5708F, 0.0F));
        PartDefinition petalI2 = halo2.addOrReplaceChild("petal_i2",
                CubeListBuilder.create()
                        .texOffs(0, 28).addBox(-1.0F, -1.5F, 4.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 2.618F, 0.0F));
        PartDefinition petalI3 = halo2.addOrReplaceChild("petal_i3",
                CubeListBuilder.create()
                        .texOffs(7, 28).addBox(-1.0F, -1.5F, 4.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 3.6652F, 0.0F));
        PartDefinition petalI4 = halo2.addOrReplaceChild("petal_i4",
                CubeListBuilder.create()
                        .texOffs(14, 28).addBox(-1.0F, -1.5F, 4.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 4.7124F, 0.0F));
        PartDefinition petalI5 = halo2.addOrReplaceChild("petal_i5",
                CubeListBuilder.create()
                        .texOffs(21, 28).addBox(-1.0F, -1.5F, 4.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 5.7596F, 0.0F));

        return LayerDefinition.create(mesh, 64, 64);
    }

    @Override
    public void setupAnim(ChimeRenderState state) {
        super.setupAnim(state);

        float idle = state.ageInTicks;

        // The mask faces you; the body of it swings like a pendant.
        this.mask.yRot = state.yRot * Mth.DEG_TO_RAD;
        this.mask.xRot = state.xRot * Mth.DEG_TO_RAD + Mth.sin(idle * 0.08F) * 0.06F;
        this.mask.y += Mth.sin(idle * 0.11F) * 0.8F;
        this.mask.zRot += Mth.sin(idle * 0.05F) * 0.05F;

        // Halo: patient rotation, slight precession.
        this.halo.yRot = idle * 0.06F;
        this.halo.zRot = Mth.sin(idle * 0.045F) * 0.12F;
        this.halo.xRot = Mth.cos(idle * 0.045F) * 0.12F;

        // Lustre mutation: an inner ring of gold petals, counter-spun.
        this.halo2.visible = state.tier >= SeamHelper.TIER_LUSTRE;
        this.halo2.yRot = -idle * 0.09F;
        this.halo2.zRot = -this.halo.zRot * 0.6F;

        // Rods answer the swing a beat late.
        float lag = Mth.sin(idle * 0.11F - 0.9F) * 0.10F;
        this.rod0.zRot += lag;
        this.rod1.zRot += lag * 0.7F;
        this.rod2.zRot += lag * 1.2F;

        this.ringAnimation.apply(state.ringAnimationState, state.ageInTicks);
    }
}
