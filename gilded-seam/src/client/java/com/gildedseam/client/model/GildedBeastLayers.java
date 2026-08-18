package com.gildedseam.client.model;

import net.minecraft.client.model.geom.PartPose;
import net.minecraft.client.model.geom.builders.CubeDeformation;
import net.minecraft.client.model.geom.builders.CubeListBuilder;
import net.minecraft.client.model.geom.builders.LayerDefinition;
import net.minecraft.client.model.geom.builders.MeshDefinition;
import net.minecraft.client.model.geom.builders.PartDefinition;

/** Generated geometry (the gilded livestock); source of truth is tools/modelgen/models.py. */
public final class GildedBeastLayers {
    public static LayerDefinition createGildedCowLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-6.0F, 0.0F, -9.0F, 12.0F, 10.0F, 18.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(0, 29).addBox(-4.0F, 0.0F, -6.0F, 8.0F, 8.0F, 6.0F),
                PartPose.offset(0.0F, 0.0F, -9.0F));
        PartDefinition snout = head.addOrReplaceChild("snout",
                CubeListBuilder.create()
                        .texOffs(31, 44).addBox(-3.0F, 0.0F, -1.0F, 6.0F, 4.0F, 1.0F),
                PartPose.offset(0.0F, 3.6F, -6.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(76, 53).addBox(-2.0F, 0.0F, -0.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-4.5F, 1.5F, -3.0F, 0.0F, 0.0F, -0.384F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(83, 53).addBox(0.0F, 0.0F, -0.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(4.5F, 1.5F, -3.0F, 0.0F, 0.0F, 0.384F));
        PartDefinition hornR = head.addOrReplaceChild("horn_r",
                CubeListBuilder.create()
                        .texOffs(92, 44).addBox(-3.0F, -1.0F, -1.0F, 3.0F, 1.5F, 1.5F),
                PartPose.offsetAndRotation(-4.0F, 1.0F, -4.5F, 0.0F, 0.0F, -0.5236F));
        PartDefinition hornL = head.addOrReplaceChild("horn_l",
                CubeListBuilder.create()
                        .texOffs(103, 44).addBox(0.0F, -1.0F, -1.0F, 3.0F, 1.5F, 1.5F),
                PartPose.offsetAndRotation(4.0F, 1.0F, -4.5F, 0.0F, 0.0F, 0.5236F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(90, 53).addBox(-0.8F, 0.0F, -0.56F, 1.6F, 2.6F, 1.12F),
                PartPose.offsetAndRotation(0.0F, 6.0F, -5.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(30, 58).addBox(-0.704F, 0.0F, -0.5F, 1.408F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(35, 58).addBox(-0.6195F, 0.0F, -0.5F, 1.239F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(40, 58).addBox(-0.5452F, 0.0F, -0.5F, 1.0904F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(45, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue5 = mut1Tongue4.addOrReplaceChild("mut1_tongue_5",
                CubeListBuilder.create()
                        .texOffs(50, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.8888F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0134F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue5.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(55, 58).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2RootsR = head.addOrReplaceChild("mut2_roots_r",
                CubeListBuilder.create()
                        .texOffs(13, 44).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.5F, 0.5F, -3.0F, -0.4189F, 0.0F, -0.5236F));
        PartDefinition mut2RootsR1 = mut2RootsR.addOrReplaceChild("mut2_roots_r_1",
                CubeListBuilder.create()
                        .texOffs(82, 44).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsR2 = mut2RootsR1.addOrReplaceChild("mut2_roots_r_2",
                CubeListBuilder.create()
                        .texOffs(112, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsRB = mut2RootsR1.addOrReplaceChild("mut2_roots_r_b",
                CubeListBuilder.create()
                        .texOffs(117, 53).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, 0.8029F));
        PartDefinition mut2RootsRB1 = mut2RootsRB.addOrReplaceChild("mut2_roots_r_b_1",
                CubeListBuilder.create()
                        .texOffs(122, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, -0.4538F));
        PartDefinition mut2RootsL = head.addOrReplaceChild("mut2_roots_l",
                CubeListBuilder.create()
                        .texOffs(22, 44).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(2.5F, 0.5F, -3.0F, -0.4189F, 0.0F, 0.5236F));
        PartDefinition mut2RootsL1 = mut2RootsL.addOrReplaceChild("mut2_roots_l_1",
                CubeListBuilder.create()
                        .texOffs(87, 44).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsL2 = mut2RootsL1.addOrReplaceChild("mut2_roots_l_2",
                CubeListBuilder.create()
                        .texOffs(0, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsLB = mut2RootsL1.addOrReplaceChild("mut2_roots_l_b",
                CubeListBuilder.create()
                        .texOffs(5, 58).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, -0.8029F));
        PartDefinition mut2RootsLB1 = mut2RootsLB.addOrReplaceChild("mut2_roots_l_b_1",
                CubeListBuilder.create()
                        .texOffs(10, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, 0.4538F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(73, 29).addBox(-0.5F, 0.0F, 0.0F, 1.0F, 8.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 9.0F, -0.35F, 0.0F, 0.0F));
        PartDefinition mut1Flank = body.addOrReplaceChild("mut1_flank",
                CubeListBuilder.create()
                        .texOffs(78, 29).addBox(-3.5F, -3.0F, -0.8F, 7.0F, 6.0F, 2.0F),
                PartPose.offset(0.0F, 5.0F, 1.0F));
        PartDefinition mut1FlankFlapR = mut1Flank.addOrReplaceChild("mut1_flank_flap_r",
                CubeListBuilder.create()
                        .texOffs(114, 29).addBox(-3.85F, -3.0F, -1.0F, 3.85F, 6.0F, 1.6F),
                PartPose.offsetAndRotation(-3.5F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1FlankFlapL = mut1Flank.addOrReplaceChild("mut1_flank_flap_l",
                CubeListBuilder.create()
                        .texOffs(0, 44).addBox(0.0F, -3.0F, -1.0F, 3.85F, 6.0F, 1.6F),
                PartPose.offsetAndRotation(3.5F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1FlankStrand0 = mut1Flank.addOrReplaceChild("mut1_flank_strand0",
                CubeListBuilder.create()
                        .texOffs(97, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(-1.75F, -2.1F, -0.9F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1FlankStrand1 = mut1Flank.addOrReplaceChild("mut1_flank_strand1",
                CubeListBuilder.create()
                        .texOffs(102, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.2F, -0.9F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1FlankStrand2 = mut1Flank.addOrReplaceChild("mut1_flank_strand2",
                CubeListBuilder.create()
                        .texOffs(107, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(1.75F, -0.3F, -0.9F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1FlankEyes = mut1Flank.addOrReplaceChild("mut1_flank_eyes",
                CubeListBuilder.create()
                        .texOffs(114, 44).addBox(-2.24F, -1.68F, -0.6F, 4.48F, 3.36F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(22, 53).addBox(-1.2F, -1.87F, -0.8F, 2.4F, 1.87F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -6.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(46, 44).addBox(-1.2F, -2.7693F, -0.8F, 2.4F, 2.7693F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -3.4F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(55, 44).addBox(-1.2F, -3.3251F, -0.8F, 2.4F, 3.3251F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.8F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(64, 44).addBox(-1.2F, -3.3251F, -0.8F, 2.4F, 3.3251F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 1.8F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP4 = mut1Plates.addOrReplaceChild("mut1_plates_p4",
                CubeListBuilder.create()
                        .texOffs(73, 44).addBox(-1.2F, -2.7693F, -0.8F, 2.4F, 2.7693F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 4.4F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP5 = mut1Plates.addOrReplaceChild("mut1_plates_p5",
                CubeListBuilder.create()
                        .texOffs(31, 53).addBox(-1.2F, -1.87F, -0.8F, 2.4F, 1.87F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 7.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Bulb = body.addOrReplaceChild("mut1_bulb",
                CubeListBuilder.create()
                        .texOffs(97, 29).addBox(-2.0F, -2.0F, -2.0F, 4.0F, 4.0F, 4.0F),
                PartPose.offset(-4.5F, 3.0F, -5.0F));
        PartDefinition mut1BulbCore = mut1Bulb.addOrReplaceChild("mut1_bulb_core",
                CubeListBuilder.create()
                        .texOffs(40, 53).addBox(-1.0F, -1.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(29, 29).addBox(-1.32F, 0.0F, -1.32F, 2.64F, 6.6F, 2.64F),
                PartPose.offsetAndRotation(-6.0F, 2.5F, -5.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(55, 29).addBox(-1.1F, 0.0F, -1.1F, 2.2F, 6.6F, 2.2F),
                PartPose.offsetAndRotation(0.0F, 6.6F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(0, 53).addBox(-1.54F, 0.0F, -0.99F, 3.08F, 2.42F, 1.98F),
                PartPose.offsetAndRotation(0.0F, 6.6F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(60, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(-1.21F, 2.42F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(65, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(70, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(75, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(-0.385F, 2.42F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(80, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(85, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(90, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(0.44F, 2.42F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(95, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(100, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(105, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(1.265F, 2.42F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(110, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(115, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(120, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.65F, 1.0F),
                PartPose.offsetAndRotation(-1.54F, 1.1F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(0, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5212F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.65F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(42, 29).addBox(-1.32F, 0.0F, -1.32F, 2.64F, 6.6F, 2.64F),
                PartPose.offsetAndRotation(6.0F, 2.5F, -5.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(64, 29).addBox(-1.1F, 0.0F, -1.1F, 2.2F, 6.6F, 2.2F),
                PartPose.offsetAndRotation(0.0F, 6.6F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(11, 53).addBox(-1.54F, 0.0F, -0.99F, 3.08F, 2.42F, 1.98F),
                PartPose.offsetAndRotation(0.0F, 6.6F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(5, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(-1.21F, 2.42F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(10, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(15, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(20, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(-0.385F, 2.42F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(25, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(30, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(35, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(0.44F, 2.42F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(40, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(45, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(50, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(1.265F, 2.42F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(55, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(60, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(65, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.65F, 1.0F),
                PartPose.offsetAndRotation(-1.54F, 1.1F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(70, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5212F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.65F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = body.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.5F, 5.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(15, 58).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-3.2F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(49, 53).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(20, 58).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(58, 53).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(25, 58).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(3.2F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(67, 53).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(61, 0).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 12.0F, 4.0F),
                PartPose.offset(-4.0F, 12.0F, -6.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(78, 0).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 12.0F, 4.0F),
                PartPose.offset(4.0F, 12.0F, -6.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(95, 0).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 12.0F, 4.0F),
                PartPose.offset(-4.0F, 12.0F, 6.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(112, 0).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 12.0F, 4.0F),
                PartPose.offset(4.0F, 12.0F, 6.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedPigLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-5.0F, 0.0F, -8.0F, 10.0F, 8.0F, 16.0F),
                PartPose.offset(0.0F, 10.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(53, 0).addBox(-4.0F, 0.0F, -8.0F, 8.0F, 8.0F, 8.0F),
                PartPose.offset(0.0F, 0.0F, -8.0F));
        PartDefinition snout = head.addOrReplaceChild("snout",
                CubeListBuilder.create()
                        .texOffs(27, 36).addBox(-2.0F, 0.0F, -1.0F, 4.0F, 3.0F, 1.0F),
                PartPose.offset(0.0F, 3.6F, -8.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(45, 43).addBox(-2.0F, 0.0F, -0.5F, 2.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(-4.2F, 0.5F, -5.0F, 0.0F, 0.0F, -0.384F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(52, 43).addBox(0.0F, 0.0F, -0.5F, 2.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(4.2F, 0.5F, -5.0F, 0.0F, 0.0F, 0.384F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(0, 43).addBox(-0.7F, 0.0F, -0.5F, 1.4F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 7.0F, -8.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(59, 43).addBox(-0.616F, 0.0F, -0.5F, 1.232F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(64, 43).addBox(-0.5421F, 0.0F, -0.5F, 1.0842F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(69, 43).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(74, 43).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue4.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(79, 43).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2Stalks = head.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, -4.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(84, 43).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(-2.6F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(69, 36).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(89, 43).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(-0.8667F, 0.0F, -0.2667F, -0.3142F, -0.1513F, -0.1745F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(78, 36).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(94, 43).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(0.8667F, 0.0F, -0.2667F, -0.3142F, 0.1513F, 0.1745F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(87, 36).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(99, 43).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(2.6F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(96, 36).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(105, 36).addBox(-0.5F, 0.0F, 0.0F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 8.0F, -0.8F, 0.0F, 0.0F));
        PartDefinition mut1Belly = body.addOrReplaceChild("mut1_belly",
                CubeListBuilder.create()
                        .texOffs(55, 25).addBox(-3.0F, -2.5F, -0.8F, 6.0F, 5.0F, 2.0F),
                PartPose.offset(0.0F, 8.0F, 2.0F));
        PartDefinition mut1BellyFlapR = mut1Belly.addOrReplaceChild("mut1_belly_flap_r",
                CubeListBuilder.create()
                        .texOffs(72, 25).addBox(-3.3F, -2.5F, -1.0F, 3.3F, 5.0F, 1.6F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1BellyFlapL = mut1Belly.addOrReplaceChild("mut1_belly_flap_l",
                CubeListBuilder.create()
                        .texOffs(83, 25).addBox(0.0F, -2.5F, -1.0F, 3.3F, 5.0F, 1.6F),
                PartPose.offsetAndRotation(3.0F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1BellyStrand0 = mut1Belly.addOrReplaceChild("mut1_belly_strand0",
                CubeListBuilder.create()
                        .texOffs(110, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(-1.5F, -1.75F, -0.9F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1BellyStrand1 = mut1Belly.addOrReplaceChild("mut1_belly_strand1",
                CubeListBuilder.create()
                        .texOffs(115, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.0F, -0.9F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1BellyStrand2 = mut1Belly.addOrReplaceChild("mut1_belly_strand2",
                CubeListBuilder.create()
                        .texOffs(120, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(1.5F, -0.25F, -0.9F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1BellyEyes = mut1Belly.addOrReplaceChild("mut1_belly_eyes",
                CubeListBuilder.create()
                        .texOffs(38, 36).addBox(-1.92F, -1.4F, -0.6F, 3.84F, 2.8F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition mut1Bulb = body.addOrReplaceChild("mut1_bulb",
                CubeListBuilder.create()
                        .texOffs(34, 25).addBox(-2.5F, -2.0F, -2.5F, 5.0F, 4.0F, 5.0F),
                PartPose.offset(0.0F, -0.5F, 3.0F));
        PartDefinition mut1BulbCore = mut1Bulb.addOrReplaceChild("mut1_bulb_core",
                CubeListBuilder.create()
                        .texOffs(60, 36).addBox(-1.25F, -1.0F, -1.25F, 2.5F, 2.0F, 2.5F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut2LegsR0 = body.addOrReplaceChild("mut2_legs_r0",
                CubeListBuilder.create()
                        .texOffs(112, 25).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.75F, 1.8F),
                PartPose.offsetAndRotation(-4.5F, 6.0F, -1.0F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2LegsR01 = mut2LegsR0.addOrReplaceChild("mut2_legs_r0_1",
                CubeListBuilder.create()
                        .texOffs(5, 43).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.3541F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.75F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR02 = mut2LegsR01.addOrReplaceChild("mut2_legs_r0_2",
                CubeListBuilder.create()
                        .texOffs(10, 43).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.0F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.3541F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR1 = body.addOrReplaceChild("mut2_legs_r1",
                CubeListBuilder.create()
                        .texOffs(0, 36).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.75F, 1.8F),
                PartPose.offsetAndRotation(-4.5F, 6.0F, 2.4F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2LegsR11 = mut2LegsR1.addOrReplaceChild("mut2_legs_r1_1",
                CubeListBuilder.create()
                        .texOffs(15, 43).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.3541F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.75F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR12 = mut2LegsR11.addOrReplaceChild("mut2_legs_r1_2",
                CubeListBuilder.create()
                        .texOffs(20, 43).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.0F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.3541F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsL0 = body.addOrReplaceChild("mut2_legs_l0",
                CubeListBuilder.create()
                        .texOffs(9, 36).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.75F, 1.8F),
                PartPose.offsetAndRotation(4.5F, 6.0F, -1.0F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2LegsL01 = mut2LegsL0.addOrReplaceChild("mut2_legs_l0_1",
                CubeListBuilder.create()
                        .texOffs(25, 43).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.3541F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.75F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL02 = mut2LegsL01.addOrReplaceChild("mut2_legs_l0_2",
                CubeListBuilder.create()
                        .texOffs(30, 43).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.0F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.3541F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL1 = body.addOrReplaceChild("mut2_legs_l1",
                CubeListBuilder.create()
                        .texOffs(18, 36).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.75F, 1.8F),
                PartPose.offsetAndRotation(4.5F, 6.0F, 2.4F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2LegsL11 = mut2LegsL1.addOrReplaceChild("mut2_legs_l1_1",
                CubeListBuilder.create()
                        .texOffs(35, 43).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.3541F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.75F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL12 = mut2LegsL11.addOrReplaceChild("mut2_legs_l1_2",
                CubeListBuilder.create()
                        .texOffs(40, 43).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.0F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.3541F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(94, 25).addBox(-1.08F, 0.0F, -1.08F, 2.16F, 5.4F, 2.16F),
                PartPose.offsetAndRotation(-5.0F, 2.0F, -6.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(103, 25).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 5.4F, 1.8F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(49, 36).addBox(-1.26F, 0.0F, -0.81F, 2.52F, 1.98F, 1.62F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(104, 43).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.99F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(109, 43).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(114, 43).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(119, 43).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.315F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(124, 43).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(0, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(5, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(0.36F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(10, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(15, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(20, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(1.035F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(25, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(30, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(35, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.35F, 1.0F),
                PartPose.offsetAndRotation(-1.26F, 0.9F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(40, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2446F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.35F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(86, 0).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 6.0F, 4.0F),
                PartPose.offset(-3.0F, 18.0F, -5.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(103, 0).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 6.0F, 4.0F),
                PartPose.offset(3.0F, 18.0F, -5.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(0, 25).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 6.0F, 4.0F),
                PartPose.offset(-3.0F, 18.0F, 5.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(17, 25).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 6.0F, 4.0F),
                PartPose.offset(3.0F, 18.0F, 5.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedSheepLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-4.0F, 0.0F, -8.0F, 8.0F, 6.0F, 16.0F)
                        .texOffs(49, 0).addBox(-4.0F, 0.0F, -8.0F, 8.0F, 6.0F, 16.0F, new CubeDeformation(1.75F)),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(51, 23).addBox(-3.0F, 0.0F, -8.0F, 6.0F, 6.0F, 8.0F)
                        .texOffs(80, 23).addBox(-3.0F, 0.0F, -7.0F, 6.0F, 5.0F, 6.0F, new CubeDeformation(1.225F)),
                PartPose.offset(0.0F, 0.0F, -8.0F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(111, 49).addBox(-0.65F, 0.0F, -0.5F, 1.3F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 5.0F, -7.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(5, 54).addBox(-0.572F, 0.0F, -0.5F, 1.144F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(10, 54).addBox(-0.5034F, 0.0F, -0.5F, 1.0067F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(15, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(20, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue4.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(25, 54).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2RootsR = head.addOrReplaceChild("mut2_roots_r",
                CubeListBuilder.create()
                        .texOffs(57, 40).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -4.0F, -0.4189F, 0.0F, -0.5236F));
        PartDefinition mut2RootsR1 = mut2RootsR.addOrReplaceChild("mut2_roots_r_1",
                CubeListBuilder.create()
                        .texOffs(118, 40).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsR2 = mut2RootsR1.addOrReplaceChild("mut2_roots_r_2",
                CubeListBuilder.create()
                        .texOffs(116, 49).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsRB = mut2RootsR1.addOrReplaceChild("mut2_roots_r_b",
                CubeListBuilder.create()
                        .texOffs(121, 49).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, 0.8029F));
        PartDefinition mut2RootsRB1 = mut2RootsRB.addOrReplaceChild("mut2_roots_r_b_1",
                CubeListBuilder.create()
                        .texOffs(0, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, -0.4538F));
        PartDefinition mut1Fleecerift = body.addOrReplaceChild("mut1_fleecerift",
                CubeListBuilder.create()
                        .texOffs(18, 40).addBox(-3.0F, -2.5F, -0.8F, 6.0F, 5.0F, 2.0F),
                PartPose.offset(0.0F, 3.0F, 3.0F));
        PartDefinition mut1FleeceriftFlapR = mut1Fleecerift.addOrReplaceChild("mut1_fleecerift_flap_r",
                CubeListBuilder.create()
                        .texOffs(35, 40).addBox(-3.3F, -2.5F, -1.0F, 3.3F, 5.0F, 1.6F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1FleeceriftFlapL = mut1Fleecerift.addOrReplaceChild("mut1_fleecerift_flap_l",
                CubeListBuilder.create()
                        .texOffs(46, 40).addBox(0.0F, -2.5F, -1.0F, 3.3F, 5.0F, 1.6F),
                PartPose.offsetAndRotation(3.0F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1FleeceriftStrand0 = mut1Fleecerift.addOrReplaceChild("mut1_fleecerift_strand0",
                CubeListBuilder.create()
                        .texOffs(96, 49).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(-1.5F, -1.75F, -0.9F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1FleeceriftStrand1 = mut1Fleecerift.addOrReplaceChild("mut1_fleecerift_strand1",
                CubeListBuilder.create()
                        .texOffs(101, 49).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.0F, -0.9F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1FleeceriftStrand2 = mut1Fleecerift.addOrReplaceChild("mut1_fleecerift_strand2",
                CubeListBuilder.create()
                        .texOffs(106, 49).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(1.5F, -0.25F, -0.9F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1FleeceriftEyes = mut1Fleecerift.addOrReplaceChild("mut1_fleecerift_eyes",
                CubeListBuilder.create()
                        .texOffs(0, 49).addBox(-1.92F, -1.4F, -0.6F, 3.84F, 2.8F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -1.0F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(33, 49).addBox(-1.2F, -1.65F, -0.8F, 2.4F, 1.65F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -5.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(66, 40).addBox(-1.2F, -2.6046F, -0.8F, 2.4F, 2.6046F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -2.25F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(75, 40).addBox(-1.2F, -3.0F, -0.8F, 2.4F, 3.0F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.5F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(84, 40).addBox(-1.2F, -2.6046F, -0.8F, 2.4F, 2.6046F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 3.25F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP4 = mut1Plates.addOrReplaceChild("mut1_plates_p4",
                CubeListBuilder.create()
                        .texOffs(42, 49).addBox(-1.2F, -1.65F, -0.8F, 2.4F, 1.65F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 6.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = body.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -1.0F, -4.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(93, 40).addBox(-0.5F, -3.6F, -0.5F, 1.0F, 3.6F, 1.0F),
                PartPose.offsetAndRotation(-3.4F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(51, 49).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.6F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(98, 40).addBox(-0.5F, -3.6F, -0.5F, 1.0F, 3.6F, 1.0F),
                PartPose.offsetAndRotation(-1.7F, 0.0F, -0.4F, -0.3142F, -0.2269F, -0.2618F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(60, 49).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.6F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(103, 40).addBox(-0.5F, -3.6F, -0.5F, 1.0F, 3.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(69, 49).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.6F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(108, 40).addBox(-0.5F, -3.6F, -0.5F, 1.0F, 3.6F, 1.0F),
                PartPose.offsetAndRotation(1.7F, 0.0F, -0.4F, -0.3142F, 0.2269F, 0.2618F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(78, 49).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.6F, 0.0F));
        PartDefinition mut2StalksS4 = mut2Stalks.addOrReplaceChild("mut2_stalks_s4",
                CubeListBuilder.create()
                        .texOffs(113, 40).addBox(-0.5F, -3.6F, -0.5F, 1.0F, 3.6F, 1.0F),
                PartPose.offsetAndRotation(3.4F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE4 = mut2StalksS4.addOrReplaceChild("mut2_stalks_e4",
                CubeListBuilder.create()
                        .texOffs(87, 49).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.6F, 0.0F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(105, 23).addBox(-1.14F, 0.0F, -1.14F, 2.28F, 5.7F, 2.28F),
                PartPose.offsetAndRotation(-4.5F, 2.0F, -4.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(114, 23).addBox(-0.95F, 0.0F, -0.95F, 1.9F, 5.7F, 1.9F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(11, 49).addBox(-1.33F, 0.0F, -0.855F, 2.66F, 2.09F, 1.71F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(30, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-1.045F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(70, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(75, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(35, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-0.3325F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(80, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(85, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(40, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(0.38F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(90, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(95, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(45, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(1.0925F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(100, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(105, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(110, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.425F, 1.0F),
                PartPose.offsetAndRotation(-1.33F, 0.95F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(115, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3138F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.425F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(0, 40).addBox(-1.14F, 0.0F, -1.14F, 2.28F, 5.7F, 2.28F),
                PartPose.offsetAndRotation(4.5F, 2.0F, -4.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(9, 40).addBox(-0.95F, 0.0F, -0.95F, 1.9F, 5.7F, 1.9F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(22, 49).addBox(-1.33F, 0.0F, -0.855F, 2.66F, 2.09F, 1.71F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(50, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-1.045F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(120, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(0, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(55, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-0.3325F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(5, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(10, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(60, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(0.38F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(15, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(20, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(65, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(1.0925F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(25, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(30, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(35, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.425F, 1.0F),
                PartPose.offsetAndRotation(-1.33F, 0.95F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(40, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3138F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.425F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(98, 0).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 12.0F, 4.0F),
                PartPose.offset(-3.0F, 12.0F, -5.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(0, 23).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 12.0F, 4.0F),
                PartPose.offset(3.0F, 12.0F, -5.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(17, 23).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 12.0F, 4.0F),
                PartPose.offset(-3.0F, 12.0F, 5.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(34, 23).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 12.0F, 4.0F),
                PartPose.offset(3.0F, 12.0F, 5.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedChickenLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-3.0F, 0.0F, -4.0F, 6.0F, 8.0F, 8.0F),
                PartPose.offset(0.0F, 11.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(0, 17).addBox(-2.0F, 0.0F, -3.0F, 4.0F, 6.0F, 3.0F),
                PartPose.offset(0.0F, -4.0F, -4.0F));
        PartDefinition beak = head.addOrReplaceChild("beak",
                CubeListBuilder.create()
                        .texOffs(46, 27).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 2.0F, -3.0F));
        PartDefinition wattle = head.addOrReplaceChild("wattle",
                CubeListBuilder.create()
                        .texOffs(0, 34).addBox(-1.0F, 0.0F, -2.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 3.0F, -3.0F));
        PartDefinition comb = head.addOrReplaceChild("comb",
                CubeListBuilder.create()
                        .texOffs(54, 17).addBox(-0.5F, -2.0F, -2.0F, 1.0F, 2.0F, 4.0F),
                PartPose.offset(0.0F, 0.0F, -1.5F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(9, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, -3.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(37, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(42, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(47, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue3.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(52, 39).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2Stalks = head.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, -1.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(10, 44).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(-1.8F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(45, 34).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(15, 44).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(54, 34).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(20, 44).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(1.8F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(0, 39).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition wingR = body.addOrReplaceChild("wing_r",
                CubeListBuilder.create()
                        .texOffs(29, 0).addBox(-1.0F, 0.0F, -3.0F, 1.0F, 4.0F, 6.0F),
                PartPose.offset(-3.0F, 1.0F, -1.0F));
        PartDefinition wingL = body.addOrReplaceChild("wing_l",
                CubeListBuilder.create()
                        .texOffs(44, 0).addBox(0.0F, 0.0F, -3.0F, 1.0F, 4.0F, 6.0F),
                PartPose.offset(3.0F, 1.0F, -1.0F));
        PartDefinition mut1Neck = body.addOrReplaceChild("mut1_neck",
                CubeListBuilder.create()
                        .texOffs(9, 34).addBox(-1.2F, 0.0F, -1.2F, 2.4F, 2.2F, 2.4F),
                PartPose.offsetAndRotation(0.0F, -3.0F, -3.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Neck1 = mut1Neck.addOrReplaceChild("mut1_neck_1",
                CubeListBuilder.create()
                        .texOffs(18, 34).addBox(-1.08F, 0.0F, -1.08F, 2.16F, 2.0871F, 2.16F),
                PartPose.offsetAndRotation(0.0F, 2.2F, 0.0F, -0.1396F, 0.0F, 0.0F));
        PartDefinition mut1Neck2 = mut1Neck1.addOrReplaceChild("mut1_neck_2",
                CubeListBuilder.create()
                        .texOffs(27, 34).addBox(-0.972F, 0.0F, -0.972F, 1.944F, 1.98F, 1.944F),
                PartPose.offsetAndRotation(0.0F, 2.0871F, 0.0F, -0.1396F, 0.0F, 0.0F));
        PartDefinition mut1Neck3 = mut1Neck2.addOrReplaceChild("mut1_neck_3",
                CubeListBuilder.create()
                        .texOffs(36, 34).addBox(-0.8748F, 0.0F, -0.8748F, 1.7496F, 1.8784F, 1.7496F),
                PartPose.offsetAndRotation(0.0F, 1.98F, 0.0F, -0.1396F, 0.0F, 0.0F));
        PartDefinition mut1Crop = body.addOrReplaceChild("mut1_crop",
                CubeListBuilder.create()
                        .texOffs(41, 17).addBox(-2.0F, -2.0F, -0.64F, 4.0F, 4.0F, 1.6F),
                PartPose.offset(0.0F, 4.0F, 3.0F));
        PartDefinition mut1CropFlapR = mut1Crop.addOrReplaceChild("mut1_crop_flap_r",
                CubeListBuilder.create()
                        .texOffs(0, 27).addBox(-2.2F, -2.0F, -1.0F, 2.2F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1CropFlapL = mut1Crop.addOrReplaceChild("mut1_crop_flap_l",
                CubeListBuilder.create()
                        .texOffs(9, 27).addBox(0.0F, -2.0F, -1.0F, 2.2F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(2.0F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1CropStrand0 = mut1Crop.addOrReplaceChild("mut1_crop_strand0",
                CubeListBuilder.create()
                        .texOffs(57, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(-1.0F, -1.4F, -0.72F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1CropStrand1 = mut1Crop.addOrReplaceChild("mut1_crop_strand1",
                CubeListBuilder.create()
                        .texOffs(0, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -0.8F, -0.72F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1CropStrand2 = mut1Crop.addOrReplaceChild("mut1_crop_strand2",
                CubeListBuilder.create()
                        .texOffs(5, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(1.0F, -0.2F, -0.72F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1CropEyes = mut1Crop.addOrReplaceChild("mut1_crop_eyes",
                CubeListBuilder.create()
                        .texOffs(14, 39).addBox(-1.28F, -1.12F, -0.6F, 2.56F, 2.24F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.72F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(18, 27).addBox(-0.84F, 0.0F, -0.84F, 1.68F, 4.2F, 1.68F),
                PartPose.offsetAndRotation(-3.0F, 2.0F, -2.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(36, 27).addBox(-0.7F, 0.0F, -0.7F, 1.4F, 4.2F, 1.4F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(23, 39).addBox(-0.98F, 0.0F, -0.63F, 1.96F, 1.54F, 1.26F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(25, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(-0.77F, 1.54F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(30, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(35, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(40, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(-0.245F, 1.54F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(45, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(50, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(55, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(0.28F, 1.54F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(60, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(0, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(5, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(0.805F, 1.54F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(10, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(15, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(20, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.05F, 1.0F),
                PartPose.offsetAndRotation(-0.98F, 0.7F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(25, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9681F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.05F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(27, 27).addBox(-0.84F, 0.0F, -0.84F, 1.68F, 4.2F, 1.68F),
                PartPose.offsetAndRotation(3.0F, 2.0F, -2.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(41, 27).addBox(-0.7F, 0.0F, -0.7F, 1.4F, 4.2F, 1.4F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(30, 39).addBox(-0.98F, 0.0F, -0.63F, 1.96F, 1.54F, 1.26F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(30, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(-0.77F, 1.54F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(35, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(40, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(45, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(-0.245F, 1.54F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(50, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(55, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(60, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(0.28F, 1.54F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(0, 51).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(5, 51).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(10, 51).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(0.805F, 1.54F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(15, 51).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(20, 51).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(25, 51).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.05F, 1.0F),
                PartPose.offsetAndRotation(-0.98F, 0.7F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(30, 51).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9681F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.05F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition legR = root.addOrReplaceChild("leg_r",
                CubeListBuilder.create()
                        .texOffs(15, 17).addBox(-1.0F, 0.0F, -3.0F, 3.0F, 5.0F, 3.0F),
                PartPose.offset(-2.0F, 19.0F, 1.0F));
        PartDefinition legL = root.addOrReplaceChild("leg_l",
                CubeListBuilder.create()
                        .texOffs(28, 17).addBox(-2.0F, 0.0F, -3.0F, 3.0F, 5.0F, 3.0F),
                PartPose.offset(2.0F, 19.0F, 1.0F));

        return LayerDefinition.create(mesh, 64, 64);
    }

    public static LayerDefinition createGildedSpiderLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(78, 0).addBox(-3.0F, -3.0F, -3.0F, 6.0F, 6.0F, 6.0F),
                PartPose.offset(0.0F, 15.0F, 0.0F));
        PartDefinition abdomen = body.addOrReplaceChild("abdomen",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-5.0F, -4.0F, -6.0F, 10.0F, 8.0F, 12.0F),
                PartPose.offset(0.0F, 0.0F, 9.0F));
        PartDefinition mut1Sac = abdomen.addOrReplaceChild("mut1_sac",
                CubeListBuilder.create()
                        .texOffs(0, 21).addBox(-3.5F, -3.0F, -0.8F, 7.0F, 6.0F, 2.0F),
                PartPose.offset(0.0F, 0.0F, 4.0F));
        PartDefinition mut1SacFlapR = mut1Sac.addOrReplaceChild("mut1_sac_flap_r",
                CubeListBuilder.create()
                        .texOffs(19, 21).addBox(-3.85F, -3.0F, -1.0F, 3.85F, 6.0F, 1.6F),
                PartPose.offsetAndRotation(-3.5F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1SacFlapL = mut1Sac.addOrReplaceChild("mut1_sac_flap_l",
                CubeListBuilder.create()
                        .texOffs(32, 21).addBox(0.0F, -3.0F, -1.0F, 3.85F, 6.0F, 1.6F),
                PartPose.offsetAndRotation(3.5F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1SacStrand0 = mut1Sac.addOrReplaceChild("mut1_sac_strand0",
                CubeListBuilder.create()
                        .texOffs(47, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(-1.75F, -2.1F, -0.9F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1SacStrand1 = mut1Sac.addOrReplaceChild("mut1_sac_strand1",
                CubeListBuilder.create()
                        .texOffs(52, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.2F, -0.9F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1SacStrand2 = mut1Sac.addOrReplaceChild("mut1_sac_strand2",
                CubeListBuilder.create()
                        .texOffs(57, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(1.75F, -0.3F, -0.9F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1SacEyes = mut1Sac.addOrReplaceChild("mut1_sac_eyes",
                CubeListBuilder.create()
                        .texOffs(0, 46).addBox(-2.24F, -1.68F, -0.6F, 4.48F, 3.36F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition mut1Bulb = abdomen.addOrReplaceChild("mut1_bulb",
                CubeListBuilder.create()
                        .texOffs(103, 0).addBox(-2.5F, -2.0F, -3.0F, 5.0F, 4.0F, 6.0F),
                PartPose.offset(0.0F, -4.5F, 0.0F));
        PartDefinition mut1BulbCore = mut1Bulb.addOrReplaceChild("mut1_bulb_core",
                CubeListBuilder.create()
                        .texOffs(81, 21).addBox(-1.25F, -1.0F, -1.5F, 2.5F, 2.0F, 3.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut2Legs00 = abdomen.addOrReplaceChild("mut2_legs00",
                CubeListBuilder.create()
                        .texOffs(45, 21).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 4.5833F, 1.8F),
                PartPose.offsetAndRotation(-4.5F, 0.0F, 2.0F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2Legs001 = mut2Legs00.addOrReplaceChild("mut2_legs00_1",
                CubeListBuilder.create()
                        .texOffs(92, 21).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 4.0995F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 4.5833F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2Legs002 = mut2Legs001.addOrReplaceChild("mut2_legs00_2",
                CubeListBuilder.create()
                        .texOffs(97, 21).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.6667F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 4.0995F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2Legs01 = abdomen.addOrReplaceChild("mut2_legs01",
                CubeListBuilder.create()
                        .texOffs(54, 21).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 4.5833F, 1.8F),
                PartPose.offsetAndRotation(-4.5F, 0.0F, 5.4F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2Legs011 = mut2Legs01.addOrReplaceChild("mut2_legs01_1",
                CubeListBuilder.create()
                        .texOffs(102, 21).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 4.0995F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 4.5833F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2Legs012 = mut2Legs011.addOrReplaceChild("mut2_legs01_2",
                CubeListBuilder.create()
                        .texOffs(107, 21).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.6667F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 4.0995F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2Legs10 = abdomen.addOrReplaceChild("mut2_legs10",
                CubeListBuilder.create()
                        .texOffs(63, 21).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 4.5833F, 1.8F),
                PartPose.offsetAndRotation(4.5F, 0.0F, 2.0F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2Legs101 = mut2Legs10.addOrReplaceChild("mut2_legs10_1",
                CubeListBuilder.create()
                        .texOffs(112, 21).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 4.0995F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 4.5833F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2Legs102 = mut2Legs101.addOrReplaceChild("mut2_legs10_2",
                CubeListBuilder.create()
                        .texOffs(117, 21).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.6667F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 4.0995F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2Legs11 = abdomen.addOrReplaceChild("mut2_legs11",
                CubeListBuilder.create()
                        .texOffs(72, 21).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 4.5833F, 1.8F),
                PartPose.offsetAndRotation(4.5F, 0.0F, 5.4F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2Legs111 = mut2Legs11.addOrReplaceChild("mut2_legs11_1",
                CubeListBuilder.create()
                        .texOffs(122, 21).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 4.0995F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 4.5833F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2Legs112 = mut2Legs111.addOrReplaceChild("mut2_legs11_2",
                CubeListBuilder.create()
                        .texOffs(0, 30).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.6667F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 4.0995F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(45, 0).addBox(-4.0F, -4.0F, -8.0F, 8.0F, 8.0F, 8.0F),
                PartPose.offset(0.0F, 0.0F, -3.0F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(62, 46).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0F, -7.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(87, 46).addBox(-0.528F, 0.0F, -0.5F, 1.056F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(92, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(97, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(102, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue4.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(107, 46).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2Stalks = head.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -3.5F, -5.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(67, 46).addBox(-0.5F, -2.6F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(11, 46).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.6F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(72, 46).addBox(-0.5F, -2.6F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(-1.0F, 0.0F, -0.2667F, -0.3142F, -0.1513F, -0.1745F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(20, 46).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.6F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(77, 46).addBox(-0.5F, -2.6F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(1.0F, 0.0F, -0.2667F, -0.3142F, 0.1513F, 0.1745F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(29, 46).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.6F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(82, 46).addBox(-0.5F, -2.6F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(3.0F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(38, 46).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.6F, 0.0F));
        PartDefinition legR0 = body.addOrReplaceChild("leg_r0",
                CubeListBuilder.create()
                        .texOffs(69, 36).addBox(-8.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-4.0F, 0.0F, -1.0F, 0.0F, 0.6283F, 0.8378F));
        PartDefinition legR02 = legR0.addOrReplaceChild("leg_r0_2",
                CubeListBuilder.create()
                        .texOffs(5, 30).addBox(-9.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-8.0F, 0.0F, 0.0F, 0.0F, 0.0F, -1.3963F));
        PartDefinition legR1 = body.addOrReplaceChild("leg_r1",
                CubeListBuilder.create()
                        .texOffs(90, 36).addBox(-8.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-4.0F, 0.0F, 1.6F, 0.0F, 0.2094F, 0.8378F));
        PartDefinition legR12 = legR1.addOrReplaceChild("leg_r1_2",
                CubeListBuilder.create()
                        .texOffs(28, 30).addBox(-9.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-8.0F, 0.0F, 0.0F, 0.0F, 0.0F, -1.3963F));
        PartDefinition legR2 = body.addOrReplaceChild("leg_r2",
                CubeListBuilder.create()
                        .texOffs(0, 41).addBox(-8.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-4.0F, 0.0F, 4.2F, 0.0F, -0.2094F, 0.8378F));
        PartDefinition legR22 = legR2.addOrReplaceChild("leg_r2_2",
                CubeListBuilder.create()
                        .texOffs(51, 30).addBox(-9.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-8.0F, 0.0F, 0.0F, 0.0F, 0.0F, -1.3963F));
        PartDefinition legR3 = body.addOrReplaceChild("leg_r3",
                CubeListBuilder.create()
                        .texOffs(21, 41).addBox(-8.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-4.0F, 0.0F, 6.8F, 0.0F, -0.6283F, 0.8378F));
        PartDefinition legR32 = legR3.addOrReplaceChild("leg_r3_2",
                CubeListBuilder.create()
                        .texOffs(74, 30).addBox(-9.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-8.0F, 0.0F, 0.0F, 0.0F, 0.0F, -1.3963F));
        PartDefinition legL0 = body.addOrReplaceChild("leg_l0",
                CubeListBuilder.create()
                        .texOffs(42, 41).addBox(0.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(4.0F, 0.0F, -1.0F, 0.0F, -0.6283F, -0.8378F));
        PartDefinition legL02 = legL0.addOrReplaceChild("leg_l0_2",
                CubeListBuilder.create()
                        .texOffs(97, 30).addBox(0.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(8.0F, 0.0F, 0.0F, 0.0F, 0.0F, 1.3963F));
        PartDefinition legL1 = body.addOrReplaceChild("leg_l1",
                CubeListBuilder.create()
                        .texOffs(63, 41).addBox(0.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(4.0F, 0.0F, 1.6F, 0.0F, -0.2094F, -0.8378F));
        PartDefinition legL12 = legL1.addOrReplaceChild("leg_l1_2",
                CubeListBuilder.create()
                        .texOffs(0, 36).addBox(0.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(8.0F, 0.0F, 0.0F, 0.0F, 0.0F, 1.3963F));
        PartDefinition legL2 = body.addOrReplaceChild("leg_l2",
                CubeListBuilder.create()
                        .texOffs(84, 41).addBox(0.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(4.0F, 0.0F, 4.2F, 0.0F, 0.2094F, -0.8378F));
        PartDefinition legL22 = legL2.addOrReplaceChild("leg_l2_2",
                CubeListBuilder.create()
                        .texOffs(23, 36).addBox(0.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(8.0F, 0.0F, 0.0F, 0.0F, 0.0F, 1.3963F));
        PartDefinition legL3 = body.addOrReplaceChild("leg_l3",
                CubeListBuilder.create()
                        .texOffs(105, 41).addBox(0.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(4.0F, 0.0F, 6.8F, 0.0F, 0.6283F, -0.8378F));
        PartDefinition legL32 = legL3.addOrReplaceChild("leg_l3_2",
                CubeListBuilder.create()
                        .texOffs(46, 36).addBox(0.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(8.0F, 0.0F, 0.0F, 0.0F, 0.0F, 1.3963F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedCaskLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(33, 0).addBox(-4.0F, 0.0F, -2.0F, 8.0F, 12.0F, 4.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-4.0F, -8.0F, -4.0F, 8.0F, 8.0F, 8.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = head.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -8.0F, -2.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(106, 28).addBox(-0.5F, -2.2F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(38, 28).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.2F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(111, 28).addBox(-0.5F, -2.2F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(-1.5F, 0.0F, -0.4F, -0.3142F, -0.2269F, -0.2618F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(47, 28).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.2F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(116, 28).addBox(-0.5F, -2.2F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(56, 28).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.2F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(121, 28).addBox(-0.5F, -2.2F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(1.5F, 0.0F, -0.4F, -0.3142F, 0.2269F, 0.2618F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(65, 28).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.2F, 0.0F));
        PartDefinition mut2StalksS4 = mut2Stalks.addOrReplaceChild("mut2_stalks_s4",
                CubeListBuilder.create()
                        .texOffs(0, 33).addBox(-0.5F, -2.2F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(3.0F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE4 = mut2StalksS4.addOrReplaceChild("mut2_stalks_e4",
                CubeListBuilder.create()
                        .texOffs(74, 28).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.2F, 0.0F));
        PartDefinition mut2Tongue = head.addOrReplaceChild("mut2_tongue",
                CubeListBuilder.create()
                        .texOffs(83, 28).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.0F, -4.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut2Tongue1 = mut2Tongue.addOrReplaceChild("mut2_tongue_1",
                CubeListBuilder.create()
                        .texOffs(5, 33).addBox(-0.528F, 0.0F, -0.5F, 1.056F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut2Tongue2 = mut2Tongue1.addOrReplaceChild("mut2_tongue_2",
                CubeListBuilder.create()
                        .texOffs(10, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut2Tongue3 = mut2Tongue2.addOrReplaceChild("mut2_tongue_3",
                CubeListBuilder.create()
                        .texOffs(15, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut2Tongue4 = mut2Tongue3.addOrReplaceChild("mut2_tongue_4",
                CubeListBuilder.create()
                        .texOffs(20, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut2TongueTip = mut2Tongue4.addOrReplaceChild("mut2_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(25, 33).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1Core = body.addOrReplaceChild("mut1_core",
                CubeListBuilder.create()
                        .texOffs(0, 17).addBox(-3.0F, -4.0F, -0.96F, 6.0F, 8.0F, 2.4F),
                PartPose.offset(0.0F, 6.0F, -2.0F));
        PartDefinition mut1CoreFlapR = mut1Core.addOrReplaceChild("mut1_core_flap_r",
                CubeListBuilder.create()
                        .texOffs(17, 17).addBox(-3.3F, -4.0F, -1.0F, 3.3F, 8.0F, 1.6F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1CoreFlapL = mut1Core.addOrReplaceChild("mut1_core_flap_l",
                CubeListBuilder.create()
                        .texOffs(28, 17).addBox(0.0F, -4.0F, -1.0F, 3.3F, 8.0F, 1.6F),
                PartPose.offsetAndRotation(3.0F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1CoreStrand0 = mut1Core.addOrReplaceChild("mut1_core_strand0",
                CubeListBuilder.create()
                        .texOffs(103, 17).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 4.4F, 1.0F),
                PartPose.offsetAndRotation(-1.5F, -2.8F, -1.08F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1CoreStrand1 = mut1Core.addOrReplaceChild("mut1_core_strand1",
                CubeListBuilder.create()
                        .texOffs(108, 17).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 4.4F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.6F, -1.08F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1CoreStrand2 = mut1Core.addOrReplaceChild("mut1_core_strand2",
                CubeListBuilder.create()
                        .texOffs(113, 17).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 4.4F, 1.0F),
                PartPose.offsetAndRotation(1.5F, -0.4F, -1.08F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1CoreEyes = mut1Core.addOrReplaceChild("mut1_core_eyes",
                CubeListBuilder.create()
                        .texOffs(92, 17).addBox(-1.92F, -2.24F, -0.6F, 3.84F, 4.48F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -1.08F));
        PartDefinition mut1Heart = body.addOrReplaceChild("mut1_heart",
                CubeListBuilder.create()
                        .texOffs(39, 17).addBox(-2.0F, -2.5F, -2.0F, 4.0F, 5.0F, 4.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition mut1HeartCore = mut1Heart.addOrReplaceChild("mut1_heart_core",
                CubeListBuilder.create()
                        .texOffs(11, 28).addBox(-1.0F, -1.25F, -1.0F, 2.0F, 2.5F, 2.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(88, 28).addBox(-1.2F, -1.43F, -0.8F, 2.4F, 1.43F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 1.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(20, 28).addBox(-1.2F, -2.4432F, -0.8F, 2.4F, 2.4432F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 1.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(29, 28).addBox(-1.2F, -2.4432F, -0.8F, 2.4F, 2.4432F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 1.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(97, 28).addBox(-1.2F, -1.43F, -0.8F, 2.4F, 1.43F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 1.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(56, 17).addBox(-1.08F, 0.0F, -1.08F, 2.16F, 5.4F, 2.16F),
                PartPose.offsetAndRotation(-4.0F, 2.0F, 0.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(65, 17).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 5.4F, 1.8F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(118, 17).addBox(-1.26F, 0.0F, -0.81F, 2.52F, 1.98F, 1.62F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(30, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.99F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(35, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(40, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(45, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.315F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(50, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(55, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(60, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(0.36F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(65, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(70, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(75, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(1.035F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(80, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(85, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(90, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.35F, 1.0F),
                PartPose.offsetAndRotation(-1.26F, 0.9F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(95, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2446F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.35F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(74, 17).addBox(-1.08F, 0.0F, -1.08F, 2.16F, 5.4F, 2.16F),
                PartPose.offsetAndRotation(4.0F, 2.0F, 0.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(83, 17).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 5.4F, 1.8F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(0, 28).addBox(-1.26F, 0.0F, -0.81F, 2.52F, 1.98F, 1.62F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(100, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.99F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(105, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(110, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(115, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.315F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(120, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(0, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(5, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(0.36F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(10, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(15, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(20, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(1.035F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(25, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(30, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(35, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.35F, 1.0F),
                PartPose.offsetAndRotation(-1.26F, 0.9F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(40, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2446F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.35F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(58, 0).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 6.0F, 4.0F),
                PartPose.offset(-2.0F, 18.0F, -4.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(75, 0).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 6.0F, 4.0F),
                PartPose.offset(2.0F, 18.0F, -4.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(92, 0).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 6.0F, 4.0F),
                PartPose.offset(-2.0F, 18.0F, 4.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(109, 0).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 6.0F, 4.0F),
                PartPose.offset(2.0F, 18.0F, 4.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    private GildedBeastLayers() {
    }

    public static LayerDefinition createGildedWolfLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-3.0F, 0.0F, -6.0F, 6.0F, 6.0F, 12.0F),
                PartPose.offset(0.0F, 8.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(37, 0).addBox(-3.0F, 0.0F, -6.0F, 6.0F, 6.0F, 6.0F),
                PartPose.offset(0.0F, -1.0F, -6.0F));
        PartDefinition snout = head.addOrReplaceChild("snout",
                CubeListBuilder.create()
                        .texOffs(76, 19).addBox(-1.5F, 0.0F, -2.0F, 3.0F, 3.0F, 2.0F),
                PartPose.offset(0.0F, 2.7F, -6.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(117, 27).addBox(-2.0F, 0.0F, -0.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-2.5F, -0.5F, -1.5F, 0.0F, 0.0F, -0.384F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(0, 32).addBox(0.0F, 0.0F, -0.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(2.5F, -0.5F, -1.5F, 0.0F, 0.0F, 0.384F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(22, 32).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 5.0F, -5.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(78, 32).addBox(-0.528F, 0.0F, -0.5F, 1.056F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(83, 32).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(88, 32).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(93, 32).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue5 = mut1Tongue4.addOrReplaceChild("mut1_tongue_5",
                CubeListBuilder.create()
                        .texOffs(98, 32).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.8888F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0134F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue5.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(103, 32).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2RootsR = head.addOrReplaceChild("mut2_roots_r",
                CubeListBuilder.create()
                        .texOffs(58, 19).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -3.0F, -0.4189F, 0.0F, -0.5236F));
        PartDefinition mut2RootsR1 = mut2RootsR.addOrReplaceChild("mut2_roots_r_1",
                CubeListBuilder.create()
                        .texOffs(118, 19).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsR2 = mut2RootsR1.addOrReplaceChild("mut2_roots_r_2",
                CubeListBuilder.create()
                        .texOffs(27, 32).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsRB = mut2RootsR1.addOrReplaceChild("mut2_roots_r_b",
                CubeListBuilder.create()
                        .texOffs(32, 32).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, 0.8029F));
        PartDefinition mut2RootsRB1 = mut2RootsRB.addOrReplaceChild("mut2_roots_r_b_1",
                CubeListBuilder.create()
                        .texOffs(37, 32).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, -0.4538F));
        PartDefinition mut2RootsL = head.addOrReplaceChild("mut2_roots_l",
                CubeListBuilder.create()
                        .texOffs(67, 19).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(2.0F, 0.0F, -3.0F, -0.4189F, 0.0F, 0.5236F));
        PartDefinition mut2RootsL1 = mut2RootsL.addOrReplaceChild("mut2_roots_l_1",
                CubeListBuilder.create()
                        .texOffs(123, 19).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsL2 = mut2RootsL1.addOrReplaceChild("mut2_roots_l_2",
                CubeListBuilder.create()
                        .texOffs(42, 32).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsLB = mut2RootsL1.addOrReplaceChild("mut2_roots_l_b",
                CubeListBuilder.create()
                        .texOffs(47, 32).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, -0.8029F));
        PartDefinition mut2RootsLB1 = mut2RootsLB.addOrReplaceChild("mut2_roots_l_b_1",
                CubeListBuilder.create()
                        .texOffs(52, 32).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, 0.4538F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 2.0F, -6.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(87, 19).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(90, 27).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-2.4F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(57, 32).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(64, 32).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-0.8F, 1.3524F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(98, 19).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(99, 27).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(0.8F, -1.9927F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(71, 32).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(108, 27).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(2.4F, 1.5837F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(62, 0).addBox(-1.0F, 0.0F, 0.0F, 2.0F, 8.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 6.0F, -0.5F, 0.0F, 0.0F));
        PartDefinition mut1Ribs = body.addOrReplaceChild("mut1_ribs",
                CubeListBuilder.create()
                        .texOffs(107, 0).addBox(-2.5F, -2.5F, -0.72F, 5.0F, 5.0F, 1.8F),
                PartPose.offset(0.0F, 4.0F, 2.0F));
        PartDefinition mut1RibsFlapR = mut1Ribs.addOrReplaceChild("mut1_ribs_flap_r",
                CubeListBuilder.create()
                        .texOffs(0, 19).addBox(-2.75F, -2.5F, -1.0F, 2.75F, 5.0F, 1.6F),
                PartPose.offsetAndRotation(-2.5F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1RibsFlapL = mut1Ribs.addOrReplaceChild("mut1_ribs_flap_l",
                CubeListBuilder.create()
                        .texOffs(11, 19).addBox(0.0F, -2.5F, -1.0F, 2.75F, 5.0F, 1.6F),
                PartPose.offsetAndRotation(2.5F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1RibsStrand0 = mut1Ribs.addOrReplaceChild("mut1_ribs_strand0",
                CubeListBuilder.create()
                        .texOffs(7, 32).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(-1.25F, -1.75F, -0.81F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1RibsStrand1 = mut1Ribs.addOrReplaceChild("mut1_ribs_strand1",
                CubeListBuilder.create()
                        .texOffs(12, 32).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.0F, -0.81F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1RibsStrand2 = mut1Ribs.addOrReplaceChild("mut1_ribs_strand2",
                CubeListBuilder.create()
                        .texOffs(17, 32).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(1.25F, -0.25F, -0.81F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1RibsEyes = mut1Ribs.addOrReplaceChild("mut1_ribs_eyes",
                CubeListBuilder.create()
                        .texOffs(0, 27).addBox(-1.6F, -1.4F, -0.6F, 3.2F, 2.8F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.81F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -0.5F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(9, 27).addBox(-1.2F, -1.54F, -0.8F, 2.4F, 1.54F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -4.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(18, 27).addBox(-1.2F, -2.431F, -0.8F, 2.4F, 2.431F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -1.75F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(109, 19).addBox(-1.2F, -2.8F, -0.8F, 2.4F, 2.8F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.5F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(27, 27).addBox(-1.2F, -2.431F, -0.8F, 2.4F, 2.431F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 2.75F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP4 = mut1Plates.addOrReplaceChild("mut1_plates_p4",
                CubeListBuilder.create()
                        .texOffs(36, 27).addBox(-1.2F, -1.54F, -0.8F, 2.4F, 1.54F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 5.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(22, 19).addBox(-1.02F, 0.0F, -1.02F, 2.04F, 5.1F, 2.04F),
                PartPose.offsetAndRotation(-3.5F, 2.0F, -3.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(31, 19).addBox(-0.85F, 0.0F, -0.85F, 1.7F, 5.1F, 1.7F),
                PartPose.offsetAndRotation(0.0F, 5.1F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(45, 27).addBox(-1.19F, 0.0F, -0.765F, 2.38F, 1.87F, 1.53F),
                PartPose.offsetAndRotation(0.0F, 5.1F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(123, 32).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(-0.935F, 1.87F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(0, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(5, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(10, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(-0.2975F, 1.87F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(15, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(20, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(25, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(0.34F, 1.87F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(30, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(35, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(40, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(0.9775F, 1.87F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(45, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(50, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(55, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.275F, 1.0F),
                PartPose.offsetAndRotation(-1.19F, 0.85F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(60, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1755F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.275F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(40, 19).addBox(-1.02F, 0.0F, -1.02F, 2.04F, 5.1F, 2.04F),
                PartPose.offsetAndRotation(3.5F, 2.0F, -3.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(49, 19).addBox(-0.85F, 0.0F, -0.85F, 1.7F, 5.1F, 1.7F),
                PartPose.offsetAndRotation(0.0F, 5.1F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(54, 27).addBox(-1.19F, 0.0F, -0.765F, 2.38F, 1.87F, 1.53F),
                PartPose.offsetAndRotation(0.0F, 5.1F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(65, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(-0.935F, 1.87F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(70, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(75, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(80, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(-0.2975F, 1.87F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(85, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(90, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(95, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(0.34F, 1.87F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(100, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(105, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(110, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(0.9775F, 1.87F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(115, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(120, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(0, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.275F, 1.0F),
                PartPose.offsetAndRotation(-1.19F, 0.85F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(5, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1755F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.275F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = body.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -0.5F, 4.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(108, 32).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(-2.4F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(63, 27).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(113, 32).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(72, 27).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(118, 32).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(2.4F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(81, 27).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(71, 0).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 8.0F, 2.0F),
                PartPose.offset(-2.5F, 16.0F, -4.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(80, 0).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 8.0F, 2.0F),
                PartPose.offset(2.5F, 16.0F, -4.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(89, 0).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 8.0F, 2.0F),
                PartPose.offset(-2.5F, 16.0F, 4.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(98, 0).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 8.0F, 2.0F),
                PartPose.offset(2.5F, 16.0F, 4.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedGoatLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-4.5F, 0.0F, -8.0F, 9.0F, 8.0F, 16.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(103, 0).addBox(-2.5F, 0.0F, -7.0F, 5.0F, 6.0F, 7.0F),
                PartPose.offset(0.0F, 0.0F, -8.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(65, 39).addBox(-3.0F, 0.0F, -0.5F, 3.0F, 1.5F, 1.0F),
                PartPose.offsetAndRotation(-3.0F, 1.5F, -3.0F, 0.0F, 0.0F, -0.384F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(74, 39).addBox(0.0F, 0.0F, -0.5F, 3.0F, 1.5F, 1.0F),
                PartPose.offsetAndRotation(3.0F, 1.5F, -3.0F, 0.0F, 0.0F, 0.384F));
        PartDefinition hornR = head.addOrReplaceChild("horn_r",
                CubeListBuilder.create()
                        .texOffs(0, 34).addBox(-3.0F, -1.0F, -1.0F, 3.0F, 1.5F, 1.5F),
                PartPose.offsetAndRotation(-2.5F, 1.0F, -5.5F, 0.0F, 0.0F, -0.5236F));
        PartDefinition hornL = head.addOrReplaceChild("horn_l",
                CubeListBuilder.create()
                        .texOffs(11, 34).addBox(0.0F, -1.0F, -1.0F, 3.0F, 1.5F, 1.5F),
                PartPose.offsetAndRotation(2.5F, 1.0F, -5.5F, 0.0F, 0.0F, 0.5236F));
        PartDefinition mut1RootsR = head.addOrReplaceChild("mut1_roots_r",
                CubeListBuilder.create()
                        .texOffs(75, 25).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -3.0F, -0.4189F, 0.0F, -0.5236F));
        PartDefinition mut1RootsR1 = mut1RootsR.addOrReplaceChild("mut1_roots_r_1",
                CubeListBuilder.create()
                        .texOffs(115, 25).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut1RootsR2 = mut1RootsR1.addOrReplaceChild("mut1_roots_r_2",
                CubeListBuilder.create()
                        .texOffs(10, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut1RootsRB = mut1RootsR1.addOrReplaceChild("mut1_roots_r_b",
                CubeListBuilder.create()
                        .texOffs(15, 39).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, 0.8029F));
        PartDefinition mut1RootsRB1 = mut1RootsRB.addOrReplaceChild("mut1_roots_r_b_1",
                CubeListBuilder.create()
                        .texOffs(20, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, -0.4538F));
        PartDefinition mut1RootsL = head.addOrReplaceChild("mut1_roots_l",
                CubeListBuilder.create()
                        .texOffs(84, 25).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(2.0F, 0.0F, -3.0F, -0.4189F, 0.0F, 0.5236F));
        PartDefinition mut1RootsL1 = mut1RootsL.addOrReplaceChild("mut1_roots_l_1",
                CubeListBuilder.create()
                        .texOffs(120, 25).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut1RootsL2 = mut1RootsL1.addOrReplaceChild("mut1_roots_l_2",
                CubeListBuilder.create()
                        .texOffs(25, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut1RootsLB = mut1RootsL1.addOrReplaceChild("mut1_roots_l_b",
                CubeListBuilder.create()
                        .texOffs(30, 39).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, -0.8029F));
        PartDefinition mut1RootsLB1 = mut1RootsLB.addOrReplaceChild("mut1_roots_l_b_1",
                CubeListBuilder.create()
                        .texOffs(35, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, 0.4538F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(40, 39).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 5.0F, -6.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(104, 39).addBox(-0.528F, 0.0F, -0.5F, 1.056F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(109, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(114, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(119, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue5 = mut1Tongue4.addOrReplaceChild("mut1_tongue_5",
                CubeListBuilder.create()
                        .texOffs(124, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.8888F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0134F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue5.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(0, 44).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 2.5F, -7.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(93, 25).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(91, 34).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-2.2F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(83, 39).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(90, 39).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-0.7333F, 1.4876F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(104, 25).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(100, 34).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(0.7333F, -2.1919F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(97, 39).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(109, 34).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(2.2F, 1.742F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(118, 34).addBox(-0.5F, 0.0F, 0.0F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 8.0F, -0.9F, 0.0F, 0.0F));
        PartDefinition mut1Flank = body.addOrReplaceChild("mut1_flank",
                CubeListBuilder.create()
                        .texOffs(0, 25).addBox(-3.0F, -3.0F, -0.8F, 6.0F, 6.0F, 2.0F),
                PartPose.offset(0.0F, 4.0F, 2.0F));
        PartDefinition mut1FlankFlapR = mut1Flank.addOrReplaceChild("mut1_flank_flap_r",
                CubeListBuilder.create()
                        .texOffs(17, 25).addBox(-3.3F, -3.0F, -1.0F, 3.3F, 6.0F, 1.6F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1FlankFlapL = mut1Flank.addOrReplaceChild("mut1_flank_flap_l",
                CubeListBuilder.create()
                        .texOffs(28, 25).addBox(0.0F, -3.0F, -1.0F, 3.3F, 6.0F, 1.6F),
                PartPose.offsetAndRotation(3.0F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1FlankStrand0 = mut1Flank.addOrReplaceChild("mut1_flank_strand0",
                CubeListBuilder.create()
                        .texOffs(123, 34).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(-1.5F, -2.1F, -0.9F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1FlankStrand1 = mut1Flank.addOrReplaceChild("mut1_flank_strand1",
                CubeListBuilder.create()
                        .texOffs(0, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.2F, -0.9F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1FlankStrand2 = mut1Flank.addOrReplaceChild("mut1_flank_strand2",
                CubeListBuilder.create()
                        .texOffs(5, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(1.5F, -0.3F, -0.9F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1FlankEyes = mut1Flank.addOrReplaceChild("mut1_flank_eyes",
                CubeListBuilder.create()
                        .texOffs(22, 34).addBox(-1.92F, -1.68F, -0.6F, 3.84F, 3.36F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(39, 25).addBox(-1.2F, 0.0F, -1.2F, 2.4F, 6.0F, 2.4F),
                PartPose.offsetAndRotation(-5.0F, 2.0F, -4.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(48, 25).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(33, 34).addBox(-1.4F, 0.0F, -0.9F, 2.8F, 2.2F, 1.8F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(5, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(-1.1F, 2.2F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(55, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(60, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(10, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(-0.35F, 2.2F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(65, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(70, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(15, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(0.4F, 2.2F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(75, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(80, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(20, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(1.15F, 2.2F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(85, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(90, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(25, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5F, 1.0F),
                PartPose.offsetAndRotation(-1.4F, 1.0F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(95, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3829F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.5F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(57, 25).addBox(-1.2F, 0.0F, -1.2F, 2.4F, 6.0F, 2.4F),
                PartPose.offsetAndRotation(5.0F, 2.0F, -4.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(66, 25).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(44, 34).addBox(-1.4F, 0.0F, -0.9F, 2.8F, 2.2F, 1.8F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(30, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(-1.1F, 2.2F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(100, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(105, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(35, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(-0.35F, 2.2F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(110, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(115, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(40, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(0.4F, 2.2F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(120, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(0, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(45, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(1.15F, 2.2F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(5, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(10, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(50, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5F, 1.0F),
                PartPose.offsetAndRotation(-1.4F, 1.0F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(15, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3829F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.5F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = body.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 5.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(45, 39).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(55, 34).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(50, 39).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-1.0F, 0.0F, -0.2667F, -0.3142F, -0.1513F, -0.1745F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(64, 34).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(55, 39).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(1.0F, 0.0F, -0.2667F, -0.3142F, 0.1513F, 0.1745F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(73, 34).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(60, 39).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(3.0F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(82, 34).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(51, 0).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 12.0F, 3.0F),
                PartPose.offset(-3.0F, 12.0F, -5.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(64, 0).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 12.0F, 3.0F),
                PartPose.offset(3.0F, 12.0F, -5.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(77, 0).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 12.0F, 3.0F),
                PartPose.offset(-3.0F, 12.0F, 5.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(90, 0).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 12.0F, 3.0F),
                PartPose.offset(3.0F, 12.0F, 5.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedHareLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-3.0F, 0.0F, -5.0F, 6.0F, 5.0F, 10.0F),
                PartPose.offset(0.0F, 15.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(33, 0).addBox(-2.5F, 0.0F, -5.0F, 5.0F, 4.0F, 5.0F),
                PartPose.offset(0.0F, -2.0F, -5.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(45, 16).addBox(-1.5F, 0.0F, -0.5F, 1.5F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(-1.6F, -1.0F, -1.0F, 0.0F, 0.0F, -0.384F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(52, 16).addBox(0.0F, 0.0F, -0.5F, 1.5F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(1.6F, -1.0F, -1.0F, 0.0F, 0.0F, 0.384F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(45, 29).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, -4.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(10, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(15, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(20, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(25, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue4.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(30, 39).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2Stalks = head.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -0.5F, -2.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(35, 39).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(56, 23).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(40, 39).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(-0.6667F, 0.0F, -0.2667F, -0.3142F, -0.1513F, -0.1745F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(0, 29).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(45, 39).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.6667F, 0.0F, -0.2667F, -0.3142F, 0.1513F, 0.1745F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(9, 29).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(50, 39).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(2.0F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(18, 29).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 1.0F, -5.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(14, 34).addBox(-1.1F, -1.1F, -1.364F, 2.2F, 2.2F, 1.364F)
                        .texOffs(27, 29).addBox(-1.364F, -1.364F, -0.66F, 2.728F, 2.728F, 0.88F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(21, 34).addBox(-0.769F, -0.769F, -0.9535F, 1.5379F, 1.5379F, 0.9535F)
                        .texOffs(28, 34).addBox(-0.9535F, -0.9535F, -0.4614F, 1.907F, 1.907F, 0.6152F),
                PartPose.offsetAndRotation(-0.6667F, 1.0819F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(35, 34).addBox(-1.0874F, -1.0874F, -1.3484F, 2.1748F, 2.1748F, 1.3484F)
                        .texOffs(36, 29).addBox(-1.3484F, -1.3484F, -0.6524F, 2.6967F, 2.6967F, 0.8699F),
                PartPose.offsetAndRotation(0.6667F, -1.5941F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(42, 34).addBox(-0.8636F, -0.8636F, -1.0709F, 1.7273F, 1.7273F, 1.0709F)
                        .texOffs(49, 34).addBox(-1.0709F, -1.0709F, -0.5182F, 2.1418F, 2.1418F, 0.6909F),
                PartPose.offsetAndRotation(2.0F, 1.2669F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(47, 23).addBox(-1.0F, 0.0F, 0.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 5.0F, -0.6F, 0.0F, 0.0F));
        PartDefinition mut1Ribs = body.addOrReplaceChild("mut1_ribs",
                CubeListBuilder.create()
                        .texOffs(0, 23).addBox(-2.0F, -1.75F, -0.56F, 4.0F, 3.5F, 1.4F),
                PartPose.offset(0.0F, 3.0F, 1.0F));
        PartDefinition mut1RibsFlapR = mut1Ribs.addOrReplaceChild("mut1_ribs_flap_r",
                CubeListBuilder.create()
                        .texOffs(27, 16).addBox(-2.2F, -1.75F, -1.0F, 2.2F, 3.5F, 1.6F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1RibsFlapL = mut1Ribs.addOrReplaceChild("mut1_ribs_flap_l",
                CubeListBuilder.create()
                        .texOffs(36, 16).addBox(0.0F, -1.75F, -1.0F, 2.2F, 3.5F, 1.6F),
                PartPose.offsetAndRotation(2.0F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1RibsStrand0 = mut1Ribs.addOrReplaceChild("mut1_ribs_strand0",
                CubeListBuilder.create()
                        .texOffs(56, 34).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.925F, 1.0F),
                PartPose.offsetAndRotation(-1.0F, -1.225F, -0.63F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1RibsStrand1 = mut1Ribs.addOrReplaceChild("mut1_ribs_strand1",
                CubeListBuilder.create()
                        .texOffs(0, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.925F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -0.7F, -0.63F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1RibsStrand2 = mut1Ribs.addOrReplaceChild("mut1_ribs_strand2",
                CubeListBuilder.create()
                        .texOffs(5, 39).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.925F, 1.0F),
                PartPose.offsetAndRotation(1.0F, -0.175F, -0.63F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1RibsEyes = mut1Ribs.addOrReplaceChild("mut1_ribs_eyes",
                CubeListBuilder.create()
                        .texOffs(5, 34).addBox(-1.28F, -0.98F, -0.6F, 2.56F, 1.96F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.63F));
        PartDefinition mut2LegsR0 = body.addOrReplaceChild("mut2_legs_r0",
                CubeListBuilder.create()
                        .texOffs(11, 23).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 2.9167F, 1.8F),
                PartPose.offsetAndRotation(-3.0F, 3.0F, 1.0F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2LegsR01 = mut2LegsR0.addOrReplaceChild("mut2_legs_r0_1",
                CubeListBuilder.create()
                        .texOffs(50, 29).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 2.6087F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 2.9167F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR02 = mut2LegsR01.addOrReplaceChild("mut2_legs_r0_2",
                CubeListBuilder.create()
                        .texOffs(55, 39).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 2.3333F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 2.6087F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR1 = body.addOrReplaceChild("mut2_legs_r1",
                CubeListBuilder.create()
                        .texOffs(20, 23).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 2.9167F, 1.8F),
                PartPose.offsetAndRotation(-3.0F, 3.0F, 4.4F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2LegsR11 = mut2LegsR1.addOrReplaceChild("mut2_legs_r1_1",
                CubeListBuilder.create()
                        .texOffs(55, 29).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 2.6087F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 2.9167F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR12 = mut2LegsR11.addOrReplaceChild("mut2_legs_r1_2",
                CubeListBuilder.create()
                        .texOffs(60, 39).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 2.3333F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 2.6087F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsL0 = body.addOrReplaceChild("mut2_legs_l0",
                CubeListBuilder.create()
                        .texOffs(29, 23).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 2.9167F, 1.8F),
                PartPose.offsetAndRotation(3.0F, 3.0F, 1.0F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2LegsL01 = mut2LegsL0.addOrReplaceChild("mut2_legs_l0_1",
                CubeListBuilder.create()
                        .texOffs(60, 29).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 2.6087F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 2.9167F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL02 = mut2LegsL01.addOrReplaceChild("mut2_legs_l0_2",
                CubeListBuilder.create()
                        .texOffs(0, 43).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 2.3333F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 2.6087F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL1 = body.addOrReplaceChild("mut2_legs_l1",
                CubeListBuilder.create()
                        .texOffs(38, 23).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 2.9167F, 1.8F),
                PartPose.offsetAndRotation(3.0F, 3.0F, 4.4F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2LegsL11 = mut2LegsL1.addOrReplaceChild("mut2_legs_l1_1",
                CubeListBuilder.create()
                        .texOffs(0, 34).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 2.6087F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 2.9167F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL12 = mut2LegsL11.addOrReplaceChild("mut2_legs_l1_2",
                CubeListBuilder.create()
                        .texOffs(5, 43).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 2.3333F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 2.6087F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(54, 0).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 4.0F, 2.0F),
                PartPose.offset(-2.0F, 20.0F, -3.5F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(0, 16).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 4.0F, 2.0F),
                PartPose.offset(2.0F, 20.0F, -3.5F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(9, 16).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 4.0F, 2.0F),
                PartPose.offset(-2.0F, 20.0F, 3.5F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(18, 16).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 4.0F, 2.0F),
                PartPose.offset(2.0F, 20.0F, 3.5F));

        return LayerDefinition.create(mesh, 64, 64);
    }
}
