package com.gildedseam.client.model;

import net.minecraft.client.model.geom.PartPose;
import net.minecraft.client.model.geom.builders.CubeListBuilder;
import net.minecraft.client.model.geom.builders.LayerDefinition;
import net.minecraft.client.model.geom.builders.MeshDefinition;
import net.minecraft.client.model.geom.builders.PartDefinition;

/** Generated geometry (the folk); source of truth is tools/modelgen/models.py. */
public final class FolkLayers {
    public static LayerDefinition createRefugeeLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-4.0F, 0.0F, -2.0F, 8.0F, 10.0F, 4.0F)
                        .texOffs(0, 15).addBox(-4.5F, 6.0F, -2.5F, 9.0F, 4.0F, 5.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition bundle = body.addOrReplaceChild("bundle",
                CubeListBuilder.create()
                        .texOffs(29, 15).addBox(-2.5F, 0.0F, 0.0F, 5.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 1.0F, 2.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(51, 0).addBox(-3.0F, -6.0F, -3.0F, 6.0F, 6.0F, 6.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition hood = head.addOrReplaceChild("hood",
                CubeListBuilder.create()
                        .texOffs(76, 0).addBox(-3.5F, 0.0F, -3.5F, 7.0F, 4.0F, 7.0F)
                        .texOffs(98, 15).addBox(-3.5F, 4.0F, 1.0F, 7.0F, 3.0F, 3.0F),
                PartPose.offset(0.0F, -6.0F, 0.0F));
        PartDefinition armR = body.addOrReplaceChild("arm_r",
                CubeListBuilder.create()
                        .texOffs(25, 0).addBox(-2.0F, 0.0F, -1.5F, 3.0F, 10.0F, 3.0F),
                PartPose.offset(-4.5F, 1.0F, 0.0F));
        PartDefinition armL = body.addOrReplaceChild("arm_l",
                CubeListBuilder.create()
                        .texOffs(38, 0).addBox(-1.0F, 0.0F, -1.5F, 3.0F, 10.0F, 3.0F),
                PartPose.offset(4.5F, 1.0F, 0.0F));
        PartDefinition legR = root.addOrReplaceChild("leg_r",
                CubeListBuilder.create()
                        .texOffs(46, 15).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(-2.0F, 16.0F, 0.0F));
        PartDefinition legRLower = legR.addOrReplaceChild("leg_r_lower",
                CubeListBuilder.create()
                        .texOffs(59, 15).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition legL = root.addOrReplaceChild("leg_l",
                CubeListBuilder.create()
                        .texOffs(72, 15).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(2.0F, 16.0F, 0.0F));
        PartDefinition legLLower = legL.addOrReplaceChild("leg_l_lower",
                CubeListBuilder.create()
                        .texOffs(85, 15).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGiltMadLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-4.0F, 0.0F, -2.0F, 8.0F, 10.0F, 4.0F)
                        .texOffs(51, 0).addBox(-5.0F, 7.0F, -3.0F, 10.0F, 6.0F, 6.0F)
                        .texOffs(109, 0).addBox(-0.5F, 1.0F, -2.5F, 1.0F, 8.0F, 1.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(84, 0).addBox(-3.0F, -6.0F, -3.0F, 6.0F, 6.0F, 6.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition halfMask = head.addOrReplaceChild("half_mask",
                CubeListBuilder.create()
                        .texOffs(52, 15).addBox(-3.2F, 0.5F, -3.3F, 6.0F, 3.0F, 1.0F),
                PartPose.offset(0.0F, -6.0F, 0.0F));
        PartDefinition armR = body.addOrReplaceChild("arm_r",
                CubeListBuilder.create()
                        .texOffs(25, 0).addBox(-2.0F, 0.0F, -1.5F, 3.0F, 10.0F, 3.0F),
                PartPose.offset(-4.5F, 1.0F, 0.0F));
        PartDefinition bell = armR.addOrReplaceChild("bell",
                CubeListBuilder.create()
                        .texOffs(39, 15).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 3.0F, 3.0F),
                PartPose.offset(-0.5F, 10.0F, 0.0F));
        PartDefinition armL = body.addOrReplaceChild("arm_l",
                CubeListBuilder.create()
                        .texOffs(38, 0).addBox(-1.0F, 0.0F, -1.5F, 3.0F, 10.0F, 3.0F),
                PartPose.offset(4.5F, 1.0F, 0.0F));
        PartDefinition legR = root.addOrReplaceChild("leg_r",
                CubeListBuilder.create()
                        .texOffs(114, 0).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(-2.0F, 16.0F, 0.0F));
        PartDefinition legRLower = legR.addOrReplaceChild("leg_r_lower",
                CubeListBuilder.create()
                        .texOffs(0, 15).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition legL = root.addOrReplaceChild("leg_l",
                CubeListBuilder.create()
                        .texOffs(13, 15).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(2.0F, 16.0F, 0.0F));
        PartDefinition legLLower = legL.addOrReplaceChild("leg_l_lower",
                CubeListBuilder.create()
                        .texOffs(26, 15).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createHalfSewnLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-4.0F, 0.0F, -2.0F, 8.0F, 10.0F, 4.0F)
                        .texOffs(76, 0).addBox(-4.2F, 1.0F, -2.4F, 4.0F, 7.0F, 1.0F)
                        .texOffs(44, 15).addBox(0.2F, 2.0F, -2.3F, 1.0F, 6.0F, 1.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(51, 0).addBox(-3.0F, -6.0F, -3.0F, 6.0F, 6.0F, 6.0F)
                        .texOffs(26, 15).addBox(-3.2F, -6.2F, -3.2F, 3.0F, 6.0F, 1.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition armR = body.addOrReplaceChild("arm_r",
                CubeListBuilder.create()
                        .texOffs(25, 0).addBox(-2.0F, 0.0F, -1.5F, 3.0F, 10.0F, 3.0F),
                PartPose.offset(-4.5F, 1.0F, 0.0F));
        PartDefinition armL = body.addOrReplaceChild("arm_l",
                CubeListBuilder.create()
                        .texOffs(38, 0).addBox(-1.0F, 0.0F, -1.5F, 3.0F, 10.0F, 3.0F),
                PartPose.offset(4.5F, 1.0F, 0.0F));
        PartDefinition mut1Patch = body.addOrReplaceChild("mut1_patch",
                CubeListBuilder.create()
                        .texOffs(49, 15).addBox(0.4F, 2.0F, 1.4F, 3.0F, 5.0F, 1.0F)
                        .texOffs(58, 15).addBox(-3.4F, 6.0F, 1.4F, 2.0F, 3.0F, 1.0F),
                PartPose.offset(0.0F, 0.0F, 0.0F));
        PartDefinition mut2SpareArm = body.addOrReplaceChild("mut2_spare_arm",
                CubeListBuilder.create()
                        .texOffs(87, 0).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offset(-4.0F, 6.0F, 1.0F));
        PartDefinition mut2SpareArmLower = mut2SpareArm.addOrReplaceChild("mut2_spare_arm_lower",
                CubeListBuilder.create()
                        .texOffs(35, 15).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 5.0F, 2.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition legR = root.addOrReplaceChild("leg_r",
                CubeListBuilder.create()
                        .texOffs(96, 0).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(-2.0F, 16.0F, 0.0F));
        PartDefinition legRLower = legR.addOrReplaceChild("leg_r_lower",
                CubeListBuilder.create()
                        .texOffs(109, 0).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition legL = root.addOrReplaceChild("leg_l",
                CubeListBuilder.create()
                        .texOffs(0, 15).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(2.0F, 16.0F, 0.0F));
        PartDefinition legLLower = legL.addOrReplaceChild("leg_l_lower",
                CubeListBuilder.create()
                        .texOffs(13, 15).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    private FolkLayers() {
    }
}
