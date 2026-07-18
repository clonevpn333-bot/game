package com.gildedseam.client.model;

import net.minecraft.client.model.geom.PartPose;
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
                        .texOffs(0, 0).addBox(-6.0F, -10.0F, -9.0F, 12.0F, 10.0F, 18.0F)
                        .texOffs(61, 0).addBox(-0.5F, 0.0F, -8.0F, 1.0F, 1.0F, 16.0F),
                PartPose.offset(0.0F, 11.0F, 0.0F));
        PartDefinition hump = body.addOrReplaceChild("hump",
                CubeListBuilder.create()
                        .texOffs(67, 29).addBox(-3.0F, -3.0F, -2.0F, 6.0F, 3.0F, 6.0F),
                PartPose.offset(0.0F, -10.0F, -4.0F));
        PartDefinition mut2Bloom = hump.addOrReplaceChild("mut2_bloom",
                CubeListBuilder.create()
                        .texOffs(65, 41).addBox(-3.0F, -5.0F, -0.5F, 6.0F, 5.0F, 1.0F)
                        .texOffs(0, 29).addBox(-0.5F, -5.0F, -3.0F, 1.0F, 5.0F, 6.0F)
                        .texOffs(96, 41).addBox(-1.0F, -3.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, -3.0F, 1.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(96, 0).addBox(-4.0F, -3.0F, -6.0F, 8.0F, 7.0F, 6.0F),
                PartPose.offset(0.0F, -8.0F, -9.0F));
        PartDefinition jaw = head.addOrReplaceChild("jaw",
                CubeListBuilder.create()
                        .texOffs(26, 41).addBox(-3.5F, 0.0F, 0.0F, 3.0F, 2.0F, 5.0F)
                        .texOffs(43, 41).addBox(0.5F, 0.0F, 0.0F, 3.0F, 2.0F, 5.0F)
                        .texOffs(80, 41).addBox(-0.5F, 0.0F, 0.5F, 1.0F, 2.0F, 4.0F),
                PartPose.offsetAndRotation(0.0F, 4.0F, -6.0F, 0.1396F, 0.0F, 0.0F));
        PartDefinition hornR = head.addOrReplaceChild("horn_r",
                CubeListBuilder.create()
                        .texOffs(105, 41).addBox(-1.0F, -3.0F, -1.0F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(-4.0F, -2.0F, -3.0F, 0.0F, 0.0F, 0.6109F));
        PartDefinition hornL = head.addOrReplaceChild("horn_l",
                CubeListBuilder.create()
                        .texOffs(110, 41).addBox(0.0F, -3.0F, -1.0F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(4.0F, -2.0F, -3.0F, 0.0F, 0.0F, -0.6109F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(60, 41).addBox(-0.5F, 0.0F, 0.0F, 1.0F, 6.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -9.0F, 9.0F, 0.5236F, 0.0F, 0.0F));
        PartDefinition mut1Spine0 = body.addOrReplaceChild("mut1_spine_0",
                CubeListBuilder.create()
                        .texOffs(91, 41).addBox(-0.5F, -4.0F, -0.5F, 1.0F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -10.0F, 1.0F, -0.1745F, 0.0F, 0.0F));
        PartDefinition mut1Spine1 = body.addOrReplaceChild("mut1_spine_1",
                CubeListBuilder.create()
                        .texOffs(115, 41).addBox(-0.5F, -3.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -10.0F, 5.0F, 0.1745F, 0.0F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(15, 29).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 7.0F, 3.0F),
                PartPose.offset(-4.0F, 11.0F, -6.0F));
        PartDefinition legFrLower = legFr.addOrReplaceChild("leg_fr_lower",
                CubeListBuilder.create()
                        .texOffs(92, 29).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 6.0F, 3.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(28, 29).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 7.0F, 3.0F),
                PartPose.offset(4.0F, 11.0F, -6.0F));
        PartDefinition legFlLower = legFl.addOrReplaceChild("leg_fl_lower",
                CubeListBuilder.create()
                        .texOffs(105, 29).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 6.0F, 3.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(41, 29).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 7.0F, 3.0F),
                PartPose.offset(-4.0F, 11.0F, 6.0F));
        PartDefinition legBrLower = legBr.addOrReplaceChild("leg_br_lower",
                CubeListBuilder.create()
                        .texOffs(0, 41).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 6.0F, 3.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(54, 29).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 7.0F, 3.0F),
                PartPose.offset(4.0F, 11.0F, 6.0F));
        PartDefinition legBlLower = legBl.addOrReplaceChild("leg_bl_lower",
                CubeListBuilder.create()
                        .texOffs(13, 41).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 6.0F, 3.0F),
                PartPose.offset(0.0F, 7.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedPigLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-5.0F, -8.0F, -7.0F, 10.0F, 8.0F, 14.0F),
                PartPose.offset(0.0F, 16.0F, 0.0F));
        PartDefinition lid = body.addOrReplaceChild("lid",
                CubeListBuilder.create()
                        .texOffs(49, 0).addBox(-4.0F, -2.0F, -5.0F, 8.0F, 2.0F, 10.0F)
                        .texOffs(65, 34).addBox(-1.0F, -4.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, -8.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(0, 23).addBox(-3.5F, -3.0F, -4.0F, 7.0F, 6.0F, 4.0F),
                PartPose.offset(0.0F, -4.0F, -7.0F));
        PartDefinition snout = head.addOrReplaceChild("snout",
                CubeListBuilder.create()
                        .texOffs(52, 34).addBox(-1.5F, -1.0F, -3.0F, 3.0F, 3.0F, 3.0F),
                PartPose.offset(0.0F, 0.0F, -4.0F));
        PartDefinition tail = body.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(74, 34).addBox(-0.5F, 0.0F, 0.0F, 1.0F, 1.0F, 3.0F)
                        .texOffs(101, 34).addBox(-0.5F, -1.0F, 2.0F, 1.0F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -6.0F, 7.0F, -0.6981F, 0.0F, 0.0F));
        PartDefinition mut1SpoutR = body.addOrReplaceChild("mut1_spout_r",
                CubeListBuilder.create()
                        .texOffs(83, 34).addBox(-2.0F, -1.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-5.0F, -4.0F, 0.0F, 0.0F, 0.0F, 0.3491F));
        PartDefinition mut1SpoutL = body.addOrReplaceChild("mut1_spout_l",
                CubeListBuilder.create()
                        .texOffs(92, 34).addBox(0.0F, -1.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(5.0F, -4.0F, 0.0F, 0.0F, 0.0F, -0.3491F));
        PartDefinition mut2GlowRing = body.addOrReplaceChild("mut2_glow_ring",
                CubeListBuilder.create()
                        .texOffs(86, 0).addBox(-3.5F, 0.0F, -4.5F, 7.0F, 1.0F, 9.0F),
                PartPose.offset(0.0F, -8.5F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(23, 23).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(-3.0F, 16.0F, -4.5F));
        PartDefinition legFrLower = legFr.addOrReplaceChild("leg_fr_lower",
                CubeListBuilder.create()
                        .texOffs(36, 23).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(49, 23).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(3.0F, 16.0F, -4.5F));
        PartDefinition legFlLower = legFl.addOrReplaceChild("leg_fl_lower",
                CubeListBuilder.create()
                        .texOffs(62, 23).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(75, 23).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(-3.0F, 16.0F, 4.5F));
        PartDefinition legBrLower = legBr.addOrReplaceChild("leg_br_lower",
                CubeListBuilder.create()
                        .texOffs(88, 23).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(101, 23).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(3.0F, 16.0F, 4.5F));
        PartDefinition legBlLower = legBl.addOrReplaceChild("leg_bl_lower",
                CubeListBuilder.create()
                        .texOffs(114, 23).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition mut2LegMr = root.addOrReplaceChild("mut2_leg_mr",
                CubeListBuilder.create()
                        .texOffs(0, 34).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(-3.6F, 16.0F, 0.0F));
        PartDefinition mut2LegMrLower = mut2LegMr.addOrReplaceChild("mut2_leg_mr_lower",
                CubeListBuilder.create()
                        .texOffs(13, 34).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition mut2LegMl = root.addOrReplaceChild("mut2_leg_ml",
                CubeListBuilder.create()
                        .texOffs(26, 34).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(3.6F, 16.0F, 0.0F));
        PartDefinition mut2LegMlLower = mut2LegMl.addOrReplaceChild("mut2_leg_ml_lower",
                CubeListBuilder.create()
                        .texOffs(39, 34).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedSheepLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(57, 0).addBox(-4.0F, -6.0F, -8.0F, 8.0F, 6.0F, 16.0F),
                PartPose.offset(0.0F, 13.0F, 0.0F));
        PartDefinition fleece = body.addOrReplaceChild("fleece",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-5.0F, -3.0F, -9.0F, 10.0F, 5.0F, 18.0F),
                PartPose.offset(0.0F, -6.0F, 0.0F));
        PartDefinition tail = fleece.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(20, 35).addBox(-1.0F, 0.0F, 0.0F, 2.0F, 3.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 9.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition mut1Needle0 = fleece.addOrReplaceChild("mut1_needle_0",
                CubeListBuilder.create()
                        .texOffs(0, 35).addBox(-0.5F, -4.0F, -0.5F, 1.0F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(-3.0F, -3.0F, -6.0F, -0.3491F, 0.0F, 0.4363F));
        PartDefinition mut1Needle1 = fleece.addOrReplaceChild("mut1_needle_1",
                CubeListBuilder.create()
                        .texOffs(5, 35).addBox(-0.5F, -4.0F, -0.5F, 1.0F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(-1.0F, -3.0F, -2.0F, -0.1396F, 0.0F, 0.1745F));
        PartDefinition mut1Needle2 = fleece.addOrReplaceChild("mut1_needle_2",
                CubeListBuilder.create()
                        .texOffs(10, 35).addBox(-0.5F, -4.0F, -0.5F, 1.0F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(1.0F, -3.0F, 2.0F, 0.0698F, 0.0F, -0.0873F));
        PartDefinition mut1Needle3 = fleece.addOrReplaceChild("mut1_needle_3",
                CubeListBuilder.create()
                        .texOffs(15, 35).addBox(-0.5F, -4.0F, -0.5F, 1.0F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(3.0F, -3.0F, 6.0F, 0.2793F, 0.0F, -0.3491F));
        PartDefinition mut2Spool = fleece.addOrReplaceChild("mut2_spool",
                CubeListBuilder.create()
                        .texOffs(0, 24).addBox(-2.0F, -6.0F, -2.0F, 4.0F, 6.0F, 4.0F)
                        .texOffs(17, 24).addBox(-2.5F, -5.0F, -2.5F, 5.0F, 3.0F, 5.0F),
                PartPose.offset(0.0F, -3.0F, 2.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(106, 0).addBox(-3.0F, -3.0F, -5.0F, 6.0F, 6.0F, 5.0F)
                        .texOffs(110, 24).addBox(-4.0F, -2.0F, -3.0F, 1.0F, 2.0F, 3.0F)
                        .texOffs(119, 24).addBox(3.0F, -2.0F, -3.0F, 1.0F, 2.0F, 3.0F),
                PartPose.offset(0.0F, -4.0F, -8.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(38, 24).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offset(-2.5F, 13.0F, -6.0F));
        PartDefinition legFrLower = legFr.addOrReplaceChild("leg_fr_lower",
                CubeListBuilder.create()
                        .texOffs(74, 24).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 5.0F, 2.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(47, 24).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offset(2.5F, 13.0F, -6.0F));
        PartDefinition legFlLower = legFl.addOrReplaceChild("leg_fl_lower",
                CubeListBuilder.create()
                        .texOffs(83, 24).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 5.0F, 2.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(56, 24).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offset(-2.5F, 13.0F, 6.0F));
        PartDefinition legBrLower = legBr.addOrReplaceChild("leg_br_lower",
                CubeListBuilder.create()
                        .texOffs(92, 24).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 5.0F, 2.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(65, 24).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offset(2.5F, 13.0F, 6.0F));
        PartDefinition legBlLower = legBl.addOrReplaceChild("leg_bl_lower",
                CubeListBuilder.create()
                        .texOffs(101, 24).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 5.0F, 2.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedChickenLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-3.5F, -6.0F, -4.5F, 7.0F, 6.0F, 9.0F),
                PartPose.offset(0.0F, 16.0F, 0.0F));
        PartDefinition head = body.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(0, 16).addBox(-2.0F, -4.0F, -2.0F, 4.0F, 4.0F, 4.0F)
                        .texOffs(36, 25).addBox(-1.0F, -5.0F, -1.0F, 2.0F, 1.0F, 2.0F),
                PartPose.offset(0.0F, -5.0F, -3.5F));
        PartDefinition beak = head.addOrReplaceChild("beak",
                CubeListBuilder.create()
                        .texOffs(7, 25).addBox(-1.0F, -0.5F, -3.0F, 2.0F, 1.0F, 3.0F),
                PartPose.offset(0.0F, -2.0F, -2.0F));
        PartDefinition handle = body.addOrReplaceChild("handle",
                CubeListBuilder.create()
                        .texOffs(0, 25).addBox(-1.0F, 0.0F, 0.0F, 2.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -4.0F, 4.5F, -0.5236F, 0.0F, 0.0F));
        PartDefinition wingR = body.addOrReplaceChild("wing_r",
                CubeListBuilder.create()
                        .texOffs(33, 0).addBox(-1.0F, 0.0F, -2.0F, 1.0F, 4.0F, 6.0F),
                PartPose.offset(-3.5F, -5.0F, -1.0F));
        PartDefinition wingL = body.addOrReplaceChild("wing_l",
                CubeListBuilder.create()
                        .texOffs(48, 0).addBox(0.0F, 0.0F, -2.0F, 1.0F, 4.0F, 6.0F),
                PartPose.offset(3.5F, -5.0F, -1.0F));
        PartDefinition mut1Wing2R = body.addOrReplaceChild("mut1_wing2_r",
                CubeListBuilder.create()
                        .texOffs(17, 16).addBox(-1.0F, 0.0F, -1.0F, 1.0F, 3.0F, 4.0F),
                PartPose.offsetAndRotation(-3.5F, -3.0F, 1.0F, 0.0F, 0.0F, 0.3491F));
        PartDefinition mut1Wing2L = body.addOrReplaceChild("mut1_wing2_l",
                CubeListBuilder.create()
                        .texOffs(28, 16).addBox(0.0F, 0.0F, -1.0F, 1.0F, 3.0F, 4.0F),
                PartPose.offsetAndRotation(3.5F, -3.0F, 1.0F, 0.0F, 0.0F, -0.3491F));
        PartDefinition mut2Head2 = body.addOrReplaceChild("mut2_head2",
                CubeListBuilder.create()
                        .texOffs(49, 16).addBox(-1.5F, -3.5F, -1.5F, 3.0F, 3.0F, 3.0F)
                        .texOffs(45, 25).addBox(-0.5F, -2.5F, -3.5F, 1.0F, 1.0F, 2.0F),
                PartPose.offsetAndRotation(2.0F, -5.5F, -2.5F, 0.0F, -0.4363F, -0.2618F));
        PartDefinition legR = root.addOrReplaceChild("leg_r",
                CubeListBuilder.create()
                        .texOffs(39, 16).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 6.0F, 1.0F),
                PartPose.offset(-1.5F, 16.0F, 0.0F));
        PartDefinition legRLower = legR.addOrReplaceChild("leg_r_lower",
                CubeListBuilder.create()
                        .texOffs(18, 25).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition legL = root.addOrReplaceChild("leg_l",
                CubeListBuilder.create()
                        .texOffs(44, 16).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 6.0F, 1.0F),
                PartPose.offset(1.5F, 16.0F, 0.0F));
        PartDefinition legLLower = legL.addOrReplaceChild("leg_l_lower",
                CubeListBuilder.create()
                        .texOffs(27, 25).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));

        return LayerDefinition.create(mesh, 64, 64);
    }

    public static LayerDefinition createGildedSpiderLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition abdomen = root.addOrReplaceChild("abdomen",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-5.0F, -4.0F, -1.0F, 10.0F, 6.0F, 10.0F),
                PartPose.offset(0.0F, 15.0F, 3.0F));
        PartDefinition lid = abdomen.addOrReplaceChild("lid",
                CubeListBuilder.create()
                        .texOffs(72, 0).addBox(-4.0F, -1.5F, -4.0F, 8.0F, 2.0F, 8.0F)
                        .texOffs(95, 17).addBox(-1.0F, -3.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, -4.0F, 4.0F));
        PartDefinition mut1Gem = lid.addOrReplaceChild("mut1_gem",
                CubeListBuilder.create()
                        .texOffs(104, 17).addBox(-1.0F, -2.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, -3.0F, 0.0F));
        PartDefinition mut1Spikes = abdomen.addOrReplaceChild("mut1_spikes",
                CubeListBuilder.create()
                        .texOffs(113, 17).addBox(-4.5F, 0.0F, -0.5F, 1.0F, 2.0F, 1.0F)
                        .texOffs(118, 17).addBox(3.5F, 0.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offset(0.0F, -4.5F, 1.0F));
        PartDefinition cephalo = root.addOrReplaceChild("cephalo",
                CubeListBuilder.create()
                        .texOffs(41, 0).addBox(-4.0F, -3.0F, -6.0F, 8.0F, 5.0F, 7.0F)
                        .texOffs(80, 17).addBox(-3.0F, 2.0F, -5.8F, 6.0F, 3.0F, 1.0F),
                PartPose.offset(0.0F, 15.0F, -3.0F));
        PartDefinition leg0 = root.addOrReplaceChild("leg_0",
                CubeListBuilder.create()
                        .texOffs(30, 17).addBox(-1.0F, 0.0F, -0.5F, 1.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(-4.5F, 13.0F, -4.0F, 0.0F, 0.5236F, 0.9599F));
        PartDefinition leg0Mid = leg0.addOrReplaceChild("leg_0_mid",
                CubeListBuilder.create()
                        .texOffs(105, 0).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 9.0F, 1.0F),
                PartPose.offsetAndRotation(-0.5F, 7.0F, 0.0F, 0.0F, 0.0F, -1.6581F));
        PartDefinition leg1 = root.addOrReplaceChild("leg_1",
                CubeListBuilder.create()
                        .texOffs(35, 17).addBox(-1.0F, 0.0F, -0.5F, 1.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(-4.5F, 13.0F, -1.4F, 0.0F, 0.1745F, 0.9599F));
        PartDefinition leg1Mid = leg1.addOrReplaceChild("leg_1_mid",
                CubeListBuilder.create()
                        .texOffs(110, 0).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 9.0F, 1.0F),
                PartPose.offsetAndRotation(-0.5F, 7.0F, 0.0F, 0.0F, 0.0F, -1.6581F));
        PartDefinition leg2 = root.addOrReplaceChild("leg_2",
                CubeListBuilder.create()
                        .texOffs(40, 17).addBox(-1.0F, 0.0F, -0.5F, 1.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(-4.5F, 13.0F, 1.2F, 0.0F, -0.1745F, 0.9599F));
        PartDefinition leg2Mid = leg2.addOrReplaceChild("leg_2_mid",
                CubeListBuilder.create()
                        .texOffs(115, 0).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 9.0F, 1.0F),
                PartPose.offsetAndRotation(-0.5F, 7.0F, 0.0F, 0.0F, 0.0F, -1.6581F));
        PartDefinition leg3 = root.addOrReplaceChild("leg_3",
                CubeListBuilder.create()
                        .texOffs(45, 17).addBox(-1.0F, 0.0F, -0.5F, 1.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(-4.5F, 13.0F, 3.8F, 0.0F, -0.5236F, 0.9599F));
        PartDefinition leg3Mid = leg3.addOrReplaceChild("leg_3_mid",
                CubeListBuilder.create()
                        .texOffs(120, 0).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 9.0F, 1.0F),
                PartPose.offsetAndRotation(-0.5F, 7.0F, 0.0F, 0.0F, 0.0F, -1.6581F));
        PartDefinition leg4 = root.addOrReplaceChild("leg_4",
                CubeListBuilder.create()
                        .texOffs(50, 17).addBox(0.0F, 0.0F, -0.5F, 1.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(4.5F, 13.0F, -4.0F, 0.0F, -0.5236F, -0.9599F));
        PartDefinition leg4Mid = leg4.addOrReplaceChild("leg_4_mid",
                CubeListBuilder.create()
                        .texOffs(0, 17).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 9.0F, 1.0F),
                PartPose.offsetAndRotation(0.5F, 7.0F, 0.0F, 0.0F, 0.0F, 1.6581F));
        PartDefinition leg5 = root.addOrReplaceChild("leg_5",
                CubeListBuilder.create()
                        .texOffs(55, 17).addBox(0.0F, 0.0F, -0.5F, 1.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(4.5F, 13.0F, -1.4F, 0.0F, -0.1745F, -0.9599F));
        PartDefinition leg5Mid = leg5.addOrReplaceChild("leg_5_mid",
                CubeListBuilder.create()
                        .texOffs(5, 17).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 9.0F, 1.0F),
                PartPose.offsetAndRotation(0.5F, 7.0F, 0.0F, 0.0F, 0.0F, 1.6581F));
        PartDefinition leg6 = root.addOrReplaceChild("leg_6",
                CubeListBuilder.create()
                        .texOffs(60, 17).addBox(0.0F, 0.0F, -0.5F, 1.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(4.5F, 13.0F, 1.2F, 0.0F, 0.1745F, -0.9599F));
        PartDefinition leg6Mid = leg6.addOrReplaceChild("leg_6_mid",
                CubeListBuilder.create()
                        .texOffs(10, 17).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 9.0F, 1.0F),
                PartPose.offsetAndRotation(0.5F, 7.0F, 0.0F, 0.0F, 0.0F, 1.6581F));
        PartDefinition leg7 = root.addOrReplaceChild("leg_7",
                CubeListBuilder.create()
                        .texOffs(65, 17).addBox(0.0F, 0.0F, -0.5F, 1.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(4.5F, 13.0F, 3.8F, 0.0F, 0.5236F, -0.9599F));
        PartDefinition leg7Mid = leg7.addOrReplaceChild("leg_7_mid",
                CubeListBuilder.create()
                        .texOffs(15, 17).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 9.0F, 1.0F),
                PartPose.offsetAndRotation(0.5F, 7.0F, 0.0F, 0.0F, 0.0F, 1.6581F));
        PartDefinition mut2Leg0 = root.addOrReplaceChild("mut2_leg_0",
                CubeListBuilder.create()
                        .texOffs(70, 17).addBox(-1.0F, 0.0F, -0.5F, 1.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(-4.5F, 13.0F, 4.6F, 0.0F, -0.4363F, 0.9599F));
        PartDefinition mut2Leg0Mid = mut2Leg0.addOrReplaceChild("mut2_leg_0_mid",
                CubeListBuilder.create()
                        .texOffs(20, 17).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 9.0F, 1.0F),
                PartPose.offsetAndRotation(-0.5F, 7.0F, 0.0F, 0.0F, 0.0F, -1.6581F));
        PartDefinition mut2Leg1 = root.addOrReplaceChild("mut2_leg_1",
                CubeListBuilder.create()
                        .texOffs(75, 17).addBox(0.0F, 0.0F, -0.5F, 1.0F, 7.0F, 1.0F),
                PartPose.offsetAndRotation(4.5F, 13.0F, 4.6F, 0.0F, 0.4363F, -0.9599F));
        PartDefinition mut2Leg1Mid = mut2Leg1.addOrReplaceChild("mut2_leg_1_mid",
                CubeListBuilder.create()
                        .texOffs(25, 17).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 9.0F, 1.0F),
                PartPose.offsetAndRotation(0.5F, 7.0F, 0.0F, 0.0F, 0.0F, 1.6581F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    public static LayerDefinition createGildedCaskLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-4.0F, -14.0F, -3.0F, 8.0F, 14.0F, 6.0F)
                        .texOffs(29, 0).addBox(-3.5F, -12.5F, -3.6F, 7.0F, 7.0F, 1.0F)
                        .texOffs(0, 21).addBox(-4.2F, -5.0F, -3.2F, 8.0F, 1.0F, 6.0F)
                        .texOffs(29, 21).addBox(-4.2F, -10.0F, -3.2F, 8.0F, 1.0F, 6.0F),
                PartPose.offset(0.0F, 20.0F, 0.0F));
        PartDefinition mut1VentR = body.addOrReplaceChild("mut1_vent_r",
                CubeListBuilder.create()
                        .texOffs(39, 37).addBox(-2.0F, -1.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-4.0F, -8.0F, 0.0F, 0.0F, 0.0F, 0.4363F));
        PartDefinition mut1VentL = body.addOrReplaceChild("mut1_vent_l",
                CubeListBuilder.create()
                        .texOffs(48, 37).addBox(0.0F, -1.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(4.0F, -8.0F, 0.0F, 0.0F, 0.0F, -0.4363F));
        PartDefinition mut2Crown = body.addOrReplaceChild("mut2_crown",
                CubeListBuilder.create()
                        .texOffs(25, 29).addBox(-2.0F, -3.0F, -2.0F, 4.0F, 3.0F, 4.0F)
                        .texOffs(0, 29).addBox(-3.0F, -1.0F, -3.0F, 6.0F, 1.0F, 6.0F),
                PartPose.offset(0.0F, -14.0F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(42, 29).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(-2.0F, 20.0F, -2.5F));
        PartDefinition legFrLower = legFr.addOrReplaceChild("leg_fr_lower",
                CubeListBuilder.create()
                        .texOffs(0, 45).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 0.0F, 2.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(0, 37).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(2.0F, 20.0F, -2.5F));
        PartDefinition legFlLower = legFl.addOrReplaceChild("leg_fl_lower",
                CubeListBuilder.create()
                        .texOffs(9, 45).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 0.0F, 2.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(13, 37).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(-2.0F, 20.0F, 2.5F));
        PartDefinition legBrLower = legBr.addOrReplaceChild("leg_br_lower",
                CubeListBuilder.create()
                        .texOffs(18, 45).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 0.0F, 2.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(26, 37).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 4.0F, 3.0F),
                PartPose.offset(2.0F, 20.0F, 2.5F));
        PartDefinition legBlLower = legBl.addOrReplaceChild("leg_bl_lower",
                CubeListBuilder.create()
                        .texOffs(27, 45).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 0.0F, 2.0F),
                PartPose.offset(0.0F, 4.0F, 0.0F));

        return LayerDefinition.create(mesh, 64, 64);
    }

    private GildedBeastLayers() {
    }
}
