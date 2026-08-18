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
                        .texOffs(61, 0).addBox(-4.0F, 0.0F, -6.0F, 8.0F, 8.0F, 6.0F),
                PartPose.offset(0.0F, 0.0F, -9.0F));
        PartDefinition muzzle = head.addOrReplaceChild("muzzle",
                CubeListBuilder.create()
                        .texOffs(68, 49).addBox(-3.0F, 0.0F, -2.0F, 6.0F, 4.0F, 2.0F),
                PartPose.offset(0.0F, 3.4F, -6.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(72, 69).addBox(-2.0F, 0.0F, -0.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-4.5F, 1.5F, -3.0F, 0.0F, 0.0F, -0.384F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(79, 69).addBox(0.0F, 0.0F, -0.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(4.5F, 1.5F, -3.0F, 0.0F, 0.0F, 0.384F));
        PartDefinition hornR = head.addOrReplaceChild("horn_r",
                CubeListBuilder.create()
                        .texOffs(34, 63).addBox(-3.0F, -1.0F, -1.0F, 3.0F, 1.5F, 1.5F),
                PartPose.offsetAndRotation(-4.0F, 1.0F, -4.5F, 0.0F, 0.0F, -0.5236F));
        PartDefinition hornL = head.addOrReplaceChild("horn_l",
                CubeListBuilder.create()
                        .texOffs(45, 63).addBox(0.0F, -1.0F, -1.0F, 3.0F, 1.5F, 1.5F),
                PartPose.offsetAndRotation(4.0F, 1.0F, -4.5F, 0.0F, 0.0F, 0.5236F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(85, 49).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(-2.32F, 2.4F, -5.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(38, 49).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(20, 83).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-2.32F, -0.5952F, -5.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(98, 49).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(2.32F, 2.4F, -5.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(53, 49).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(35, 83).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(2.32F, -0.5952F, -5.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(89, 63).addBox(-1.144F, -1.144F, -1.9448F, 2.288F, 2.288F, 1.9448F),
                PartPose.offsetAndRotation(-2.4F, -2.0F, -5.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(98, 63).addBox(-0.936F, -0.936F, -1.5912F, 1.872F, 1.872F, 1.5912F),
                PartPose.offsetAndRotation(2.72F, -2.56F, -5.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceSpare2 = face.addOrReplaceChild("face_spare2",
                CubeListBuilder.create()
                        .texOffs(38, 74).addBox(-0.832F, -0.832F, -1.4144F, 1.664F, 1.664F, 1.4144F),
                PartPose.offsetAndRotation(0.0F, -4.0F, -5.7F, 0.0F, 0.0F, -0.363F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(15, 63).addBox(-3.36F, -1.2F, -1.6F, 6.72F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 5.28F, -5.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(50, 83).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-2.72F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(73, 74).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(-1.36F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(78, 74).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.9F, 0.9F),
                PartPose.offset(0.0F, 0.4F, -0.9F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(83, 74).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(1.36F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceUt4 = faceMaw.addOrReplaceChild("face_ut4",
                CubeListBuilder.create()
                        .texOffs(55, 83).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(2.72F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(0, 57).addBox(-3.2F, 0.0F, -3.0F, 6.4F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 5.6F, -4.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(60, 83).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-2.56F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(88, 74).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(-1.28F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(93, 74).addBox(-0.4F, -1.7F, -0.4F, 0.8F, 1.7F, 0.8F),
                PartPose.offset(0.0F, 0.1F, -2.4F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(98, 74).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(1.28F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceLt4 = faceJaw.addOrReplaceChild("face_lt4",
                CubeListBuilder.create()
                        .texOffs(65, 83).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(2.56F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(25, 74).addBox(-2.08F, -0.2F, -1.4F, 4.16F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(86, 69).addBox(-0.8F, 0.0F, -0.56F, 1.6F, 2.6F, 1.12F),
                PartPose.offsetAndRotation(0.0F, 6.0F, -5.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(103, 74).addBox(-0.704F, 0.0F, -0.5F, 1.408F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(108, 74).addBox(-0.6195F, 0.0F, -0.5F, 1.239F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(113, 74).addBox(-0.5452F, 0.0F, -0.5F, 1.0904F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(118, 74).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue5 = mut1Tongue4.addOrReplaceChild("mut1_tongue_5",
                CubeListBuilder.create()
                        .texOffs(123, 74).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.8888F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0134F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue5.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(0, 79).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2RootsR = head.addOrReplaceChild("mut2_roots_r",
                CubeListBuilder.create()
                        .texOffs(111, 49).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.5F, 0.5F, -3.0F, -0.4189F, 0.0F, -0.5236F));
        PartDefinition mut2RootsR1 = mut2RootsR.addOrReplaceChild("mut2_roots_r_1",
                CubeListBuilder.create()
                        .texOffs(5, 63).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsR2 = mut2RootsR1.addOrReplaceChild("mut2_roots_r_2",
                CubeListBuilder.create()
                        .texOffs(108, 69).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsRB = mut2RootsR1.addOrReplaceChild("mut2_roots_r_b",
                CubeListBuilder.create()
                        .texOffs(113, 69).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, 0.8029F));
        PartDefinition mut2RootsRB1 = mut2RootsRB.addOrReplaceChild("mut2_roots_r_b_1",
                CubeListBuilder.create()
                        .texOffs(118, 69).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, -0.4538F));
        PartDefinition mut2RootsL = head.addOrReplaceChild("mut2_roots_l",
                CubeListBuilder.create()
                        .texOffs(120, 49).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(2.5F, 0.5F, -3.0F, -0.4189F, 0.0F, 0.5236F));
        PartDefinition mut2RootsL1 = mut2RootsL.addOrReplaceChild("mut2_roots_l_1",
                CubeListBuilder.create()
                        .texOffs(10, 63).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsL2 = mut2RootsL1.addOrReplaceChild("mut2_roots_l_2",
                CubeListBuilder.create()
                        .texOffs(123, 69).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsLB = mut2RootsL1.addOrReplaceChild("mut2_roots_l_b",
                CubeListBuilder.create()
                        .texOffs(0, 74).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, -0.8029F));
        PartDefinition mut2RootsLB1 = mut2RootsLB.addOrReplaceChild("mut2_roots_l_b_1",
                CubeListBuilder.create()
                        .texOffs(5, 74).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, 0.4538F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 3.0F, -6.0F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(19, 57).addBox(-1.54F, -1.54F, -1.9096F, 3.08F, 3.08F, 1.9096F)
                        .texOffs(30, 57).addBox(-1.9096F, -1.9096F, -0.924F, 3.8192F, 3.8192F, 1.232F),
                PartPose.offsetAndRotation(-3.2F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(45, 74).addBox(-1.0765F, -1.0765F, -1.3349F, 2.1531F, 2.1531F, 1.3349F)
                        .texOffs(36, 69).addBox(-1.3349F, -1.3349F, -0.6459F, 2.6698F, 2.6698F, 0.8612F),
                PartPose.offsetAndRotation(-1.0667F, 1.4876F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(41, 57).addBox(-1.5223F, -1.5223F, -1.8877F, 3.0447F, 3.0447F, 1.8877F)
                        .texOffs(52, 57).addBox(-1.8877F, -1.8877F, -0.9134F, 3.7754F, 3.7754F, 1.2179F),
                PartPose.offsetAndRotation(1.0667F, -2.1919F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(52, 74).addBox(-1.2091F, -1.2091F, -1.4993F, 2.4182F, 2.4182F, 1.4993F)
                        .texOffs(45, 69).addBox(-1.4993F, -1.4993F, -0.7255F, 2.9985F, 2.9985F, 0.9673F),
                PartPose.offsetAndRotation(3.2F, 1.742F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(121, 57).addBox(-0.5F, 0.0F, 0.0F, 1.0F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 9.0F, -0.35F, 0.0F, 0.0F));
        PartDefinition tail1 = tail.addOrReplaceChild("tail_1",
                CubeListBuilder.create()
                        .texOffs(0, 63).addBox(-0.5F, 0.0F, 0.0F, 1.0F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.1225F, 0.0F, 0.0F));
        PartDefinition mut1Flank = body.addOrReplaceChild("mut1_flank",
                CubeListBuilder.create()
                        .texOffs(18, 39).addBox(-3.5F, -3.0F, -0.8F, 7.0F, 6.0F, 2.0F),
                PartPose.offset(0.0F, 5.0F, 1.0F));
        PartDefinition mut1FlankFlapR = mut1Flank.addOrReplaceChild("mut1_flank_flap_r",
                CubeListBuilder.create()
                        .texOffs(54, 39).addBox(-3.85F, -3.0F, -1.0F, 3.85F, 6.0F, 1.6F),
                PartPose.offsetAndRotation(-3.5F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1FlankFlapL = mut1Flank.addOrReplaceChild("mut1_flank_flap_l",
                CubeListBuilder.create()
                        .texOffs(67, 39).addBox(0.0F, -3.0F, -1.0F, 3.85F, 6.0F, 1.6F),
                PartPose.offsetAndRotation(3.5F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1FlankStrand0 = mut1Flank.addOrReplaceChild("mut1_flank_strand0",
                CubeListBuilder.create()
                        .texOffs(93, 69).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(-1.75F, -2.1F, -0.9F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1FlankStrand1 = mut1Flank.addOrReplaceChild("mut1_flank_strand1",
                CubeListBuilder.create()
                        .texOffs(98, 69).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.2F, -0.9F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1FlankStrand2 = mut1Flank.addOrReplaceChild("mut1_flank_strand2",
                CubeListBuilder.create()
                        .texOffs(103, 69).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(1.75F, -0.3F, -0.9F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1FlankEyes = mut1Flank.addOrReplaceChild("mut1_flank_eyes",
                CubeListBuilder.create()
                        .texOffs(56, 63).addBox(-2.24F, -1.68F, -0.6F, 4.48F, 3.36F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(107, 63).addBox(-1.2F, -1.87F, -0.8F, 2.4F, 1.87F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -6.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(85, 57).addBox(-1.2F, -2.7693F, -0.8F, 2.4F, 2.7693F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -3.4F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(94, 57).addBox(-1.2F, -3.3251F, -0.8F, 2.4F, 3.3251F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.8F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(103, 57).addBox(-1.2F, -3.3251F, -0.8F, 2.4F, 3.3251F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 1.8F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP4 = mut1Plates.addOrReplaceChild("mut1_plates_p4",
                CubeListBuilder.create()
                        .texOffs(112, 57).addBox(-1.2F, -2.7693F, -0.8F, 2.4F, 2.7693F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 4.4F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP5 = mut1Plates.addOrReplaceChild("mut1_plates_p5",
                CubeListBuilder.create()
                        .texOffs(116, 63).addBox(-1.2F, -1.87F, -0.8F, 2.4F, 1.87F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 7.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Bulb = body.addOrReplaceChild("mut1_bulb",
                CubeListBuilder.create()
                        .texOffs(37, 39).addBox(-2.0F, -2.0F, -2.0F, 4.0F, 4.0F, 4.0F),
                PartPose.offset(-4.5F, 3.0F, -5.0F));
        PartDefinition mut1BulbCore = mut1Bulb.addOrReplaceChild("mut1_bulb_core",
                CubeListBuilder.create()
                        .texOffs(0, 69).addBox(-1.0F, -1.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(90, 0).addBox(-1.32F, 0.0F, -1.32F, 2.64F, 6.6F, 2.64F),
                PartPose.offsetAndRotation(-6.0F, 2.5F, -5.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(0, 39).addBox(-1.1F, 0.0F, -1.1F, 2.2F, 6.6F, 2.2F),
                PartPose.offsetAndRotation(0.0F, 6.6F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(67, 63).addBox(-1.54F, 0.0F, -0.99F, 3.08F, 2.42F, 1.98F),
                PartPose.offsetAndRotation(0.0F, 6.6F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(5, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(-1.21F, 2.42F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(10, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(15, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(20, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(-0.385F, 2.42F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(25, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(30, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(35, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(0.44F, 2.42F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(40, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(45, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(50, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(1.265F, 2.42F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(55, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(60, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(65, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.65F, 1.0F),
                PartPose.offsetAndRotation(-1.54F, 1.1F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(70, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5212F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.65F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(103, 0).addBox(-1.32F, 0.0F, -1.32F, 2.64F, 6.6F, 2.64F),
                PartPose.offsetAndRotation(6.0F, 2.5F, -5.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(9, 39).addBox(-1.1F, 0.0F, -1.1F, 2.2F, 6.6F, 2.2F),
                PartPose.offsetAndRotation(0.0F, 6.6F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(78, 63).addBox(-1.54F, 0.0F, -0.99F, 3.08F, 2.42F, 1.98F),
                PartPose.offsetAndRotation(0.0F, 6.6F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(75, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(-1.21F, 2.42F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(80, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(85, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(90, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(-0.385F, 2.42F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(95, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(100, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(105, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(0.44F, 2.42F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(110, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(115, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(120, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(1.265F, 2.42F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(0, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(5, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(10, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.65F, 1.0F),
                PartPose.offsetAndRotation(-1.54F, 1.1F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(15, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5212F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.65F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = body.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.5F, 5.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(10, 74).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-3.2F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(9, 69).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(15, 74).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(18, 69).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(20, 74).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(3.2F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(27, 69).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut1Flankeyes = body.addOrReplaceChild("mut1_flankeyes",
                CubeListBuilder.create(),
                PartPose.offset(-6.2F, 4.0F, 3.0F));
        PartDefinition mut1FlankeyesE0 = mut1Flankeyes.addOrReplaceChild("mut1_flankeyes_e0",
                CubeListBuilder.create()
                        .texOffs(63, 57).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(54, 69).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-1.4F, 0.0F, -0.24F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1FlankeyesE1 = mut1Flankeyes.addOrReplaceChild("mut1_flankeyes_e1",
                CubeListBuilder.create()
                        .texOffs(59, 74).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(66, 74).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(0.0F, 2.0286F, -0.3414F, 0.0F, 0.0F, 0.236F));
        PartDefinition mut1FlankeyesE2 = mut1Flankeyes.addOrReplaceChild("mut1_flankeyes_e2",
                CubeListBuilder.create()
                        .texOffs(74, 57).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(63, 69).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(1.4F, -2.989F, -0.3895F, 0.0F, 0.4538F, -0.3478F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(0, 29).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 5.28F, 4.0F),
                PartPose.offset(-4.0F, 12.0F, -6.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(68, 29).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 4.56F, 3.6F),
                PartPose.offset(0.0F, 5.28F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(80, 39).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.16F, 4.6F),
                PartPose.offset(0.0F, 4.56F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(17, 29).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 5.28F, 4.0F),
                PartPose.offset(4.0F, 12.0F, -6.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(83, 29).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 4.56F, 3.6F),
                PartPose.offset(0.0F, 5.28F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(99, 39).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.16F, 4.6F),
                PartPose.offset(0.0F, 4.56F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(34, 29).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 4.8F, 4.0F),
                PartPose.offset(-4.0F, 12.0F, 6.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(98, 29).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 5.04F, 3.6F),
                PartPose.offset(0.0F, 4.8F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(0, 49).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.16F, 4.6F),
                PartPose.offset(0.0F, 5.04F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(51, 29).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 4.8F, 4.0F),
                PartPose.offset(4.0F, 12.0F, 6.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(113, 29).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 5.04F, 3.6F),
                PartPose.offset(0.0F, 4.8F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(19, 49).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.16F, 4.6F),
                PartPose.offset(0.0F, 5.04F, 0.0F));

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
        PartDefinition muzzle = head.addOrReplaceChild("muzzle",
                CubeListBuilder.create()
                        .texOffs(111, 41).addBox(-2.0F, 0.0F, -1.5F, 4.0F, 3.0F, 1.5F),
                PartPose.offset(0.0F, 4.0F, -8.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(13, 59).addBox(-2.0F, 0.0F, -0.5F, 2.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(-4.2F, 0.5F, -5.0F, 0.0F, 0.0F, 0.5934F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(20, 59).addBox(0.0F, 0.0F, -0.5F, 2.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(4.2F, 0.5F, -5.0F, 0.0F, 0.0F, -0.5934F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(30, 41).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(-2.32F, 2.4F, -7.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(34, 25).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(0, 63).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-2.32F, -0.5952F, -7.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(43, 41).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(2.32F, 2.4F, -7.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(49, 25).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(15, 63).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(2.32F, -0.5952F, -7.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(96, 48).addBox(-1.144F, -1.144F, -1.9448F, 2.288F, 2.288F, 1.9448F),
                PartPose.offsetAndRotation(-2.4F, -2.0F, -7.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(105, 48).addBox(-0.936F, -0.936F, -1.5912F, 1.872F, 1.872F, 1.5912F),
                PartPose.offsetAndRotation(2.72F, -2.56F, -7.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(55, 48).addBox(-3.36F, -1.2F, -1.6F, 6.72F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 5.28F, -7.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(30, 63).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-2.72F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(48, 59).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(-1.36F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(53, 59).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.9F, 0.9F),
                PartPose.offset(0.0F, 0.4F, -0.9F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(58, 59).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(1.36F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceUt4 = faceMaw.addOrReplaceChild("face_ut4",
                CubeListBuilder.create()
                        .texOffs(35, 63).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(2.72F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(92, 41).addBox(-3.2F, 0.0F, -3.0F, 6.4F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 5.6F, -6.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(40, 63).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-2.56F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(63, 59).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(-1.28F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(68, 59).addBox(-0.4F, -1.7F, -0.4F, 0.8F, 1.7F, 0.8F),
                PartPose.offset(0.0F, 0.1F, -2.4F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(73, 59).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(1.28F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceLt4 = faceJaw.addOrReplaceChild("face_lt4",
                CubeListBuilder.create()
                        .texOffs(45, 63).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(2.56F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(0, 59).addBox(-2.08F, -0.2F, -1.4F, 4.16F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(74, 54).addBox(-0.7F, 0.0F, -0.5F, 1.4F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 7.0F, -8.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(78, 59).addBox(-0.616F, 0.0F, -0.5F, 1.232F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(83, 59).addBox(-0.5421F, 0.0F, -0.5F, 1.0842F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(88, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(93, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue4.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(98, 59).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2Stalks = head.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, -4.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(103, 59).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(-2.6F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(0, 54).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(108, 59).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(-0.8667F, 0.0F, -0.2667F, -0.3142F, -0.1513F, -0.1745F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(9, 54).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(113, 59).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(0.8667F, 0.0F, -0.2667F, -0.3142F, 0.1513F, 0.1745F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(18, 54).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(118, 59).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(2.6F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(27, 54).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 3.0F, -8.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(0, 48).addBox(-1.43F, -1.43F, -1.7732F, 2.86F, 2.86F, 1.7732F)
                        .texOffs(11, 48).addBox(-1.7732F, -1.7732F, -0.858F, 3.5464F, 3.5464F, 1.144F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(27, 59).addBox(-0.9996F, -0.9996F, -1.2396F, 1.9993F, 1.9993F, 1.2396F)
                        .texOffs(34, 59).addBox(-1.2396F, -1.2396F, -0.5998F, 2.4791F, 2.4791F, 0.7997F),
                PartPose.offsetAndRotation(-1.5F, 1.6229F, -0.5691F, 0.0F, -0.2269F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(22, 48).addBox(-1.4136F, -1.4136F, -1.7529F, 2.8272F, 2.8272F, 1.7529F)
                        .texOffs(33, 48).addBox(-1.7529F, -1.7529F, -0.8482F, 3.5057F, 3.5057F, 1.1309F),
                PartPose.offsetAndRotation(0.0F, -2.3912F, -0.6491F, 0.0F, 0.0F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(41, 59).addBox(-1.1227F, -1.1227F, -1.3922F, 2.2454F, 2.2454F, 1.3922F)
                        .texOffs(36, 54).addBox(-1.3922F, -1.3922F, -0.6736F, 2.7843F, 2.7843F, 0.8982F),
                PartPose.offsetAndRotation(1.5F, 1.9004F, -0.598F, 0.0F, 0.2269F, 0.2764F));
        PartDefinition mut1EyesE4 = mut1Eyes.addOrReplaceChild("mut1_eyes_e4",
                CubeListBuilder.create()
                        .texOffs(44, 48).addBox(-1.3655F, -1.3655F, -1.6932F, 2.731F, 2.731F, 1.6932F)
                        .texOffs(45, 54).addBox(-1.6932F, -1.6932F, -0.8193F, 3.3864F, 3.3864F, 1.0924F),
                PartPose.offsetAndRotation(3.0F, -0.4089F, -0.4426F, 0.0F, 0.4538F, -0.0595F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(54, 54).addBox(-0.5F, 0.0F, 0.0F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 8.0F, -0.8F, 0.0F, 0.0F));
        PartDefinition mut1Belly = body.addOrReplaceChild("mut1_belly",
                CubeListBuilder.create()
                        .texOffs(17, 25).addBox(-3.0F, -2.5F, -0.8F, 6.0F, 5.0F, 2.0F),
                PartPose.offset(0.0F, 8.0F, 2.0F));
        PartDefinition mut1BellyFlapR = mut1Belly.addOrReplaceChild("mut1_belly_flap_r",
                CubeListBuilder.create()
                        .texOffs(94, 25).addBox(-3.3F, -2.5F, -1.0F, 3.3F, 5.0F, 1.6F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1BellyFlapL = mut1Belly.addOrReplaceChild("mut1_belly_flap_l",
                CubeListBuilder.create()
                        .texOffs(105, 25).addBox(0.0F, -2.5F, -1.0F, 3.3F, 5.0F, 1.6F),
                PartPose.offsetAndRotation(3.0F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1BellyStrand0 = mut1Belly.addOrReplaceChild("mut1_belly_strand0",
                CubeListBuilder.create()
                        .texOffs(59, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(-1.5F, -1.75F, -0.9F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1BellyStrand1 = mut1Belly.addOrReplaceChild("mut1_belly_strand1",
                CubeListBuilder.create()
                        .texOffs(64, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.0F, -0.9F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1BellyStrand2 = mut1Belly.addOrReplaceChild("mut1_belly_strand2",
                CubeListBuilder.create()
                        .texOffs(69, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(1.5F, -0.25F, -0.9F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1BellyEyes = mut1Belly.addOrReplaceChild("mut1_belly_eyes",
                CubeListBuilder.create()
                        .texOffs(74, 48).addBox(-1.92F, -1.4F, -0.6F, 3.84F, 2.8F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition mut1Bulb = body.addOrReplaceChild("mut1_bulb",
                CubeListBuilder.create()
                        .texOffs(86, 0).addBox(-2.5F, -2.0F, -2.5F, 5.0F, 4.0F, 5.0F),
                PartPose.offset(0.0F, -0.5F, 3.0F));
        PartDefinition mut1BulbCore = mut1Bulb.addOrReplaceChild("mut1_bulb_core",
                CubeListBuilder.create()
                        .texOffs(114, 48).addBox(-1.25F, -1.0F, -1.25F, 2.5F, 2.0F, 2.5F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut2LegsR0 = body.addOrReplaceChild("mut2_legs_r0",
                CubeListBuilder.create()
                        .texOffs(56, 41).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.75F, 1.8F),
                PartPose.offsetAndRotation(-4.5F, 6.0F, -1.0F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2LegsR01 = mut2LegsR0.addOrReplaceChild("mut2_legs_r0_1",
                CubeListBuilder.create()
                        .texOffs(79, 54).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.3541F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.75F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR02 = mut2LegsR01.addOrReplaceChild("mut2_legs_r0_2",
                CubeListBuilder.create()
                        .texOffs(84, 54).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.0F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.3541F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR1 = body.addOrReplaceChild("mut2_legs_r1",
                CubeListBuilder.create()
                        .texOffs(65, 41).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.75F, 1.8F),
                PartPose.offsetAndRotation(-4.5F, 6.0F, 2.4F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2LegsR11 = mut2LegsR1.addOrReplaceChild("mut2_legs_r1_1",
                CubeListBuilder.create()
                        .texOffs(89, 54).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.3541F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.75F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR12 = mut2LegsR11.addOrReplaceChild("mut2_legs_r1_2",
                CubeListBuilder.create()
                        .texOffs(94, 54).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.0F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.3541F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsL0 = body.addOrReplaceChild("mut2_legs_l0",
                CubeListBuilder.create()
                        .texOffs(74, 41).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.75F, 1.8F),
                PartPose.offsetAndRotation(4.5F, 6.0F, -1.0F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2LegsL01 = mut2LegsL0.addOrReplaceChild("mut2_legs_l0_1",
                CubeListBuilder.create()
                        .texOffs(99, 54).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.3541F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.75F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL02 = mut2LegsL01.addOrReplaceChild("mut2_legs_l0_2",
                CubeListBuilder.create()
                        .texOffs(104, 54).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.0F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.3541F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL1 = body.addOrReplaceChild("mut2_legs_l1",
                CubeListBuilder.create()
                        .texOffs(83, 41).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.75F, 1.8F),
                PartPose.offsetAndRotation(4.5F, 6.0F, 2.4F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2LegsL11 = mut2LegsL1.addOrReplaceChild("mut2_legs_l1_1",
                CubeListBuilder.create()
                        .texOffs(109, 54).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.3541F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.75F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL12 = mut2LegsL11.addOrReplaceChild("mut2_legs_l1_2",
                CubeListBuilder.create()
                        .texOffs(114, 54).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.0F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.3541F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(116, 25).addBox(-1.08F, 0.0F, -1.08F, 2.16F, 5.4F, 2.16F),
                PartPose.offsetAndRotation(-5.0F, 2.0F, -6.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(0, 33).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 5.4F, 1.8F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(85, 48).addBox(-1.26F, 0.0F, -0.81F, 2.52F, 1.98F, 1.62F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(50, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.99F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(55, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(60, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(65, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.315F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(70, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(75, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(80, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(0.36F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(85, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(90, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(95, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(1.035F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(100, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(105, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(110, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.35F, 1.0F),
                PartPose.offsetAndRotation(-1.26F, 0.9F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(115, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2446F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.35F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(107, 0).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 2.64F, 4.0F),
                PartPose.offset(-3.0F, 18.0F, -5.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(0, 41).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 2.28F, 3.6F),
                PartPose.offset(0.0F, 2.64F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(9, 33).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.08F, 4.6F),
                PartPose.offset(0.0F, 2.28F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(0, 25).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 2.64F, 4.0F),
                PartPose.offset(3.0F, 18.0F, -5.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(15, 41).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 2.28F, 3.6F),
                PartPose.offset(0.0F, 2.64F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(28, 33).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.08F, 4.6F),
                PartPose.offset(0.0F, 2.28F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(85, 33).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 2.4F, 4.0F),
                PartPose.offset(-3.0F, 18.0F, 5.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(64, 25).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 2.52F, 3.6F),
                PartPose.offset(0.0F, 2.4F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(47, 33).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.08F, 4.6F),
                PartPose.offset(0.0F, 2.52F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(102, 33).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 2.4F, 4.0F),
                PartPose.offset(3.0F, 18.0F, 5.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(79, 25).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 2.52F, 3.6F),
                PartPose.offset(0.0F, 2.4F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(66, 33).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.08F, 4.6F),
                PartPose.offset(0.0F, 2.52F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedSheepLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-4.0F, 0.0F, -8.0F, 8.0F, 8.0F, 16.0F)
                        .texOffs(49, 0).addBox(-4.0F, 0.0F, -8.0F, 8.0F, 8.0F, 16.0F, new CubeDeformation(1.75F)),
                PartPose.offset(0.0F, 5.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(98, 0).addBox(-3.0F, 0.0F, -8.0F, 6.0F, 6.0F, 8.0F)
                        .texOffs(0, 25).addBox(-3.0F, 0.0F, -7.0F, 6.0F, 5.0F, 6.0F, new CubeDeformation(1.225F)),
                PartPose.offset(0.0F, 1.0F, -8.0F));
        PartDefinition muzzle = head.addOrReplaceChild("muzzle",
                CubeListBuilder.create()
                        .texOffs(93, 46).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 3.0F, 2.0F),
                PartPose.offset(0.0F, 3.2F, -8.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(91, 66).addBox(-3.0F, 0.0F, -0.5F, 3.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(-3.2F, 1.0F, -4.0F, 0.0F, 0.0F, 0.9076F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(100, 66).addBox(0.0F, 0.0F, -0.5F, 3.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(3.2F, 1.0F, -4.0F, 0.0F, 0.0F, -0.9076F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(106, 46).addBox(-1.9344F, -1.9344F, -0.9F, 3.8688F, 3.8688F, 1.0F),
                PartPose.offsetAndRotation(-1.74F, 1.8F, -7.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(117, 46).addBox(-1.56F, -1.56F, -2.496F, 3.12F, 3.12F, 2.496F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(5, 75).addBox(-2.184F, -0.9F, -1.2F, 4.368F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-1.74F, -0.4464F, -7.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(0, 54).addBox(-1.9344F, -1.9344F, -0.9F, 3.8688F, 3.8688F, 1.0F),
                PartPose.offsetAndRotation(1.74F, 1.8F, -7.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(11, 54).addBox(-1.56F, -1.56F, -2.496F, 3.12F, 3.12F, 2.496F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(16, 75).addBox(-2.184F, -0.9F, -1.2F, 4.368F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(1.74F, -0.4464F, -7.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(109, 66).addBox(-0.858F, -0.858F, -1.4586F, 1.716F, 1.716F, 1.4586F),
                PartPose.offsetAndRotation(-1.8F, -1.5F, -7.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(27, 75).addBox(-0.702F, -0.702F, -1.1934F, 1.404F, 1.404F, 1.1934F),
                PartPose.offsetAndRotation(2.04F, -1.92F, -7.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceSpare2 = face.addOrReplaceChild("face_spare2",
                CubeListBuilder.create()
                        .texOffs(32, 75).addBox(-0.624F, -0.624F, -1.0608F, 1.248F, 1.248F, 1.0608F),
                PartPose.offsetAndRotation(0.0F, -3.0F, -7.7F, 0.0F, 0.0F, -0.363F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(20, 60).addBox(-2.52F, -1.2F, -1.6F, 5.04F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 3.96F, -7.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(37, 75).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-2.04F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(35, 71).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(-1.02F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(40, 71).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.9F, 0.9F),
                PartPose.offset(0.0F, 0.4F, -0.9F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(45, 71).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(1.02F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceUt4 = faceMaw.addOrReplaceChild("face_ut4",
                CubeListBuilder.create()
                        .texOffs(42, 75).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(2.04F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(76, 46).addBox(-2.4F, 0.0F, -3.0F, 4.8F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 4.2F, -6.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(47, 75).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-1.92F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(50, 71).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(-0.96F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(55, 71).addBox(-0.4F, -1.7F, -0.4F, 0.8F, 1.7F, 0.8F),
                PartPose.offset(0.0F, 0.1F, -2.4F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(60, 71).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(0.96F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceLt4 = faceJaw.addOrReplaceChild("face_lt4",
                CubeListBuilder.create()
                        .texOffs(52, 75).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(1.92F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(80, 66).addBox(-1.56F, -0.2F, -1.4F, 3.12F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(60, 66).addBox(-0.65F, 0.0F, -0.5F, 1.3F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 5.0F, -7.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(65, 71).addBox(-0.572F, 0.0F, -0.5F, 1.144F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(70, 71).addBox(-0.5034F, 0.0F, -0.5F, 1.0067F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(75, 71).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(80, 71).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue4.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(85, 71).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2RootsR = head.addOrReplaceChild("mut2_roots_r",
                CubeListBuilder.create()
                        .texOffs(67, 46).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -4.0F, -0.4189F, 0.0F, -0.5236F));
        PartDefinition mut2RootsR1 = mut2RootsR.addOrReplaceChild("mut2_roots_r_1",
                CubeListBuilder.create()
                        .texOffs(15, 60).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsR2 = mut2RootsR1.addOrReplaceChild("mut2_roots_r_2",
                CubeListBuilder.create()
                        .texOffs(65, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsRB = mut2RootsR1.addOrReplaceChild("mut2_roots_r_b",
                CubeListBuilder.create()
                        .texOffs(70, 66).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, 0.8029F));
        PartDefinition mut2RootsRB1 = mut2RootsRB.addOrReplaceChild("mut2_roots_r_b_1",
                CubeListBuilder.create()
                        .texOffs(75, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, -0.4538F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 2.5F, -8.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(22, 54).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(9, 66).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-2.4F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(116, 66).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(0, 71).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-0.8F, 1.3524F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(33, 54).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(18, 66).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(0.8F, -1.9927F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(7, 71).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(27, 66).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(2.4F, 1.5837F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(58, 46).addBox(-1.0F, 0.0F, 0.0F, 2.0F, 4.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 8.0F, -0.3F, 0.0F, 0.0F));
        PartDefinition mut1Fleecerift = body.addOrReplaceChild("mut1_fleecerift",
                CubeListBuilder.create()
                        .texOffs(19, 46).addBox(-3.0F, -2.5F, -0.8F, 6.0F, 5.0F, 2.0F),
                PartPose.offset(0.0F, 3.0F, 3.0F));
        PartDefinition mut1FleeceriftFlapR = mut1Fleecerift.addOrReplaceChild("mut1_fleecerift_flap_r",
                CubeListBuilder.create()
                        .texOffs(36, 46).addBox(-3.3F, -2.5F, -1.0F, 3.3F, 5.0F, 1.6F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1FleeceriftFlapL = mut1Fleecerift.addOrReplaceChild("mut1_fleecerift_flap_l",
                CubeListBuilder.create()
                        .texOffs(47, 46).addBox(0.0F, -2.5F, -1.0F, 3.3F, 5.0F, 1.6F),
                PartPose.offsetAndRotation(3.0F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1FleeceriftStrand0 = mut1Fleecerift.addOrReplaceChild("mut1_fleecerift_strand0",
                CubeListBuilder.create()
                        .texOffs(45, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(-1.5F, -1.75F, -0.9F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1FleeceriftStrand1 = mut1Fleecerift.addOrReplaceChild("mut1_fleecerift_strand1",
                CubeListBuilder.create()
                        .texOffs(50, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.0F, -0.9F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1FleeceriftStrand2 = mut1Fleecerift.addOrReplaceChild("mut1_fleecerift_strand2",
                CubeListBuilder.create()
                        .texOffs(55, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(1.5F, -0.25F, -0.9F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1FleeceriftEyes = mut1Fleecerift.addOrReplaceChild("mut1_fleecerift_eyes",
                CubeListBuilder.create()
                        .texOffs(35, 60).addBox(-1.92F, -1.4F, -0.6F, 3.84F, 2.8F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -1.0F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(68, 60).addBox(-1.2F, -1.65F, -0.8F, 2.4F, 1.65F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -5.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(88, 54).addBox(-1.2F, -2.6046F, -0.8F, 2.4F, 2.6046F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -2.25F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(97, 54).addBox(-1.2F, -3.0F, -0.8F, 2.4F, 3.0F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.5F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(106, 54).addBox(-1.2F, -2.6046F, -0.8F, 2.4F, 2.6046F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 3.25F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP4 = mut1Plates.addOrReplaceChild("mut1_plates_p4",
                CubeListBuilder.create()
                        .texOffs(77, 60).addBox(-1.2F, -1.65F, -0.8F, 2.4F, 1.65F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 6.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = body.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -1.0F, -4.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(115, 54).addBox(-0.5F, -3.6F, -0.5F, 1.0F, 3.6F, 1.0F),
                PartPose.offsetAndRotation(-3.4F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(86, 60).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.6F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(120, 54).addBox(-0.5F, -3.6F, -0.5F, 1.0F, 3.6F, 1.0F),
                PartPose.offsetAndRotation(-1.7F, 0.0F, -0.4F, -0.3142F, -0.2269F, -0.2618F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(95, 60).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.6F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(0, 60).addBox(-0.5F, -3.6F, -0.5F, 1.0F, 3.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(104, 60).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.6F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(5, 60).addBox(-0.5F, -3.6F, -0.5F, 1.0F, 3.6F, 1.0F),
                PartPose.offsetAndRotation(1.7F, 0.0F, -0.4F, -0.3142F, 0.2269F, 0.2618F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(113, 60).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.6F, 0.0F));
        PartDefinition mut2StalksS4 = mut2Stalks.addOrReplaceChild("mut2_stalks_s4",
                CubeListBuilder.create()
                        .texOffs(10, 60).addBox(-0.5F, -3.6F, -0.5F, 1.0F, 3.6F, 1.0F),
                PartPose.offsetAndRotation(3.4F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE4 = mut2StalksS4.addOrReplaceChild("mut2_stalks_e4",
                CubeListBuilder.create()
                        .texOffs(0, 66).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.6F, 0.0F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(30, 37).addBox(-1.14F, 0.0F, -1.14F, 2.28F, 5.7F, 2.28F),
                PartPose.offsetAndRotation(-4.5F, 2.0F, -4.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(39, 37).addBox(-0.95F, 0.0F, -0.95F, 1.9F, 5.7F, 1.9F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(46, 60).addBox(-1.33F, 0.0F, -0.855F, 2.66F, 2.09F, 1.71F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(90, 71).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-1.045F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(57, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(62, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(95, 71).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-0.3325F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(67, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(72, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(100, 71).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(0.38F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(77, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(82, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(105, 71).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(1.0925F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(87, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(92, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(97, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.425F, 1.0F),
                PartPose.offsetAndRotation(-1.33F, 0.95F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(102, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3138F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.425F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(48, 37).addBox(-1.14F, 0.0F, -1.14F, 2.28F, 5.7F, 2.28F),
                PartPose.offsetAndRotation(4.5F, 2.0F, -4.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(57, 37).addBox(-0.95F, 0.0F, -0.95F, 1.9F, 5.7F, 1.9F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(57, 60).addBox(-1.33F, 0.0F, -0.855F, 2.66F, 2.09F, 1.71F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(110, 71).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-1.045F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(107, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(112, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(115, 71).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-0.3325F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(117, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(122, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(120, 71).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(0.38F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(0, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(5, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(0, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(1.0925F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(10, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(15, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(20, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.425F, 1.0F),
                PartPose.offsetAndRotation(-1.33F, 0.95F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(25, 79).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3138F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.425F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut1Witherseyes = body.addOrReplaceChild("mut1_witherseyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -0.5F, -6.0F));
        PartDefinition mut1WitherseyesE0 = mut1Witherseyes.addOrReplaceChild("mut1_witherseyes_e0",
                CubeListBuilder.create()
                        .texOffs(44, 54).addBox(-1.43F, -1.43F, -1.7732F, 2.86F, 2.86F, 1.7732F)
                        .texOffs(55, 54).addBox(-1.7732F, -1.7732F, -0.858F, 3.5464F, 3.5464F, 1.144F),
                PartPose.offsetAndRotation(-3.4F, 0.0F, -0.24F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1WitherseyesE1 = mut1Witherseyes.addOrReplaceChild("mut1_witherseyes_e1",
                CubeListBuilder.create()
                        .texOffs(14, 71).addBox(-0.9996F, -0.9996F, -1.2396F, 1.9993F, 1.9993F, 1.2396F)
                        .texOffs(21, 71).addBox(-1.2396F, -1.2396F, -0.5998F, 2.4791F, 2.4791F, 0.7997F),
                PartPose.offsetAndRotation(-1.1333F, 1.0819F, -0.3414F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1WitherseyesE2 = mut1Witherseyes.addOrReplaceChild("mut1_witherseyes_e2",
                CubeListBuilder.create()
                        .texOffs(66, 54).addBox(-1.4136F, -1.4136F, -1.7529F, 2.8272F, 2.8272F, 1.7529F)
                        .texOffs(77, 54).addBox(-1.7529F, -1.7529F, -0.8482F, 3.5057F, 3.5057F, 1.1309F),
                PartPose.offsetAndRotation(1.1333F, -1.5941F, -0.3895F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1WitherseyesE3 = mut1Witherseyes.addOrReplaceChild("mut1_witherseyes_e3",
                CubeListBuilder.create()
                        .texOffs(28, 71).addBox(-1.1227F, -1.1227F, -1.3922F, 2.2454F, 2.2454F, 1.3922F)
                        .texOffs(36, 66).addBox(-1.3922F, -1.3922F, -0.6736F, 2.7843F, 2.7843F, 0.8982F),
                PartPose.offsetAndRotation(3.4F, 1.2669F, -0.3588F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(25, 25).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 4.84F, 4.0F),
                PartPose.offset(-3.0F, 13.0F, -5.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(0, 37).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 4.18F, 3.6F),
                PartPose.offset(0.0F, 4.84F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(66, 37).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.98F, 4.6F),
                PartPose.offset(0.0F, 4.18F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(42, 25).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 4.84F, 4.0F),
                PartPose.offset(3.0F, 13.0F, -5.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(15, 37).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 4.18F, 3.6F),
                PartPose.offset(0.0F, 4.84F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(85, 37).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.98F, 4.6F),
                PartPose.offset(0.0F, 4.18F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(89, 25).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 4.4F, 4.0F),
                PartPose.offset(-3.0F, 13.0F, 5.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(59, 25).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 4.62F, 3.6F),
                PartPose.offset(0.0F, 4.4F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(104, 37).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.98F, 4.6F),
                PartPose.offset(0.0F, 4.62F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(106, 25).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 4.4F, 4.0F),
                PartPose.offset(3.0F, 13.0F, 5.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(74, 25).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 4.62F, 3.6F),
                PartPose.offset(0.0F, 4.4F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(0, 46).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.98F, 4.6F),
                PartPose.offset(0.0F, 4.62F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedChickenLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-3.0F, 0.0F, -4.0F, 6.0F, 7.0F, 9.0F),
                PartPose.offsetAndRotation(0.0F, 10.5F, 0.0F, 0.1047F, 0.0F, 0.0F));
        PartDefinition tailfan = body.addOrReplaceChild("tailfan",
                CubeListBuilder.create()
                        .texOffs(65, 0).addBox(-2.5F, 0.0F, 0.0F, 5.0F, 6.0F, 1.5F),
                PartPose.offsetAndRotation(0.0F, 0.5F, 5.0F, -0.733F, 0.0F, 0.0F));
        PartDefinition neck = body.addOrReplaceChild("neck",
                CubeListBuilder.create()
                        .texOffs(95, 0).addBox(-1.5F, -5.0F, -1.5F, 3.0F, 5.0F, 3.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, -3.5F, 0.1222F, 0.0F, 0.0F));
        PartDefinition head = neck.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(80, 0).addBox(-2.0F, 0.0F, -3.0F, 4.0F, 5.0F, 3.0F),
                PartPose.offset(0.0F, -5.0F, 0.0F));
        PartDefinition beak = head.addOrReplaceChild("beak",
                CubeListBuilder.create()
                        .texOffs(43, 25).addBox(-1.5F, 0.0F, -2.5F, 3.0F, 2.0F, 2.5F),
                PartPose.offset(0.0F, 2.2F, -3.0F));
        PartDefinition comb = head.addOrReplaceChild("comb",
                CubeListBuilder.create()
                        .texOffs(26, 17).addBox(-0.6F, -2.5F, -2.0F, 1.2F, 2.5F, 4.5F),
                PartPose.offset(0.0F, 0.0F, -1.0F));
        PartDefinition wattle = head.addOrReplaceChild("wattle",
                CubeListBuilder.create()
                        .texOffs(36, 31).addBox(-1.1F, 0.0F, -1.2F, 2.2F, 3.0F, 1.2F),
                PartPose.offset(0.0F, 4.0F, -2.6F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(116, 17).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(-1.16F, 1.5F, -2.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(0, 25).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(60, 36).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-1.16F, -0.66F, -2.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(11, 25).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(1.16F, 1.5F, -2.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(22, 25).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(71, 36).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(1.16F, -0.66F, -2.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(66, 31).addBox(-0.825F, -0.825F, -1.4025F, 1.65F, 1.65F, 1.4025F),
                PartPose.offsetAndRotation(-1.2F, -1.25F, -2.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(82, 36).addBox(-0.675F, -0.675F, -1.1475F, 1.35F, 1.35F, 1.1475F),
                PartPose.offsetAndRotation(1.36F, -1.6F, -2.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(54, 25).addBox(-1.68F, -1.2F, -1.6F, 3.36F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 3.3F, -2.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(87, 36).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-1.36F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(115, 31).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(-0.4533F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(120, 31).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(0.4533F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(92, 36).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(1.36F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(103, 17).addBox(-1.6F, 0.0F, -3.0F, 3.2F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 3.5F, -1.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(97, 36).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-1.28F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(0, 36).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(-0.4267F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(5, 36).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(0.4267F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(102, 36).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(1.28F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(48, 31).addBox(-1.04F, -0.2F, -1.4F, 2.08F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(43, 31).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, -3.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(10, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(15, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(20, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue3.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(25, 36).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2Stalks = head.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, -1.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(45, 36).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(-1.8F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(119, 25).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(50, 36).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(0, 31).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(55, 36).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(1.8F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(9, 31).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 2.0F, -3.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(87, 31).addBox(-1.1F, -1.1F, -1.364F, 2.2F, 2.2F, 1.364F)
                        .texOffs(18, 31).addBox(-1.364F, -1.364F, -0.66F, 2.728F, 2.728F, 0.88F),
                PartPose.offsetAndRotation(-1.6F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(94, 31).addBox(-0.769F, -0.769F, -0.9535F, 1.5379F, 1.5379F, 0.9535F)
                        .texOffs(101, 31).addBox(-0.9535F, -0.9535F, -0.4614F, 1.907F, 1.907F, 0.6152F),
                PartPose.offsetAndRotation(0.0F, 0.9467F, -0.5691F, 0.0F, 0.0F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(108, 31).addBox(-1.0874F, -1.0874F, -1.3484F, 2.1748F, 2.1748F, 1.3484F)
                        .texOffs(27, 31).addBox(-1.3484F, -1.3484F, -0.6524F, 2.6967F, 2.6967F, 0.8699F),
                PartPose.offsetAndRotation(1.6F, -1.3949F, -0.6491F, 0.0F, 0.4538F, -0.3478F));
        PartDefinition wingR = body.addOrReplaceChild("wing_r",
                CubeListBuilder.create()
                        .texOffs(31, 0).addBox(-1.0F, 0.0F, 0.0F, 1.0F, 5.0F, 7.0F),
                PartPose.offset(-3.0F, 1.0F, -2.0F));
        PartDefinition wingL = body.addOrReplaceChild("wing_l",
                CubeListBuilder.create()
                        .texOffs(48, 0).addBox(0.0F, 0.0F, 0.0F, 1.0F, 5.0F, 7.0F),
                PartPose.offset(3.0F, 1.0F, -2.0F));
        PartDefinition mut1Neck = body.addOrReplaceChild("mut1_neck",
                CubeListBuilder.create()
                        .texOffs(83, 25).addBox(-1.2F, 0.0F, -1.2F, 2.4F, 2.2F, 2.4F),
                PartPose.offsetAndRotation(0.0F, -3.0F, -3.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Neck1 = mut1Neck.addOrReplaceChild("mut1_neck_1",
                CubeListBuilder.create()
                        .texOffs(92, 25).addBox(-1.08F, 0.0F, -1.08F, 2.16F, 2.0871F, 2.16F),
                PartPose.offsetAndRotation(0.0F, 2.2F, 0.0F, -0.1396F, 0.0F, 0.0F));
        PartDefinition mut1Neck2 = mut1Neck1.addOrReplaceChild("mut1_neck_2",
                CubeListBuilder.create()
                        .texOffs(101, 25).addBox(-0.972F, 0.0F, -0.972F, 1.944F, 1.98F, 1.944F),
                PartPose.offsetAndRotation(0.0F, 2.0871F, 0.0F, -0.1396F, 0.0F, 0.0F));
        PartDefinition mut1Neck3 = mut1Neck2.addOrReplaceChild("mut1_neck_3",
                CubeListBuilder.create()
                        .texOffs(110, 25).addBox(-0.8748F, 0.0F, -0.8748F, 1.7496F, 1.8784F, 1.7496F),
                PartPose.offsetAndRotation(0.0F, 1.98F, 0.0F, -0.1396F, 0.0F, 0.0F));
        PartDefinition mut1Crop = body.addOrReplaceChild("mut1_crop",
                CubeListBuilder.create()
                        .texOffs(13, 17).addBox(-2.0F, -2.0F, -0.64F, 4.0F, 4.0F, 1.6F),
                PartPose.offset(0.0F, 4.0F, 3.0F));
        PartDefinition mut1CropFlapR = mut1Crop.addOrReplaceChild("mut1_crop_flap_r",
                CubeListBuilder.create()
                        .texOffs(37, 17).addBox(-2.2F, -2.0F, -1.0F, 2.2F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1CropFlapL = mut1Crop.addOrReplaceChild("mut1_crop_flap_l",
                CubeListBuilder.create()
                        .texOffs(46, 17).addBox(0.0F, -2.0F, -1.0F, 2.2F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(2.0F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1CropStrand0 = mut1Crop.addOrReplaceChild("mut1_crop_strand0",
                CubeListBuilder.create()
                        .texOffs(30, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(-1.0F, -1.4F, -0.72F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1CropStrand1 = mut1Crop.addOrReplaceChild("mut1_crop_strand1",
                CubeListBuilder.create()
                        .texOffs(35, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -0.8F, -0.72F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1CropStrand2 = mut1Crop.addOrReplaceChild("mut1_crop_strand2",
                CubeListBuilder.create()
                        .texOffs(40, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(1.0F, -0.2F, -0.72F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1CropEyes = mut1Crop.addOrReplaceChild("mut1_crop_eyes",
                CubeListBuilder.create()
                        .texOffs(57, 31).addBox(-1.28F, -1.12F, -0.6F, 2.56F, 2.24F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.72F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(55, 17).addBox(-0.84F, 0.0F, -0.84F, 1.68F, 4.2F, 1.68F),
                PartPose.offsetAndRotation(-3.0F, 2.0F, -2.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(33, 25).addBox(-0.7F, 0.0F, -0.7F, 1.4F, 4.2F, 1.4F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(73, 31).addBox(-0.98F, 0.0F, -0.63F, 1.96F, 1.54F, 1.26F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(107, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(-0.77F, 1.54F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(112, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(117, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(122, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(-0.245F, 1.54F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(0, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(5, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(10, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(0.28F, 1.54F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(15, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(20, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(25, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(0.805F, 1.54F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(30, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(35, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(40, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.05F, 1.0F),
                PartPose.offsetAndRotation(-0.98F, 0.7F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(45, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9681F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.05F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(64, 17).addBox(-0.84F, 0.0F, -0.84F, 1.68F, 4.2F, 1.68F),
                PartPose.offsetAndRotation(3.0F, 2.0F, -2.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(38, 25).addBox(-0.7F, 0.0F, -0.7F, 1.4F, 4.2F, 1.4F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(80, 31).addBox(-0.98F, 0.0F, -0.63F, 1.96F, 1.54F, 1.26F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(50, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(-0.77F, 1.54F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(55, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(60, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(65, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(-0.245F, 1.54F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(70, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(75, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(80, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(0.28F, 1.54F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(85, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(90, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(95, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(0.805F, 1.54F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(100, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(105, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(110, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.05F, 1.0F),
                PartPose.offsetAndRotation(-0.98F, 0.7F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(115, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9681F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.05F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition legR = root.addOrReplaceChild("leg_r",
                CubeListBuilder.create()
                        .texOffs(108, 0).addBox(-1.3F, 0.0F, -1.3F, 2.6F, 4.0F, 2.6F),
                PartPose.offset(-2.0F, 16.5F, 0.5F));
        PartDefinition legR1 = legR.addOrReplaceChild("leg_r_1",
                CubeListBuilder.create()
                        .texOffs(65, 25).addBox(-1.05F, 0.0F, -1.05F, 2.1F, 2.5F, 2.1F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition footR = legR1.addOrReplaceChild("foot_r",
                CubeListBuilder.create()
                        .texOffs(73, 17).addBox(-1.6F, 0.0F, -2.6F, 3.2F, 1.0F, 4.0F),
                PartPose.offset(0.0F, 2.5F, 0.0F));
        PartDefinition legL = root.addOrReplaceChild("leg_l",
                CubeListBuilder.create()
                        .texOffs(0, 17).addBox(-1.3F, 0.0F, -1.3F, 2.6F, 4.0F, 2.6F),
                PartPose.offset(2.0F, 16.5F, 0.5F));
        PartDefinition legL1 = legL.addOrReplaceChild("leg_l_1",
                CubeListBuilder.create()
                        .texOffs(74, 25).addBox(-1.05F, 0.0F, -1.05F, 2.1F, 2.5F, 2.1F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition footL = legL1.addOrReplaceChild("foot_l",
                CubeListBuilder.create()
                        .texOffs(88, 17).addBox(-1.6F, 0.0F, -2.6F, 3.2F, 1.0F, 4.0F),
                PartPose.offset(0.0F, 2.5F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
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
                        .texOffs(101, 51).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(-1.75F, -2.1F, -0.9F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1SacStrand1 = mut1Sac.addOrReplaceChild("mut1_sac_strand1",
                CubeListBuilder.create()
                        .texOffs(106, 51).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.2F, -0.9F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1SacStrand2 = mut1Sac.addOrReplaceChild("mut1_sac_strand2",
                CubeListBuilder.create()
                        .texOffs(111, 51).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(1.75F, -0.3F, -0.9F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1SacEyes = mut1Sac.addOrReplaceChild("mut1_sac_eyes",
                CubeListBuilder.create()
                        .texOffs(0, 51).addBox(-2.24F, -1.68F, -0.6F, 4.48F, 3.36F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition mut1Bulb = abdomen.addOrReplaceChild("mut1_bulb",
                CubeListBuilder.create()
                        .texOffs(103, 0).addBox(-2.5F, -2.0F, -3.0F, 5.0F, 4.0F, 6.0F),
                PartPose.offset(0.0F, -4.5F, 0.0F));
        PartDefinition mut1BulbCore = mut1Bulb.addOrReplaceChild("mut1_bulb_core",
                CubeListBuilder.create()
                        .texOffs(22, 30).addBox(-1.25F, -1.0F, -1.5F, 2.5F, 2.0F, 3.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut2Legs00 = abdomen.addOrReplaceChild("mut2_legs00",
                CubeListBuilder.create()
                        .texOffs(45, 21).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 4.5833F, 1.8F),
                PartPose.offsetAndRotation(-4.5F, 0.0F, 2.0F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2Legs001 = mut2Legs00.addOrReplaceChild("mut2_legs00_1",
                CubeListBuilder.create()
                        .texOffs(66, 30).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 4.0995F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 4.5833F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2Legs002 = mut2Legs001.addOrReplaceChild("mut2_legs00_2",
                CubeListBuilder.create()
                        .texOffs(71, 30).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.6667F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 4.0995F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2Legs01 = abdomen.addOrReplaceChild("mut2_legs01",
                CubeListBuilder.create()
                        .texOffs(54, 21).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 4.5833F, 1.8F),
                PartPose.offsetAndRotation(-4.5F, 0.0F, 5.4F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2Legs011 = mut2Legs01.addOrReplaceChild("mut2_legs01_1",
                CubeListBuilder.create()
                        .texOffs(76, 30).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 4.0995F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 4.5833F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2Legs012 = mut2Legs011.addOrReplaceChild("mut2_legs01_2",
                CubeListBuilder.create()
                        .texOffs(81, 30).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.6667F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 4.0995F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2Legs10 = abdomen.addOrReplaceChild("mut2_legs10",
                CubeListBuilder.create()
                        .texOffs(63, 21).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 4.5833F, 1.8F),
                PartPose.offsetAndRotation(4.5F, 0.0F, 2.0F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2Legs101 = mut2Legs10.addOrReplaceChild("mut2_legs10_1",
                CubeListBuilder.create()
                        .texOffs(86, 30).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 4.0995F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 4.5833F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2Legs102 = mut2Legs101.addOrReplaceChild("mut2_legs10_2",
                CubeListBuilder.create()
                        .texOffs(91, 30).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.6667F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 4.0995F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2Legs11 = abdomen.addOrReplaceChild("mut2_legs11",
                CubeListBuilder.create()
                        .texOffs(72, 21).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 4.5833F, 1.8F),
                PartPose.offsetAndRotation(4.5F, 0.0F, 5.4F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2Legs111 = mut2Legs11.addOrReplaceChild("mut2_legs11_1",
                CubeListBuilder.create()
                        .texOffs(96, 30).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 4.0995F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 4.5833F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2Legs112 = mut2Legs111.addOrReplaceChild("mut2_legs11_2",
                CubeListBuilder.create()
                        .texOffs(101, 30).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.6667F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 4.0995F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(45, 0).addBox(-4.0F, -4.0F, -8.0F, 8.0F, 8.0F, 8.0F),
                PartPose.offset(0.0F, 0.0F, -3.0F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(0, 30).addBox(-2.108F, -2.108F, -0.9F, 4.216F, 4.216F, 1.0F),
                PartPose.offsetAndRotation(-2.32F, 2.4F, -3.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(81, 21).addBox(-1.7F, -1.7F, -2.72F, 3.4F, 3.4F, 2.72F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(0, 61).addBox(-2.38F, -0.9F, -1.2F, 4.76F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-2.32F, -0.048F, -3.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(11, 30).addBox(-2.108F, -2.108F, -0.9F, 4.216F, 4.216F, 1.0F),
                PartPose.offsetAndRotation(2.32F, 2.4F, -3.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(94, 21).addBox(-1.7F, -1.7F, -2.72F, 3.4F, 3.4F, 2.72F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(13, 61).addBox(-2.38F, -0.9F, -1.2F, 4.76F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(2.32F, -0.048F, -3.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(11, 51).addBox(-0.935F, -0.935F, -1.5895F, 1.87F, 1.87F, 1.5895F),
                PartPose.offsetAndRotation(-2.4F, -2.0F, -3.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(28, 56).addBox(-0.765F, -0.765F, -1.3005F, 1.53F, 1.53F, 1.3005F),
                PartPose.offsetAndRotation(2.72F, -2.56F, -3.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceSpare2 = face.addOrReplaceChild("face_spare2",
                CubeListBuilder.create()
                        .texOffs(26, 61).addBox(-0.68F, -0.68F, -1.156F, 1.36F, 1.36F, 1.156F),
                PartPose.offsetAndRotation(0.0F, -4.0F, -3.7F, 0.0F, 0.0F, -0.363F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(105, 46).addBox(-3.36F, -1.2F, -1.6F, 6.72F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 5.28F, -3.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(31, 61).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-2.72F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(63, 56).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.6F, 0.9F),
                PartPose.offsetAndRotation(-1.632F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0838F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(68, 56).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.8F, 0.9F),
                PartPose.offsetAndRotation(-0.544F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0279F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(73, 56).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.8F, 0.9F),
                PartPose.offsetAndRotation(0.544F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0279F));
        PartDefinition faceUt4 = faceMaw.addOrReplaceChild("face_ut4",
                CubeListBuilder.create()
                        .texOffs(78, 56).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.6F, 0.9F),
                PartPose.offsetAndRotation(1.632F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0838F));
        PartDefinition faceUt5 = faceMaw.addOrReplaceChild("face_ut5",
                CubeListBuilder.create()
                        .texOffs(36, 61).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(2.72F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(107, 21).addBox(-3.2F, 0.0F, -3.0F, 6.4F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 5.6F, -2.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(41, 61).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-2.56F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(46, 61).addBox(-0.4F, -1.46F, -0.4F, 0.8F, 1.46F, 0.8F),
                PartPose.offsetAndRotation(-1.536F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0838F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(83, 56).addBox(-0.4F, -1.62F, -0.4F, 0.8F, 1.62F, 0.8F),
                PartPose.offsetAndRotation(-0.512F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0279F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(88, 56).addBox(-0.4F, -1.62F, -0.4F, 0.8F, 1.62F, 0.8F),
                PartPose.offsetAndRotation(0.512F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0279F));
        PartDefinition faceLt4 = faceJaw.addOrReplaceChild("face_lt4",
                CubeListBuilder.create()
                        .texOffs(51, 61).addBox(-0.4F, -1.46F, -0.4F, 0.8F, 1.46F, 0.8F),
                PartPose.offsetAndRotation(1.536F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0838F));
        PartDefinition faceLt5 = faceJaw.addOrReplaceChild("face_lt5",
                CubeListBuilder.create()
                        .texOffs(56, 61).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(2.56F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(15, 56).addBox(-2.08F, -0.2F, -1.4F, 4.16F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(116, 51).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0F, -7.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(93, 56).addBox(-0.528F, 0.0F, -0.5F, 1.056F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(98, 56).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(103, 56).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(108, 56).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue4.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(113, 56).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2Stalks = head.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -3.5F, -5.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(121, 51).addBox(-0.5F, -2.6F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(20, 51).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.6F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(0, 56).addBox(-0.5F, -2.6F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(-1.0F, 0.0F, -0.2667F, -0.3142F, -0.1513F, -0.1745F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(29, 51).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.6F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(5, 56).addBox(-0.5F, -2.6F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(1.0F, 0.0F, -0.2667F, -0.3142F, 0.1513F, 0.1745F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(38, 51).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.6F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(10, 56).addBox(-0.5F, -2.6F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(3.0F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(47, 51).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.6F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -1.0F, -8.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(33, 30).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(56, 51).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-3.4F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(35, 56).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(42, 56).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-2.04F, 1.7581F, -0.5691F, 0.0F, -0.2723F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(44, 30).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(65, 51).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(-0.68F, -2.5905F, -0.6491F, 0.0F, -0.0908F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(49, 56).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(74, 51).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(0.68F, 2.0588F, -0.598F, 0.0F, 0.0908F, 0.2764F));
        PartDefinition mut1EyesE4 = mut1Eyes.addOrReplaceChild("mut1_eyes_e4",
                CubeListBuilder.create()
                        .texOffs(55, 30).addBox(-1.2604F, -1.2604F, -1.563F, 2.5209F, 2.5209F, 1.563F)
                        .texOffs(83, 51).addBox(-1.563F, -1.563F, -0.7563F, 3.1259F, 3.1259F, 1.0084F),
                PartPose.offsetAndRotation(2.04F, -0.443F, -0.4426F, 0.0F, 0.2723F, -0.0595F));
        PartDefinition mut1EyesE5 = mut1Eyes.addOrReplaceChild("mut1_eyes_e5",
                CubeListBuilder.create()
                        .texOffs(56, 56).addBox(-1.1385F, -1.1385F, -1.4118F, 2.277F, 2.277F, 1.4118F)
                        .texOffs(92, 51).addBox(-1.4118F, -1.4118F, -0.6831F, 2.8235F, 2.8235F, 0.9108F),
                PartPose.offsetAndRotation(3.4F, -1.406F, -0.5352F, 0.0F, 0.4538F, -0.1888F));
        PartDefinition legR0 = body.addOrReplaceChild("leg_r0",
                CubeListBuilder.create()
                        .texOffs(46, 41).addBox(-8.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-4.0F, 0.0F, -1.0F, 0.0F, 0.6283F, 0.8378F));
        PartDefinition legR02 = legR0.addOrReplaceChild("leg_r0_2",
                CubeListBuilder.create()
                        .texOffs(106, 30).addBox(-9.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-8.0F, 0.0F, 0.0F, 0.0F, 0.0F, -1.3963F));
        PartDefinition legR1 = body.addOrReplaceChild("leg_r1",
                CubeListBuilder.create()
                        .texOffs(67, 41).addBox(-8.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-4.0F, 0.0F, 1.6F, 0.0F, 0.2094F, 0.8378F));
        PartDefinition legR12 = legR1.addOrReplaceChild("leg_r1_2",
                CubeListBuilder.create()
                        .texOffs(0, 36).addBox(-9.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-8.0F, 0.0F, 0.0F, 0.0F, 0.0F, -1.3963F));
        PartDefinition legR2 = body.addOrReplaceChild("leg_r2",
                CubeListBuilder.create()
                        .texOffs(88, 41).addBox(-8.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-4.0F, 0.0F, 4.2F, 0.0F, -0.2094F, 0.8378F));
        PartDefinition legR22 = legR2.addOrReplaceChild("leg_r2_2",
                CubeListBuilder.create()
                        .texOffs(23, 36).addBox(-9.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-8.0F, 0.0F, 0.0F, 0.0F, 0.0F, -1.3963F));
        PartDefinition legR3 = body.addOrReplaceChild("leg_r3",
                CubeListBuilder.create()
                        .texOffs(0, 46).addBox(-8.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-4.0F, 0.0F, 6.8F, 0.0F, -0.6283F, 0.8378F));
        PartDefinition legR32 = legR3.addOrReplaceChild("leg_r3_2",
                CubeListBuilder.create()
                        .texOffs(46, 36).addBox(-9.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-8.0F, 0.0F, 0.0F, 0.0F, 0.0F, -1.3963F));
        PartDefinition legL0 = body.addOrReplaceChild("leg_l0",
                CubeListBuilder.create()
                        .texOffs(21, 46).addBox(0.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(4.0F, 0.0F, -1.0F, 0.0F, -0.6283F, -0.8378F));
        PartDefinition legL02 = legL0.addOrReplaceChild("leg_l0_2",
                CubeListBuilder.create()
                        .texOffs(69, 36).addBox(0.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(8.0F, 0.0F, 0.0F, 0.0F, 0.0F, 1.3963F));
        PartDefinition legL1 = body.addOrReplaceChild("leg_l1",
                CubeListBuilder.create()
                        .texOffs(42, 46).addBox(0.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(4.0F, 0.0F, 1.6F, 0.0F, -0.2094F, -0.8378F));
        PartDefinition legL12 = legL1.addOrReplaceChild("leg_l1_2",
                CubeListBuilder.create()
                        .texOffs(92, 36).addBox(0.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(8.0F, 0.0F, 0.0F, 0.0F, 0.0F, 1.3963F));
        PartDefinition legL2 = body.addOrReplaceChild("leg_l2",
                CubeListBuilder.create()
                        .texOffs(63, 46).addBox(0.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(4.0F, 0.0F, 4.2F, 0.0F, 0.2094F, -0.8378F));
        PartDefinition legL22 = legL2.addOrReplaceChild("leg_l2_2",
                CubeListBuilder.create()
                        .texOffs(0, 41).addBox(0.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(8.0F, 0.0F, 0.0F, 0.0F, 0.0F, 1.3963F));
        PartDefinition legL3 = body.addOrReplaceChild("leg_l3",
                CubeListBuilder.create()
                        .texOffs(84, 46).addBox(0.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(4.0F, 0.0F, 6.8F, 0.0F, 0.6283F, -0.8378F));
        PartDefinition legL32 = legL3.addOrReplaceChild("leg_l3_2",
                CubeListBuilder.create()
                        .texOffs(23, 41).addBox(0.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
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
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(0, 28).addBox(-2.604F, -2.604F, -0.9F, 5.208F, 5.208F, 1.0F),
                PartPose.offsetAndRotation(-2.32F, 2.4F, -3.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(56, 17).addBox(-2.1F, -2.1F, -3.36F, 4.2F, 4.2F, 3.36F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(40, 46).addBox(-2.94F, -0.9F, -1.2F, 5.88F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-2.32F, -0.624F, -3.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(13, 28).addBox(-2.604F, -2.604F, -0.9F, 5.208F, 5.208F, 1.0F),
                PartPose.offsetAndRotation(2.32F, 2.4F, -3.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(71, 17).addBox(-2.1F, -2.1F, -3.36F, 4.2F, 4.2F, 3.36F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(55, 46).addBox(-2.94F, -0.9F, -1.2F, 5.88F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(2.32F, -0.624F, -3.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(51, 35).addBox(-1.155F, -1.155F, -1.9635F, 2.31F, 2.31F, 1.9635F),
                PartPose.offsetAndRotation(-2.4F, -2.0F, -3.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(60, 35).addBox(-0.945F, -0.945F, -1.6065F, 1.89F, 1.89F, 1.6065F),
                PartPose.offsetAndRotation(2.72F, -2.56F, -3.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(10, 35).addBox(-3.36F, -1.2F, -1.6F, 6.72F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 5.28F, -3.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(70, 46).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-2.72F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(86, 41).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(-1.36F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(91, 41).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.9F, 0.9F),
                PartPose.offset(0.0F, 0.4F, -0.9F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(96, 41).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(1.36F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceUt4 = faceMaw.addOrReplaceChild("face_ut4",
                CubeListBuilder.create()
                        .texOffs(75, 46).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(2.72F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(26, 28).addBox(-3.2F, 0.0F, -3.0F, 6.4F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 5.6F, -2.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(80, 46).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-2.56F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(101, 41).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(-1.28F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(106, 41).addBox(-0.4F, -1.7F, -0.4F, 0.8F, 1.7F, 0.8F),
                PartPose.offset(0.0F, 0.1F, -2.4F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(111, 41).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(1.28F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceLt4 = faceJaw.addOrReplaceChild("face_lt4",
                CubeListBuilder.create()
                        .texOffs(85, 46).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(2.56F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(41, 41).addBox(-2.08F, -0.2F, -1.4F, 4.16F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut2Stalks = head.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -8.0F, -2.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(116, 41).addBox(-0.5F, -2.2F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(96, 35).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.2F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(121, 41).addBox(-0.5F, -2.2F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(-1.5F, 0.0F, -0.4F, -0.3142F, -0.2269F, -0.2618F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(105, 35).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.2F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(0, 46).addBox(-0.5F, -2.2F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(114, 35).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.2F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(5, 46).addBox(-0.5F, -2.2F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(1.5F, 0.0F, -0.4F, -0.3142F, 0.2269F, 0.2618F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(0, 41).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.2F, 0.0F));
        PartDefinition mut2StalksS4 = mut2Stalks.addOrReplaceChild("mut2_stalks_s4",
                CubeListBuilder.create()
                        .texOffs(10, 46).addBox(-0.5F, -2.2F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(3.0F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE4 = mut2StalksS4.addOrReplaceChild("mut2_stalks_e4",
                CubeListBuilder.create()
                        .texOffs(9, 41).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.2F, 0.0F));
        PartDefinition mut2Tongue = head.addOrReplaceChild("mut2_tongue",
                CubeListBuilder.create()
                        .texOffs(36, 41).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.0F, -4.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut2Tongue1 = mut2Tongue.addOrReplaceChild("mut2_tongue_1",
                CubeListBuilder.create()
                        .texOffs(15, 46).addBox(-0.528F, 0.0F, -0.5F, 1.056F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut2Tongue2 = mut2Tongue1.addOrReplaceChild("mut2_tongue_2",
                CubeListBuilder.create()
                        .texOffs(20, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut2Tongue3 = mut2Tongue2.addOrReplaceChild("mut2_tongue_3",
                CubeListBuilder.create()
                        .texOffs(25, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut2Tongue4 = mut2Tongue3.addOrReplaceChild("mut2_tongue_4",
                CubeListBuilder.create()
                        .texOffs(30, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut2TongueTip = mut2Tongue4.addOrReplaceChild("mut2_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(35, 46).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -4.0F, -4.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(56, 28).addBox(-1.54F, -1.54F, -1.9096F, 3.08F, 3.08F, 1.9096F)
                        .texOffs(67, 28).addBox(-1.9096F, -1.9096F, -0.924F, 3.8192F, 3.8192F, 1.232F),
                PartPose.offsetAndRotation(-3.2F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(72, 41).addBox(-1.0765F, -1.0765F, -1.3349F, 2.1531F, 2.1531F, 1.3349F)
                        .texOffs(18, 41).addBox(-1.3349F, -1.3349F, -0.6459F, 2.6698F, 2.6698F, 0.8612F),
                PartPose.offsetAndRotation(-1.6F, 1.7581F, -0.5691F, 0.0F, -0.2269F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(78, 28).addBox(-1.5223F, -1.5223F, -1.8877F, 3.0447F, 3.0447F, 1.8877F)
                        .texOffs(89, 28).addBox(-1.8877F, -1.8877F, -0.9134F, 3.7754F, 3.7754F, 1.2179F),
                PartPose.offsetAndRotation(0.0F, -2.5905F, -0.6491F, 0.0F, 0.0F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(79, 41).addBox(-1.2091F, -1.2091F, -1.4993F, 2.4182F, 2.4182F, 1.4993F)
                        .texOffs(27, 41).addBox(-1.4993F, -1.4993F, -0.7255F, 2.9985F, 2.9985F, 0.9673F),
                PartPose.offsetAndRotation(1.6F, 2.0588F, -0.598F, 0.0F, 0.2269F, 0.2764F));
        PartDefinition mut1EyesE4 = mut1Eyes.addOrReplaceChild("mut1_eyes_e4",
                CubeListBuilder.create()
                        .texOffs(100, 28).addBox(-1.4705F, -1.4705F, -1.8234F, 2.941F, 2.941F, 1.8234F)
                        .texOffs(111, 28).addBox(-1.8234F, -1.8234F, -0.8823F, 3.6469F, 3.6469F, 1.1764F),
                PartPose.offsetAndRotation(3.2F, -0.443F, -0.4426F, 0.0F, 0.4538F, -0.0595F));
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
                        .texOffs(122, 28).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 4.4F, 1.0F),
                PartPose.offsetAndRotation(-1.5F, -2.8F, -1.08F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1CoreStrand1 = mut1Core.addOrReplaceChild("mut1_core_strand1",
                CubeListBuilder.create()
                        .texOffs(0, 35).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 4.4F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.6F, -1.08F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1CoreStrand2 = mut1Core.addOrReplaceChild("mut1_core_strand2",
                CubeListBuilder.create()
                        .texOffs(5, 35).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 4.4F, 1.0F),
                PartPose.offsetAndRotation(1.5F, -0.4F, -1.08F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1CoreEyes = mut1Core.addOrReplaceChild("mut1_core_eyes",
                CubeListBuilder.create()
                        .texOffs(45, 28).addBox(-1.92F, -2.24F, -0.6F, 3.84F, 4.48F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -1.08F));
        PartDefinition mut1Heart = body.addOrReplaceChild("mut1_heart",
                CubeListBuilder.create()
                        .texOffs(39, 17).addBox(-2.0F, -2.5F, -2.0F, 4.0F, 5.0F, 4.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition mut1HeartCore = mut1Heart.addOrReplaceChild("mut1_heart_core",
                CubeListBuilder.create()
                        .texOffs(69, 35).addBox(-1.0F, -1.25F, -1.0F, 2.0F, 2.5F, 2.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(54, 41).addBox(-1.2F, -1.43F, -0.8F, 2.4F, 1.43F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 1.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(78, 35).addBox(-1.2F, -2.4432F, -0.8F, 2.4F, 2.4432F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 1.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(87, 35).addBox(-1.2F, -2.4432F, -0.8F, 2.4F, 2.4432F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 1.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(63, 41).addBox(-1.2F, -1.43F, -0.8F, 2.4F, 1.43F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 1.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(86, 17).addBox(-1.08F, 0.0F, -1.08F, 2.16F, 5.4F, 2.16F),
                PartPose.offsetAndRotation(-4.0F, 2.0F, 0.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(95, 17).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 5.4F, 1.8F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(29, 35).addBox(-1.26F, 0.0F, -0.81F, 2.52F, 1.98F, 1.62F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(90, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.99F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(95, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(100, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(105, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.315F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(110, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(115, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(120, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(0.36F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(0, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(5, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(10, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(1.035F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(15, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(20, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(25, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.35F, 1.0F),
                PartPose.offsetAndRotation(-1.26F, 0.9F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(30, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2446F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.35F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(104, 17).addBox(-1.08F, 0.0F, -1.08F, 2.16F, 5.4F, 2.16F),
                PartPose.offsetAndRotation(4.0F, 2.0F, 0.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(113, 17).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 5.4F, 1.8F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(40, 35).addBox(-1.26F, 0.0F, -0.81F, 2.52F, 1.98F, 1.62F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(35, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.99F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(40, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(45, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(50, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.315F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(55, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(60, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(65, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(0.36F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(70, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(75, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(80, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(1.035F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(85, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(90, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(95, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.35F, 1.0F),
                PartPose.offsetAndRotation(-1.26F, 0.9F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(100, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2446F, 1.0F),
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
                        .texOffs(0, 0).addBox(-3.0F, 0.0F, -5.5F, 6.0F, 7.0F, 11.0F),
                PartPose.offset(0.0F, 8.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(70, 0).addBox(-3.0F, 0.0F, -5.0F, 6.0F, 6.0F, 5.0F),
                PartPose.offset(0.0F, -2.0F, -6.0F));
        PartDefinition muzzle = head.addOrReplaceChild("muzzle",
                CubeListBuilder.create()
                        .texOffs(19, 19).addBox(-1.5F, 0.0F, -4.0F, 3.0F, 3.0F, 4.0F),
                PartPose.offset(0.0F, 3.0F, -5.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(117, 43).addBox(-2.0F, 0.0F, -0.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-2.5F, -0.5F, -1.5F, 0.0F, 0.0F, -0.1396F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(0, 48).addBox(0.0F, 0.0F, -0.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(2.5F, -0.5F, -1.5F, 0.0F, 0.0F, 0.1396F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(89, 30).addBox(-1.9344F, -1.9344F, -0.9F, 3.8688F, 3.8688F, 1.0F),
                PartPose.offsetAndRotation(-1.74F, 1.8F, -4.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(100, 30).addBox(-1.56F, -1.56F, -2.496F, 3.12F, 3.12F, 2.496F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(45, 53).addBox(-2.184F, -0.9F, -1.2F, 4.368F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-1.74F, -0.4464F, -4.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(111, 30).addBox(-1.9344F, -1.9344F, -0.9F, 3.8688F, 3.8688F, 1.0F),
                PartPose.offsetAndRotation(1.74F, 1.8F, -4.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(0, 37).addBox(-1.56F, -1.56F, -2.496F, 3.12F, 3.12F, 2.496F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(56, 53).addBox(-2.184F, -0.9F, -1.2F, 4.368F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(1.74F, -0.4464F, -4.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(68, 48).addBox(-0.858F, -0.858F, -1.4586F, 1.716F, 1.716F, 1.4586F),
                PartPose.offsetAndRotation(-1.8F, -1.5F, -4.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(67, 53).addBox(-0.702F, -0.702F, -1.1934F, 1.404F, 1.404F, 1.1934F),
                PartPose.offsetAndRotation(2.04F, -1.92F, -4.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(114, 37).addBox(-2.52F, -1.2F, -1.6F, 5.04F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 3.96F, -4.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(72, 53).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-2.04F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(96, 48).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(-1.02F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(101, 48).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.9F, 0.9F),
                PartPose.offset(0.0F, 0.4F, -0.9F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(106, 48).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(1.02F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceUt4 = faceMaw.addOrReplaceChild("face_ut4",
                CubeListBuilder.create()
                        .texOffs(77, 53).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(2.04F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(72, 30).addBox(-2.4F, 0.0F, -3.0F, 4.8F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 4.2F, -3.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(82, 53).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-1.92F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(111, 48).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(-0.96F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(116, 48).addBox(-0.4F, -1.7F, -0.4F, 0.8F, 1.7F, 0.8F),
                PartPose.offset(0.0F, 0.1F, -2.4F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(121, 48).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(0.96F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceLt4 = faceJaw.addOrReplaceChild("face_lt4",
                CubeListBuilder.create()
                        .texOffs(87, 53).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(1.92F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(57, 48).addBox(-1.56F, -0.2F, -1.4F, 3.12F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(22, 48).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 5.0F, -5.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(0, 53).addBox(-0.528F, 0.0F, -0.5F, 1.056F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(5, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(10, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(15, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue5 = mut1Tongue4.addOrReplaceChild("mut1_tongue_5",
                CubeListBuilder.create()
                        .texOffs(20, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.8888F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0134F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue5.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(25, 53).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2RootsR = head.addOrReplaceChild("mut2_roots_r",
                CubeListBuilder.create()
                        .texOffs(54, 30).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -3.0F, -0.4189F, 0.0F, -0.5236F));
        PartDefinition mut2RootsR1 = mut2RootsR.addOrReplaceChild("mut2_roots_r_1",
                CubeListBuilder.create()
                        .texOffs(104, 37).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsR2 = mut2RootsR1.addOrReplaceChild("mut2_roots_r_2",
                CubeListBuilder.create()
                        .texOffs(27, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsRB = mut2RootsR1.addOrReplaceChild("mut2_roots_r_b",
                CubeListBuilder.create()
                        .texOffs(32, 48).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, 0.8029F));
        PartDefinition mut2RootsRB1 = mut2RootsRB.addOrReplaceChild("mut2_roots_r_b_1",
                CubeListBuilder.create()
                        .texOffs(37, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, -0.4538F));
        PartDefinition mut2RootsL = head.addOrReplaceChild("mut2_roots_l",
                CubeListBuilder.create()
                        .texOffs(63, 30).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(2.0F, 0.0F, -3.0F, -0.4189F, 0.0F, 0.5236F));
        PartDefinition mut2RootsL1 = mut2RootsL.addOrReplaceChild("mut2_roots_l_1",
                CubeListBuilder.create()
                        .texOffs(109, 37).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsL2 = mut2RootsL1.addOrReplaceChild("mut2_roots_l_2",
                CubeListBuilder.create()
                        .texOffs(42, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsLB = mut2RootsL1.addOrReplaceChild("mut2_roots_l_b",
                CubeListBuilder.create()
                        .texOffs(47, 48).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, -0.8029F));
        PartDefinition mut2RootsLB1 = mut2RootsLB.addOrReplaceChild("mut2_roots_l_b_1",
                CubeListBuilder.create()
                        .texOffs(52, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, 0.4538F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 2.0F, -6.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(55, 37).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(90, 43).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-2.4F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(75, 48).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(82, 48).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-0.8F, 1.3524F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(66, 37).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(99, 43).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(0.8F, -1.9927F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(89, 48).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(108, 43).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(2.4F, 1.5837F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition ruff = body.addOrReplaceChild("ruff",
                CubeListBuilder.create()
                        .texOffs(35, 0).addBox(-4.5F, 0.0F, -4.0F, 9.0F, 7.0F, 8.0F),
                PartPose.offset(0.0F, -0.6F, -2.0F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(107, 19).addBox(-1.25F, 0.0F, 0.0F, 2.5F, 4.5F, 2.5F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 5.5F, -0.9F, 0.0F, 0.0F));
        PartDefinition tail1 = tail.addOrReplaceChild("tail_1",
                CubeListBuilder.create()
                        .texOffs(116, 19).addBox(-1.25F, 0.0F, 0.0F, 2.5F, 4.5F, 2.5F),
                PartPose.offsetAndRotation(0.0F, 4.5F, 0.0F, -0.315F, 0.0F, 0.0F));
        PartDefinition haunchBr = body.addOrReplaceChild("haunch_br",
                CubeListBuilder.create()
                        .texOffs(93, 0).addBox(-2.0F, 0.0F, -2.5F, 4.0F, 5.0F, 5.0F),
                PartPose.offset(-2.9F, 6.05F, 3.25F));
        PartDefinition haunchBl = body.addOrReplaceChild("haunch_bl",
                CubeListBuilder.create()
                        .texOffs(0, 19).addBox(-2.0F, 0.0F, -2.5F, 4.0F, 5.0F, 5.0F),
                PartPose.offset(2.9F, 6.05F, 3.25F));
        PartDefinition mut1Ribs = body.addOrReplaceChild("mut1_ribs",
                CubeListBuilder.create()
                        .texOffs(34, 19).addBox(-2.5F, -2.5F, -0.72F, 5.0F, 5.0F, 1.8F),
                PartPose.offset(0.0F, 4.0F, 2.0F));
        PartDefinition mut1RibsFlapR = mut1Ribs.addOrReplaceChild("mut1_ribs_flap_r",
                CubeListBuilder.create()
                        .texOffs(49, 19).addBox(-2.75F, -2.5F, -1.0F, 2.75F, 5.0F, 1.6F),
                PartPose.offsetAndRotation(-2.5F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1RibsFlapL = mut1Ribs.addOrReplaceChild("mut1_ribs_flap_l",
                CubeListBuilder.create()
                        .texOffs(60, 19).addBox(0.0F, -2.5F, -1.0F, 2.75F, 5.0F, 1.6F),
                PartPose.offsetAndRotation(2.5F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1RibsStrand0 = mut1Ribs.addOrReplaceChild("mut1_ribs_strand0",
                CubeListBuilder.create()
                        .texOffs(7, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(-1.25F, -1.75F, -0.81F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1RibsStrand1 = mut1Ribs.addOrReplaceChild("mut1_ribs_strand1",
                CubeListBuilder.create()
                        .texOffs(12, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.0F, -0.81F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1RibsStrand2 = mut1Ribs.addOrReplaceChild("mut1_ribs_strand2",
                CubeListBuilder.create()
                        .texOffs(17, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.75F, 1.0F),
                PartPose.offsetAndRotation(1.25F, -0.25F, -0.81F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1RibsEyes = mut1Ribs.addOrReplaceChild("mut1_ribs_eyes",
                CubeListBuilder.create()
                        .texOffs(0, 43).addBox(-1.6F, -1.4F, -0.6F, 3.2F, 2.8F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.81F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -0.5F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(9, 43).addBox(-1.2F, -1.54F, -0.8F, 2.4F, 1.54F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -4.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(18, 43).addBox(-1.2F, -2.431F, -0.8F, 2.4F, 2.431F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -1.75F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(95, 37).addBox(-1.2F, -2.8F, -0.8F, 2.4F, 2.8F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.5F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(27, 43).addBox(-1.2F, -2.431F, -0.8F, 2.4F, 2.431F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 2.75F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP4 = mut1Plates.addOrReplaceChild("mut1_plates_p4",
                CubeListBuilder.create()
                        .texOffs(36, 43).addBox(-1.2F, -1.54F, -0.8F, 2.4F, 1.54F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 5.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(71, 19).addBox(-1.02F, 0.0F, -1.02F, 2.04F, 5.1F, 2.04F),
                PartPose.offsetAndRotation(-3.5F, 2.0F, -3.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(80, 19).addBox(-0.85F, 0.0F, -0.85F, 1.7F, 5.1F, 1.7F),
                PartPose.offsetAndRotation(0.0F, 5.1F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(45, 43).addBox(-1.19F, 0.0F, -0.765F, 2.38F, 1.87F, 1.53F),
                PartPose.offsetAndRotation(0.0F, 5.1F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(92, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(-0.935F, 1.87F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(97, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(102, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(107, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(-0.2975F, 1.87F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(112, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(117, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(122, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(0.34F, 1.87F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(0, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(5, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(10, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(0.9775F, 1.87F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(15, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(20, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(25, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.275F, 1.0F),
                PartPose.offsetAndRotation(-1.19F, 0.85F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(30, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1755F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.275F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(89, 19).addBox(-1.02F, 0.0F, -1.02F, 2.04F, 5.1F, 2.04F),
                PartPose.offsetAndRotation(3.5F, 2.0F, -3.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(98, 19).addBox(-0.85F, 0.0F, -0.85F, 1.7F, 5.1F, 1.7F),
                PartPose.offsetAndRotation(0.0F, 5.1F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(54, 43).addBox(-1.19F, 0.0F, -0.765F, 2.38F, 1.87F, 1.53F),
                PartPose.offsetAndRotation(0.0F, 5.1F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(35, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(-0.935F, 1.87F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(40, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(45, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(50, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(-0.2975F, 1.87F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(55, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(60, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(65, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(0.34F, 1.87F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(70, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(75, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(80, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(0.9775F, 1.87F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(85, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(90, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(95, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.275F, 1.0F),
                PartPose.offsetAndRotation(-1.19F, 0.85F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(100, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1755F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.275F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = body.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -0.5F, 4.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(30, 53).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(-2.4F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(63, 43).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(35, 53).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(72, 43).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(40, 53).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(2.4F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(81, 43).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(0, 30).addBox(-1.25F, 0.0F, -1.25F, 2.5F, 3.96F, 2.5F),
                PartPose.offset(-2.6F, 15.0F, -4.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(77, 37).addBox(-0.9F, 0.0F, -1.05F, 1.8F, 3.42F, 2.1F),
                PartPose.offset(0.0F, 3.96F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(11, 37).addBox(-1.25F, 0.0F, -1.65F, 2.5F, 1.62F, 3.1F),
                PartPose.offset(0.0F, 3.42F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(9, 30).addBox(-1.25F, 0.0F, -1.25F, 2.5F, 3.96F, 2.5F),
                PartPose.offset(2.6F, 15.0F, -4.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(86, 37).addBox(-0.9F, 0.0F, -1.05F, 1.8F, 3.42F, 2.1F),
                PartPose.offset(0.0F, 3.96F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(22, 37).addBox(-1.25F, 0.0F, -1.65F, 2.5F, 1.62F, 3.1F),
                PartPose.offset(0.0F, 3.42F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(18, 30).addBox(-1.25F, 0.0F, -1.25F, 2.5F, 3.6F, 2.5F),
                PartPose.offset(-2.6F, 15.0F, 4.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(27, 30).addBox(-0.9F, 0.0F, -1.05F, 1.8F, 3.78F, 2.1F),
                PartPose.offset(0.0F, 3.6F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(33, 37).addBox(-1.25F, 0.0F, -1.65F, 2.5F, 1.62F, 3.1F),
                PartPose.offset(0.0F, 3.78F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(36, 30).addBox(-1.25F, 0.0F, -1.25F, 2.5F, 3.6F, 2.5F),
                PartPose.offset(2.6F, 15.0F, 4.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(45, 30).addBox(-0.9F, 0.0F, -1.05F, 1.8F, 3.78F, 2.1F),
                PartPose.offset(0.0F, 3.6F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(44, 37).addBox(-1.25F, 0.0F, -1.65F, 2.5F, 1.62F, 3.1F),
                PartPose.offset(0.0F, 3.78F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedGoatLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-4.5F, 0.0F, -7.5F, 9.0F, 9.0F, 15.0F),
                PartPose.offset(0.0F, 5.0F, 0.0F));
        PartDefinition neck = body.addOrReplaceChild("neck",
                CubeListBuilder.create()
                        .texOffs(78, 0).addBox(-2.0F, -5.0F, -2.5F, 4.0F, 5.0F, 5.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, -6.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition head = neck.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(49, 0).addBox(-2.5F, 0.0F, -9.0F, 5.0F, 6.0F, 9.0F),
                PartPose.offset(0.0F, -5.0F, 0.0F));
        PartDefinition muzzle = head.addOrReplaceChild("muzzle",
                CubeListBuilder.create()
                        .texOffs(33, 44).addBox(-1.75F, 0.0F, -2.0F, 3.5F, 3.0F, 2.0F),
                PartPose.offset(0.0F, 3.2F, -9.0F));
        PartDefinition beard = head.addOrReplaceChild("beard",
                CubeListBuilder.create()
                        .texOffs(115, 35).addBox(-1.0F, 0.0F, -1.5F, 2.0F, 4.0F, 1.5F),
                PartPose.offset(0.0F, 5.5F, -8.5F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(79, 57).addBox(-3.5F, 0.0F, -0.5F, 3.5F, 1.5F, 1.0F),
                PartPose.offsetAndRotation(-2.6F, 1.2F, -3.0F, 0.0F, 0.0F, 1.2566F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(90, 57).addBox(0.0F, 0.0F, -0.5F, 3.5F, 1.5F, 1.0F),
                PartPose.offsetAndRotation(2.6F, 1.2F, -3.0F, 0.0F, 0.0F, -1.2566F));
        PartDefinition hornR = head.addOrReplaceChild("horn_r",
                CubeListBuilder.create()
                        .texOffs(18, 51).addBox(-3.0F, -1.0F, -1.0F, 3.0F, 1.5F, 1.5F),
                PartPose.offsetAndRotation(-2.5F, 1.0F, -7.5F, 0.0F, 0.0F, -1.6755F));
        PartDefinition hornL = head.addOrReplaceChild("horn_l",
                CubeListBuilder.create()
                        .texOffs(29, 51).addBox(0.0F, -1.0F, -1.0F, 3.0F, 1.5F, 1.5F),
                PartPose.offsetAndRotation(2.5F, 1.0F, -7.5F, 0.0F, 0.0F, 1.6755F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(46, 44).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(-1.45F, 1.8F, -8.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(57, 44).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(114, 62).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-1.45F, -0.36F, -8.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(68, 44).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(1.45F, 1.8F, -8.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(79, 44).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(0, 66).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(1.45F, -0.36F, -8.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(112, 57).addBox(-0.825F, -0.825F, -1.4025F, 1.65F, 1.65F, 1.4025F),
                PartPose.offsetAndRotation(-1.5F, -1.5F, -8.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(11, 66).addBox(-0.675F, -0.675F, -1.1475F, 1.35F, 1.35F, 1.1475F),
                PartPose.offsetAndRotation(1.7F, -1.92F, -8.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceSpare2 = face.addOrReplaceChild("face_spare2",
                CubeListBuilder.create()
                        .texOffs(16, 66).addBox(-0.6F, -0.6F, -1.02F, 1.2F, 1.2F, 1.02F),
                PartPose.offsetAndRotation(0.0F, -3.0F, -8.7F, 0.0F, 0.0F, -0.363F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(5, 51).addBox(-2.1F, -1.2F, -1.6F, 4.2F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 3.96F, -8.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(21, 66).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-1.7F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(14, 62).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(-0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(19, 62).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(26, 66).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(1.7F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(18, 44).addBox(-2.0F, 0.0F, -3.0F, 4.0F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 4.2F, -7.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(31, 66).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-1.6F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(24, 62).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(-0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(29, 62).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(36, 66).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(1.6F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(101, 57).addBox(-1.3F, -0.2F, -1.4F, 2.6F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1RootsR = head.addOrReplaceChild("mut1_roots_r",
                CubeListBuilder.create()
                        .texOffs(0, 44).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -3.0F, -0.4189F, 0.0F, -0.5236F));
        PartDefinition mut1RootsR1 = mut1RootsR.addOrReplaceChild("mut1_roots_r_1",
                CubeListBuilder.create()
                        .texOffs(121, 44).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut1RootsR2 = mut1RootsR1.addOrReplaceChild("mut1_roots_r_2",
                CubeListBuilder.create()
                        .texOffs(24, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut1RootsRB = mut1RootsR1.addOrReplaceChild("mut1_roots_r_b",
                CubeListBuilder.create()
                        .texOffs(29, 57).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, 0.8029F));
        PartDefinition mut1RootsRB1 = mut1RootsRB.addOrReplaceChild("mut1_roots_r_b_1",
                CubeListBuilder.create()
                        .texOffs(34, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, -0.4538F));
        PartDefinition mut1RootsL = head.addOrReplaceChild("mut1_roots_l",
                CubeListBuilder.create()
                        .texOffs(9, 44).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(2.0F, 0.0F, -3.0F, -0.4189F, 0.0F, 0.5236F));
        PartDefinition mut1RootsL1 = mut1RootsL.addOrReplaceChild("mut1_roots_l_1",
                CubeListBuilder.create()
                        .texOffs(0, 51).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut1RootsL2 = mut1RootsL1.addOrReplaceChild("mut1_roots_l_2",
                CubeListBuilder.create()
                        .texOffs(39, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut1RootsLB = mut1RootsL1.addOrReplaceChild("mut1_roots_l_b",
                CubeListBuilder.create()
                        .texOffs(44, 57).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, -0.8029F));
        PartDefinition mut1RootsLB1 = mut1RootsLB.addOrReplaceChild("mut1_roots_l_b_1",
                CubeListBuilder.create()
                        .texOffs(49, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, 0.4538F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(54, 57).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 5.0F, -6.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(34, 62).addBox(-0.528F, 0.0F, -0.5F, 1.056F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(39, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(44, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(49, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue5 = mut1Tongue4.addOrReplaceChild("mut1_tongue_5",
                CubeListBuilder.create()
                        .texOffs(54, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.8888F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0134F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue5.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(59, 62).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 2.5F, -7.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(90, 44).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(109, 51).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-2.2F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(119, 57).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(0, 62).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-0.7333F, 1.4876F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(101, 44).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(118, 51).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(0.7333F, -2.1919F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(7, 62).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(0, 57).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(2.2F, 1.742F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(112, 44).addBox(-0.75F, 0.0F, 0.0F, 1.5F, 3.0F, 1.5F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 7.5F, -1.4F, 0.0F, 0.0F));
        PartDefinition mut1Flank = body.addOrReplaceChild("mut1_flank",
                CubeListBuilder.create()
                        .texOffs(73, 25).addBox(-3.0F, -3.0F, -0.8F, 6.0F, 6.0F, 2.0F),
                PartPose.offset(0.0F, 4.0F, 2.0F));
        PartDefinition mut1FlankFlapR = mut1Flank.addOrReplaceChild("mut1_flank_flap_r",
                CubeListBuilder.create()
                        .texOffs(112, 25).addBox(-3.3F, -3.0F, -1.0F, 3.3F, 6.0F, 1.6F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1FlankFlapL = mut1Flank.addOrReplaceChild("mut1_flank_flap_l",
                CubeListBuilder.create()
                        .texOffs(0, 35).addBox(0.0F, -3.0F, -1.0F, 3.3F, 6.0F, 1.6F),
                PartPose.offsetAndRotation(3.0F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1FlankStrand0 = mut1Flank.addOrReplaceChild("mut1_flank_strand0",
                CubeListBuilder.create()
                        .texOffs(9, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(-1.5F, -2.1F, -0.9F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1FlankStrand1 = mut1Flank.addOrReplaceChild("mut1_flank_strand1",
                CubeListBuilder.create()
                        .texOffs(14, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.2F, -0.9F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1FlankStrand2 = mut1Flank.addOrReplaceChild("mut1_flank_strand2",
                CubeListBuilder.create()
                        .texOffs(19, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(1.5F, -0.3F, -0.9F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1FlankEyes = mut1Flank.addOrReplaceChild("mut1_flank_eyes",
                CubeListBuilder.create()
                        .texOffs(40, 51).addBox(-1.92F, -1.68F, -0.6F, 3.84F, 3.36F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(11, 35).addBox(-1.2F, 0.0F, -1.2F, 2.4F, 6.0F, 2.4F),
                PartPose.offsetAndRotation(-5.0F, 2.0F, -4.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(20, 35).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(51, 51).addBox(-1.4F, 0.0F, -0.9F, 2.8F, 2.2F, 1.8F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(64, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(-1.1F, 2.2F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(41, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(46, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(69, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(-0.35F, 2.2F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(51, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(56, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(74, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(0.4F, 2.2F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(61, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(66, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(79, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(1.15F, 2.2F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(71, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(76, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(84, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5F, 1.0F),
                PartPose.offsetAndRotation(-1.4F, 1.0F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(81, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3829F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.5F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(29, 35).addBox(-1.2F, 0.0F, -1.2F, 2.4F, 6.0F, 2.4F),
                PartPose.offsetAndRotation(5.0F, 2.0F, -4.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(38, 35).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(62, 51).addBox(-1.4F, 0.0F, -0.9F, 2.8F, 2.2F, 1.8F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(89, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(-1.1F, 2.2F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(86, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(91, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(94, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(-0.35F, 2.2F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(96, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(101, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(99, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(0.4F, 2.2F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(106, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(111, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(104, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6F, 1.0F),
                PartPose.offsetAndRotation(1.15F, 2.2F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(116, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4838F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(121, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.376F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4838F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(109, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5F, 1.0F),
                PartPose.offsetAndRotation(-1.4F, 1.0F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(0, 69).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3829F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.5F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = body.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 5.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(59, 57).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(73, 51).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(64, 57).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-1.0F, 0.0F, -0.2667F, -0.3142F, -0.1513F, -0.1745F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(82, 51).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(69, 57).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(1.0F, 0.0F, -0.2667F, -0.3142F, 0.1513F, 0.1745F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(91, 51).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(74, 57).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(3.0F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(100, 51).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(47, 25).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 5.72F, 3.0F),
                PartPose.offset(-3.0F, 11.0F, -5.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(90, 25).addBox(-1.15F, 0.0F, -1.3F, 2.3F, 4.94F, 2.6F),
                PartPose.offset(0.0F, 5.72F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(85, 35).addBox(-1.5F, 0.0F, -1.9F, 3.0F, 2.34F, 3.6F),
                PartPose.offset(0.0F, 4.94F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(60, 25).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 5.72F, 3.0F),
                PartPose.offset(3.0F, 11.0F, -5.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(101, 25).addBox(-1.15F, 0.0F, -1.3F, 2.3F, 4.94F, 2.6F),
                PartPose.offset(0.0F, 5.72F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(100, 35).addBox(-1.5F, 0.0F, -1.9F, 3.0F, 2.34F, 3.6F),
                PartPose.offset(0.0F, 4.94F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(97, 0).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 4.8F, 4.0F),
                PartPose.offset(-3.4F, 12.0F, 5.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(17, 25).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 5.04F, 3.6F),
                PartPose.offset(0.0F, 4.8F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(47, 35).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.16F, 4.6F),
                PartPose.offset(0.0F, 5.04F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(0, 25).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 4.8F, 4.0F),
                PartPose.offset(3.4F, 12.0F, 5.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(32, 25).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 5.04F, 3.6F),
                PartPose.offset(0.0F, 4.8F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(66, 35).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.16F, 4.6F),
                PartPose.offset(0.0F, 5.04F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedHareLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-3.0F, 0.0F, -5.0F, 6.0F, 6.0F, 10.0F),
                PartPose.offsetAndRotation(0.0F, 13.0F, 1.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(71, 0).addBox(-2.5F, 0.0F, -4.0F, 5.0F, 4.5F, 5.0F),
                PartPose.offsetAndRotation(0.0F, -3.0F, -5.0F, 0.1745F, 0.0F, 0.0F));
        PartDefinition nose = head.addOrReplaceChild("nose",
                CubeListBuilder.create()
                        .texOffs(20, 37).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 1.5F, 1.0F),
                PartPose.offset(0.0F, 2.4F, -4.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(19, 17).addBox(-1.0F, -6.0F, -0.5F, 2.0F, 6.5F, 1.0F),
                PartPose.offsetAndRotation(-1.7F, -0.4F, -1.2F, -0.1047F, -0.1396F, -0.2269F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(26, 17).addBox(-1.0F, -6.0F, -0.5F, 2.0F, 6.5F, 1.0F),
                PartPose.offsetAndRotation(1.7F, -0.4F, -1.2F, -0.1047F, 0.1396F, 0.2269F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(11, 26).addBox(-2.108F, -2.108F, -0.9F, 4.216F, 4.216F, 1.0F),
                PartPose.offsetAndRotation(-1.45F, 1.35F, -4.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(33, 17).addBox(-1.7F, -1.7F, -2.72F, 3.4F, 3.4F, 2.72F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(50, 41).addBox(-2.38F, -0.9F, -1.2F, 4.76F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-1.45F, -1.098F, -4.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(22, 26).addBox(-2.108F, -2.108F, -0.9F, 4.216F, 4.216F, 1.0F),
                PartPose.offsetAndRotation(1.45F, 1.35F, -4.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(46, 17).addBox(-1.7F, -1.7F, -2.72F, 3.4F, 3.4F, 2.72F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(63, 41).addBox(-2.38F, -0.9F, -1.2F, 4.76F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(1.45F, -1.098F, -4.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(13, 32).addBox(-0.935F, -0.935F, -1.5895F, 1.87F, 1.87F, 1.5895F),
                PartPose.offsetAndRotation(-1.5F, -1.125F, -4.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(27, 37).addBox(-0.765F, -0.765F, -1.3005F, 1.53F, 1.53F, 1.3005F),
                PartPose.offsetAndRotation(1.7F, -1.44F, -4.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceSpare2 = face.addOrReplaceChild("face_spare2",
                CubeListBuilder.create()
                        .texOffs(76, 41).addBox(-0.68F, -0.68F, -1.156F, 1.36F, 1.36F, 1.156F),
                PartPose.offsetAndRotation(0.0F, -2.25F, -4.7F, 0.0F, 0.0F, -0.363F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(0, 32).addBox(-2.1F, -1.2F, -1.6F, 4.2F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 2.97F, -4.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(81, 41).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-1.7F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(76, 37).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(-0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(81, 37).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(86, 41).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(1.7F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(113, 17).addBox(-2.0F, 0.0F, -3.0F, 4.0F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 3.15F, -3.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(91, 41).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-1.6F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(86, 37).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(-0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(91, 37).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(96, 41).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(1.6F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(0, 37).addBox(-1.3F, -0.2F, -1.4F, 2.6F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(94, 32).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, -4.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(111, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(116, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(121, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(0, 41).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue4.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(5, 41).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2Stalks = head.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -0.5F, -2.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(10, 41).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(40, 32).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(15, 41).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(-0.6667F, 0.0F, -0.2667F, -0.3142F, -0.1513F, -0.1745F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(49, 32).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(20, 41).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.6667F, 0.0F, -0.2667F, -0.3142F, 0.1513F, 0.1745F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(58, 32).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(25, 41).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(2.0F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(67, 32).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 1.0F, -5.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(34, 37).addBox(-1.1F, -1.1F, -1.364F, 2.2F, 2.2F, 1.364F)
                        .texOffs(76, 32).addBox(-1.364F, -1.364F, -0.66F, 2.728F, 2.728F, 0.88F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(41, 37).addBox(-0.769F, -0.769F, -0.9535F, 1.5379F, 1.5379F, 0.9535F)
                        .texOffs(48, 37).addBox(-0.9535F, -0.9535F, -0.4614F, 1.907F, 1.907F, 0.6152F),
                PartPose.offsetAndRotation(-0.6667F, 1.0819F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(55, 37).addBox(-1.0874F, -1.0874F, -1.3484F, 2.1748F, 2.1748F, 1.3484F)
                        .texOffs(85, 32).addBox(-1.3484F, -1.3484F, -0.6524F, 2.6967F, 2.6967F, 0.8699F),
                PartPose.offsetAndRotation(0.6667F, -1.5941F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(62, 37).addBox(-0.8636F, -0.8636F, -1.0709F, 1.7273F, 1.7273F, 1.0709F)
                        .texOffs(69, 37).addBox(-1.0709F, -1.0709F, -0.5182F, 2.1418F, 2.1418F, 0.6909F),
                PartPose.offsetAndRotation(2.0F, 1.2669F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(0, 26).addBox(-1.5F, 0.0F, 0.0F, 3.0F, 3.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 5.0F, -0.5F, 0.0F, 0.0F));
        PartDefinition haunchBr = body.addOrReplaceChild("haunch_br",
                CubeListBuilder.create()
                        .texOffs(33, 0).addBox(-1.5F, 0.0F, -3.0F, 3.0F, 5.0F, 6.0F),
                PartPose.offset(-2.6F, 1.0F, 3.0F));
        PartDefinition haunchBl = body.addOrReplaceChild("haunch_bl",
                CubeListBuilder.create()
                        .texOffs(52, 0).addBox(-1.5F, 0.0F, -3.0F, 3.0F, 5.0F, 6.0F),
                PartPose.offset(2.6F, 1.0F, 3.0F));
        PartDefinition mut1Ribs = body.addOrReplaceChild("mut1_ribs",
                CubeListBuilder.create()
                        .texOffs(55, 26).addBox(-2.0F, -1.75F, -0.56F, 4.0F, 3.5F, 1.4F),
                PartPose.offset(0.0F, 3.0F, 1.0F));
        PartDefinition mut1RibsFlapR = mut1Ribs.addOrReplaceChild("mut1_ribs_flap_r",
                CubeListBuilder.create()
                        .texOffs(95, 17).addBox(-2.2F, -1.75F, -1.0F, 2.2F, 3.5F, 1.6F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1RibsFlapL = mut1Ribs.addOrReplaceChild("mut1_ribs_flap_l",
                CubeListBuilder.create()
                        .texOffs(104, 17).addBox(0.0F, -1.75F, -1.0F, 2.2F, 3.5F, 1.6F),
                PartPose.offsetAndRotation(2.0F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1RibsStrand0 = mut1Ribs.addOrReplaceChild("mut1_ribs_strand0",
                CubeListBuilder.create()
                        .texOffs(96, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.925F, 1.0F),
                PartPose.offsetAndRotation(-1.0F, -1.225F, -0.63F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1RibsStrand1 = mut1Ribs.addOrReplaceChild("mut1_ribs_strand1",
                CubeListBuilder.create()
                        .texOffs(101, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.925F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -0.7F, -0.63F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1RibsStrand2 = mut1Ribs.addOrReplaceChild("mut1_ribs_strand2",
                CubeListBuilder.create()
                        .texOffs(106, 37).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.925F, 1.0F),
                PartPose.offsetAndRotation(1.0F, -0.175F, -0.63F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1RibsEyes = mut1Ribs.addOrReplaceChild("mut1_ribs_eyes",
                CubeListBuilder.create()
                        .texOffs(11, 37).addBox(-1.28F, -0.98F, -0.6F, 2.56F, 1.96F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.63F));
        PartDefinition mut2LegsR0 = body.addOrReplaceChild("mut2_legs_r0",
                CubeListBuilder.create()
                        .texOffs(84, 26).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 2.9167F, 1.8F),
                PartPose.offsetAndRotation(-3.0F, 3.0F, 1.0F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2LegsR01 = mut2LegsR0.addOrReplaceChild("mut2_legs_r0_1",
                CubeListBuilder.create()
                        .texOffs(99, 32).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 2.6087F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 2.9167F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR02 = mut2LegsR01.addOrReplaceChild("mut2_legs_r0_2",
                CubeListBuilder.create()
                        .texOffs(30, 41).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 2.3333F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 2.6087F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR1 = body.addOrReplaceChild("mut2_legs_r1",
                CubeListBuilder.create()
                        .texOffs(93, 26).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 2.9167F, 1.8F),
                PartPose.offsetAndRotation(-3.0F, 3.0F, 4.4F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2LegsR11 = mut2LegsR1.addOrReplaceChild("mut2_legs_r1_1",
                CubeListBuilder.create()
                        .texOffs(104, 32).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 2.6087F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 2.9167F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR12 = mut2LegsR11.addOrReplaceChild("mut2_legs_r1_2",
                CubeListBuilder.create()
                        .texOffs(35, 41).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 2.3333F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 2.6087F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsL0 = body.addOrReplaceChild("mut2_legs_l0",
                CubeListBuilder.create()
                        .texOffs(102, 26).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 2.9167F, 1.8F),
                PartPose.offsetAndRotation(3.0F, 3.0F, 1.0F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2LegsL01 = mut2LegsL0.addOrReplaceChild("mut2_legs_l0_1",
                CubeListBuilder.create()
                        .texOffs(109, 32).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 2.6087F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 2.9167F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL02 = mut2LegsL01.addOrReplaceChild("mut2_legs_l0_2",
                CubeListBuilder.create()
                        .texOffs(40, 41).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 2.3333F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 2.6087F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL1 = body.addOrReplaceChild("mut2_legs_l1",
                CubeListBuilder.create()
                        .texOffs(111, 26).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 2.9167F, 1.8F),
                PartPose.offsetAndRotation(3.0F, 3.0F, 4.4F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2LegsL11 = mut2LegsL1.addOrReplaceChild("mut2_legs_l1_1",
                CubeListBuilder.create()
                        .texOffs(114, 32).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 2.6087F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 2.9167F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL12 = mut2LegsL11.addOrReplaceChild("mut2_legs_l1_2",
                CubeListBuilder.create()
                        .texOffs(45, 41).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 2.3333F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 2.6087F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(59, 17).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 4.0F, 2.0F),
                PartPose.offset(-2.0F, 17.0F, -3.5F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(66, 26).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.0F, 1.8F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(33, 26).addBox(-1.0F, 0.0F, -1.6F, 2.0F, 1.5F, 2.6F),
                PartPose.offset(0.0F, 3.0F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(68, 17).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 4.0F, 2.0F),
                PartPose.offset(2.0F, 17.0F, -3.5F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(75, 26).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.0F, 1.8F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(44, 26).addBox(-1.0F, 0.0F, -1.6F, 2.0F, 1.5F, 2.6F),
                PartPose.offset(0.0F, 3.0F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(77, 17).addBox(-1.2F, 0.0F, -1.2F, 2.4F, 3.5F, 2.4F),
                PartPose.offset(-2.6F, 17.5F, 3.5F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(22, 32).addBox(-1.1F, 0.0F, -1.1F, 2.2F, 2.5F, 2.2F),
                PartPose.offsetAndRotation(0.0F, 3.5F, 0.0F, 0.5585F, 0.0F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(92, 0).addBox(-1.2F, 0.0F, -5.2F, 2.4F, 1.2F, 7.0F),
                PartPose.offsetAndRotation(0.0F, 2.5F, 0.0F, -0.5585F, 0.0F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(86, 17).addBox(-1.2F, 0.0F, -1.2F, 2.4F, 3.5F, 2.4F),
                PartPose.offset(2.6F, 17.5F, 3.5F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(31, 32).addBox(-1.1F, 0.0F, -1.1F, 2.2F, 2.5F, 2.2F),
                PartPose.offsetAndRotation(0.0F, 3.5F, 0.0F, 0.5585F, 0.0F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(0, 17).addBox(-1.2F, 0.0F, -5.2F, 2.4F, 1.2F, 7.0F),
                PartPose.offsetAndRotation(0.0F, 2.5F, 0.0F, -0.5585F, 0.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedFoxLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-3.0F, 0.0F, -6.0F, 6.0F, 5.0F, 12.0F),
                PartPose.offset(0.0F, 12.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(37, 0).addBox(-4.0F, 0.0F, -6.0F, 8.0F, 6.0F, 6.0F),
                PartPose.offsetAndRotation(0.0F, -2.0F, -6.0F, 0.1047F, 0.0F, 0.0F));
        PartDefinition muzzle = head.addOrReplaceChild("muzzle",
                CubeListBuilder.create()
                        .texOffs(87, 18).addBox(-1.5F, 0.0F, -4.0F, 3.0F, 2.5F, 4.0F),
                PartPose.offset(0.0F, 3.0F, -6.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(45, 37).addBox(-2.5F, 0.0F, -0.5F, 2.5F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(-3.2F, -1.4F, -2.0F, 0.0F, 0.0F, -0.1745F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(52, 37).addBox(0.0F, 0.0F, -0.5F, 2.5F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(3.2F, -1.4F, -2.0F, 0.0F, 0.0F, 0.1745F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(102, 18).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(-2.32F, 1.8F, -5.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(57, 18).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(95, 53).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-2.32F, -1.1952F, -5.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(115, 18).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(2.32F, 1.8F, -5.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(72, 18).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(110, 53).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(2.32F, -1.1952F, -5.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(33, 43).addBox(-1.144F, -1.144F, -1.9448F, 2.288F, 2.288F, 1.9448F),
                PartPose.offsetAndRotation(-2.4F, -1.5F, -5.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(42, 43).addBox(-0.936F, -0.936F, -1.5912F, 1.872F, 1.872F, 1.5912F),
                PartPose.offsetAndRotation(2.72F, -1.92F, -5.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(69, 37).addBox(-3.36F, -1.2F, -1.6F, 6.72F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 3.96F, -5.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(0, 57).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-2.72F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(111, 48).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(-1.36F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(116, 48).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.9F, 0.9F),
                PartPose.offset(0.0F, 0.4F, -0.9F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(121, 48).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(1.36F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceUt4 = faceMaw.addOrReplaceChild("face_ut4",
                CubeListBuilder.create()
                        .texOffs(5, 57).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(2.72F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(49, 30).addBox(-3.2F, 0.0F, -3.0F, 6.4F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 4.2F, -4.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(10, 57).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-2.56F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(0, 53).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(-1.28F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(5, 53).addBox(-0.4F, -1.7F, -0.4F, 0.8F, 1.7F, 0.8F),
                PartPose.offset(0.0F, 0.1F, -2.4F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(10, 53).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(1.28F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceLt4 = faceJaw.addOrReplaceChild("face_lt4",
                CubeListBuilder.create()
                        .texOffs(15, 57).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(2.56F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(68, 48).addBox(-2.08F, -0.2F, -1.4F, 4.16F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(18, 48).addBox(-0.55F, 0.0F, -0.5F, 1.1F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 4.0F, -6.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(30, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(35, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(40, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(45, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue4.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(50, 53).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 2.0F, -6.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(68, 30).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(87, 43).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-2.4F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(90, 48).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(97, 48).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-0.8F, 1.3524F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(79, 30).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(96, 43).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(0.8F, -1.9927F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(104, 48).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(105, 43).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(2.4F, 1.5837F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition mut2RootsR = head.addOrReplaceChild("mut2_roots_r",
                CubeListBuilder.create()
                        .texOffs(31, 30).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -3.0F, -0.4189F, 0.0F, -0.5236F));
        PartDefinition mut2RootsR1 = mut2RootsR.addOrReplaceChild("mut2_roots_r_1",
                CubeListBuilder.create()
                        .texOffs(59, 37).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsR2 = mut2RootsR1.addOrReplaceChild("mut2_roots_r_2",
                CubeListBuilder.create()
                        .texOffs(38, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsRB = mut2RootsR1.addOrReplaceChild("mut2_roots_r_b",
                CubeListBuilder.create()
                        .texOffs(43, 48).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, 0.8029F));
        PartDefinition mut2RootsRB1 = mut2RootsRB.addOrReplaceChild("mut2_roots_r_b_1",
                CubeListBuilder.create()
                        .texOffs(48, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, -0.4538F));
        PartDefinition mut2RootsL = head.addOrReplaceChild("mut2_roots_l",
                CubeListBuilder.create()
                        .texOffs(40, 30).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(2.0F, 0.0F, -3.0F, -0.4189F, 0.0F, 0.5236F));
        PartDefinition mut2RootsL1 = mut2RootsL.addOrReplaceChild("mut2_roots_l_1",
                CubeListBuilder.create()
                        .texOffs(64, 37).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsL2 = mut2RootsL1.addOrReplaceChild("mut2_roots_l_2",
                CubeListBuilder.create()
                        .texOffs(53, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsLB = mut2RootsL1.addOrReplaceChild("mut2_roots_l_b",
                CubeListBuilder.create()
                        .texOffs(58, 48).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, -0.8029F));
        PartDefinition mut2RootsLB1 = mut2RootsLB.addOrReplaceChild("mut2_roots_l_b_1",
                CubeListBuilder.create()
                        .texOffs(63, 48).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, 0.4538F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(66, 0).addBox(-2.5F, 0.0F, 0.0F, 5.0F, 5.5F, 5.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 6.0F, -0.1F, 0.0F, 0.0F));
        PartDefinition tail1 = tail.addOrReplaceChild("tail_1",
                CubeListBuilder.create()
                        .texOffs(87, 0).addBox(-2.5F, 0.0F, 0.0F, 5.0F, 5.5F, 5.0F),
                PartPose.offsetAndRotation(0.0F, 5.5F, 0.0F, -0.035F, 0.0F, 0.0F));
        PartDefinition haunchBr = body.addOrReplaceChild("haunch_br",
                CubeListBuilder.create()
                        .texOffs(108, 0).addBox(-2.0F, 0.0F, -3.0F, 4.0F, 5.0F, 6.0F),
                PartPose.offset(-2.7F, 3.15F, 3.1F));
        PartDefinition haunchBl = body.addOrReplaceChild("haunch_bl",
                CubeListBuilder.create()
                        .texOffs(0, 18).addBox(-2.0F, 0.0F, -3.0F, 4.0F, 5.0F, 6.0F),
                PartPose.offset(2.7F, 3.15F, 3.1F));
        PartDefinition mut1Flank = body.addOrReplaceChild("mut1_flank",
                CubeListBuilder.create()
                        .texOffs(0, 30).addBox(-2.25F, -2.0F, -0.8F, 4.5F, 4.0F, 2.0F),
                PartPose.offset(0.0F, 3.0F, 1.0F));
        PartDefinition mut1FlankFlapR = mut1Flank.addOrReplaceChild("mut1_flank_flap_r",
                CubeListBuilder.create()
                        .texOffs(13, 30).addBox(-2.475F, -2.0F, -1.0F, 2.475F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.25F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1FlankFlapL = mut1Flank.addOrReplaceChild("mut1_flank_flap_l",
                CubeListBuilder.create()
                        .texOffs(22, 30).addBox(0.0F, -2.0F, -1.0F, 2.475F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(2.25F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1FlankStrand0 = mut1Flank.addOrReplaceChild("mut1_flank_strand0",
                CubeListBuilder.create()
                        .texOffs(15, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(-1.125F, -1.4F, -0.9F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1FlankStrand1 = mut1Flank.addOrReplaceChild("mut1_flank_strand1",
                CubeListBuilder.create()
                        .texOffs(20, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -0.8F, -0.9F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1FlankStrand2 = mut1Flank.addOrReplaceChild("mut1_flank_strand2",
                CubeListBuilder.create()
                        .texOffs(25, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(1.125F, -0.2F, -0.9F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1FlankEyes = mut1Flank.addOrReplaceChild("mut1_flank_eyes",
                CubeListBuilder.create()
                        .texOffs(81, 48).addBox(-1.44F, -1.12F, -0.6F, 2.88F, 2.24F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(51, 43).addBox(-1.2F, -1.54F, -0.8F, 2.4F, 1.54F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -4.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(60, 43).addBox(-1.2F, -2.431F, -0.8F, 2.4F, 2.431F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -1.75F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(36, 37).addBox(-1.2F, -2.8F, -0.8F, 2.4F, 2.8F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.5F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(69, 43).addBox(-1.2F, -2.431F, -0.8F, 2.4F, 2.431F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 2.75F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP4 = mut1Plates.addOrReplaceChild("mut1_plates_p4",
                CubeListBuilder.create()
                        .texOffs(78, 43).addBox(-1.2F, -1.54F, -0.8F, 2.4F, 1.54F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 5.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(21, 18).addBox(-1.14F, 0.0F, -1.14F, 2.28F, 5.7F, 2.28F),
                PartPose.offsetAndRotation(-3.2F, 2.0F, -3.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(30, 18).addBox(-0.95F, 0.0F, -0.95F, 1.9F, 5.7F, 1.9F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(11, 43).addBox(-1.33F, 0.0F, -0.855F, 2.66F, 2.09F, 1.71F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(55, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-1.045F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(20, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(25, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(60, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-0.3325F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(30, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(35, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(65, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(0.38F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(40, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(45, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(70, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(1.0925F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(50, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(55, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(60, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.425F, 1.0F),
                PartPose.offsetAndRotation(-1.33F, 0.95F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(65, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3138F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.425F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(39, 18).addBox(-1.14F, 0.0F, -1.14F, 2.28F, 5.7F, 2.28F),
                PartPose.offsetAndRotation(3.2F, 2.0F, -3.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(48, 18).addBox(-0.95F, 0.0F, -0.95F, 1.9F, 5.7F, 1.9F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(22, 43).addBox(-1.33F, 0.0F, -0.855F, 2.66F, 2.09F, 1.71F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(75, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-1.045F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(70, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(75, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(80, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-0.3325F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(80, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(85, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(85, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(0.38F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(90, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(95, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(90, 53).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(1.0925F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(100, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(105, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(110, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.425F, 1.0F),
                PartPose.offsetAndRotation(-1.33F, 0.95F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(115, 57).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3138F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.425F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = body.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 4.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(23, 48).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-2.6F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(114, 43).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(28, 48).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(0, 48).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(33, 48).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(2.6F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(9, 48).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(90, 30).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 3.08F, 2.0F),
                PartPose.offset(-2.4F, 17.0F, -4.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(99, 30).addBox(-0.75F, 0.0F, -0.8F, 1.5F, 2.66F, 1.6F),
                PartPose.offset(0.0F, 3.08F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(88, 37).addBox(-1.0F, 0.0F, -1.4F, 2.0F, 1.26F, 2.6F),
                PartPose.offset(0.0F, 2.66F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(108, 30).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 3.08F, 2.0F),
                PartPose.offset(2.4F, 17.0F, -4.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(117, 30).addBox(-0.75F, 0.0F, -0.8F, 1.5F, 2.66F, 1.6F),
                PartPose.offset(0.0F, 3.08F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(99, 37).addBox(-1.0F, 0.0F, -1.4F, 2.0F, 1.26F, 2.6F),
                PartPose.offset(0.0F, 2.66F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(0, 37).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 2.8F, 2.0F),
                PartPose.offset(-2.4F, 17.0F, 4.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(9, 37).addBox(-0.75F, 0.0F, -0.8F, 1.5F, 2.94F, 1.6F),
                PartPose.offset(0.0F, 2.8F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(110, 37).addBox(-1.0F, 0.0F, -1.4F, 2.0F, 1.26F, 2.6F),
                PartPose.offset(0.0F, 2.94F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(18, 37).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 2.8F, 2.0F),
                PartPose.offset(2.4F, 17.0F, 4.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(27, 37).addBox(-0.75F, 0.0F, -0.8F, 1.5F, 2.94F, 1.6F),
                PartPose.offset(0.0F, 2.8F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(0, 43).addBox(-1.0F, 0.0F, -1.4F, 2.0F, 1.26F, 2.6F),
                PartPose.offset(0.0F, 2.94F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedCatLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-2.5F, 0.0F, -5.5F, 5.0F, 5.0F, 11.0F),
                PartPose.offset(0.0F, 12.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(33, 0).addBox(-2.5F, 0.0F, -5.0F, 5.0F, 4.5F, 5.0F),
                PartPose.offset(0.0F, -2.0F, -5.0F));
        PartDefinition muzzle = head.addOrReplaceChild("muzzle",
                CubeListBuilder.create()
                        .texOffs(0, 30).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 1.5F),
                PartPose.offset(0.0F, 2.4F, -5.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(50, 35).addBox(-2.0F, 0.0F, -0.5F, 2.0F, 2.5F, 1.0F),
                PartPose.offsetAndRotation(-1.8F, -0.5F, -1.5F, 0.0F, 0.0F, -0.1047F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(57, 35).addBox(0.0F, 0.0F, -0.5F, 2.0F, 2.5F, 1.0F),
                PartPose.offsetAndRotation(1.8F, -0.5F, -1.5F, 0.0F, 0.0F, 0.1047F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(118, 17).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(-1.45F, 1.35F, -4.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(0, 24).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(70, 40).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-1.45F, -0.81F, -4.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(11, 24).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(1.45F, 1.35F, -4.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(22, 24).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(81, 40).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(1.45F, -0.81F, -4.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(64, 35).addBox(-0.825F, -0.825F, -1.4025F, 1.65F, 1.65F, 1.4025F),
                PartPose.offsetAndRotation(-1.5F, -1.125F, -4.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(92, 40).addBox(-0.675F, -0.675F, -1.1475F, 1.35F, 1.35F, 1.1475F),
                PartPose.offsetAndRotation(1.7F, -1.44F, -4.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceSpare2 = face.addOrReplaceChild("face_spare2",
                CubeListBuilder.create()
                        .texOffs(97, 40).addBox(-0.6F, -0.6F, -1.02F, 1.2F, 1.2F, 1.02F),
                PartPose.offsetAndRotation(0.0F, -2.25F, -4.7F, 0.0F, 0.0F, -0.363F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(108, 24).addBox(-2.1F, -1.2F, -1.6F, 4.2F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 2.97F, -4.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(102, 40).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-1.7F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(92, 35).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(-0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(97, 35).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(107, 40).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(1.7F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(103, 17).addBox(-2.0F, 0.0F, -3.0F, 4.0F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 3.15F, -3.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(112, 40).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-1.6F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(102, 35).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(-0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(107, 35).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(117, 40).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(1.6F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(30, 35).addBox(-1.3F, -0.2F, -1.4F, 2.6F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(10, 35).addBox(-0.55F, 0.0F, -0.5F, 1.1F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, -5.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(0, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(5, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(10, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(15, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue5 = mut1Tongue4.addOrReplaceChild("mut1_tongue_5",
                CubeListBuilder.create()
                        .texOffs(20, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.8888F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0134F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue5.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(25, 40).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 1.5F, -5.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(77, 24).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(69, 30).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-2.4F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(71, 35).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(78, 35).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-0.8F, 1.3524F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(88, 24).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(78, 30).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(0.8F, -1.9927F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(85, 35).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(87, 30).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(2.4F, 1.5837F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(123, 30).addBox(-0.6F, 0.0F, 0.0F, 1.2F, 3.3333F, 1.2F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 5.5F, -1.1F, 0.0F, 0.0F));
        PartDefinition tail1 = tail.addOrReplaceChild("tail_1",
                CubeListBuilder.create()
                        .texOffs(0, 35).addBox(-0.6F, 0.0F, 0.0F, 1.2F, 3.3333F, 1.2F),
                PartPose.offsetAndRotation(0.0F, 3.3333F, 0.0F, -0.385F, 0.0F, 0.0F));
        PartDefinition tail2 = tail1.addOrReplaceChild("tail_2",
                CubeListBuilder.create()
                        .texOffs(5, 35).addBox(-0.6F, 0.0F, 0.0F, 1.2F, 3.3333F, 1.2F),
                PartPose.offsetAndRotation(0.0F, 3.3333F, 0.0F, -0.385F, 0.0F, 0.0F));
        PartDefinition haunchBr = body.addOrReplaceChild("haunch_br",
                CubeListBuilder.create()
                        .texOffs(54, 0).addBox(-1.75F, 0.0F, -2.5F, 3.5F, 4.5F, 5.0F),
                PartPose.offset(-2.5F, 2.55F, 3.25F));
        PartDefinition haunchBl = body.addOrReplaceChild("haunch_bl",
                CubeListBuilder.create()
                        .texOffs(73, 0).addBox(-1.75F, 0.0F, -2.5F, 3.5F, 4.5F, 5.0F),
                PartPose.offset(2.5F, 2.55F, 3.25F));
        PartDefinition mut1Flank = body.addOrReplaceChild("mut1_flank",
                CubeListBuilder.create()
                        .texOffs(0, 17).addBox(-2.0F, -1.75F, -0.8F, 4.0F, 3.5F, 2.0F),
                PartPose.offset(0.0F, 3.0F, 1.0F));
        PartDefinition mut1FlankFlapR = mut1Flank.addOrReplaceChild("mut1_flank_flap_r",
                CubeListBuilder.create()
                        .texOffs(85, 17).addBox(-2.2F, -1.75F, -1.0F, 2.2F, 3.5F, 1.6F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1FlankFlapL = mut1Flank.addOrReplaceChild("mut1_flank_flap_l",
                CubeListBuilder.create()
                        .texOffs(94, 17).addBox(0.0F, -1.75F, -1.0F, 2.2F, 3.5F, 1.6F),
                PartPose.offsetAndRotation(2.0F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1FlankStrand0 = mut1Flank.addOrReplaceChild("mut1_flank_strand0",
                CubeListBuilder.create()
                        .texOffs(112, 35).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.925F, 1.0F),
                PartPose.offsetAndRotation(-1.0F, -1.225F, -0.9F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1FlankStrand1 = mut1Flank.addOrReplaceChild("mut1_flank_strand1",
                CubeListBuilder.create()
                        .texOffs(117, 35).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.925F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -0.7F, -0.9F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1FlankStrand2 = mut1Flank.addOrReplaceChild("mut1_flank_strand2",
                CubeListBuilder.create()
                        .texOffs(122, 35).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.925F, 1.0F),
                PartPose.offsetAndRotation(1.0F, -0.175F, -0.9F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1FlankEyes = mut1Flank.addOrReplaceChild("mut1_flank_eyes",
                CubeListBuilder.create()
                        .texOffs(41, 35).addBox(-1.28F, -0.98F, -0.6F, 2.56F, 1.96F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(33, 30).addBox(-1.2F, -1.54F, -0.8F, 2.4F, 1.54F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -4.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(42, 30).addBox(-1.2F, -2.431F, -0.8F, 2.4F, 2.431F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -1.75F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(99, 24).addBox(-1.2F, -2.8F, -0.8F, 2.4F, 2.8F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.5F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(51, 30).addBox(-1.2F, -2.431F, -0.8F, 2.4F, 2.431F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 2.75F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP4 = mut1Plates.addOrReplaceChild("mut1_plates_p4",
                CubeListBuilder.create()
                        .texOffs(60, 30).addBox(-1.2F, -1.54F, -0.8F, 2.4F, 1.54F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 5.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(92, 0).addBox(-1.14F, 0.0F, -1.14F, 2.28F, 5.7F, 2.28F),
                PartPose.offsetAndRotation(-3.0F, 2.0F, -2.5F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(101, 0).addBox(-0.95F, 0.0F, -0.95F, 1.9F, 5.7F, 1.9F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(11, 30).addBox(-1.33F, 0.0F, -0.855F, 2.66F, 2.09F, 1.71F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(30, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-1.045F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(122, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(0, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(35, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-0.3325F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(5, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(10, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(40, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(0.38F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(15, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(20, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(45, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(1.0925F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(25, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(30, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(35, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.425F, 1.0F),
                PartPose.offsetAndRotation(-1.33F, 0.95F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(40, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3138F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.425F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(110, 0).addBox(-1.14F, 0.0F, -1.14F, 2.28F, 5.7F, 2.28F),
                PartPose.offsetAndRotation(3.0F, 2.0F, -2.5F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(119, 0).addBox(-0.95F, 0.0F, -0.95F, 1.9F, 5.7F, 1.9F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(22, 30).addBox(-1.33F, 0.0F, -0.855F, 2.66F, 2.09F, 1.71F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(50, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-1.045F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(45, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(50, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(55, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-0.3325F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(55, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(60, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(60, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(0.38F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(65, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(70, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(65, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(1.0925F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(75, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(80, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(85, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.425F, 1.0F),
                PartPose.offsetAndRotation(-1.33F, 0.95F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(90, 44).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3138F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.425F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = body.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 4.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(15, 35).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-2.6F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(96, 30).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(20, 35).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(105, 30).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(25, 35).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(2.6F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(114, 30).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(13, 17).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 4.4F, 2.0F),
                PartPose.offset(-1.8F, 14.0F, -4.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(22, 17).addBox(-0.75F, 0.0F, -0.8F, 1.5F, 3.8F, 1.6F),
                PartPose.offset(0.0F, 4.4F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(33, 24).addBox(-1.0F, 0.0F, -1.4F, 2.0F, 1.8F, 2.6F),
                PartPose.offset(0.0F, 3.8F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(31, 17).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 4.4F, 2.0F),
                PartPose.offset(1.8F, 14.0F, -4.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(40, 17).addBox(-0.75F, 0.0F, -0.8F, 1.5F, 3.8F, 1.6F),
                PartPose.offset(0.0F, 4.4F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(44, 24).addBox(-1.0F, 0.0F, -1.4F, 2.0F, 1.8F, 2.6F),
                PartPose.offset(0.0F, 3.8F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(49, 17).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 3.6F, 2.0F),
                PartPose.offset(-2.2F, 15.0F, 4.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(58, 17).addBox(-0.75F, 0.0F, -0.8F, 1.5F, 3.78F, 1.6F),
                PartPose.offset(0.0F, 3.6F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(55, 24).addBox(-1.0F, 0.0F, -1.4F, 2.0F, 1.62F, 2.6F),
                PartPose.offset(0.0F, 3.78F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(67, 17).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 3.6F, 2.0F),
                PartPose.offset(2.2F, 15.0F, 4.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(76, 17).addBox(-0.75F, 0.0F, -0.8F, 1.5F, 3.78F, 1.6F),
                PartPose.offset(0.0F, 3.6F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(66, 24).addBox(-1.0F, 0.0F, -1.4F, 2.0F, 1.62F, 2.6F),
                PartPose.offset(0.0F, 3.78F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedHorseLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-5.0F, 0.0F, -11.0F, 10.0F, 11.0F, 22.0F),
                PartPose.offset(0.0F, 3.0F, 0.0F));
        PartDefinition neck = body.addOrReplaceChild("neck",
                CubeListBuilder.create()
                        .texOffs(65, 0).addBox(-2.5F, -12.0F, -3.5F, 5.0F, 12.0F, 7.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, -8.0F, -0.6632F, 0.0F, 0.0F));
        PartDefinition head = neck.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(90, 0).addBox(-2.5F, 0.0F, -10.0F, 5.0F, 6.0F, 10.0F),
                PartPose.offsetAndRotation(0.0F, -12.0F, 0.0F, 0.2443F, 0.0F, 0.0F));
        PartDefinition muzzle = head.addOrReplaceChild("muzzle",
                CubeListBuilder.create()
                        .texOffs(74, 57).addBox(-2.0F, 0.0F, -3.0F, 4.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 2.6F, -10.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(18, 78).addBox(-1.5F, 0.0F, -0.5F, 1.5F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-2.0F, -1.5F, -3.0F, 0.0F, 0.0F, -0.2443F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(25, 78).addBox(0.0F, 0.0F, -0.5F, 1.5F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(2.0F, -1.5F, -3.0F, 0.0F, 0.0F, 0.2443F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(0, 66).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(-1.45F, 1.8F, -9.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(11, 66).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(5, 87).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-1.45F, -0.36F, -9.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(22, 66).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(1.45F, 1.8F, -9.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(33, 66).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(16, 87).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(1.45F, -0.36F, -9.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(11, 83).addBox(-0.825F, -0.825F, -1.4025F, 1.65F, 1.65F, 1.4025F),
                PartPose.offsetAndRotation(-1.5F, -1.5F, -9.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(27, 87).addBox(-0.675F, -0.675F, -1.1475F, 1.35F, 1.35F, 1.1475F),
                PartPose.offsetAndRotation(1.7F, -1.92F, -9.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(20, 72).addBox(-2.1F, -1.2F, -1.6F, 4.2F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 3.96F, -9.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(32, 87).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-1.7F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(39, 83).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(-0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(44, 83).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(37, 87).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(1.7F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(107, 57).addBox(-2.0F, 0.0F, -3.0F, 4.0F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 4.2F, -8.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(42, 87).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-1.6F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(49, 83).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(-0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(54, 83).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(47, 87).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(1.6F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(0, 83).addBox(-1.3F, -0.2F, -1.4F, 2.6F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(32, 78).addBox(-0.55F, 0.0F, -0.5F, 1.1F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, -11.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(59, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(64, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(69, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(74, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue5 = mut1Tongue4.addOrReplaceChild("mut1_tongue_5",
                CubeListBuilder.create()
                        .texOffs(79, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.8888F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0134F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue6 = mut1Tongue5.addOrReplaceChild("mut1_tongue_6",
                CubeListBuilder.create()
                        .texOffs(84, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.7718F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.8888F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue6.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(89, 83).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 2.0F, -11.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(55, 66).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(91, 72).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-2.4F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(18, 83).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(25, 83).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-0.8F, 1.3524F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(66, 66).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(100, 72).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(0.8F, -1.9927F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(32, 83).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(109, 72).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(2.4F, 1.5837F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition mut2RootsR = head.addOrReplaceChild("mut2_roots_r",
                CubeListBuilder.create()
                        .texOffs(89, 57).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -3.0F, -0.4189F, 0.0F, -0.5236F));
        PartDefinition mut2RootsR1 = mut2RootsR.addOrReplaceChild("mut2_roots_r_1",
                CubeListBuilder.create()
                        .texOffs(10, 72).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsR2 = mut2RootsR1.addOrReplaceChild("mut2_roots_r_2",
                CubeListBuilder.create()
                        .texOffs(52, 78).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsRB = mut2RootsR1.addOrReplaceChild("mut2_roots_r_b",
                CubeListBuilder.create()
                        .texOffs(57, 78).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, 0.8029F));
        PartDefinition mut2RootsRB1 = mut2RootsRB.addOrReplaceChild("mut2_roots_r_b_1",
                CubeListBuilder.create()
                        .texOffs(62, 78).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, -0.4538F));
        PartDefinition mut2RootsL = head.addOrReplaceChild("mut2_roots_l",
                CubeListBuilder.create()
                        .texOffs(98, 57).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(2.0F, 0.0F, -3.0F, -0.4189F, 0.0F, 0.5236F));
        PartDefinition mut2RootsL1 = mut2RootsL.addOrReplaceChild("mut2_roots_l_1",
                CubeListBuilder.create()
                        .texOffs(15, 72).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsL2 = mut2RootsL1.addOrReplaceChild("mut2_roots_l_2",
                CubeListBuilder.create()
                        .texOffs(67, 78).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsLB = mut2RootsL1.addOrReplaceChild("mut2_roots_l_b",
                CubeListBuilder.create()
                        .texOffs(72, 78).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, -0.8029F));
        PartDefinition mut2RootsLB1 = mut2RootsLB.addOrReplaceChild("mut2_roots_l_b_1",
                CubeListBuilder.create()
                        .texOffs(77, 78).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, 0.4538F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(34, 46).addBox(-1.5F, 0.0F, 0.0F, 3.0F, 6.5F, 3.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 11.0F, -0.4F, 0.0F, 0.0F));
        PartDefinition tail1 = tail.addOrReplaceChild("tail_1",
                CubeListBuilder.create()
                        .texOffs(47, 46).addBox(-1.5F, 0.0F, 0.0F, 3.0F, 6.5F, 3.0F),
                PartPose.offsetAndRotation(0.0F, 6.5F, 0.0F, -0.14F, 0.0F, 0.0F));
        PartDefinition mut1Flank = body.addOrReplaceChild("mut1_flank",
                CubeListBuilder.create()
                        .texOffs(15, 46).addBox(-3.5F, -3.5F, -0.8F, 7.0F, 7.0F, 2.0F),
                PartPose.offset(0.0F, 6.0F, 1.0F));
        PartDefinition mut1FlankFlapR = mut1Flank.addOrReplaceChild("mut1_flank_flap_r",
                CubeListBuilder.create()
                        .texOffs(60, 46).addBox(-3.85F, -3.5F, -1.0F, 3.85F, 7.0F, 1.6F),
                PartPose.offsetAndRotation(-3.5F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1FlankFlapL = mut1Flank.addOrReplaceChild("mut1_flank_flap_l",
                CubeListBuilder.create()
                        .texOffs(73, 46).addBox(0.0F, -3.5F, -1.0F, 3.85F, 7.0F, 1.6F),
                PartPose.offsetAndRotation(3.5F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1FlankStrand0 = mut1Flank.addOrReplaceChild("mut1_flank_strand0",
                CubeListBuilder.create()
                        .texOffs(122, 66).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.85F, 1.0F),
                PartPose.offsetAndRotation(-1.75F, -2.45F, -0.9F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1FlankStrand1 = mut1Flank.addOrReplaceChild("mut1_flank_strand1",
                CubeListBuilder.create()
                        .texOffs(0, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.85F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.4F, -0.9F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1FlankStrand2 = mut1Flank.addOrReplaceChild("mut1_flank_strand2",
                CubeListBuilder.create()
                        .texOffs(5, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.85F, 1.0F),
                PartPose.offsetAndRotation(1.75F, -0.35F, -0.9F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1FlankEyes = mut1Flank.addOrReplaceChild("mut1_flank_eyes",
                CubeListBuilder.create()
                        .texOffs(44, 66).addBox(-2.24F, -1.96F, -0.6F, 4.48F, 3.92F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(55, 72).addBox(-1.2F, -1.54F, -0.8F, 2.4F, 1.54F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -4.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(64, 72).addBox(-1.2F, -2.431F, -0.8F, 2.4F, 2.431F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -1.75F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(77, 66).addBox(-1.2F, -2.8F, -0.8F, 2.4F, 2.8F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.5F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(73, 72).addBox(-1.2F, -2.431F, -0.8F, 2.4F, 2.431F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 2.75F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP4 = mut1Plates.addOrReplaceChild("mut1_plates_p4",
                CubeListBuilder.create()
                        .texOffs(82, 72).addBox(-1.2F, -1.54F, -0.8F, 2.4F, 1.54F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 5.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(38, 57).addBox(-1.14F, 0.0F, -1.14F, 2.28F, 5.7F, 2.28F),
                PartPose.offsetAndRotation(-5.5F, 3.0F, -6.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(47, 57).addBox(-0.95F, 0.0F, -0.95F, 1.9F, 5.7F, 1.9F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(33, 72).addBox(-1.33F, 0.0F, -0.855F, 2.66F, 2.09F, 1.71F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(94, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-1.045F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(52, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(57, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(99, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-0.3325F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(62, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(67, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(104, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(0.38F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(72, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(77, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(109, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(1.0925F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(82, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(87, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(92, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.425F, 1.0F),
                PartPose.offsetAndRotation(-1.33F, 0.95F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(97, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3138F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.425F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(56, 57).addBox(-1.14F, 0.0F, -1.14F, 2.28F, 5.7F, 2.28F),
                PartPose.offsetAndRotation(5.5F, 3.0F, -6.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(65, 57).addBox(-0.95F, 0.0F, -0.95F, 1.9F, 5.7F, 1.9F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(44, 72).addBox(-1.33F, 0.0F, -0.855F, 2.66F, 2.09F, 1.71F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(114, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-1.045F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(102, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(107, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(119, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-0.3325F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(112, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(117, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(124, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(0.38F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(122, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(0, 91).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(0, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(1.0925F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(5, 91).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(10, 91).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(15, 91).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.425F, 1.0F),
                PartPose.offsetAndRotation(-1.33F, 0.95F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(20, 91).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3138F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.425F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = body.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 4.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(37, 78).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-2.6F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(118, 72).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(42, 78).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(0, 78).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(47, 78).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(2.6F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(9, 78).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2LegsR0 = body.addOrReplaceChild("mut2_legs_r0",
                CubeListBuilder.create()
                        .texOffs(86, 66).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.3333F, 1.8F),
                PartPose.offsetAndRotation(-5.0F, 8.0F, 2.0F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2LegsR01 = mut2LegsR0.addOrReplaceChild("mut2_legs_r0_1",
                CubeListBuilder.create()
                        .texOffs(82, 78).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 2.9814F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.3333F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR02 = mut2LegsR01.addOrReplaceChild("mut2_legs_r0_2",
                CubeListBuilder.create()
                        .texOffs(87, 78).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 2.6667F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 2.9814F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR1 = body.addOrReplaceChild("mut2_legs_r1",
                CubeListBuilder.create()
                        .texOffs(95, 66).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.3333F, 1.8F),
                PartPose.offsetAndRotation(-5.0F, 8.0F, 5.4F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2LegsR11 = mut2LegsR1.addOrReplaceChild("mut2_legs_r1_1",
                CubeListBuilder.create()
                        .texOffs(92, 78).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 2.9814F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.3333F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR12 = mut2LegsR11.addOrReplaceChild("mut2_legs_r1_2",
                CubeListBuilder.create()
                        .texOffs(97, 78).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 2.6667F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 2.9814F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsL0 = body.addOrReplaceChild("mut2_legs_l0",
                CubeListBuilder.create()
                        .texOffs(104, 66).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.3333F, 1.8F),
                PartPose.offsetAndRotation(5.0F, 8.0F, 2.0F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2LegsL01 = mut2LegsL0.addOrReplaceChild("mut2_legs_l0_1",
                CubeListBuilder.create()
                        .texOffs(102, 78).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 2.9814F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.3333F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL02 = mut2LegsL01.addOrReplaceChild("mut2_legs_l0_2",
                CubeListBuilder.create()
                        .texOffs(107, 78).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 2.6667F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 2.9814F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL1 = body.addOrReplaceChild("mut2_legs_l1",
                CubeListBuilder.create()
                        .texOffs(113, 66).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.3333F, 1.8F),
                PartPose.offsetAndRotation(5.0F, 8.0F, 5.4F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2LegsL11 = mut2LegsL1.addOrReplaceChild("mut2_legs_l1_1",
                CubeListBuilder.create()
                        .texOffs(112, 78).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 2.9814F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.3333F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL12 = mut2LegsL11.addOrReplaceChild("mut2_legs_l1_2",
                CubeListBuilder.create()
                        .texOffs(117, 78).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 2.6667F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 2.9814F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(0, 34).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 7.48F, 4.0F),
                PartPose.offset(-4.0F, 7.0F, -8.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(102, 34).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 6.46F, 3.6F),
                PartPose.offset(0.0F, 7.48F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(86, 46).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 3.06F, 4.6F),
                PartPose.offset(0.0F, 6.46F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(17, 34).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 7.48F, 4.0F),
                PartPose.offset(4.0F, 7.0F, -8.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(0, 46).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 6.46F, 3.6F),
                PartPose.offset(0.0F, 7.48F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(105, 46).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 3.06F, 4.6F),
                PartPose.offset(0.0F, 6.46F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(34, 34).addBox(-2.25F, 0.0F, -2.25F, 4.5F, 6.8F, 4.5F),
                PartPose.offset(-4.0F, 7.0F, 8.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(51, 34).addBox(-1.9F, 0.0F, -2.05F, 3.8F, 7.14F, 4.1F),
                PartPose.offset(0.0F, 6.8F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(0, 57).addBox(-2.25F, 0.0F, -2.65F, 4.5F, 3.06F, 5.1F),
                PartPose.offset(0.0F, 7.14F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(68, 34).addBox(-2.25F, 0.0F, -2.25F, 4.5F, 6.8F, 4.5F),
                PartPose.offset(4.0F, 7.0F, 8.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(85, 34).addBox(-1.9F, 0.0F, -2.05F, 3.8F, 7.14F, 4.1F),
                PartPose.offset(0.0F, 6.8F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(19, 57).addBox(-2.25F, 0.0F, -2.65F, 4.5F, 3.06F, 5.1F),
                PartPose.offset(0.0F, 7.14F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedLlamaLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-4.5F, 0.0F, -8.0F, 9.0F, 12.0F, 16.0F),
                PartPose.offset(0.0F, 3.0F, 0.0F));
        PartDefinition neck = body.addOrReplaceChild("neck",
                CubeListBuilder.create()
                        .texOffs(51, 0).addBox(-2.25F, -15.0F, -2.5F, 4.5F, 15.0F, 5.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, -6.0F, -0.2094F, 0.0F, 0.0F));
        PartDefinition head = neck.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(70, 0).addBox(-2.0F, 0.0F, -9.0F, 4.0F, 5.0F, 9.0F),
                PartPose.offsetAndRotation(0.0F, -15.0F, 0.0F, 0.1396F, 0.0F, 0.0F));
        PartDefinition muzzle = head.addOrReplaceChild("muzzle",
                CubeListBuilder.create()
                        .texOffs(10, 57).addBox(-1.5F, 0.0F, -2.0F, 3.0F, 2.5F, 2.0F),
                PartPose.offset(0.0F, 2.6F, -9.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(115, 50).addBox(-1.5F, 0.0F, -0.5F, 1.5F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(-1.6F, -1.5F, -2.0F, 0.0F, 0.0F, -0.1571F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(122, 50).addBox(0.0F, 0.0F, -0.5F, 1.5F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(1.6F, -1.5F, -2.0F, 0.0F, 0.0F, 0.1571F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(40, 50).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(-1.16F, 1.5F, -8.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(51, 50).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(85, 68).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-1.16F, -0.66F, -8.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(62, 50).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(1.16F, 1.5F, -8.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(73, 50).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(96, 68).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(1.16F, -0.66F, -8.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(101, 63).addBox(-0.825F, -0.825F, -1.4025F, 1.65F, 1.65F, 1.4025F),
                PartPose.offsetAndRotation(-1.2F, -1.25F, -8.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(107, 68).addBox(-0.675F, -0.675F, -1.1475F, 1.35F, 1.35F, 1.1475F),
                PartPose.offsetAndRotation(1.36F, -1.6F, -8.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(21, 57).addBox(-1.68F, -1.2F, -1.6F, 3.36F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 3.3F, -8.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(112, 68).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-1.36F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(0, 68).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(-0.4533F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(5, 68).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(0.4533F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(117, 68).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(1.36F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(27, 50).addBox(-1.6F, 0.0F, -3.0F, 3.2F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 3.5F, -7.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(122, 68).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-1.28F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(10, 68).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(-0.4267F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(15, 68).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(0.4267F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(0, 72).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(1.28F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(92, 63).addBox(-1.04F, -0.2F, -1.4F, 2.08F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(42, 63).addBox(-0.55F, 0.0F, -0.5F, 1.1F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0F, -9.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(20, 68).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(25, 68).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(30, 68).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(35, 68).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue4.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(40, 68).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -2.0F, -9.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(84, 50).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(101, 57).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-2.4F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(108, 63).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(115, 63).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-0.8F, 1.3524F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(95, 50).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(110, 57).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(0.8F, -1.9927F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(122, 63).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(119, 57).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(2.4F, 1.5837F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition mut2RootsR = head.addOrReplaceChild("mut2_roots_r",
                CubeListBuilder.create()
                        .texOffs(9, 50).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -3.0F, -0.4189F, 0.0F, -0.5236F));
        PartDefinition mut2RootsR1 = mut2RootsR.addOrReplaceChild("mut2_roots_r_1",
                CubeListBuilder.create()
                        .texOffs(0, 57).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsR2 = mut2RootsR1.addOrReplaceChild("mut2_roots_r_2",
                CubeListBuilder.create()
                        .texOffs(62, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsRB = mut2RootsR1.addOrReplaceChild("mut2_roots_r_b",
                CubeListBuilder.create()
                        .texOffs(67, 63).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, 0.8029F));
        PartDefinition mut2RootsRB1 = mut2RootsRB.addOrReplaceChild("mut2_roots_r_b_1",
                CubeListBuilder.create()
                        .texOffs(72, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, -0.4538F));
        PartDefinition mut2RootsL = head.addOrReplaceChild("mut2_roots_l",
                CubeListBuilder.create()
                        .texOffs(18, 50).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(2.0F, 0.0F, -3.0F, -0.4189F, 0.0F, 0.5236F));
        PartDefinition mut2RootsL1 = mut2RootsL.addOrReplaceChild("mut2_roots_l_1",
                CubeListBuilder.create()
                        .texOffs(5, 57).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsL2 = mut2RootsL1.addOrReplaceChild("mut2_roots_l_2",
                CubeListBuilder.create()
                        .texOffs(77, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsLB = mut2RootsL1.addOrReplaceChild("mut2_roots_l_b",
                CubeListBuilder.create()
                        .texOffs(82, 63).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, -0.8029F));
        PartDefinition mut2RootsLB1 = mut2RootsLB.addOrReplaceChild("mut2_roots_l_b_1",
                CubeListBuilder.create()
                        .texOffs(87, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, 0.4538F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(0, 50).addBox(-1.0F, 0.0F, 0.0F, 2.0F, 4.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 8.0F, -0.6F, 0.0F, 0.0F));
        PartDefinition mut1Flank = body.addOrReplaceChild("mut1_flank",
                CubeListBuilder.create()
                        .texOffs(103, 29).addBox(-2.75F, -3.0F, -0.8F, 5.5F, 6.0F, 2.0F),
                PartPose.offset(0.0F, 5.0F, 1.0F));
        PartDefinition mut1FlankFlapR = mut1Flank.addOrReplaceChild("mut1_flank_flap_r",
                CubeListBuilder.create()
                        .texOffs(0, 41).addBox(-3.025F, -3.0F, -1.0F, 3.025F, 6.0F, 1.6F),
                PartPose.offsetAndRotation(-2.75F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1FlankFlapL = mut1Flank.addOrReplaceChild("mut1_flank_flap_l",
                CubeListBuilder.create()
                        .texOffs(11, 41).addBox(0.0F, -3.0F, -1.0F, 3.025F, 6.0F, 1.6F),
                PartPose.offsetAndRotation(2.75F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1FlankStrand0 = mut1Flank.addOrReplaceChild("mut1_flank_strand0",
                CubeListBuilder.create()
                        .texOffs(27, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(-1.375F, -2.1F, -0.9F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1FlankStrand1 = mut1Flank.addOrReplaceChild("mut1_flank_strand1",
                CubeListBuilder.create()
                        .texOffs(32, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.2F, -0.9F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1FlankStrand2 = mut1Flank.addOrReplaceChild("mut1_flank_strand2",
                CubeListBuilder.create()
                        .texOffs(37, 63).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(1.375F, -0.3F, -0.9F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1FlankEyes = mut1Flank.addOrReplaceChild("mut1_flank_eyes",
                CubeListBuilder.create()
                        .texOffs(32, 57).addBox(-1.76F, -1.68F, -0.6F, 3.52F, 3.36F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(65, 57).addBox(-1.2F, -1.54F, -0.8F, 2.4F, 1.54F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -4.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(74, 57).addBox(-1.2F, -2.431F, -0.8F, 2.4F, 2.431F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -1.75F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(106, 50).addBox(-1.2F, -2.8F, -0.8F, 2.4F, 2.8F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.5F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(83, 57).addBox(-1.2F, -2.431F, -0.8F, 2.4F, 2.431F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 2.75F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP4 = mut1Plates.addOrReplaceChild("mut1_plates_p4",
                CubeListBuilder.create()
                        .texOffs(92, 57).addBox(-1.2F, -1.54F, -0.8F, 2.4F, 1.54F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 5.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(22, 41).addBox(-1.14F, 0.0F, -1.14F, 2.28F, 5.7F, 2.28F),
                PartPose.offsetAndRotation(-4.5F, 2.0F, -5.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(31, 41).addBox(-0.95F, 0.0F, -0.95F, 1.9F, 5.7F, 1.9F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(43, 57).addBox(-1.33F, 0.0F, -0.855F, 2.66F, 2.09F, 1.71F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(45, 68).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-1.045F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(5, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(10, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(50, 68).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-0.3325F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(15, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(20, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(55, 68).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(0.38F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(25, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(30, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(60, 68).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(1.0925F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(35, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(40, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(45, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.425F, 1.0F),
                PartPose.offsetAndRotation(-1.33F, 0.95F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(50, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3138F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.425F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(40, 41).addBox(-1.14F, 0.0F, -1.14F, 2.28F, 5.7F, 2.28F),
                PartPose.offsetAndRotation(4.5F, 2.0F, -5.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(49, 41).addBox(-0.95F, 0.0F, -0.95F, 1.9F, 5.7F, 1.9F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(54, 57).addBox(-1.33F, 0.0F, -0.855F, 2.66F, 2.09F, 1.71F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(65, 68).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-1.045F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(55, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(60, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(70, 68).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-0.3325F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(65, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(70, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(75, 68).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(0.38F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(75, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(80, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(80, 68).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(1.0925F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(85, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(90, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(95, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.425F, 1.0F),
                PartPose.offsetAndRotation(-1.33F, 0.95F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(100, 72).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3138F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.425F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = body.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 4.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(47, 63).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-2.6F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(0, 63).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(52, 63).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(9, 63).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(57, 63).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(2.6F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(18, 63).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(97, 0).addBox(-1.75F, 0.0F, -1.75F, 3.5F, 6.6F, 3.5F),
                PartPose.offset(-3.2F, 9.0F, -6.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(51, 29).addBox(-1.4F, 0.0F, -1.55F, 2.8F, 5.7F, 3.1F),
                PartPose.offset(0.0F, 6.6F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(58, 41).addBox(-1.75F, 0.0F, -2.15F, 3.5F, 2.7F, 4.1F),
                PartPose.offset(0.0F, 5.7F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(0, 29).addBox(-1.75F, 0.0F, -1.75F, 3.5F, 6.6F, 3.5F),
                PartPose.offset(3.2F, 9.0F, -6.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(64, 29).addBox(-1.4F, 0.0F, -1.55F, 2.8F, 5.7F, 3.1F),
                PartPose.offset(0.0F, 6.6F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(75, 41).addBox(-1.75F, 0.0F, -2.15F, 3.5F, 2.7F, 4.1F),
                PartPose.offset(0.0F, 5.7F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(17, 29).addBox(-1.75F, 0.0F, -1.75F, 3.5F, 6.0F, 3.5F),
                PartPose.offset(-3.2F, 9.0F, 6.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(77, 29).addBox(-1.4F, 0.0F, -1.55F, 2.8F, 6.3F, 3.1F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(92, 41).addBox(-1.75F, 0.0F, -2.15F, 3.5F, 2.7F, 4.1F),
                PartPose.offset(0.0F, 6.3F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(34, 29).addBox(-1.75F, 0.0F, -1.75F, 3.5F, 6.0F, 3.5F),
                PartPose.offset(3.2F, 9.0F, 6.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(90, 29).addBox(-1.4F, 0.0F, -1.55F, 2.8F, 6.3F, 3.1F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(109, 41).addBox(-1.75F, 0.0F, -2.15F, 3.5F, 2.7F, 4.1F),
                PartPose.offset(0.0F, 6.3F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }
}
