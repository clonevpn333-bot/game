package com.gildedseam.client.model;

import com.gildedseam.client.anim.SeamstressAnimations;
import com.gildedseam.client.render.state.SeamstressRenderState;
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
 * Seamstress: stilt-legged and four-armed. The walk is a slow heron-step
 * with backward-bent knees; the lower loom-arms stitch the air constantly,
 * even when nothing is being mended.
 */
public class SeamstressModel extends EntityModel<SeamstressRenderState> {
    private final ModelPart torso;
    private final ModelPart chest;
    private final ModelPart head;
    private final ModelPart armUr;
    private final ModelPart armUl;
    private final ModelPart armLr;
    private final ModelPart armLl;
    private final ModelPart armLrLower;
    private final ModelPart armLlLower;
    private final ModelPart armXr;
    private final ModelPart armXl;
    private final ModelPart legR;
    private final ModelPart legL;
    private final ModelPart legRLower;
    private final ModelPart legLLower;
    private final KeyframeAnimation attackAnimation;
    private final KeyframeAnimation lashAnimation;
    private final KeyframeAnimation mendAnimation;

    public SeamstressModel(ModelPart root) {
        super(root);
        ModelPart pelvis = root.getChild("pelvis");
        this.torso = pelvis.getChild("torso");
        this.chest = this.torso.getChild("chest");
        this.head = this.chest.getChild("head");
        this.armUr = this.chest.getChild("arm_ur");
        this.armUl = this.chest.getChild("arm_ul");
        this.armLr = this.torso.getChild("arm_lr");
        this.armLl = this.torso.getChild("arm_ll");
        this.armLrLower = this.armLr.getChild("arm_lr_lower");
        this.armLlLower = this.armLl.getChild("arm_ll_lower");
        this.armXr = pelvis.getChild("arm_xr");
        this.armXl = pelvis.getChild("arm_xl");
        this.legR = root.getChild("leg_r");
        this.legL = root.getChild("leg_l");
        this.legRLower = this.legR.getChild("leg_r_lower");
        this.legLLower = this.legL.getChild("leg_l_lower");
        this.attackAnimation = SeamstressAnimations.ATTACK.bake(root);
        this.lashAnimation = SeamstressAnimations.LASH.bake(root);
        this.mendAnimation = SeamstressAnimations.MEND.bake(root);
    }

    public static LayerDefinition createBodyLayer() {
MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition pelvis = root.addOrReplaceChild("pelvis",
                CubeListBuilder.create()
                        .texOffs(86, 14).addBox(-3.5F, -3.0F, -2.0F, 7.0F, 3.0F, 4.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition torso = pelvis.addOrReplaceChild("torso",
                CubeListBuilder.create()
                        .texOffs(25, 0).addBox(-3.0F, -8.0F, -2.0F, 6.0F, 8.0F, 4.0F)
                        .texOffs(63, 14).addBox(-0.5F, -8.0F, -2.6F, 1.0F, 8.0F, 1.0F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition chest = torso.addOrReplaceChild("chest",
                CubeListBuilder.create()
                        .texOffs(75, 0).addBox(-4.0F, -6.0F, -2.5F, 8.0F, 6.0F, 5.0F),
                PartPose.offset(0.0F, -8.0F, 0.0F));
        PartDefinition spool = chest.addOrReplaceChild("spool",
                CubeListBuilder.create()
                        .texOffs(5, 24).addBox(-2.0F, -2.0F, 0.0F, 4.0F, 4.0F, 2.0F)
                        .texOffs(109, 14).addBox(-3.0F, 1.0F, 0.5F, 1.0F, 6.0F, 1.0F)
                        .texOffs(18, 24).addBox(2.0F, 0.0F, 0.5F, 1.0F, 5.0F, 1.0F),
                PartPose.offset(0.0F, -4.0F, 2.5F));
        PartDefinition head = chest.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-3.0F, -7.0F, -3.0F, 6.0F, 7.0F, 6.0F),
                PartPose.offset(0.0F, -6.0F, 0.0F));
        PartDefinition hood = head.addOrReplaceChild("hood",
                CubeListBuilder.create()
                        .texOffs(46, 0).addBox(-3.5F, -1.0F, -3.5F, 7.0F, 4.0F, 7.0F)
                        .texOffs(23, 24).addBox(-2.0F, 5.0F, -3.6F, 4.0F, 3.0F, 1.0F),
                PartPose.offset(0.0F, -7.0F, 0.0F));
        PartDefinition armUr = chest.addOrReplaceChild("arm_ur",
                CubeListBuilder.create()
                        .texOffs(102, 0).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 8.0F, 2.0F),
                PartPose.offset(-4.5F, -5.0F, 0.0F));
        PartDefinition armUrLower = armUr.addOrReplaceChild("arm_ur_lower",
                CubeListBuilder.create()
                        .texOffs(120, 0).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offset(0.0F, 8.0F, 0.0F));
        PartDefinition needleR = armUrLower.addOrReplaceChild("needle_r",
                CubeListBuilder.create()
                        .texOffs(34, 24).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition armUl = chest.addOrReplaceChild("arm_ul",
                CubeListBuilder.create()
                        .texOffs(111, 0).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 8.0F, 2.0F),
                PartPose.offset(4.5F, -5.0F, 0.0F));
        PartDefinition armUlLower = armUl.addOrReplaceChild("arm_ul_lower",
                CubeListBuilder.create()
                        .texOffs(0, 14).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offset(0.0F, 8.0F, 0.0F));
        PartDefinition needleL = armUlLower.addOrReplaceChild("needle_l",
                CubeListBuilder.create()
                        .texOffs(39, 24).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition armLr = torso.addOrReplaceChild("arm_lr",
                CubeListBuilder.create()
                        .texOffs(9, 14).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offset(-3.5F, -7.0F, 0.0F));
        PartDefinition armLrLower = armLr.addOrReplaceChild("arm_lr_lower",
                CubeListBuilder.create()
                        .texOffs(68, 14).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition armLl = torso.addOrReplaceChild("arm_ll",
                CubeListBuilder.create()
                        .texOffs(18, 14).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offset(3.5F, -7.0F, 0.0F));
        PartDefinition armLlLower = armLl.addOrReplaceChild("arm_ll_lower",
                CubeListBuilder.create()
                        .texOffs(77, 14).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition armXr = pelvis.addOrReplaceChild("arm_xr",
                CubeListBuilder.create()
                        .texOffs(114, 14).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 6.0F, 1.0F),
                PartPose.offset(-3.5F, -2.0F, 0.0F));
        PartDefinition armXrLower = armXr.addOrReplaceChild("arm_xr_lower",
                CubeListBuilder.create()
                        .texOffs(119, 14).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 6.0F, 1.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition armXl = pelvis.addOrReplaceChild("arm_xl",
                CubeListBuilder.create()
                        .texOffs(124, 14).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 6.0F, 1.0F),
                PartPose.offset(3.5F, -2.0F, 0.0F));
        PartDefinition armXlLower = armXl.addOrReplaceChild("arm_xl_lower",
                CubeListBuilder.create()
                        .texOffs(0, 24).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 6.0F, 1.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition legR = root.addOrReplaceChild("leg_r",
                CubeListBuilder.create()
                        .texOffs(27, 14).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offset(-2.0F, 7.0F, 0.0F));
        PartDefinition legRLower = legR.addOrReplaceChild("leg_r_lower",
                CubeListBuilder.create()
                        .texOffs(36, 14).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition footR = legRLower.addOrReplaceChild("foot_r",
                CubeListBuilder.create()
                        .texOffs(44, 24).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition legL = root.addOrReplaceChild("leg_l",
                CubeListBuilder.create()
                        .texOffs(45, 14).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offset(2.0F, 7.0F, 0.0F));
        PartDefinition legLLower = legL.addOrReplaceChild("leg_l_lower",
                CubeListBuilder.create()
                        .texOffs(54, 14).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition footL = legLLower.addOrReplaceChild("foot_l",
                CubeListBuilder.create()
                        .texOffs(49, 24).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    @Override
    public void setupAnim(SeamstressRenderState state) {
        super.setupAnim(state);

        // Lustre mutation: a sixth and seventh limb of pure drawn gold.
        this.armXr.visible = state.tier >= SeamHelper.TIER_LUSTRE;
        this.armXl.visible = state.tier >= SeamHelper.TIER_LUSTRE;

        this.head.yRot = state.yRot * Mth.DEG_TO_RAD;
        this.head.xRot = state.xRot * Mth.DEG_TO_RAD;

        float pos = state.walkAnimationPos;
        float speed = state.walkAnimationSpeed;

        // Heron-step: high slow strides, knees bending the wrong way.
        float swing = pos * 0.5F;
        this.legR.xRot = Mth.cos(swing) * 0.75F * speed;
        this.legL.xRot = Mth.cos(swing + Mth.PI) * 0.75F * speed;
        this.legRLower.xRot = Math.max(0.0F, Mth.sin(swing)) * 0.8F * speed;
        this.legLLower.xRot = Math.max(0.0F, Mth.sin(swing + Mth.PI)) * 0.8F * speed;

        // Upper arms sway with the stride; loom-arms keep stitching.
        this.armUr.xRot += Mth.cos(swing + Mth.PI) * 0.3F * speed;
        this.armUl.xRot += Mth.cos(swing) * 0.3F * speed;

        float idle = state.ageInTicks;
        this.armLr.xRot += -0.9F + Mth.sin(idle * 0.19F) * 0.22F;
        this.armLl.xRot += -0.9F + Mth.sin(idle * 0.19F + Mth.PI) * 0.22F;
        this.armLrLower.xRot += -0.4F + Mth.cos(idle * 0.23F) * 0.28F;
        this.armLlLower.xRot += -0.4F + Mth.cos(idle * 0.23F + Mth.PI) * 0.28F;
        this.armLr.yRot += Mth.sin(idle * 0.11F) * 0.15F;
        this.armLl.yRot += -Mth.sin(idle * 0.11F) * 0.15F;

        // The whole column sways like a mast.
        this.torso.zRot += Mth.sin(idle * 0.05F) * 0.03F;
        this.chest.zRot += Mth.sin(idle * 0.05F + 0.6F) * 0.02F;

        if (this.armXr.visible) {
            this.armXr.xRot += -0.5F + Mth.sin(idle * 0.14F) * 0.3F;
            this.armXl.xRot += -0.5F + Mth.cos(idle * 0.12F) * 0.3F;
            this.armXr.zRot += -0.35F;
            this.armXl.zRot += 0.35F;
        }

        this.attackAnimation.apply(state.attackAnimationState, state.ageInTicks);
        this.lashAnimation.apply(state.lashAnimationState, state.ageInTicks);
        this.mendAnimation.apply(state.mendAnimationState, state.ageInTicks);
    }
}
