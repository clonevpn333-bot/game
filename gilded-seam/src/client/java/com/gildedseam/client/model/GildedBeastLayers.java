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

        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(0, 29).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 5.28F, 4.0F),
                PartPose.offset(-4.0F, 12.0F, -5.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(85, 29).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 4.56F, 3.6F),
                PartPose.offset(0.0F, 5.28F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(56, 39).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.16F, 4.6F),
                PartPose.offset(0.0F, 4.56F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(17, 29).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 4.8F, 4.0F),
                PartPose.offset(-4.0F, 12.0F, 7.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(100, 29).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 5.04F, 3.6F),
                PartPose.offset(0.0F, 4.8F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(75, 39).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.16F, 4.6F),
                PartPose.offset(0.0F, 5.04F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(34, 29).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 4.8F, 4.0F),
                PartPose.offset(4.0F, 12.0F, 7.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(0, 39).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 5.04F, 3.6F),
                PartPose.offset(0.0F, 4.8F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(94, 39).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.16F, 4.6F),
                PartPose.offset(0.0F, 5.04F, 0.0F));
        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 5.0F, 2.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(70, 0).addBox(-4.0F, -4.0F, -6.0F, 8.0F, 8.0F, 6.0F)
                        .texOffs(43, 64).addBox(-3.0F, 1.0F, -7.0F, 6.0F, 3.0F, 1.0F)
                        .texOffs(0, 70).addBox(-5.0F, -5.0F, -5.0F, 1.0F, 3.0F, 1.0F)
                        .texOffs(5, 70).addBox(4.0F, -5.0F, -5.0F, 1.0F, 3.0F, 1.0F),
                PartPose.offset(0.0F, -1.0F, -10.0F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(81, 49).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(-2.32F, 2.4F, -5.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(19, 49).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(75, 75).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-2.32F, -0.5952F, -5.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(94, 49).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(2.32F, 2.4F, -5.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(34, 49).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(90, 75).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(2.32F, -0.5952F, -5.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(58, 64).addBox(-1.144F, -1.144F, -1.9448F, 2.288F, 2.288F, 1.9448F),
                PartPose.offsetAndRotation(-2.4F, -2.0F, -5.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(67, 64).addBox(-0.936F, -0.936F, -1.5912F, 1.872F, 1.872F, 1.5912F),
                PartPose.offsetAndRotation(2.72F, -2.56F, -5.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceSpare2 = face.addOrReplaceChild("face_spare2",
                CubeListBuilder.create()
                        .texOffs(53, 70).addBox(-0.832F, -0.832F, -1.4144F, 1.664F, 1.664F, 1.4144F),
                PartPose.offsetAndRotation(0.0F, -4.0F, -5.7F, 0.0F, 0.0F, -0.363F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(24, 64).addBox(-3.36F, -1.2F, -1.6F, 6.72F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 5.28F, -5.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(105, 75).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-2.72F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(74, 70).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(-1.36F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(79, 70).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.9F, 0.9F),
                PartPose.offset(0.0F, 0.4F, -0.9F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(84, 70).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(1.36F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceUt4 = faceMaw.addOrReplaceChild("face_ut4",
                CubeListBuilder.create()
                        .texOffs(110, 75).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(2.72F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(24, 57).addBox(-3.2F, 0.0F, -3.0F, 6.4F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 5.6F, -4.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(115, 75).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-2.56F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(89, 70).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(-1.28F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(94, 70).addBox(-0.4F, -1.7F, -0.4F, 0.8F, 1.7F, 0.8F),
                PartPose.offset(0.0F, 0.1F, -2.4F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(99, 70).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(1.28F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceLt4 = faceJaw.addOrReplaceChild("face_lt4",
                CubeListBuilder.create()
                        .texOffs(120, 75).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(2.56F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(40, 70).addBox(-2.08F, -0.2F, -1.4F, 4.16F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(121, 64).addBox(-0.8F, 0.0F, -0.56F, 1.6F, 2.6F, 1.12F),
                PartPose.offsetAndRotation(0.0F, 6.0F, -5.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(104, 70).addBox(-0.704F, 0.0F, -0.5F, 1.408F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(109, 70).addBox(-0.6195F, 0.0F, -0.5F, 1.239F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(114, 70).addBox(-0.5452F, 0.0F, -0.5F, 1.0904F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(119, 70).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue5 = mut1Tongue4.addOrReplaceChild("mut1_tongue_5",
                CubeListBuilder.create()
                        .texOffs(124, 70).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.8888F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0134F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue5.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(0, 75).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2RootsR = head.addOrReplaceChild("mut2_roots_r",
                CubeListBuilder.create()
                        .texOffs(118, 49).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.5F, 0.5F, -3.0F, -0.4189F, 0.0F, -0.5236F));
        PartDefinition mut2RootsR1 = mut2RootsR.addOrReplaceChild("mut2_roots_r_1",
                CubeListBuilder.create()
                        .texOffs(14, 64).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsR2 = mut2RootsR1.addOrReplaceChild("mut2_roots_r_2",
                CubeListBuilder.create()
                        .texOffs(10, 70).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsRB = mut2RootsR1.addOrReplaceChild("mut2_roots_r_b",
                CubeListBuilder.create()
                        .texOffs(15, 70).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, 0.8029F));
        PartDefinition mut2RootsRB1 = mut2RootsRB.addOrReplaceChild("mut2_roots_r_b_1",
                CubeListBuilder.create()
                        .texOffs(20, 70).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, -0.4538F));
        PartDefinition mut2RootsL = head.addOrReplaceChild("mut2_roots_l",
                CubeListBuilder.create()
                        .texOffs(0, 57).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(2.5F, 0.5F, -3.0F, -0.4189F, 0.0F, 0.5236F));
        PartDefinition mut2RootsL1 = mut2RootsL.addOrReplaceChild("mut2_roots_l_1",
                CubeListBuilder.create()
                        .texOffs(19, 64).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsL2 = mut2RootsL1.addOrReplaceChild("mut2_roots_l_2",
                CubeListBuilder.create()
                        .texOffs(25, 70).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2RootsLB = mut2RootsL1.addOrReplaceChild("mut2_roots_l_b",
                CubeListBuilder.create()
                        .texOffs(30, 70).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, -0.8029F));
        PartDefinition mut2RootsLB1 = mut2RootsLB.addOrReplaceChild("mut2_roots_l_b_1",
                CubeListBuilder.create()
                        .texOffs(35, 70).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, 0.4538F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 3.0F, -6.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(54, 57).addBox(-1.54F, -1.54F, -1.9096F, 3.08F, 3.08F, 1.9096F)
                        .texOffs(65, 57).addBox(-1.9096F, -1.9096F, -0.924F, 3.8192F, 3.8192F, 1.232F),
                PartPose.offsetAndRotation(-3.2F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(60, 70).addBox(-1.0765F, -1.0765F, -1.3349F, 2.1531F, 2.1531F, 1.3349F)
                        .texOffs(103, 64).addBox(-1.3349F, -1.3349F, -0.6459F, 2.6698F, 2.6698F, 0.8612F),
                PartPose.offsetAndRotation(-1.0667F, 1.4876F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(76, 57).addBox(-1.5223F, -1.5223F, -1.8877F, 3.0447F, 3.0447F, 1.8877F)
                        .texOffs(87, 57).addBox(-1.8877F, -1.8877F, -0.9134F, 3.7754F, 3.7754F, 1.2179F),
                PartPose.offsetAndRotation(1.0667F, -2.1919F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(67, 70).addBox(-1.2091F, -1.2091F, -1.4993F, 2.4182F, 2.4182F, 1.4993F)
                        .texOffs(112, 64).addBox(-1.4993F, -1.4993F, -0.7255F, 2.9985F, 2.9985F, 0.9673F),
                PartPose.offsetAndRotation(3.2F, 1.742F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition bodyShell = body.addOrReplaceChild("body_shell",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-6.0F, -10.0F, -7.0F, 12.0F, 18.0F, 10.0F)
                        .texOffs(49, 49).addBox(-2.0F, 2.0F, -8.0F, 4.0F, 6.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 1.571F, 0.0F, 0.0F));
        PartDefinition mut1Flank = body.addOrReplaceChild("mut1_flank",
                CubeListBuilder.create()
                        .texOffs(45, 0).addBox(0.0F, -3.5F, -5.5F, 0.9F, 7.0F, 11.0F),
                PartPose.offset(-6.0F, 4.0F, -1.0F));
        PartDefinition mut1FlankRib0 = mut1Flank.addOrReplaceChild("mut1_flank_rib0",
                CubeListBuilder.create()
                        .texOffs(71, 49).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 6.44F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.94F, -4.4F, 0.0F, 0.0F, -0.2443F));
        PartDefinition mut1FlankRib1 = mut1Flank.addOrReplaceChild("mut1_flank_rib1",
                CubeListBuilder.create()
                        .texOffs(76, 49).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 5.964F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.94F, -2.64F, 0.0F, 0.0F, -0.3491F));
        PartDefinition mut1FlankRib2 = mut1Flank.addOrReplaceChild("mut1_flank_rib2",
                CubeListBuilder.create()
                        .texOffs(9, 57).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 5.488F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.94F, -0.88F, 0.0F, 0.0F, -0.4538F));
        PartDefinition mut1FlankRib3 = mut1Flank.addOrReplaceChild("mut1_flank_rib3",
                CubeListBuilder.create()
                        .texOffs(14, 57).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 5.012F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.94F, 0.88F, 0.0F, 0.0F, -0.5585F));
        PartDefinition mut1FlankRib4 = mut1Flank.addOrReplaceChild("mut1_flank_rib4",
                CubeListBuilder.create()
                        .texOffs(19, 57).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 4.536F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.94F, 2.64F, 0.0F, 0.0F, -0.6632F));
        PartDefinition mut1FlankRib5 = mut1Flank.addOrReplaceChild("mut1_flank_rib5",
                CubeListBuilder.create()
                        .texOffs(9, 64).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 4.06F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.94F, 4.4F, 0.0F, 0.0F, -0.7679F));
        PartDefinition mut1FlankGut = mut1Flank.addOrReplaceChild("mut1_flank_gut",
                CubeListBuilder.create()
                        .texOffs(68, 29).addBox(-1.1F, 0.0F, -2.86F, 1.6F, 2.8F, 5.72F),
                PartPose.offset(-0.9F, 0.42F, 0.0F));
        PartDefinition mut1FlankGut2 = mut1FlankGut.addOrReplaceChild("mut1_flank_gut2",
                CubeListBuilder.create()
                        .texOffs(107, 49).addBox(-0.8F, 0.0F, -1.76F, 1.2F, 2.1F, 3.52F),
                PartPose.offsetAndRotation(0.0F, 2.38F, 0.0F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1FlankPelt = mut1Flank.addOrReplaceChild("mut1_flank_pelt",
                CubeListBuilder.create()
                        .texOffs(99, 0).addBox(-1.1F, 0.0F, -3.3F, 1.2F, 5.04F, 6.6F),
                PartPose.offsetAndRotation(-0.5F, 3.08F, 1.32F, 0.0F, 0.0F, -0.5934F));
        PartDefinition mut1FlankPelt2 = mut1FlankPelt.addOrReplaceChild("mut1_flank_pelt2",
                CubeListBuilder.create()
                        .texOffs(60, 49).addBox(-0.9F, 0.0F, -2.2F, 1.0F, 2.94F, 4.4F),
                PartPose.offsetAndRotation(0.0F, 4.9F, 0.0F, 0.0F, 0.0F, -0.3491F));
        PartDefinition mut1FlankVert0 = mut1Flank.addOrReplaceChild("mut1_flank_vert0",
                CubeListBuilder.create()
                        .texOffs(0, 79).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -3.64F, -3.52F));
        PartDefinition mut1FlankVert1 = mut1Flank.addOrReplaceChild("mut1_flank_vert1",
                CubeListBuilder.create()
                        .texOffs(5, 79).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -3.64F, -1.705F));
        PartDefinition mut1FlankVert2 = mut1Flank.addOrReplaceChild("mut1_flank_vert2",
                CubeListBuilder.create()
                        .texOffs(10, 79).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -3.64F, 0.11F));
        PartDefinition mut1FlankVert3 = mut1Flank.addOrReplaceChild("mut1_flank_vert3",
                CubeListBuilder.create()
                        .texOffs(15, 79).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -3.64F, 1.925F));
        PartDefinition mut1FlankVert4 = mut1Flank.addOrReplaceChild("mut1_flank_vert4",
                CubeListBuilder.create()
                        .texOffs(20, 79).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -3.64F, 3.74F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(76, 64).addBox(-1.2F, -1.87F, -0.8F, 2.4F, 1.87F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -6.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(98, 57).addBox(-1.2F, -2.7693F, -0.8F, 2.4F, 2.7693F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -3.4F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(107, 57).addBox(-1.2F, -3.3251F, -0.8F, 2.4F, 3.3251F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.8F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(116, 57).addBox(-1.2F, -3.3251F, -0.8F, 2.4F, 3.3251F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 1.8F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP4 = mut1Plates.addOrReplaceChild("mut1_plates_p4",
                CubeListBuilder.create()
                        .texOffs(0, 64).addBox(-1.2F, -2.7693F, -0.8F, 2.4F, 2.7693F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 4.4F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP5 = mut1Plates.addOrReplaceChild("mut1_plates_p5",
                CubeListBuilder.create()
                        .texOffs(85, 64).addBox(-1.2F, -1.87F, -0.8F, 2.4F, 1.87F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 7.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Bulb = body.addOrReplaceChild("mut1_bulb",
                CubeListBuilder.create()
                        .texOffs(39, 39).addBox(-2.0F, -2.0F, -2.0F, 4.0F, 4.0F, 4.0F),
                PartPose.offset(4.5F, 3.0F, -5.0F));
        PartDefinition mut1BulbCore = mut1Bulb.addOrReplaceChild("mut1_bulb_core",
                CubeListBuilder.create()
                        .texOffs(94, 64).addBox(-1.0F, -1.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(116, 0).addBox(-1.44F, 0.0F, -1.44F, 2.88F, 7.2F, 2.88F),
                PartPose.offsetAndRotation(-6.5F, 2.0F, -3.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(30, 39).addBox(-1.2F, 0.0F, -1.2F, 2.4F, 7.2F, 2.4F),
                PartPose.offsetAndRotation(0.0F, 7.2F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(43, 57).addBox(-1.68F, 0.0F, -1.08F, 3.36F, 2.64F, 2.16F),
                PartPose.offsetAndRotation(0.0F, 7.2F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(5, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.92F, 1.0F),
                PartPose.offsetAndRotation(-1.32F, 2.64F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(10, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.7805F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.92F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(15, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6512F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.7805F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(20, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.92F, 1.0F),
                PartPose.offsetAndRotation(-0.42F, 2.64F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(25, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.7805F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.92F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(30, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6512F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.7805F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(35, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.92F, 1.0F),
                PartPose.offsetAndRotation(0.48F, 2.64F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(40, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.7805F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.92F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(45, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6512F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.7805F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(50, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.92F, 1.0F),
                PartPose.offsetAndRotation(1.38F, 2.64F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(55, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.7805F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.92F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(60, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6512F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.7805F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(65, 75).addBox(-0.54F, 0.0F, -0.54F, 1.08F, 1.8F, 1.08F),
                PartPose.offsetAndRotation(-1.68F, 1.2F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(70, 75).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6595F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.8F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(51, 29).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 5.28F, 4.0F),
                PartPose.offset(4.0F, 12.0F, -5.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(15, 39).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 4.56F, 3.6F),
                PartPose.offset(0.0F, 5.28F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(0, 49).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.16F, 4.6F),
                PartPose.offset(0.0F, 4.56F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedPigLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(0, 25).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 2.64F, 4.0F),
                PartPose.offset(-3.0F, 18.0F, -5.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(91, 33).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 2.28F, 3.6F),
                PartPose.offset(0.0F, 2.64F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(109, 25).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.08F, 4.6F),
                PartPose.offset(0.0F, 2.28F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(57, 33).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 2.4F, 4.0F),
                PartPose.offset(-3.0F, 18.0F, 7.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(34, 25).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 2.52F, 3.6F),
                PartPose.offset(0.0F, 2.4F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(0, 33).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.08F, 4.6F),
                PartPose.offset(0.0F, 2.52F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(74, 33).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 2.4F, 4.0F),
                PartPose.offset(3.0F, 18.0F, 7.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(49, 25).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 2.52F, 3.6F),
                PartPose.offset(0.0F, 2.4F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(19, 33).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.08F, 4.6F),
                PartPose.offset(0.0F, 2.52F, 0.0F));
        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 11.0F, 2.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(37, 0).addBox(-4.0F, -4.0F, -8.0F, 8.0F, 8.0F, 8.0F)
                        .texOffs(71, 47).addBox(-2.0F, 0.0F, -9.0F, 4.0F, 3.0F, 1.0F),
                PartPose.offset(0.0F, 1.0F, -8.0F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(0, 40).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(-2.32F, 2.4F, -7.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(64, 25).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(96, 58).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-2.32F, -0.5952F, -7.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(13, 40).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(2.32F, 2.4F, -7.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(79, 25).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(111, 58).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(2.32F, -0.5952F, -7.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(82, 47).addBox(-1.144F, -1.144F, -1.9448F, 2.288F, 2.288F, 1.9448F),
                PartPose.offsetAndRotation(-2.4F, -2.0F, -7.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(91, 47).addBox(-0.936F, -0.936F, -1.5912F, 1.872F, 1.872F, 1.5912F),
                PartPose.offsetAndRotation(2.72F, -2.56F, -7.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceSpare2 = face.addOrReplaceChild("face_spare2",
                CubeListBuilder.create()
                        .texOffs(13, 58).addBox(-0.832F, -0.832F, -1.4144F, 1.664F, 1.664F, 1.4144F),
                PartPose.offsetAndRotation(0.0F, -4.0F, -7.7F, 0.0F, 0.0F, -0.363F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(52, 47).addBox(-3.36F, -1.2F, -1.6F, 6.72F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 5.28F, -7.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(0, 62).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-2.72F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(41, 58).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(-1.36F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(46, 58).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.9F, 0.9F),
                PartPose.offset(0.0F, 0.4F, -0.9F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(51, 58).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(1.36F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceUt4 = faceMaw.addOrReplaceChild("face_ut4",
                CubeListBuilder.create()
                        .texOffs(5, 62).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(2.72F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(87, 40).addBox(-3.2F, 0.0F, -3.0F, 6.4F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 5.6F, -6.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(10, 62).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-2.56F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(56, 58).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(-1.28F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(61, 58).addBox(-0.4F, -1.7F, -0.4F, 0.8F, 1.7F, 0.8F),
                PartPose.offset(0.0F, 0.1F, -2.4F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(66, 58).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(1.28F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceLt4 = faceJaw.addOrReplaceChild("face_lt4",
                CubeListBuilder.create()
                        .texOffs(15, 62).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(2.56F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(0, 58).addBox(-2.08F, -0.2F, -1.4F, 4.16F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(46, 53).addBox(-0.7F, 0.0F, -0.5F, 1.4F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 7.0F, -8.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(71, 58).addBox(-0.616F, 0.0F, -0.5F, 1.232F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(76, 58).addBox(-0.5421F, 0.0F, -0.5F, 1.0842F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(81, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(86, 58).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue4.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(91, 58).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2Stalks = head.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, -4.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(101, 53).addBox(-0.5F, -2.6F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(-2.6F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(109, 47).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.6F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(106, 53).addBox(-0.5F, -2.6F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(-0.8667F, 0.0F, -0.2667F, -0.3142F, -0.1513F, -0.1745F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(118, 47).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.6F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(111, 53).addBox(-0.5F, -2.6F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.8667F, 0.0F, -0.2667F, -0.3142F, 0.1513F, 0.1745F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(0, 53).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.6F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(116, 53).addBox(-0.5F, -2.6F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(2.6F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(9, 53).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.6F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 3.0F, -8.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(106, 40).addBox(-1.43F, -1.43F, -1.7732F, 2.86F, 2.86F, 1.7732F)
                        .texOffs(117, 40).addBox(-1.7732F, -1.7732F, -0.858F, 3.5464F, 3.5464F, 1.144F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(20, 58).addBox(-0.9996F, -0.9996F, -1.2396F, 1.9993F, 1.9993F, 1.2396F)
                        .texOffs(27, 58).addBox(-1.2396F, -1.2396F, -0.5998F, 2.4791F, 2.4791F, 0.7997F),
                PartPose.offsetAndRotation(-1.5F, 1.6229F, -0.5691F, 0.0F, -0.2269F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(0, 47).addBox(-1.4136F, -1.4136F, -1.7529F, 2.8272F, 2.8272F, 1.7529F)
                        .texOffs(11, 47).addBox(-1.7529F, -1.7529F, -0.8482F, 3.5057F, 3.5057F, 1.1309F),
                PartPose.offsetAndRotation(0.0F, -2.3912F, -0.6491F, 0.0F, 0.0F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(34, 58).addBox(-1.1227F, -1.1227F, -1.3922F, 2.2454F, 2.2454F, 1.3922F)
                        .texOffs(18, 53).addBox(-1.3922F, -1.3922F, -0.6736F, 2.7843F, 2.7843F, 0.8982F),
                PartPose.offsetAndRotation(1.5F, 1.9004F, -0.598F, 0.0F, 0.2269F, 0.2764F));
        PartDefinition mut1EyesE4 = mut1Eyes.addOrReplaceChild("mut1_eyes_e4",
                CubeListBuilder.create()
                        .texOffs(22, 47).addBox(-1.3655F, -1.3655F, -1.6932F, 2.731F, 2.731F, 1.6932F)
                        .texOffs(27, 53).addBox(-1.6932F, -1.6932F, -0.8193F, 3.3864F, 3.3864F, 1.0924F),
                PartPose.offsetAndRotation(3.0F, -0.4089F, -0.4426F, 0.0F, 0.4538F, -0.0595F));
        PartDefinition bodyShell = body.addOrReplaceChild("body_shell",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-5.0F, -10.0F, -7.0F, 10.0F, 16.0F, 8.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 1.571F, 0.0F, 0.0F));
        PartDefinition mut1Belly = body.addOrReplaceChild("mut1_belly",
                CubeListBuilder.create()
                        .texOffs(70, 0).addBox(-0.9F, -2.5F, -5.0F, 0.9F, 5.0F, 10.0F),
                PartPose.offset(0.0F, 8.6F, 1.0F));
        PartDefinition mut1BellyRib0 = mut1Belly.addOrReplaceChild("mut1_belly_rib0",
                CubeListBuilder.create()
                        .texOffs(82, 40).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 4.6F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.1F, -4.0F, 0.0F, 0.0F, 0.2443F));
        PartDefinition mut1BellyRib1 = mut1Belly.addOrReplaceChild("mut1_belly_rib1",
                CubeListBuilder.create()
                        .texOffs(42, 47).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 4.175F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.1F, -2.0F, 0.0F, 0.0F, 0.3752F));
        PartDefinition mut1BellyRib2 = mut1Belly.addOrReplaceChild("mut1_belly_rib2",
                CubeListBuilder.create()
                        .texOffs(47, 47).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.75F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.1F, 0.0F, 0.0F, 0.0F, 0.5061F));
        PartDefinition mut1BellyRib3 = mut1Belly.addOrReplaceChild("mut1_belly_rib3",
                CubeListBuilder.create()
                        .texOffs(36, 53).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.325F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.1F, 2.0F, 0.0F, 0.0F, 0.637F));
        PartDefinition mut1BellyRib4 = mut1Belly.addOrReplaceChild("mut1_belly_rib4",
                CubeListBuilder.create()
                        .texOffs(41, 53).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 2.9F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.1F, 4.0F, 0.0F, 0.0F, 0.7679F));
        PartDefinition mut1BellyGut = mut1Belly.addOrReplaceChild("mut1_belly_gut",
                CubeListBuilder.create()
                        .texOffs(94, 25).addBox(-0.5F, 0.0F, -2.6F, 1.6F, 2.0F, 5.2F),
                PartPose.offset(0.9F, 0.3F, 0.0F));
        PartDefinition mut1BellyGut2 = mut1BellyGut.addOrReplaceChild("mut1_belly_gut2",
                CubeListBuilder.create()
                        .texOffs(33, 47).addBox(-0.4F, 0.0F, -1.6F, 1.2F, 1.5F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 1.7F, 0.0F, 0.0F, 0.0F, -0.3142F));
        PartDefinition mut1BellyPelt = mut1Belly.addOrReplaceChild("mut1_belly_pelt",
                CubeListBuilder.create()
                        .texOffs(93, 0).addBox(-0.1F, 0.0F, -3.0F, 1.2F, 3.6F, 6.0F),
                PartPose.offsetAndRotation(0.5F, 2.2F, 1.2F, 0.0F, 0.0F, 0.5934F));
        PartDefinition mut1BellyPelt2 = mut1BellyPelt.addOrReplaceChild("mut1_belly_pelt2",
                CubeListBuilder.create()
                        .texOffs(26, 40).addBox(-0.1F, 0.0F, -2.0F, 1.0F, 2.1F, 4.0F),
                PartPose.offsetAndRotation(0.0F, 3.5F, 0.0F, 0.0F, 0.0F, 0.3491F));
        PartDefinition mut1Bulb = body.addOrReplaceChild("mut1_bulb",
                CubeListBuilder.create()
                        .texOffs(108, 0).addBox(-2.5F, -2.0F, -2.5F, 5.0F, 4.0F, 5.0F),
                PartPose.offset(0.0F, -0.5F, 3.0F));
        PartDefinition mut1BulbCore = mut1Bulb.addOrReplaceChild("mut1_bulb_core",
                CubeListBuilder.create()
                        .texOffs(100, 47).addBox(-1.25F, -1.0F, -1.25F, 2.5F, 2.0F, 2.5F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut2LegsR0 = body.addOrReplaceChild("mut2_legs_r0",
                CubeListBuilder.create()
                        .texOffs(37, 40).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.75F, 1.8F),
                PartPose.offsetAndRotation(-4.5F, 6.0F, -1.0F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2LegsR01 = mut2LegsR0.addOrReplaceChild("mut2_legs_r0_1",
                CubeListBuilder.create()
                        .texOffs(51, 53).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.3541F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.75F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR02 = mut2LegsR01.addOrReplaceChild("mut2_legs_r0_2",
                CubeListBuilder.create()
                        .texOffs(56, 53).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.0F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.3541F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR1 = body.addOrReplaceChild("mut2_legs_r1",
                CubeListBuilder.create()
                        .texOffs(46, 40).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.75F, 1.8F),
                PartPose.offsetAndRotation(-4.5F, 6.0F, 2.4F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2LegsR11 = mut2LegsR1.addOrReplaceChild("mut2_legs_r1_1",
                CubeListBuilder.create()
                        .texOffs(61, 53).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.3541F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.75F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR12 = mut2LegsR11.addOrReplaceChild("mut2_legs_r1_2",
                CubeListBuilder.create()
                        .texOffs(66, 53).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.0F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.3541F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsL0 = body.addOrReplaceChild("mut2_legs_l0",
                CubeListBuilder.create()
                        .texOffs(55, 40).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.75F, 1.8F),
                PartPose.offsetAndRotation(4.5F, 6.0F, -1.0F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2LegsL01 = mut2LegsL0.addOrReplaceChild("mut2_legs_l0_1",
                CubeListBuilder.create()
                        .texOffs(71, 53).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.3541F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.75F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL02 = mut2LegsL01.addOrReplaceChild("mut2_legs_l0_2",
                CubeListBuilder.create()
                        .texOffs(76, 53).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.0F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.3541F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL1 = body.addOrReplaceChild("mut2_legs_l1",
                CubeListBuilder.create()
                        .texOffs(64, 40).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.75F, 1.8F),
                PartPose.offsetAndRotation(4.5F, 6.0F, 2.4F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2LegsL11 = mut2LegsL1.addOrReplaceChild("mut2_legs_l1_1",
                CubeListBuilder.create()
                        .texOffs(81, 53).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.3541F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.75F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL12 = mut2LegsL11.addOrReplaceChild("mut2_legs_l1_2",
                CubeListBuilder.create()
                        .texOffs(86, 53).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.0F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.3541F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL2 = body.addOrReplaceChild("mut2_legs_l2",
                CubeListBuilder.create()
                        .texOffs(73, 40).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 3.75F, 1.8F),
                PartPose.offsetAndRotation(4.5F, 6.0F, 5.8F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2LegsL21 = mut2LegsL2.addOrReplaceChild("mut2_legs_l2_1",
                CubeListBuilder.create()
                        .texOffs(91, 53).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.3541F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 3.75F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL22 = mut2LegsL21.addOrReplaceChild("mut2_legs_l2_2",
                CubeListBuilder.create()
                        .texOffs(96, 53).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.0F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.3541F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(17, 25).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 2.64F, 4.0F),
                PartPose.offset(3.0F, 18.0F, -5.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(106, 33).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 2.28F, 3.6F),
                PartPose.offset(0.0F, 2.64F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(38, 33).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.08F, 4.6F),
                PartPose.offset(0.0F, 2.28F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedSheepLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(0, 23).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 5.28F, 4.0F),
                PartPose.offset(-3.0F, 12.0F, -5.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(68, 23).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 4.56F, 3.6F),
                PartPose.offset(0.0F, 5.28F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(18, 33).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.16F, 4.6F),
                PartPose.offset(0.0F, 4.56F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(17, 23).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 4.8F, 4.0F),
                PartPose.offset(-3.0F, 12.0F, 7.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(83, 23).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 5.04F, 3.6F),
                PartPose.offset(0.0F, 4.8F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(37, 33).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.16F, 4.6F),
                PartPose.offset(0.0F, 5.04F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(34, 23).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 4.8F, 4.0F),
                PartPose.offset(3.0F, 12.0F, 7.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(98, 23).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 5.04F, 3.6F),
                PartPose.offset(0.0F, 4.8F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(56, 33).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.16F, 4.6F),
                PartPose.offset(0.0F, 5.04F, 0.0F));
        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 5.0F, 2.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(58, 0).addBox(-3.0F, -4.0F, -6.0F, 6.0F, 6.0F, 8.0F),
                PartPose.offset(0.0F, 1.0F, -10.0F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(22, 42).addBox(-1.9344F, -1.9344F, -0.9F, 3.8688F, 3.8688F, 1.0F),
                PartPose.offsetAndRotation(-1.74F, 1.8F, -7.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(33, 42).addBox(-1.56F, -1.56F, -2.496F, 3.12F, 3.12F, 2.496F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(96, 60).addBox(-2.184F, -0.9F, -1.2F, 4.368F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-1.74F, -0.4464F, -7.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(44, 42).addBox(-1.9344F, -1.9344F, -0.9F, 3.8688F, 3.8688F, 1.0F),
                PartPose.offsetAndRotation(1.74F, 1.8F, -7.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(55, 42).addBox(-1.56F, -1.56F, -2.496F, 3.12F, 3.12F, 2.496F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(107, 60).addBox(-2.184F, -0.9F, -1.2F, 4.368F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(1.74F, -0.4464F, -7.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(100, 55).addBox(-0.858F, -0.858F, -1.4586F, 1.716F, 1.716F, 1.4586F),
                PartPose.offsetAndRotation(-1.8F, -1.5F, -7.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(118, 60).addBox(-0.702F, -0.702F, -1.1934F, 1.404F, 1.404F, 1.1934F),
                PartPose.offsetAndRotation(2.04F, -1.92F, -7.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceSpare2 = face.addOrReplaceChild("face_spare2",
                CubeListBuilder.create()
                        .texOffs(123, 60).addBox(-0.624F, -0.624F, -1.0608F, 1.248F, 1.248F, 1.0608F),
                PartPose.offsetAndRotation(0.0F, -3.0F, -7.7F, 0.0F, 0.0F, -0.363F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(69, 49).addBox(-2.52F, -1.2F, -1.6F, 5.04F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 3.96F, -7.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(0, 64).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-2.04F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(21, 60).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(-1.02F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(26, 60).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.9F, 0.9F),
                PartPose.offset(0.0F, 0.4F, -0.9F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(31, 60).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(1.02F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceUt4 = faceMaw.addOrReplaceChild("face_ut4",
                CubeListBuilder.create()
                        .texOffs(5, 64).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(2.04F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(5, 42).addBox(-2.4F, 0.0F, -3.0F, 4.8F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 4.2F, -6.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(10, 64).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-1.92F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(36, 60).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(-0.96F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(41, 60).addBox(-0.4F, -1.7F, -0.4F, 0.8F, 1.7F, 0.8F),
                PartPose.offset(0.0F, 0.1F, -2.4F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(46, 60).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(0.96F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceLt4 = faceJaw.addOrReplaceChild("face_lt4",
                CubeListBuilder.create()
                        .texOffs(15, 64).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(1.92F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(89, 55).addBox(-1.56F, -0.2F, -1.4F, 3.12F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(69, 55).addBox(-0.65F, 0.0F, -0.5F, 1.3F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 5.0F, -7.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(51, 60).addBox(-0.572F, 0.0F, -0.5F, 1.144F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(56, 60).addBox(-0.5034F, 0.0F, -0.5F, 1.0067F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(61, 60).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(66, 60).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue4.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(71, 60).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2RootsR = head.addOrReplaceChild("mut2_roots_r",
                CubeListBuilder.create()
                        .texOffs(118, 33).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -4.0F, -0.4189F, 0.0F, -0.5236F));
        PartDefinition mut2RootsR1 = mut2RootsR.addOrReplaceChild("mut2_roots_r_1",
                CubeListBuilder.create()
                        .texOffs(64, 49).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsR2 = mut2RootsR1.addOrReplaceChild("mut2_roots_r_2",
                CubeListBuilder.create()
                        .texOffs(74, 55).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut2RootsRB = mut2RootsR1.addOrReplaceChild("mut2_roots_r_b",
                CubeListBuilder.create()
                        .texOffs(79, 55).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, 0.8029F));
        PartDefinition mut2RootsRB1 = mut2RootsRB.addOrReplaceChild("mut2_roots_r_b_1",
                CubeListBuilder.create()
                        .texOffs(84, 55).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, -0.4538F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 2.5F, -8.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(0, 49).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(27, 55).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-2.4F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(0, 60).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(7, 60).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-0.8F, 1.3524F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(11, 49).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(36, 55).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(0.8F, -1.9927F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(14, 60).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(45, 55).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(2.4F, 1.5837F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition bodyShell = body.addOrReplaceChild("body_shell",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-4.0F, -10.0F, -7.0F, 8.0F, 16.0F, 6.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 1.571F, 0.0F, 0.0F));
        PartDefinition mut1Shorn = body.addOrReplaceChild("mut1_shorn",
                CubeListBuilder.create()
                        .texOffs(29, 0).addBox(0.0F, -2.5F, -6.5F, 0.9F, 5.0F, 13.0F),
                PartPose.offset(0.0F, 4.4F, 0.0F));
        PartDefinition mut1ShornRib0 = mut1Shorn.addOrReplaceChild("mut1_shorn_rib0",
                CubeListBuilder.create()
                        .texOffs(0, 42).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 4.6F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.1F, -5.2F, 0.0F, 0.0F, -0.2443F));
        PartDefinition mut1ShornRib1 = mut1Shorn.addOrReplaceChild("mut1_shorn_rib1",
                CubeListBuilder.create()
                        .texOffs(49, 49).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 4.3167F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.1F, -3.4667F, 0.0F, 0.0F, -0.3316F));
        PartDefinition mut1ShornRib2 = mut1Shorn.addOrReplaceChild("mut1_shorn_rib2",
                CubeListBuilder.create()
                        .texOffs(54, 49).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 4.0333F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.1F, -1.7333F, 0.0F, 0.0F, -0.4189F));
        PartDefinition mut1ShornRib3 = mut1Shorn.addOrReplaceChild("mut1_shorn_rib3",
                CubeListBuilder.create()
                        .texOffs(59, 49).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.75F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.1F, 0.0F, 0.0F, 0.0F, -0.5061F));
        PartDefinition mut1ShornRib4 = mut1Shorn.addOrReplaceChild("mut1_shorn_rib4",
                CubeListBuilder.create()
                        .texOffs(54, 55).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.4667F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.1F, 1.7333F, 0.0F, 0.0F, -0.5934F));
        PartDefinition mut1ShornRib5 = mut1Shorn.addOrReplaceChild("mut1_shorn_rib5",
                CubeListBuilder.create()
                        .texOffs(59, 55).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.1833F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.1F, 3.4667F, 0.0F, 0.0F, -0.6807F));
        PartDefinition mut1ShornRib6 = mut1Shorn.addOrReplaceChild("mut1_shorn_rib6",
                CubeListBuilder.create()
                        .texOffs(64, 55).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 2.9F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.1F, 5.2F, 0.0F, 0.0F, -0.7679F));
        PartDefinition mut1ShornGut = mut1Shorn.addOrReplaceChild("mut1_shorn_gut",
                CubeListBuilder.create()
                        .texOffs(106, 0).addBox(-1.1F, 0.0F, -3.38F, 1.6F, 2.0F, 6.76F),
                PartPose.offset(-0.9F, 0.3F, 0.0F));
        PartDefinition mut1ShornGut2 = mut1ShornGut.addOrReplaceChild("mut1_shorn_gut2",
                CubeListBuilder.create()
                        .texOffs(107, 33).addBox(-0.8F, 0.0F, -2.08F, 1.2F, 1.5F, 4.16F),
                PartPose.offsetAndRotation(0.0F, 1.7F, 0.0F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1ShornPelt = mut1Shorn.addOrReplaceChild("mut1_shorn_pelt",
                CubeListBuilder.create()
                        .texOffs(87, 0).addBox(-1.1F, 0.0F, -3.9F, 1.2F, 3.6F, 7.8F),
                PartPose.offsetAndRotation(-0.5F, 2.2F, 1.56F, 0.0F, 0.0F, -0.5934F));
        PartDefinition mut1ShornPelt2 = mut1ShornPelt.addOrReplaceChild("mut1_shorn_pelt2",
                CubeListBuilder.create()
                        .texOffs(94, 33).addBox(-0.9F, 0.0F, -2.6F, 1.0F, 2.1F, 5.2F),
                PartPose.offsetAndRotation(0.0F, 3.5F, 0.0F, 0.0F, 0.0F, -0.3491F));
        PartDefinition mut1ShornVert0 = mut1Shorn.addOrReplaceChild("mut1_shorn_vert0",
                CubeListBuilder.create()
                        .texOffs(20, 64).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.6F, -4.16F));
        PartDefinition mut1ShornVert1 = mut1Shorn.addOrReplaceChild("mut1_shorn_vert1",
                CubeListBuilder.create()
                        .texOffs(25, 64).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.6F, -2.444F));
        PartDefinition mut1ShornVert2 = mut1Shorn.addOrReplaceChild("mut1_shorn_vert2",
                CubeListBuilder.create()
                        .texOffs(30, 64).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.6F, -0.728F));
        PartDefinition mut1ShornVert3 = mut1Shorn.addOrReplaceChild("mut1_shorn_vert3",
                CubeListBuilder.create()
                        .texOffs(35, 64).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.6F, 0.988F));
        PartDefinition mut1ShornVert4 = mut1Shorn.addOrReplaceChild("mut1_shorn_vert4",
                CubeListBuilder.create()
                        .texOffs(40, 64).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.6F, 2.704F));
        PartDefinition mut1ShornVert5 = mut1Shorn.addOrReplaceChild("mut1_shorn_vert5",
                CubeListBuilder.create()
                        .texOffs(45, 64).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.6F, 4.42F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -1.0F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(95, 49).addBox(-1.2F, -1.65F, -0.8F, 2.4F, 1.65F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -5.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(22, 49).addBox(-1.2F, -2.6046F, -0.8F, 2.4F, 2.6046F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -2.25F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(31, 49).addBox(-1.2F, -3.0F, -0.8F, 2.4F, 3.0F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.5F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(40, 49).addBox(-1.2F, -2.6046F, -0.8F, 2.4F, 2.6046F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 3.25F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP4 = mut1Plates.addOrReplaceChild("mut1_plates_p4",
                CubeListBuilder.create()
                        .texOffs(104, 49).addBox(-1.2F, -1.65F, -0.8F, 2.4F, 1.65F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 6.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Wooleyes = body.addOrReplaceChild("mut1_wooleyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 2.0F, -7.0F));
        PartDefinition mut1WooleyesE0 = mut1Wooleyes.addOrReplaceChild("mut1_wooleyes_e0",
                CubeListBuilder.create()
                        .texOffs(66, 42).addBox(-1.43F, -1.43F, -1.7732F, 2.86F, 2.86F, 1.7732F)
                        .texOffs(77, 42).addBox(-1.7732F, -1.7732F, -0.858F, 3.5464F, 3.5464F, 1.144F),
                PartPose.offsetAndRotation(-4.2F, 0.0F, -0.24F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1WooleyesE1 = mut1Wooleyes.addOrReplaceChild("mut1_wooleyes_e1",
                CubeListBuilder.create()
                        .texOffs(107, 55).addBox(-0.9996F, -0.9996F, -1.2396F, 1.9993F, 1.9993F, 1.2396F)
                        .texOffs(114, 55).addBox(-1.2396F, -1.2396F, -0.5998F, 2.4791F, 2.4791F, 0.7997F),
                PartPose.offsetAndRotation(-2.52F, 1.2172F, -0.3414F, 0.0F, -0.2723F, 0.236F));
        PartDefinition mut1WooleyesE2 = mut1Wooleyes.addOrReplaceChild("mut1_wooleyes_e2",
                CubeListBuilder.create()
                        .texOffs(88, 42).addBox(-1.4136F, -1.4136F, -1.7529F, 2.8272F, 2.8272F, 1.7529F)
                        .texOffs(99, 42).addBox(-1.7529F, -1.7529F, -0.8482F, 3.5057F, 3.5057F, 1.1309F),
                PartPose.offsetAndRotation(-0.84F, -1.7934F, -0.3895F, 0.0F, -0.0908F, -0.3478F));
        PartDefinition mut1WooleyesE3 = mut1Wooleyes.addOrReplaceChild("mut1_wooleyes_e3",
                CubeListBuilder.create()
                        .texOffs(121, 55).addBox(-1.1227F, -1.1227F, -1.3922F, 2.2454F, 2.2454F, 1.3922F)
                        .texOffs(113, 49).addBox(-1.3922F, -1.3922F, -0.6736F, 2.7843F, 2.7843F, 0.8982F),
                PartPose.offsetAndRotation(0.84F, 1.4253F, -0.3588F, 0.0F, 0.0908F, 0.2764F));
        PartDefinition mut1WooleyesE4 = mut1Wooleyes.addOrReplaceChild("mut1_wooleyes_e4",
                CubeListBuilder.create()
                        .texOffs(110, 42).addBox(-1.3655F, -1.3655F, -1.6932F, 2.731F, 2.731F, 1.6932F)
                        .texOffs(0, 55).addBox(-1.6932F, -1.6932F, -0.8193F, 3.3864F, 3.3864F, 1.0924F),
                PartPose.offsetAndRotation(2.52F, -0.3067F, -0.2656F, 0.0F, 0.2723F, -0.0595F));
        PartDefinition mut1WooleyesE5 = mut1Wooleyes.addOrReplaceChild("mut1_wooleyes_e5",
                CubeListBuilder.create()
                        .texOffs(9, 55).addBox(-1.2334F, -1.2334F, -1.5294F, 2.4668F, 2.4668F, 1.5294F)
                        .texOffs(18, 55).addBox(-1.5294F, -1.5294F, -0.74F, 3.0588F, 3.0588F, 0.9867F),
                PartPose.offsetAndRotation(4.2F, -0.9734F, -0.3211F, 0.0F, 0.4538F, -0.1888F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(0, 33).addBox(-1.14F, 0.0F, -1.14F, 2.28F, 5.7F, 2.28F),
                PartPose.offsetAndRotation(4.8F, 3.0F, -4.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(9, 33).addBox(-0.95F, 0.0F, -0.95F, 1.9F, 5.7F, 1.9F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(84, 49).addBox(-1.33F, 0.0F, -0.855F, 2.66F, 2.09F, 1.71F),
                PartPose.offsetAndRotation(0.0F, 5.7F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(76, 60).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-1.045F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(50, 64).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(55, 64).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(81, 60).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(-0.3325F, 2.09F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(60, 64).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(65, 64).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(86, 60).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(0.38F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(70, 64).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(75, 64).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(91, 60).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.52F, 1.0F),
                PartPose.offsetAndRotation(1.0925F, 2.09F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(80, 64).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.4096F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(85, 64).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3072F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.4096F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(90, 64).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.425F, 1.0F),
                PartPose.offsetAndRotation(-1.33F, 0.95F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(95, 64).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3138F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.425F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(51, 23).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 5.28F, 4.0F),
                PartPose.offset(3.0F, 12.0F, -5.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(113, 23).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 4.56F, 3.6F),
                PartPose.offset(0.0F, 5.28F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(75, 33).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.16F, 4.6F),
                PartPose.offset(0.0F, 4.56F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedChickenLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition legL = root.addOrReplaceChild("leg_l",
                CubeListBuilder.create()
                        .texOffs(100, 0).addBox(-1.0F, 0.0F, -3.0F, 3.0F, 5.0F, 3.0F),
                PartPose.offset(1.0F, 19.0F, 1.0F));
        PartDefinition legR = root.addOrReplaceChild("leg_r",
                CubeListBuilder.create()
                        .texOffs(113, 0).addBox(-1.0F, 0.0F, -3.0F, 3.0F, 5.0F, 3.0F),
                PartPose.offset(-2.0F, 19.0F, 1.0F));
        PartDefinition rightWing = root.addOrReplaceChild("right_wing",
                CubeListBuilder.create()
                        .texOffs(40, 0).addBox(0.0F, 0.0F, -3.0F, 1.0F, 4.0F, 6.0F),
                PartPose.offset(-4.0F, 13.0F, 0.0F));
        PartDefinition mut2Pinion = rightWing.addOrReplaceChild("mut2_pinion",
                CubeListBuilder.create()
                        .texOffs(85, 0).addBox(0.0F, -1.5F, -3.0F, 0.9F, 3.0F, 6.0F),
                PartPose.offset(-0.8F, 2.5F, 2.0F));
        PartDefinition mut2PinionRib0 = mut2Pinion.addOrReplaceChild("mut2_pinion_rib0",
                CubeListBuilder.create()
                        .texOffs(111, 24).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 2.76F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.26F, -2.4F, 0.0F, 0.0F, -0.2443F));
        PartDefinition mut2PinionRib1 = mut2Pinion.addOrReplaceChild("mut2_pinion_rib1",
                CubeListBuilder.create()
                        .texOffs(78, 29).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 2.42F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.26F, -0.8F, 0.0F, 0.0F, -0.4189F));
        PartDefinition mut2PinionRib2 = mut2Pinion.addOrReplaceChild("mut2_pinion_rib2",
                CubeListBuilder.create()
                        .texOffs(83, 29).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 2.08F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.26F, 0.8F, 0.0F, 0.0F, -0.5934F));
        PartDefinition mut2PinionRib3 = mut2Pinion.addOrReplaceChild("mut2_pinion_rib3",
                CubeListBuilder.create()
                        .texOffs(88, 29).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 1.74F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.26F, 2.4F, 0.0F, 0.0F, -0.7679F));
        PartDefinition mut2PinionPelt = mut2Pinion.addOrReplaceChild("mut2_pinion_pelt",
                CubeListBuilder.create()
                        .texOffs(11, 15).addBox(-1.1F, 0.0F, -1.8F, 1.2F, 2.16F, 3.6F),
                PartPose.offsetAndRotation(-0.5F, 1.32F, 0.72F, 0.0F, 0.0F, -0.5934F));
        PartDefinition mut2PinionPelt2 = mut2PinionPelt.addOrReplaceChild("mut2_pinion_pelt2",
                CubeListBuilder.create()
                        .texOffs(16, 29).addBox(-0.9F, 0.0F, -1.2F, 1.0F, 1.26F, 2.4F),
                PartPose.offsetAndRotation(0.0F, 2.1F, 0.0F, 0.0F, 0.0F, -0.3491F));
        PartDefinition leftWing = root.addOrReplaceChild("left_wing",
                CubeListBuilder.create()
                        .texOffs(55, 0).addBox(-1.0F, 0.0F, -3.0F, 1.0F, 4.0F, 6.0F),
                PartPose.offset(4.0F, 13.0F, 0.0F));
        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 16.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(70, 0).addBox(-2.0F, -6.0F, -2.0F, 4.0F, 6.0F, 3.0F),
                PartPose.offset(0.0F, -1.0F, -4.0F));
        PartDefinition beak = head.addOrReplaceChild("beak",
                CubeListBuilder.create()
                        .texOffs(0, 24).addBox(-2.0F, -4.0F, -4.0F, 4.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition redThing = head.addOrReplaceChild("red_thing",
                CubeListBuilder.create()
                        .texOffs(24, 24).addBox(-1.0F, -2.0F, -3.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = redThing.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(113, 29).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(-1.4F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(33, 24).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(118, 29).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(-0.4667F, 0.0F, -0.2667F, -0.3142F, -0.1513F, -0.1745F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(42, 24).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(123, 29).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(0.4667F, 0.0F, -0.2667F, -0.3142F, 0.1513F, 0.1745F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(51, 24).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(0, 33).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(1.4F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(60, 24).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(49, 15).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(-1.16F, 1.8F, -2.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(60, 15).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(5, 33).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-1.16F, -0.36F, -2.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(71, 15).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(1.16F, 1.8F, -2.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(82, 15).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(16, 33).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(1.16F, -0.36F, -2.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(9, 29).addBox(-0.825F, -0.825F, -1.4025F, 1.65F, 1.65F, 1.4025F),
                PartPose.offsetAndRotation(-1.2F, -1.5F, -2.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(27, 33).addBox(-0.675F, -0.675F, -1.1475F, 1.35F, 1.35F, 1.1475F),
                PartPose.offsetAndRotation(1.36F, -1.92F, -2.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(13, 24).addBox(-1.68F, -1.2F, -1.6F, 3.36F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 3.96F, -2.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(32, 33).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-1.36F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(58, 29).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(-0.4533F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(63, 29).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(0.4533F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(37, 33).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(1.36F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(36, 15).addBox(-1.6F, 0.0F, -3.0F, 3.2F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 4.2F, -1.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(42, 33).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-1.28F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(68, 29).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(-0.4267F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(73, 29).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(0.4267F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(47, 33).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(1.28F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(0, 29).addBox(-1.04F, -0.2F, -1.4F, 2.08F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(116, 24).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, -3.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(93, 29).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(98, 29).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(103, 29).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue3.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(108, 29).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 2.0F, -3.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(30, 29).addBox(-1.1F, -1.1F, -1.364F, 2.2F, 2.2F, 1.364F)
                        .texOffs(69, 24).addBox(-1.364F, -1.364F, -0.66F, 2.728F, 2.728F, 0.88F),
                PartPose.offsetAndRotation(-1.6F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(37, 29).addBox(-0.769F, -0.769F, -0.9535F, 1.5379F, 1.5379F, 0.9535F)
                        .texOffs(44, 29).addBox(-0.9535F, -0.9535F, -0.4614F, 1.907F, 1.907F, 0.6152F),
                PartPose.offsetAndRotation(0.0F, 0.9467F, -0.5691F, 0.0F, 0.0F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(51, 29).addBox(-1.0874F, -1.0874F, -1.3484F, 2.1748F, 2.1748F, 1.3484F)
                        .texOffs(78, 24).addBox(-1.3484F, -1.3484F, -0.6524F, 2.6967F, 2.6967F, 0.8699F),
                PartPose.offsetAndRotation(1.6F, -1.3949F, -0.6491F, 0.0F, 0.4538F, -0.3478F));
        PartDefinition bodyShell = body.addOrReplaceChild("body_shell",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-3.0F, -4.0F, -3.0F, 6.0F, 8.0F, 6.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 1.571F, 0.0F, 0.0F));
        PartDefinition mut1Breast = body.addOrReplaceChild("mut1_breast",
                CubeListBuilder.create()
                        .texOffs(25, 0).addBox(-0.9F, -2.5F, -3.0F, 0.9F, 5.0F, 6.0F),
                PartPose.offset(0.0F, 3.0F, -4.2F));
        PartDefinition mut1BreastRib0 = mut1Breast.addOrReplaceChild("mut1_breast_rib0",
                CubeListBuilder.create()
                        .texOffs(31, 15).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 4.6F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.1F, -2.4F, 0.0F, 0.0F, 0.2443F));
        PartDefinition mut1BreastRib1 = mut1Breast.addOrReplaceChild("mut1_breast_rib1",
                CubeListBuilder.create()
                        .texOffs(104, 15).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 4.175F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.1F, -1.2F, 0.0F, 0.0F, 0.3752F));
        PartDefinition mut1BreastRib2 = mut1Breast.addOrReplaceChild("mut1_breast_rib2",
                CubeListBuilder.create()
                        .texOffs(109, 15).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.75F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.1F, 0.0F, 0.0F, 0.0F, 0.5061F));
        PartDefinition mut1BreastRib3 = mut1Breast.addOrReplaceChild("mut1_breast_rib3",
                CubeListBuilder.create()
                        .texOffs(101, 24).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.325F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.1F, 1.2F, 0.0F, 0.0F, 0.637F));
        PartDefinition mut1BreastRib4 = mut1Breast.addOrReplaceChild("mut1_breast_rib4",
                CubeListBuilder.create()
                        .texOffs(106, 24).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 2.9F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.1F, 2.4F, 0.0F, 0.0F, 0.7679F));
        PartDefinition mut1BreastGut = mut1Breast.addOrReplaceChild("mut1_breast_gut",
                CubeListBuilder.create()
                        .texOffs(93, 15).addBox(-0.5F, 0.0F, -1.56F, 1.6F, 2.0F, 3.12F),
                PartPose.offset(0.9F, 0.3F, 0.0F));
        PartDefinition mut1BreastGut2 = mut1BreastGut.addOrReplaceChild("mut1_breast_gut2",
                CubeListBuilder.create()
                        .texOffs(87, 24).addBox(-0.4F, 0.0F, -0.96F, 1.2F, 1.5F, 1.92F),
                PartPose.offsetAndRotation(0.0F, 1.7F, 0.0F, 0.0F, 0.0F, -0.3142F));
        PartDefinition mut1BreastPelt = mut1Breast.addOrReplaceChild("mut1_breast_pelt",
                CubeListBuilder.create()
                        .texOffs(0, 15).addBox(-0.1F, 0.0F, -1.8F, 1.2F, 3.6F, 3.6F),
                PartPose.offsetAndRotation(0.5F, 2.2F, 0.72F, 0.0F, 0.0F, 0.5934F));
        PartDefinition mut1BreastPelt2 = mut1BreastPelt.addOrReplaceChild("mut1_breast_pelt2",
                CubeListBuilder.create()
                        .texOffs(94, 24).addBox(-0.1F, 0.0F, -1.2F, 1.0F, 2.1F, 2.4F),
                PartPose.offsetAndRotation(0.0F, 3.5F, 0.0F, 0.0F, 0.0F, 0.3491F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(22, 15).addBox(-0.84F, 0.0F, -0.84F, 1.68F, 4.2F, 1.68F),
                PartPose.offsetAndRotation(3.2F, 2.0F, -2.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(114, 15).addBox(-0.7F, 0.0F, -0.7F, 1.4F, 4.2F, 1.4F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(23, 29).addBox(-0.98F, 0.0F, -0.63F, 1.96F, 1.54F, 1.26F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(52, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(-0.77F, 1.54F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(57, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(62, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(67, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(-0.245F, 1.54F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(72, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(77, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(82, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(0.28F, 1.54F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(87, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(92, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(97, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(0.805F, 1.54F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(102, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(107, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(112, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.05F, 1.0F),
                PartPose.offsetAndRotation(-0.98F, 0.7F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(117, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9681F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.05F, 0.0F, 0.3491F, 0.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedSpiderLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(97, 0).addBox(-3.0F, -3.0F, -3.0F, 6.0F, 6.0F, 6.0F),
                PartPose.offset(0.0F, 15.0F, 0.0F));
        PartDefinition abdomen = body.addOrReplaceChild("abdomen",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-5.0F, -4.0F, -6.0F, 10.0F, 8.0F, 12.0F),
                PartPose.offset(0.0F, 0.0F, 9.0F));
        PartDefinition mut1Sac = abdomen.addOrReplaceChild("mut1_sac",
                CubeListBuilder.create()
                        .texOffs(36, 21).addBox(-3.5F, -3.0F, -0.96F, 7.0F, 6.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, 4.0F));
        PartDefinition mut1SacFlapR = mut1Sac.addOrReplaceChild("mut1_sac_flap_r",
                CubeListBuilder.create()
                        .texOffs(55, 21).addBox(-3.85F, -3.0F, -1.0F, 3.85F, 6.0F, 1.6F),
                PartPose.offsetAndRotation(-3.5F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1SacFlapL = mut1Sac.addOrReplaceChild("mut1_sac_flap_l",
                CubeListBuilder.create()
                        .texOffs(68, 21).addBox(0.0F, -3.0F, -1.0F, 3.85F, 6.0F, 1.6F),
                PartPose.offsetAndRotation(3.5F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1SacStrand0 = mut1Sac.addOrReplaceChild("mut1_sac_strand0",
                CubeListBuilder.create()
                        .texOffs(18, 60).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(-1.75F, -2.1F, -1.08F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1SacStrand1 = mut1Sac.addOrReplaceChild("mut1_sac_strand1",
                CubeListBuilder.create()
                        .texOffs(23, 60).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.2F, -1.08F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1SacStrand2 = mut1Sac.addOrReplaceChild("mut1_sac_strand2",
                CubeListBuilder.create()
                        .texOffs(28, 60).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.3F, 1.0F),
                PartPose.offsetAndRotation(1.75F, -0.3F, -1.08F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1SacEyes = mut1Sac.addOrReplaceChild("mut1_sac_eyes",
                CubeListBuilder.create()
                        .texOffs(40, 55).addBox(-2.24F, -1.68F, -0.6F, 4.48F, 3.36F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -1.08F));
        PartDefinition mut2Carapace = abdomen.addOrReplaceChild("mut2_carapace",
                CubeListBuilder.create()
                        .texOffs(78, 0).addBox(-0.9F, -3.0F, -4.0F, 0.9F, 6.0F, 8.0F),
                PartPose.offset(4.0F, 0.0F, 0.0F));
        PartDefinition mut2CarapaceRib0 = mut2Carapace.addOrReplaceChild("mut2_carapace_rib0",
                CubeListBuilder.create()
                        .texOffs(81, 21).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 5.52F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, -3.2F, 0.0F, 0.0F, 0.2443F));
        PartDefinition mut2CarapaceRib1 = mut2Carapace.addOrReplaceChild("mut2_carapace_rib1",
                CubeListBuilder.create()
                        .texOffs(36, 32).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 5.01F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, -1.6F, 0.0F, 0.0F, 0.3752F));
        PartDefinition mut2CarapaceRib2 = mut2Carapace.addOrReplaceChild("mut2_carapace_rib2",
                CubeListBuilder.create()
                        .texOffs(0, 39).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 4.5F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, 0.0F, 0.0F, 0.0F, 0.5061F));
        PartDefinition mut2CarapaceRib3 = mut2Carapace.addOrReplaceChild("mut2_carapace_rib3",
                CubeListBuilder.create()
                        .texOffs(5, 39).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.99F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, 1.6F, 0.0F, 0.0F, 0.637F));
        PartDefinition mut2CarapaceRib4 = mut2Carapace.addOrReplaceChild("mut2_carapace_rib4",
                CubeListBuilder.create()
                        .texOffs(33, 60).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.48F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, 3.2F, 0.0F, 0.0F, 0.7679F));
        PartDefinition mut2CarapacePelt = mut2Carapace.addOrReplaceChild("mut2_carapace_pelt",
                CubeListBuilder.create()
                        .texOffs(23, 21).addBox(-0.1F, 0.0F, -2.4F, 1.2F, 4.32F, 4.8F),
                PartPose.offsetAndRotation(0.5F, 2.64F, 0.96F, 0.0F, 0.0F, 0.5934F));
        PartDefinition mut2CarapacePelt2 = mut2CarapacePelt.addOrReplaceChild("mut2_carapace_pelt2",
                CubeListBuilder.create()
                        .texOffs(112, 21).addBox(-0.1F, 0.0F, -1.6F, 1.0F, 2.52F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, 0.0F, 0.0F, 0.3491F));
        PartDefinition mut1Bulb = abdomen.addOrReplaceChild("mut1_bulb",
                CubeListBuilder.create()
                        .texOffs(0, 21).addBox(-2.5F, -2.0F, -3.0F, 5.0F, 4.0F, 6.0F),
                PartPose.offset(0.0F, -4.5F, 0.0F));
        PartDefinition mut1BulbCore = mut1Bulb.addOrReplaceChild("mut1_bulb_core",
                CubeListBuilder.create()
                        .texOffs(82, 32).addBox(-1.25F, -1.0F, -1.5F, 2.5F, 2.0F, 3.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut2LegsR0 = abdomen.addOrReplaceChild("mut2_legs_r0",
                CubeListBuilder.create()
                        .texOffs(0, 32).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 4.1667F, 1.8F),
                PartPose.offsetAndRotation(-4.5F, 0.0F, 2.0F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2LegsR01 = mut2LegsR0.addOrReplaceChild("mut2_legs_r0_1",
                CubeListBuilder.create()
                        .texOffs(10, 39).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.7268F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 4.1667F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR02 = mut2LegsR01.addOrReplaceChild("mut2_legs_r0_2",
                CubeListBuilder.create()
                        .texOffs(43, 60).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.3333F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.7268F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR1 = abdomen.addOrReplaceChild("mut2_legs_r1",
                CubeListBuilder.create()
                        .texOffs(9, 32).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 4.1667F, 1.8F),
                PartPose.offsetAndRotation(-4.5F, 0.0F, 5.4F, 0.0F, -0.2094F, -1.0123F));
        PartDefinition mut2LegsR11 = mut2LegsR1.addOrReplaceChild("mut2_legs_r1_1",
                CubeListBuilder.create()
                        .texOffs(15, 39).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.7268F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 4.1667F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsR12 = mut2LegsR11.addOrReplaceChild("mut2_legs_r1_2",
                CubeListBuilder.create()
                        .texOffs(48, 60).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.3333F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.7268F, 0.0F, 0.0F, 0.0F, 1.117F));
        PartDefinition mut2LegsL0 = abdomen.addOrReplaceChild("mut2_legs_l0",
                CubeListBuilder.create()
                        .texOffs(18, 32).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 4.1667F, 1.8F),
                PartPose.offsetAndRotation(4.5F, 0.0F, 2.0F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2LegsL01 = mut2LegsL0.addOrReplaceChild("mut2_legs_l0_1",
                CubeListBuilder.create()
                        .texOffs(20, 39).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.7268F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 4.1667F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL02 = mut2LegsL01.addOrReplaceChild("mut2_legs_l0_2",
                CubeListBuilder.create()
                        .texOffs(53, 60).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.3333F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.7268F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL1 = abdomen.addOrReplaceChild("mut2_legs_l1",
                CubeListBuilder.create()
                        .texOffs(27, 32).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 4.1667F, 1.8F),
                PartPose.offsetAndRotation(4.5F, 0.0F, 5.4F, 0.0F, 0.2094F, 1.0123F));
        PartDefinition mut2LegsL11 = mut2LegsL1.addOrReplaceChild("mut2_legs_l1_1",
                CubeListBuilder.create()
                        .texOffs(25, 39).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.7268F, 1.44F),
                PartPose.offsetAndRotation(0.0F, 4.1667F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition mut2LegsL12 = mut2LegsL11.addOrReplaceChild("mut2_legs_l1_2",
                CubeListBuilder.create()
                        .texOffs(58, 60).addBox(-0.576F, 0.0F, -0.576F, 1.152F, 3.3333F, 1.152F),
                PartPose.offsetAndRotation(0.0F, 3.7268F, 0.0F, 0.0F, 0.0F, -1.117F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(45, 0).addBox(-4.0F, -4.0F, -8.0F, 8.0F, 8.0F, 8.0F),
                PartPose.offset(0.0F, 0.0F, -3.0F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(60, 32).addBox(-2.108F, -2.108F, -0.9F, 4.216F, 4.216F, 1.0F),
                PartPose.offsetAndRotation(-2.32F, 2.4F, -3.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(86, 21).addBox(-1.7F, -1.7F, -2.72F, 3.4F, 3.4F, 2.72F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(62, 65).addBox(-2.38F, -0.9F, -1.2F, 4.76F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-2.32F, -0.048F, -3.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(71, 32).addBox(-2.108F, -2.108F, -0.9F, 4.216F, 4.216F, 1.0F),
                PartPose.offsetAndRotation(2.32F, 2.4F, -3.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(99, 21).addBox(-1.7F, -1.7F, -2.72F, 3.4F, 3.4F, 2.72F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(75, 65).addBox(-2.38F, -0.9F, -1.2F, 4.76F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(2.32F, -0.048F, -3.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(51, 55).addBox(-0.935F, -0.935F, -1.5895F, 1.87F, 1.87F, 1.5895F),
                PartPose.offsetAndRotation(-2.4F, -2.0F, -3.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(96, 60).addBox(-0.765F, -0.765F, -1.3005F, 1.53F, 1.53F, 1.3005F),
                PartPose.offsetAndRotation(2.72F, -2.56F, -3.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceSpare2 = face.addOrReplaceChild("face_spare2",
                CubeListBuilder.create()
                        .texOffs(88, 65).addBox(-0.68F, -0.68F, -1.156F, 1.36F, 1.36F, 1.156F),
                PartPose.offsetAndRotation(0.0F, -4.0F, -3.7F, 0.0F, 0.0F, -0.363F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(21, 55).addBox(-3.36F, -1.2F, -1.6F, 6.72F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 5.28F, -3.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(93, 65).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-2.72F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(7, 65).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.6F, 0.9F),
                PartPose.offsetAndRotation(-1.632F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0838F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(12, 65).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.8F, 0.9F),
                PartPose.offsetAndRotation(-0.544F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0279F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(17, 65).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.8F, 0.9F),
                PartPose.offsetAndRotation(0.544F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0279F));
        PartDefinition faceUt4 = faceMaw.addOrReplaceChild("face_ut4",
                CubeListBuilder.create()
                        .texOffs(22, 65).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.6F, 0.9F),
                PartPose.offsetAndRotation(1.632F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0838F));
        PartDefinition faceUt5 = faceMaw.addOrReplaceChild("face_ut5",
                CubeListBuilder.create()
                        .texOffs(98, 65).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(2.72F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(41, 32).addBox(-3.2F, 0.0F, -3.0F, 6.4F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 5.6F, -2.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(103, 65).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-2.56F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(108, 65).addBox(-0.4F, -1.46F, -0.4F, 0.8F, 1.46F, 0.8F),
                PartPose.offsetAndRotation(-1.536F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0838F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(27, 65).addBox(-0.4F, -1.62F, -0.4F, 0.8F, 1.62F, 0.8F),
                PartPose.offsetAndRotation(-0.512F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0279F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(32, 65).addBox(-0.4F, -1.62F, -0.4F, 0.8F, 1.62F, 0.8F),
                PartPose.offsetAndRotation(0.512F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0279F));
        PartDefinition faceLt4 = faceJaw.addOrReplaceChild("face_lt4",
                CubeListBuilder.create()
                        .texOffs(113, 65).addBox(-0.4F, -1.46F, -0.4F, 0.8F, 1.46F, 0.8F),
                PartPose.offsetAndRotation(1.536F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0838F));
        PartDefinition faceLt5 = faceJaw.addOrReplaceChild("face_lt5",
                CubeListBuilder.create()
                        .texOffs(118, 65).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(2.56F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(83, 60).addBox(-2.08F, -0.2F, -1.4F, 4.16F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(38, 60).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0F, -7.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(37, 65).addBox(-0.528F, 0.0F, -0.5F, 1.056F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(42, 65).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(47, 65).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(52, 65).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue4.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(57, 65).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2Stalks = head.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -3.5F, -5.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(63, 60).addBox(-0.5F, -2.8F, -0.5F, 1.0F, 2.8F, 1.0F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(60, 55).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.8F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(68, 60).addBox(-0.5F, -2.8F, -0.5F, 1.0F, 2.8F, 1.0F),
                PartPose.offsetAndRotation(-1.0F, 0.0F, -0.2667F, -0.3142F, -0.1513F, -0.1745F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(69, 55).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.8F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(73, 60).addBox(-0.5F, -2.8F, -0.5F, 1.0F, 2.8F, 1.0F),
                PartPose.offsetAndRotation(1.0F, 0.0F, -0.2667F, -0.3142F, 0.1513F, 0.1745F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(78, 55).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.8F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(78, 60).addBox(-0.5F, -2.8F, -0.5F, 1.0F, 2.8F, 1.0F),
                PartPose.offsetAndRotation(3.0F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(87, 55).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.8F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -1.0F, -8.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(93, 32).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(96, 55).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-3.4F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(103, 60).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(110, 60).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-2.04F, 1.7581F, -0.5691F, 0.0F, -0.2723F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(104, 32).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(105, 55).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(-0.68F, -2.5905F, -0.6491F, 0.0F, -0.0908F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(117, 60).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(114, 55).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(0.68F, 2.0588F, -0.598F, 0.0F, 0.0908F, 0.2764F));
        PartDefinition mut1EyesE4 = mut1Eyes.addOrReplaceChild("mut1_eyes_e4",
                CubeListBuilder.create()
                        .texOffs(115, 32).addBox(-1.2604F, -1.2604F, -1.563F, 2.5209F, 2.5209F, 1.563F)
                        .texOffs(0, 60).addBox(-1.563F, -1.563F, -0.7563F, 3.1259F, 3.1259F, 1.0084F),
                PartPose.offsetAndRotation(2.04F, -0.443F, -0.4426F, 0.0F, 0.2723F, -0.0595F));
        PartDefinition mut1EyesE5 = mut1Eyes.addOrReplaceChild("mut1_eyes_e5",
                CubeListBuilder.create()
                        .texOffs(0, 65).addBox(-1.1385F, -1.1385F, -1.4118F, 2.277F, 2.277F, 1.4118F)
                        .texOffs(9, 60).addBox(-1.4118F, -1.4118F, -0.6831F, 2.8235F, 2.8235F, 0.9108F),
                PartPose.offsetAndRotation(3.4F, -1.406F, -0.5352F, 0.0F, 0.4538F, -0.1888F));
        PartDefinition legR0 = body.addOrReplaceChild("leg_r0",
                CubeListBuilder.create()
                        .texOffs(92, 45).addBox(-8.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-4.0F, 0.0F, -1.0F, 0.0F, 0.6283F, 0.8378F));
        PartDefinition legR02 = legR0.addOrReplaceChild("leg_r0_2",
                CubeListBuilder.create()
                        .texOffs(30, 39).addBox(-9.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-8.0F, 0.0F, 0.0F, 0.0F, 0.0F, -1.3963F));
        PartDefinition legR1 = body.addOrReplaceChild("leg_r1",
                CubeListBuilder.create()
                        .texOffs(0, 50).addBox(-8.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-4.0F, 0.0F, 1.6F, 0.0F, 0.2094F, 0.8378F));
        PartDefinition legR12 = legR1.addOrReplaceChild("leg_r1_2",
                CubeListBuilder.create()
                        .texOffs(53, 39).addBox(-9.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-8.0F, 0.0F, 0.0F, 0.0F, 0.0F, -1.3963F));
        PartDefinition legR2 = body.addOrReplaceChild("leg_r2",
                CubeListBuilder.create()
                        .texOffs(21, 50).addBox(-8.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-4.0F, 0.0F, 4.2F, 0.0F, -0.2094F, 0.8378F));
        PartDefinition legR22 = legR2.addOrReplaceChild("leg_r2_2",
                CubeListBuilder.create()
                        .texOffs(76, 39).addBox(-9.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-8.0F, 0.0F, 0.0F, 0.0F, 0.0F, -1.3963F));
        PartDefinition legR3 = body.addOrReplaceChild("leg_r3",
                CubeListBuilder.create()
                        .texOffs(42, 50).addBox(-8.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-4.0F, 0.0F, 6.8F, 0.0F, -0.6283F, 0.8378F));
        PartDefinition legR32 = legR3.addOrReplaceChild("leg_r3_2",
                CubeListBuilder.create()
                        .texOffs(99, 39).addBox(-9.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-8.0F, 0.0F, 0.0F, 0.0F, 0.0F, -1.3963F));
        PartDefinition legL0 = body.addOrReplaceChild("leg_l0",
                CubeListBuilder.create()
                        .texOffs(63, 50).addBox(0.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(4.0F, 0.0F, -1.0F, 0.0F, -0.6283F, -0.8378F));
        PartDefinition legL02 = legL0.addOrReplaceChild("leg_l0_2",
                CubeListBuilder.create()
                        .texOffs(0, 45).addBox(0.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(8.0F, 0.0F, 0.0F, 0.0F, 0.0F, 1.3963F));
        PartDefinition legL1 = body.addOrReplaceChild("leg_l1",
                CubeListBuilder.create()
                        .texOffs(84, 50).addBox(0.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(4.0F, 0.0F, 1.6F, 0.0F, -0.2094F, -0.8378F));
        PartDefinition legL12 = legL1.addOrReplaceChild("leg_l1_2",
                CubeListBuilder.create()
                        .texOffs(23, 45).addBox(0.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(8.0F, 0.0F, 0.0F, 0.0F, 0.0F, 1.3963F));
        PartDefinition legL2 = body.addOrReplaceChild("leg_l2",
                CubeListBuilder.create()
                        .texOffs(105, 50).addBox(0.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(4.0F, 0.0F, 4.2F, 0.0F, 0.2094F, -0.8378F));
        PartDefinition legL22 = legL2.addOrReplaceChild("leg_l2_2",
                CubeListBuilder.create()
                        .texOffs(46, 45).addBox(0.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(8.0F, 0.0F, 0.0F, 0.0F, 0.0F, 1.3963F));
        PartDefinition legL3 = body.addOrReplaceChild("leg_l3",
                CubeListBuilder.create()
                        .texOffs(0, 55).addBox(0.0F, -1.0F, -1.0F, 8.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(4.0F, 0.0F, 6.8F, 0.0F, 0.6283F, -0.8378F));
        PartDefinition legL32 = legL3.addOrReplaceChild("leg_l3_2",
                CubeListBuilder.create()
                        .texOffs(69, 45).addBox(0.0F, -1.0F, -1.0F, 9.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(8.0F, 0.0F, 0.0F, 0.0F, 0.0F, 1.3963F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedCaskLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(47, 17).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 2.64F, 4.0F),
                PartPose.offset(-2.0F, 18.0F, -4.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(17, 36).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 2.28F, 3.6F),
                PartPose.offset(0.0F, 2.64F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(36, 28).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.08F, 4.6F),
                PartPose.offset(0.0F, 2.28F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(112, 28).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 2.4F, 4.0F),
                PartPose.offset(-2.0F, 18.0F, 4.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(81, 17).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 2.52F, 3.6F),
                PartPose.offset(0.0F, 2.4F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(55, 28).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.08F, 4.6F),
                PartPose.offset(0.0F, 2.52F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(0, 36).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 2.4F, 4.0F),
                PartPose.offset(2.0F, 18.0F, 4.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(96, 17).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 2.52F, 3.6F),
                PartPose.offset(0.0F, 2.4F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(74, 28).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.08F, 4.6F),
                PartPose.offset(0.0F, 2.52F, 0.0F));
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
                        .texOffs(47, 36).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(-2.32F, 2.4F, -7.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(111, 17).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(20, 54).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-2.32F, -0.5952F, -7.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(60, 36).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(2.32F, 2.4F, -7.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(0, 28).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(35, 54).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(2.32F, -0.5952F, -7.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(92, 43).addBox(-1.144F, -1.144F, -1.9448F, 2.288F, 2.288F, 1.9448F),
                PartPose.offsetAndRotation(-2.4F, -2.0F, -7.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(101, 43).addBox(-0.936F, -0.936F, -1.5912F, 1.872F, 1.872F, 1.5912F),
                PartPose.offsetAndRotation(2.72F, -2.56F, -7.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceSpare2 = face.addOrReplaceChild("face_spare2",
                CubeListBuilder.create()
                        .texOffs(65, 49).addBox(-0.832F, -0.832F, -1.4144F, 1.664F, 1.664F, 1.4144F),
                PartPose.offsetAndRotation(0.0F, -4.0F, -7.7F, 0.0F, 0.0F, -0.363F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(62, 43).addBox(-3.36F, -1.2F, -1.6F, 6.72F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 5.28F, -7.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(50, 54).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-2.72F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(93, 49).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(-1.36F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(98, 49).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.9F, 0.9F),
                PartPose.offset(0.0F, 0.4F, -0.9F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(103, 49).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(1.36F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceUt4 = faceMaw.addOrReplaceChild("face_ut4",
                CubeListBuilder.create()
                        .texOffs(55, 54).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(2.72F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(88, 36).addBox(-3.2F, 0.0F, -3.0F, 6.4F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 5.6F, -6.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(60, 54).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-2.56F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(108, 49).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(-1.28F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(113, 49).addBox(-0.4F, -1.7F, -0.4F, 0.8F, 1.7F, 0.8F),
                PartPose.offset(0.0F, 0.1F, -2.4F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(118, 49).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(1.28F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceLt4 = faceJaw.addOrReplaceChild("face_lt4",
                CubeListBuilder.create()
                        .texOffs(65, 54).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(2.56F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(52, 49).addBox(-2.08F, -0.2F, -1.4F, 4.16F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(27, 49).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, -4.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(123, 49).addBox(-0.528F, 0.0F, -0.5F, 1.056F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(0, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(5, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(10, 54).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue4.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(15, 54).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 3.0F, -4.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(118, 36).addBox(-1.43F, -1.43F, -1.7732F, 2.86F, 2.86F, 1.7732F)
                        .texOffs(0, 43).addBox(-1.7732F, -1.7732F, -0.858F, 3.5464F, 3.5464F, 1.144F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(72, 49).addBox(-0.9996F, -0.9996F, -1.2396F, 1.9993F, 1.9993F, 1.2396F)
                        .texOffs(79, 49).addBox(-1.2396F, -1.2396F, -0.5998F, 2.4791F, 2.4791F, 0.7997F),
                PartPose.offsetAndRotation(-1.0F, 2.0286F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(11, 43).addBox(-1.4136F, -1.4136F, -1.7529F, 2.8272F, 2.8272F, 1.7529F)
                        .texOffs(22, 43).addBox(-1.7529F, -1.7529F, -0.8482F, 3.5057F, 3.5057F, 1.1309F),
                PartPose.offsetAndRotation(1.0F, -2.989F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(86, 49).addBox(-1.1227F, -1.1227F, -1.3922F, 2.2454F, 2.2454F, 1.3922F)
                        .texOffs(18, 49).addBox(-1.3922F, -1.3922F, -0.6736F, 2.7843F, 2.7843F, 0.8982F),
                PartPose.offsetAndRotation(3.0F, 2.3755F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition mut1Cask = body.addOrReplaceChild("mut1_cask",
                CubeListBuilder.create()
                        .texOffs(79, 0).addBox(-3.0F, -4.0F, -1.04F, 6.0F, 8.0F, 2.6F),
                PartPose.offset(0.0F, 6.0F, -2.0F));
        PartDefinition mut1CaskFlapR = mut1Cask.addOrReplaceChild("mut1_cask_flap_r",
                CubeListBuilder.create()
                        .texOffs(111, 0).addBox(-3.3F, -4.0F, -1.0F, 3.3F, 8.0F, 1.6F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, 0.0F, 0.0F, -0.4887F, 0.0F));
        PartDefinition mut1CaskFlapL = mut1Cask.addOrReplaceChild("mut1_cask_flap_l",
                CubeListBuilder.create()
                        .texOffs(0, 17).addBox(0.0F, -4.0F, -1.0F, 3.3F, 8.0F, 1.6F),
                PartPose.offsetAndRotation(3.0F, 0.0F, 0.0F, 0.0F, 0.4887F, 0.0F));
        PartDefinition mut1CaskStrand0 = mut1Cask.addOrReplaceChild("mut1_cask_strand0",
                CubeListBuilder.create()
                        .texOffs(42, 43).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 4.4F, 1.0F),
                PartPose.offsetAndRotation(-1.5F, -2.8F, -1.17F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1CaskStrand1 = mut1Cask.addOrReplaceChild("mut1_cask_strand1",
                CubeListBuilder.create()
                        .texOffs(47, 43).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 4.4F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -1.6F, -1.17F, 0.0F, 0.0F, 0.1047F));
        PartDefinition mut1CaskStrand2 = mut1Cask.addOrReplaceChild("mut1_cask_strand2",
                CubeListBuilder.create()
                        .texOffs(52, 43).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 4.4F, 1.0F),
                PartPose.offsetAndRotation(1.5F, -0.4F, -1.17F, 0.0F, 0.0F, -0.1047F));
        PartDefinition mut1CaskEyes = mut1Cask.addOrReplaceChild("mut1_cask_eyes",
                CubeListBuilder.create()
                        .texOffs(107, 36).addBox(-1.92F, -2.24F, -0.6F, 3.84F, 4.48F, 0.6F),
                PartPose.offset(0.0F, 0.0F, -1.17F));
        PartDefinition mut2Seam = body.addOrReplaceChild("mut2_seam",
                CubeListBuilder.create()
                        .texOffs(58, 0).addBox(0.0F, -3.5F, -4.5F, 0.9F, 7.0F, 9.0F),
                PartPose.offset(-4.0F, 8.0F, 1.0F));
        PartDefinition mut2SeamRib0 = mut2Seam.addOrReplaceChild("mut2_seam_rib0",
                CubeListBuilder.create()
                        .texOffs(26, 28).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 6.44F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.94F, -3.6F, 0.0F, 0.0F, -0.2443F));
        PartDefinition mut2SeamRib1 = mut2Seam.addOrReplaceChild("mut2_seam_rib1",
                CubeListBuilder.create()
                        .texOffs(31, 28).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 5.964F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.94F, -2.16F, 0.0F, 0.0F, -0.3491F));
        PartDefinition mut2SeamRib2 = mut2Seam.addOrReplaceChild("mut2_seam_rib2",
                CubeListBuilder.create()
                        .texOffs(73, 36).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 5.488F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.94F, -0.72F, 0.0F, 0.0F, -0.4538F));
        PartDefinition mut2SeamRib3 = mut2Seam.addOrReplaceChild("mut2_seam_rib3",
                CubeListBuilder.create()
                        .texOffs(78, 36).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 5.012F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.94F, 0.72F, 0.0F, 0.0F, -0.5585F));
        PartDefinition mut2SeamRib4 = mut2Seam.addOrReplaceChild("mut2_seam_rib4",
                CubeListBuilder.create()
                        .texOffs(83, 36).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 4.536F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.94F, 2.16F, 0.0F, 0.0F, -0.6632F));
        PartDefinition mut2SeamRib5 = mut2Seam.addOrReplaceChild("mut2_seam_rib5",
                CubeListBuilder.create()
                        .texOffs(57, 43).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 4.06F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.94F, 3.6F, 0.0F, 0.0F, -0.7679F));
        PartDefinition mut2SeamGut = mut2Seam.addOrReplaceChild("mut2_seam_gut",
                CubeListBuilder.create()
                        .texOffs(32, 17).addBox(-1.1F, 0.0F, -2.34F, 1.6F, 2.8F, 4.68F),
                PartPose.offset(-0.9F, 0.42F, 0.0F));
        PartDefinition mut2SeamGut2 = mut2SeamGut.addOrReplaceChild("mut2_seam_gut2",
                CubeListBuilder.create()
                        .texOffs(33, 43).addBox(-0.8F, 0.0F, -1.44F, 1.2F, 2.1F, 2.88F),
                PartPose.offsetAndRotation(0.0F, 2.38F, 0.0F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut2SeamPelt = mut2Seam.addOrReplaceChild("mut2_seam_pelt",
                CubeListBuilder.create()
                        .texOffs(98, 0).addBox(-1.1F, 0.0F, -2.7F, 1.2F, 5.04F, 5.4F),
                PartPose.offsetAndRotation(-0.5F, 3.08F, 1.08F, 0.0F, 0.0F, -0.5934F));
        PartDefinition mut2SeamPelt2 = mut2SeamPelt.addOrReplaceChild("mut2_seam_pelt2",
                CubeListBuilder.create()
                        .texOffs(15, 28).addBox(-0.9F, 0.0F, -1.8F, 1.0F, 2.94F, 3.6F),
                PartPose.offsetAndRotation(0.0F, 4.9F, 0.0F, 0.0F, 0.0F, -0.3491F));
        PartDefinition mut1Bulb = body.addOrReplaceChild("mut1_bulb",
                CubeListBuilder.create()
                        .texOffs(11, 17).addBox(-3.0F, -2.5F, -2.0F, 6.0F, 5.0F, 4.0F),
                PartPose.offset(0.0F, 2.0F, 2.5F));
        PartDefinition mut1BulbCore = mut1Bulb.addOrReplaceChild("mut1_bulb_core",
                CubeListBuilder.create()
                        .texOffs(81, 43).addBox(-1.5F, -1.25F, -1.0F, 3.0F, 2.5F, 2.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = body.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 1.0F, 2.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(32, 49).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(110, 43).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(37, 49).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-1.0F, 0.0F, -0.2667F, -0.3142F, -0.1513F, -0.1745F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(119, 43).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(42, 49).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(1.0F, 0.0F, -0.2667F, -0.3142F, 0.1513F, 0.1745F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(0, 49).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(47, 49).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(3.0F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(9, 49).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(64, 17).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 2.64F, 4.0F),
                PartPose.offset(2.0F, 18.0F, -4.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(32, 36).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 2.28F, 3.6F),
                PartPose.offset(0.0F, 2.64F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(93, 28).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 1.08F, 4.6F),
                PartPose.offset(0.0F, 2.28F, 0.0F));

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
                        .texOffs(91, 0).addBox(-3.0F, 0.0F, -5.0F, 6.0F, 6.0F, 5.0F),
                PartPose.offset(0.0F, -2.0F, -6.0F));
        PartDefinition muzzle = head.addOrReplaceChild("muzzle",
                CubeListBuilder.create()
                        .texOffs(51, 19).addBox(-1.5F, 0.0F, -4.0F, 3.0F, 3.0F, 4.0F),
                PartPose.offset(0.0F, 3.0F, -5.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(18, 50).addBox(-2.0F, 0.0F, -0.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-2.5F, -0.5F, -1.5F, 0.0F, 0.0F, -0.1396F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(25, 50).addBox(0.0F, 0.0F, -0.5F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(2.5F, -0.5F, -1.5F, 0.0F, 0.0F, 0.1396F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(104, 30).addBox(-1.9344F, -1.9344F, -0.9F, 3.8688F, 3.8688F, 1.0F),
                PartPose.offsetAndRotation(-1.74F, 1.8F, -4.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(115, 30).addBox(-1.56F, -1.56F, -2.496F, 3.12F, 3.12F, 2.496F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(35, 55).addBox(-2.184F, -0.9F, -1.2F, 4.368F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-1.74F, -0.4464F, -4.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(0, 38).addBox(-1.9344F, -1.9344F, -0.9F, 3.8688F, 3.8688F, 1.0F),
                PartPose.offsetAndRotation(1.74F, 1.8F, -4.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(11, 38).addBox(-1.56F, -1.56F, -2.496F, 3.12F, 3.12F, 2.496F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(46, 55).addBox(-2.184F, -0.9F, -1.2F, 4.368F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(1.74F, -0.4464F, -4.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(53, 50).addBox(-0.858F, -0.858F, -1.4586F, 1.716F, 1.716F, 1.4586F),
                PartPose.offsetAndRotation(-1.8F, -1.5F, -4.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(57, 55).addBox(-0.702F, -0.702F, -1.1934F, 1.404F, 1.404F, 1.1934F),
                PartPose.offsetAndRotation(2.04F, -1.92F, -4.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(37, 44).addBox(-2.52F, -1.2F, -1.6F, 5.04F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 3.96F, -4.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(62, 55).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-2.04F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(81, 50).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(-1.02F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(86, 50).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.9F, 0.9F),
                PartPose.offset(0.0F, 0.4F, -0.9F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(91, 50).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(1.02F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceUt4 = faceMaw.addOrReplaceChild("face_ut4",
                CubeListBuilder.create()
                        .texOffs(67, 55).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(2.04F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(87, 30).addBox(-2.4F, 0.0F, -3.0F, 4.8F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 4.2F, -3.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(72, 55).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-1.92F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(96, 50).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(-0.96F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(101, 50).addBox(-0.4F, -1.7F, -0.4F, 0.8F, 1.7F, 0.8F),
                PartPose.offset(0.0F, 0.1F, -2.4F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(106, 50).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(0.96F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceLt4 = faceJaw.addOrReplaceChild("face_lt4",
                CubeListBuilder.create()
                        .texOffs(77, 55).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(1.92F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(42, 50).addBox(-1.56F, -0.2F, -1.4F, 3.12F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(37, 50).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 4.5F, -5.5F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(111, 50).addBox(-0.528F, 0.0F, -0.5F, 1.056F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(116, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(121, 50).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(0, 55).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue5 = mut1Tongue4.addOrReplaceChild("mut1_tongue_5",
                CubeListBuilder.create()
                        .texOffs(5, 55).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.8888F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0134F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue6 = mut1Tongue5.addOrReplaceChild("mut1_tongue_6",
                CubeListBuilder.create()
                        .texOffs(10, 55).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.7718F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.8888F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue6.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(15, 55).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 2.0F, -6.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(66, 38).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(119, 44).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-2.4F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(60, 50).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(67, 50).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-0.8F, 1.3524F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(77, 38).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(0, 50).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(0.8F, -1.9927F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(74, 50).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(9, 50).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(2.4F, 1.5837F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition ruff = body.addOrReplaceChild("ruff",
                CubeListBuilder.create()
                        .texOffs(35, 0).addBox(-4.5F, 0.0F, -4.0F, 9.0F, 7.0F, 8.0F),
                PartPose.offset(0.0F, -0.6F, -2.0F));
        PartDefinition mut2ArmR = ruff.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(92, 19).addBox(-1.08F, 0.0F, -1.08F, 2.16F, 5.4F, 2.16F),
                PartPose.offsetAndRotation(-4.5F, 3.0F, -1.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(101, 19).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 5.4F, 1.8F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(52, 44).addBox(-1.26F, 0.0F, -0.81F, 2.52F, 1.98F, 1.62F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(107, 55).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.99F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(112, 55).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(117, 55).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(122, 55).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.315F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(0, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(5, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(10, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(0.36F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(15, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(20, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(25, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(1.035F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(30, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(35, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(40, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.35F, 1.0F),
                PartPose.offsetAndRotation(-1.26F, 0.9F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(45, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2446F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.35F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = ruff.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(110, 19).addBox(-1.08F, 0.0F, -1.08F, 2.16F, 5.4F, 2.16F),
                PartPose.offsetAndRotation(4.5F, 3.0F, -1.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(119, 19).addBox(-0.9F, 0.0F, -0.9F, 1.8F, 5.4F, 1.8F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(63, 44).addBox(-1.26F, 0.0F, -0.81F, 2.52F, 1.98F, 1.62F),
                PartPose.offsetAndRotation(0.0F, 5.4F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(50, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.99F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(55, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(60, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(65, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(-0.315F, 1.98F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(70, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(75, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(80, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(0.36F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(85, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(90, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(95, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.44F, 1.0F),
                PartPose.offsetAndRotation(1.035F, 1.98F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(100, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.3354F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.44F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(105, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2384F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.3354F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(110, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.35F, 1.0F),
                PartPose.offsetAndRotation(-1.26F, 0.9F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(115, 59).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2446F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.35F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(5, 30).addBox(-1.25F, 0.0F, 0.0F, 2.5F, 4.5F, 2.5F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 5.5F, -0.9F, 0.0F, 0.0F));
        PartDefinition tail1 = tail.addOrReplaceChild("tail_1",
                CubeListBuilder.create()
                        .texOffs(14, 30).addBox(-1.25F, 0.0F, 0.0F, 2.5F, 4.5F, 2.5F),
                PartPose.offsetAndRotation(0.0F, 4.5F, 0.0F, -0.315F, 0.0F, 0.0F));
        PartDefinition haunchBr = body.addOrReplaceChild("haunch_br",
                CubeListBuilder.create()
                        .texOffs(0, 19).addBox(-2.0F, 0.0F, -2.5F, 4.0F, 5.0F, 5.0F),
                PartPose.offset(-2.9F, 6.05F, 3.25F));
        PartDefinition haunchBl = body.addOrReplaceChild("haunch_bl",
                CubeListBuilder.create()
                        .texOffs(19, 19).addBox(-2.0F, 0.0F, -2.5F, 4.0F, 5.0F, 5.0F),
                PartPose.offset(2.9F, 6.05F, 3.25F));
        PartDefinition mut1Shoulder = body.addOrReplaceChild("mut1_shoulder",
                CubeListBuilder.create()
                        .texOffs(70, 0).addBox(0.0F, -3.0F, -4.5F, 0.9F, 6.0F, 9.0F),
                PartPose.offset(-4.0F, 3.0F, -2.0F));
        PartDefinition mut1ShoulderRib0 = mut1Shoulder.addOrReplaceChild("mut1_shoulder_rib0",
                CubeListBuilder.create()
                        .texOffs(0, 30).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 5.52F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.52F, -3.6F, 0.0F, 0.0F, -0.2443F));
        PartDefinition mut1ShoulderRib1 = mut1Shoulder.addOrReplaceChild("mut1_shoulder_rib1",
                CubeListBuilder.create()
                        .texOffs(77, 30).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 5.112F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.52F, -2.16F, 0.0F, 0.0F, -0.3491F));
        PartDefinition mut1ShoulderRib2 = mut1Shoulder.addOrReplaceChild("mut1_shoulder_rib2",
                CubeListBuilder.create()
                        .texOffs(82, 30).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 4.704F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.52F, -0.72F, 0.0F, 0.0F, -0.4538F));
        PartDefinition mut1ShoulderRib3 = mut1Shoulder.addOrReplaceChild("mut1_shoulder_rib3",
                CubeListBuilder.create()
                        .texOffs(27, 44).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 4.296F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.52F, 0.72F, 0.0F, 0.0F, -0.5585F));
        PartDefinition mut1ShoulderRib4 = mut1Shoulder.addOrReplaceChild("mut1_shoulder_rib4",
                CubeListBuilder.create()
                        .texOffs(32, 44).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.888F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.52F, 2.16F, 0.0F, 0.0F, -0.6632F));
        PartDefinition mut1ShoulderRib5 = mut1Shoulder.addOrReplaceChild("mut1_shoulder_rib5",
                CubeListBuilder.create()
                        .texOffs(32, 50).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.48F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.52F, 3.6F, 0.0F, 0.0F, -0.7679F));
        PartDefinition mut1ShoulderGut = mut1Shoulder.addOrReplaceChild("mut1_shoulder_gut",
                CubeListBuilder.create()
                        .texOffs(66, 19).addBox(-1.1F, 0.0F, -2.34F, 1.6F, 2.4F, 4.68F),
                PartPose.offset(-0.9F, 0.36F, 0.0F));
        PartDefinition mut1ShoulderGut2 = mut1ShoulderGut.addOrReplaceChild("mut1_shoulder_gut2",
                CubeListBuilder.create()
                        .texOffs(106, 38).addBox(-0.8F, 0.0F, -1.44F, 1.2F, 1.8F, 2.88F),
                PartPose.offsetAndRotation(0.0F, 2.04F, 0.0F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1ShoulderPelt = mut1Shoulder.addOrReplaceChild("mut1_shoulder_pelt",
                CubeListBuilder.create()
                        .texOffs(38, 19).addBox(-1.1F, 0.0F, -2.7F, 1.2F, 4.32F, 5.4F),
                PartPose.offsetAndRotation(-0.5F, 2.64F, 1.08F, 0.0F, 0.0F, -0.5934F));
        PartDefinition mut1ShoulderPelt2 = mut1ShoulderPelt.addOrReplaceChild("mut1_shoulder_pelt2",
                CubeListBuilder.create()
                        .texOffs(81, 19).addBox(-0.9F, 0.0F, -1.8F, 1.0F, 2.52F, 3.6F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, 0.0F, 0.0F, -0.3491F));
        PartDefinition mut1ShoulderVert0 = mut1Shoulder.addOrReplaceChild("mut1_shoulder_vert0",
                CubeListBuilder.create()
                        .texOffs(82, 55).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -3.12F, -2.88F));
        PartDefinition mut1ShoulderVert1 = mut1Shoulder.addOrReplaceChild("mut1_shoulder_vert1",
                CubeListBuilder.create()
                        .texOffs(87, 55).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -3.12F, -1.395F));
        PartDefinition mut1ShoulderVert2 = mut1Shoulder.addOrReplaceChild("mut1_shoulder_vert2",
                CubeListBuilder.create()
                        .texOffs(92, 55).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -3.12F, 0.09F));
        PartDefinition mut1ShoulderVert3 = mut1Shoulder.addOrReplaceChild("mut1_shoulder_vert3",
                CubeListBuilder.create()
                        .texOffs(97, 55).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -3.12F, 1.575F));
        PartDefinition mut1ShoulderVert4 = mut1Shoulder.addOrReplaceChild("mut1_shoulder_vert4",
                CubeListBuilder.create()
                        .texOffs(102, 55).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -3.12F, 3.06F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -0.5F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(74, 44).addBox(-1.2F, -1.76F, -0.8F, 2.4F, 1.76F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -4.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(115, 38).addBox(-1.2F, -2.6064F, -0.8F, 2.4F, 2.6064F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -2.2F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(0, 44).addBox(-1.2F, -3.1295F, -0.8F, 2.4F, 3.1295F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.4F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(9, 44).addBox(-1.2F, -3.1295F, -0.8F, 2.4F, 3.1295F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 1.4F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP4 = mut1Plates.addOrReplaceChild("mut1_plates_p4",
                CubeListBuilder.create()
                        .texOffs(18, 44).addBox(-1.2F, -2.6064F, -0.8F, 2.4F, 2.6064F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 3.2F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP5 = mut1Plates.addOrReplaceChild("mut1_plates_p5",
                CubeListBuilder.create()
                        .texOffs(83, 44).addBox(-1.2F, -1.76F, -0.8F, 2.4F, 1.76F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 5.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = body.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -0.5F, 4.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(20, 55).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(-2.4F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(92, 44).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(25, 55).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(101, 44).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(30, 55).addBox(-0.5F, -2.4F, -0.5F, 1.0F, 2.4F, 1.0F),
                PartPose.offsetAndRotation(2.4F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(110, 44).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.4F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(23, 30).addBox(-1.25F, 0.0F, -1.25F, 2.5F, 3.96F, 2.5F),
                PartPose.offset(-2.6F, 15.0F, -4.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(88, 38).addBox(-0.9F, 0.0F, -1.05F, 1.8F, 3.42F, 2.1F),
                PartPose.offset(0.0F, 3.96F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(22, 38).addBox(-1.25F, 0.0F, -1.65F, 2.5F, 1.62F, 3.1F),
                PartPose.offset(0.0F, 3.42F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(32, 30).addBox(-1.25F, 0.0F, -1.25F, 2.5F, 3.96F, 2.5F),
                PartPose.offset(2.6F, 15.0F, -4.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(97, 38).addBox(-0.9F, 0.0F, -1.05F, 1.8F, 3.42F, 2.1F),
                PartPose.offset(0.0F, 3.96F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(33, 38).addBox(-1.25F, 0.0F, -1.65F, 2.5F, 1.62F, 3.1F),
                PartPose.offset(0.0F, 3.42F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(41, 30).addBox(-1.25F, 0.0F, -1.25F, 2.5F, 3.6F, 2.5F),
                PartPose.offset(-2.6F, 15.0F, 4.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(50, 30).addBox(-0.9F, 0.0F, -1.05F, 1.8F, 3.78F, 2.1F),
                PartPose.offset(0.0F, 3.6F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(44, 38).addBox(-1.25F, 0.0F, -1.65F, 2.5F, 1.62F, 3.1F),
                PartPose.offset(0.0F, 3.78F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(59, 30).addBox(-1.25F, 0.0F, -1.25F, 2.5F, 3.6F, 2.5F),
                PartPose.offset(2.6F, 15.0F, 4.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(68, 30).addBox(-0.9F, 0.0F, -1.05F, 1.8F, 3.78F, 2.1F),
                PartPose.offset(0.0F, 3.6F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(55, 38).addBox(-1.25F, 0.0F, -1.65F, 2.5F, 1.62F, 3.1F),
                PartPose.offset(0.0F, 3.78F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedGoatLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(76, 28).addBox(0.0F, 0.0F, 0.0F, 3.0F, 4.4F, 3.0F),
                PartPose.offset(-3.0F, 14.0F, -6.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(102, 28).addBox(0.35F, 0.0F, 0.2F, 2.3F, 3.8F, 2.6F),
                PartPose.offset(0.0F, 4.4F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(0, 43).addBox(0.0F, 0.0F, -0.4F, 3.0F, 1.8F, 3.6F),
                PartPose.offset(0.0F, 3.8F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(45, 50).addBox(0.0F, 4.0F, 0.0F, 3.0F, 2.4F, 3.0F),
                PartPose.offset(-3.0F, 14.0F, 4.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(43, 43).addBox(0.35F, 0.0F, 0.2F, 2.3F, 2.52F, 2.6F),
                PartPose.offset(0.0F, 6.4F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(0, 50).addBox(0.0F, 0.0F, -0.4F, 3.0F, 1.08F, 3.6F),
                PartPose.offset(0.0F, 2.52F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(58, 50).addBox(0.0F, 4.0F, 0.0F, 3.0F, 2.4F, 3.0F),
                PartPose.offset(1.0F, 14.0F, 4.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(54, 43).addBox(0.35F, 0.0F, 0.2F, 2.3F, 2.52F, 2.6F),
                PartPose.offset(0.0F, 6.4F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(15, 50).addBox(0.0F, 0.0F, -0.4F, 3.0F, 1.08F, 3.6F),
                PartPose.offset(0.0F, 2.52F, 0.0F));
        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-4.0F, -17.0F, -7.0F, 9.0F, 11.0F, 16.0F)
                        .texOffs(51, 0).addBox(-5.0F, -18.0F, -8.0F, 11.0F, 14.0F, 11.0F),
                PartPose.offset(0.0F, 24.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(86, 62).addBox(-6.0F, -11.0F, -10.0F, 3.0F, 2.0F, 1.0F)
                        .texOffs(95, 62).addBox(2.0F, -11.0F, -10.0F, 3.0F, 2.0F, 1.0F)
                        .texOffs(19, 28).addBox(-0.5F, -3.0F, -14.0F, 0.6F, 7.0F, 5.0F),
                PartPose.offset(1.0F, -10.0F, 0.0F));
        PartDefinition nose = head.addOrReplaceChild("nose",
                CubeListBuilder.create()
                        .texOffs(96, 0).addBox(-3.0F, -4.0F, -8.0F, 5.0F, 7.0F, 10.0F),
                PartPose.offset(0.0F, -8.0F, -8.0F));
        PartDefinition face = nose.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(71, 50).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(-1.45F, 2.1F, -9.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(82, 50).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(95, 67).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-1.45F, -0.06F, -9.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(93, 50).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(1.45F, 2.1F, -9.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(104, 50).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(106, 67).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(1.45F, -0.06F, -9.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(104, 62).addBox(-0.825F, -0.825F, -1.4025F, 1.65F, 1.65F, 1.4025F),
                PartPose.offsetAndRotation(-1.5F, -1.75F, -9.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(117, 67).addBox(-0.675F, -0.675F, -1.1475F, 1.35F, 1.35F, 1.1475F),
                PartPose.offsetAndRotation(1.7F, -2.24F, -9.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceSpare2 = face.addOrReplaceChild("face_spare2",
                CubeListBuilder.create()
                        .texOffs(122, 67).addBox(-0.6F, -0.6F, -1.02F, 1.2F, 1.2F, 1.02F),
                PartPose.offsetAndRotation(0.0F, -3.5F, -9.7F, 0.0F, 0.0F, -0.363F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(39, 56).addBox(-2.1F, -1.2F, -1.6F, 4.2F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 4.62F, -9.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(0, 71).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-1.7F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(35, 67).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(-0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(40, 67).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(5, 71).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(1.7F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(30, 50).addBox(-2.0F, 0.0F, -3.0F, 4.0F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 4.9F, -8.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(10, 71).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-1.6F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(45, 67).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(-0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(50, 67).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(15, 71).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(1.6F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(75, 62).addBox(-1.3F, -0.2F, -1.4F, 2.6F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition rightHorn = head.addOrReplaceChild("right_horn",
                CubeListBuilder.create()
                        .texOffs(58, 28).addBox(-2.99F, -16.0F, -10.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition leftHorn = head.addOrReplaceChild("left_horn",
                CubeListBuilder.create()
                        .texOffs(67, 28).addBox(-0.01F, -16.0F, -10.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut1Throat = head.addOrReplaceChild("mut1_throat",
                CubeListBuilder.create()
                        .texOffs(32, 28).addBox(-0.9F, -2.0F, -2.5F, 0.9F, 4.0F, 5.0F),
                PartPose.offset(0.0F, 6.0F, 2.0F));
        PartDefinition mut1ThroatRib0 = mut1Throat.addOrReplaceChild("mut1_throat_rib0",
                CubeListBuilder.create()
                        .texOffs(9, 56).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.68F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.68F, -2.0F, 0.0F, 0.0F, 0.2443F));
        PartDefinition mut1ThroatRib1 = mut1Throat.addOrReplaceChild("mut1_throat_rib1",
                CubeListBuilder.create()
                        .texOffs(122, 56).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.2267F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.68F, -0.6667F, 0.0F, 0.0F, 0.4189F));
        PartDefinition mut1ThroatRib2 = mut1Throat.addOrReplaceChild("mut1_throat_rib2",
                CubeListBuilder.create()
                        .texOffs(0, 62).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 2.7733F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.68F, 0.6667F, 0.0F, 0.0F, 0.5934F));
        PartDefinition mut1ThroatRib3 = mut1Throat.addOrReplaceChild("mut1_throat_rib3",
                CubeListBuilder.create()
                        .texOffs(55, 67).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 2.32F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.68F, 2.0F, 0.0F, 0.0F, 0.7679F));
        PartDefinition mut1ThroatGut = mut1Throat.addOrReplaceChild("mut1_throat_gut",
                CubeListBuilder.create()
                        .texOffs(115, 50).addBox(-0.5F, 0.0F, -1.3F, 1.6F, 1.6F, 2.6F),
                PartPose.offset(0.9F, 0.24F, 0.0F));
        PartDefinition mut1ThroatGut2 = mut1ThroatGut.addOrReplaceChild("mut1_throat_gut2",
                CubeListBuilder.create()
                        .texOffs(111, 62).addBox(-0.4F, 0.0F, -0.8F, 1.2F, 1.2F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.0F, 0.0F, -0.3142F));
        PartDefinition mut1ThroatPelt = mut1Throat.addOrReplaceChild("mut1_throat_pelt",
                CubeListBuilder.create()
                        .texOffs(65, 43).addBox(-0.1F, 0.0F, -1.5F, 1.2F, 2.88F, 3.0F),
                PartPose.offsetAndRotation(0.5F, 1.76F, 0.6F, 0.0F, 0.0F, 0.5934F));
        PartDefinition mut1ThroatPelt2 = mut1ThroatPelt.addOrReplaceChild("mut1_throat_pelt2",
                CubeListBuilder.create()
                        .texOffs(115, 56).addBox(-0.1F, 0.0F, -1.0F, 1.0F, 1.68F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 2.8F, 0.0F, 0.0F, 0.0F, 0.3491F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(10, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 5.5F, -8.5F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(60, 67).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(65, 67).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(70, 67).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(75, 67).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue5 = mut1Tongue4.addOrReplaceChild("mut1_tongue_5",
                CubeListBuilder.create()
                        .texOffs(80, 67).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.8888F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0134F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue6 = mut1Tongue5.addOrReplaceChild("mut1_tongue_6",
                CubeListBuilder.create()
                        .texOffs(85, 67).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.7718F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.8888F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue6.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(90, 67).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1CrownR = head.addOrReplaceChild("mut1_crown_r",
                CubeListBuilder.create()
                        .texOffs(83, 43).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(-2.4F, 0.0F, -2.0F, -0.4189F, 0.0F, -0.5236F));
        PartDefinition mut1CrownR1 = mut1CrownR.addOrReplaceChild("mut1_crown_r_1",
                CubeListBuilder.create()
                        .texOffs(24, 56).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut1CrownR2 = mut1CrownR1.addOrReplaceChild("mut1_crown_r_2",
                CubeListBuilder.create()
                        .texOffs(15, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, -0.1745F, -0.384F));
        PartDefinition mut1CrownRB = mut1CrownR1.addOrReplaceChild("mut1_crown_r_b",
                CubeListBuilder.create()
                        .texOffs(20, 62).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, 0.8029F));
        PartDefinition mut1CrownRB1 = mut1CrownRB.addOrReplaceChild("mut1_crown_r_b_1",
                CubeListBuilder.create()
                        .texOffs(25, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, -0.4538F));
        PartDefinition mut1CrownL = head.addOrReplaceChild("mut1_crown_l",
                CubeListBuilder.create()
                        .texOffs(92, 43).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(2.4F, 0.0F, -2.0F, -0.4189F, 0.0F, 0.5236F));
        PartDefinition mut1CrownL1 = mut1CrownL.addOrReplaceChild("mut1_crown_l_1",
                CubeListBuilder.create()
                        .texOffs(29, 56).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut1CrownL2 = mut1CrownL1.addOrReplaceChild("mut1_crown_l_2",
                CubeListBuilder.create()
                        .texOffs(30, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut1CrownLB = mut1CrownL1.addOrReplaceChild("mut1_crown_l_b",
                CubeListBuilder.create()
                        .texOffs(35, 62).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, -0.8029F));
        PartDefinition mut1CrownLB1 = mut1CrownLB.addOrReplaceChild("mut1_crown_l_b_1",
                CubeListBuilder.create()
                        .texOffs(40, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, 0.4538F));
        PartDefinition mut2CrownC = head.addOrReplaceChild("mut2_crown_c",
                CubeListBuilder.create()
                        .texOffs(101, 43).addBox(-0.8F, 0.0F, -0.8F, 1.6F, 4.0F, 1.6F),
                PartPose.offsetAndRotation(0.0F, -0.5F, -5.0F, -0.4189F, 0.0F, 0.5236F));
        PartDefinition mut2CrownC1 = mut2CrownC.addOrReplaceChild("mut2_crown_c_1",
                CubeListBuilder.create()
                        .texOffs(34, 56).addBox(-0.624F, 0.0F, -0.624F, 1.248F, 3.5327F, 1.248F),
                PartPose.offsetAndRotation(0.0F, 4.0F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2CrownC2 = mut2CrownC1.addOrReplaceChild("mut2_crown_c_2",
                CubeListBuilder.create()
                        .texOffs(45, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.12F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5327F, 0.0F, -0.2443F, 0.1745F, 0.384F));
        PartDefinition mut2CrownCB = mut2CrownC1.addOrReplaceChild("mut2_crown_c_b",
                CubeListBuilder.create()
                        .texOffs(50, 62).addBox(-0.55F, 0.0F, -0.55F, 1.1F, 3.0F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 2.0F, 0.0F, -0.5236F, 0.0F, -0.8029F));
        PartDefinition mut2CrownCB1 = mut2CrownCB.addOrReplaceChild("mut2_crown_c_b_1",
                CubeListBuilder.create()
                        .texOffs(55, 62).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6833F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, -0.1745F, 0.0F, 0.4538F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 1.5F, -9.0F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(52, 56).addBox(-1.21F, -1.21F, -1.5004F, 2.42F, 2.42F, 1.5004F)
                        .texOffs(61, 56).addBox(-1.5004F, -1.5004F, -0.726F, 3.0008F, 3.0008F, 0.968F),
                PartPose.offsetAndRotation(-2.2F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(118, 62).addBox(-0.8459F, -0.8459F, -1.0489F, 1.6917F, 1.6917F, 1.0489F)
                        .texOffs(0, 67).addBox(-1.0489F, -1.0489F, -0.5075F, 2.0977F, 2.0977F, 0.6767F),
                PartPose.offsetAndRotation(-1.1F, 2.2991F, -0.5691F, 0.0F, -0.2269F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(7, 67).addBox(-1.1961F, -1.1961F, -1.4832F, 2.3922F, 2.3922F, 1.4832F)
                        .texOffs(70, 56).addBox(-1.4832F, -1.4832F, -0.7177F, 2.9664F, 2.9664F, 0.9569F),
                PartPose.offsetAndRotation(0.0F, -3.3875F, -0.6491F, 0.0F, 0.0F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(14, 67).addBox(-0.95F, -0.95F, -1.178F, 1.9F, 1.9F, 1.178F)
                        .texOffs(21, 67).addBox(-1.178F, -1.178F, -0.57F, 2.356F, 2.356F, 0.76F),
                PartPose.offsetAndRotation(1.1F, 2.6923F, -0.598F, 0.0F, 0.2269F, 0.2764F));
        PartDefinition mut1EyesE4 = mut1Eyes.addOrReplaceChild("mut1_eyes_e4",
                CubeListBuilder.create()
                        .texOffs(28, 67).addBox(-1.1554F, -1.1554F, -1.4327F, 2.3108F, 2.3108F, 1.4327F)
                        .texOffs(79, 56).addBox(-1.4327F, -1.4327F, -0.6932F, 2.8654F, 2.8654F, 0.9243F),
                PartPose.offsetAndRotation(2.2F, -0.5793F, -0.4426F, 0.0F, 0.4538F, -0.0595F));
        PartDefinition mut2Stalks = head.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 5.0F, -1.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(60, 62).addBox(-0.5F, -3.2F, -0.5F, 1.0F, 3.2F, 1.0F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(88, 56).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.2F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(65, 62).addBox(-0.5F, -3.2F, -0.5F, 1.0F, 3.2F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(97, 56).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.2F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(70, 62).addBox(-0.5F, -3.2F, -0.5F, 1.0F, 3.2F, 1.0F),
                PartPose.offsetAndRotation(2.0F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(106, 56).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.2F, 0.0F));
        PartDefinition mut2Flank = body.addOrReplaceChild("mut2_flank",
                CubeListBuilder.create()
                        .texOffs(0, 28).addBox(-0.9F, -3.0F, -4.0F, 0.9F, 6.0F, 8.0F),
                PartPose.offset(5.0F, 4.5F, 2.0F));
        PartDefinition mut2FlankRib0 = mut2Flank.addOrReplaceChild("mut2_flank_rib0",
                CubeListBuilder.create()
                        .texOffs(124, 28).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 5.52F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, -3.2F, 0.0F, 0.0F, 0.2443F));
        PartDefinition mut2FlankRib1 = mut2Flank.addOrReplaceChild("mut2_flank_rib1",
                CubeListBuilder.create()
                        .texOffs(110, 43).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 5.01F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, -1.6F, 0.0F, 0.0F, 0.3752F));
        PartDefinition mut2FlankRib2 = mut2Flank.addOrReplaceChild("mut2_flank_rib2",
                CubeListBuilder.create()
                        .texOffs(14, 56).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 4.5F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, 0.0F, 0.0F, 0.0F, 0.5061F));
        PartDefinition mut2FlankRib3 = mut2Flank.addOrReplaceChild("mut2_flank_rib3",
                CubeListBuilder.create()
                        .texOffs(19, 56).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.99F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, 1.6F, 0.0F, 0.0F, 0.637F));
        PartDefinition mut2FlankRib4 = mut2Flank.addOrReplaceChild("mut2_flank_rib4",
                CubeListBuilder.create()
                        .texOffs(5, 62).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.48F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, 3.2F, 0.0F, 0.0F, 0.7679F));
        PartDefinition mut2FlankGut = mut2Flank.addOrReplaceChild("mut2_flank_gut",
                CubeListBuilder.create()
                        .texOffs(30, 43).addBox(-0.5F, 0.0F, -2.08F, 1.6F, 2.4F, 4.16F),
                PartPose.offset(0.9F, 0.36F, 0.0F));
        PartDefinition mut2FlankGut2 = mut2FlankGut.addOrReplaceChild("mut2_flank_gut2",
                CubeListBuilder.create()
                        .texOffs(0, 56).addBox(-0.4F, 0.0F, -1.28F, 1.2F, 1.8F, 2.56F),
                PartPose.offsetAndRotation(0.0F, 2.04F, 0.0F, 0.0F, 0.0F, -0.3142F));
        PartDefinition mut2FlankPelt = mut2Flank.addOrReplaceChild("mut2_flank_pelt",
                CubeListBuilder.create()
                        .texOffs(45, 28).addBox(-0.1F, 0.0F, -2.4F, 1.2F, 4.32F, 4.8F),
                PartPose.offsetAndRotation(0.5F, 2.64F, 0.96F, 0.0F, 0.0F, 0.5934F));
        PartDefinition mut2FlankPelt2 = mut2FlankPelt.addOrReplaceChild("mut2_flank_pelt2",
                CubeListBuilder.create()
                        .texOffs(74, 43).addBox(-0.1F, 0.0F, -1.6F, 1.0F, 2.52F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, 0.0F, 0.0F, 0.3491F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(89, 28).addBox(0.0F, 0.0F, 0.0F, 3.0F, 4.4F, 3.0F),
                PartPose.offset(1.0F, 14.0F, -6.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(113, 28).addBox(0.35F, 0.0F, 0.2F, 2.3F, 3.8F, 2.6F),
                PartPose.offset(0.0F, 4.4F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(15, 43).addBox(0.0F, 0.0F, -0.4F, 3.0F, 1.8F, 3.6F),
                PartPose.offset(0.0F, 3.8F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedHareLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-4.0F, -6.0F, -9.0F, 8.0F, 6.0F, 10.0F),
                PartPose.offsetAndRotation(0.0F, 23.0F, 4.0F, -0.393F, 0.0F, 0.0F));
        PartDefinition legBr = body.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(0, 17).addBox(-1.0F, -0.5F, -5.0F, 2.0F, 1.0F, 6.0F),
                PartPose.offsetAndRotation(-3.0F, 0.5F, 0.0F, 0.0F, 0.393F, 0.0F));
        PartDefinition mut1Haunch = legBr.addOrReplaceChild("mut1_haunch",
                CubeListBuilder.create()
                        .texOffs(75, 0).addBox(0.0F, -2.25F, -2.75F, 0.9F, 4.5F, 5.5F),
                PartPose.offset(-1.6F, 2.0F, 0.0F));
        PartDefinition mut1HaunchRib0 = mut1Haunch.addOrReplaceChild("mut1_haunch_rib0",
                CubeListBuilder.create()
                        .texOffs(64, 25).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 4.14F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.89F, -2.2F, 0.0F, 0.0F, -0.2443F));
        PartDefinition mut1HaunchRib1 = mut1Haunch.addOrReplaceChild("mut1_haunch_rib1",
                CubeListBuilder.create()
                        .texOffs(69, 25).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.63F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.89F, -0.7333F, 0.0F, 0.0F, -0.4189F));
        PartDefinition mut1HaunchRib2 = mut1Haunch.addOrReplaceChild("mut1_haunch_rib2",
                CubeListBuilder.create()
                        .texOffs(16, 31).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.12F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.89F, 0.7333F, 0.0F, 0.0F, -0.5934F));
        PartDefinition mut1HaunchRib3 = mut1Haunch.addOrReplaceChild("mut1_haunch_rib3",
                CubeListBuilder.create()
                        .texOffs(21, 31).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 2.61F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.89F, 2.2F, 0.0F, 0.0F, -0.7679F));
        PartDefinition mut1HaunchGut = mut1Haunch.addOrReplaceChild("mut1_haunch_gut",
                CubeListBuilder.create()
                        .texOffs(33, 25).addBox(-1.1F, 0.0F, -1.43F, 1.6F, 1.8F, 2.86F),
                PartPose.offset(-0.9F, 0.27F, 0.0F));
        PartDefinition mut1HaunchGut2 = mut1HaunchGut.addOrReplaceChild("mut1_haunch_gut2",
                CubeListBuilder.create()
                        .texOffs(64, 31).addBox(-0.8F, 0.0F, -0.88F, 1.2F, 1.35F, 1.76F),
                PartPose.offsetAndRotation(0.0F, 1.53F, 0.0F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1HaunchPelt = mut1Haunch.addOrReplaceChild("mut1_haunch_pelt",
                CubeListBuilder.create()
                        .texOffs(76, 17).addBox(-1.1F, 0.0F, -1.65F, 1.2F, 3.24F, 3.3F),
                PartPose.offsetAndRotation(-0.5F, 1.98F, 0.66F, 0.0F, 0.0F, -0.5934F));
        PartDefinition mut1HaunchPelt2 = mut1HaunchPelt.addOrReplaceChild("mut1_haunch_pelt2",
                CubeListBuilder.create()
                        .texOffs(9, 31).addBox(-0.9F, 0.0F, -1.1F, 1.0F, 1.89F, 2.2F),
                PartPose.offsetAndRotation(0.0F, 3.15F, 0.0F, 0.0F, 0.0F, -0.3491F));
        PartDefinition legBl = body.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(17, 17).addBox(-1.0F, -0.5F, -5.0F, 2.0F, 1.0F, 6.0F),
                PartPose.offsetAndRotation(3.0F, 0.5F, 0.0F, 0.0F, -0.393F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(54, 0).addBox(-2.5F, -3.0F, -4.0F, 5.0F, 5.0F, 5.0F),
                PartPose.offsetAndRotation(0.0F, -5.293F, -8.121F, 0.393F, 0.0F, 0.0F));
        PartDefinition rightEar = head.addOrReplaceChild("right_ear",
                CubeListBuilder.create()
                        .texOffs(85, 17).addBox(-1.0F, -4.293F, -0.121F, 2.0F, 5.0F, 1.0F),
                PartPose.offset(-1.5F, -3.707F, -0.879F));
        PartDefinition mut2Stalks = rightEar.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -4.0F, 0.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(45, 36).addBox(-0.5F, -2.2F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(-1.0F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(92, 25).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.2F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(50, 36).addBox(-0.5F, -2.2F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(101, 25).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.2F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(55, 36).addBox(-0.5F, -2.2F, -0.5F, 1.0F, 2.2F, 1.0F),
                PartPose.offsetAndRotation(1.0F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(110, 25).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.2F, 0.0F));
        PartDefinition leftEar = head.addOrReplaceChild("left_ear",
                CubeListBuilder.create()
                        .texOffs(92, 17).addBox(-1.0F, -4.293F, -0.121F, 2.0F, 5.0F, 1.0F),
                PartPose.offset(1.5F, -3.707F, -0.879F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(114, 17).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(-1.45F, 1.5F, -4.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(0, 25).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(5, 40).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-1.45F, -0.66F, -4.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(11, 25).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(1.45F, 1.5F, -4.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(22, 25).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(16, 40).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(1.45F, -0.66F, -4.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(57, 31).addBox(-0.825F, -0.825F, -1.4025F, 1.65F, 1.65F, 1.4025F),
                PartPose.offsetAndRotation(-1.5F, -1.25F, -4.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(27, 40).addBox(-0.675F, -0.675F, -1.1475F, 1.35F, 1.35F, 1.1475F),
                PartPose.offsetAndRotation(1.7F, -1.6F, -4.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceSpare2 = face.addOrReplaceChild("face_spare2",
                CubeListBuilder.create()
                        .texOffs(32, 40).addBox(-0.6F, -0.6F, -1.02F, 1.2F, 1.2F, 1.02F),
                PartPose.offsetAndRotation(0.0F, -2.5F, -4.7F, 0.0F, 0.0F, -0.363F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(79, 25).addBox(-2.1F, -1.2F, -1.6F, 4.2F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 3.3F, -4.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(37, 40).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-1.7F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(120, 31).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(-0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(0, 36).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(42, 40).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(1.7F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(99, 17).addBox(-2.0F, 0.0F, -3.0F, 4.0F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 3.5F, -3.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(47, 40).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-1.6F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(5, 36).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(-0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(10, 36).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(52, 40).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(1.6F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(46, 31).addBox(-1.3F, -0.2F, -1.4F, 2.6F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(41, 31).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, -4.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(20, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(25, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(30, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(35, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue4.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(40, 36).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 1.0F, -5.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(78, 31).addBox(-1.1F, -1.1F, -1.364F, 2.2F, 2.2F, 1.364F)
                        .texOffs(119, 25).addBox(-1.364F, -1.364F, -0.66F, 2.728F, 2.728F, 0.88F),
                PartPose.offsetAndRotation(-2.0F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(85, 31).addBox(-0.769F, -0.769F, -0.9535F, 1.5379F, 1.5379F, 0.9535F)
                        .texOffs(92, 31).addBox(-0.9535F, -0.9535F, -0.4614F, 1.907F, 1.907F, 0.6152F),
                PartPose.offsetAndRotation(-0.6667F, 1.0819F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(99, 31).addBox(-1.0874F, -1.0874F, -1.3484F, 2.1748F, 2.1748F, 1.3484F)
                        .texOffs(0, 31).addBox(-1.3484F, -1.3484F, -0.6524F, 2.6967F, 2.6967F, 0.8699F),
                PartPose.offsetAndRotation(0.6667F, -1.5941F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(106, 31).addBox(-0.8636F, -0.8636F, -1.0709F, 1.7273F, 1.7273F, 1.0709F)
                        .texOffs(113, 31).addBox(-1.0709F, -1.0709F, -0.5182F, 2.1418F, 2.1418F, 0.6909F),
                PartPose.offsetAndRotation(2.0F, 1.2669F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(112, 0).addBox(-2.0F, -3.008F, -1.013F, 4.0F, 4.0F, 4.0F),
                PartPose.offset(0.0F, -4.992F, 0.013F));
        PartDefinition legFr = body.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(58, 17).addBox(-0.9F, -1.0F, -0.9F, 2.0F, 4.0F, 2.0F),
                PartPose.offsetAndRotation(-2.0F, 0.389F, -5.928F, 0.393F, 0.0F, 0.0F));
        PartDefinition legFl = body.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(67, 17).addBox(-1.0F, -1.0F, -1.0F, 2.0F, 4.0F, 2.0F),
                PartPose.offsetAndRotation(2.0F, 0.389F, -5.828F, 0.393F, 0.0F, 0.0F));
        PartDefinition mut2Back = body.addOrReplaceChild("mut2_back",
                CubeListBuilder.create()
                        .texOffs(37, 0).addBox(-0.9F, -2.0F, -3.5F, 0.9F, 4.0F, 7.0F),
                PartPose.offset(0.0F, 2.6F, 1.0F));
        PartDefinition mut2BackRib0 = mut2Back.addOrReplaceChild("mut2_back_rib0",
                CubeListBuilder.create()
                        .texOffs(74, 25).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.68F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.68F, -2.8F, 0.0F, 0.0F, 0.2443F));
        PartDefinition mut2BackRib1 = mut2Back.addOrReplaceChild("mut2_back_rib1",
                CubeListBuilder.create()
                        .texOffs(26, 31).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.34F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.68F, -1.4F, 0.0F, 0.0F, 0.3752F));
        PartDefinition mut2BackRib2 = mut2Back.addOrReplaceChild("mut2_back_rib2",
                CubeListBuilder.create()
                        .texOffs(31, 31).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.0F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.68F, 0.0F, 0.0F, 0.0F, 0.5061F));
        PartDefinition mut2BackRib3 = mut2Back.addOrReplaceChild("mut2_back_rib3",
                CubeListBuilder.create()
                        .texOffs(36, 31).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 2.66F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.68F, 1.4F, 0.0F, 0.0F, 0.637F));
        PartDefinition mut2BackRib4 = mut2Back.addOrReplaceChild("mut2_back_rib4",
                CubeListBuilder.create()
                        .texOffs(15, 36).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 2.32F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.68F, 2.8F, 0.0F, 0.0F, 0.7679F));
        PartDefinition mut2BackGut = mut2Back.addOrReplaceChild("mut2_back_gut",
                CubeListBuilder.create()
                        .texOffs(45, 17).addBox(-0.5F, 0.0F, -1.82F, 1.6F, 1.6F, 3.64F),
                PartPose.offset(0.9F, 0.24F, 0.0F));
        PartDefinition mut2BackGut2 = mut2BackGut.addOrReplaceChild("mut2_back_gut2",
                CubeListBuilder.create()
                        .texOffs(71, 31).addBox(-0.4F, 0.0F, -1.12F, 1.2F, 1.2F, 2.24F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.0F, 0.0F, -0.3142F));
        PartDefinition mut2BackPelt = mut2Back.addOrReplaceChild("mut2_back_pelt",
                CubeListBuilder.create()
                        .texOffs(34, 17).addBox(-0.1F, 0.0F, -2.1F, 1.2F, 2.88F, 4.2F),
                PartPose.offsetAndRotation(0.5F, 1.76F, 0.84F, 0.0F, 0.0F, 0.5934F));
        PartDefinition mut2BackPelt2 = mut2BackPelt.addOrReplaceChild("mut2_back_pelt2",
                CubeListBuilder.create()
                        .texOffs(55, 25).addBox(-0.1F, 0.0F, -1.4F, 1.0F, 1.68F, 2.8F),
                PartPose.offsetAndRotation(0.0F, 2.8F, 0.0F, 0.0F, 0.0F, 0.3491F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(90, 0).addBox(-1.38F, 0.0F, -1.38F, 2.76F, 6.9F, 2.76F),
                PartPose.offsetAndRotation(2.6F, 1.0F, 2.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(103, 0).addBox(-1.15F, 0.0F, -1.15F, 2.3F, 6.9F, 2.3F),
                PartPose.offsetAndRotation(0.0F, 6.9F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(44, 25).addBox(-1.61F, 0.0F, -1.035F, 3.22F, 2.53F, 2.07F),
                PartPose.offsetAndRotation(0.0F, 6.9F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(60, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.84F, 1.0F),
                PartPose.offsetAndRotation(-1.265F, 2.53F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(65, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.7063F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.84F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(70, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5824F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.7063F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(75, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.84F, 1.0F),
                PartPose.offsetAndRotation(-0.4025F, 2.53F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(80, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.7063F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.84F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(85, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5824F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.7063F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(90, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.84F, 1.0F),
                PartPose.offsetAndRotation(0.46F, 2.53F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(95, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.7063F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.84F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(100, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5824F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.7063F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(105, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.84F, 1.0F),
                PartPose.offsetAndRotation(1.3225F, 2.53F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(110, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.7063F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.84F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(115, 36).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5824F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.7063F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(120, 36).addBox(-0.5175F, 0.0F, -0.5175F, 1.035F, 1.725F, 1.035F),
                PartPose.offsetAndRotation(-1.61F, 1.15F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(0, 40).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5904F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.725F, 0.0F, 0.3491F, 0.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedFoxLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(22, 26).addBox(2.0F, 0.5F, -1.0F, 2.0F, 2.64F, 2.0F),
                PartPose.offset(-5.0F, 17.5F, 0.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(9, 37).addBox(2.35F, 0.0F, -0.8F, 1.3F, 2.28F, 1.6F),
                PartPose.offset(0.0F, 3.14F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(111, 26).addBox(2.0F, 0.0F, -1.4F, 2.0F, 1.08F, 2.6F),
                PartPose.offset(0.0F, 2.28F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(33, 32).addBox(2.0F, 0.5F, -1.0F, 2.0F, 2.4F, 2.0F),
                PartPose.offset(-5.0F, 17.5F, 7.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(58, 26).addBox(2.35F, 0.0F, -0.8F, 1.3F, 2.52F, 1.6F),
                PartPose.offset(0.0F, 2.9F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(0, 32).addBox(2.0F, 0.0F, -1.4F, 2.0F, 1.08F, 2.6F),
                PartPose.offset(0.0F, 2.52F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(42, 32).addBox(2.0F, 0.5F, -1.0F, 2.0F, 2.4F, 2.0F),
                PartPose.offset(-1.0F, 17.5F, 7.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(65, 26).addBox(2.35F, 0.0F, -0.8F, 1.3F, 2.52F, 1.6F),
                PartPose.offset(0.0F, 2.9F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(11, 32).addBox(2.0F, 0.0F, -1.4F, 2.0F, 1.08F, 2.6F),
                PartPose.offset(0.0F, 2.52F, 0.0F));
        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 16.0F, -6.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(44, 0).addBox(-3.0F, -2.0F, -5.0F, 8.0F, 6.0F, 6.0F),
                PartPose.offset(-1.0F, 0.5F, 3.0F));
        PartDefinition nose = head.addOrReplaceChild("nose",
                CubeListBuilder.create()
                        .texOffs(104, 18).addBox(-1.0F, 2.01F, -8.0F, 4.0F, 2.0F, 3.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition rightEar = head.addOrReplaceChild("right_ear",
                CubeListBuilder.create()
                        .texOffs(73, 37).addBox(-3.0F, -4.0F, -4.0F, 2.0F, 2.0F, 1.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition leftEar = head.addOrReplaceChild("left_ear",
                CubeListBuilder.create()
                        .texOffs(80, 37).addBox(3.0F, -4.0F, -4.0F, 2.0F, 2.0F, 1.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(37, 18).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(-2.32F, 1.8F, -5.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(107, 0).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(93, 42).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-2.32F, -1.1952F, -5.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(50, 18).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(2.32F, 1.8F, -5.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(0, 18).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(108, 42).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(2.32F, -1.1952F, -5.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(51, 32).addBox(-1.144F, -1.144F, -1.9448F, 2.288F, 2.288F, 1.9448F),
                PartPose.offsetAndRotation(-2.4F, -1.5F, -5.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(60, 32).addBox(-0.936F, -0.936F, -1.5912F, 1.872F, 1.872F, 1.5912F),
                PartPose.offsetAndRotation(2.72F, -1.92F, -5.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(92, 26).addBox(-3.36F, -1.2F, -1.6F, 6.72F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 3.96F, -5.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(7, 46).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-2.72F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(28, 42).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(-1.36F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(33, 42).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.9F, 0.9F),
                PartPose.offset(0.0F, 0.4F, -0.9F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(38, 42).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(1.36F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceUt4 = faceMaw.addOrReplaceChild("face_ut4",
                CubeListBuilder.create()
                        .texOffs(12, 46).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(2.72F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(85, 18).addBox(-3.2F, 0.0F, -3.0F, 6.4F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 4.2F, -4.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(17, 46).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-2.56F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(43, 42).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(-1.28F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(48, 42).addBox(-0.4F, -1.7F, -0.4F, 0.8F, 1.7F, 0.8F),
                PartPose.offset(0.0F, 0.1F, -2.4F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(53, 42).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(1.28F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceLt4 = faceJaw.addOrReplaceChild("face_lt4",
                CubeListBuilder.create()
                        .texOffs(22, 46).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(2.56F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(60, 37).addBox(-2.08F, -0.2F, -1.4F, 4.16F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(23, 37).addBox(-0.8F, 0.0F, -0.56F, 1.6F, 2.6F, 1.12F),
                PartPose.offsetAndRotation(0.0F, 4.0F, -9.5F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(63, 42).addBox(-0.704F, 0.0F, -0.5F, 1.408F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(68, 42).addBox(-0.6195F, 0.0F, -0.5F, 1.239F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(73, 42).addBox(-0.5452F, 0.0F, -0.5F, 1.0904F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(78, 42).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue5 = mut1Tongue4.addOrReplaceChild("mut1_tongue_5",
                CubeListBuilder.create()
                        .texOffs(83, 42).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.8888F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0134F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue5.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(88, 42).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 2.0F, -6.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(0, 26).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(105, 32).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(7, 42).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(14, 42).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-1.0F, 1.3524F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(11, 26).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(114, 32).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(1.0F, -1.9927F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(21, 42).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(0, 37).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(3.0F, 1.5837F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition bodyShell = body.addOrReplaceChild("body_shell",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-3.0F, 3.999F, -3.5F, 6.0F, 11.0F, 6.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 1.571F, 0.0F, 0.0F));
        PartDefinition tail = bodyShell.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(25, 0).addBox(2.0F, 0.0F, -1.0F, 4.0F, 9.0F, 5.0F),
                PartPose.offsetAndRotation(-4.0F, 15.0F, -1.0F, -0.052F, 0.0F, 0.0F));
        PartDefinition mut1Brush = tail.addOrReplaceChild("mut1_brush",
                CubeListBuilder.create()
                        .texOffs(73, 0).addBox(-0.9F, -2.0F, -3.5F, 0.9F, 4.0F, 7.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition mut1BrushRib0 = mut1Brush.addOrReplaceChild("mut1_brush_rib0",
                CubeListBuilder.create()
                        .texOffs(72, 26).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.68F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.68F, -2.8F, 0.0F, 0.0F, 0.2443F));
        PartDefinition mut1BrushRib1 = mut1Brush.addOrReplaceChild("mut1_brush_rib1",
                CubeListBuilder.create()
                        .texOffs(30, 37).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.408F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.68F, -1.68F, 0.0F, 0.0F, 0.3491F));
        PartDefinition mut1BrushRib2 = mut1Brush.addOrReplaceChild("mut1_brush_rib2",
                CubeListBuilder.create()
                        .texOffs(35, 37).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.136F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.68F, -0.56F, 0.0F, 0.0F, 0.4538F));
        PartDefinition mut1BrushRib3 = mut1Brush.addOrReplaceChild("mut1_brush_rib3",
                CubeListBuilder.create()
                        .texOffs(40, 37).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 2.864F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.68F, 0.56F, 0.0F, 0.0F, 0.5585F));
        PartDefinition mut1BrushRib4 = mut1Brush.addOrReplaceChild("mut1_brush_rib4",
                CubeListBuilder.create()
                        .texOffs(45, 37).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 2.592F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.68F, 1.68F, 0.0F, 0.0F, 0.6632F));
        PartDefinition mut1BrushRib5 = mut1Brush.addOrReplaceChild("mut1_brush_rib5",
                CubeListBuilder.create()
                        .texOffs(58, 42).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 2.32F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.68F, 2.8F, 0.0F, 0.0F, 0.7679F));
        PartDefinition mut1BrushPelt = mut1Brush.addOrReplaceChild("mut1_brush_pelt",
                CubeListBuilder.create()
                        .texOffs(15, 18).addBox(-0.1F, 0.0F, -2.1F, 1.2F, 2.88F, 4.2F),
                PartPose.offsetAndRotation(0.5F, 1.76F, 0.84F, 0.0F, 0.0F, 0.5934F));
        PartDefinition mut1BrushPelt2 = mut1BrushPelt.addOrReplaceChild("mut1_brush_pelt2",
                CubeListBuilder.create()
                        .texOffs(40, 26).addBox(-0.1F, 0.0F, -1.4F, 1.0F, 1.68F, 2.8F),
                PartPose.offsetAndRotation(0.0F, 2.8F, 0.0F, 0.0F, 0.0F, 0.3491F));
        PartDefinition mut1Brusheyes = tail.addOrReplaceChild("mut1_brusheyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 5.0F, 0.0F));
        PartDefinition mut1BrusheyesE0 = mut1Brusheyes.addOrReplaceChild("mut1_brusheyes_e0",
                CubeListBuilder.create()
                        .texOffs(69, 32).addBox(-1.21F, -1.21F, -1.5004F, 2.42F, 2.42F, 1.5004F)
                        .texOffs(78, 32).addBox(-1.5004F, -1.5004F, -0.726F, 3.0008F, 3.0008F, 0.968F),
                PartPose.offsetAndRotation(-2.6F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1BrusheyesE1 = mut1Brusheyes.addOrReplaceChild("mut1_brusheyes_e1",
                CubeListBuilder.create()
                        .texOffs(94, 37).addBox(-0.8459F, -0.8459F, -1.0489F, 1.6917F, 1.6917F, 1.0489F)
                        .texOffs(101, 37).addBox(-1.0489F, -1.0489F, -0.5075F, 2.0977F, 2.0977F, 0.6767F),
                PartPose.offsetAndRotation(-1.3F, 3.381F, -0.5691F, 0.0F, -0.2269F, 0.236F));
        PartDefinition mut1BrusheyesE2 = mut1Brusheyes.addOrReplaceChild("mut1_brusheyes_e2",
                CubeListBuilder.create()
                        .texOffs(108, 37).addBox(-1.1961F, -1.1961F, -1.4832F, 2.3922F, 2.3922F, 1.4832F)
                        .texOffs(87, 32).addBox(-1.4832F, -1.4832F, -0.7177F, 2.9664F, 2.9664F, 0.9569F),
                PartPose.offsetAndRotation(0.0F, -4.9817F, -0.6491F, 0.0F, 0.0F, -0.3478F));
        PartDefinition mut1BrusheyesE3 = mut1Brusheyes.addOrReplaceChild("mut1_brusheyes_e3",
                CubeListBuilder.create()
                        .texOffs(115, 37).addBox(-0.95F, -0.95F, -1.178F, 1.9F, 1.9F, 1.178F)
                        .texOffs(122, 37).addBox(-1.178F, -1.178F, -0.57F, 2.356F, 2.356F, 0.76F),
                PartPose.offsetAndRotation(1.3F, 3.9592F, -0.598F, 0.0F, 0.2269F, 0.2764F));
        PartDefinition mut1BrusheyesE4 = mut1Brusheyes.addOrReplaceChild("mut1_brusheyes_e4",
                CubeListBuilder.create()
                        .texOffs(0, 42).addBox(-1.1554F, -1.1554F, -1.4327F, 2.3108F, 2.3108F, 1.4327F)
                        .texOffs(96, 32).addBox(-1.4327F, -1.4327F, -0.6932F, 2.8654F, 2.8654F, 0.9243F),
                PartPose.offsetAndRotation(2.6F, -0.8519F, -0.4426F, 0.0F, 0.4538F, -0.0595F));
        PartDefinition mut2Flank = body.addOrReplaceChild("mut2_flank",
                CubeListBuilder.create()
                        .texOffs(90, 0).addBox(-0.9F, -2.25F, -3.5F, 0.9F, 4.5F, 7.0F),
                PartPose.offset(3.4F, 2.5F, 1.0F));
        PartDefinition mut2FlankRib0 = mut2Flank.addOrReplaceChild("mut2_flank_rib0",
                CubeListBuilder.create()
                        .texOffs(77, 26).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 4.14F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.89F, -2.8F, 0.0F, 0.0F, 0.2443F));
        PartDefinition mut2FlankRib1 = mut2Flank.addOrReplaceChild("mut2_flank_rib1",
                CubeListBuilder.create()
                        .texOffs(82, 26).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.63F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.89F, -0.9333F, 0.0F, 0.0F, 0.4189F));
        PartDefinition mut2FlankRib2 = mut2Flank.addOrReplaceChild("mut2_flank_rib2",
                CubeListBuilder.create()
                        .texOffs(50, 37).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.12F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.89F, 0.9333F, 0.0F, 0.0F, 0.5934F));
        PartDefinition mut2FlankRib3 = mut2Flank.addOrReplaceChild("mut2_flank_rib3",
                CubeListBuilder.create()
                        .texOffs(55, 37).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 2.61F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -1.89F, 2.8F, 0.0F, 0.0F, 0.7679F));
        PartDefinition mut2FlankGut = mut2Flank.addOrReplaceChild("mut2_flank_gut",
                CubeListBuilder.create()
                        .texOffs(63, 18).addBox(-0.5F, 0.0F, -1.82F, 1.6F, 1.8F, 3.64F),
                PartPose.offset(0.9F, 0.27F, 0.0F));
        PartDefinition mut2FlankGut2 = mut2FlankGut.addOrReplaceChild("mut2_flank_gut2",
                CubeListBuilder.create()
                        .texOffs(87, 37).addBox(-0.4F, 0.0F, -1.12F, 1.2F, 1.35F, 2.24F),
                PartPose.offsetAndRotation(0.0F, 1.53F, 0.0F, 0.0F, 0.0F, -0.3142F));
        PartDefinition mut2FlankPelt = mut2Flank.addOrReplaceChild("mut2_flank_pelt",
                CubeListBuilder.create()
                        .texOffs(26, 18).addBox(-0.1F, 0.0F, -2.1F, 1.2F, 3.24F, 4.2F),
                PartPose.offsetAndRotation(0.5F, 1.98F, 0.84F, 0.0F, 0.0F, 0.5934F));
        PartDefinition mut2FlankPelt2 = mut2FlankPelt.addOrReplaceChild("mut2_flank_pelt2",
                CubeListBuilder.create()
                        .texOffs(49, 26).addBox(-0.1F, 0.0F, -1.4F, 1.0F, 1.89F, 2.8F),
                PartPose.offsetAndRotation(0.0F, 3.15F, 0.0F, 0.0F, 0.0F, 0.3491F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(76, 18).addBox(-0.78F, 0.0F, -0.78F, 1.56F, 3.9F, 1.56F),
                PartPose.offsetAndRotation(-3.4F, 3.5F, 3.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(87, 26).addBox(-0.65F, 0.0F, -0.65F, 1.3F, 3.9F, 1.3F),
                PartPose.offsetAndRotation(0.0F, 3.9F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(0, 46).addBox(-0.91F, 0.0F, -0.585F, 1.82F, 1.43F, 1.17F),
                PartPose.offsetAndRotation(0.0F, 3.9F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(27, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.04F, 1.0F),
                PartPose.offsetAndRotation(-0.715F, 1.43F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(32, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9645F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.04F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(37, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.8944F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.9645F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(42, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.04F, 1.0F),
                PartPose.offsetAndRotation(-0.2275F, 1.43F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(47, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9645F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.04F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(52, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.8944F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.9645F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(57, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.04F, 1.0F),
                PartPose.offsetAndRotation(0.26F, 1.43F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(62, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9645F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.04F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(67, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.8944F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.9645F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(72, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.04F, 1.0F),
                PartPose.offsetAndRotation(0.7475F, 1.43F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(77, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9645F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.04F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(82, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.8944F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.9645F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(87, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.975F, 1.0F),
                PartPose.offsetAndRotation(-0.91F, 0.65F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(92, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.8989F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.975F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(31, 26).addBox(2.0F, 0.5F, -1.0F, 2.0F, 2.64F, 2.0F),
                PartPose.offset(-1.0F, 17.5F, 0.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(16, 37).addBox(2.35F, 0.0F, -0.8F, 1.3F, 2.28F, 1.6F),
                PartPose.offset(0.0F, 3.14F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(22, 32).addBox(2.0F, 0.0F, -1.4F, 2.0F, 1.08F, 2.6F),
                PartPose.offset(0.0F, 2.28F, 0.0F));

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
                        .texOffs(56, 0).addBox(-2.5F, 0.0F, -5.0F, 5.0F, 4.5F, 5.0F),
                PartPose.offset(0.0F, -2.0F, -5.0F));
        PartDefinition muzzle = head.addOrReplaceChild("muzzle",
                CubeListBuilder.create()
                        .texOffs(0, 33).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 1.5F),
                PartPose.offset(0.0F, 2.4F, -5.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(11, 38).addBox(-2.0F, 0.0F, -0.5F, 2.0F, 2.5F, 1.0F),
                PartPose.offsetAndRotation(-1.8F, -0.5F, -1.5F, 0.0F, 0.0F, -0.1047F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(18, 38).addBox(0.0F, 0.0F, -0.5F, 2.0F, 2.5F, 1.0F),
                PartPose.offsetAndRotation(1.8F, -0.5F, -1.5F, 0.0F, 0.0F, 0.1047F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(113, 17).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(-1.45F, 1.35F, -4.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(0, 27).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(10, 42).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-1.45F, -0.81F, -4.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(11, 27).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(1.45F, 1.35F, -4.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(22, 27).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(21, 42).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(1.45F, -0.81F, -4.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(25, 38).addBox(-0.825F, -0.825F, -1.4025F, 1.65F, 1.65F, 1.4025F),
                PartPose.offsetAndRotation(-1.5F, -1.125F, -4.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(39, 42).addBox(-0.675F, -0.675F, -1.1475F, 1.35F, 1.35F, 1.1475F),
                PartPose.offsetAndRotation(1.7F, -1.44F, -4.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceSpare2 = face.addOrReplaceChild("face_spare2",
                CubeListBuilder.create()
                        .texOffs(44, 42).addBox(-0.6F, -0.6F, -1.02F, 1.2F, 1.2F, 1.02F),
                PartPose.offsetAndRotation(0.0F, -2.25F, -4.7F, 0.0F, 0.0F, -0.363F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(114, 27).addBox(-2.1F, -1.2F, -1.6F, 4.2F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 2.97F, -4.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(49, 42).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-1.7F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(53, 38).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(-0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(58, 38).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(54, 42).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(1.7F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(98, 17).addBox(-2.0F, 0.0F, -3.0F, 4.0F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 3.15F, -3.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(59, 42).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-1.6F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(63, 38).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(-0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(68, 38).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(64, 42).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(1.6F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(0, 38).addBox(-1.3F, -0.2F, -1.4F, 2.6F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(114, 33).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.0F, -5.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(78, 38).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(83, 38).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(88, 38).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(93, 38).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue5 = mut1Tongue4.addOrReplaceChild("mut1_tongue_5",
                CubeListBuilder.create()
                        .texOffs(98, 38).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.8888F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0134F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue6 = mut1Tongue5.addOrReplaceChild("mut1_tongue_6",
                CubeListBuilder.create()
                        .texOffs(103, 38).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.7718F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.8888F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue7 = mut1Tongue6.addOrReplaceChild("mut1_tongue_7",
                CubeListBuilder.create()
                        .texOffs(108, 38).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6621F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.7718F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue7.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(113, 38).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 1.5F, -5.2F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(77, 27).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(47, 33).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-2.4F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(32, 38).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(39, 38).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-0.8F, 1.3524F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(88, 27).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(56, 33).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(0.8F, -1.9927F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(46, 38).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(65, 33).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(2.4F, 1.5837F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(74, 33).addBox(-0.6F, 0.0F, 0.0F, 1.2F, 3.3333F, 1.2F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 5.5F, -1.1F, 0.0F, 0.0F));
        PartDefinition tail1 = tail.addOrReplaceChild("tail_1",
                CubeListBuilder.create()
                        .texOffs(79, 33).addBox(-0.6F, 0.0F, 0.0F, 1.2F, 3.3333F, 1.2F),
                PartPose.offsetAndRotation(0.0F, 3.3333F, 0.0F, -0.385F, 0.0F, 0.0F));
        PartDefinition tail2 = tail1.addOrReplaceChild("tail_2",
                CubeListBuilder.create()
                        .texOffs(84, 33).addBox(-0.6F, 0.0F, 0.0F, 1.2F, 3.3333F, 1.2F),
                PartPose.offsetAndRotation(0.0F, 3.3333F, 0.0F, -0.385F, 0.0F, 0.0F));
        PartDefinition mut2Stalks = tail.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 3.0F, 0.0F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(118, 38).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(-1.4F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(11, 33).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(123, 38).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(-0.4667F, 0.0F, -0.2667F, -0.3142F, -0.1513F, -0.1745F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(20, 33).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(0, 42).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.4667F, 0.0F, -0.2667F, -0.3142F, 0.1513F, 0.1745F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(29, 33).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(5, 42).addBox(-0.5F, -2.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(1.4F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(38, 33).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition haunchBr = body.addOrReplaceChild("haunch_br",
                CubeListBuilder.create()
                        .texOffs(77, 0).addBox(-1.75F, 0.0F, -2.5F, 3.5F, 4.5F, 5.0F),
                PartPose.offset(-2.5F, 2.55F, 3.25F));
        PartDefinition haunchBl = body.addOrReplaceChild("haunch_bl",
                CubeListBuilder.create()
                        .texOffs(96, 0).addBox(-1.75F, 0.0F, -2.5F, 3.5F, 4.5F, 5.0F),
                PartPose.offset(2.5F, 2.55F, 3.25F));
        PartDefinition mut1Spine = body.addOrReplaceChild("mut1_spine",
                CubeListBuilder.create()
                        .texOffs(33, 0).addBox(0.0F, -2.0F, -5.0F, 0.9F, 4.0F, 10.0F),
                PartPose.offset(0.0F, 2.2F, 0.0F));
        PartDefinition mut1SpineRib0 = mut1Spine.addOrReplaceChild("mut1_spine_rib0",
                CubeListBuilder.create()
                        .texOffs(99, 27).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.68F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.68F, -4.0F, 0.0F, 0.0F, -0.2443F));
        PartDefinition mut1SpineRib1 = mut1Spine.addOrReplaceChild("mut1_spine_rib1",
                CubeListBuilder.create()
                        .texOffs(89, 33).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.4533F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.68F, -2.6667F, 0.0F, 0.0F, -0.3316F));
        PartDefinition mut1SpineRib2 = mut1Spine.addOrReplaceChild("mut1_spine_rib2",
                CubeListBuilder.create()
                        .texOffs(94, 33).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.2267F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.68F, -1.3333F, 0.0F, 0.0F, -0.4189F));
        PartDefinition mut1SpineRib3 = mut1Spine.addOrReplaceChild("mut1_spine_rib3",
                CubeListBuilder.create()
                        .texOffs(99, 33).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.0F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.68F, 0.0F, 0.0F, 0.0F, -0.5061F));
        PartDefinition mut1SpineRib4 = mut1Spine.addOrReplaceChild("mut1_spine_rib4",
                CubeListBuilder.create()
                        .texOffs(104, 33).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 2.7733F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.68F, 1.3333F, 0.0F, 0.0F, -0.5934F));
        PartDefinition mut1SpineRib5 = mut1Spine.addOrReplaceChild("mut1_spine_rib5",
                CubeListBuilder.create()
                        .texOffs(109, 33).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 2.5467F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.68F, 2.6667F, 0.0F, 0.0F, -0.6807F));
        PartDefinition mut1SpineRib6 = mut1Spine.addOrReplaceChild("mut1_spine_rib6",
                CubeListBuilder.create()
                        .texOffs(73, 38).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 2.32F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.68F, 4.0F, 0.0F, 0.0F, -0.7679F));
        PartDefinition mut1SpinePelt = mut1Spine.addOrReplaceChild("mut1_spine_pelt",
                CubeListBuilder.create()
                        .texOffs(0, 17).addBox(-1.1F, 0.0F, -3.0F, 1.2F, 2.88F, 6.0F),
                PartPose.offsetAndRotation(-0.5F, 1.76F, 1.2F, 0.0F, 0.0F, -0.5934F));
        PartDefinition mut1SpinePelt2 = mut1SpinePelt.addOrReplaceChild("mut1_spine_pelt2",
                CubeListBuilder.create()
                        .texOffs(15, 17).addBox(-0.9F, 0.0F, -2.0F, 1.0F, 1.68F, 4.0F),
                PartPose.offsetAndRotation(0.0F, 2.8F, 0.0F, 0.0F, 0.0F, -0.3491F));
        PartDefinition mut1SpineVert0 = mut1Spine.addOrReplaceChild("mut1_spine_vert0",
                CubeListBuilder.create()
                        .texOffs(69, 42).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.08F, -3.2F));
        PartDefinition mut1SpineVert1 = mut1Spine.addOrReplaceChild("mut1_spine_vert1",
                CubeListBuilder.create()
                        .texOffs(74, 42).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.08F, -1.88F));
        PartDefinition mut1SpineVert2 = mut1Spine.addOrReplaceChild("mut1_spine_vert2",
                CubeListBuilder.create()
                        .texOffs(79, 42).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.08F, -0.56F));
        PartDefinition mut1SpineVert3 = mut1Spine.addOrReplaceChild("mut1_spine_vert3",
                CubeListBuilder.create()
                        .texOffs(84, 42).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.08F, 0.76F));
        PartDefinition mut1SpineVert4 = mut1Spine.addOrReplaceChild("mut1_spine_vert4",
                CubeListBuilder.create()
                        .texOffs(89, 42).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.08F, 2.08F));
        PartDefinition mut1SpineVert5 = mut1Spine.addOrReplaceChild("mut1_spine_vert5",
                CubeListBuilder.create()
                        .texOffs(94, 42).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.08F, 3.4F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(104, 27).addBox(-0.72F, 0.0F, -0.72F, 1.44F, 3.6F, 1.44F),
                PartPose.offsetAndRotation(3.0F, 3.0F, -3.5F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(109, 27).addBox(-0.6F, 0.0F, -0.6F, 1.2F, 3.6F, 1.2F),
                PartPose.offsetAndRotation(0.0F, 3.6F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(32, 42).addBox(-0.84F, 0.0F, -0.54F, 1.68F, 1.32F, 1.08F),
                PartPose.offsetAndRotation(0.0F, 3.6F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(99, 42).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.96F, 1.0F),
                PartPose.offsetAndRotation(-0.66F, 1.32F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(104, 42).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.8903F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.96F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(109, 42).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.8256F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.8903F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(114, 42).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.96F, 1.0F),
                PartPose.offsetAndRotation(-0.21F, 1.32F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(119, 42).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.8903F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.96F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(124, 42).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.8256F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.8903F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(0, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.96F, 1.0F),
                PartPose.offsetAndRotation(0.24F, 1.32F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(5, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.8903F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.96F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(10, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.8256F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.8903F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(15, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.96F, 1.0F),
                PartPose.offsetAndRotation(0.69F, 1.32F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(20, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.8903F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.96F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(25, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.8256F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.8903F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(30, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9F, 1.0F),
                PartPose.offsetAndRotation(-0.84F, 0.6F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(35, 46).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.8298F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.9F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(26, 17).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 4.4F, 2.0F),
                PartPose.offset(-1.8F, 14.0F, -4.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(35, 17).addBox(-0.75F, 0.0F, -0.8F, 1.5F, 3.8F, 1.6F),
                PartPose.offset(0.0F, 4.4F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(33, 27).addBox(-1.0F, 0.0F, -1.4F, 2.0F, 1.8F, 2.6F),
                PartPose.offset(0.0F, 3.8F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(44, 17).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 4.4F, 2.0F),
                PartPose.offset(1.8F, 14.0F, -4.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(53, 17).addBox(-0.75F, 0.0F, -0.8F, 1.5F, 3.8F, 1.6F),
                PartPose.offset(0.0F, 4.4F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(44, 27).addBox(-1.0F, 0.0F, -1.4F, 2.0F, 1.8F, 2.6F),
                PartPose.offset(0.0F, 3.8F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(62, 17).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 3.6F, 2.0F),
                PartPose.offset(-2.2F, 15.0F, 4.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(71, 17).addBox(-0.75F, 0.0F, -0.8F, 1.5F, 3.78F, 1.6F),
                PartPose.offset(0.0F, 3.6F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(55, 27).addBox(-1.0F, 0.0F, -1.4F, 2.0F, 1.62F, 2.6F),
                PartPose.offset(0.0F, 3.78F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(80, 17).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 3.6F, 2.0F),
                PartPose.offset(2.2F, 15.0F, 4.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(89, 17).addBox(-0.75F, 0.0F, -0.8F, 1.5F, 3.78F, 1.6F),
                PartPose.offset(0.0F, 3.6F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(66, 27).addBox(-1.0F, 0.0F, -1.4F, 2.0F, 1.62F, 2.6F),
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
                        .texOffs(98, 0).addBox(-2.5F, -12.0F, -3.5F, 5.0F, 12.0F, 7.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, -8.0F, -0.6632F, 0.0F, 0.0F));
        PartDefinition head = neck.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(0, 34).addBox(-2.5F, 0.0F, -10.0F, 5.0F, 6.0F, 10.0F),
                PartPose.offsetAndRotation(0.0F, -12.0F, 0.0F, 0.2443F, 0.0F, 0.0F));
        PartDefinition muzzle = head.addOrReplaceChild("muzzle",
                CubeListBuilder.create()
                        .texOffs(0, 73).addBox(-2.0F, 0.0F, -3.0F, 4.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 2.6F, -10.0F));
        PartDefinition earR = head.addOrReplaceChild("ear_r",
                CubeListBuilder.create()
                        .texOffs(87, 87).addBox(-1.5F, 0.0F, -0.5F, 1.5F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-2.0F, -1.5F, -3.0F, 0.0F, 0.0F, -0.2443F));
        PartDefinition earL = head.addOrReplaceChild("ear_l",
                CubeListBuilder.create()
                        .texOffs(94, 87).addBox(0.0F, 0.0F, -0.5F, 1.5F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(2.0F, -1.5F, -3.0F, 0.0F, 0.0F, 0.2443F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(104, 73).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(-1.45F, 1.8F, -9.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(115, 73).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(50, 97).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-1.45F, -0.36F, -9.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(0, 81).addBox(-1.86F, -1.86F, -0.9F, 3.72F, 3.72F, 1.0F),
                PartPose.offsetAndRotation(1.45F, 1.8F, -9.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(11, 81).addBox(-1.5F, -1.5F, -2.4F, 3.0F, 3.0F, 2.4F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(61, 97).addBox(-2.1F, -0.9F, -1.2F, 4.2F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(1.45F, -0.36F, -9.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(21, 92).addBox(-0.825F, -0.825F, -1.4025F, 1.65F, 1.65F, 1.4025F),
                PartPose.offsetAndRotation(-1.5F, -1.5F, -9.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(72, 97).addBox(-0.675F, -0.675F, -1.1475F, 1.35F, 1.35F, 1.1475F),
                PartPose.offsetAndRotation(1.7F, -1.92F, -9.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(0, 87).addBox(-2.1F, -1.2F, -1.6F, 4.2F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 3.96F, -9.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(77, 97).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-1.7F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(49, 92).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(-0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(54, 92).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.7333F, 0.9F),
                PartPose.offsetAndRotation(0.5667F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(82, 97).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(1.7F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(89, 73).addBox(-2.0F, 0.0F, -3.0F, 4.0F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 4.2F, -8.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(87, 97).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-1.6F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(59, 92).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(-0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0465F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(64, 92).addBox(-0.4F, -1.5667F, -0.4F, 0.8F, 1.5667F, 0.8F),
                PartPose.offsetAndRotation(0.5333F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0465F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(92, 97).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(1.6F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(10, 92).addBox(-1.3F, -0.2F, -1.4F, 2.6F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(5, 92).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 4.0F, -9.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(69, 92).addBox(-0.528F, 0.0F, -0.5F, 1.056F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(74, 92).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(79, 92).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(84, 92).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue5 = mut1Tongue4.addOrReplaceChild("mut1_tongue_5",
                CubeListBuilder.create()
                        .texOffs(89, 92).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.8888F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0134F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue6 = mut1Tongue5.addOrReplaceChild("mut1_tongue_6",
                CubeListBuilder.create()
                        .texOffs(94, 92).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.7718F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.8888F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue7 = mut1Tongue6.addOrReplaceChild("mut1_tongue_7",
                CubeListBuilder.create()
                        .texOffs(99, 92).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6621F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.7718F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue7.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(104, 92).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut1Neckeyes = head.addOrReplaceChild("mut1_neckeyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 6.0F, -3.5F));
        PartDefinition mut1NeckeyesE0 = mut1Neckeyes.addOrReplaceChild("mut1_neckeyes_e0",
                CubeListBuilder.create()
                        .texOffs(33, 81).addBox(-1.32F, -1.32F, -1.6368F, 2.64F, 2.64F, 1.6368F)
                        .texOffs(51, 87).addBox(-1.6368F, -1.6368F, -0.792F, 3.2736F, 3.2736F, 1.056F),
                PartPose.offsetAndRotation(-2.6F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1NeckeyesE1 = mut1Neckeyes.addOrReplaceChild("mut1_neckeyes_e1",
                CubeListBuilder.create()
                        .texOffs(28, 92).addBox(-0.9228F, -0.9228F, -1.1442F, 1.8455F, 1.8455F, 1.1442F)
                        .texOffs(35, 92).addBox(-1.1442F, -1.1442F, -0.5537F, 2.2884F, 2.2884F, 0.7382F),
                PartPose.offsetAndRotation(-1.3F, 2.7048F, -0.5691F, 0.0F, -0.2269F, 0.236F));
        PartDefinition mut1NeckeyesE2 = mut1Neckeyes.addOrReplaceChild("mut1_neckeyes_e2",
                CubeListBuilder.create()
                        .texOffs(44, 81).addBox(-1.3049F, -1.3049F, -1.618F, 2.6097F, 2.6097F, 1.618F)
                        .texOffs(60, 87).addBox(-1.618F, -1.618F, -0.7829F, 3.2361F, 3.2361F, 1.0439F),
                PartPose.offsetAndRotation(0.0F, -3.9854F, -0.6491F, 0.0F, 0.0F, -0.3478F));
        PartDefinition mut1NeckeyesE3 = mut1Neckeyes.addOrReplaceChild("mut1_neckeyes_e3",
                CubeListBuilder.create()
                        .texOffs(42, 92).addBox(-1.0364F, -1.0364F, -1.2851F, 2.0727F, 2.0727F, 1.2851F)
                        .texOffs(69, 87).addBox(-1.2851F, -1.2851F, -0.6218F, 2.5702F, 2.5702F, 0.8291F),
                PartPose.offsetAndRotation(1.3F, 3.1674F, -0.598F, 0.0F, 0.2269F, 0.2764F));
        PartDefinition mut1NeckeyesE4 = mut1Neckeyes.addOrReplaceChild("mut1_neckeyes_e4",
                CubeListBuilder.create()
                        .texOffs(55, 81).addBox(-1.2604F, -1.2604F, -1.563F, 2.5209F, 2.5209F, 1.563F)
                        .texOffs(78, 87).addBox(-1.563F, -1.563F, -0.7563F, 3.1259F, 3.1259F, 1.0084F),
                PartPose.offsetAndRotation(2.6F, -0.6815F, -0.4426F, 0.0F, 0.4538F, -0.0595F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(0, 63).addBox(-1.5F, 0.0F, 0.0F, 3.0F, 6.5F, 3.0F),
                PartPose.offsetAndRotation(0.0F, 1.0F, 11.0F, -0.4F, 0.0F, 0.0F));
        PartDefinition tail1 = tail.addOrReplaceChild("tail_1",
                CubeListBuilder.create()
                        .texOffs(13, 63).addBox(-1.5F, 0.0F, 0.0F, 3.0F, 6.5F, 3.0F),
                PartPose.offsetAndRotation(0.0F, 6.5F, 0.0F, -0.14F, 0.0F, 0.0F));
        PartDefinition mut1Barrel = body.addOrReplaceChild("mut1_barrel",
                CubeListBuilder.create()
                        .texOffs(65, 0).addBox(-0.9F, -3.0F, -7.5F, 0.9F, 6.0F, 15.0F),
                PartPose.offset(0.0F, 13.0F, 2.0F));
        PartDefinition mut1BarrelRib0 = mut1Barrel.addOrReplaceChild("mut1_barrel_rib0",
                CubeListBuilder.create()
                        .texOffs(46, 73).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 5.52F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, -6.0F, 0.0F, 0.0F, 0.2443F));
        PartDefinition mut1BarrelRib1 = mut1Barrel.addOrReplaceChild("mut1_barrel_rib1",
                CubeListBuilder.create()
                        .texOffs(69, 73).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 5.2286F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, -4.2857F, 0.0F, 0.0F, 0.3191F));
        PartDefinition mut1BarrelRib2 = mut1Barrel.addOrReplaceChild("mut1_barrel_rib2",
                CubeListBuilder.create()
                        .texOffs(74, 73).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 4.9371F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, -2.5714F, 0.0F, 0.0F, 0.3939F));
        PartDefinition mut1BarrelRib3 = mut1Barrel.addOrReplaceChild("mut1_barrel_rib3",
                CubeListBuilder.create()
                        .texOffs(79, 73).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 4.6457F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, -0.8571F, 0.0F, 0.0F, 0.4687F));
        PartDefinition mut1BarrelRib4 = mut1Barrel.addOrReplaceChild("mut1_barrel_rib4",
                CubeListBuilder.create()
                        .texOffs(102, 81).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 4.3543F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, 0.8571F, 0.0F, 0.0F, 0.5435F));
        PartDefinition mut1BarrelRib5 = mut1Barrel.addOrReplaceChild("mut1_barrel_rib5",
                CubeListBuilder.create()
                        .texOffs(107, 81).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 4.0629F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, 2.5714F, 0.0F, 0.0F, 0.6183F));
        PartDefinition mut1BarrelRib6 = mut1Barrel.addOrReplaceChild("mut1_barrel_rib6",
                CubeListBuilder.create()
                        .texOffs(112, 81).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.7714F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, 4.2857F, 0.0F, 0.0F, 0.6931F));
        PartDefinition mut1BarrelRib7 = mut1Barrel.addOrReplaceChild("mut1_barrel_rib7",
                CubeListBuilder.create()
                        .texOffs(115, 87).addBox(-0.35F, 0.0F, -0.6F, 0.9F, 3.48F, 1.2F),
                PartPose.offsetAndRotation(0.35F, -2.52F, 6.0F, 0.0F, 0.0F, 0.7679F));
        PartDefinition mut1BarrelGut = mut1Barrel.addOrReplaceChild("mut1_barrel_gut",
                CubeListBuilder.create()
                        .texOffs(49, 51).addBox(-0.5F, 0.0F, -3.9F, 1.6F, 2.4F, 7.8F),
                PartPose.offset(0.9F, 0.36F, 0.0F));
        PartDefinition mut1BarrelGut2 = mut1BarrelGut.addOrReplaceChild("mut1_barrel_gut2",
                CubeListBuilder.create()
                        .texOffs(15, 73).addBox(-0.4F, 0.0F, -2.4F, 1.2F, 1.8F, 4.8F),
                PartPose.offsetAndRotation(0.0F, 2.04F, 0.0F, 0.0F, 0.0F, -0.3142F));
        PartDefinition mut1BarrelPelt = mut1Barrel.addOrReplaceChild("mut1_barrel_pelt",
                CubeListBuilder.create()
                        .texOffs(31, 34).addBox(-0.1F, 0.0F, -4.5F, 1.2F, 4.32F, 9.0F),
                PartPose.offsetAndRotation(0.5F, 2.64F, 1.8F, 0.0F, 0.0F, 0.5934F));
        PartDefinition mut1BarrelPelt2 = mut1BarrelPelt.addOrReplaceChild("mut1_barrel_pelt2",
                CubeListBuilder.create()
                        .texOffs(113, 51).addBox(-0.1F, 0.0F, -3.0F, 1.0F, 2.52F, 6.0F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, 0.0F, 0.0F, 0.3491F));
        PartDefinition mut2Withers = body.addOrReplaceChild("mut2_withers",
                CubeListBuilder.create()
                        .texOffs(34, 51).addBox(0.0F, -2.5F, -3.0F, 0.9F, 5.0F, 6.0F),
                PartPose.offset(0.0F, -2.0F, -8.0F));
        PartDefinition mut2WithersRib0 = mut2Withers.addOrReplaceChild("mut2_withers_rib0",
                CubeListBuilder.create()
                        .texOffs(84, 73).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 4.6F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.1F, -2.4F, 0.0F, 0.0F, -0.2443F));
        PartDefinition mut2WithersRib1 = mut2Withers.addOrReplaceChild("mut2_withers_rib1",
                CubeListBuilder.create()
                        .texOffs(117, 81).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 4.0333F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.1F, -0.8F, 0.0F, 0.0F, -0.4189F));
        PartDefinition mut2WithersRib2 = mut2Withers.addOrReplaceChild("mut2_withers_rib2",
                CubeListBuilder.create()
                        .texOffs(120, 87).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.4667F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.1F, 0.8F, 0.0F, 0.0F, -0.5934F));
        PartDefinition mut2WithersRib3 = mut2Withers.addOrReplaceChild("mut2_withers_rib3",
                CubeListBuilder.create()
                        .texOffs(0, 92).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 2.9F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -2.1F, 2.4F, 0.0F, 0.0F, -0.7679F));
        PartDefinition mut2WithersGut = mut2Withers.addOrReplaceChild("mut2_withers_gut",
                CubeListBuilder.create()
                        .texOffs(22, 81).addBox(-1.1F, 0.0F, -1.56F, 1.6F, 2.0F, 3.12F),
                PartPose.offset(-0.9F, 0.3F, 0.0F));
        PartDefinition mut2WithersGut2 = mut2WithersGut.addOrReplaceChild("mut2_withers_gut2",
                CubeListBuilder.create()
                        .texOffs(101, 87).addBox(-0.8F, 0.0F, -0.96F, 1.2F, 1.5F, 1.92F),
                PartPose.offsetAndRotation(0.0F, 1.7F, 0.0F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut2WithersPelt = mut2Withers.addOrReplaceChild("mut2_withers_pelt",
                CubeListBuilder.create()
                        .texOffs(111, 63).addBox(-1.1F, 0.0F, -1.8F, 1.2F, 3.6F, 3.6F),
                PartPose.offsetAndRotation(-0.5F, 2.2F, 0.72F, 0.0F, 0.0F, -0.5934F));
        PartDefinition mut2WithersPelt2 = mut2WithersPelt.addOrReplaceChild("mut2_withers_pelt2",
                CubeListBuilder.create()
                        .texOffs(108, 87).addBox(-0.9F, 0.0F, -1.2F, 1.0F, 2.1F, 2.4F),
                PartPose.offsetAndRotation(0.0F, 3.5F, 0.0F, 0.0F, 0.0F, -0.3491F));
        PartDefinition mut1Plates = body.addOrReplaceChild("mut1_plates",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP0 = mut1Plates.addOrReplaceChild("mut1_plates_p0",
                CubeListBuilder.create()
                        .texOffs(24, 87).addBox(-1.2F, -1.98F, -0.8F, 2.4F, 1.98F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -8.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP1 = mut1Plates.addOrReplaceChild("mut1_plates_p1",
                CubeListBuilder.create()
                        .texOffs(66, 81).addBox(-1.2F, -2.6829F, -0.8F, 2.4F, 2.6829F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -5.5714F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP2 = mut1Plates.addOrReplaceChild("mut1_plates_p2",
                CubeListBuilder.create()
                        .texOffs(75, 81).addBox(-1.2F, -3.2466F, -0.8F, 2.4F, 3.2466F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -3.1429F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP3 = mut1Plates.addOrReplaceChild("mut1_plates_p3",
                CubeListBuilder.create()
                        .texOffs(51, 73).addBox(-1.2F, -3.5594F, -0.8F, 2.4F, 3.5594F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.7143F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP4 = mut1Plates.addOrReplaceChild("mut1_plates_p4",
                CubeListBuilder.create()
                        .texOffs(60, 73).addBox(-1.2F, -3.5594F, -0.8F, 2.4F, 3.5594F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 1.7143F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP5 = mut1Plates.addOrReplaceChild("mut1_plates_p5",
                CubeListBuilder.create()
                        .texOffs(84, 81).addBox(-1.2F, -3.2466F, -0.8F, 2.4F, 3.2466F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 4.1429F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP6 = mut1Plates.addOrReplaceChild("mut1_plates_p6",
                CubeListBuilder.create()
                        .texOffs(93, 81).addBox(-1.2F, -2.6829F, -0.8F, 2.4F, 2.6829F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 6.5714F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut1PlatesP7 = mut1Plates.addOrReplaceChild("mut1_plates_p7",
                CubeListBuilder.create()
                        .texOffs(33, 87).addBox(-1.2F, -1.98F, -0.8F, 2.4F, 1.98F, 1.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 9.0F, -0.2793F, 0.0F, 0.0F));
        PartDefinition mut2ArmR = body.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(100, 51).addBox(-1.32F, 0.0F, -1.32F, 2.64F, 6.6F, 2.64F),
                PartPose.offsetAndRotation(-5.5F, 5.0F, -8.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(26, 63).addBox(-1.1F, 0.0F, -1.1F, 2.2F, 6.6F, 2.2F),
                PartPose.offsetAndRotation(0.0F, 6.6F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(13, 87).addBox(-1.54F, 0.0F, -0.99F, 3.08F, 2.42F, 1.98F),
                PartPose.offsetAndRotation(0.0F, 6.6F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(109, 92).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(-1.21F, 2.42F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(114, 92).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(119, 92).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(124, 92).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(-0.385F, 2.42F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(0, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(5, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(10, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(0.44F, 2.42F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(15, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(20, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(25, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.76F, 1.0F),
                PartPose.offsetAndRotation(1.265F, 2.42F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(30, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6322F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.76F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(35, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5136F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6322F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(40, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.65F, 1.0F),
                PartPose.offsetAndRotation(-1.54F, 1.1F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(45, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5212F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.65F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut2ArmL = body.addOrReplaceChild("mut2_arm_l",
                CubeListBuilder.create()
                        .texOffs(28, 73).addBox(-1.02F, 0.0F, -1.02F, 2.04F, 5.1F, 2.04F),
                PartPose.offsetAndRotation(5.5F, 6.5F, -6.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut2ArmLFore = mut2ArmL.addOrReplaceChild("mut2_arm_l_fore",
                CubeListBuilder.create()
                        .texOffs(37, 73).addBox(-0.85F, 0.0F, -0.85F, 1.7F, 5.1F, 1.7F),
                PartPose.offsetAndRotation(0.0F, 5.1F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut2ArmLHand = mut2ArmLFore.addOrReplaceChild("mut2_arm_l_hand",
                CubeListBuilder.create()
                        .texOffs(42, 87).addBox(-1.19F, 0.0F, -0.765F, 2.38F, 1.87F, 1.53F),
                PartPose.offsetAndRotation(0.0F, 5.1F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF0 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f0",
                CubeListBuilder.create()
                        .texOffs(97, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(-0.935F, 1.87F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmLF01 = mut2ArmLF0.addOrReplaceChild("mut2_arm_l_f0_1",
                CubeListBuilder.create()
                        .texOffs(102, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF02 = mut2ArmLF01.addOrReplaceChild("mut2_arm_l_f0_2",
                CubeListBuilder.create()
                        .texOffs(107, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF1 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f1",
                CubeListBuilder.create()
                        .texOffs(112, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(-0.2975F, 1.87F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmLF11 = mut2ArmLF1.addOrReplaceChild("mut2_arm_l_f1_1",
                CubeListBuilder.create()
                        .texOffs(117, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF12 = mut2ArmLF11.addOrReplaceChild("mut2_arm_l_f1_2",
                CubeListBuilder.create()
                        .texOffs(122, 97).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF2 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f2",
                CubeListBuilder.create()
                        .texOffs(0, 101).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(0.34F, 1.87F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmLF21 = mut2ArmLF2.addOrReplaceChild("mut2_arm_l_f2_1",
                CubeListBuilder.create()
                        .texOffs(5, 101).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF22 = mut2ArmLF21.addOrReplaceChild("mut2_arm_l_f2_2",
                CubeListBuilder.create()
                        .texOffs(10, 101).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF3 = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_f3",
                CubeListBuilder.create()
                        .texOffs(15, 101).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.36F, 1.0F),
                PartPose.offsetAndRotation(0.9775F, 1.87F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmLF31 = mut2ArmLF3.addOrReplaceChild("mut2_arm_l_f3_1",
                CubeListBuilder.create()
                        .texOffs(20, 101).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.2612F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.36F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLF32 = mut2ArmLF31.addOrReplaceChild("mut2_arm_l_f3_2",
                CubeListBuilder.create()
                        .texOffs(25, 101).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1696F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.2612F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmLThumb = mut2ArmLHand.addOrReplaceChild("mut2_arm_l_thumb",
                CubeListBuilder.create()
                        .texOffs(30, 101).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.275F, 1.0F),
                PartPose.offsetAndRotation(-1.19F, 0.85F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmLThumb1 = mut2ArmLThumb.addOrReplaceChild("mut2_arm_l_thumb_1",
                CubeListBuilder.create()
                        .texOffs(35, 101).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.1755F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.275F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(52, 34).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 7.48F, 4.0F),
                PartPose.offset(-4.0F, 7.0F, -8.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(70, 51).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 6.46F, 3.6F),
                PartPose.offset(0.0F, 7.48F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(35, 63).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 3.06F, 4.6F),
                PartPose.offset(0.0F, 6.46F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(69, 34).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 7.48F, 4.0F),
                PartPose.offset(4.0F, 7.0F, -8.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(85, 51).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 6.46F, 3.6F),
                PartPose.offset(0.0F, 7.48F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(54, 63).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 3.06F, 4.6F),
                PartPose.offset(0.0F, 6.46F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(86, 34).addBox(-2.25F, 0.0F, -2.25F, 4.5F, 6.8F, 4.5F),
                PartPose.offset(-4.0F, 7.0F, 8.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(103, 34).addBox(-1.9F, 0.0F, -2.05F, 3.8F, 7.14F, 4.1F),
                PartPose.offset(0.0F, 6.8F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(73, 63).addBox(-2.25F, 0.0F, -2.65F, 4.5F, 3.06F, 5.1F),
                PartPose.offset(0.0F, 7.14F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(0, 51).addBox(-2.25F, 0.0F, -2.25F, 4.5F, 6.8F, 4.5F),
                PartPose.offset(4.0F, 7.0F, 8.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(17, 51).addBox(-1.9F, 0.0F, -2.05F, 3.8F, 7.14F, 4.1F),
                PartPose.offset(0.0F, 6.8F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(92, 63).addBox(-2.25F, 0.0F, -2.65F, 4.5F, 3.06F, 5.1F),
                PartPose.offset(0.0F, 7.14F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedLlamaLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(0, 43).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 6.16F, 4.0F),
                PartPose.offset(-3.5F, 10.0F, -5.0F));
        PartDefinition legFr1 = legFr.addOrReplaceChild("leg_fr_1",
                CubeListBuilder.create()
                        .texOffs(0, 54).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 5.32F, 3.6F),
                PartPose.offset(0.0F, 6.16F, 0.0F));
        PartDefinition footFr = legFr1.addOrReplaceChild("foot_fr",
                CubeListBuilder.create()
                        .texOffs(30, 54).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.52F, 4.6F),
                PartPose.offset(0.0F, 5.32F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(17, 43).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 5.6F, 4.0F),
                PartPose.offset(-3.5F, 10.0F, 6.0F));
        PartDefinition legBr1 = legBr.addOrReplaceChild("leg_br_1",
                CubeListBuilder.create()
                        .texOffs(68, 43).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 5.88F, 3.6F),
                PartPose.offset(0.0F, 5.6F, 0.0F));
        PartDefinition footBr = legBr1.addOrReplaceChild("foot_br",
                CubeListBuilder.create()
                        .texOffs(49, 54).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.52F, 4.6F),
                PartPose.offset(0.0F, 5.88F, 0.0F));
        PartDefinition rightChest = root.addOrReplaceChild("right_chest",
                CubeListBuilder.create()
                        .texOffs(27, 29).addBox(-3.0F, 0.0F, 0.0F, 8.0F, 8.0F, 3.0F),
                PartPose.offsetAndRotation(-8.5F, 3.0F, 3.0F, 0.0F, 1.571F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(34, 43).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 5.6F, 4.0F),
                PartPose.offset(3.5F, 10.0F, 6.0F));
        PartDefinition legBl1 = legBl.addOrReplaceChild("leg_bl_1",
                CubeListBuilder.create()
                        .texOffs(83, 43).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 5.88F, 3.6F),
                PartPose.offset(0.0F, 5.6F, 0.0F));
        PartDefinition footBl = legBl1.addOrReplaceChild("foot_bl",
                CubeListBuilder.create()
                        .texOffs(68, 54).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.52F, 4.6F),
                PartPose.offset(0.0F, 5.88F, 0.0F));
        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 5.0F, 2.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(0, 29).addBox(-2.0F, -14.0F, -10.0F, 4.0F, 4.0F, 9.0F)
                        .texOffs(45, 0).addBox(-4.0F, -16.0F, -6.0F, 8.0F, 18.0F, 6.0F)
                        .texOffs(82, 64).addBox(-4.0F, -19.0F, -4.0F, 3.0F, 3.0F, 2.0F)
                        .texOffs(93, 64).addBox(1.0F, -19.0F, -4.0F, 3.0F, 3.0F, 2.0F),
                PartPose.offset(0.0F, 2.0F, -8.0F));
        PartDefinition face = head.addOrReplaceChild("face",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition faceSocketR = face.addOrReplaceChild("face_socket_r",
                CubeListBuilder.create()
                        .texOffs(28, 64).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(-2.32F, 5.4F, -5.8F, 0.0F, -0.4189F, 0.1745F));
        PartDefinition faceEyeR = faceSocketR.addOrReplaceChild("face_eye_r",
                CubeListBuilder.create()
                        .texOffs(106, 54).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowR = face.addOrReplaceChild("face_brow_r",
                CubeListBuilder.create()
                        .texOffs(70, 83).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(-2.32F, 2.4048F, -5.9F, 0.0F, 0.0F, -0.2443F));
        PartDefinition faceSocketL = face.addOrReplaceChild("face_socket_l",
                CubeListBuilder.create()
                        .texOffs(41, 64).addBox(-2.5792F, -2.5792F, -0.9F, 5.1584F, 5.1584F, 1.0F),
                PartPose.offsetAndRotation(2.32F, 5.4F, -5.8F, 0.0F, 0.4189F, -0.1745F));
        PartDefinition faceEyeL = faceSocketL.addOrReplaceChild("face_eye_l",
                CubeListBuilder.create()
                        .texOffs(0, 64).addBox(-2.08F, -2.08F, -3.328F, 4.16F, 4.16F, 3.328F),
                PartPose.offset(0.0F, 0.0F, -0.9F));
        PartDefinition faceBrowL = face.addOrReplaceChild("face_brow_l",
                CubeListBuilder.create()
                        .texOffs(85, 83).addBox(-2.912F, -0.9F, -1.2F, 5.824F, 1.1F, 1.4F),
                PartPose.offsetAndRotation(2.32F, 2.4048F, -5.9F, 0.0F, 0.0F, 0.2443F));
        PartDefinition faceSpare0 = face.addOrReplaceChild("face_spare0",
                CubeListBuilder.create()
                        .texOffs(65, 72).addBox(-1.144F, -1.144F, -1.9448F, 2.288F, 2.288F, 1.9448F),
                PartPose.offsetAndRotation(-2.4F, -4.5F, -5.7F, 0.0F, -0.2094F, -0.2496F));
        PartDefinition faceSpare1 = face.addOrReplaceChild("face_spare1",
                CubeListBuilder.create()
                        .texOffs(74, 72).addBox(-0.936F, -0.936F, -1.5912F, 1.872F, 1.872F, 1.5912F),
                PartPose.offsetAndRotation(2.72F, -5.76F, -5.7F, 0.0F, 0.2374F, -0.2813F));
        PartDefinition faceSpare2 = face.addOrReplaceChild("face_spare2",
                CubeListBuilder.create()
                        .texOffs(61, 78).addBox(-0.832F, -0.832F, -1.4144F, 1.664F, 1.664F, 1.4144F),
                PartPose.offsetAndRotation(0.0F, -9.0F, -5.7F, 0.0F, 0.0F, -0.363F));
        PartDefinition faceMaw = face.addOrReplaceChild("face_maw",
                CubeListBuilder.create()
                        .texOffs(35, 72).addBox(-3.36F, -1.2F, -1.6F, 6.72F, 1.6F, 1.8F),
                PartPose.offset(0.0F, 11.88F, -5.6F));
        PartDefinition faceUt0 = faceMaw.addOrReplaceChild("face_ut0",
                CubeListBuilder.create()
                        .texOffs(100, 83).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(-2.72F, 0.4F, -0.9F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceUt1 = faceMaw.addOrReplaceChild("face_ut1",
                CubeListBuilder.create()
                        .texOffs(117, 78).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(-1.36F, 0.4F, -0.9F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceUt2 = faceMaw.addOrReplaceChild("face_ut2",
                CubeListBuilder.create()
                        .texOffs(122, 78).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.9F, 0.9F),
                PartPose.offset(0.0F, 0.4F, -0.9F));
        PartDefinition faceUt3 = faceMaw.addOrReplaceChild("face_ut3",
                CubeListBuilder.create()
                        .texOffs(0, 83).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.65F, 0.9F),
                PartPose.offsetAndRotation(1.36F, 0.4F, -0.9F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceUt4 = faceMaw.addOrReplaceChild("face_ut4",
                CubeListBuilder.create()
                        .texOffs(105, 83).addBox(-0.45F, 0.0F, -0.45F, 0.9F, 1.4F, 0.9F),
                PartPose.offsetAndRotation(2.72F, 0.4F, -0.9F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceJaw = face.addOrReplaceChild("face_jaw",
                CubeListBuilder.create()
                        .texOffs(63, 64).addBox(-3.2F, 0.0F, -3.0F, 6.4F, 1.6F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 12.6F, -4.4F, 0.4538F, 0.0F, 0.0F));
        PartDefinition faceLt0 = faceJaw.addOrReplaceChild("face_lt0",
                CubeListBuilder.create()
                        .texOffs(110, 83).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(-2.56F, 0.1F, -2.4F, 0.0F, 0.0F, 0.1396F));
        PartDefinition faceLt1 = faceJaw.addOrReplaceChild("face_lt1",
                CubeListBuilder.create()
                        .texOffs(5, 83).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(-1.28F, 0.1F, -2.4F, 0.0F, 0.0F, 0.0698F));
        PartDefinition faceLt2 = faceJaw.addOrReplaceChild("face_lt2",
                CubeListBuilder.create()
                        .texOffs(10, 83).addBox(-0.4F, -1.7F, -0.4F, 0.8F, 1.7F, 0.8F),
                PartPose.offset(0.0F, 0.1F, -2.4F));
        PartDefinition faceLt3 = faceJaw.addOrReplaceChild("face_lt3",
                CubeListBuilder.create()
                        .texOffs(15, 83).addBox(-0.4F, -1.5F, -0.4F, 0.8F, 1.5F, 0.8F),
                PartPose.offsetAndRotation(1.28F, 0.1F, -2.4F, 0.0F, 0.0F, -0.0698F));
        PartDefinition faceLt4 = faceJaw.addOrReplaceChild("face_lt4",
                CubeListBuilder.create()
                        .texOffs(115, 83).addBox(-0.4F, -1.3F, -0.4F, 0.8F, 1.3F, 0.8F),
                PartPose.offsetAndRotation(2.56F, 0.1F, -2.4F, 0.0F, 0.0F, -0.1396F));
        PartDefinition faceGullet = faceJaw.addOrReplaceChild("face_gullet",
                CubeListBuilder.create()
                        .texOffs(48, 78).addBox(-2.08F, -0.2F, -1.4F, 4.16F, 0.9F, 1.8F),
                PartPose.offset(0.0F, 0.2F, -1.4F));
        PartDefinition mut1Throat = head.addOrReplaceChild("mut1_throat",
                CubeListBuilder.create()
                        .texOffs(74, 0).addBox(0.0F, -2.1F, -6.5F, 0.9F, 4.2F, 13.0F),
                PartPose.offset(0.0F, 8.0F, 1.6F));
        PartDefinition mut1ThroatRib0 = mut1Throat.addOrReplaceChild("mut1_throat_rib0",
                CubeListBuilder.create()
                        .texOffs(115, 64).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.864F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.764F, -5.2F, 0.0F, 0.0F, -0.2443F));
        PartDefinition mut1ThroatRib1 = mut1Throat.addOrReplaceChild("mut1_throat_rib1",
                CubeListBuilder.create()
                        .texOffs(120, 64).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.6855F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.764F, -3.9F, 0.0F, 0.0F, -0.3098F));
        PartDefinition mut1ThroatRib2 = mut1Throat.addOrReplaceChild("mut1_throat_rib2",
                CubeListBuilder.create()
                        .texOffs(0, 72).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.507F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.764F, -2.6F, 0.0F, 0.0F, -0.3752F));
        PartDefinition mut1ThroatRib3 = mut1Throat.addOrReplaceChild("mut1_throat_rib3",
                CubeListBuilder.create()
                        .texOffs(18, 78).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.3285F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.764F, -1.3F, 0.0F, 0.0F, -0.4407F));
        PartDefinition mut1ThroatRib4 = mut1Throat.addOrReplaceChild("mut1_throat_rib4",
                CubeListBuilder.create()
                        .texOffs(23, 78).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 3.15F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.764F, 0.0F, 0.0F, 0.0F, -0.5061F));
        PartDefinition mut1ThroatRib5 = mut1Throat.addOrReplaceChild("mut1_throat_rib5",
                CubeListBuilder.create()
                        .texOffs(28, 78).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 2.9715F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.764F, 1.3F, 0.0F, 0.0F, -0.5716F));
        PartDefinition mut1ThroatRib6 = mut1Throat.addOrReplaceChild("mut1_throat_rib6",
                CubeListBuilder.create()
                        .texOffs(33, 78).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 2.793F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.764F, 2.6F, 0.0F, 0.0F, -0.637F));
        PartDefinition mut1ThroatRib7 = mut1Throat.addOrReplaceChild("mut1_throat_rib7",
                CubeListBuilder.create()
                        .texOffs(38, 78).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 2.6145F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.764F, 3.9F, 0.0F, 0.0F, -0.7025F));
        PartDefinition mut1ThroatRib8 = mut1Throat.addOrReplaceChild("mut1_throat_rib8",
                CubeListBuilder.create()
                        .texOffs(20, 83).addBox(-0.55F, 0.0F, -0.6F, 0.9F, 2.436F, 1.2F),
                PartPose.offsetAndRotation(-0.35F, -1.764F, 5.2F, 0.0F, 0.0F, -0.7679F));
        PartDefinition mut1ThroatGut = mut1Throat.addOrReplaceChild("mut1_throat_gut",
                CubeListBuilder.create()
                        .texOffs(98, 43).addBox(-1.1F, 0.0F, -3.38F, 1.6F, 1.68F, 6.76F),
                PartPose.offset(-0.9F, 0.252F, 0.0F));
        PartDefinition mut1ThroatGut2 = mut1ThroatGut.addOrReplaceChild("mut1_throat_gut2",
                CubeListBuilder.create()
                        .texOffs(104, 64).addBox(-0.8F, 0.0F, -2.08F, 1.2F, 1.26F, 4.16F),
                PartPose.offsetAndRotation(0.0F, 1.428F, 0.0F, 0.0F, 0.0F, 0.3142F));
        PartDefinition mut1ThroatPelt = mut1Throat.addOrReplaceChild("mut1_throat_pelt",
                CubeListBuilder.create()
                        .texOffs(73, 29).addBox(-1.1F, 0.0F, -3.9F, 1.2F, 3.024F, 7.8F),
                PartPose.offsetAndRotation(-0.5F, 1.848F, 1.56F, 0.0F, 0.0F, -0.5934F));
        PartDefinition mut1ThroatPelt2 = mut1ThroatPelt.addOrReplaceChild("mut1_throat_pelt2",
                CubeListBuilder.create()
                        .texOffs(15, 64).addBox(-0.9F, 0.0F, -2.6F, 1.0F, 1.764F, 5.2F),
                PartPose.offsetAndRotation(0.0F, 2.94F, 0.0F, 0.0F, 0.0F, -0.3491F));
        PartDefinition mut1ThroatVert0 = mut1Throat.addOrReplaceChild("mut1_throat_vert0",
                CubeListBuilder.create()
                        .texOffs(120, 83).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.184F, -4.16F));
        PartDefinition mut1ThroatVert1 = mut1Throat.addOrReplaceChild("mut1_throat_vert1",
                CubeListBuilder.create()
                        .texOffs(0, 87).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.184F, -2.9343F));
        PartDefinition mut1ThroatVert2 = mut1Throat.addOrReplaceChild("mut1_throat_vert2",
                CubeListBuilder.create()
                        .texOffs(5, 87).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.184F, -1.7086F));
        PartDefinition mut1ThroatVert3 = mut1Throat.addOrReplaceChild("mut1_throat_vert3",
                CubeListBuilder.create()
                        .texOffs(10, 87).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.184F, -0.4829F));
        PartDefinition mut1ThroatVert4 = mut1Throat.addOrReplaceChild("mut1_throat_vert4",
                CubeListBuilder.create()
                        .texOffs(15, 87).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.184F, 0.7429F));
        PartDefinition mut1ThroatVert5 = mut1Throat.addOrReplaceChild("mut1_throat_vert5",
                CubeListBuilder.create()
                        .texOffs(20, 87).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.184F, 1.9686F));
        PartDefinition mut1ThroatVert6 = mut1Throat.addOrReplaceChild("mut1_throat_vert6",
                CubeListBuilder.create()
                        .texOffs(25, 87).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.184F, 3.1943F));
        PartDefinition mut1ThroatVert7 = mut1Throat.addOrReplaceChild("mut1_throat_vert7",
                CubeListBuilder.create()
                        .texOffs(30, 87).addBox(-0.7F, -1.1F, -0.7F, 1.4F, 1.4F, 1.4F),
                PartPose.offset(-0.2F, -2.184F, 4.42F));
        PartDefinition mut1Tongue = head.addOrReplaceChild("mut1_tongue",
                CubeListBuilder.create()
                        .texOffs(43, 78).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 3.5F, -8.0F, 1.0123F, 0.0F, 0.0F));
        PartDefinition mut1Tongue1 = mut1Tongue.addOrReplaceChild("mut1_tongue_1",
                CubeListBuilder.create()
                        .texOffs(25, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.439F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.6F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue2 = mut1Tongue1.addOrReplaceChild("mut1_tongue_2",
                CubeListBuilder.create()
                        .texOffs(30, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.288F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.439F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue3 = mut1Tongue2.addOrReplaceChild("mut1_tongue_3",
                CubeListBuilder.create()
                        .texOffs(35, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.1463F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.288F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue4 = mut1Tongue3.addOrReplaceChild("mut1_tongue_4",
                CubeListBuilder.create()
                        .texOffs(40, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0134F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.1463F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue5 = mut1Tongue4.addOrReplaceChild("mut1_tongue_5",
                CubeListBuilder.create()
                        .texOffs(45, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.8888F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 2.0134F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue6 = mut1Tongue5.addOrReplaceChild("mut1_tongue_6",
                CubeListBuilder.create()
                        .texOffs(50, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.7718F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.8888F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue7 = mut1Tongue6.addOrReplaceChild("mut1_tongue_7",
                CubeListBuilder.create()
                        .texOffs(55, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.6621F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.7718F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1Tongue8 = mut1Tongue7.addOrReplaceChild("mut1_tongue_8",
                CubeListBuilder.create()
                        .texOffs(60, 83).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.5592F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.6621F, 0.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition mut1TongueTip = mut1Tongue8.addOrReplaceChild("mut1_tongue_tip",
                CubeListBuilder.create()
                        .texOffs(65, 83).addBox(-0.6F, 0.0F, -0.5F, 1.2F, 1.6F, 1.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition mut2Stalks = head.addOrReplaceChild("mut2_stalks",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 14.0F, -1.5F));
        PartDefinition mut2StalksS0 = mut2Stalks.addOrReplaceChild("mut2_stalks_s0",
                CubeListBuilder.create()
                        .texOffs(5, 72).addBox(-0.5F, -3.6F, -0.5F, 1.0F, 3.6F, 1.0F),
                PartPose.offsetAndRotation(-2.2F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut2StalksE0 = mut2StalksS0.addOrReplaceChild("mut2_stalks_e0",
                CubeListBuilder.create()
                        .texOffs(83, 72).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.6F, 0.0F));
        PartDefinition mut2StalksS1 = mut2Stalks.addOrReplaceChild("mut2_stalks_s1",
                CubeListBuilder.create()
                        .texOffs(10, 72).addBox(-0.5F, -3.6F, -0.5F, 1.0F, 3.6F, 1.0F),
                PartPose.offsetAndRotation(-1.1F, 0.0F, -0.4F, -0.3142F, -0.2269F, -0.2618F));
        PartDefinition mut2StalksE1 = mut2StalksS1.addOrReplaceChild("mut2_stalks_e1",
                CubeListBuilder.create()
                        .texOffs(92, 72).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.6F, 0.0F));
        PartDefinition mut2StalksS2 = mut2Stalks.addOrReplaceChild("mut2_stalks_s2",
                CubeListBuilder.create()
                        .texOffs(15, 72).addBox(-0.5F, -3.6F, -0.5F, 1.0F, 3.6F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut2StalksE2 = mut2StalksS2.addOrReplaceChild("mut2_stalks_e2",
                CubeListBuilder.create()
                        .texOffs(101, 72).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.6F, 0.0F));
        PartDefinition mut2StalksS3 = mut2Stalks.addOrReplaceChild("mut2_stalks_s3",
                CubeListBuilder.create()
                        .texOffs(20, 72).addBox(-0.5F, -3.6F, -0.5F, 1.0F, 3.6F, 1.0F),
                PartPose.offsetAndRotation(1.1F, 0.0F, -0.4F, -0.3142F, 0.2269F, 0.2618F));
        PartDefinition mut2StalksE3 = mut2StalksS3.addOrReplaceChild("mut2_stalks_e3",
                CubeListBuilder.create()
                        .texOffs(110, 72).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.6F, 0.0F));
        PartDefinition mut2StalksS4 = mut2Stalks.addOrReplaceChild("mut2_stalks_s4",
                CubeListBuilder.create()
                        .texOffs(25, 72).addBox(-0.5F, -3.6F, -0.5F, 1.0F, 3.6F, 1.0F),
                PartPose.offsetAndRotation(2.2F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut2StalksE4 = mut2StalksS4.addOrReplaceChild("mut2_stalks_e4",
                CubeListBuilder.create()
                        .texOffs(119, 72).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -3.6F, 0.0F));
        PartDefinition mut2ArmR = head.addOrReplaceChild("mut2_arm_r",
                CubeListBuilder.create()
                        .texOffs(54, 64).addBox(-0.84F, 0.0F, -0.84F, 1.68F, 4.2F, 1.68F),
                PartPose.offsetAndRotation(-3.0F, 12.0F, 0.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut2ArmRFore = mut2ArmR.addOrReplaceChild("mut2_arm_r_fore",
                CubeListBuilder.create()
                        .texOffs(30, 72).addBox(-0.7F, 0.0F, -0.7F, 1.4F, 4.2F, 1.4F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut2ArmRHand = mut2ArmRFore.addOrReplaceChild("mut2_arm_r_hand",
                CubeListBuilder.create()
                        .texOffs(68, 78).addBox(-0.98F, 0.0F, -0.63F, 1.96F, 1.54F, 1.26F),
                PartPose.offsetAndRotation(0.0F, 4.2F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF0 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f0",
                CubeListBuilder.create()
                        .texOffs(35, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(-0.77F, 1.54F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut2ArmRF01 = mut2ArmRF0.addOrReplaceChild("mut2_arm_r_f0_1",
                CubeListBuilder.create()
                        .texOffs(40, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF02 = mut2ArmRF01.addOrReplaceChild("mut2_arm_r_f0_2",
                CubeListBuilder.create()
                        .texOffs(45, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF1 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f1",
                CubeListBuilder.create()
                        .texOffs(50, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(-0.245F, 1.54F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut2ArmRF11 = mut2ArmRF1.addOrReplaceChild("mut2_arm_r_f1_1",
                CubeListBuilder.create()
                        .texOffs(55, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF12 = mut2ArmRF11.addOrReplaceChild("mut2_arm_r_f1_2",
                CubeListBuilder.create()
                        .texOffs(60, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF2 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f2",
                CubeListBuilder.create()
                        .texOffs(65, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(0.28F, 1.54F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut2ArmRF21 = mut2ArmRF2.addOrReplaceChild("mut2_arm_r_f2_1",
                CubeListBuilder.create()
                        .texOffs(70, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF22 = mut2ArmRF21.addOrReplaceChild("mut2_arm_r_f2_2",
                CubeListBuilder.create()
                        .texOffs(75, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF3 = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_f3",
                CubeListBuilder.create()
                        .texOffs(80, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.12F, 1.0F),
                PartPose.offsetAndRotation(0.805F, 1.54F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut2ArmRF31 = mut2ArmRF3.addOrReplaceChild("mut2_arm_r_f3_1",
                CubeListBuilder.create()
                        .texOffs(85, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.0386F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.12F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRF32 = mut2ArmRF31.addOrReplaceChild("mut2_arm_r_f3_2",
                CubeListBuilder.create()
                        .texOffs(90, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9632F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.0386F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut2ArmRThumb = mut2ArmRHand.addOrReplaceChild("mut2_arm_r_thumb",
                CubeListBuilder.create()
                        .texOffs(95, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 1.05F, 1.0F),
                PartPose.offsetAndRotation(-0.98F, 0.7F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut2ArmRThumb1 = mut2ArmRThumb.addOrReplaceChild("mut2_arm_r_thumb_1",
                CubeListBuilder.create()
                        .texOffs(100, 87).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 0.9681F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 1.05F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut1Eyes = head.addOrReplaceChild("mut1_eyes",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 1.5F, -9.0F));
        PartDefinition mut1EyesE0 = mut1Eyes.addOrReplaceChild("mut1_eyes_e0",
                CubeListBuilder.create()
                        .texOffs(75, 78).addBox(-1.1F, -1.1F, -1.364F, 2.2F, 2.2F, 1.364F)
                        .texOffs(0, 78).addBox(-1.364F, -1.364F, -0.66F, 2.728F, 2.728F, 0.88F),
                PartPose.offsetAndRotation(-1.8F, 0.0F, -0.4F, 0.0F, -0.4538F, 0.0F));
        PartDefinition mut1EyesE1 = mut1Eyes.addOrReplaceChild("mut1_eyes_e1",
                CubeListBuilder.create()
                        .texOffs(82, 78).addBox(-0.769F, -0.769F, -0.9535F, 1.5379F, 1.5379F, 0.9535F)
                        .texOffs(89, 78).addBox(-0.9535F, -0.9535F, -0.4614F, 1.907F, 1.907F, 0.6152F),
                PartPose.offsetAndRotation(-0.6F, 1.7581F, -0.5691F, 0.0F, -0.1513F, 0.236F));
        PartDefinition mut1EyesE2 = mut1Eyes.addOrReplaceChild("mut1_eyes_e2",
                CubeListBuilder.create()
                        .texOffs(96, 78).addBox(-1.0874F, -1.0874F, -1.3484F, 2.1748F, 2.1748F, 1.3484F)
                        .texOffs(9, 78).addBox(-1.3484F, -1.3484F, -0.6524F, 2.6967F, 2.6967F, 0.8699F),
                PartPose.offsetAndRotation(0.6F, -2.5905F, -0.6491F, 0.0F, 0.1513F, -0.3478F));
        PartDefinition mut1EyesE3 = mut1Eyes.addOrReplaceChild("mut1_eyes_e3",
                CubeListBuilder.create()
                        .texOffs(103, 78).addBox(-0.8636F, -0.8636F, -1.0709F, 1.7273F, 1.7273F, 1.0709F)
                        .texOffs(110, 78).addBox(-1.0709F, -1.0709F, -0.5182F, 2.1418F, 2.1418F, 0.6909F),
                PartPose.offsetAndRotation(1.8F, 2.0588F, -0.598F, 0.0F, 0.4538F, 0.2764F));
        PartDefinition bodyShell = body.addOrReplaceChild("body_shell",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-6.0F, -10.0F, -7.0F, 12.0F, 18.0F, 10.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 1.571F, 0.0F, 0.0F));
        PartDefinition mut1Bulb = body.addOrReplaceChild("mut1_bulb",
                CubeListBuilder.create()
                        .texOffs(92, 29).addBox(-3.0F, -2.5F, -2.5F, 6.0F, 5.0F, 5.0F),
                PartPose.offset(0.0F, -1.0F, 4.0F));
        PartDefinition mut1BulbCore = mut1Bulb.addOrReplaceChild("mut1_bulb_core",
                CubeListBuilder.create()
                        .texOffs(54, 72).addBox(-1.5F, -1.25F, -1.25F, 3.0F, 2.5F, 2.5F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(51, 43).addBox(-2.0F, 0.0F, -2.0F, 4.0F, 6.16F, 4.0F),
                PartPose.offset(3.5F, 10.0F, -5.0F));
        PartDefinition legFl1 = legFl.addOrReplaceChild("leg_fl_1",
                CubeListBuilder.create()
                        .texOffs(15, 54).addBox(-1.65F, 0.0F, -1.8F, 3.3F, 5.32F, 3.6F),
                PartPose.offset(0.0F, 6.16F, 0.0F));
        PartDefinition footFl = legFl1.addOrReplaceChild("foot_fl",
                CubeListBuilder.create()
                        .texOffs(87, 54).addBox(-2.0F, 0.0F, -2.4F, 4.0F, 2.52F, 4.6F),
                PartPose.offset(0.0F, 5.32F, 0.0F));
        PartDefinition leftChest = root.addOrReplaceChild("left_chest",
                CubeListBuilder.create()
                        .texOffs(50, 29).addBox(-3.0F, 0.0F, 0.0F, 8.0F, 8.0F, 3.0F),
                PartPose.offsetAndRotation(5.5F, 3.0F, 3.0F, 0.0F, 1.571F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }
}
