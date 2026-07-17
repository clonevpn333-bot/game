package com.gildedseam.client.model;

import com.gildedseam.client.anim.VesselAnimations;
import com.gildedseam.client.render.state.VesselRenderState;
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
 * Vessel: a mended corpse in glazed porcelain. Walks with a stiff,
 * patient shamble — the knees never quite bend, because they cannot.
 * At Lustre firing the spare pair of arms wakes up and drifts.
 */
public class VesselModel extends EntityModel<VesselRenderState> {
    private final ModelPart torso;
    private final ModelPart chest;
    private final ModelPart head;
    private final ModelPart armR;
    private final ModelPart armL;
    private final ModelPart spareArmR;
    private final ModelPart spareArmL;
    private final ModelPart legR;
    private final ModelPart legL;
    private final KeyframeAnimation attackAnimation;
    private final KeyframeAnimation risingAnimation;

    public VesselModel(ModelPart root) {
        super(root);
        this.torso = root.getChild("torso");
        this.chest = this.torso.getChild("chest");
        this.head = this.chest.getChild("head");
        this.armR = this.chest.getChild("arm_r");
        this.armL = this.chest.getChild("arm_l");
        this.spareArmR = this.torso.getChild("spare_arm_r");
        this.spareArmL = this.torso.getChild("spare_arm_l");
        this.legR = root.getChild("leg_r");
        this.legL = root.getChild("leg_l");
        this.attackAnimation = VesselAnimations.ATTACK.bake(root);
        this.risingAnimation = VesselAnimations.RISING.bake(root);
    }

    public static LayerDefinition createBodyLayer() {
MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition torso = root.addOrReplaceChild("torso",
                CubeListBuilder.create()
                        .texOffs(62, 0).addBox(-4.0F, -6.0F, -2.5F, 8.0F, 6.0F, 5.0F),
                PartPose.offset(0.0F, 11.0F, 0.0F));
        PartDefinition chest = torso.addOrReplaceChild("chest",
                CubeListBuilder.create()
                        .texOffs(29, 0).addBox(-5.0F, -7.0F, -3.0F, 10.0F, 7.0F, 6.0F)
                        .texOffs(101, 16).addBox(-1.0F, -6.0F, -3.6F, 2.0F, 5.0F, 1.0F)
                        .texOffs(117, 16).addBox(-5.5F, -7.5F, -1.0F, 1.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, -6.0F, 0.0F));
        PartDefinition head = chest.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-3.5F, -8.0F, -3.5F, 7.0F, 8.0F, 7.0F),
                PartPose.offset(0.0F, -7.0F, 0.0F));
        PartDefinition crown = head.addOrReplaceChild("crown",
                CubeListBuilder.create()
                        .texOffs(108, 16).addBox(-1.0F, -3.0F, -1.0F, 2.0F, 3.0F, 2.0F),
                PartPose.offsetAndRotation(1.0F, -8.0F, 0.0F, 0.0F, 0.0F, 0.2094F));
        PartDefinition armR = chest.addOrReplaceChild("arm_r",
                CubeListBuilder.create()
                        .texOffs(89, 0).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 7.0F, 3.0F),
                PartPose.offset(-5.5F, -6.0F, 0.0F));
        PartDefinition armRLower = armR.addOrReplaceChild("arm_r_lower",
                CubeListBuilder.create()
                        .texOffs(102, 0).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 7.0F, 3.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition armL = chest.addOrReplaceChild("arm_l",
                CubeListBuilder.create()
                        .texOffs(115, 0).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 7.0F, 3.0F),
                PartPose.offset(5.5F, -6.0F, 0.0F));
        PartDefinition armLLower = armL.addOrReplaceChild("arm_l_lower",
                CubeListBuilder.create()
                        .texOffs(0, 16).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 7.0F, 3.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition spareArmR = torso.addOrReplaceChild("spare_arm_r",
                CubeListBuilder.create()
                        .texOffs(65, 16).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offset(-4.5F, -3.0F, 0.0F));
        PartDefinition spareArmRLower = spareArmR.addOrReplaceChild("spare_arm_r_lower",
                CubeListBuilder.create()
                        .texOffs(74, 16).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition spareArmL = torso.addOrReplaceChild("spare_arm_l",
                CubeListBuilder.create()
                        .texOffs(83, 16).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offset(4.5F, -3.0F, 0.0F));
        PartDefinition spareArmLLower = spareArmL.addOrReplaceChild("spare_arm_l_lower",
                CubeListBuilder.create()
                        .texOffs(92, 16).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition legR = root.addOrReplaceChild("leg_r",
                CubeListBuilder.create()
                        .texOffs(13, 16).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 7.0F, 3.0F),
                PartPose.offset(-2.0F, 11.0F, 0.0F));
        PartDefinition legRLower = legR.addOrReplaceChild("leg_r_lower",
                CubeListBuilder.create()
                        .texOffs(39, 16).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 6.0F, 3.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition legL = root.addOrReplaceChild("leg_l",
                CubeListBuilder.create()
                        .texOffs(26, 16).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 7.0F, 3.0F),
                PartPose.offset(2.0F, 11.0F, 0.0F));
        PartDefinition legLLower = legL.addOrReplaceChild("leg_l_lower",
                CubeListBuilder.create()
                        .texOffs(52, 16).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 6.0F, 3.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    @Override
    public void setupAnim(VesselRenderState state) {
        super.setupAnim(state);

        this.spareArmR.visible = state.tier >= SeamHelper.TIER_LUSTRE;
        this.spareArmL.visible = state.tier >= SeamHelper.TIER_LUSTRE;

        this.head.yRot = state.yRot * Mth.DEG_TO_RAD;
        this.head.xRot = state.xRot * Mth.DEG_TO_RAD;

        float pos = state.walkAnimationPos;
        float speed = state.walkAnimationSpeed;

        // Stiff-legged shamble; arms barely counterswing.
        this.legR.xRot = Mth.cos(pos * 0.6662F) * 0.9F * speed;
        this.legL.xRot = Mth.cos(pos * 0.6662F + Mth.PI) * 0.9F * speed;
        this.armR.xRot += Mth.cos(pos * 0.6662F + Mth.PI) * 0.35F * speed;
        this.armL.xRot += Mth.cos(pos * 0.6662F) * 0.35F * speed;

        // A gentle broken-doll list, and the spare arms drift out of phase.
        float idle = state.ageInTicks;
        this.torso.zRot += Mth.sin(idle * 0.045F) * 0.025F;
        this.head.zRot += Mth.sin(idle * 0.06F) * 0.03F;
        if (this.spareArmR.visible) {
            this.spareArmR.xRot += Mth.sin(idle * 0.09F) * 0.18F - 0.25F;
            this.spareArmL.xRot += Mth.cos(idle * 0.11F) * 0.18F - 0.25F;
            this.spareArmR.zRot += -0.2F + Mth.sin(idle * 0.07F) * 0.08F;
            this.spareArmL.zRot += 0.2F - Mth.cos(idle * 0.08F) * 0.08F;
        }

        this.risingAnimation.apply(state.risingAnimationState, state.ageInTicks);
        this.attackAnimation.apply(state.attackAnimationState, state.ageInTicks);
    }
}
