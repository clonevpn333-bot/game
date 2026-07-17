package com.gildedseam.client.model;

import com.gildedseam.client.anim.ReliquaryColossusAnimations;
import com.gildedseam.client.render.state.ReliquaryColossusRenderState;

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
 * Reliquary Colossus: the six-armed idol. Dormant, it holds the prayer
 * pose — head bowed, top arms folded palm to palm, middle arms half
 * raised — until {@code AWAKEN} unfolds it. Walking is architecture in
 * motion: slow strides, halo precessing, folded lower arms tucked tight.
 */
public class ReliquaryColossusModel extends EntityModel<ReliquaryColossusRenderState> {
    private final ModelPart torso;
    private final ModelPart chest;
    private final ModelPart head;
    private final ModelPart haloDisc;
    private final ModelPart armTr;
    private final ModelPart armTl;
    private final ModelPart armTrLower;
    private final ModelPart armTlLower;
    private final ModelPart armMr;
    private final ModelPart armMl;
    private final ModelPart armLr;
    private final ModelPart armLl;
    private final ModelPart armLrLower;
    private final ModelPart armLlLower;
    private final ModelPart legR;
    private final ModelPart legL;
    private final KeyframeAnimation awakenAnimation;
    private final KeyframeAnimation sweepAnimation;
    private final KeyframeAnimation slamAnimation;
    private final KeyframeAnimation summonAnimation;

    public ReliquaryColossusModel(ModelPart root) {
        super(root);
        ModelPart pelvis = root.getChild("pelvis");
        this.torso = pelvis.getChild("torso");
        this.chest = this.torso.getChild("chest");
        this.head = this.chest.getChild("head");
        this.haloDisc = this.head.getChild("halo_disc");
        this.armTr = this.chest.getChild("arm_tr");
        this.armTl = this.chest.getChild("arm_tl");
        this.armTrLower = this.armTr.getChild("arm_tr_lower");
        this.armTlLower = this.armTl.getChild("arm_tl_lower");
        this.armMr = this.chest.getChild("arm_mr");
        this.armMl = this.chest.getChild("arm_ml");
        this.armLr = this.torso.getChild("arm_lr");
        this.armLl = this.torso.getChild("arm_ll");
        this.armLrLower = this.armLr.getChild("arm_lr_lower");
        this.armLlLower = this.armLl.getChild("arm_ll_lower");
        this.legR = root.getChild("leg_r");
        this.legL = root.getChild("leg_l");
        this.awakenAnimation = ReliquaryColossusAnimations.AWAKEN.bake(root);
        this.sweepAnimation = ReliquaryColossusAnimations.SWEEP.bake(root);
        this.slamAnimation = ReliquaryColossusAnimations.SLAM.bake(root);
        this.summonAnimation = ReliquaryColossusAnimations.SUMMON.bake(root);
    }

    public static LayerDefinition createBodyLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition pelvis = root.addOrReplaceChild("pelvis",
                CubeListBuilder.create()
                        .texOffs(75, 23).addBox(-8.0F, -5.0F, -6.0F, 16.0F, 5.0F, 12.0F)
                        .texOffs(72, 58).addBox(-6.0F, -6.2F, -7.0F, 12.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, -6.0F, 0.0F));
        PartDefinition skirtF = pelvis.addOrReplaceChild("skirt_f",
                CubeListBuilder.create()
                        .texOffs(179, 43).addBox(-6.0F, 0.0F, -1.0F, 12.0F, 8.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -6.0F, 0.1571F, 0.0F, 0.0F));
        PartDefinition skirtB = pelvis.addOrReplaceChild("skirt_b",
                CubeListBuilder.create()
                        .texOffs(206, 43).addBox(-6.0F, 0.0F, 0.0F, 12.0F, 8.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 6.0F, -0.1571F, 0.0F, 0.0F));
        PartDefinition torso = pelvis.addOrReplaceChild("torso",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-9.0F, -10.0F, -6.0F, 18.0F, 10.0F, 12.0F),
                PartPose.offset(0.0F, -5.0F, 0.0F));
        PartDefinition chest = torso.addOrReplaceChild("chest",
                CubeListBuilder.create()
                        .texOffs(61, 0).addBox(-8.0F, -12.0F, -5.0F, 16.0F, 12.0F, 10.0F)
                        .texOffs(172, 43).addBox(-1.0F, -11.0F, -5.6F, 2.0F, 10.0F, 1.0F),
                PartPose.offset(0.0F, -10.0F, 0.0F));
        PartDefinition shrine = chest.addOrReplaceChild("shrine",
                CubeListBuilder.create()
                        .texOffs(117, 43).addBox(-5.0F, -3.0F, 0.0F, 10.0F, 8.0F, 4.0F)
                        .texOffs(50, 58).addBox(-3.0F, -1.0F, 4.0F, 6.0F, 5.0F, 1.0F),
                PartPose.offset(0.0F, -8.0F, 5.0F));
        PartDefinition head = chest.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(42, 23).addBox(-5.0F, -12.0F, -3.0F, 10.0F, 12.0F, 6.0F),
                PartPose.offset(0.0F, -12.0F, 0.0F));
        PartDefinition haloDisc = head.addOrReplaceChild("halo_disc",
                CubeListBuilder.create()
                        .texOffs(208, 23).addBox(-7.0F, -7.0F, 0.0F, 14.0F, 14.0F, 1.0F),
                PartPose.offset(0.0F, -6.0F, 3.0F));
        PartDefinition crown0 = head.addOrReplaceChild("crown_0",
                CubeListBuilder.create()
                        .texOffs(65, 58).addBox(-1.0F, -4.0F, -0.5F, 2.0F, 4.0F, 1.0F),
                PartPose.offset(0.0F, -12.0F, 0.0F));
        PartDefinition crown1 = head.addOrReplaceChild("crown_1",
                CubeListBuilder.create()
                        .texOffs(101, 58).addBox(-1.0F, -3.0F, -0.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-3.0F, -12.0F, 0.0F, 0.0F, 0.0F, 0.2443F));
        PartDefinition crown2 = head.addOrReplaceChild("crown_2",
                CubeListBuilder.create()
                        .texOffs(108, 58).addBox(-1.0F, -3.0F, -0.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(3.0F, -12.0F, 0.0F, 0.0F, 0.0F, -0.2443F));
        PartDefinition armTr = chest.addOrReplaceChild("arm_tr",
                CubeListBuilder.create()
                        .texOffs(0, 23).addBox(-2.5F, 0.0F, -2.5F, 5.0F, 14.0F, 5.0F),
                PartPose.offset(-9.0F, -11.0F, 0.0F));
        PartDefinition armTrLower = armTr.addOrReplaceChild("arm_tr_lower",
                CubeListBuilder.create()
                        .texOffs(132, 23).addBox(-2.5F, 0.0F, -2.5F, 5.0F, 12.0F, 5.0F),
                PartPose.offset(0.0F, 14.0F, 0.0F));
        PartDefinition handTr = armTrLower.addOrReplaceChild("hand_tr",
                CubeListBuilder.create()
                        .texOffs(0, 58).addBox(-3.0F, 0.0F, -3.0F, 6.0F, 3.0F, 6.0F),
                PartPose.offset(0.0F, 12.0F, 0.0F));
        PartDefinition armTl = chest.addOrReplaceChild("arm_tl",
                CubeListBuilder.create()
                        .texOffs(21, 23).addBox(-2.5F, 0.0F, -2.5F, 5.0F, 14.0F, 5.0F),
                PartPose.offset(9.0F, -11.0F, 0.0F));
        PartDefinition armTlLower = armTl.addOrReplaceChild("arm_tl_lower",
                CubeListBuilder.create()
                        .texOffs(153, 23).addBox(-2.5F, 0.0F, -2.5F, 5.0F, 12.0F, 5.0F),
                PartPose.offset(0.0F, 14.0F, 0.0F));
        PartDefinition handTl = armTlLower.addOrReplaceChild("hand_tl",
                CubeListBuilder.create()
                        .texOffs(25, 58).addBox(-3.0F, 0.0F, -3.0F, 6.0F, 3.0F, 6.0F),
                PartPose.offset(0.0F, 12.0F, 0.0F));
        PartDefinition armMr = chest.addOrReplaceChild("arm_mr",
                CubeListBuilder.create()
                        .texOffs(174, 23).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 12.0F, 4.0F),
                PartPose.offset(-8.0F, -4.0F, 0.0F));
        PartDefinition armMrLower = armMr.addOrReplaceChild("arm_mr_lower",
                CubeListBuilder.create()
                        .texOffs(239, 23).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 10.0F, 4.0F),
                PartPose.offset(0.0F, 12.0F, 0.0F));
        PartDefinition armMl = chest.addOrReplaceChild("arm_ml",
                CubeListBuilder.create()
                        .texOffs(191, 23).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 12.0F, 4.0F),
                PartPose.offset(8.0F, -4.0F, 0.0F));
        PartDefinition armMlLower = armMl.addOrReplaceChild("arm_ml_lower",
                CubeListBuilder.create()
                        .texOffs(0, 43).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 10.0F, 4.0F),
                PartPose.offset(0.0F, 12.0F, 0.0F));
        PartDefinition armLr = torso.addOrReplaceChild("arm_lr",
                CubeListBuilder.create()
                        .texOffs(17, 43).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 10.0F, 3.0F),
                PartPose.offset(-7.0F, -8.0F, -2.0F));
        PartDefinition armLrLower = armLr.addOrReplaceChild("arm_lr_lower",
                CubeListBuilder.create()
                        .texOffs(146, 43).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 8.0F, 3.0F),
                PartPose.offset(0.0F, 10.0F, 0.0F));
        PartDefinition armLl = torso.addOrReplaceChild("arm_ll",
                CubeListBuilder.create()
                        .texOffs(30, 43).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 10.0F, 3.0F),
                PartPose.offset(7.0F, -8.0F, -2.0F));
        PartDefinition armLlLower = armLl.addOrReplaceChild("arm_ll_lower",
                CubeListBuilder.create()
                        .texOffs(159, 43).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 8.0F, 3.0F),
                PartPose.offset(0.0F, 10.0F, 0.0F));
        PartDefinition legR = root.addOrReplaceChild("leg_r",
                CubeListBuilder.create()
                        .texOffs(114, 0).addBox(-3.5F, 0.0F, -4.0F, 7.0F, 14.0F, 8.0F),
                PartPose.offset(-5.0F, -6.0F, 0.0F));
        PartDefinition legRLower = legR.addOrReplaceChild("leg_r_lower",
                CubeListBuilder.create()
                        .texOffs(145, 0).addBox(-3.5F, 0.0F, -4.0F, 7.0F, 14.0F, 8.0F),
                PartPose.offset(0.0F, 14.0F, 0.0F));
        PartDefinition footR = legRLower.addOrReplaceChild("foot_r",
                CubeListBuilder.create()
                        .texOffs(43, 43).addBox(-4.0F, 0.0F, -5.0F, 8.0F, 2.0F, 10.0F),
                PartPose.offset(0.0F, 14.0F, 0.0F));
        PartDefinition legL = root.addOrReplaceChild("leg_l",
                CubeListBuilder.create()
                        .texOffs(176, 0).addBox(-3.5F, 0.0F, -4.0F, 7.0F, 14.0F, 8.0F),
                PartPose.offset(5.0F, -6.0F, 0.0F));
        PartDefinition legLLower = legL.addOrReplaceChild("leg_l_lower",
                CubeListBuilder.create()
                        .texOffs(207, 0).addBox(-3.5F, 0.0F, -4.0F, 7.0F, 14.0F, 8.0F),
                PartPose.offset(0.0F, 14.0F, 0.0F));
        PartDefinition footL = legLLower.addOrReplaceChild("foot_l",
                CubeListBuilder.create()
                        .texOffs(80, 43).addBox(-4.0F, 0.0F, -5.0F, 8.0F, 2.0F, 10.0F),
                PartPose.offset(0.0F, 14.0F, 0.0F));

        return LayerDefinition.create(mesh, 256, 256);
    }

    /** The standing-idol pose held while dormant. AWAKEN starts from here. */
    private void applyPrayerPose() {
        this.head.xRot = ReliquaryColossusAnimations.PRAYER_HEAD_X * Mth.DEG_TO_RAD;
        this.torso.xRot = ReliquaryColossusAnimations.PRAYER_TORSO_X * Mth.DEG_TO_RAD;
        this.armTr.xRot = ReliquaryColossusAnimations.PRAYER_ARM_T_X * Mth.DEG_TO_RAD;
        this.armTl.xRot = ReliquaryColossusAnimations.PRAYER_ARM_T_X * Mth.DEG_TO_RAD;
        this.armTr.zRot = -18.0F * Mth.DEG_TO_RAD;
        this.armTl.zRot = 18.0F * Mth.DEG_TO_RAD;
        this.armTrLower.xRot = ReliquaryColossusAnimations.PRAYER_ELBOW_T_X * Mth.DEG_TO_RAD;
        this.armTlLower.xRot = ReliquaryColossusAnimations.PRAYER_ELBOW_T_X * Mth.DEG_TO_RAD;
        this.armMr.xRot = ReliquaryColossusAnimations.PRAYER_ARM_M_X * Mth.DEG_TO_RAD;
        this.armMl.xRot = ReliquaryColossusAnimations.PRAYER_ARM_M_X * Mth.DEG_TO_RAD;
        this.armMr.yRot = 25.0F * Mth.DEG_TO_RAD;
        this.armMl.yRot = -25.0F * Mth.DEG_TO_RAD;
    }

    @Override
    public void setupAnim(ReliquaryColossusRenderState state) {
        super.setupAnim(state);

        // The lower pair never unfolds: permanently pressed together in prayer.
        this.armLr.xRot = -1.7F;
        this.armLl.xRot = -1.7F;
        this.armLr.yRot = 0.55F;
        this.armLl.yRot = -0.55F;
        this.armLrLower.xRot = 1.25F;
        this.armLlLower.xRot = 1.25F;

        if (state.dormant && !state.awakenAnimationState.isStarted()) {
            this.applyPrayerPose();
            return;
        }

        this.head.yRot = state.yRot * Mth.DEG_TO_RAD * 0.5F;
        this.head.xRot = state.xRot * Mth.DEG_TO_RAD * 0.5F;

        float pos = state.walkAnimationPos;
        float speed = state.walkAnimationSpeed;
        float idle = state.ageInTicks;

        // Architecture, walking.
        float swing = pos * 0.35F;
        this.legR.xRot = Mth.cos(swing) * 0.55F * speed;
        this.legL.xRot = Mth.cos(swing + Mth.PI) * 0.55F * speed;
        this.armTr.xRot += Mth.cos(swing + Mth.PI) * 0.25F * speed;
        this.armTl.xRot += Mth.cos(swing) * 0.25F * speed;
        this.armMr.xRot += Mth.cos(swing + Mth.PI) * 0.15F * speed;
        this.armMl.xRot += Mth.cos(swing) * 0.15F * speed;
        this.torso.zRot += Mth.cos(swing) * 0.04F * speed;

        // The halo never stops considering.
        this.haloDisc.zRot = idle * 0.01F;
        this.haloDisc.yRot += Mth.sin(idle * 0.02F) * 0.05F;

        this.awakenAnimation.apply(state.awakenAnimationState, state.ageInTicks);
        this.sweepAnimation.apply(state.sweepAnimationState, state.ageInTicks);
        this.slamAnimation.apply(state.slamAnimationState, state.ageInTicks);
        this.summonAnimation.apply(state.summonAnimationState, state.ageInTicks);
    }
}
