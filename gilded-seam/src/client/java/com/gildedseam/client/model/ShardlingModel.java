package com.gildedseam.client.model;

import com.gildedseam.client.anim.ShardlingAnimations;
import com.gildedseam.client.render.state.ShardlingRenderState;
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
 * Shardling: a carapace of canted saucer-fragments on four gilded wire
 * legs. The gait is a fast diagonal-pair skitter with a nervous body
 * tremble; the crest twitches on its own schedule.
 */
public class ShardlingModel extends EntityModel<ShardlingRenderState> {
    private final ModelPart core;
    private final ModelPart crest;
    private final ModelPart crest2;
    private final ModelPart legFr;
    private final ModelPart legFl;
    private final ModelPart legBr;
    private final ModelPart legBl;
    private final ModelPart legMr;
    private final ModelPart legMl;
    private final KeyframeAnimation attackAnimation;

    public ShardlingModel(ModelPart root) {
        super(root);
        this.core = root.getChild("core");
        this.crest = this.core.getChild("crest");
        this.crest2 = this.core.getChild("crest_2");
        this.legFr = root.getChild("leg_fr");
        this.legFl = root.getChild("leg_fl");
        this.legBr = root.getChild("leg_br");
        this.legBl = root.getChild("leg_bl");
        this.legMr = root.getChild("leg_mr");
        this.legMl = root.getChild("leg_ml");
        this.attackAnimation = ShardlingAnimations.ATTACK.bake(root);
    }

    public static LayerDefinition createBodyLayer() {
MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition core = root.addOrReplaceChild("core",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-4.0F, -5.0F, -4.0F, 8.0F, 5.0F, 8.0F),
                PartPose.offset(0.0F, 19.0F, 0.0F));
        PartDefinition bead = core.addOrReplaceChild("bead",
                CubeListBuilder.create()
                        .texOffs(50, 14).addBox(-1.0F, -1.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, -2.0F, -4.0F));
        PartDefinition plateN = core.addOrReplaceChild("plate_n",
                CubeListBuilder.create()
                        .texOffs(20, 14).addBox(-3.0F, -4.0F, -1.0F, 6.0F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -5.0F, -4.0F, -0.3491F, 0.0F, 0.0F));
        PartDefinition plateS = core.addOrReplaceChild("plate_s",
                CubeListBuilder.create()
                        .texOffs(35, 14).addBox(-3.0F, -4.0F, 0.0F, 6.0F, 4.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -5.0F, 4.0F, 0.3491F, 0.0F, 0.0F));
        PartDefinition plateE = core.addOrReplaceChild("plate_e",
                CubeListBuilder.create()
                        .texOffs(33, 0).addBox(0.0F, -4.0F, -3.0F, 1.0F, 4.0F, 6.0F),
                PartPose.offsetAndRotation(4.0F, -5.0F, 0.0F, 0.0F, 0.0F, -0.3491F));
        PartDefinition plateW = core.addOrReplaceChild("plate_w",
                CubeListBuilder.create()
                        .texOffs(48, 0).addBox(-1.0F, -4.0F, -3.0F, 1.0F, 4.0F, 6.0F),
                PartPose.offsetAndRotation(-4.0F, -5.0F, 0.0F, 0.0F, 0.0F, 0.3491F));
        PartDefinition crest = core.addOrReplaceChild("crest",
                CubeListBuilder.create()
                        .texOffs(0, 14).addBox(-0.5F, -6.0F, -2.0F, 1.0F, 6.0F, 4.0F),
                PartPose.offsetAndRotation(0.0F, -5.0F, 1.0F, 0.0F, 0.0F, 0.2967F));
        PartDefinition crest2 = core.addOrReplaceChild("crest_2",
                CubeListBuilder.create()
                        .texOffs(11, 14).addBox(-0.5F, -5.0F, -1.5F, 1.0F, 5.0F, 3.0F),
                PartPose.offsetAndRotation(0.0F, -5.0F, 2.5F, 0.0F, 0.0F, -0.384F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(59, 14).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offset(-3.0F, 19.0F, -3.0F));
        PartDefinition legFrLower = legFr.addOrReplaceChild("leg_fr_lower",
                CubeListBuilder.create()
                        .texOffs(25, 25).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offset(0.0F, 3.0F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(0, 25).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offset(3.0F, 19.0F, -3.0F));
        PartDefinition legFlLower = legFl.addOrReplaceChild("leg_fl_lower",
                CubeListBuilder.create()
                        .texOffs(30, 25).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offset(0.0F, 3.0F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(5, 25).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offset(-3.0F, 19.0F, 3.0F));
        PartDefinition legBrLower = legBr.addOrReplaceChild("leg_br_lower",
                CubeListBuilder.create()
                        .texOffs(35, 25).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offset(0.0F, 3.0F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(10, 25).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offset(3.0F, 19.0F, 3.0F));
        PartDefinition legBlLower = legBl.addOrReplaceChild("leg_bl_lower",
                CubeListBuilder.create()
                        .texOffs(40, 25).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offset(0.0F, 3.0F, 0.0F));
        PartDefinition legMr = root.addOrReplaceChild("leg_mr",
                CubeListBuilder.create()
                        .texOffs(15, 25).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offset(-3.8F, 19.0F, 0.0F));
        PartDefinition legMrLower = legMr.addOrReplaceChild("leg_mr_lower",
                CubeListBuilder.create()
                        .texOffs(45, 25).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offset(0.0F, 3.0F, 0.0F));
        PartDefinition legMl = root.addOrReplaceChild("leg_ml",
                CubeListBuilder.create()
                        .texOffs(20, 25).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 3.0F, 1.0F),
                PartPose.offset(3.8F, 19.0F, 0.0F));
        PartDefinition legMlLower = legMl.addOrReplaceChild("leg_ml_lower",
                CubeListBuilder.create()
                        .texOffs(50, 25).addBox(-0.5F, 0.0F, -0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offset(0.0F, 3.0F, 0.0F));

        return LayerDefinition.create(mesh, 64, 64);
    }

    @Override
    public void setupAnim(ShardlingRenderState state) {
        super.setupAnim(state);

        // Mutations: a counter-crest at Stoneware, a third leg pair at Lustre.
        this.crest2.visible = state.tier >= SeamHelper.TIER_STONEWARE;
        this.legMr.visible = state.tier >= SeamHelper.TIER_LUSTRE;
        this.legMl.visible = state.tier >= SeamHelper.TIER_LUSTRE;

        float pos = state.walkAnimationPos;
        float speed = state.walkAnimationSpeed;

        // Diagonal-pair skitter, twice the frequency of a dog's trot.
        float swing = pos * 1.4F;
        this.legFr.xRot = Mth.cos(swing) * 1.1F * speed;
        this.legBl.xRot = Mth.cos(swing) * 1.1F * speed;
        this.legFl.xRot = Mth.cos(swing + Mth.PI) * 1.1F * speed;
        this.legBr.xRot = Mth.cos(swing + Mth.PI) * 1.1F * speed;
        this.legMr.xRot = Mth.cos(swing + Mth.HALF_PI) * 1.1F * speed;
        this.legMl.xRot = Mth.cos(swing + Mth.HALF_PI + Mth.PI) * 1.1F * speed;

        // The carapace never sits quite still.
        float idle = state.ageInTicks;
        this.core.yRot += Mth.sin(idle * 0.13F) * 0.04F;
        this.core.zRot += Mth.cos(idle * 0.21F) * 0.03F + Mth.cos(swing) * 0.08F * speed;
        this.crest.zRot += Mth.sin(idle * 0.31F) * 0.12F;

        this.attackAnimation.apply(state.attackAnimationState, state.ageInTicks);
    }
}
