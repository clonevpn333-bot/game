package com.gildedseam.client.model;

import com.gildedseam.client.anim.PorcelainHoundAnimations;
import com.gildedseam.client.render.state.PorcelainHoundRenderState;

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
 * Porcelain Hound: vase-work greyhound. Long low lope with plenty of
 * spine, jaw slightly loose at speed, tail-tip tracing circles.
 */
public class PorcelainHoundModel extends EntityModel<PorcelainHoundRenderState> {
    private final ModelPart body;
    private final ModelPart neck;
    private final ModelPart head;
    private final ModelPart jaw;
    private final ModelPart tail;
    private final ModelPart tailTip;
    private final ModelPart legFr;
    private final ModelPart legFl;
    private final ModelPart legBr;
    private final ModelPart legBl;
    private final KeyframeAnimation attackAnimation;
    private final KeyframeAnimation howlAnimation;

    public PorcelainHoundModel(ModelPart root) {
        super(root);
        this.body = root.getChild("body");
        this.neck = this.body.getChild("neck");
        this.head = this.neck.getChild("head");
        this.jaw = this.head.getChild("jaw");
        this.tail = this.body.getChild("haunch").getChild("tail");
        this.tailTip = this.tail.getChild("tail_tip");
        this.legFr = root.getChild("leg_fr");
        this.legFl = root.getChild("leg_fl");
        this.legBr = root.getChild("leg_br");
        this.legBl = root.getChild("leg_bl");
        this.attackAnimation = PorcelainHoundAnimations.ATTACK.bake(root);
        this.howlAnimation = PorcelainHoundAnimations.HOWL.bake(root);
    }

    public static LayerDefinition createBodyLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition body = root.addOrReplaceChild("body",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-3.5F, -3.0F, -7.0F, 7.0F, 6.0F, 10.0F),
                PartPose.offset(0.0F, 12.0F, 0.0F));
        PartDefinition haunch = body.addOrReplaceChild("haunch",
                CubeListBuilder.create()
                        .texOffs(35, 0).addBox(-4.0F, -2.5F, 0.0F, 8.0F, 6.0F, 5.0F),
                PartPose.offset(0.0F, -1.0F, 3.0F));
        PartDefinition tail = haunch.addOrReplaceChild("tail",
                CubeListBuilder.create()
                        .texOffs(92, 17).addBox(-1.0F, -1.0F, 0.0F, 2.0F, 2.0F, 4.0F),
                PartPose.offsetAndRotation(0.0F, -1.5F, 5.0F, 0.6109F, 0.0F, 0.0F));
        PartDefinition tailTip = tail.addOrReplaceChild("tail_tip",
                CubeListBuilder.create()
                        .texOffs(13, 27).addBox(-0.5F, -0.5F, 0.0F, 1.0F, 1.0F, 4.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 4.0F, 0.3142F, 0.0F, 0.0F));
        PartDefinition mane = body.addOrReplaceChild("mane",
                CubeListBuilder.create()
                        .texOffs(0, 27).addBox(-2.5F, -4.0F, 0.0F, 5.0F, 4.0F, 1.0F)
                        .texOffs(31, 27).addBox(-1.5F, -6.0F, 0.2F, 3.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, -3.0F, -5.0F, -0.4189F, 0.0F, 0.0F));
        PartDefinition neck = body.addOrReplaceChild("neck",
                CubeListBuilder.create()
                        .texOffs(0, 17).addBox(-2.0F, -2.0F, -4.5F, 4.0F, 4.0F, 5.0F),
                PartPose.offsetAndRotation(0.0F, -1.5F, -6.5F, 0.4887F, 0.0F, 0.0F));
        PartDefinition head = neck.addOrReplaceChild("head",
                CubeListBuilder.create()
                        .texOffs(62, 0).addBox(-2.5F, -2.5F, -4.5F, 5.0F, 5.0F, 5.0F)
                        .texOffs(77, 17).addBox(-1.5F, -0.5F, -8.5F, 3.0F, 2.0F, 4.0F)
                        .texOffs(24, 27).addBox(-0.5F, -5.0F, -2.0F, 1.0F, 3.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -4.0F, -0.4887F, 0.0F, 0.0F));
        PartDefinition jaw = head.addOrReplaceChild("jaw",
                CubeListBuilder.create()
                        .texOffs(105, 17).addBox(-1.5F, 0.0F, -3.8F, 3.0F, 1.0F, 4.0F),
                PartPose.offsetAndRotation(0.0F, 1.5F, -4.5F, 0.1745F, 0.0F, 0.0F));
        PartDefinition legFr = root.addOrReplaceChild("leg_fr",
                CubeListBuilder.create()
                        .texOffs(19, 17).addBox(-1.0F, 0.0F, -1.5F, 2.0F, 6.0F, 3.0F),
                PartPose.offset(-2.5F, 12.0F, -5.0F));
        PartDefinition legFrLower = legFr.addOrReplaceChild("leg_fr_lower",
                CubeListBuilder.create()
                        .texOffs(41, 17).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition legFl = root.addOrReplaceChild("leg_fl",
                CubeListBuilder.create()
                        .texOffs(30, 17).addBox(-1.0F, 0.0F, -1.5F, 2.0F, 6.0F, 3.0F),
                PartPose.offset(2.5F, 12.0F, -5.0F));
        PartDefinition legFlLower = legFl.addOrReplaceChild("leg_fl_lower",
                CubeListBuilder.create()
                        .texOffs(50, 17).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition legBr = root.addOrReplaceChild("leg_br",
                CubeListBuilder.create()
                        .texOffs(83, 0).addBox(-1.5F, 0.0F, -2.0F, 3.0F, 6.0F, 4.0F),
                PartPose.offset(-3.0F, 12.0F, 6.0F));
        PartDefinition legBrLower = legBr.addOrReplaceChild("leg_br_lower",
                CubeListBuilder.create()
                        .texOffs(59, 17).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));
        PartDefinition legBl = root.addOrReplaceChild("leg_bl",
                CubeListBuilder.create()
                        .texOffs(98, 0).addBox(-1.5F, 0.0F, -2.0F, 3.0F, 6.0F, 4.0F),
                PartPose.offset(3.0F, 12.0F, 6.0F));
        PartDefinition legBlLower = legBl.addOrReplaceChild("leg_bl_lower",
                CubeListBuilder.create()
                        .texOffs(68, 17).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offset(0.0F, 6.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    @Override
    public void setupAnim(PorcelainHoundRenderState state) {
        super.setupAnim(state);

        this.head.yRot += state.yRot * Mth.DEG_TO_RAD * 0.7F;
        this.head.xRot += state.xRot * Mth.DEG_TO_RAD * 0.7F;

        float pos = state.walkAnimationPos;
        float speed = state.walkAnimationSpeed;

        // Rotary lope: front pair leads, rear pair follows a quarter late.
        float swing = pos * 0.8F;
        this.legFr.xRot = Mth.cos(swing) * 1.25F * speed;
        this.legFl.xRot = Mth.cos(swing + Mth.PI * 0.9F) * 1.25F * speed;
        this.legBr.xRot = Mth.cos(swing + Mth.PI * 0.5F) * 1.25F * speed;
        this.legBl.xRot = Mth.cos(swing + Mth.PI * 1.4F) * 1.25F * speed;

        // The spine works at speed; the jaw hangs a little loose.
        this.body.xRot += Mth.cos(swing * 2.0F) * 0.06F * speed;
        this.jaw.xRot += 0.10F * speed + Mth.sin(state.ageInTicks * 0.08F) * 0.02F;

        // Tail: lazy circles when idle, streaming flat when running.
        this.tail.xRot += -0.7F * speed;
        this.tailTip.yRot = Mth.sin(state.ageInTicks * 0.17F) * 0.35F * (1.0F - speed);
        this.tailTip.xRot += Mth.cos(state.ageInTicks * 0.13F) * 0.25F * (1.0F - speed);

        this.attackAnimation.apply(state.attackAnimationState, state.ageInTicks);
        this.howlAnimation.apply(state.howlAnimationState, state.ageInTicks);
    }
}
