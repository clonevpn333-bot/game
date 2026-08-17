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
    // The Sovereign is authored by AmberBench: a hanging heartwood body, six
    // arms that touch nothing, two haloes, and a skirt of trailing root.
    private final ModelPart core;
    private final ModelPart mantle;
    private final ModelPart chest;
    private final ModelPart neck;
    private final ModelPart head;
    private final ModelPart jaw;
    private final ModelPart[] halos = new ModelPart[2];
    private final ModelPart[] floats = new ModelPart[6];
    private final ModelPart[] hands = new ModelPart[6];
    private final ModelPart[] trails = new ModelPart[7];

    public PorcelainAutarchModel(ModelPart root) {
        super(root);
        this.core = root.getChild("core");
        this.mantle = this.core.getChild("mantle");
        this.chest = this.core.getChild("chest");
        this.neck = this.core.getChild("neck");
        this.head = this.neck.getChild("head");
        this.jaw = this.head.getChild("jaw");
        for (int i = 0; i < this.halos.length; i++) {
            this.halos[i] = root.getChild("halo" + i);
        }
        for (int i = 0; i < this.floats.length; i++) {
            this.floats[i] = root.getChild("float" + i);
            this.hands[i] = this.floats[i].getChild("mut0_hand" + i);
        }
        for (int i = 0; i < this.trails.length; i++) {
            this.trails[i] = this.mantle.getChild("trail" + i);
        }
    }

    public static LayerDefinition createBodyLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition core = root.addOrReplaceChild("core",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-13.0F, -18.0F, -9.0F, 26.0F, 30.0F, 18.0F)
                        .texOffs(45, 79).addBox(-13.4F, -10.0F, -9.4F, 27.0F, 5.0F, 19.0F),
                PartPose.offset(0.0F, -14.0F, 0.0F));
        PartDefinition mantle = core.addOrReplaceChild("mantle",
                CubeListBuilder.create()
                        .texOffs(89, 0).addBox(-16.0F, -4.0F, -11.0F, 32.0F, 7.0F, 22.0F)
                        .texOffs(65, 49).addBox(-17.5F, 1.0F, -12.5F, 35.0F, 3.0F, 25.0F),
                PartPose.offset(0.0F, 12.0F, 0.0F));
        PartDefinition trail0 = mantle.addOrReplaceChild("trail0",
                CubeListBuilder.create()
                        .texOffs(13, 139).addBox(-1.6F, 0.0F, -1.6F, 3.2F, 6.0F, 3.2F),
                PartPose.offsetAndRotation(0.0F, 3.0F, 7.0F, 0.0F, 0.0F, -0.2793F));
        PartDefinition trail01 = trail0.addOrReplaceChild("trail0_1",
                CubeListBuilder.create()
                        .texOffs(69, 149).addBox(-1.216F, 0.0F, -1.216F, 2.432F, 5.2307F, 2.432F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, 0.0F, 0.0F, 0.1745F));
        PartDefinition trail02 = trail01.addOrReplaceChild("trail0_2",
                CubeListBuilder.create()
                        .texOffs(78, 149).addBox(-0.9242F, 0.0F, -0.9242F, 1.8483F, 4.56F, 1.8483F),
                PartPose.offsetAndRotation(0.0F, 5.2307F, 0.0F, 0.0F, 0.0F, 0.1745F));
        PartDefinition trail03 = trail02.addOrReplaceChild("trail0_3",
                CubeListBuilder.create()
                        .texOffs(18, 178).addBox(-0.7024F, 0.0F, -0.7024F, 1.4047F, 3.9753F, 1.4047F),
                PartPose.offsetAndRotation(0.0F, 4.56F, 0.0F, 0.0F, 0.0F, 0.1745F));
        PartDefinition trail04 = trail03.addOrReplaceChild("trail0_4",
                CubeListBuilder.create()
                        .texOffs(105, 204).addBox(-0.5338F, 0.0F, -0.5338F, 1.0676F, 3.4656F, 1.0676F),
                PartPose.offsetAndRotation(0.0F, 3.9753F, 0.0F, 0.0F, 0.0F, 0.1745F));
        PartDefinition trail1 = mantle.addOrReplaceChild("trail1",
                CubeListBuilder.create()
                        .texOffs(26, 139).addBox(-1.6F, 0.0F, -1.6F, 3.2F, 6.0F, 3.2F),
                PartPose.offsetAndRotation(7.0365F, 3.0F, 4.3644F, 0.2183F, 0.0F, -0.1741F));
        PartDefinition trail11 = trail1.addOrReplaceChild("trail1_1",
                CubeListBuilder.create()
                        .texOffs(87, 149).addBox(-1.216F, 0.0F, -1.216F, 2.432F, 5.2307F, 2.432F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, 0.1365F, 0.0F, 0.1088F));
        PartDefinition trail12 = trail11.addOrReplaceChild("trail1_2",
                CubeListBuilder.create()
                        .texOffs(96, 149).addBox(-0.9242F, 0.0F, -0.9242F, 1.8483F, 4.56F, 1.8483F),
                PartPose.offsetAndRotation(0.0F, 5.2307F, 0.0F, 0.1365F, 0.0F, 0.1088F));
        PartDefinition trail13 = trail12.addOrReplaceChild("trail1_3",
                CubeListBuilder.create()
                        .texOffs(23, 178).addBox(-0.7024F, 0.0F, -0.7024F, 1.4047F, 3.9753F, 1.4047F),
                PartPose.offsetAndRotation(0.0F, 4.56F, 0.0F, 0.1365F, 0.0F, 0.1088F));
        PartDefinition trail14 = trail13.addOrReplaceChild("trail1_4",
                CubeListBuilder.create()
                        .texOffs(110, 204).addBox(-0.5338F, 0.0F, -0.5338F, 1.0676F, 3.4656F, 1.0676F),
                PartPose.offsetAndRotation(0.0F, 3.9753F, 0.0F, 0.1365F, 0.0F, 0.1088F));
        PartDefinition trail2 = mantle.addOrReplaceChild("trail2",
                CubeListBuilder.create()
                        .texOffs(39, 139).addBox(-1.6F, 0.0F, -1.6F, 3.2F, 6.0F, 3.2F),
                PartPose.offsetAndRotation(8.7744F, 3.0F, -1.5576F, 0.2723F, 0.0F, 0.0621F));
        PartDefinition trail21 = trail2.addOrReplaceChild("trail2_1",
                CubeListBuilder.create()
                        .texOffs(105, 149).addBox(-1.216F, 0.0F, -1.216F, 2.432F, 5.2307F, 2.432F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, 0.1702F, 0.0F, -0.0388F));
        PartDefinition trail22 = trail21.addOrReplaceChild("trail2_2",
                CubeListBuilder.create()
                        .texOffs(114, 149).addBox(-0.9242F, 0.0F, -0.9242F, 1.8483F, 4.56F, 1.8483F),
                PartPose.offsetAndRotation(0.0F, 5.2307F, 0.0F, 0.1702F, 0.0F, -0.0388F));
        PartDefinition trail23 = trail22.addOrReplaceChild("trail2_3",
                CubeListBuilder.create()
                        .texOffs(28, 178).addBox(-0.7024F, 0.0F, -0.7024F, 1.4047F, 3.9753F, 1.4047F),
                PartPose.offsetAndRotation(0.0F, 4.56F, 0.0F, 0.1702F, 0.0F, -0.0388F));
        PartDefinition trail24 = trail23.addOrReplaceChild("trail2_4",
                CubeListBuilder.create()
                        .texOffs(115, 204).addBox(-0.5338F, 0.0F, -0.5338F, 1.0676F, 3.4656F, 1.0676F),
                PartPose.offsetAndRotation(0.0F, 3.9753F, 0.0F, 0.1702F, 0.0F, -0.0388F));
        PartDefinition trail3 = mantle.addOrReplaceChild("trail3",
                CubeListBuilder.create()
                        .texOffs(52, 139).addBox(-1.6F, 0.0F, -1.6F, 3.2F, 6.0F, 3.2F),
                PartPose.offsetAndRotation(3.905F, 3.0F, -6.3068F, 0.1212F, 0.0F, 0.2516F));
        PartDefinition trail31 = trail3.addOrReplaceChild("trail3_1",
                CubeListBuilder.create()
                        .texOffs(123, 149).addBox(-1.216F, 0.0F, -1.216F, 2.432F, 5.2307F, 2.432F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, 0.0757F, 0.0F, -0.1572F));
        PartDefinition trail32 = trail31.addOrReplaceChild("trail3_2",
                CubeListBuilder.create()
                        .texOffs(132, 149).addBox(-0.9242F, 0.0F, -0.9242F, 1.8483F, 4.56F, 1.8483F),
                PartPose.offsetAndRotation(0.0F, 5.2307F, 0.0F, 0.0757F, 0.0F, -0.1572F));
        PartDefinition trail33 = trail32.addOrReplaceChild("trail3_3",
                CubeListBuilder.create()
                        .texOffs(33, 178).addBox(-0.7024F, 0.0F, -0.7024F, 1.4047F, 3.9753F, 1.4047F),
                PartPose.offsetAndRotation(0.0F, 4.56F, 0.0F, 0.0757F, 0.0F, -0.1572F));
        PartDefinition trail34 = trail33.addOrReplaceChild("trail3_4",
                CubeListBuilder.create()
                        .texOffs(120, 204).addBox(-0.5338F, 0.0F, -0.5338F, 1.0676F, 3.4656F, 1.0676F),
                PartPose.offsetAndRotation(0.0F, 3.9753F, 0.0F, 0.0757F, 0.0F, -0.1572F));
        PartDefinition trail4 = mantle.addOrReplaceChild("trail4",
                CubeListBuilder.create()
                        .texOffs(65, 139).addBox(-1.6F, 0.0F, -1.6F, 3.2F, 6.0F, 3.2F),
                PartPose.offsetAndRotation(-3.905F, 3.0F, -6.3068F, -0.1212F, 0.0F, 0.2516F));
        PartDefinition trail41 = trail4.addOrReplaceChild("trail4_1",
                CubeListBuilder.create()
                        .texOffs(141, 149).addBox(-1.216F, 0.0F, -1.216F, 2.432F, 5.2307F, 2.432F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -0.0757F, 0.0F, -0.1572F));
        PartDefinition trail42 = trail41.addOrReplaceChild("trail4_2",
                CubeListBuilder.create()
                        .texOffs(150, 149).addBox(-0.9242F, 0.0F, -0.9242F, 1.8483F, 4.56F, 1.8483F),
                PartPose.offsetAndRotation(0.0F, 5.2307F, 0.0F, -0.0757F, 0.0F, -0.1572F));
        PartDefinition trail43 = trail42.addOrReplaceChild("trail4_3",
                CubeListBuilder.create()
                        .texOffs(38, 178).addBox(-0.7024F, 0.0F, -0.7024F, 1.4047F, 3.9753F, 1.4047F),
                PartPose.offsetAndRotation(0.0F, 4.56F, 0.0F, -0.0757F, 0.0F, -0.1572F));
        PartDefinition trail44 = trail43.addOrReplaceChild("trail4_4",
                CubeListBuilder.create()
                        .texOffs(125, 204).addBox(-0.5338F, 0.0F, -0.5338F, 1.0676F, 3.4656F, 1.0676F),
                PartPose.offsetAndRotation(0.0F, 3.9753F, 0.0F, -0.0757F, 0.0F, -0.1572F));
        PartDefinition trail5 = mantle.addOrReplaceChild("trail5",
                CubeListBuilder.create()
                        .texOffs(78, 139).addBox(-1.6F, 0.0F, -1.6F, 3.2F, 6.0F, 3.2F),
                PartPose.offsetAndRotation(-8.7744F, 3.0F, -1.5576F, -0.2723F, 0.0F, 0.0621F));
        PartDefinition trail51 = trail5.addOrReplaceChild("trail5_1",
                CubeListBuilder.create()
                        .texOffs(159, 149).addBox(-1.216F, 0.0F, -1.216F, 2.432F, 5.2307F, 2.432F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -0.1702F, 0.0F, -0.0388F));
        PartDefinition trail52 = trail51.addOrReplaceChild("trail5_2",
                CubeListBuilder.create()
                        .texOffs(168, 149).addBox(-0.9242F, 0.0F, -0.9242F, 1.8483F, 4.56F, 1.8483F),
                PartPose.offsetAndRotation(0.0F, 5.2307F, 0.0F, -0.1702F, 0.0F, -0.0388F));
        PartDefinition trail53 = trail52.addOrReplaceChild("trail5_3",
                CubeListBuilder.create()
                        .texOffs(43, 178).addBox(-0.7024F, 0.0F, -0.7024F, 1.4047F, 3.9753F, 1.4047F),
                PartPose.offsetAndRotation(0.0F, 4.56F, 0.0F, -0.1702F, 0.0F, -0.0388F));
        PartDefinition trail54 = trail53.addOrReplaceChild("trail5_4",
                CubeListBuilder.create()
                        .texOffs(130, 204).addBox(-0.5338F, 0.0F, -0.5338F, 1.0676F, 3.4656F, 1.0676F),
                PartPose.offsetAndRotation(0.0F, 3.9753F, 0.0F, -0.1702F, 0.0F, -0.0388F));
        PartDefinition trail6 = mantle.addOrReplaceChild("trail6",
                CubeListBuilder.create()
                        .texOffs(91, 139).addBox(-1.6F, 0.0F, -1.6F, 3.2F, 6.0F, 3.2F),
                PartPose.offsetAndRotation(-7.0365F, 3.0F, 4.3644F, -0.2183F, 0.0F, -0.1741F));
        PartDefinition trail61 = trail6.addOrReplaceChild("trail6_1",
                CubeListBuilder.create()
                        .texOffs(177, 149).addBox(-1.216F, 0.0F, -1.216F, 2.432F, 5.2307F, 2.432F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -0.1365F, 0.0F, 0.1088F));
        PartDefinition trail62 = trail61.addOrReplaceChild("trail6_2",
                CubeListBuilder.create()
                        .texOffs(186, 149).addBox(-0.9242F, 0.0F, -0.9242F, 1.8483F, 4.56F, 1.8483F),
                PartPose.offsetAndRotation(0.0F, 5.2307F, 0.0F, -0.1365F, 0.0F, 0.1088F));
        PartDefinition trail63 = trail62.addOrReplaceChild("trail6_3",
                CubeListBuilder.create()
                        .texOffs(48, 178).addBox(-0.7024F, 0.0F, -0.7024F, 1.4047F, 3.9753F, 1.4047F),
                PartPose.offsetAndRotation(0.0F, 4.56F, 0.0F, -0.1365F, 0.0F, 0.1088F));
        PartDefinition trail64 = trail63.addOrReplaceChild("trail6_4",
                CubeListBuilder.create()
                        .texOffs(135, 204).addBox(-0.5338F, 0.0F, -0.5338F, 1.0676F, 3.4656F, 1.0676F),
                PartPose.offsetAndRotation(0.0F, 3.9753F, 0.0F, -0.1365F, 0.0F, 0.1088F));
        PartDefinition pauldronR = core.addOrReplaceChild("pauldron_r",
                CubeListBuilder.create()
                        .texOffs(186, 49).addBox(-6.0F, -5.0F, -8.0F, 6.0F, 9.0F, 16.0F)
                        .texOffs(138, 79).addBox(-6.4F, -6.5F, -8.4F, 6.8F, 2.5F, 16.8F),
                PartPose.offsetAndRotation(-13.0F, -13.0F, 0.0F, 0.0F, 0.0F, 0.2443F));
        PartDefinition pauldronL = core.addOrReplaceChild("pauldron_l",
                CubeListBuilder.create()
                        .texOffs(0, 79).addBox(0.0F, -5.0F, -8.0F, 6.0F, 9.0F, 16.0F)
                        .texOffs(187, 79).addBox(-0.4F, -6.5F, -8.4F, 6.8F, 2.5F, 16.8F),
                PartPose.offsetAndRotation(13.0F, -13.0F, 0.0F, 0.0F, 0.0F, -0.2443F));
        PartDefinition chest = core.addOrReplaceChild("chest",
                CubeListBuilder.create()
                        .texOffs(0, 105).addBox(-7.0F, -8.0F, -1.2F, 14.0F, 16.0F, 2.4F),
                PartPose.offset(0.0F, -6.0F, -9.0F));
        PartDefinition heart = chest.addOrReplaceChild("heart",
                CubeListBuilder.create()
                        .texOffs(188, 105).addBox(-4.5F, -6.0F, -2.2F, 9.0F, 12.0F, 3.0F),
                PartPose.offset(0.0F, 0.0F, -1.6F));
        PartDefinition ribeye0 = chest.addOrReplaceChild("ribeye0",
                CubeListBuilder.create()
                        .texOffs(221, 194).addBox(-1.3F, -1.3F, -0.9F, 2.6F, 2.6F, 0.9F),
                PartPose.offset(0.0F, 6.6F, -1.9F));
        PartDefinition ribeye1 = chest.addOrReplaceChild("ribeye1",
                CubeListBuilder.create()
                        .texOffs(230, 194).addBox(-1.3F, -1.3F, -0.9F, 2.6F, 2.6F, 0.9F),
                PartPose.offset(3.9598F, 4.6669F, -1.9F));
        PartDefinition ribeye2 = chest.addOrReplaceChild("ribeye2",
                CubeListBuilder.create()
                        .texOffs(239, 194).addBox(-1.3F, -1.3F, -0.9F, 2.6F, 2.6F, 0.9F),
                PartPose.offset(5.6F, 0.0F, -1.9F));
        PartDefinition ribeye3 = chest.addOrReplaceChild("ribeye3",
                CubeListBuilder.create()
                        .texOffs(248, 194).addBox(-1.3F, -1.3F, -0.9F, 2.6F, 2.6F, 0.9F),
                PartPose.offset(3.9598F, -4.6669F, -1.9F));
        PartDefinition ribeye4 = chest.addOrReplaceChild("ribeye4",
                CubeListBuilder.create()
                        .texOffs(0, 199).addBox(-1.3F, -1.3F, -0.9F, 2.6F, 2.6F, 0.9F),
                PartPose.offset(0.0F, -6.6F, -1.9F));
        PartDefinition ribeye5 = chest.addOrReplaceChild("ribeye5",
                CubeListBuilder.create()
                        .texOffs(9, 199).addBox(-1.3F, -1.3F, -0.9F, 2.6F, 2.6F, 0.9F),
                PartPose.offset(-3.9598F, -4.6669F, -1.9F));
        PartDefinition ribeye6 = chest.addOrReplaceChild("ribeye6",
                CubeListBuilder.create()
                        .texOffs(18, 199).addBox(-1.3F, -1.3F, -0.9F, 2.6F, 2.6F, 0.9F),
                PartPose.offset(-5.6F, -0.0F, -1.9F));
        PartDefinition ribeye7 = chest.addOrReplaceChild("ribeye7",
                CubeListBuilder.create()
                        .texOffs(27, 199).addBox(-1.3F, -1.3F, -0.9F, 2.6F, 2.6F, 0.9F),
                PartPose.offset(-3.9598F, 4.6669F, -1.9F));
        PartDefinition rib0r = core.addOrReplaceChild("rib0r",
                CubeListBuilder.create()
                        .texOffs(104, 139).addBox(-1.2F, -1.0F, -1.2F, 2.4F, 6.5F, 2.0F),
                PartPose.offsetAndRotation(-7.5F, -13.0F, -9.2F, 0.0F, 0.0F, -0.384F));
        PartDefinition rib0l = core.addOrReplaceChild("rib0l",
                CubeListBuilder.create()
                        .texOffs(113, 139).addBox(-1.2F, -1.0F, -1.2F, 2.4F, 6.5F, 2.0F),
                PartPose.offsetAndRotation(7.5F, -13.0F, -9.2F, 0.0F, 0.0F, 0.384F));
        PartDefinition rib1r = core.addOrReplaceChild("rib1r",
                CubeListBuilder.create()
                        .texOffs(122, 139).addBox(-1.2F, -1.0F, -1.2F, 2.4F, 6.5F, 2.0F),
                PartPose.offsetAndRotation(-7.5F, -9.6F, -9.2F, 0.0F, 0.0F, -0.384F));
        PartDefinition rib1l = core.addOrReplaceChild("rib1l",
                CubeListBuilder.create()
                        .texOffs(131, 139).addBox(-1.2F, -1.0F, -1.2F, 2.4F, 6.5F, 2.0F),
                PartPose.offsetAndRotation(7.5F, -9.6F, -9.2F, 0.0F, 0.0F, 0.384F));
        PartDefinition rib2r = core.addOrReplaceChild("rib2r",
                CubeListBuilder.create()
                        .texOffs(140, 139).addBox(-1.2F, -1.0F, -1.2F, 2.4F, 6.5F, 2.0F),
                PartPose.offsetAndRotation(-7.5F, -6.2F, -9.2F, 0.0F, 0.0F, -0.384F));
        PartDefinition rib2l = core.addOrReplaceChild("rib2l",
                CubeListBuilder.create()
                        .texOffs(149, 139).addBox(-1.2F, -1.0F, -1.2F, 2.4F, 6.5F, 2.0F),
                PartPose.offsetAndRotation(7.5F, -6.2F, -9.2F, 0.0F, 0.0F, 0.384F));
        PartDefinition rib3r = core.addOrReplaceChild("rib3r",
                CubeListBuilder.create()
                        .texOffs(158, 139).addBox(-1.2F, -1.0F, -1.2F, 2.4F, 6.5F, 2.0F),
                PartPose.offsetAndRotation(-7.5F, -2.8F, -9.2F, 0.0F, 0.0F, -0.384F));
        PartDefinition rib3l = core.addOrReplaceChild("rib3l",
                CubeListBuilder.create()
                        .texOffs(167, 139).addBox(-1.2F, -1.0F, -1.2F, 2.4F, 6.5F, 2.0F),
                PartPose.offsetAndRotation(7.5F, -2.8F, -9.2F, 0.0F, 0.0F, 0.384F));
        PartDefinition rib4r = core.addOrReplaceChild("rib4r",
                CubeListBuilder.create()
                        .texOffs(176, 139).addBox(-1.2F, -1.0F, -1.2F, 2.4F, 6.5F, 2.0F),
                PartPose.offsetAndRotation(-7.5F, 0.6F, -9.2F, 0.0F, 0.0F, -0.384F));
        PartDefinition rib4l = core.addOrReplaceChild("rib4l",
                CubeListBuilder.create()
                        .texOffs(185, 139).addBox(-1.2F, -1.0F, -1.2F, 2.4F, 6.5F, 2.0F),
                PartPose.offsetAndRotation(7.5F, 0.6F, -9.2F, 0.0F, 0.0F, 0.384F));
        PartDefinition beltring = core.addOrReplaceChild("beltring",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 8.0F, 0.0F));
        PartDefinition beltringS0 = beltring.addOrReplaceChild("beltring_s0",
                CubeListBuilder.create()
                        .texOffs(161, 189).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offset(0.0F, 0.0F, 15.0F));
        PartDefinition beltringS1 = beltring.addOrReplaceChild("beltring_s1",
                CubeListBuilder.create()
                        .texOffs(178, 189).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(5.1303F, 0.0F, 14.0954F, 0.0F, -0.3491F, 0.0F));
        PartDefinition beltringS2 = beltring.addOrReplaceChild("beltring_s2",
                CubeListBuilder.create()
                        .texOffs(195, 189).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(9.6418F, 0.0F, 11.4907F, 0.0F, -0.6981F, 0.0F));
        PartDefinition beltringS3 = beltring.addOrReplaceChild("beltring_s3",
                CubeListBuilder.create()
                        .texOffs(212, 189).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(12.9904F, 0.0F, 7.5F, 0.0F, -1.0472F, 0.0F));
        PartDefinition beltringS4 = beltring.addOrReplaceChild("beltring_s4",
                CubeListBuilder.create()
                        .texOffs(229, 189).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(14.7721F, 0.0F, 2.6047F, 0.0F, -1.3963F, 0.0F));
        PartDefinition beltringS5 = beltring.addOrReplaceChild("beltring_s5",
                CubeListBuilder.create()
                        .texOffs(0, 194).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(14.7721F, 0.0F, -2.6047F, 0.0F, -1.7453F, 0.0F));
        PartDefinition beltringS6 = beltring.addOrReplaceChild("beltring_s6",
                CubeListBuilder.create()
                        .texOffs(17, 194).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(12.9904F, 0.0F, -7.5F, 0.0F, -2.0944F, 0.0F));
        PartDefinition beltringS7 = beltring.addOrReplaceChild("beltring_s7",
                CubeListBuilder.create()
                        .texOffs(34, 194).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(9.6418F, 0.0F, -11.4907F, 0.0F, -2.4435F, 0.0F));
        PartDefinition beltringS8 = beltring.addOrReplaceChild("beltring_s8",
                CubeListBuilder.create()
                        .texOffs(51, 194).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(5.1303F, 0.0F, -14.0954F, 0.0F, -2.7925F, 0.0F));
        PartDefinition beltringS9 = beltring.addOrReplaceChild("beltring_s9",
                CubeListBuilder.create()
                        .texOffs(68, 194).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -15.0F, 0.0F, -3.1416F, 0.0F));
        PartDefinition beltringS10 = beltring.addOrReplaceChild("beltring_s10",
                CubeListBuilder.create()
                        .texOffs(85, 194).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(-5.1303F, 0.0F, -14.0954F, 0.0F, -3.4907F, 0.0F));
        PartDefinition beltringS11 = beltring.addOrReplaceChild("beltring_s11",
                CubeListBuilder.create()
                        .texOffs(102, 194).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(-9.6418F, 0.0F, -11.4907F, 0.0F, -3.8397F, 0.0F));
        PartDefinition beltringS12 = beltring.addOrReplaceChild("beltring_s12",
                CubeListBuilder.create()
                        .texOffs(119, 194).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(-12.9904F, 0.0F, -7.5F, 0.0F, -4.1888F, 0.0F));
        PartDefinition beltringS13 = beltring.addOrReplaceChild("beltring_s13",
                CubeListBuilder.create()
                        .texOffs(136, 194).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(-14.7721F, 0.0F, -2.6047F, 0.0F, -4.5379F, 0.0F));
        PartDefinition beltringS14 = beltring.addOrReplaceChild("beltring_s14",
                CubeListBuilder.create()
                        .texOffs(153, 194).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(-14.7721F, 0.0F, 2.6047F, 0.0F, -4.8869F, 0.0F));
        PartDefinition beltringS15 = beltring.addOrReplaceChild("beltring_s15",
                CubeListBuilder.create()
                        .texOffs(170, 194).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(-12.9904F, 0.0F, 7.5F, 0.0F, -5.236F, 0.0F));
        PartDefinition beltringS16 = beltring.addOrReplaceChild("beltring_s16",
                CubeListBuilder.create()
                        .texOffs(187, 194).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(-9.6418F, 0.0F, 11.4907F, 0.0F, -5.5851F, 0.0F));
        PartDefinition beltringS17 = beltring.addOrReplaceChild("beltring_s17",
                CubeListBuilder.create()
                        .texOffs(204, 194).addBox(-2.9047F, -1.1F, -1.1F, 5.8094F, 2.2F, 2.2F),
                PartPose.offsetAndRotation(-5.1303F, 0.0F, 14.0954F, 0.0F, -5.9341F, 0.0F));
        PartDefinition neck = core.addOrReplaceChild("neck",
                CubeListBuilder.create()
                        .texOffs(151, 105).addBox(-4.5F, -6.0F, -4.5F, 9.0F, 6.0F, 9.0F),
                PartPose.offset(0.0F, -16.0F, 0.0F));
        PartDefinition head = neck.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(0, 49).addBox(-8.5F, -14.0F, -7.5F, 17.0F, 14.0F, 15.0F),
                PartPose.offset(0.0F, -6.0F, 0.0F));
        PartDefinition brow = head.addOrReplaceChild("brow",
                CubeListBuilder.create()
                        .texOffs(194, 139).addBox(-9.0F, -3.0F, -2.0F, 18.0F, 4.0F, 2.6F),
                PartPose.offset(0.0F, -9.5F, -7.5F));
        PartDefinition visage = head.addOrReplaceChild("visage",
                CubeListBuilder.create()
                        .texOffs(34, 124).addBox(-7.0F, -6.0F, -0.8F, 14.0F, 12.0F, 1.0F),
                PartPose.offset(0.0F, -7.5F, -7.8F));
        PartDefinition jaw = head.addOrReplaceChild("jaw",
                CubeListBuilder.create()
                        .texOffs(91, 124).addBox(-6.0F, -1.5F, -6.0F, 12.0F, 5.0F, 7.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -3.0F, 0.2793F, 0.0F, 0.0F));
        PartDefinition fang0 = jaw.addOrReplaceChild("fang0",
                CubeListBuilder.create()
                        .texOffs(81, 199).addBox(-0.6F, 0.0F, -0.6F, 1.2F, 3.0F, 1.2F),
                PartPose.offset(-5.0F, -1.5F, -5.6F));
        PartDefinition fang1 = jaw.addOrReplaceChild("fang1",
                CubeListBuilder.create()
                        .texOffs(86, 199).addBox(-0.6F, 0.0F, -0.6F, 1.2F, 3.0F, 1.2F),
                PartPose.offset(-3.58F, -1.5F, -5.6F));
        PartDefinition fang2 = jaw.addOrReplaceChild("fang2",
                CubeListBuilder.create()
                        .texOffs(91, 199).addBox(-0.6F, 0.0F, -0.6F, 1.2F, 3.0F, 1.2F),
                PartPose.offset(-2.16F, -1.5F, -5.6F));
        PartDefinition fang3 = jaw.addOrReplaceChild("fang3",
                CubeListBuilder.create()
                        .texOffs(96, 199).addBox(-0.6F, 0.0F, -0.6F, 1.2F, 3.0F, 1.2F),
                PartPose.offset(-0.74F, -1.5F, -5.6F));
        PartDefinition fang4 = jaw.addOrReplaceChild("fang4",
                CubeListBuilder.create()
                        .texOffs(101, 199).addBox(-0.6F, 0.0F, -0.6F, 1.2F, 3.0F, 1.2F),
                PartPose.offset(0.68F, -1.5F, -5.6F));
        PartDefinition fang5 = jaw.addOrReplaceChild("fang5",
                CubeListBuilder.create()
                        .texOffs(106, 199).addBox(-0.6F, 0.0F, -0.6F, 1.2F, 3.0F, 1.2F),
                PartPose.offset(2.1F, -1.5F, -5.6F));
        PartDefinition fang6 = jaw.addOrReplaceChild("fang6",
                CubeListBuilder.create()
                        .texOffs(111, 199).addBox(-0.6F, 0.0F, -0.6F, 1.2F, 3.0F, 1.2F),
                PartPose.offset(3.52F, -1.5F, -5.6F));
        PartDefinition fang7 = jaw.addOrReplaceChild("fang7",
                CubeListBuilder.create()
                        .texOffs(116, 199).addBox(-0.6F, 0.0F, -0.6F, 1.2F, 3.0F, 1.2F),
                PartPose.offset(4.94F, -1.5F, -5.6F));
        PartDefinition upfang0 = head.addOrReplaceChild("upfang0",
                CubeListBuilder.create()
                        .texOffs(121, 199).addBox(-0.6F, -2.6F, -0.6F, 1.2F, 2.6F, 1.2F),
                PartPose.offset(-4.4F, 0.0F, -6.4F));
        PartDefinition upfang1 = head.addOrReplaceChild("upfang1",
                CubeListBuilder.create()
                        .texOffs(126, 199).addBox(-0.6F, -2.6F, -0.6F, 1.2F, 2.6F, 1.2F),
                PartPose.offset(-2.65F, 0.0F, -6.4F));
        PartDefinition upfang2 = head.addOrReplaceChild("upfang2",
                CubeListBuilder.create()
                        .texOffs(131, 199).addBox(-0.6F, -2.6F, -0.6F, 1.2F, 2.6F, 1.2F),
                PartPose.offset(-0.9F, 0.0F, -6.4F));
        PartDefinition upfang3 = head.addOrReplaceChild("upfang3",
                CubeListBuilder.create()
                        .texOffs(136, 199).addBox(-0.6F, -2.6F, -0.6F, 1.2F, 2.6F, 1.2F),
                PartPose.offset(0.85F, 0.0F, -6.4F));
        PartDefinition upfang4 = head.addOrReplaceChild("upfang4",
                CubeListBuilder.create()
                        .texOffs(141, 199).addBox(-0.6F, -2.6F, -0.6F, 1.2F, 2.6F, 1.2F),
                PartPose.offset(2.6F, 0.0F, -6.4F));
        PartDefinition upfang5 = head.addOrReplaceChild("upfang5",
                CubeListBuilder.create()
                        .texOffs(146, 199).addBox(-0.6F, -2.6F, -0.6F, 1.2F, 2.6F, 1.2F),
                PartPose.offset(4.35F, 0.0F, -6.4F));
        PartDefinition hornR = head.addOrReplaceChild("horn_r",
                CubeListBuilder.create()
                        .texOffs(130, 124).addBox(-2.1F, 0.0F, -2.1F, 4.2F, 7.5F, 4.2F),
                PartPose.offsetAndRotation(-7.5F, -12.0F, -1.0F, -0.2443F, -0.1745F, -0.6981F));
        PartDefinition hornR1 = hornR.addOrReplaceChild("horn_r_1",
                CubeListBuilder.create()
                        .texOffs(164, 124).addBox(-1.638F, 0.0F, -1.638F, 3.276F, 6.6238F, 3.276F),
                PartPose.offsetAndRotation(0.0F, 7.5F, 0.0F, 0.2443F, 0.0F, -0.2793F));
        PartDefinition hornR2 = hornR1.addOrReplaceChild("horn_r_2",
                CubeListBuilder.create()
                        .texOffs(232, 124).addBox(-1.2776F, 0.0F, -1.2776F, 2.5553F, 5.85F, 2.5553F),
                PartPose.offsetAndRotation(0.0F, 6.6238F, 0.0F, 0.2443F, 0.0F, -0.2793F));
        PartDefinition hornR3 = hornR2.addOrReplaceChild("horn_r_3",
                CubeListBuilder.create()
                        .texOffs(51, 149).addBox(-0.9966F, 0.0F, -0.9966F, 1.9931F, 5.1666F, 1.9931F),
                PartPose.offsetAndRotation(0.0F, 5.85F, 0.0F, 0.2443F, 0.0F, -0.2793F));
        PartDefinition hringR2 = hornR2.addOrReplaceChild("hring_r2",
                CubeListBuilder.create(),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, 1.5708F, 0.0F, 0.0F));
        PartDefinition hringR2S0 = hringR2.addOrReplaceChild("hring_r2_s0",
                CubeListBuilder.create()
                        .texOffs(189, 218).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offset(0.0F, 0.0F, 2.9F));
        PartDefinition hringR2S1 = hringR2.addOrReplaceChild("hring_r2_s1",
                CubeListBuilder.create()
                        .texOffs(196, 218).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(1.7046F, 0.0F, 2.3461F, 0.0F, -0.6283F, 0.0F));
        PartDefinition hringR2S2 = hringR2.addOrReplaceChild("hring_r2_s2",
                CubeListBuilder.create()
                        .texOffs(203, 218).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(2.7581F, 0.0F, 0.8961F, 0.0F, -1.2566F, 0.0F));
        PartDefinition hringR2S3 = hringR2.addOrReplaceChild("hring_r2_s3",
                CubeListBuilder.create()
                        .texOffs(210, 218).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(2.7581F, 0.0F, -0.8961F, 0.0F, -1.885F, 0.0F));
        PartDefinition hringR2S4 = hringR2.addOrReplaceChild("hring_r2_s4",
                CubeListBuilder.create()
                        .texOffs(217, 218).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(1.7046F, 0.0F, -2.3461F, 0.0F, -2.5133F, 0.0F));
        PartDefinition hringR2S5 = hringR2.addOrReplaceChild("hring_r2_s5",
                CubeListBuilder.create()
                        .texOffs(224, 218).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -2.9F, 0.0F, -3.1416F, 0.0F));
        PartDefinition hringR2S6 = hringR2.addOrReplaceChild("hring_r2_s6",
                CubeListBuilder.create()
                        .texOffs(231, 218).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-1.7046F, 0.0F, -2.3461F, 0.0F, -3.7699F, 0.0F));
        PartDefinition hringR2S7 = hringR2.addOrReplaceChild("hring_r2_s7",
                CubeListBuilder.create()
                        .texOffs(238, 218).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-2.7581F, 0.0F, -0.8961F, 0.0F, -4.3982F, 0.0F));
        PartDefinition hringR2S8 = hringR2.addOrReplaceChild("hring_r2_s8",
                CubeListBuilder.create()
                        .texOffs(245, 218).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-2.7581F, 0.0F, 0.8961F, 0.0F, -5.0265F, 0.0F));
        PartDefinition hringR2S9 = hringR2.addOrReplaceChild("hring_r2_s9",
                CubeListBuilder.create()
                        .texOffs(0, 221).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-1.7046F, 0.0F, 2.3461F, 0.0F, -5.6549F, 0.0F));
        PartDefinition hringR1 = hornR1.addOrReplaceChild("hring_r1",
                CubeListBuilder.create(),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, 1.5708F, 0.0F, 0.0F));
        PartDefinition hringR1S0 = hringR1.addOrReplaceChild("hring_r1_s0",
                CubeListBuilder.create()
                        .texOffs(27, 209).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offset(0.0F, 0.0F, 3.45F));
        PartDefinition hringR1S1 = hringR1.addOrReplaceChild("hring_r1_s1",
                CubeListBuilder.create()
                        .texOffs(36, 209).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(2.0279F, 0.0F, 2.7911F, 0.0F, -0.6283F, 0.0F));
        PartDefinition hringR1S2 = hringR1.addOrReplaceChild("hring_r1_s2",
                CubeListBuilder.create()
                        .texOffs(45, 209).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(3.2811F, 0.0F, 1.0661F, 0.0F, -1.2566F, 0.0F));
        PartDefinition hringR1S3 = hringR1.addOrReplaceChild("hring_r1_s3",
                CubeListBuilder.create()
                        .texOffs(54, 209).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(3.2811F, 0.0F, -1.0661F, 0.0F, -1.885F, 0.0F));
        PartDefinition hringR1S4 = hringR1.addOrReplaceChild("hring_r1_s4",
                CubeListBuilder.create()
                        .texOffs(63, 209).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(2.0279F, 0.0F, -2.7911F, 0.0F, -2.5133F, 0.0F));
        PartDefinition hringR1S5 = hringR1.addOrReplaceChild("hring_r1_s5",
                CubeListBuilder.create()
                        .texOffs(72, 209).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -3.45F, 0.0F, -3.1416F, 0.0F));
        PartDefinition hringR1S6 = hringR1.addOrReplaceChild("hring_r1_s6",
                CubeListBuilder.create()
                        .texOffs(81, 209).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-2.0279F, 0.0F, -2.7911F, 0.0F, -3.7699F, 0.0F));
        PartDefinition hringR1S7 = hringR1.addOrReplaceChild("hring_r1_s7",
                CubeListBuilder.create()
                        .texOffs(90, 209).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-3.2811F, 0.0F, -1.0661F, 0.0F, -4.3982F, 0.0F));
        PartDefinition hringR1S8 = hringR1.addOrReplaceChild("hring_r1_s8",
                CubeListBuilder.create()
                        .texOffs(99, 209).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-3.2811F, 0.0F, 1.0661F, 0.0F, -5.0265F, 0.0F));
        PartDefinition hringR1S9 = hringR1.addOrReplaceChild("hring_r1_s9",
                CubeListBuilder.create()
                        .texOffs(108, 209).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-2.0279F, 0.0F, 2.7911F, 0.0F, -5.6549F, 0.0F));
        PartDefinition hringR0 = hornR.addOrReplaceChild("hring_r0",
                CubeListBuilder.create(),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, 1.5708F, 0.0F, 0.0F));
        PartDefinition hringR0S0 = hringR0.addOrReplaceChild("hring_r0_s0",
                CubeListBuilder.create()
                        .texOffs(190, 204).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offset(0.0F, 0.0F, 4.0F));
        PartDefinition hringR0S1 = hringR0.addOrReplaceChild("hring_r0_s1",
                CubeListBuilder.create()
                        .texOffs(199, 204).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(2.3511F, 0.0F, 3.2361F, 0.0F, -0.6283F, 0.0F));
        PartDefinition hringR0S2 = hringR0.addOrReplaceChild("hring_r0_s2",
                CubeListBuilder.create()
                        .texOffs(208, 204).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(3.8042F, 0.0F, 1.2361F, 0.0F, -1.2566F, 0.0F));
        PartDefinition hringR0S3 = hringR0.addOrReplaceChild("hring_r0_s3",
                CubeListBuilder.create()
                        .texOffs(217, 204).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(3.8042F, 0.0F, -1.2361F, 0.0F, -1.885F, 0.0F));
        PartDefinition hringR0S4 = hringR0.addOrReplaceChild("hring_r0_s4",
                CubeListBuilder.create()
                        .texOffs(226, 204).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(2.3511F, 0.0F, -3.2361F, 0.0F, -2.5133F, 0.0F));
        PartDefinition hringR0S5 = hringR0.addOrReplaceChild("hring_r0_s5",
                CubeListBuilder.create()
                        .texOffs(235, 204).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -4.0F, 0.0F, -3.1416F, 0.0F));
        PartDefinition hringR0S6 = hringR0.addOrReplaceChild("hring_r0_s6",
                CubeListBuilder.create()
                        .texOffs(244, 204).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-2.3511F, 0.0F, -3.2361F, 0.0F, -3.7699F, 0.0F));
        PartDefinition hringR0S7 = hringR0.addOrReplaceChild("hring_r0_s7",
                CubeListBuilder.create()
                        .texOffs(0, 209).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-3.8042F, 0.0F, -1.2361F, 0.0F, -4.3982F, 0.0F));
        PartDefinition hringR0S8 = hringR0.addOrReplaceChild("hring_r0_s8",
                CubeListBuilder.create()
                        .texOffs(9, 209).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-3.8042F, 0.0F, 1.2361F, 0.0F, -5.0265F, 0.0F));
        PartDefinition hringR0S9 = hringR0.addOrReplaceChild("hring_r0_s9",
                CubeListBuilder.create()
                        .texOffs(18, 209).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-2.3511F, 0.0F, 3.2361F, 0.0F, -5.6549F, 0.0F));
        PartDefinition hornL = head.addOrReplaceChild("horn_l",
                CubeListBuilder.create()
                        .texOffs(147, 124).addBox(-2.1F, 0.0F, -2.1F, 4.2F, 7.5F, 4.2F),
                PartPose.offsetAndRotation(7.5F, -12.0F, -1.0F, -0.2443F, 0.1745F, 0.6981F));
        PartDefinition hornL1 = hornL.addOrReplaceChild("horn_l_1",
                CubeListBuilder.create()
                        .texOffs(177, 124).addBox(-1.638F, 0.0F, -1.638F, 3.276F, 6.6238F, 3.276F),
                PartPose.offsetAndRotation(0.0F, 7.5F, 0.0F, 0.2443F, 0.0F, 0.2793F));
        PartDefinition hornL2 = hornL1.addOrReplaceChild("horn_l_2",
                CubeListBuilder.create()
                        .texOffs(0, 139).addBox(-1.2776F, 0.0F, -1.2776F, 2.5553F, 5.85F, 2.5553F),
                PartPose.offsetAndRotation(0.0F, 6.6238F, 0.0F, 0.2443F, 0.0F, 0.2793F));
        PartDefinition hornL3 = hornL2.addOrReplaceChild("horn_l_3",
                CubeListBuilder.create()
                        .texOffs(60, 149).addBox(-0.9966F, 0.0F, -0.9966F, 1.9931F, 5.1666F, 1.9931F),
                PartPose.offsetAndRotation(0.0F, 5.85F, 0.0F, 0.2443F, 0.0F, 0.2793F));
        PartDefinition hringL2 = hornL2.addOrReplaceChild("hring_l2",
                CubeListBuilder.create(),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, 1.5708F, 0.0F, 0.0F));
        PartDefinition hringL2S0 = hringL2.addOrReplaceChild("hring_l2_s0",
                CubeListBuilder.create()
                        .texOffs(7, 221).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offset(0.0F, 0.0F, 2.9F));
        PartDefinition hringL2S1 = hringL2.addOrReplaceChild("hring_l2_s1",
                CubeListBuilder.create()
                        .texOffs(14, 221).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(1.7046F, 0.0F, 2.3461F, 0.0F, -0.6283F, 0.0F));
        PartDefinition hringL2S2 = hringL2.addOrReplaceChild("hring_l2_s2",
                CubeListBuilder.create()
                        .texOffs(21, 221).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(2.7581F, 0.0F, 0.8961F, 0.0F, -1.2566F, 0.0F));
        PartDefinition hringL2S3 = hringL2.addOrReplaceChild("hring_l2_s3",
                CubeListBuilder.create()
                        .texOffs(28, 221).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(2.7581F, 0.0F, -0.8961F, 0.0F, -1.885F, 0.0F));
        PartDefinition hringL2S4 = hringL2.addOrReplaceChild("hring_l2_s4",
                CubeListBuilder.create()
                        .texOffs(35, 221).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(1.7046F, 0.0F, -2.3461F, 0.0F, -2.5133F, 0.0F));
        PartDefinition hringL2S5 = hringL2.addOrReplaceChild("hring_l2_s5",
                CubeListBuilder.create()
                        .texOffs(42, 221).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -2.9F, 0.0F, -3.1416F, 0.0F));
        PartDefinition hringL2S6 = hringL2.addOrReplaceChild("hring_l2_s6",
                CubeListBuilder.create()
                        .texOffs(49, 221).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-1.7046F, 0.0F, -2.3461F, 0.0F, -3.7699F, 0.0F));
        PartDefinition hringL2S7 = hringL2.addOrReplaceChild("hring_l2_s7",
                CubeListBuilder.create()
                        .texOffs(56, 221).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-2.7581F, 0.0F, -0.8961F, 0.0F, -4.3982F, 0.0F));
        PartDefinition hringL2S8 = hringL2.addOrReplaceChild("hring_l2_s8",
                CubeListBuilder.create()
                        .texOffs(63, 221).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-2.7581F, 0.0F, 0.8961F, 0.0F, -5.0265F, 0.0F));
        PartDefinition hringL2S9 = hringL2.addOrReplaceChild("hring_l2_s9",
                CubeListBuilder.create()
                        .texOffs(70, 221).addBox(-1.1961F, -0.55F, -0.55F, 2.3923F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-1.7046F, 0.0F, 2.3461F, 0.0F, -5.6549F, 0.0F));
        PartDefinition hringL1 = hornL1.addOrReplaceChild("hring_l1",
                CubeListBuilder.create(),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, 1.5708F, 0.0F, 0.0F));
        PartDefinition hringL1S0 = hringL1.addOrReplaceChild("hring_l1_s0",
                CubeListBuilder.create()
                        .texOffs(207, 209).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offset(0.0F, 0.0F, 3.45F));
        PartDefinition hringL1S1 = hringL1.addOrReplaceChild("hring_l1_s1",
                CubeListBuilder.create()
                        .texOffs(216, 209).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(2.0279F, 0.0F, 2.7911F, 0.0F, -0.6283F, 0.0F));
        PartDefinition hringL1S2 = hringL1.addOrReplaceChild("hring_l1_s2",
                CubeListBuilder.create()
                        .texOffs(225, 209).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(3.2811F, 0.0F, 1.0661F, 0.0F, -1.2566F, 0.0F));
        PartDefinition hringL1S3 = hringL1.addOrReplaceChild("hring_l1_s3",
                CubeListBuilder.create()
                        .texOffs(234, 209).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(3.2811F, 0.0F, -1.0661F, 0.0F, -1.885F, 0.0F));
        PartDefinition hringL1S4 = hringL1.addOrReplaceChild("hring_l1_s4",
                CubeListBuilder.create()
                        .texOffs(243, 209).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(2.0279F, 0.0F, -2.7911F, 0.0F, -2.5133F, 0.0F));
        PartDefinition hringL1S5 = hringL1.addOrReplaceChild("hring_l1_s5",
                CubeListBuilder.create()
                        .texOffs(0, 212).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -3.45F, 0.0F, -3.1416F, 0.0F));
        PartDefinition hringL1S6 = hringL1.addOrReplaceChild("hring_l1_s6",
                CubeListBuilder.create()
                        .texOffs(9, 212).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-2.0279F, 0.0F, -2.7911F, 0.0F, -3.7699F, 0.0F));
        PartDefinition hringL1S7 = hringL1.addOrReplaceChild("hring_l1_s7",
                CubeListBuilder.create()
                        .texOffs(18, 212).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-3.2811F, 0.0F, -1.0661F, 0.0F, -4.3982F, 0.0F));
        PartDefinition hringL1S8 = hringL1.addOrReplaceChild("hring_l1_s8",
                CubeListBuilder.create()
                        .texOffs(27, 212).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-3.2811F, 0.0F, 1.0661F, 0.0F, -5.0265F, 0.0F));
        PartDefinition hringL1S9 = hringL1.addOrReplaceChild("hring_l1_s9",
                CubeListBuilder.create()
                        .texOffs(36, 212).addBox(-1.3661F, -0.55F, -0.55F, 2.7322F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-2.0279F, 0.0F, 2.7911F, 0.0F, -5.6549F, 0.0F));
        PartDefinition hringL0 = hornL.addOrReplaceChild("hring_l0",
                CubeListBuilder.create(),
                PartPose.offsetAndRotation(0.0F, 3.0F, 0.0F, 1.5708F, 0.0F, 0.0F));
        PartDefinition hringL0S0 = hringL0.addOrReplaceChild("hring_l0_s0",
                CubeListBuilder.create()
                        .texOffs(117, 209).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offset(0.0F, 0.0F, 4.0F));
        PartDefinition hringL0S1 = hringL0.addOrReplaceChild("hring_l0_s1",
                CubeListBuilder.create()
                        .texOffs(126, 209).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(2.3511F, 0.0F, 3.2361F, 0.0F, -0.6283F, 0.0F));
        PartDefinition hringL0S2 = hringL0.addOrReplaceChild("hring_l0_s2",
                CubeListBuilder.create()
                        .texOffs(135, 209).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(3.8042F, 0.0F, 1.2361F, 0.0F, -1.2566F, 0.0F));
        PartDefinition hringL0S3 = hringL0.addOrReplaceChild("hring_l0_s3",
                CubeListBuilder.create()
                        .texOffs(144, 209).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(3.8042F, 0.0F, -1.2361F, 0.0F, -1.885F, 0.0F));
        PartDefinition hringL0S4 = hringL0.addOrReplaceChild("hring_l0_s4",
                CubeListBuilder.create()
                        .texOffs(153, 209).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(2.3511F, 0.0F, -3.2361F, 0.0F, -2.5133F, 0.0F));
        PartDefinition hringL0S5 = hringL0.addOrReplaceChild("hring_l0_s5",
                CubeListBuilder.create()
                        .texOffs(162, 209).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -4.0F, 0.0F, -3.1416F, 0.0F));
        PartDefinition hringL0S6 = hringL0.addOrReplaceChild("hring_l0_s6",
                CubeListBuilder.create()
                        .texOffs(171, 209).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-2.3511F, 0.0F, -3.2361F, 0.0F, -3.7699F, 0.0F));
        PartDefinition hringL0S7 = hringL0.addOrReplaceChild("hring_l0_s7",
                CubeListBuilder.create()
                        .texOffs(180, 209).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-3.8042F, 0.0F, -1.2361F, 0.0F, -4.3982F, 0.0F));
        PartDefinition hringL0S8 = hringL0.addOrReplaceChild("hring_l0_s8",
                CubeListBuilder.create()
                        .texOffs(189, 209).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-3.8042F, 0.0F, 1.2361F, 0.0F, -5.0265F, 0.0F));
        PartDefinition hringL0S9 = hringL0.addOrReplaceChild("hring_l0_s9",
                CubeListBuilder.create()
                        .texOffs(198, 209).addBox(-1.5361F, -0.55F, -0.55F, 3.0721F, 1.1F, 1.1F),
                PartPose.offsetAndRotation(-2.3511F, 0.0F, 3.2361F, 0.0F, -5.6549F, 0.0F));
        PartDefinition mut0Crown = head.addOrReplaceChild("mut0_crown",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -14.0F, 0.0F));
        PartDefinition mut0CrownS0 = mut0Crown.addOrReplaceChild("mut0_crown_s0",
                CubeListBuilder.create()
                        .texOffs(27, 171).addBox(-0.5F, -5.0F, -0.5F, 1.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(-6.0F, 0.0F, -0.8F, -0.3142F, -0.4538F, -0.5236F));
        PartDefinition mut0CrownE0 = mut0CrownS0.addOrReplaceChild("mut0_crown_e0",
                CubeListBuilder.create()
                        .texOffs(36, 199).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -5.0F, 0.0F));
        PartDefinition mut0CrownS1 = mut0Crown.addOrReplaceChild("mut0_crown_s1",
                CubeListBuilder.create()
                        .texOffs(32, 171).addBox(-0.5F, -5.0F, -0.5F, 1.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(-3.0F, 0.0F, -0.4F, -0.3142F, -0.2269F, -0.2618F));
        PartDefinition mut0CrownE1 = mut0CrownS1.addOrReplaceChild("mut0_crown_e1",
                CubeListBuilder.create()
                        .texOffs(45, 199).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -5.0F, 0.0F));
        PartDefinition mut0CrownS2 = mut0Crown.addOrReplaceChild("mut0_crown_s2",
                CubeListBuilder.create()
                        .texOffs(37, 171).addBox(-0.5F, -5.0F, -0.5F, 1.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -0.0F, -0.3142F, 0.0F, 0.0F));
        PartDefinition mut0CrownE2 = mut0CrownS2.addOrReplaceChild("mut0_crown_e2",
                CubeListBuilder.create()
                        .texOffs(54, 199).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -5.0F, 0.0F));
        PartDefinition mut0CrownS3 = mut0Crown.addOrReplaceChild("mut0_crown_s3",
                CubeListBuilder.create()
                        .texOffs(42, 171).addBox(-0.5F, -5.0F, -0.5F, 1.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(3.0F, 0.0F, -0.4F, -0.3142F, 0.2269F, 0.2618F));
        PartDefinition mut0CrownE3 = mut0CrownS3.addOrReplaceChild("mut0_crown_e3",
                CubeListBuilder.create()
                        .texOffs(63, 199).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -5.0F, 0.0F));
        PartDefinition mut0CrownS4 = mut0Crown.addOrReplaceChild("mut0_crown_s4",
                CubeListBuilder.create()
                        .texOffs(47, 171).addBox(-0.5F, -5.0F, -0.5F, 1.0F, 5.0F, 1.0F),
                PartPose.offsetAndRotation(6.0F, 0.0F, -0.8F, -0.3142F, 0.4538F, 0.5236F));
        PartDefinition mut0CrownE4 = mut0CrownS4.addOrReplaceChild("mut0_crown_e4",
                CubeListBuilder.create()
                        .texOffs(72, 199).addBox(-1.2F, -2.4F, -1.2F, 2.4F, 2.4F, 2.4F),
                PartPose.offset(0.0F, -5.0F, 0.0F));
        PartDefinition float0 = root.addOrReplaceChild("float0",
                CubeListBuilder.create(),
                PartPose.offsetAndRotation(-24.0F, -30.0F, -4.0F, 0.0F, 0.3142F, -0.1396F));
        PartDefinition shring0 = float0.addOrReplaceChild("shring0",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition shring0S0 = shring0.addOrReplaceChild("shring0_s0",
                CubeListBuilder.create()
                        .texOffs(45, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offset(0.0F, 0.0F, 5.0F));
        PartDefinition shring0S1 = shring0.addOrReplaceChild("shring0_s1",
                CubeListBuilder.create()
                        .texOffs(54, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(2.5F, 0.0F, 4.3301F, 0.0F, -0.5236F, 0.0F));
        PartDefinition shring0S2 = shring0.addOrReplaceChild("shring0_s2",
                CubeListBuilder.create()
                        .texOffs(63, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(4.3301F, 0.0F, 2.5F, 0.0F, -1.0472F, 0.0F));
        PartDefinition shring0S3 = shring0.addOrReplaceChild("shring0_s3",
                CubeListBuilder.create()
                        .texOffs(72, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(5.0F, 0.0F, 0.0F, 0.0F, -1.5708F, 0.0F));
        PartDefinition shring0S4 = shring0.addOrReplaceChild("shring0_s4",
                CubeListBuilder.create()
                        .texOffs(81, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(4.3301F, 0.0F, -2.5F, 0.0F, -2.0944F, 0.0F));
        PartDefinition shring0S5 = shring0.addOrReplaceChild("shring0_s5",
                CubeListBuilder.create()
                        .texOffs(90, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(2.5F, 0.0F, -4.3301F, 0.0F, -2.618F, 0.0F));
        PartDefinition shring0S6 = shring0.addOrReplaceChild("shring0_s6",
                CubeListBuilder.create()
                        .texOffs(99, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -5.0F, 0.0F, -3.1416F, 0.0F));
        PartDefinition shring0S7 = shring0.addOrReplaceChild("shring0_s7",
                CubeListBuilder.create()
                        .texOffs(108, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-2.5F, 0.0F, -4.3301F, 0.0F, -3.6652F, 0.0F));
        PartDefinition shring0S8 = shring0.addOrReplaceChild("shring0_s8",
                CubeListBuilder.create()
                        .texOffs(117, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-4.3301F, 0.0F, -2.5F, 0.0F, -4.1888F, 0.0F));
        PartDefinition shring0S9 = shring0.addOrReplaceChild("shring0_s9",
                CubeListBuilder.create()
                        .texOffs(126, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-5.0F, 0.0F, -0.0F, 0.0F, -4.7124F, 0.0F));
        PartDefinition shring0S10 = shring0.addOrReplaceChild("shring0_s10",
                CubeListBuilder.create()
                        .texOffs(135, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-4.3301F, 0.0F, 2.5F, 0.0F, -5.236F, 0.0F));
        PartDefinition shring0S11 = shring0.addOrReplaceChild("shring0_s11",
                CubeListBuilder.create()
                        .texOffs(144, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-2.5F, 0.0F, 4.3301F, 0.0F, -5.7596F, 0.0F));
        PartDefinition mut0Hand0 = float0.addOrReplaceChild("mut0_hand0",
                CubeListBuilder.create()
                        .texOffs(0, 124).addBox(-2.04F, 0.0F, -2.04F, 4.08F, 10.2F, 4.08F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut0Hand0Fore = mut0Hand0.addOrReplaceChild("mut0_hand0_fore",
                CubeListBuilder.create()
                        .texOffs(65, 124).addBox(-1.7F, 0.0F, -1.7F, 3.4F, 10.2F, 3.4F),
                PartPose.offsetAndRotation(0.0F, 10.2F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut0Hand0Hand = mut0Hand0Fore.addOrReplaceChild("mut0_hand0_hand",
                CubeListBuilder.create()
                        .texOffs(237, 139).addBox(-2.38F, 0.0F, -1.53F, 4.76F, 3.74F, 3.06F),
                PartPose.offsetAndRotation(0.0F, 10.2F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut0Hand0F0 = mut0Hand0Hand.addOrReplaceChild("mut0_hand0_f0",
                CubeListBuilder.create()
                        .texOffs(151, 199).addBox(-0.68F, 0.0F, -0.68F, 1.36F, 2.72F, 1.36F),
                PartPose.offsetAndRotation(-1.87F, 3.74F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut0Hand0F01 = mut0Hand0F0.addOrReplaceChild("mut0_hand0_f0_1",
                CubeListBuilder.create()
                        .texOffs(156, 199).addBox(-0.5848F, 0.0F, -0.5848F, 1.1696F, 2.5224F, 1.1696F),
                PartPose.offsetAndRotation(0.0F, 2.72F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand0F02 = mut0Hand0F01.addOrReplaceChild("mut0_hand0_f0_2",
                CubeListBuilder.create()
                        .texOffs(140, 204).addBox(-0.5029F, 0.0F, -0.5029F, 1.0059F, 2.3392F, 1.0059F),
                PartPose.offsetAndRotation(0.0F, 2.5224F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand0F1 = mut0Hand0Hand.addOrReplaceChild("mut0_hand0_f1",
                CubeListBuilder.create()
                        .texOffs(161, 199).addBox(-0.68F, 0.0F, -0.68F, 1.36F, 2.72F, 1.36F),
                PartPose.offsetAndRotation(-0.595F, 3.74F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut0Hand0F11 = mut0Hand0F1.addOrReplaceChild("mut0_hand0_f1_1",
                CubeListBuilder.create()
                        .texOffs(166, 199).addBox(-0.5848F, 0.0F, -0.5848F, 1.1696F, 2.5224F, 1.1696F),
                PartPose.offsetAndRotation(0.0F, 2.72F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand0F12 = mut0Hand0F11.addOrReplaceChild("mut0_hand0_f1_2",
                CubeListBuilder.create()
                        .texOffs(145, 204).addBox(-0.5029F, 0.0F, -0.5029F, 1.0059F, 2.3392F, 1.0059F),
                PartPose.offsetAndRotation(0.0F, 2.5224F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand0F2 = mut0Hand0Hand.addOrReplaceChild("mut0_hand0_f2",
                CubeListBuilder.create()
                        .texOffs(171, 199).addBox(-0.68F, 0.0F, -0.68F, 1.36F, 2.72F, 1.36F),
                PartPose.offsetAndRotation(0.68F, 3.74F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut0Hand0F21 = mut0Hand0F2.addOrReplaceChild("mut0_hand0_f2_1",
                CubeListBuilder.create()
                        .texOffs(176, 199).addBox(-0.5848F, 0.0F, -0.5848F, 1.1696F, 2.5224F, 1.1696F),
                PartPose.offsetAndRotation(0.0F, 2.72F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand0F22 = mut0Hand0F21.addOrReplaceChild("mut0_hand0_f2_2",
                CubeListBuilder.create()
                        .texOffs(150, 204).addBox(-0.5029F, 0.0F, -0.5029F, 1.0059F, 2.3392F, 1.0059F),
                PartPose.offsetAndRotation(0.0F, 2.5224F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand0F3 = mut0Hand0Hand.addOrReplaceChild("mut0_hand0_f3",
                CubeListBuilder.create()
                        .texOffs(181, 199).addBox(-0.68F, 0.0F, -0.68F, 1.36F, 2.72F, 1.36F),
                PartPose.offsetAndRotation(1.955F, 3.74F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut0Hand0F31 = mut0Hand0F3.addOrReplaceChild("mut0_hand0_f3_1",
                CubeListBuilder.create()
                        .texOffs(186, 199).addBox(-0.5848F, 0.0F, -0.5848F, 1.1696F, 2.5224F, 1.1696F),
                PartPose.offsetAndRotation(0.0F, 2.72F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand0F32 = mut0Hand0F31.addOrReplaceChild("mut0_hand0_f3_2",
                CubeListBuilder.create()
                        .texOffs(155, 204).addBox(-0.5029F, 0.0F, -0.5029F, 1.0059F, 2.3392F, 1.0059F),
                PartPose.offsetAndRotation(0.0F, 2.5224F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand0Thumb = mut0Hand0Hand.addOrReplaceChild("mut0_hand0_thumb",
                CubeListBuilder.create()
                        .texOffs(52, 171).addBox(-0.765F, 0.0F, -0.765F, 1.53F, 2.55F, 1.53F),
                PartPose.offsetAndRotation(-2.38F, 1.7F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut0Hand0Thumb1 = mut0Hand0Thumb.addOrReplaceChild("mut0_hand0_thumb_1",
                CubeListBuilder.create()
                        .texOffs(160, 204).addBox(-0.6502F, 0.0F, -0.6502F, 1.3005F, 2.351F, 1.3005F),
                PartPose.offsetAndRotation(0.0F, 2.55F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition wring0 = mut0Hand0Fore.addOrReplaceChild("wring0",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 9.18F, 0.0F));
        PartDefinition wring0S0 = wring0.addOrReplaceChild("wring0_s0",
                CubeListBuilder.create()
                        .texOffs(77, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offset(0.0F, 0.0F, 2.6F));
        PartDefinition wring0S1 = wring0.addOrReplaceChild("wring0_s1",
                CubeListBuilder.create()
                        .texOffs(84, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(1.5282F, 0.0F, 2.1034F, 0.0F, -0.6283F, 0.0F));
        PartDefinition wring0S2 = wring0.addOrReplaceChild("wring0_s2",
                CubeListBuilder.create()
                        .texOffs(91, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(2.4727F, 0.0F, 0.8034F, 0.0F, -1.2566F, 0.0F));
        PartDefinition wring0S3 = wring0.addOrReplaceChild("wring0_s3",
                CubeListBuilder.create()
                        .texOffs(98, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(2.4727F, 0.0F, -0.8034F, 0.0F, -1.885F, 0.0F));
        PartDefinition wring0S4 = wring0.addOrReplaceChild("wring0_s4",
                CubeListBuilder.create()
                        .texOffs(105, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(1.5282F, 0.0F, -2.1034F, 0.0F, -2.5133F, 0.0F));
        PartDefinition wring0S5 = wring0.addOrReplaceChild("wring0_s5",
                CubeListBuilder.create()
                        .texOffs(112, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -2.6F, 0.0F, -3.1416F, 0.0F));
        PartDefinition wring0S6 = wring0.addOrReplaceChild("wring0_s6",
                CubeListBuilder.create()
                        .texOffs(119, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-1.5282F, 0.0F, -2.1034F, 0.0F, -3.7699F, 0.0F));
        PartDefinition wring0S7 = wring0.addOrReplaceChild("wring0_s7",
                CubeListBuilder.create()
                        .texOffs(126, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-2.4727F, 0.0F, -0.8034F, 0.0F, -4.3982F, 0.0F));
        PartDefinition wring0S8 = wring0.addOrReplaceChild("wring0_s8",
                CubeListBuilder.create()
                        .texOffs(133, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-2.4727F, 0.0F, 0.8034F, 0.0F, -5.0265F, 0.0F));
        PartDefinition wring0S9 = wring0.addOrReplaceChild("wring0_s9",
                CubeListBuilder.create()
                        .texOffs(140, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-1.5282F, 0.0F, 2.1034F, 0.0F, -5.6549F, 0.0F));
        PartDefinition float1 = root.addOrReplaceChild("float1",
                CubeListBuilder.create(),
                PartPose.offsetAndRotation(24.0F, -30.0F, -4.0F, 0.0F, -0.3142F, 0.1396F));
        PartDefinition shring1 = float1.addOrReplaceChild("shring1",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition shring1S0 = shring1.addOrReplaceChild("shring1_s0",
                CubeListBuilder.create()
                        .texOffs(153, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offset(0.0F, 0.0F, 5.0F));
        PartDefinition shring1S1 = shring1.addOrReplaceChild("shring1_s1",
                CubeListBuilder.create()
                        .texOffs(162, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(2.5F, 0.0F, 4.3301F, 0.0F, -0.5236F, 0.0F));
        PartDefinition shring1S2 = shring1.addOrReplaceChild("shring1_s2",
                CubeListBuilder.create()
                        .texOffs(171, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(4.3301F, 0.0F, 2.5F, 0.0F, -1.0472F, 0.0F));
        PartDefinition shring1S3 = shring1.addOrReplaceChild("shring1_s3",
                CubeListBuilder.create()
                        .texOffs(180, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(5.0F, 0.0F, 0.0F, 0.0F, -1.5708F, 0.0F));
        PartDefinition shring1S4 = shring1.addOrReplaceChild("shring1_s4",
                CubeListBuilder.create()
                        .texOffs(189, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(4.3301F, 0.0F, -2.5F, 0.0F, -2.0944F, 0.0F));
        PartDefinition shring1S5 = shring1.addOrReplaceChild("shring1_s5",
                CubeListBuilder.create()
                        .texOffs(198, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(2.5F, 0.0F, -4.3301F, 0.0F, -2.618F, 0.0F));
        PartDefinition shring1S6 = shring1.addOrReplaceChild("shring1_s6",
                CubeListBuilder.create()
                        .texOffs(207, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -5.0F, 0.0F, -3.1416F, 0.0F));
        PartDefinition shring1S7 = shring1.addOrReplaceChild("shring1_s7",
                CubeListBuilder.create()
                        .texOffs(216, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-2.5F, 0.0F, -4.3301F, 0.0F, -3.6652F, 0.0F));
        PartDefinition shring1S8 = shring1.addOrReplaceChild("shring1_s8",
                CubeListBuilder.create()
                        .texOffs(225, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-4.3301F, 0.0F, -2.5F, 0.0F, -4.1888F, 0.0F));
        PartDefinition shring1S9 = shring1.addOrReplaceChild("shring1_s9",
                CubeListBuilder.create()
                        .texOffs(234, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-5.0F, 0.0F, -0.0F, 0.0F, -4.7124F, 0.0F));
        PartDefinition shring1S10 = shring1.addOrReplaceChild("shring1_s10",
                CubeListBuilder.create()
                        .texOffs(243, 212).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-4.3301F, 0.0F, 2.5F, 0.0F, -5.236F, 0.0F));
        PartDefinition shring1S11 = shring1.addOrReplaceChild("shring1_s11",
                CubeListBuilder.create()
                        .texOffs(0, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-2.5F, 0.0F, 4.3301F, 0.0F, -5.7596F, 0.0F));
        PartDefinition mut0Hand1 = float1.addOrReplaceChild("mut0_hand1",
                CubeListBuilder.create()
                        .texOffs(17, 124).addBox(-2.04F, 0.0F, -2.04F, 4.08F, 10.2F, 4.08F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut0Hand1Fore = mut0Hand1.addOrReplaceChild("mut0_hand1_fore",
                CubeListBuilder.create()
                        .texOffs(78, 124).addBox(-1.7F, 0.0F, -1.7F, 3.4F, 10.2F, 3.4F),
                PartPose.offsetAndRotation(0.0F, 10.2F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut0Hand1Hand = mut0Hand1Fore.addOrReplaceChild("mut0_hand1_hand",
                CubeListBuilder.create()
                        .texOffs(0, 149).addBox(-2.38F, 0.0F, -1.53F, 4.76F, 3.74F, 3.06F),
                PartPose.offsetAndRotation(0.0F, 10.2F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut0Hand1F0 = mut0Hand1Hand.addOrReplaceChild("mut0_hand1_f0",
                CubeListBuilder.create()
                        .texOffs(191, 199).addBox(-0.68F, 0.0F, -0.68F, 1.36F, 2.72F, 1.36F),
                PartPose.offsetAndRotation(-1.87F, 3.74F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut0Hand1F01 = mut0Hand1F0.addOrReplaceChild("mut0_hand1_f0_1",
                CubeListBuilder.create()
                        .texOffs(196, 199).addBox(-0.5848F, 0.0F, -0.5848F, 1.1696F, 2.5224F, 1.1696F),
                PartPose.offsetAndRotation(0.0F, 2.72F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand1F02 = mut0Hand1F01.addOrReplaceChild("mut0_hand1_f0_2",
                CubeListBuilder.create()
                        .texOffs(165, 204).addBox(-0.5029F, 0.0F, -0.5029F, 1.0059F, 2.3392F, 1.0059F),
                PartPose.offsetAndRotation(0.0F, 2.5224F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand1F1 = mut0Hand1Hand.addOrReplaceChild("mut0_hand1_f1",
                CubeListBuilder.create()
                        .texOffs(201, 199).addBox(-0.68F, 0.0F, -0.68F, 1.36F, 2.72F, 1.36F),
                PartPose.offsetAndRotation(-0.595F, 3.74F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut0Hand1F11 = mut0Hand1F1.addOrReplaceChild("mut0_hand1_f1_1",
                CubeListBuilder.create()
                        .texOffs(206, 199).addBox(-0.5848F, 0.0F, -0.5848F, 1.1696F, 2.5224F, 1.1696F),
                PartPose.offsetAndRotation(0.0F, 2.72F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand1F12 = mut0Hand1F11.addOrReplaceChild("mut0_hand1_f1_2",
                CubeListBuilder.create()
                        .texOffs(170, 204).addBox(-0.5029F, 0.0F, -0.5029F, 1.0059F, 2.3392F, 1.0059F),
                PartPose.offsetAndRotation(0.0F, 2.5224F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand1F2 = mut0Hand1Hand.addOrReplaceChild("mut0_hand1_f2",
                CubeListBuilder.create()
                        .texOffs(211, 199).addBox(-0.68F, 0.0F, -0.68F, 1.36F, 2.72F, 1.36F),
                PartPose.offsetAndRotation(0.68F, 3.74F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut0Hand1F21 = mut0Hand1F2.addOrReplaceChild("mut0_hand1_f2_1",
                CubeListBuilder.create()
                        .texOffs(216, 199).addBox(-0.5848F, 0.0F, -0.5848F, 1.1696F, 2.5224F, 1.1696F),
                PartPose.offsetAndRotation(0.0F, 2.72F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand1F22 = mut0Hand1F21.addOrReplaceChild("mut0_hand1_f2_2",
                CubeListBuilder.create()
                        .texOffs(175, 204).addBox(-0.5029F, 0.0F, -0.5029F, 1.0059F, 2.3392F, 1.0059F),
                PartPose.offsetAndRotation(0.0F, 2.5224F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand1F3 = mut0Hand1Hand.addOrReplaceChild("mut0_hand1_f3",
                CubeListBuilder.create()
                        .texOffs(221, 199).addBox(-0.68F, 0.0F, -0.68F, 1.36F, 2.72F, 1.36F),
                PartPose.offsetAndRotation(1.955F, 3.74F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut0Hand1F31 = mut0Hand1F3.addOrReplaceChild("mut0_hand1_f3_1",
                CubeListBuilder.create()
                        .texOffs(226, 199).addBox(-0.5848F, 0.0F, -0.5848F, 1.1696F, 2.5224F, 1.1696F),
                PartPose.offsetAndRotation(0.0F, 2.72F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand1F32 = mut0Hand1F31.addOrReplaceChild("mut0_hand1_f3_2",
                CubeListBuilder.create()
                        .texOffs(180, 204).addBox(-0.5029F, 0.0F, -0.5029F, 1.0059F, 2.3392F, 1.0059F),
                PartPose.offsetAndRotation(0.0F, 2.5224F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand1Thumb = mut0Hand1Hand.addOrReplaceChild("mut0_hand1_thumb",
                CubeListBuilder.create()
                        .texOffs(61, 171).addBox(-0.765F, 0.0F, -0.765F, 1.53F, 2.55F, 1.53F),
                PartPose.offsetAndRotation(-2.38F, 1.7F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut0Hand1Thumb1 = mut0Hand1Thumb.addOrReplaceChild("mut0_hand1_thumb_1",
                CubeListBuilder.create()
                        .texOffs(185, 204).addBox(-0.6502F, 0.0F, -0.6502F, 1.3005F, 2.351F, 1.3005F),
                PartPose.offsetAndRotation(0.0F, 2.55F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition wring1 = mut0Hand1Fore.addOrReplaceChild("wring1",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 9.18F, 0.0F));
        PartDefinition wring1S0 = wring1.addOrReplaceChild("wring1_s0",
                CubeListBuilder.create()
                        .texOffs(147, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offset(0.0F, 0.0F, 2.6F));
        PartDefinition wring1S1 = wring1.addOrReplaceChild("wring1_s1",
                CubeListBuilder.create()
                        .texOffs(154, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(1.5282F, 0.0F, 2.1034F, 0.0F, -0.6283F, 0.0F));
        PartDefinition wring1S2 = wring1.addOrReplaceChild("wring1_s2",
                CubeListBuilder.create()
                        .texOffs(161, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(2.4727F, 0.0F, 0.8034F, 0.0F, -1.2566F, 0.0F));
        PartDefinition wring1S3 = wring1.addOrReplaceChild("wring1_s3",
                CubeListBuilder.create()
                        .texOffs(168, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(2.4727F, 0.0F, -0.8034F, 0.0F, -1.885F, 0.0F));
        PartDefinition wring1S4 = wring1.addOrReplaceChild("wring1_s4",
                CubeListBuilder.create()
                        .texOffs(175, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(1.5282F, 0.0F, -2.1034F, 0.0F, -2.5133F, 0.0F));
        PartDefinition wring1S5 = wring1.addOrReplaceChild("wring1_s5",
                CubeListBuilder.create()
                        .texOffs(182, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -2.6F, 0.0F, -3.1416F, 0.0F));
        PartDefinition wring1S6 = wring1.addOrReplaceChild("wring1_s6",
                CubeListBuilder.create()
                        .texOffs(189, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-1.5282F, 0.0F, -2.1034F, 0.0F, -3.7699F, 0.0F));
        PartDefinition wring1S7 = wring1.addOrReplaceChild("wring1_s7",
                CubeListBuilder.create()
                        .texOffs(196, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-2.4727F, 0.0F, -0.8034F, 0.0F, -4.3982F, 0.0F));
        PartDefinition wring1S8 = wring1.addOrReplaceChild("wring1_s8",
                CubeListBuilder.create()
                        .texOffs(203, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-2.4727F, 0.0F, 0.8034F, 0.0F, -5.0265F, 0.0F));
        PartDefinition wring1S9 = wring1.addOrReplaceChild("wring1_s9",
                CubeListBuilder.create()
                        .texOffs(210, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-1.5282F, 0.0F, 2.1034F, 0.0F, -5.6549F, 0.0F));
        PartDefinition float2 = root.addOrReplaceChild("float2",
                CubeListBuilder.create(),
                PartPose.offsetAndRotation(-30.0F, -12.0F, 1.0F, 0.0F, 0.3142F, -0.1396F));
        PartDefinition shring2 = float2.addOrReplaceChild("shring2",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition shring2S0 = shring2.addOrReplaceChild("shring2_s0",
                CubeListBuilder.create()
                        .texOffs(9, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offset(0.0F, 0.0F, 5.0F));
        PartDefinition shring2S1 = shring2.addOrReplaceChild("shring2_s1",
                CubeListBuilder.create()
                        .texOffs(18, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(2.5F, 0.0F, 4.3301F, 0.0F, -0.5236F, 0.0F));
        PartDefinition shring2S2 = shring2.addOrReplaceChild("shring2_s2",
                CubeListBuilder.create()
                        .texOffs(27, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(4.3301F, 0.0F, 2.5F, 0.0F, -1.0472F, 0.0F));
        PartDefinition shring2S3 = shring2.addOrReplaceChild("shring2_s3",
                CubeListBuilder.create()
                        .texOffs(36, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(5.0F, 0.0F, 0.0F, 0.0F, -1.5708F, 0.0F));
        PartDefinition shring2S4 = shring2.addOrReplaceChild("shring2_s4",
                CubeListBuilder.create()
                        .texOffs(45, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(4.3301F, 0.0F, -2.5F, 0.0F, -2.0944F, 0.0F));
        PartDefinition shring2S5 = shring2.addOrReplaceChild("shring2_s5",
                CubeListBuilder.create()
                        .texOffs(54, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(2.5F, 0.0F, -4.3301F, 0.0F, -2.618F, 0.0F));
        PartDefinition shring2S6 = shring2.addOrReplaceChild("shring2_s6",
                CubeListBuilder.create()
                        .texOffs(63, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -5.0F, 0.0F, -3.1416F, 0.0F));
        PartDefinition shring2S7 = shring2.addOrReplaceChild("shring2_s7",
                CubeListBuilder.create()
                        .texOffs(72, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-2.5F, 0.0F, -4.3301F, 0.0F, -3.6652F, 0.0F));
        PartDefinition shring2S8 = shring2.addOrReplaceChild("shring2_s8",
                CubeListBuilder.create()
                        .texOffs(81, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-4.3301F, 0.0F, -2.5F, 0.0F, -4.1888F, 0.0F));
        PartDefinition shring2S9 = shring2.addOrReplaceChild("shring2_s9",
                CubeListBuilder.create()
                        .texOffs(90, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-5.0F, 0.0F, -0.0F, 0.0F, -4.7124F, 0.0F));
        PartDefinition shring2S10 = shring2.addOrReplaceChild("shring2_s10",
                CubeListBuilder.create()
                        .texOffs(99, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-4.3301F, 0.0F, 2.5F, 0.0F, -5.236F, 0.0F));
        PartDefinition shring2S11 = shring2.addOrReplaceChild("shring2_s11",
                CubeListBuilder.create()
                        .texOffs(108, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-2.5F, 0.0F, 4.3301F, 0.0F, -5.7596F, 0.0F));
        PartDefinition mut0Hand2 = float2.addOrReplaceChild("mut0_hand2",
                CubeListBuilder.create()
                        .texOffs(33, 105).addBox(-2.64F, 0.0F, -2.64F, 5.28F, 13.2F, 5.28F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut0Hand2Fore = mut0Hand2.addOrReplaceChild("mut0_hand2_fore",
                CubeListBuilder.create()
                        .texOffs(75, 105).addBox(-2.2F, 0.0F, -2.2F, 4.4F, 13.2F, 4.4F),
                PartPose.offsetAndRotation(0.0F, 13.2F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut0Hand2Hand = mut0Hand2Fore.addOrReplaceChild("mut0_hand2_hand",
                CubeListBuilder.create()
                        .texOffs(190, 124).addBox(-3.08F, 0.0F, -1.98F, 6.16F, 4.84F, 3.96F),
                PartPose.offsetAndRotation(0.0F, 13.2F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut0Hand2F0 = mut0Hand2Hand.addOrReplaceChild("mut0_hand2_f0",
                CubeListBuilder.create()
                        .texOffs(207, 164).addBox(-0.88F, 0.0F, -0.88F, 1.76F, 3.52F, 1.76F),
                PartPose.offsetAndRotation(-2.42F, 4.84F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut0Hand2F01 = mut0Hand2F0.addOrReplaceChild("mut0_hand2_f0_1",
                CubeListBuilder.create()
                        .texOffs(70, 171).addBox(-0.7568F, 0.0F, -0.7568F, 1.5136F, 3.2643F, 1.5136F),
                PartPose.offsetAndRotation(0.0F, 3.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand2F02 = mut0Hand2F01.addOrReplaceChild("mut0_hand2_f0_2",
                CubeListBuilder.create()
                        .texOffs(231, 199).addBox(-0.6508F, 0.0F, -0.6508F, 1.3017F, 3.0272F, 1.3017F),
                PartPose.offsetAndRotation(0.0F, 3.2643F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand2F1 = mut0Hand2Hand.addOrReplaceChild("mut0_hand2_f1",
                CubeListBuilder.create()
                        .texOffs(216, 164).addBox(-0.88F, 0.0F, -0.88F, 1.76F, 3.52F, 1.76F),
                PartPose.offsetAndRotation(-0.77F, 4.84F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut0Hand2F11 = mut0Hand2F1.addOrReplaceChild("mut0_hand2_f1_1",
                CubeListBuilder.create()
                        .texOffs(79, 171).addBox(-0.7568F, 0.0F, -0.7568F, 1.5136F, 3.2643F, 1.5136F),
                PartPose.offsetAndRotation(0.0F, 3.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand2F12 = mut0Hand2F11.addOrReplaceChild("mut0_hand2_f1_2",
                CubeListBuilder.create()
                        .texOffs(236, 199).addBox(-0.6508F, 0.0F, -0.6508F, 1.3017F, 3.0272F, 1.3017F),
                PartPose.offsetAndRotation(0.0F, 3.2643F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand2F2 = mut0Hand2Hand.addOrReplaceChild("mut0_hand2_f2",
                CubeListBuilder.create()
                        .texOffs(225, 164).addBox(-0.88F, 0.0F, -0.88F, 1.76F, 3.52F, 1.76F),
                PartPose.offsetAndRotation(0.88F, 4.84F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut0Hand2F21 = mut0Hand2F2.addOrReplaceChild("mut0_hand2_f2_1",
                CubeListBuilder.create()
                        .texOffs(88, 171).addBox(-0.7568F, 0.0F, -0.7568F, 1.5136F, 3.2643F, 1.5136F),
                PartPose.offsetAndRotation(0.0F, 3.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand2F22 = mut0Hand2F21.addOrReplaceChild("mut0_hand2_f2_2",
                CubeListBuilder.create()
                        .texOffs(241, 199).addBox(-0.6508F, 0.0F, -0.6508F, 1.3017F, 3.0272F, 1.3017F),
                PartPose.offsetAndRotation(0.0F, 3.2643F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand2F3 = mut0Hand2Hand.addOrReplaceChild("mut0_hand2_f3",
                CubeListBuilder.create()
                        .texOffs(234, 164).addBox(-0.88F, 0.0F, -0.88F, 1.76F, 3.52F, 1.76F),
                PartPose.offsetAndRotation(2.53F, 4.84F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut0Hand2F31 = mut0Hand2F3.addOrReplaceChild("mut0_hand2_f3_1",
                CubeListBuilder.create()
                        .texOffs(97, 171).addBox(-0.7568F, 0.0F, -0.7568F, 1.5136F, 3.2643F, 1.5136F),
                PartPose.offsetAndRotation(0.0F, 3.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand2F32 = mut0Hand2F31.addOrReplaceChild("mut0_hand2_f3_2",
                CubeListBuilder.create()
                        .texOffs(246, 199).addBox(-0.6508F, 0.0F, -0.6508F, 1.3017F, 3.0272F, 1.3017F),
                PartPose.offsetAndRotation(0.0F, 3.2643F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand2Thumb = mut0Hand2Hand.addOrReplaceChild("mut0_hand2_thumb",
                CubeListBuilder.create()
                        .texOffs(106, 171).addBox(-0.99F, 0.0F, -0.99F, 1.98F, 3.3F, 1.98F),
                PartPose.offsetAndRotation(-3.08F, 2.2F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut0Hand2Thumb1 = mut0Hand2Thumb.addOrReplaceChild("mut0_hand2_thumb_1",
                CubeListBuilder.create()
                        .texOffs(115, 171).addBox(-0.8415F, 0.0F, -0.8415F, 1.683F, 3.0424F, 1.683F),
                PartPose.offsetAndRotation(0.0F, 3.3F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition wring2 = mut0Hand2Fore.addOrReplaceChild("wring2",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 11.88F, 0.0F));
        PartDefinition wring2S0 = wring2.addOrReplaceChild("wring2_s0",
                CubeListBuilder.create()
                        .texOffs(217, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offset(0.0F, 0.0F, 2.6F));
        PartDefinition wring2S1 = wring2.addOrReplaceChild("wring2_s1",
                CubeListBuilder.create()
                        .texOffs(224, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(1.5282F, 0.0F, 2.1034F, 0.0F, -0.6283F, 0.0F));
        PartDefinition wring2S2 = wring2.addOrReplaceChild("wring2_s2",
                CubeListBuilder.create()
                        .texOffs(231, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(2.4727F, 0.0F, 0.8034F, 0.0F, -1.2566F, 0.0F));
        PartDefinition wring2S3 = wring2.addOrReplaceChild("wring2_s3",
                CubeListBuilder.create()
                        .texOffs(238, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(2.4727F, 0.0F, -0.8034F, 0.0F, -1.885F, 0.0F));
        PartDefinition wring2S4 = wring2.addOrReplaceChild("wring2_s4",
                CubeListBuilder.create()
                        .texOffs(245, 221).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(1.5282F, 0.0F, -2.1034F, 0.0F, -2.5133F, 0.0F));
        PartDefinition wring2S5 = wring2.addOrReplaceChild("wring2_s5",
                CubeListBuilder.create()
                        .texOffs(0, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -2.6F, 0.0F, -3.1416F, 0.0F));
        PartDefinition wring2S6 = wring2.addOrReplaceChild("wring2_s6",
                CubeListBuilder.create()
                        .texOffs(7, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-1.5282F, 0.0F, -2.1034F, 0.0F, -3.7699F, 0.0F));
        PartDefinition wring2S7 = wring2.addOrReplaceChild("wring2_s7",
                CubeListBuilder.create()
                        .texOffs(14, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-2.4727F, 0.0F, -0.8034F, 0.0F, -4.3982F, 0.0F));
        PartDefinition wring2S8 = wring2.addOrReplaceChild("wring2_s8",
                CubeListBuilder.create()
                        .texOffs(21, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-2.4727F, 0.0F, 0.8034F, 0.0F, -5.0265F, 0.0F));
        PartDefinition wring2S9 = wring2.addOrReplaceChild("wring2_s9",
                CubeListBuilder.create()
                        .texOffs(28, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-1.5282F, 0.0F, 2.1034F, 0.0F, -5.6549F, 0.0F));
        PartDefinition float3 = root.addOrReplaceChild("float3",
                CubeListBuilder.create(),
                PartPose.offsetAndRotation(30.0F, -12.0F, 1.0F, 0.0F, -0.3142F, 0.1396F));
        PartDefinition shring3 = float3.addOrReplaceChild("shring3",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition shring3S0 = shring3.addOrReplaceChild("shring3_s0",
                CubeListBuilder.create()
                        .texOffs(117, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offset(0.0F, 0.0F, 5.0F));
        PartDefinition shring3S1 = shring3.addOrReplaceChild("shring3_s1",
                CubeListBuilder.create()
                        .texOffs(126, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(2.5F, 0.0F, 4.3301F, 0.0F, -0.5236F, 0.0F));
        PartDefinition shring3S2 = shring3.addOrReplaceChild("shring3_s2",
                CubeListBuilder.create()
                        .texOffs(135, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(4.3301F, 0.0F, 2.5F, 0.0F, -1.0472F, 0.0F));
        PartDefinition shring3S3 = shring3.addOrReplaceChild("shring3_s3",
                CubeListBuilder.create()
                        .texOffs(144, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(5.0F, 0.0F, 0.0F, 0.0F, -1.5708F, 0.0F));
        PartDefinition shring3S4 = shring3.addOrReplaceChild("shring3_s4",
                CubeListBuilder.create()
                        .texOffs(153, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(4.3301F, 0.0F, -2.5F, 0.0F, -2.0944F, 0.0F));
        PartDefinition shring3S5 = shring3.addOrReplaceChild("shring3_s5",
                CubeListBuilder.create()
                        .texOffs(162, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(2.5F, 0.0F, -4.3301F, 0.0F, -2.618F, 0.0F));
        PartDefinition shring3S6 = shring3.addOrReplaceChild("shring3_s6",
                CubeListBuilder.create()
                        .texOffs(171, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -5.0F, 0.0F, -3.1416F, 0.0F));
        PartDefinition shring3S7 = shring3.addOrReplaceChild("shring3_s7",
                CubeListBuilder.create()
                        .texOffs(180, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-2.5F, 0.0F, -4.3301F, 0.0F, -3.6652F, 0.0F));
        PartDefinition shring3S8 = shring3.addOrReplaceChild("shring3_s8",
                CubeListBuilder.create()
                        .texOffs(189, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-4.3301F, 0.0F, -2.5F, 0.0F, -4.1888F, 0.0F));
        PartDefinition shring3S9 = shring3.addOrReplaceChild("shring3_s9",
                CubeListBuilder.create()
                        .texOffs(198, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-5.0F, 0.0F, -0.0F, 0.0F, -4.7124F, 0.0F));
        PartDefinition shring3S10 = shring3.addOrReplaceChild("shring3_s10",
                CubeListBuilder.create()
                        .texOffs(207, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-4.3301F, 0.0F, 2.5F, 0.0F, -5.236F, 0.0F));
        PartDefinition shring3S11 = shring3.addOrReplaceChild("shring3_s11",
                CubeListBuilder.create()
                        .texOffs(216, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-2.5F, 0.0F, 4.3301F, 0.0F, -5.7596F, 0.0F));
        PartDefinition mut0Hand3 = float3.addOrReplaceChild("mut0_hand3",
                CubeListBuilder.create()
                        .texOffs(54, 105).addBox(-2.64F, 0.0F, -2.64F, 5.28F, 13.2F, 5.28F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut0Hand3Fore = mut0Hand3.addOrReplaceChild("mut0_hand3_fore",
                CubeListBuilder.create()
                        .texOffs(92, 105).addBox(-2.2F, 0.0F, -2.2F, 4.4F, 13.2F, 4.4F),
                PartPose.offsetAndRotation(0.0F, 13.2F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut0Hand3Hand = mut0Hand3Fore.addOrReplaceChild("mut0_hand3_hand",
                CubeListBuilder.create()
                        .texOffs(211, 124).addBox(-3.08F, 0.0F, -1.98F, 6.16F, 4.84F, 3.96F),
                PartPose.offsetAndRotation(0.0F, 13.2F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut0Hand3F0 = mut0Hand3Hand.addOrReplaceChild("mut0_hand3_f0",
                CubeListBuilder.create()
                        .texOffs(243, 164).addBox(-0.88F, 0.0F, -0.88F, 1.76F, 3.52F, 1.76F),
                PartPose.offsetAndRotation(-2.42F, 4.84F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut0Hand3F01 = mut0Hand3F0.addOrReplaceChild("mut0_hand3_f0_1",
                CubeListBuilder.create()
                        .texOffs(124, 171).addBox(-0.7568F, 0.0F, -0.7568F, 1.5136F, 3.2643F, 1.5136F),
                PartPose.offsetAndRotation(0.0F, 3.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand3F02 = mut0Hand3F01.addOrReplaceChild("mut0_hand3_f0_2",
                CubeListBuilder.create()
                        .texOffs(251, 199).addBox(-0.6508F, 0.0F, -0.6508F, 1.3017F, 3.0272F, 1.3017F),
                PartPose.offsetAndRotation(0.0F, 3.2643F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand3F1 = mut0Hand3Hand.addOrReplaceChild("mut0_hand3_f1",
                CubeListBuilder.create()
                        .texOffs(0, 171).addBox(-0.88F, 0.0F, -0.88F, 1.76F, 3.52F, 1.76F),
                PartPose.offsetAndRotation(-0.77F, 4.84F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut0Hand3F11 = mut0Hand3F1.addOrReplaceChild("mut0_hand3_f1_1",
                CubeListBuilder.create()
                        .texOffs(133, 171).addBox(-0.7568F, 0.0F, -0.7568F, 1.5136F, 3.2643F, 1.5136F),
                PartPose.offsetAndRotation(0.0F, 3.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand3F12 = mut0Hand3F11.addOrReplaceChild("mut0_hand3_f1_2",
                CubeListBuilder.create()
                        .texOffs(0, 204).addBox(-0.6508F, 0.0F, -0.6508F, 1.3017F, 3.0272F, 1.3017F),
                PartPose.offsetAndRotation(0.0F, 3.2643F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand3F2 = mut0Hand3Hand.addOrReplaceChild("mut0_hand3_f2",
                CubeListBuilder.create()
                        .texOffs(9, 171).addBox(-0.88F, 0.0F, -0.88F, 1.76F, 3.52F, 1.76F),
                PartPose.offsetAndRotation(0.88F, 4.84F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut0Hand3F21 = mut0Hand3F2.addOrReplaceChild("mut0_hand3_f2_1",
                CubeListBuilder.create()
                        .texOffs(142, 171).addBox(-0.7568F, 0.0F, -0.7568F, 1.5136F, 3.2643F, 1.5136F),
                PartPose.offsetAndRotation(0.0F, 3.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand3F22 = mut0Hand3F21.addOrReplaceChild("mut0_hand3_f2_2",
                CubeListBuilder.create()
                        .texOffs(5, 204).addBox(-0.6508F, 0.0F, -0.6508F, 1.3017F, 3.0272F, 1.3017F),
                PartPose.offsetAndRotation(0.0F, 3.2643F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand3F3 = mut0Hand3Hand.addOrReplaceChild("mut0_hand3_f3",
                CubeListBuilder.create()
                        .texOffs(18, 171).addBox(-0.88F, 0.0F, -0.88F, 1.76F, 3.52F, 1.76F),
                PartPose.offsetAndRotation(2.53F, 4.84F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut0Hand3F31 = mut0Hand3F3.addOrReplaceChild("mut0_hand3_f3_1",
                CubeListBuilder.create()
                        .texOffs(151, 171).addBox(-0.7568F, 0.0F, -0.7568F, 1.5136F, 3.2643F, 1.5136F),
                PartPose.offsetAndRotation(0.0F, 3.52F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand3F32 = mut0Hand3F31.addOrReplaceChild("mut0_hand3_f3_2",
                CubeListBuilder.create()
                        .texOffs(10, 204).addBox(-0.6508F, 0.0F, -0.6508F, 1.3017F, 3.0272F, 1.3017F),
                PartPose.offsetAndRotation(0.0F, 3.2643F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand3Thumb = mut0Hand3Hand.addOrReplaceChild("mut0_hand3_thumb",
                CubeListBuilder.create()
                        .texOffs(160, 171).addBox(-0.99F, 0.0F, -0.99F, 1.98F, 3.3F, 1.98F),
                PartPose.offsetAndRotation(-3.08F, 2.2F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut0Hand3Thumb1 = mut0Hand3Thumb.addOrReplaceChild("mut0_hand3_thumb_1",
                CubeListBuilder.create()
                        .texOffs(169, 171).addBox(-0.8415F, 0.0F, -0.8415F, 1.683F, 3.0424F, 1.683F),
                PartPose.offsetAndRotation(0.0F, 3.3F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition wring3 = mut0Hand3Fore.addOrReplaceChild("wring3",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 11.88F, 0.0F));
        PartDefinition wring3S0 = wring3.addOrReplaceChild("wring3_s0",
                CubeListBuilder.create()
                        .texOffs(35, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offset(0.0F, 0.0F, 2.6F));
        PartDefinition wring3S1 = wring3.addOrReplaceChild("wring3_s1",
                CubeListBuilder.create()
                        .texOffs(42, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(1.5282F, 0.0F, 2.1034F, 0.0F, -0.6283F, 0.0F));
        PartDefinition wring3S2 = wring3.addOrReplaceChild("wring3_s2",
                CubeListBuilder.create()
                        .texOffs(49, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(2.4727F, 0.0F, 0.8034F, 0.0F, -1.2566F, 0.0F));
        PartDefinition wring3S3 = wring3.addOrReplaceChild("wring3_s3",
                CubeListBuilder.create()
                        .texOffs(56, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(2.4727F, 0.0F, -0.8034F, 0.0F, -1.885F, 0.0F));
        PartDefinition wring3S4 = wring3.addOrReplaceChild("wring3_s4",
                CubeListBuilder.create()
                        .texOffs(63, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(1.5282F, 0.0F, -2.1034F, 0.0F, -2.5133F, 0.0F));
        PartDefinition wring3S5 = wring3.addOrReplaceChild("wring3_s5",
                CubeListBuilder.create()
                        .texOffs(70, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -2.6F, 0.0F, -3.1416F, 0.0F));
        PartDefinition wring3S6 = wring3.addOrReplaceChild("wring3_s6",
                CubeListBuilder.create()
                        .texOffs(77, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-1.5282F, 0.0F, -2.1034F, 0.0F, -3.7699F, 0.0F));
        PartDefinition wring3S7 = wring3.addOrReplaceChild("wring3_s7",
                CubeListBuilder.create()
                        .texOffs(84, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-2.4727F, 0.0F, -0.8034F, 0.0F, -4.3982F, 0.0F));
        PartDefinition wring3S8 = wring3.addOrReplaceChild("wring3_s8",
                CubeListBuilder.create()
                        .texOffs(91, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-2.4727F, 0.0F, 0.8034F, 0.0F, -5.0265F, 0.0F));
        PartDefinition wring3S9 = wring3.addOrReplaceChild("wring3_s9",
                CubeListBuilder.create()
                        .texOffs(98, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-1.5282F, 0.0F, 2.1034F, 0.0F, -5.6549F, 0.0F));
        PartDefinition float4 = root.addOrReplaceChild("float4",
                CubeListBuilder.create(),
                PartPose.offsetAndRotation(-26.0F, 6.0F, 6.0F, 0.0F, 0.3142F, -0.1396F));
        PartDefinition shring4 = float4.addOrReplaceChild("shring4",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition shring4S0 = shring4.addOrReplaceChild("shring4_s0",
                CubeListBuilder.create()
                        .texOffs(225, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offset(0.0F, 0.0F, 5.0F));
        PartDefinition shring4S1 = shring4.addOrReplaceChild("shring4_s1",
                CubeListBuilder.create()
                        .texOffs(234, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(2.5F, 0.0F, 4.3301F, 0.0F, -0.5236F, 0.0F));
        PartDefinition shring4S2 = shring4.addOrReplaceChild("shring4_s2",
                CubeListBuilder.create()
                        .texOffs(243, 215).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(4.3301F, 0.0F, 2.5F, 0.0F, -1.0472F, 0.0F));
        PartDefinition shring4S3 = shring4.addOrReplaceChild("shring4_s3",
                CubeListBuilder.create()
                        .texOffs(0, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(5.0F, 0.0F, 0.0F, 0.0F, -1.5708F, 0.0F));
        PartDefinition shring4S4 = shring4.addOrReplaceChild("shring4_s4",
                CubeListBuilder.create()
                        .texOffs(9, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(4.3301F, 0.0F, -2.5F, 0.0F, -2.0944F, 0.0F));
        PartDefinition shring4S5 = shring4.addOrReplaceChild("shring4_s5",
                CubeListBuilder.create()
                        .texOffs(18, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(2.5F, 0.0F, -4.3301F, 0.0F, -2.618F, 0.0F));
        PartDefinition shring4S6 = shring4.addOrReplaceChild("shring4_s6",
                CubeListBuilder.create()
                        .texOffs(27, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -5.0F, 0.0F, -3.1416F, 0.0F));
        PartDefinition shring4S7 = shring4.addOrReplaceChild("shring4_s7",
                CubeListBuilder.create()
                        .texOffs(36, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-2.5F, 0.0F, -4.3301F, 0.0F, -3.6652F, 0.0F));
        PartDefinition shring4S8 = shring4.addOrReplaceChild("shring4_s8",
                CubeListBuilder.create()
                        .texOffs(45, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-4.3301F, 0.0F, -2.5F, 0.0F, -4.1888F, 0.0F));
        PartDefinition shring4S9 = shring4.addOrReplaceChild("shring4_s9",
                CubeListBuilder.create()
                        .texOffs(54, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-5.0F, 0.0F, -0.0F, 0.0F, -4.7124F, 0.0F));
        PartDefinition shring4S10 = shring4.addOrReplaceChild("shring4_s10",
                CubeListBuilder.create()
                        .texOffs(63, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-4.3301F, 0.0F, 2.5F, 0.0F, -5.236F, 0.0F));
        PartDefinition shring4S11 = shring4.addOrReplaceChild("shring4_s11",
                CubeListBuilder.create()
                        .texOffs(72, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-2.5F, 0.0F, 4.3301F, 0.0F, -5.7596F, 0.0F));
        PartDefinition mut0Hand4 = float4.addOrReplaceChild("mut0_hand4",
                CubeListBuilder.create()
                        .texOffs(109, 105).addBox(-2.28F, 0.0F, -2.28F, 4.56F, 11.4F, 4.56F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.1396F, 0.0F, -0.5934F));
        PartDefinition mut0Hand4Fore = mut0Hand4.addOrReplaceChild("mut0_hand4_fore",
                CubeListBuilder.create()
                        .texOffs(213, 105).addBox(-1.9F, 0.0F, -1.9F, 3.8F, 11.4F, 3.8F),
                PartPose.offsetAndRotation(0.0F, 11.4F, 0.0F, -1.0821F, 0.0F, 0.3142F));
        PartDefinition mut0Hand4Hand = mut0Hand4Fore.addOrReplaceChild("mut0_hand4_hand",
                CubeListBuilder.create()
                        .texOffs(17, 149).addBox(-2.66F, 0.0F, -1.71F, 5.32F, 4.18F, 3.42F),
                PartPose.offsetAndRotation(0.0F, 11.4F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut0Hand4F0 = mut0Hand4Hand.addOrReplaceChild("mut0_hand4_f0",
                CubeListBuilder.create()
                        .texOffs(178, 171).addBox(-0.76F, 0.0F, -0.76F, 1.52F, 3.04F, 1.52F),
                PartPose.offsetAndRotation(-2.09F, 4.18F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut0Hand4F01 = mut0Hand4F0.addOrReplaceChild("mut0_hand4_f0_1",
                CubeListBuilder.create()
                        .texOffs(15, 204).addBox(-0.6536F, 0.0F, -0.6536F, 1.3072F, 2.8192F, 1.3072F),
                PartPose.offsetAndRotation(0.0F, 3.04F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand4F02 = mut0Hand4F01.addOrReplaceChild("mut0_hand4_f0_2",
                CubeListBuilder.create()
                        .texOffs(20, 204).addBox(-0.5621F, 0.0F, -0.5621F, 1.1242F, 2.6144F, 1.1242F),
                PartPose.offsetAndRotation(0.0F, 2.8192F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand4F1 = mut0Hand4Hand.addOrReplaceChild("mut0_hand4_f1",
                CubeListBuilder.create()
                        .texOffs(187, 171).addBox(-0.76F, 0.0F, -0.76F, 1.52F, 3.04F, 1.52F),
                PartPose.offsetAndRotation(-0.665F, 4.18F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut0Hand4F11 = mut0Hand4F1.addOrReplaceChild("mut0_hand4_f1_1",
                CubeListBuilder.create()
                        .texOffs(25, 204).addBox(-0.6536F, 0.0F, -0.6536F, 1.3072F, 2.8192F, 1.3072F),
                PartPose.offsetAndRotation(0.0F, 3.04F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand4F12 = mut0Hand4F11.addOrReplaceChild("mut0_hand4_f1_2",
                CubeListBuilder.create()
                        .texOffs(30, 204).addBox(-0.5621F, 0.0F, -0.5621F, 1.1242F, 2.6144F, 1.1242F),
                PartPose.offsetAndRotation(0.0F, 2.8192F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand4F2 = mut0Hand4Hand.addOrReplaceChild("mut0_hand4_f2",
                CubeListBuilder.create()
                        .texOffs(196, 171).addBox(-0.76F, 0.0F, -0.76F, 1.52F, 3.04F, 1.52F),
                PartPose.offsetAndRotation(0.76F, 4.18F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut0Hand4F21 = mut0Hand4F2.addOrReplaceChild("mut0_hand4_f2_1",
                CubeListBuilder.create()
                        .texOffs(35, 204).addBox(-0.6536F, 0.0F, -0.6536F, 1.3072F, 2.8192F, 1.3072F),
                PartPose.offsetAndRotation(0.0F, 3.04F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand4F22 = mut0Hand4F21.addOrReplaceChild("mut0_hand4_f2_2",
                CubeListBuilder.create()
                        .texOffs(40, 204).addBox(-0.5621F, 0.0F, -0.5621F, 1.1242F, 2.6144F, 1.1242F),
                PartPose.offsetAndRotation(0.0F, 2.8192F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand4F3 = mut0Hand4Hand.addOrReplaceChild("mut0_hand4_f3",
                CubeListBuilder.create()
                        .texOffs(205, 171).addBox(-0.76F, 0.0F, -0.76F, 1.52F, 3.04F, 1.52F),
                PartPose.offsetAndRotation(2.185F, 4.18F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut0Hand4F31 = mut0Hand4F3.addOrReplaceChild("mut0_hand4_f3_1",
                CubeListBuilder.create()
                        .texOffs(45, 204).addBox(-0.6536F, 0.0F, -0.6536F, 1.3072F, 2.8192F, 1.3072F),
                PartPose.offsetAndRotation(0.0F, 3.04F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand4F32 = mut0Hand4F31.addOrReplaceChild("mut0_hand4_f3_2",
                CubeListBuilder.create()
                        .texOffs(50, 204).addBox(-0.5621F, 0.0F, -0.5621F, 1.1242F, 2.6144F, 1.1242F),
                PartPose.offsetAndRotation(0.0F, 2.8192F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand4Thumb = mut0Hand4Hand.addOrReplaceChild("mut0_hand4_thumb",
                CubeListBuilder.create()
                        .texOffs(214, 171).addBox(-0.855F, 0.0F, -0.855F, 1.71F, 2.85F, 1.71F),
                PartPose.offsetAndRotation(-2.66F, 1.9F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut0Hand4Thumb1 = mut0Hand4Thumb.addOrReplaceChild("mut0_hand4_thumb_1",
                CubeListBuilder.create()
                        .texOffs(55, 204).addBox(-0.7268F, 0.0F, -0.7268F, 1.4535F, 2.6276F, 1.4535F),
                PartPose.offsetAndRotation(0.0F, 2.85F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition wring4 = mut0Hand4Fore.addOrReplaceChild("wring4",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 10.26F, 0.0F));
        PartDefinition wring4S0 = wring4.addOrReplaceChild("wring4_s0",
                CubeListBuilder.create()
                        .texOffs(105, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offset(0.0F, 0.0F, 2.6F));
        PartDefinition wring4S1 = wring4.addOrReplaceChild("wring4_s1",
                CubeListBuilder.create()
                        .texOffs(112, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(1.5282F, 0.0F, 2.1034F, 0.0F, -0.6283F, 0.0F));
        PartDefinition wring4S2 = wring4.addOrReplaceChild("wring4_s2",
                CubeListBuilder.create()
                        .texOffs(119, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(2.4727F, 0.0F, 0.8034F, 0.0F, -1.2566F, 0.0F));
        PartDefinition wring4S3 = wring4.addOrReplaceChild("wring4_s3",
                CubeListBuilder.create()
                        .texOffs(126, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(2.4727F, 0.0F, -0.8034F, 0.0F, -1.885F, 0.0F));
        PartDefinition wring4S4 = wring4.addOrReplaceChild("wring4_s4",
                CubeListBuilder.create()
                        .texOffs(133, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(1.5282F, 0.0F, -2.1034F, 0.0F, -2.5133F, 0.0F));
        PartDefinition wring4S5 = wring4.addOrReplaceChild("wring4_s5",
                CubeListBuilder.create()
                        .texOffs(140, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -2.6F, 0.0F, -3.1416F, 0.0F));
        PartDefinition wring4S6 = wring4.addOrReplaceChild("wring4_s6",
                CubeListBuilder.create()
                        .texOffs(147, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-1.5282F, 0.0F, -2.1034F, 0.0F, -3.7699F, 0.0F));
        PartDefinition wring4S7 = wring4.addOrReplaceChild("wring4_s7",
                CubeListBuilder.create()
                        .texOffs(154, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-2.4727F, 0.0F, -0.8034F, 0.0F, -4.3982F, 0.0F));
        PartDefinition wring4S8 = wring4.addOrReplaceChild("wring4_s8",
                CubeListBuilder.create()
                        .texOffs(161, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-2.4727F, 0.0F, 0.8034F, 0.0F, -5.0265F, 0.0F));
        PartDefinition wring4S9 = wring4.addOrReplaceChild("wring4_s9",
                CubeListBuilder.create()
                        .texOffs(168, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-1.5282F, 0.0F, 2.1034F, 0.0F, -5.6549F, 0.0F));
        PartDefinition float5 = root.addOrReplaceChild("float5",
                CubeListBuilder.create(),
                PartPose.offsetAndRotation(26.0F, 6.0F, 6.0F, 0.0F, -0.3142F, 0.1396F));
        PartDefinition shring5 = float5.addOrReplaceChild("shring5",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, -2.0F, 0.0F));
        PartDefinition shring5S0 = shring5.addOrReplaceChild("shring5_s0",
                CubeListBuilder.create()
                        .texOffs(81, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offset(0.0F, 0.0F, 5.0F));
        PartDefinition shring5S1 = shring5.addOrReplaceChild("shring5_s1",
                CubeListBuilder.create()
                        .texOffs(90, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(2.5F, 0.0F, 4.3301F, 0.0F, -0.5236F, 0.0F));
        PartDefinition shring5S2 = shring5.addOrReplaceChild("shring5_s2",
                CubeListBuilder.create()
                        .texOffs(99, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(4.3301F, 0.0F, 2.5F, 0.0F, -1.0472F, 0.0F));
        PartDefinition shring5S3 = shring5.addOrReplaceChild("shring5_s3",
                CubeListBuilder.create()
                        .texOffs(108, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(5.0F, 0.0F, 0.0F, 0.0F, -1.5708F, 0.0F));
        PartDefinition shring5S4 = shring5.addOrReplaceChild("shring5_s4",
                CubeListBuilder.create()
                        .texOffs(117, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(4.3301F, 0.0F, -2.5F, 0.0F, -2.0944F, 0.0F));
        PartDefinition shring5S5 = shring5.addOrReplaceChild("shring5_s5",
                CubeListBuilder.create()
                        .texOffs(126, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(2.5F, 0.0F, -4.3301F, 0.0F, -2.618F, 0.0F));
        PartDefinition shring5S6 = shring5.addOrReplaceChild("shring5_s6",
                CubeListBuilder.create()
                        .texOffs(135, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -5.0F, 0.0F, -3.1416F, 0.0F));
        PartDefinition shring5S7 = shring5.addOrReplaceChild("shring5_s7",
                CubeListBuilder.create()
                        .texOffs(144, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-2.5F, 0.0F, -4.3301F, 0.0F, -3.6652F, 0.0F));
        PartDefinition shring5S8 = shring5.addOrReplaceChild("shring5_s8",
                CubeListBuilder.create()
                        .texOffs(153, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-4.3301F, 0.0F, -2.5F, 0.0F, -4.1888F, 0.0F));
        PartDefinition shring5S9 = shring5.addOrReplaceChild("shring5_s9",
                CubeListBuilder.create()
                        .texOffs(162, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-5.0F, 0.0F, -0.0F, 0.0F, -4.7124F, 0.0F));
        PartDefinition shring5S10 = shring5.addOrReplaceChild("shring5_s10",
                CubeListBuilder.create()
                        .texOffs(171, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-4.3301F, 0.0F, 2.5F, 0.0F, -5.236F, 0.0F));
        PartDefinition shring5S11 = shring5.addOrReplaceChild("shring5_s11",
                CubeListBuilder.create()
                        .texOffs(180, 218).addBox(-1.5941F, -0.7F, -0.7F, 3.1882F, 1.4F, 1.4F),
                PartPose.offsetAndRotation(-2.5F, 0.0F, 4.3301F, 0.0F, -5.7596F, 0.0F));
        PartDefinition mut0Hand5 = float5.addOrReplaceChild("mut0_hand5",
                CubeListBuilder.create()
                        .texOffs(130, 105).addBox(-2.28F, 0.0F, -2.28F, 4.56F, 11.4F, 4.56F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.1396F, 0.0F, 0.5934F));
        PartDefinition mut0Hand5Fore = mut0Hand5.addOrReplaceChild("mut0_hand5_fore",
                CubeListBuilder.create()
                        .texOffs(230, 105).addBox(-1.9F, 0.0F, -1.9F, 3.8F, 11.4F, 3.8F),
                PartPose.offsetAndRotation(0.0F, 11.4F, 0.0F, -1.0821F, 0.0F, -0.3142F));
        PartDefinition mut0Hand5Hand = mut0Hand5Fore.addOrReplaceChild("mut0_hand5_hand",
                CubeListBuilder.create()
                        .texOffs(34, 149).addBox(-2.66F, 0.0F, -1.71F, 5.32F, 4.18F, 3.42F),
                PartPose.offsetAndRotation(0.0F, 11.4F, 0.0F, -0.2443F, 0.0F, 0.0F));
        PartDefinition mut0Hand5F0 = mut0Hand5Hand.addOrReplaceChild("mut0_hand5_f0",
                CubeListBuilder.create()
                        .texOffs(223, 171).addBox(-0.76F, 0.0F, -0.76F, 1.52F, 3.04F, 1.52F),
                PartPose.offsetAndRotation(-2.09F, 4.18F, 0.0F, 0.1047F, 0.0F, -0.1833F));
        PartDefinition mut0Hand5F01 = mut0Hand5F0.addOrReplaceChild("mut0_hand5_f0_1",
                CubeListBuilder.create()
                        .texOffs(60, 204).addBox(-0.6536F, 0.0F, -0.6536F, 1.3072F, 2.8192F, 1.3072F),
                PartPose.offsetAndRotation(0.0F, 3.04F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand5F02 = mut0Hand5F01.addOrReplaceChild("mut0_hand5_f0_2",
                CubeListBuilder.create()
                        .texOffs(65, 204).addBox(-0.5621F, 0.0F, -0.5621F, 1.1242F, 2.6144F, 1.1242F),
                PartPose.offsetAndRotation(0.0F, 2.8192F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand5F1 = mut0Hand5Hand.addOrReplaceChild("mut0_hand5_f1",
                CubeListBuilder.create()
                        .texOffs(232, 171).addBox(-0.76F, 0.0F, -0.76F, 1.52F, 3.04F, 1.52F),
                PartPose.offsetAndRotation(-0.665F, 4.18F, 0.0F, 0.1047F, 0.0F, -0.0611F));
        PartDefinition mut0Hand5F11 = mut0Hand5F1.addOrReplaceChild("mut0_hand5_f1_1",
                CubeListBuilder.create()
                        .texOffs(70, 204).addBox(-0.6536F, 0.0F, -0.6536F, 1.3072F, 2.8192F, 1.3072F),
                PartPose.offsetAndRotation(0.0F, 3.04F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand5F12 = mut0Hand5F11.addOrReplaceChild("mut0_hand5_f1_2",
                CubeListBuilder.create()
                        .texOffs(75, 204).addBox(-0.5621F, 0.0F, -0.5621F, 1.1242F, 2.6144F, 1.1242F),
                PartPose.offsetAndRotation(0.0F, 2.8192F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand5F2 = mut0Hand5Hand.addOrReplaceChild("mut0_hand5_f2",
                CubeListBuilder.create()
                        .texOffs(241, 171).addBox(-0.76F, 0.0F, -0.76F, 1.52F, 3.04F, 1.52F),
                PartPose.offsetAndRotation(0.76F, 4.18F, 0.0F, 0.1047F, 0.0F, 0.0611F));
        PartDefinition mut0Hand5F21 = mut0Hand5F2.addOrReplaceChild("mut0_hand5_f2_1",
                CubeListBuilder.create()
                        .texOffs(80, 204).addBox(-0.6536F, 0.0F, -0.6536F, 1.3072F, 2.8192F, 1.3072F),
                PartPose.offsetAndRotation(0.0F, 3.04F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand5F22 = mut0Hand5F21.addOrReplaceChild("mut0_hand5_f2_2",
                CubeListBuilder.create()
                        .texOffs(85, 204).addBox(-0.5621F, 0.0F, -0.5621F, 1.1242F, 2.6144F, 1.1242F),
                PartPose.offsetAndRotation(0.0F, 2.8192F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand5F3 = mut0Hand5Hand.addOrReplaceChild("mut0_hand5_f3",
                CubeListBuilder.create()
                        .texOffs(0, 178).addBox(-0.76F, 0.0F, -0.76F, 1.52F, 3.04F, 1.52F),
                PartPose.offsetAndRotation(2.185F, 4.18F, 0.0F, 0.1047F, 0.0F, 0.1833F));
        PartDefinition mut0Hand5F31 = mut0Hand5F3.addOrReplaceChild("mut0_hand5_f3_1",
                CubeListBuilder.create()
                        .texOffs(90, 204).addBox(-0.6536F, 0.0F, -0.6536F, 1.3072F, 2.8192F, 1.3072F),
                PartPose.offsetAndRotation(0.0F, 3.04F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand5F32 = mut0Hand5F31.addOrReplaceChild("mut0_hand5_f3_2",
                CubeListBuilder.create()
                        .texOffs(95, 204).addBox(-0.5621F, 0.0F, -0.5621F, 1.1242F, 2.6144F, 1.1242F),
                PartPose.offsetAndRotation(0.0F, 2.8192F, 0.0F, 0.384F, 0.0F, 0.0F));
        PartDefinition mut0Hand5Thumb = mut0Hand5Hand.addOrReplaceChild("mut0_hand5_thumb",
                CubeListBuilder.create()
                        .texOffs(9, 178).addBox(-0.855F, 0.0F, -0.855F, 1.71F, 2.85F, 1.71F),
                PartPose.offsetAndRotation(-2.66F, 1.9F, 0.0F, 0.0F, 0.0F, -1.2217F));
        PartDefinition mut0Hand5Thumb1 = mut0Hand5Thumb.addOrReplaceChild("mut0_hand5_thumb_1",
                CubeListBuilder.create()
                        .texOffs(100, 204).addBox(-0.7268F, 0.0F, -0.7268F, 1.4535F, 2.6276F, 1.4535F),
                PartPose.offsetAndRotation(0.0F, 2.85F, 0.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition wring5 = mut0Hand5Fore.addOrReplaceChild("wring5",
                CubeListBuilder.create(),
                PartPose.offset(0.0F, 10.26F, 0.0F));
        PartDefinition wring5S0 = wring5.addOrReplaceChild("wring5_s0",
                CubeListBuilder.create()
                        .texOffs(175, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offset(0.0F, 0.0F, 2.6F));
        PartDefinition wring5S1 = wring5.addOrReplaceChild("wring5_s1",
                CubeListBuilder.create()
                        .texOffs(182, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(1.5282F, 0.0F, 2.1034F, 0.0F, -0.6283F, 0.0F));
        PartDefinition wring5S2 = wring5.addOrReplaceChild("wring5_s2",
                CubeListBuilder.create()
                        .texOffs(189, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(2.4727F, 0.0F, 0.8034F, 0.0F, -1.2566F, 0.0F));
        PartDefinition wring5S3 = wring5.addOrReplaceChild("wring5_s3",
                CubeListBuilder.create()
                        .texOffs(196, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(2.4727F, 0.0F, -0.8034F, 0.0F, -1.885F, 0.0F));
        PartDefinition wring5S4 = wring5.addOrReplaceChild("wring5_s4",
                CubeListBuilder.create()
                        .texOffs(203, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(1.5282F, 0.0F, -2.1034F, 0.0F, -2.5133F, 0.0F));
        PartDefinition wring5S5 = wring5.addOrReplaceChild("wring5_s5",
                CubeListBuilder.create()
                        .texOffs(210, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -2.6F, 0.0F, -3.1416F, 0.0F));
        PartDefinition wring5S6 = wring5.addOrReplaceChild("wring5_s6",
                CubeListBuilder.create()
                        .texOffs(217, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-1.5282F, 0.0F, -2.1034F, 0.0F, -3.7699F, 0.0F));
        PartDefinition wring5S7 = wring5.addOrReplaceChild("wring5_s7",
                CubeListBuilder.create()
                        .texOffs(224, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-2.4727F, 0.0F, -0.8034F, 0.0F, -4.3982F, 0.0F));
        PartDefinition wring5S8 = wring5.addOrReplaceChild("wring5_s8",
                CubeListBuilder.create()
                        .texOffs(231, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-2.4727F, 0.0F, 0.8034F, 0.0F, -5.0265F, 0.0F));
        PartDefinition wring5S9 = wring5.addOrReplaceChild("wring5_s9",
                CubeListBuilder.create()
                        .texOffs(238, 224).addBox(-1.1034F, -0.5F, -0.5F, 2.2069F, 1.0F, 1.0F),
                PartPose.offsetAndRotation(-1.5282F, 0.0F, 2.1034F, 0.0F, -5.6549F, 0.0F));
        PartDefinition halo0 = root.addOrReplaceChild("halo0",
                CubeListBuilder.create(),
                PartPose.offsetAndRotation(0.0F, -16.0F, 0.0F, 1.0821F, 0.0F, -0.4538F));
        PartDefinition halo0S0 = halo0.addOrReplaceChild("halo0_s0",
                CubeListBuilder.create()
                        .texOffs(195, 149).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offset(0.0F, 0.0F, 26.0F));
        PartDefinition halo0S1 = halo0.addOrReplaceChild("halo0_s1",
                CubeListBuilder.create()
                        .texOffs(218, 149).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(7.325F, 0.0F, 24.9468F, 0.0F, -0.2856F, 0.0F));
        PartDefinition halo0S2 = halo0.addOrReplaceChild("halo0_s2",
                CubeListBuilder.create()
                        .texOffs(0, 157).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(14.0567F, 0.0F, 21.8726F, 0.0F, -0.5712F, 0.0F));
        PartDefinition halo0S3 = halo0.addOrReplaceChild("halo0_s3",
                CubeListBuilder.create()
                        .texOffs(23, 157).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(19.6495F, 0.0F, 17.0264F, 0.0F, -0.8568F, 0.0F));
        PartDefinition halo0S4 = halo0.addOrReplaceChild("halo0_s4",
                CubeListBuilder.create()
                        .texOffs(46, 157).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(23.6504F, 0.0F, 10.8008F, 0.0F, -1.1424F, 0.0F));
        PartDefinition halo0S5 = halo0.addOrReplaceChild("halo0_s5",
                CubeListBuilder.create()
                        .texOffs(69, 157).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(25.7354F, 0.0F, 3.7002F, 0.0F, -1.428F, 0.0F));
        PartDefinition halo0S6 = halo0.addOrReplaceChild("halo0_s6",
                CubeListBuilder.create()
                        .texOffs(92, 157).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(25.7354F, 0.0F, -3.7002F, 0.0F, -1.7136F, 0.0F));
        PartDefinition halo0S7 = halo0.addOrReplaceChild("halo0_s7",
                CubeListBuilder.create()
                        .texOffs(115, 157).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(23.6504F, 0.0F, -10.8008F, 0.0F, -1.9992F, 0.0F));
        PartDefinition halo0S8 = halo0.addOrReplaceChild("halo0_s8",
                CubeListBuilder.create()
                        .texOffs(138, 157).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(19.6495F, 0.0F, -17.0264F, 0.0F, -2.2848F, 0.0F));
        PartDefinition halo0S9 = halo0.addOrReplaceChild("halo0_s9",
                CubeListBuilder.create()
                        .texOffs(161, 157).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(14.0567F, 0.0F, -21.8726F, 0.0F, -2.5704F, 0.0F));
        PartDefinition halo0S10 = halo0.addOrReplaceChild("halo0_s10",
                CubeListBuilder.create()
                        .texOffs(184, 157).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(7.325F, 0.0F, -24.9468F, 0.0F, -2.856F, 0.0F));
        PartDefinition halo0S11 = halo0.addOrReplaceChild("halo0_s11",
                CubeListBuilder.create()
                        .texOffs(207, 157).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -26.0F, 0.0F, -3.1416F, 0.0F));
        PartDefinition halo0S12 = halo0.addOrReplaceChild("halo0_s12",
                CubeListBuilder.create()
                        .texOffs(230, 157).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(-7.325F, 0.0F, -24.9468F, 0.0F, -3.4272F, 0.0F));
        PartDefinition halo0S13 = halo0.addOrReplaceChild("halo0_s13",
                CubeListBuilder.create()
                        .texOffs(0, 164).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(-14.0567F, 0.0F, -21.8726F, 0.0F, -3.7128F, 0.0F));
        PartDefinition halo0S14 = halo0.addOrReplaceChild("halo0_s14",
                CubeListBuilder.create()
                        .texOffs(23, 164).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(-19.6495F, 0.0F, -17.0264F, 0.0F, -3.9984F, 0.0F));
        PartDefinition halo0S15 = halo0.addOrReplaceChild("halo0_s15",
                CubeListBuilder.create()
                        .texOffs(46, 164).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(-23.6504F, 0.0F, -10.8008F, 0.0F, -4.284F, 0.0F));
        PartDefinition halo0S16 = halo0.addOrReplaceChild("halo0_s16",
                CubeListBuilder.create()
                        .texOffs(69, 164).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(-25.7354F, 0.0F, -3.7002F, 0.0F, -4.5696F, 0.0F));
        PartDefinition halo0S17 = halo0.addOrReplaceChild("halo0_s17",
                CubeListBuilder.create()
                        .texOffs(92, 164).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(-25.7354F, 0.0F, 3.7002F, 0.0F, -4.8552F, 0.0F));
        PartDefinition halo0S18 = halo0.addOrReplaceChild("halo0_s18",
                CubeListBuilder.create()
                        .texOffs(115, 164).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(-23.6504F, 0.0F, 10.8008F, 0.0F, -5.1408F, 0.0F));
        PartDefinition halo0S19 = halo0.addOrReplaceChild("halo0_s19",
                CubeListBuilder.create()
                        .texOffs(138, 164).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(-19.6495F, 0.0F, 17.0264F, 0.0F, -5.4264F, 0.0F));
        PartDefinition halo0S20 = halo0.addOrReplaceChild("halo0_s20",
                CubeListBuilder.create()
                        .texOffs(161, 164).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(-14.0567F, 0.0F, 21.8726F, 0.0F, -5.712F, 0.0F));
        PartDefinition halo0S21 = halo0.addOrReplaceChild("halo0_s21",
                CubeListBuilder.create()
                        .texOffs(184, 164).addBox(-4.0002F, -1.3F, -1.3F, 8.0004F, 2.6F, 2.6F),
                PartPose.offsetAndRotation(-7.325F, 0.0F, 24.9468F, 0.0F, -5.9976F, 0.0F));
        PartDefinition halo1 = root.addOrReplaceChild("halo1",
                CubeListBuilder.create(),
                PartPose.offsetAndRotation(0.0F, -16.0F, 0.0F, -1.2915F, 0.0F, 0.4538F));
        PartDefinition halo1S0 = halo1.addOrReplaceChild("halo1_s0",
                CubeListBuilder.create()
                        .texOffs(53, 178).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 0.0F, 33.0F));
        PartDefinition halo1S1 = halo1.addOrReplaceChild("halo1_s1",
                CubeListBuilder.create()
                        .texOffs(76, 178).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(7.8974F, 0.0F, 32.0411F, 0.0F, -0.2417F, 0.0F));
        PartDefinition halo1S2 = halo1.addOrReplaceChild("halo1_s2",
                CubeListBuilder.create()
                        .texOffs(99, 178).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(15.3359F, 0.0F, 29.22F, 0.0F, -0.4833F, 0.0F));
        PartDefinition halo1S3 = halo1.addOrReplaceChild("halo1_s3",
                CubeListBuilder.create()
                        .texOffs(122, 178).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(21.883F, 0.0F, 24.7009F, 0.0F, -0.725F, 0.0F));
        PartDefinition halo1S4 = halo1.addOrReplaceChild("halo1_s4",
                CubeListBuilder.create()
                        .texOffs(145, 178).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(27.1585F, 0.0F, 18.7461F, 0.0F, -0.9666F, 0.0F));
        PartDefinition halo1S5 = halo1.addOrReplaceChild("halo1_s5",
                CubeListBuilder.create()
                        .texOffs(168, 178).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(30.8555F, 0.0F, 11.702F, 0.0F, -1.2083F, 0.0F));
        PartDefinition halo1S6 = halo1.addOrReplaceChild("halo1_s6",
                CubeListBuilder.create()
                        .texOffs(191, 178).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(32.7594F, 0.0F, 3.9777F, 0.0F, -1.45F, 0.0F));
        PartDefinition halo1S7 = halo1.addOrReplaceChild("halo1_s7",
                CubeListBuilder.create()
                        .texOffs(214, 178).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(32.7594F, 0.0F, -3.9777F, 0.0F, -1.6916F, 0.0F));
        PartDefinition halo1S8 = halo1.addOrReplaceChild("halo1_s8",
                CubeListBuilder.create()
                        .texOffs(0, 184).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(30.8555F, 0.0F, -11.702F, 0.0F, -1.9333F, 0.0F));
        PartDefinition halo1S9 = halo1.addOrReplaceChild("halo1_s9",
                CubeListBuilder.create()
                        .texOffs(23, 184).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(27.1585F, 0.0F, -18.7461F, 0.0F, -2.1749F, 0.0F));
        PartDefinition halo1S10 = halo1.addOrReplaceChild("halo1_s10",
                CubeListBuilder.create()
                        .texOffs(46, 184).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(21.883F, 0.0F, -24.7009F, 0.0F, -2.4166F, 0.0F));
        PartDefinition halo1S11 = halo1.addOrReplaceChild("halo1_s11",
                CubeListBuilder.create()
                        .texOffs(69, 184).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(15.3359F, 0.0F, -29.22F, 0.0F, -2.6583F, 0.0F));
        PartDefinition halo1S12 = halo1.addOrReplaceChild("halo1_s12",
                CubeListBuilder.create()
                        .texOffs(92, 184).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(7.8974F, 0.0F, -32.0411F, 0.0F, -2.8999F, 0.0F));
        PartDefinition halo1S13 = halo1.addOrReplaceChild("halo1_s13",
                CubeListBuilder.create()
                        .texOffs(115, 184).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-0.0F, 0.0F, -33.0F, 0.0F, -3.1416F, 0.0F));
        PartDefinition halo1S14 = halo1.addOrReplaceChild("halo1_s14",
                CubeListBuilder.create()
                        .texOffs(138, 184).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-7.8974F, 0.0F, -32.0411F, 0.0F, -3.3833F, 0.0F));
        PartDefinition halo1S15 = halo1.addOrReplaceChild("halo1_s15",
                CubeListBuilder.create()
                        .texOffs(161, 184).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-15.3359F, 0.0F, -29.22F, 0.0F, -3.6249F, 0.0F));
        PartDefinition halo1S16 = halo1.addOrReplaceChild("halo1_s16",
                CubeListBuilder.create()
                        .texOffs(184, 184).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-21.883F, 0.0F, -24.7009F, 0.0F, -3.8666F, 0.0F));
        PartDefinition halo1S17 = halo1.addOrReplaceChild("halo1_s17",
                CubeListBuilder.create()
                        .texOffs(207, 184).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-27.1585F, 0.0F, -18.7461F, 0.0F, -4.1082F, 0.0F));
        PartDefinition halo1S18 = halo1.addOrReplaceChild("halo1_s18",
                CubeListBuilder.create()
                        .texOffs(230, 184).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-30.8555F, 0.0F, -11.702F, 0.0F, -4.3499F, 0.0F));
        PartDefinition halo1S19 = halo1.addOrReplaceChild("halo1_s19",
                CubeListBuilder.create()
                        .texOffs(0, 189).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-32.7594F, 0.0F, -3.9777F, 0.0F, -4.5916F, 0.0F));
        PartDefinition halo1S20 = halo1.addOrReplaceChild("halo1_s20",
                CubeListBuilder.create()
                        .texOffs(23, 189).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-32.7594F, 0.0F, 3.9777F, 0.0F, -4.8332F, 0.0F));
        PartDefinition halo1S21 = halo1.addOrReplaceChild("halo1_s21",
                CubeListBuilder.create()
                        .texOffs(46, 189).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-30.8555F, 0.0F, 11.702F, 0.0F, -5.0749F, 0.0F));
        PartDefinition halo1S22 = halo1.addOrReplaceChild("halo1_s22",
                CubeListBuilder.create()
                        .texOffs(69, 189).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-27.1585F, 0.0F, 18.7461F, 0.0F, -5.3165F, 0.0F));
        PartDefinition halo1S23 = halo1.addOrReplaceChild("halo1_s23",
                CubeListBuilder.create()
                        .texOffs(92, 189).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-21.883F, 0.0F, 24.7009F, 0.0F, -5.5582F, 0.0F));
        PartDefinition halo1S24 = halo1.addOrReplaceChild("halo1_s24",
                CubeListBuilder.create()
                        .texOffs(115, 189).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-15.3359F, 0.0F, 29.22F, 0.0F, -5.7999F, 0.0F));
        PartDefinition halo1S25 = halo1.addOrReplaceChild("halo1_s25",
                CubeListBuilder.create()
                        .texOffs(138, 189).addBox(-4.2777F, -1.0F, -1.0F, 8.5554F, 2.0F, 2.0F),
                PartPose.offsetAndRotation(-7.8974F, 0.0F, 32.0411F, 0.0F, -6.0415F, 0.0F));

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

        float t = state.ageInTicks;
        boolean dormant = state.dormant;
        float wake = dormant ? 0.0F : 1.0F;

        // Enthroned and asleep: head bowed into the chest, arms drawn in,
        // haloes stalled. Waking lifts all of it at once.
        this.neck.xRot = Mth.lerp(wake, 0.85F, 0.0F);
        this.core.y = Mth.lerp(wake, 4.0F, 0.0F) + Mth.sin(t * 0.04F) * (1.6F * wake);
        this.head.xRot = wake * (state.xRot * Mth.DEG_TO_RAD * 0.5F)
                + Mth.sin(t * 0.05F) * 0.05F * wake;
        this.head.yRot = wake * state.yRot * Mth.DEG_TO_RAD * 0.5F;

        // The jaw never fully closes.
        this.jaw.xRot = 0.28F + Mth.sin(t * 0.11F) * 0.10F * wake;

        // Counter-turning haloes; they spin up when it is enraged.
        float spin = (state.enraged ? 0.055F : 0.018F) * wake;
        this.halos[0].yRot = t * spin;
        this.halos[1].yRot = -t * spin * 0.7F;
        this.halos[0].zRot = 0.45F + Mth.sin(t * 0.03F) * 0.06F;
        this.halos[1].zRot = -0.45F - Mth.cos(t * 0.026F) * 0.06F;

        // Six unattached arms, each drifting on its own phase so the court of
        // hands never moves as one.
        for (int i = 0; i < this.floats.length; i++) {
            ModelPart hub = this.floats[i];
            float phase = t * 0.06F + i * 1.05F;
            float side = (i % 2 == 0) ? -1.0F : 1.0F;
            hub.y = Mth.sin(phase) * 2.4F * wake + Mth.lerp(wake, 6.0F, 0.0F);
            hub.x = hub.x + 0.0F;
            hub.zRot = side * Mth.lerp(wake, 0.75F, 0.10F)
                    + Mth.cos(phase) * 0.08F * wake;
            hub.yRot = side * -0.31F + Mth.sin(phase * 0.7F) * 0.12F * wake;
            ModelPart hand = this.hands[i];
            hand.xRot = Mth.sin(phase * 1.3F) * 0.14F * wake;
        }

        // The root skirt trails and drags.
        for (int i = 0; i < this.trails.length; i++) {
            float phase = t * 0.045F + i * 0.9F;
            this.trails[i].xRot = Mth.sin(phase) * 0.13F;
            this.trails[i].zRot = Mth.cos(phase * 0.8F) * 0.13F;
        }

        // Decrees and sweeps: every arm reaches at once, which is the only
        // time all six agree on anything.
        if (state.attackTime > 0.0F) {
            float swing = Mth.sin(state.attackTime * Mth.PI);
            for (int i = 0; i < this.floats.length; i++) {
                this.floats[i].xRot = -swing * 0.9F;
                this.hands[i].xRot -= swing * 0.6F;
            }
            this.jaw.xRot += swing * 0.5F;
            this.chest.zRot = Mth.sin(state.attackTime * Mth.PI * 2.0F) * 0.05F;
        } else {
            for (ModelPart hub : this.floats) {
                hub.xRot = 0.0F;
            }
            this.chest.zRot = 0.0F;
        }
    }
}
