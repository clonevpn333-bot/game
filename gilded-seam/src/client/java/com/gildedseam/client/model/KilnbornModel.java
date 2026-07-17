package com.gildedseam.client.model;

import com.gildedseam.client.anim.KilnbornAnimations;
import com.gildedseam.client.render.state.KilnbornRenderState;
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
 * Kilnborn: a hunched walking furnace. Ponderous rolling gait, shoulders
 * doing most of the talking; when overfired, the whole chassis shivers
 * with contained heat.
 */
public class KilnbornModel extends EntityModel<KilnbornRenderState> {
    private final ModelPart torso;
    private final ModelPart head;
    private final ModelPart armR;
    private final ModelPart armL;
    private final ModelPart legR;
    private final ModelPart legL;
    private final ModelPart chimney;
    private final ModelPart chimney2;
    private final ModelPart spikeR;
    private final ModelPart spikeL;
    private final KeyframeAnimation attackAnimation;
    private final KeyframeAnimation chargeAnimation;

    public KilnbornModel(ModelPart root) {
        super(root);
        ModelPart pelvis = root.getChild("pelvis");
        this.torso = pelvis.getChild("torso");
        this.head = this.torso.getChild("head");
        this.chimney = this.torso.getChild("chimney");
        this.chimney2 = this.torso.getChild("chimney_2");
        this.spikeR = this.torso.getChild("pauldron_r").getChild("spike_r");
        this.spikeL = this.torso.getChild("pauldron_l").getChild("spike_l");
        this.armR = this.torso.getChild("pauldron_r").getChild("arm_r");
        this.armL = this.torso.getChild("pauldron_l").getChild("arm_l");
        this.legR = root.getChild("leg_r");
        this.legL = root.getChild("leg_l");
        this.attackAnimation = KilnbornAnimations.ATTACK.bake(root);
        this.chargeAnimation = KilnbornAnimations.CHARGE.bake(root);
    }

    public static LayerDefinition createBodyLayer() {
MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition pelvis = root.addOrReplaceChild("pelvis",
                CubeListBuilder.create()
                        .texOffs(80, 23).addBox(-5.0F, -3.0F, -3.5F, 10.0F, 3.0F, 7.0F),
                PartPose.offset(0.0F, 16.0F, 0.0F));
        PartDefinition torso = pelvis.addOrReplaceChild("torso",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-7.0F, -12.0F, -5.0F, 14.0F, 12.0F, 10.0F)
                        .texOffs(0, 47).addBox(-3.0F, -7.0F, -5.8F, 6.0F, 6.0F, 1.0F)
                        .texOffs(91, 0).addBox(-7.6F, -10.0F, -3.0F, 1.0F, 7.0F, 6.0F)
                        .texOffs(106, 0).addBox(6.6F, -10.0F, -3.0F, 1.0F, 7.0F, 6.0F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition chimney = torso.addOrReplaceChild("chimney",
                CubeListBuilder.create()
                        .texOffs(67, 36).addBox(-2.0F, -5.0F, -2.0F, 4.0F, 5.0F, 4.0F)
                        .texOffs(28, 47).addBox(-1.5F, -8.0F, -1.5F, 3.0F, 3.0F, 3.0F),
                PartPose.offset(0.0F, -12.0F, 3.0F));
        PartDefinition chimney2 = torso.addOrReplaceChild("chimney_2",
                CubeListBuilder.create()
                        .texOffs(15, 47).addBox(-1.5F, -4.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offsetAndRotation(-4.5F, -12.0F, 2.0F, 0.0F, 0.0F, 0.2443F));
        PartDefinition head = torso.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(0, 36).addBox(-3.0F, -4.0F, -3.0F, 6.0F, 4.0F, 6.0F),
                PartPose.offset(0.0F, -12.0F, -2.0F));
        PartDefinition pauldronR = torso.addOrReplaceChild("pauldron_r",
                CubeListBuilder.create()
                        .texOffs(0, 23).addBox(-4.0F, -2.0F, -3.5F, 4.0F, 5.0F, 7.0F),
                PartPose.offsetAndRotation(-7.0F, -11.0F, 0.0F, 0.0F, 0.0F, 0.1396F));
        PartDefinition spikeR = pauldronR.addOrReplaceChild("spike_r",
                CubeListBuilder.create()
                        .texOffs(41, 47).addBox(-1.0F, -4.0F, -1.0F, 2.0F, 4.0F, 2.0F),
                PartPose.offsetAndRotation(-3.0F, -2.0F, 0.0F, 0.0F, 0.0F, 0.4887F));
        PartDefinition armR = pauldronR.addOrReplaceChild("arm_r",
                CubeListBuilder.create()
                        .texOffs(46, 23).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 7.0F, 4.0F),
                PartPose.offset(-2.0F, 2.0F, 0.0F));
        PartDefinition armRLower = armR.addOrReplaceChild("arm_r_lower",
                CubeListBuilder.create()
                        .texOffs(49, 0).addBox(-2.5F, 0.0F, -2.5F, 5.0F, 8.0F, 5.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition knuckleR = armRLower.addOrReplaceChild("knuckle_r",
                CubeListBuilder.create()
                        .texOffs(59, 47).addBox(-2.0F, -1.0F, -2.0F, 4.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 8.0F, -1.0F));
        PartDefinition pauldronL = torso.addOrReplaceChild("pauldron_l",
                CubeListBuilder.create()
                        .texOffs(23, 23).addBox(0.0F, -2.0F, -3.5F, 4.0F, 5.0F, 7.0F),
                PartPose.offsetAndRotation(7.0F, -11.0F, 0.0F, 0.0F, 0.0F, -0.1396F));
        PartDefinition spikeL = pauldronL.addOrReplaceChild("spike_l",
                CubeListBuilder.create()
                        .texOffs(50, 47).addBox(-1.0F, -4.0F, -1.0F, 2.0F, 4.0F, 2.0F),
                PartPose.offsetAndRotation(3.0F, -2.0F, 0.0F, 0.0F, 0.0F, -0.4887F));
        PartDefinition armL = pauldronL.addOrReplaceChild("arm_l",
                CubeListBuilder.create()
                        .texOffs(63, 23).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 7.0F, 4.0F),
                PartPose.offset(2.0F, 2.0F, 0.0F));
        PartDefinition armLLower = armL.addOrReplaceChild("arm_l_lower",
                CubeListBuilder.create()
                        .texOffs(70, 0).addBox(-2.5F, 0.0F, -2.5F, 5.0F, 8.0F, 5.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition knuckleL = armLLower.addOrReplaceChild("knuckle_l",
                CubeListBuilder.create()
                        .texOffs(72, 47).addBox(-2.0F, -1.0F, -2.0F, 4.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 8.0F, -1.0F));
        PartDefinition legR = root.addOrReplaceChild("leg_r",
                CubeListBuilder.create()
                        .texOffs(25, 36).addBox(-2.5F, 0.0F, -2.5F, 5.0F, 5.0F, 5.0F),
                PartPose.offset(-3.5F, 16.0F, 0.0F));
        PartDefinition legRLower = legR.addOrReplaceChild("leg_r_lower",
                CubeListBuilder.create()
                        .texOffs(84, 36).addBox(-2.5F, 0.0F, -2.5F, 5.0F, 3.0F, 5.0F),
                PartPose.offset(0.0F, 5.0F, 0.0F));
        PartDefinition legL = root.addOrReplaceChild("leg_l",
                CubeListBuilder.create()
                        .texOffs(46, 36).addBox(-2.5F, 0.0F, -2.5F, 5.0F, 5.0F, 5.0F),
                PartPose.offset(3.5F, 16.0F, 0.0F));
        PartDefinition legLLower = legL.addOrReplaceChild("leg_l_lower",
                CubeListBuilder.create()
                        .texOffs(105, 36).addBox(-2.5F, 0.0F, -2.5F, 5.0F, 3.0F, 5.0F),
                PartPose.offset(0.0F, 5.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    @Override
    public void setupAnim(KilnbornRenderState state) {
        super.setupAnim(state);

        // Lustre mutation: a second flue and molten shoulder-spikes.
        boolean lustre = state.tier >= SeamHelper.TIER_LUSTRE;
        this.chimney2.visible = lustre;
        this.spikeR.visible = lustre;
        this.spikeL.visible = lustre;

        this.head.yRot = state.yRot * Mth.DEG_TO_RAD * 0.6F;
        this.head.xRot = state.xRot * Mth.DEG_TO_RAD * 0.6F;

        float pos = state.walkAnimationPos;
        float speed = state.walkAnimationSpeed;

        // Ponderous roll: short strides, big shoulder counterswing.
        float swing = pos * 0.5F;
        this.legR.xRot = Mth.cos(swing) * 0.7F * speed;
        this.legL.xRot = Mth.cos(swing + Mth.PI) * 0.7F * speed;
        this.armR.xRot += Mth.cos(swing + Mth.PI) * 0.55F * speed;
        this.armL.xRot += Mth.cos(swing) * 0.55F * speed;
        this.torso.zRot += Mth.cos(swing) * 0.07F * speed;

        // Chimney smoke-shudder; worse when overfired.
        float idle = state.ageInTicks;
        float shiver = state.overfired ? 0.045F : 0.015F;
        this.chimney.zRot += Mth.sin(idle * 0.9F) * shiver;
        this.torso.xRot += Mth.sin(idle * (state.overfired ? 0.8F : 0.05F)) * (state.overfired ? 0.012F : 0.02F);

        this.attackAnimation.apply(state.attackAnimationState, state.ageInTicks);
        this.chargeAnimation.apply(state.chargeAnimationState, state.ageInTicks);
    }
}
