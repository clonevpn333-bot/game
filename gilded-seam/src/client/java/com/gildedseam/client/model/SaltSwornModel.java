package com.gildedseam.client.model;

import com.gildedseam.client.render.state.SaltSwornRenderState;

import net.minecraft.client.model.EntityModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.model.geom.PartPose;
import net.minecraft.client.model.geom.builders.CubeListBuilder;
import net.minecraft.client.model.geom.builders.LayerDefinition;
import net.minecraft.client.model.geom.builders.MeshDefinition;
import net.minecraft.client.model.geom.builders.PartDefinition;
import net.minecraft.util.Mth;

/**
 * The Salt-Sworn: a broad-hatted lamplighter in a brine-cured coat.
 * Ordinary human walk — which, in this mod, is the strangest thing
 * on the road.
 */
public class SaltSwornModel extends EntityModel<SaltSwornRenderState> {
    private final ModelPart head;
    private final ModelPart armR;
    private final ModelPart armL;
    private final ModelPart legR;
    private final ModelPart legL;
    private final ModelPart lantern;

    public SaltSwornModel(ModelPart root) {
        super(root);
        ModelPart body = root.getChild("body");
        this.head = body.getChild("head");
        this.armR = body.getChild("arm_r");
        this.armL = body.getChild("arm_l");
        this.legR = root.getChild("leg_r");
        this.legL = root.getChild("leg_l");
        this.lantern = this.armL.getChild("lantern");
    }

    public static LayerDefinition createBodyLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-4.0F, 0.0F, -2.0F, 8.0F, 10.0F, 4.0F)
                        .texOffs(0, 15).addBox(-4.5F, 7.0F, -2.5F, 9.0F, 3.0F, 5.0F)
                        .texOffs(0, 24).addBox(-2.0F, 2.0F, -3.0F, 4.0F, 5.0F, 1.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(51, 0).addBox(-3.0F, -6.0F, -3.0F, 6.0F, 6.0F, 6.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition hat = head.addOrReplaceChild("hat",
                CubeListBuilder.create()
                        .texOffs(76, 0).addBox(-4.5F, 0.0F, -4.5F, 9.0F, 1.0F, 9.0F)
                        .texOffs(29, 15).addBox(-2.5F, -3.0F, -2.5F, 5.0F, 3.0F, 5.0F),
                PartPose.offsetAndRotation(0.0F, -6.0F, 0.0F, 0.0F, 0.0F, 0.1047F));
        PartDefinition armR = body.addOrReplaceChild("arm_r",
                CubeListBuilder.create()
                        .texOffs(25, 0).addBox(-2.0F, 0.0F, -1.5F, 3.0F, 10.0F, 3.0F),
                PartPose.offset(-4.5F, 1.0F, 0.0F));
        PartDefinition blade = armR.addOrReplaceChild("blade",
                CubeListBuilder.create()
                        .texOffs(50, 15).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 7.0F, 1.0F),
                PartPose.offset(-0.5F, 10.0F, 0.0F));
        PartDefinition armL = body.addOrReplaceChild("arm_l",
                CubeListBuilder.create()
                        .texOffs(38, 0).addBox(-1.0F, 0.0F, -1.5F, 3.0F, 10.0F, 3.0F),
                PartPose.offset(4.5F, 1.0F, 0.0F));
        PartDefinition lantern = armL.addOrReplaceChild("lantern",
                CubeListBuilder.create()
                        .texOffs(107, 15).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 3.0F, 3.0F),
                PartPose.offset(0.5F, 10.0F, 0.0F));
        PartDefinition legR = root.addOrReplaceChild("leg_r",
                CubeListBuilder.create()
                        .texOffs(55, 15).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(-2.0F, 16.0F, 0.0F));
        PartDefinition legRLower = legR.addOrReplaceChild("leg_r_lower",
                CubeListBuilder.create()
                        .texOffs(68, 15).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition legL = root.addOrReplaceChild("leg_l",
                CubeListBuilder.create()
                        .texOffs(81, 15).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(2.0F, 16.0F, 0.0F));
        PartDefinition legLLower = legL.addOrReplaceChild("leg_l_lower",
                CubeListBuilder.create()
                        .texOffs(94, 15).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    @Override
    public void setupAnim(SaltSwornRenderState state) {
        super.setupAnim(state);

        this.head.yRot = state.yRot * Mth.DEG_TO_RAD;
        this.head.xRot = state.xRot * Mth.DEG_TO_RAD;

        float pos = state.walkAnimationPos;
        float speed = state.walkAnimationSpeed;

        this.legR.xRot = Mth.cos(pos * 0.6662F) * 1.1F * speed;
        this.legL.xRot = Mth.cos(pos * 0.6662F + Mth.PI) * 1.1F * speed;
        this.armR.xRot = Mth.cos(pos * 0.6662F + Mth.PI) * 0.8F * speed;
        this.armL.xRot = Mth.cos(pos * 0.6662F) * 0.5F * speed - 0.4F; // lantern held forward

        // The lantern swings on its own weight.
        this.lantern.xRot = Mth.sin(state.ageInTicks * 0.1F) * 0.12F - this.armL.xRot * 0.5F;
    }
}
