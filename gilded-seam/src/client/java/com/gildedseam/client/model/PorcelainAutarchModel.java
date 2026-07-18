package com.gildedseam.client.model;

import com.gildedseam.client.anim.PorcelainAutarchAnimations;
import com.gildedseam.client.render.state.PorcelainAutarchRenderState;

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
 * The Porcelain Autarch: a crowned idol borne on eight gilded palanquin
 * legs, six arms, three counter-spinning halo rings. Enthroned (dormant)
 * it holds court motionless; enraged, the rings spin like saw-wheels.
 */
public class PorcelainAutarchModel extends EntityModel<PorcelainAutarchRenderState> {
    private final ModelPart torso;
    private final ModelPart chest;
    private final ModelPart head;
    private final ModelPart armR;
    private final ModelPart armL;
    private final ModelPart armRLower;
    private final ModelPart armLLower;
    private final ModelPart[] mantleArms = new ModelPart[4];
    private final ModelPart[] bearers = new ModelPart[8];
    private final ModelPart[] bearerMids = new ModelPart[8];
    private final ModelPart ring0;
    private final ModelPart ring1;
    private final ModelPart ring2;
    private final KeyframeAnimation awakenAnimation;
    private final KeyframeAnimation sweepAnimation;
    private final KeyframeAnimation stormAnimation;
    private final KeyframeAnimation novaAnimation;
    private final KeyframeAnimation decreeAnimation;

    public PorcelainAutarchModel(ModelPart root) {
        super(root);
        ModelPart dais = root.getChild("dais");
        this.torso = dais.getChild("torso");
        this.chest = this.torso.getChild("chest");
        this.head = this.chest.getChild("head");
        this.armR = this.chest.getChild("arm_r");
        this.armL = this.chest.getChild("arm_l");
        this.armRLower = this.armR.getChild("arm_r_lower");
        this.armLLower = this.armL.getChild("arm_l_lower");
        this.mantleArms[0] = this.torso.getChild("mantle_arm_r0");
        this.mantleArms[1] = this.torso.getChild("mantle_arm_l0");
        this.mantleArms[2] = this.torso.getChild("mantle_arm_r1");
        this.mantleArms[3] = this.torso.getChild("mantle_arm_l1");
        for (int i = 0; i < 8; i++) {
            this.bearers[i] = root.getChild("bearer_" + i);
            this.bearerMids[i] = this.bearers[i].getChild("bearer_" + i + "_mid");
        }
        this.ring0 = this.head.getChild("ring_0");
        this.ring1 = this.head.getChild("ring_1");
        this.ring2 = this.head.getChild("ring_2");
        this.awakenAnimation = PorcelainAutarchAnimations.AWAKEN.bake(root);
        this.sweepAnimation = PorcelainAutarchAnimations.SWEEP.bake(root);
        this.stormAnimation = PorcelainAutarchAnimations.STORM.bake(root);
        this.novaAnimation = PorcelainAutarchAnimations.NOVA.bake(root);
        this.decreeAnimation = PorcelainAutarchAnimations.DECREE.bake(root);
    }

    public static LayerDefinition createBodyLayer() {
MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition dais = root.addOrReplaceChild("dais",
                CubeListBuilder.create()
                        .texOffs(130, 0).addBox(-11.0F, -4.0F, -9.0F, 22.0F, 4.0F, 18.0F)
                        .texOffs(146, 29).addBox(-9.0F, -5.5F, -7.0F, 18.0F, 2.0F, 14.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition torso = dais.addOrReplaceChild("torso",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-10.0F, -14.0F, -7.0F, 20.0F, 14.0F, 14.0F)
                        .texOffs(50, 29).addBox(-10.6F, -13.0F, -5.0F, 1.0F, 12.0F, 10.0F)
                        .texOffs(73, 29).addBox(9.6F, -13.0F, -5.0F, 1.0F, 12.0F, 10.0F),
                PartPose.offset(0.0F, -5.5F, 0.0F));
        PartDefinition chest = torso.addOrReplaceChild("chest",
                CubeListBuilder.create()
                        .texOffs(69, 0).addBox(-9.0F, -12.0F, -6.0F, 18.0F, 12.0F, 12.0F)
                        .texOffs(141, 68).addBox(-3.0F, -10.0F, -6.6F, 6.0F, 8.0F, 1.0F)
                        .texOffs(0, 52).addBox(-9.5F, -12.5F, -6.5F, 19.0F, 2.0F, 13.0F),
                PartPose.offset(0.0F, -14.0F, 0.0F));
        PartDefinition head = chest.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(211, 0).addBox(-6.0F, -14.0F, -4.0F, 12.0F, 14.0F, 8.0F),
                PartPose.offset(0.0F, -12.0F, 0.0F));
        PartDefinition crownBand = head.addOrReplaceChild("crown_band",
                CubeListBuilder.create()
                        .texOffs(137, 52).addBox(-7.0F, -3.0F, -5.0F, 14.0F, 3.0F, 10.0F)
                        .texOffs(0, 95).addBox(-6.3F, -1.0F, -5.3F, 12.0F, 1.0F, 1.0F),
                PartPose.offset(0.0F, -14.0F, 0.0F));
        PartDefinition crownSpike0 = crownBand.addOrReplaceChild("crown_spike_0",
                CubeListBuilder.create()
                        .texOffs(83, 89).addBox(-1.0F, -4.0F, 3.5F, 2.0F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(-6.0F, -3.0F, 0.0F, 0.0F, 0.0F, 0.2793F));
        PartDefinition crownSpike1 = crownBand.addOrReplaceChild("crown_spike_1",
                CubeListBuilder.create()
                        .texOffs(90, 89).addBox(-1.0F, -4.0F, 3.5F, 2.0F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(-3.0F, -3.0F, 0.0F, 0.0F, 0.0F, 0.1396F));
        PartDefinition crownSpike2 = crownBand.addOrReplaceChild("crown_spike_2",
                CubeListBuilder.create()
                        .texOffs(248, 68).addBox(-1.0F, -6.0F, 3.5F, 2.0F, 6.0F, 1.0F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition crownSpike3 = crownBand.addOrReplaceChild("crown_spike_3",
                CubeListBuilder.create()
                        .texOffs(97, 89).addBox(-1.0F, -4.0F, 3.5F, 2.0F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(3.0F, -3.0F, 0.0F, 0.0F, 0.0F, -0.1396F));
        PartDefinition crownSpike4 = crownBand.addOrReplaceChild("crown_spike_4",
                CubeListBuilder.create()
                        .texOffs(104, 89).addBox(-1.0F, -4.0F, 3.5F, 2.0F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(6.0F, -3.0F, 0.0F, 0.0F, 0.0F, -0.2793F));
        PartDefinition browBand = head.addOrReplaceChild("brow_band",
                CubeListBuilder.create()
                        .texOffs(111, 89).addBox(-6.0F, 0.0F, 0.0F, 12.0F, 2.0F, 1.0F),
                PartPose.offset(0.0F, -10.0F, -4.2F));
        PartDefinition chinBand = head.addOrReplaceChild("chin_band",
                CubeListBuilder.create()
                        .texOffs(138, 89).addBox(-3.0F, 0.0F, 0.0F, 6.0F, 2.0F, 1.0F),
                PartPose.offset(0.0F, -2.0F, -4.2F));
        PartDefinition ring0 = head.addOrReplaceChild("ring_0",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -8.0F, 5.0F));
        PartDefinition ring0Petal0 = ring0.addOrReplaceChild("ring0_petal_0",
                CubeListBuilder.create()
                        .texOffs(146, 81).addBox(-1.5F, -11.0F, -0.5F, 3.0F, 5.0F, 1.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition ring0Petal1 = ring0.addOrReplaceChild("ring0_petal_1",
                CubeListBuilder.create()
                        .texOffs(155, 81).addBox(-1.5F, -11.0F, -0.5F, 3.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 1.0472F));
        PartDefinition ring0Petal2 = ring0.addOrReplaceChild("ring0_petal_2",
                CubeListBuilder.create()
                        .texOffs(164, 81).addBox(-1.5F, -11.0F, -0.5F, 3.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 2.0944F));
        PartDefinition ring0Petal3 = ring0.addOrReplaceChild("ring0_petal_3",
                CubeListBuilder.create()
                        .texOffs(173, 81).addBox(-1.5F, -11.0F, -0.5F, 3.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 3.1416F));
        PartDefinition ring0Petal4 = ring0.addOrReplaceChild("ring0_petal_4",
                CubeListBuilder.create()
                        .texOffs(182, 81).addBox(-1.5F, -11.0F, -0.5F, 3.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 4.1888F));
        PartDefinition ring0Petal5 = ring0.addOrReplaceChild("ring0_petal_5",
                CubeListBuilder.create()
                        .texOffs(191, 81).addBox(-1.5F, -11.0F, -0.5F, 3.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 5.236F));
        PartDefinition ring1 = head.addOrReplaceChild("ring_1",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -8.0F, 7.0F));
        PartDefinition ring1Petal0 = ring1.addOrReplaceChild("ring1_petal_0",
                CubeListBuilder.create()
                        .texOffs(0, 81).addBox(-1.0F, -15.0F, -0.5F, 2.0F, 6.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 0.5236F));
        PartDefinition ring1Petal1 = ring1.addOrReplaceChild("ring1_petal_1",
                CubeListBuilder.create()
                        .texOffs(7, 81).addBox(-1.0F, -15.0F, -0.5F, 2.0F, 6.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 1.5708F));
        PartDefinition ring1Petal2 = ring1.addOrReplaceChild("ring1_petal_2",
                CubeListBuilder.create()
                        .texOffs(14, 81).addBox(-1.0F, -15.0F, -0.5F, 2.0F, 6.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 2.618F));
        PartDefinition ring1Petal3 = ring1.addOrReplaceChild("ring1_petal_3",
                CubeListBuilder.create()
                        .texOffs(21, 81).addBox(-1.0F, -15.0F, -0.5F, 2.0F, 6.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 3.6652F));
        PartDefinition ring1Petal4 = ring1.addOrReplaceChild("ring1_petal_4",
                CubeListBuilder.create()
                        .texOffs(28, 81).addBox(-1.0F, -15.0F, -0.5F, 2.0F, 6.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 4.7124F));
        PartDefinition ring1Petal5 = ring1.addOrReplaceChild("ring1_petal_5",
                CubeListBuilder.create()
                        .texOffs(35, 81).addBox(-1.0F, -15.0F, -0.5F, 2.0F, 6.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 5.7596F));
        PartDefinition ring2 = head.addOrReplaceChild("ring_2",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -8.0F, 9.0F));
        PartDefinition ring2Petal0 = ring2.addOrReplaceChild("ring2_petal_0",
                CubeListBuilder.create()
                        .texOffs(192, 68).addBox(-1.0F, -19.0F, -0.5F, 2.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 0.2618F));
        PartDefinition ring2Petal1 = ring2.addOrReplaceChild("ring2_petal_1",
                CubeListBuilder.create()
                        .texOffs(199, 68).addBox(-1.0F, -19.0F, -0.5F, 2.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 1.0472F));
        PartDefinition ring2Petal2 = ring2.addOrReplaceChild("ring2_petal_2",
                CubeListBuilder.create()
                        .texOffs(206, 68).addBox(-1.0F, -19.0F, -0.5F, 2.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 1.8326F));
        PartDefinition ring2Petal3 = ring2.addOrReplaceChild("ring2_petal_3",
                CubeListBuilder.create()
                        .texOffs(213, 68).addBox(-1.0F, -19.0F, -0.5F, 2.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 2.618F));
        PartDefinition ring2Petal4 = ring2.addOrReplaceChild("ring2_petal_4",
                CubeListBuilder.create()
                        .texOffs(220, 68).addBox(-1.0F, -19.0F, -0.5F, 2.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 3.4034F));
        PartDefinition ring2Petal5 = ring2.addOrReplaceChild("ring2_petal_5",
                CubeListBuilder.create()
                        .texOffs(227, 68).addBox(-1.0F, -19.0F, -0.5F, 2.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 4.1888F));
        PartDefinition ring2Petal6 = ring2.addOrReplaceChild("ring2_petal_6",
                CubeListBuilder.create()
                        .texOffs(234, 68).addBox(-1.0F, -19.0F, -0.5F, 2.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 4.9742F));
        PartDefinition ring2Petal7 = ring2.addOrReplaceChild("ring2_petal_7",
                CubeListBuilder.create()
                        .texOffs(241, 68).addBox(-1.0F, -19.0F, -0.5F, 2.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 5.7596F));
        PartDefinition shrineR = chest.addOrReplaceChild("shrine_r",
                CubeListBuilder.create()
                        .texOffs(67, 68).addBox(-2.5F, -6.0F, -2.0F, 5.0F, 6.0F, 4.0F)
                        .texOffs(65, 89).addBox(-1.5F, -5.0F, -2.4F, 3.0F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(-6.0F, -12.5F, 2.0F, 0.0F, 0.0F, 0.1396F));
        PartDefinition shrineL = chest.addOrReplaceChild("shrine_l",
                CubeListBuilder.create()
                        .texOffs(86, 68).addBox(-2.5F, -6.0F, -2.0F, 5.0F, 6.0F, 4.0F)
                        .texOffs(74, 89).addBox(-1.5F, -5.0F, -2.4F, 3.0F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(6.0F, -12.5F, 2.0F, 0.0F, 0.0F, -0.1396F));
        PartDefinition armR = chest.addOrReplaceChild("arm_r",
                CubeListBuilder.create()
                        .texOffs(0, 29).addBox(-3.0F, 0.0F, -3.0F, 6.0F, 16.0F, 6.0F),
                PartPose.offset(-10.5F, -11.0F, 0.0F));
        PartDefinition armRLower = armR.addOrReplaceChild("arm_r_lower",
                CubeListBuilder.create()
                        .texOffs(96, 29).addBox(-3.0F, 0.0F, -3.0F, 6.0F, 14.0F, 6.0F),
                PartPose.offset(0.0F, 16.0F, 0.0F));
        PartDefinition handR = armRLower.addOrReplaceChild("hand_r",
                CubeListBuilder.create()
                        .texOffs(9, 68).addBox(-3.5F, 0.0F, -3.5F, 7.0F, 3.0F, 7.0F),
                PartPose.offset(0.0F, 14.0F, 0.0F));
        PartDefinition armL = chest.addOrReplaceChild("arm_l",
                CubeListBuilder.create()
                        .texOffs(25, 29).addBox(-3.0F, 0.0F, -3.0F, 6.0F, 16.0F, 6.0F),
                PartPose.offset(10.5F, -11.0F, 0.0F));
        PartDefinition armLLower = armL.addOrReplaceChild("arm_l_lower",
                CubeListBuilder.create()
                        .texOffs(121, 29).addBox(-3.0F, 0.0F, -3.0F, 6.0F, 14.0F, 6.0F),
                PartPose.offset(0.0F, 16.0F, 0.0F));
        PartDefinition handL = armLLower.addOrReplaceChild("hand_l",
                CubeListBuilder.create()
                        .texOffs(38, 68).addBox(-3.5F, 0.0F, -3.5F, 7.0F, 3.0F, 7.0F),
                PartPose.offset(0.0F, 14.0F, 0.0F));
        PartDefinition mantleArmR0 = torso.addOrReplaceChild("mantle_arm_r0",
                CubeListBuilder.create()
                        .texOffs(105, 68).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 8.0F, 2.0F),
                PartPose.offset(-9.5F, -12.0F, 3.0F));
        PartDefinition mantleArmR0Lower = mantleArmR0.addOrReplaceChild("mantle_arm_r0_lower",
                CubeListBuilder.create()
                        .texOffs(114, 68).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 8.0F, 2.0F),
                PartPose.offset(0.0F, 8.0F, 0.0F));
        PartDefinition mantleArmL0 = torso.addOrReplaceChild("mantle_arm_l0",
                CubeListBuilder.create()
                        .texOffs(123, 68).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 8.0F, 2.0F),
                PartPose.offset(9.5F, -12.0F, 3.0F));
        PartDefinition mantleArmL0Lower = mantleArmL0.addOrReplaceChild("mantle_arm_l0_lower",
                CubeListBuilder.create()
                        .texOffs(132, 68).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 8.0F, 2.0F),
                PartPose.offset(0.0F, 8.0F, 0.0F));
        PartDefinition mantleArmR1 = torso.addOrReplaceChild("mantle_arm_r1",
                CubeListBuilder.create()
                        .texOffs(156, 68).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offset(-9.5F, -6.0F, 5.0F));
        PartDefinition mantleArmR1Lower = mantleArmR1.addOrReplaceChild("mantle_arm_r1_lower",
                CubeListBuilder.create()
                        .texOffs(165, 68).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition mantleArmL1 = torso.addOrReplaceChild("mantle_arm_l1",
                CubeListBuilder.create()
                        .texOffs(174, 68).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offset(9.5F, -6.0F, 5.0F));
        PartDefinition mantleArmL1Lower = mantleArmL1.addOrReplaceChild("mantle_arm_l1_lower",
                CubeListBuilder.create()
                        .texOffs(183, 68).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition censerR = dais.addOrReplaceChild("censer_r",
                CubeListBuilder.create()
                        .texOffs(200, 81).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 5.0F, 1.0F)
                        .texOffs(120, 81).addBox(-1.5F, 5.0F, -1.5F, 3.0F, 3.0F, 3.0F),
                PartPose.offset(-9.0F, -5.5F, -8.0F));
        PartDefinition censerL = dais.addOrReplaceChild("censer_l",
                CubeListBuilder.create()
                        .texOffs(205, 81).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 5.0F, 1.0F)
                        .texOffs(133, 81).addBox(-1.5F, 5.0F, -1.5F, 3.0F, 3.0F, 3.0F),
                PartPose.offset(9.0F, -5.5F, -8.0F));
        PartDefinition fringeF = dais.addOrReplaceChild("fringe_f",
                CubeListBuilder.create()
                        .texOffs(42, 81).addBox(-9.0F, 0.0F, 0.0F, 18.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.0F, -9.2F, 0.1047F, 0.0F, 0.0F));
        PartDefinition fringeB = dais.addOrReplaceChild("fringe_b",
                CubeListBuilder.create()
                        .texOffs(81, 81).addBox(-9.0F, 0.0F, 0.0F, 18.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.0F, 9.2F, -0.1047F, 0.0F, 0.0F));
        PartDefinition bearer0 = root.addOrReplaceChild("bearer_0",
                CubeListBuilder.create()
                        .texOffs(186, 52).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 10.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 9.0F, 0.5585F, 0.0F, 0.0F));
        PartDefinition bearer0Mid = bearer0.addOrReplaceChild("bearer_0_mid",
                CubeListBuilder.create()
                        .texOffs(65, 52).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 12.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 10.0F, 0.0F, -1.117F, 0.0F, 0.0F));
        PartDefinition bearer0Hand = bearer0Mid.addOrReplaceChild("bearer_0_hand",
                CubeListBuilder.create()
                        .texOffs(210, 81).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F)
                        .texOffs(153, 89).addBox(-1.5F, 2.0F, -1.5F, 1.0F, 2.0F, 1.0F)
                        .texOffs(158, 89).addBox(0.5F, 2.0F, 0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 12.0F, 0.0F, 0.5585F, 0.0F, 0.0F));
        PartDefinition bearer1 = root.addOrReplaceChild("bearer_1",
                CubeListBuilder.create()
                        .texOffs(195, 52).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 10.0F, 2.0F),
                PartPose.offsetAndRotation(6.364F, 2.0F, 6.364F, 0.5585F, 0.7854F, 0.0F));
        PartDefinition bearer1Mid = bearer1.addOrReplaceChild("bearer_1_mid",
                CubeListBuilder.create()
                        .texOffs(74, 52).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 12.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 10.0F, 0.0F, -1.117F, 0.0F, 0.0F));
        PartDefinition bearer1Hand = bearer1Mid.addOrReplaceChild("bearer_1_hand",
                CubeListBuilder.create()
                        .texOffs(223, 81).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F)
                        .texOffs(163, 89).addBox(-1.5F, 2.0F, -1.5F, 1.0F, 2.0F, 1.0F)
                        .texOffs(168, 89).addBox(0.5F, 2.0F, 0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 12.0F, 0.0F, 0.5585F, 0.0F, 0.0F));
        PartDefinition bearer2 = root.addOrReplaceChild("bearer_2",
                CubeListBuilder.create()
                        .texOffs(204, 52).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 10.0F, 2.0F),
                PartPose.offsetAndRotation(9.0F, 2.0F, 0.0F, 0.5585F, 1.5708F, 0.0F));
        PartDefinition bearer2Mid = bearer2.addOrReplaceChild("bearer_2_mid",
                CubeListBuilder.create()
                        .texOffs(83, 52).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 12.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 10.0F, 0.0F, -1.117F, 0.0F, 0.0F));
        PartDefinition bearer2Hand = bearer2Mid.addOrReplaceChild("bearer_2_hand",
                CubeListBuilder.create()
                        .texOffs(236, 81).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F)
                        .texOffs(173, 89).addBox(-1.5F, 2.0F, -1.5F, 1.0F, 2.0F, 1.0F)
                        .texOffs(178, 89).addBox(0.5F, 2.0F, 0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 12.0F, 0.0F, 0.5585F, 0.0F, 0.0F));
        PartDefinition bearer3 = root.addOrReplaceChild("bearer_3",
                CubeListBuilder.create()
                        .texOffs(213, 52).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 10.0F, 2.0F),
                PartPose.offsetAndRotation(6.364F, 2.0F, -6.364F, 0.5585F, 2.3562F, 0.0F));
        PartDefinition bearer3Mid = bearer3.addOrReplaceChild("bearer_3_mid",
                CubeListBuilder.create()
                        .texOffs(92, 52).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 12.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 10.0F, 0.0F, -1.117F, 0.0F, 0.0F));
        PartDefinition bearer3Hand = bearer3Mid.addOrReplaceChild("bearer_3_hand",
                CubeListBuilder.create()
                        .texOffs(0, 89).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F)
                        .texOffs(183, 89).addBox(-1.5F, 2.0F, -1.5F, 1.0F, 2.0F, 1.0F)
                        .texOffs(188, 89).addBox(0.5F, 2.0F, 0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 12.0F, 0.0F, 0.5585F, 0.0F, 0.0F));
        PartDefinition bearer4 = root.addOrReplaceChild("bearer_4",
                CubeListBuilder.create()
                        .texOffs(222, 52).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 10.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 2.0F, -9.0F, 0.5585F, 3.1416F, 0.0F));
        PartDefinition bearer4Mid = bearer4.addOrReplaceChild("bearer_4_mid",
                CubeListBuilder.create()
                        .texOffs(101, 52).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 12.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 10.0F, 0.0F, -1.117F, 0.0F, 0.0F));
        PartDefinition bearer4Hand = bearer4Mid.addOrReplaceChild("bearer_4_hand",
                CubeListBuilder.create()
                        .texOffs(13, 89).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F)
                        .texOffs(193, 89).addBox(-1.5F, 2.0F, -1.5F, 1.0F, 2.0F, 1.0F)
                        .texOffs(198, 89).addBox(0.5F, 2.0F, 0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 12.0F, 0.0F, 0.5585F, 0.0F, 0.0F));
        PartDefinition bearer5 = root.addOrReplaceChild("bearer_5",
                CubeListBuilder.create()
                        .texOffs(231, 52).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 10.0F, 2.0F),
                PartPose.offsetAndRotation(-6.364F, 2.0F, -6.364F, 0.5585F, 3.927F, 0.0F));
        PartDefinition bearer5Mid = bearer5.addOrReplaceChild("bearer_5_mid",
                CubeListBuilder.create()
                        .texOffs(110, 52).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 12.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 10.0F, 0.0F, -1.117F, 0.0F, 0.0F));
        PartDefinition bearer5Hand = bearer5Mid.addOrReplaceChild("bearer_5_hand",
                CubeListBuilder.create()
                        .texOffs(26, 89).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F)
                        .texOffs(203, 89).addBox(-1.5F, 2.0F, -1.5F, 1.0F, 2.0F, 1.0F)
                        .texOffs(208, 89).addBox(0.5F, 2.0F, 0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 12.0F, 0.0F, 0.5585F, 0.0F, 0.0F));
        PartDefinition bearer6 = root.addOrReplaceChild("bearer_6",
                CubeListBuilder.create()
                        .texOffs(240, 52).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 10.0F, 2.0F),
                PartPose.offsetAndRotation(-9.0F, 2.0F, -0.0F, 0.5585F, 4.7124F, 0.0F));
        PartDefinition bearer6Mid = bearer6.addOrReplaceChild("bearer_6_mid",
                CubeListBuilder.create()
                        .texOffs(119, 52).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 12.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 10.0F, 0.0F, -1.117F, 0.0F, 0.0F));
        PartDefinition bearer6Hand = bearer6Mid.addOrReplaceChild("bearer_6_hand",
                CubeListBuilder.create()
                        .texOffs(39, 89).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F)
                        .texOffs(213, 89).addBox(-1.5F, 2.0F, -1.5F, 1.0F, 2.0F, 1.0F)
                        .texOffs(218, 89).addBox(0.5F, 2.0F, 0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 12.0F, 0.0F, 0.5585F, 0.0F, 0.0F));
        PartDefinition bearer7 = root.addOrReplaceChild("bearer_7",
                CubeListBuilder.create()
                        .texOffs(0, 68).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 10.0F, 2.0F),
                PartPose.offsetAndRotation(-6.364F, 2.0F, 6.364F, 0.5585F, 5.4978F, 0.0F));
        PartDefinition bearer7Mid = bearer7.addOrReplaceChild("bearer_7_mid",
                CubeListBuilder.create()
                        .texOffs(128, 52).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 12.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 10.0F, 0.0F, -1.117F, 0.0F, 0.0F));
        PartDefinition bearer7Hand = bearer7Mid.addOrReplaceChild("bearer_7_hand",
                CubeListBuilder.create()
                        .texOffs(52, 89).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F)
                        .texOffs(223, 89).addBox(-1.5F, 2.0F, -1.5F, 1.0F, 2.0F, 1.0F)
                        .texOffs(228, 89).addBox(0.5F, 2.0F, 0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 12.0F, 0.0F, 0.5585F, 0.0F, 0.0F));

        return LayerDefinition.create(mesh, 256, 256);
    }

    private void applyEnthronedPose() {
        this.head.xRot = PorcelainAutarchAnimations.THRONE_HEAD_X * Mth.DEG_TO_RAD;
        this.torso.xRot = 10.0F * Mth.DEG_TO_RAD;
        this.armR.xRot = PorcelainAutarchAnimations.THRONE_ARM_X * Mth.DEG_TO_RAD;
        this.armL.xRot = PorcelainAutarchAnimations.THRONE_ARM_X * Mth.DEG_TO_RAD;
        this.armR.zRot = 12.0F * Mth.DEG_TO_RAD;
        this.armL.zRot = -12.0F * Mth.DEG_TO_RAD;
        this.armRLower.xRot = PorcelainAutarchAnimations.THRONE_ELBOW_X * Mth.DEG_TO_RAD;
        this.armLLower.xRot = PorcelainAutarchAnimations.THRONE_ELBOW_X * Mth.DEG_TO_RAD;
    }

    @Override
    public void setupAnim(PorcelainAutarchRenderState state) {
        super.setupAnim(state);

        float idle = state.ageInTicks;

        // The rings never stop; enrage sets them screaming.
        float spin = state.enraged ? 0.35F : 0.05F;
        this.ring0.zRot = idle * spin;
        this.ring1.zRot = -idle * spin * 1.4F;
        this.ring2.zRot = idle * spin * 0.8F;

        // Mantle-arms drift like kelp even at rest.
        for (int i = 0; i < 4; i++) {
            this.mantleArms[i].xRot += -0.4F + Mth.sin(idle * 0.07F + i * 1.9F) * 0.22F;
            this.mantleArms[i].zRot += (i % 2 == 0 ? -0.3F : 0.3F)
                    + Mth.cos(idle * 0.05F + i) * 0.1F;
        }

        if (state.dormant && !state.awakenAnimationState.isStarted()) {
            this.applyEnthronedPose();
            return;
        }

        this.head.yRot = state.yRot * Mth.DEG_TO_RAD * 0.4F;
        this.head.xRot = state.xRot * Mth.DEG_TO_RAD * 0.4F;

        float pos = state.walkAnimationPos;
        float speed = state.walkAnimationSpeed;

        // Eight bearers carry the palanquin in rippling procession.
        for (int i = 0; i < 8; i++) {
            float phase = pos * 0.9F + (Mth.TWO_PI / 8.0F) * i;
            this.bearers[i].xRot += Mth.cos(phase) * 0.5F * speed;
            this.bearerMids[i].xRot += Math.max(0.0F, Mth.sin(phase)) * 0.6F * speed;
        }
        this.torso.zRot += Mth.cos(pos * 0.45F) * 0.03F * speed;
        this.armR.xRot += Mth.cos(pos * 0.45F + Mth.PI) * 0.15F * speed;
        this.armL.xRot += Mth.cos(pos * 0.45F) * 0.15F * speed;

        this.awakenAnimation.apply(state.awakenAnimationState, state.ageInTicks);
        this.sweepAnimation.apply(state.sweepAnimationState, state.ageInTicks);
        this.stormAnimation.apply(state.stormAnimationState, state.ageInTicks);
        this.novaAnimation.apply(state.novaAnimationState, state.ageInTicks);
        this.decreeAnimation.apply(state.decreeAnimationState, state.ageInTicks);
    }
}
