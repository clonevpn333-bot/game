package com.gildedseam.client.model;

import com.gildedseam.client.anim.ManifoldAnimations;
import com.gildedseam.client.render.state.ManifoldRenderState;

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
 * Manifold: a knot of eleven arms taught to walk. Six radial walker-arms
 * scuttle in rippling sequence — each one a sixth of a cycle behind its
 * neighbour — while the five flails overhead grasp at nothing. When it
 * climbs, the whole knot tips against the wall.
 */
public class ManifoldModel extends EntityModel<ManifoldRenderState> {
    private final ModelPart knot;
    private final ModelPart core;
    private final ModelPart[] walkers = new ModelPart[6];
    private final ModelPart[] walkerMids = new ModelPart[6];
    private final ModelPart[] flails = new ModelPart[5];
    private final KeyframeAnimation attackAnimation;
    private final KeyframeAnimation constrictAnimation;

    public ManifoldModel(ModelPart root) {
        super(root);
        this.knot = root.getChild("knot");
        this.core = this.knot.getChild("core");
        for (int i = 0; i < 6; i++) {
            this.walkers[i] = this.knot.getChild("walker_" + i);
            this.walkerMids[i] = this.walkers[i].getChild("walker_" + i + "_mid");
        }
        for (int i = 0; i < 5; i++) {
            this.flails[i] = this.knot.getChild("flail_" + i);
        }
        this.attackAnimation = ManifoldAnimations.ATTACK.bake(root);
        this.constrictAnimation = ManifoldAnimations.CONSTRICT.bake(root);
    }

    public static LayerDefinition createBodyLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition knot = root.addOrReplaceChild("knot",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-5.0F, -7.0F, -5.0F, 10.0F, 8.0F, 10.0F),
                PartPose.offset(0.0F, 13.0F, 0.0F));
        PartDefinition knot2 = knot.addOrReplaceChild("knot2",
                CubeListBuilder.create()
                        .texOffs(41, 0).addBox(-4.0F, -3.0F, -4.0F, 8.0F, 6.0F, 8.0F),
                PartPose.offsetAndRotation(0.0F, -3.0F, 0.0F, 0.2967F, 0.5934F, 0.192F));
        PartDefinition core = knot.addOrReplaceChild("core",
                CubeListBuilder.create()
                        .texOffs(74, 0).addBox(-2.5F, -2.5F, -2.5F, 5.0F, 5.0F, 5.0F),
                PartPose.offsetAndRotation(0.0F, -2.0F, 0.0F, 0.0F, 0.7854F, 0.0F));
        PartDefinition walker0 = knot.addOrReplaceChild("walker_0",
                CubeListBuilder.create()
                        .texOffs(27, 19).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, 4.5F, 0.6981F, 0.0F, 0.0F));
        PartDefinition walker0Mid = walker0.addOrReplaceChild("walker_0_mid",
                CubeListBuilder.create()
                        .texOffs(95, 0).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -1.3963F, 0.0F, 0.0F));
        PartDefinition walker0Hand = walker0Mid.addOrReplaceChild("walker_0_hand",
                CubeListBuilder.create()
                        .texOffs(45, 29).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F)
                        .texOffs(123, 29).addBox(-1.5F, 2.0F, -1.5F, 1.0F, 2.0F, 1.0F)
                        .texOffs(0, 38).addBox(0.5F, 2.0F, 0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 7.0F, 0.0F, 0.6981F, 0.0F, 0.0F));
        PartDefinition walker1 = knot.addOrReplaceChild("walker_1",
                CubeListBuilder.create()
                        .texOffs(36, 19).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(3.8971F, 0.0F, 2.25F, 0.6981F, 1.0472F, 0.0F));
        PartDefinition walker1Mid = walker1.addOrReplaceChild("walker_1_mid",
                CubeListBuilder.create()
                        .texOffs(104, 0).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -1.3963F, 0.0F, 0.0F));
        PartDefinition walker1Hand = walker1Mid.addOrReplaceChild("walker_1_hand",
                CubeListBuilder.create()
                        .texOffs(58, 29).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F)
                        .texOffs(5, 38).addBox(-1.5F, 2.0F, -1.5F, 1.0F, 2.0F, 1.0F)
                        .texOffs(10, 38).addBox(0.5F, 2.0F, 0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 7.0F, 0.0F, 0.6981F, 0.0F, 0.0F));
        PartDefinition walker2 = knot.addOrReplaceChild("walker_2",
                CubeListBuilder.create()
                        .texOffs(45, 19).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(3.8971F, 0.0F, -2.25F, 0.6981F, 2.0944F, 0.0F));
        PartDefinition walker2Mid = walker2.addOrReplaceChild("walker_2_mid",
                CubeListBuilder.create()
                        .texOffs(113, 0).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -1.3963F, 0.0F, 0.0F));
        PartDefinition walker2Hand = walker2Mid.addOrReplaceChild("walker_2_hand",
                CubeListBuilder.create()
                        .texOffs(71, 29).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F)
                        .texOffs(15, 38).addBox(-1.5F, 2.0F, -1.5F, 1.0F, 2.0F, 1.0F)
                        .texOffs(20, 38).addBox(0.5F, 2.0F, 0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 7.0F, 0.0F, 0.6981F, 0.0F, 0.0F));
        PartDefinition walker3 = knot.addOrReplaceChild("walker_3",
                CubeListBuilder.create()
                        .texOffs(54, 19).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 0.0F, -4.5F, 0.6981F, 3.1416F, 0.0F));
        PartDefinition walker3Mid = walker3.addOrReplaceChild("walker_3_mid",
                CubeListBuilder.create()
                        .texOffs(0, 19).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -1.3963F, 0.0F, 0.0F));
        PartDefinition walker3Hand = walker3Mid.addOrReplaceChild("walker_3_hand",
                CubeListBuilder.create()
                        .texOffs(84, 29).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F)
                        .texOffs(25, 38).addBox(-1.5F, 2.0F, -1.5F, 1.0F, 2.0F, 1.0F)
                        .texOffs(30, 38).addBox(0.5F, 2.0F, 0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 7.0F, 0.0F, 0.6981F, 0.0F, 0.0F));
        PartDefinition walker4 = knot.addOrReplaceChild("walker_4",
                CubeListBuilder.create()
                        .texOffs(63, 19).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(-3.8971F, 0.0F, -2.25F, 0.6981F, 4.1888F, 0.0F));
        PartDefinition walker4Mid = walker4.addOrReplaceChild("walker_4_mid",
                CubeListBuilder.create()
                        .texOffs(9, 19).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -1.3963F, 0.0F, 0.0F));
        PartDefinition walker4Hand = walker4Mid.addOrReplaceChild("walker_4_hand",
                CubeListBuilder.create()
                        .texOffs(97, 29).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F)
                        .texOffs(35, 38).addBox(-1.5F, 2.0F, -1.5F, 1.0F, 2.0F, 1.0F)
                        .texOffs(40, 38).addBox(0.5F, 2.0F, 0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 7.0F, 0.0F, 0.6981F, 0.0F, 0.0F));
        PartDefinition walker5 = knot.addOrReplaceChild("walker_5",
                CubeListBuilder.create()
                        .texOffs(72, 19).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(-3.8971F, 0.0F, 2.25F, 0.6981F, 5.236F, 0.0F));
        PartDefinition walker5Mid = walker5.addOrReplaceChild("walker_5_mid",
                CubeListBuilder.create()
                        .texOffs(18, 19).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 7.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, -1.3963F, 0.0F, 0.0F));
        PartDefinition walker5Hand = walker5Mid.addOrReplaceChild("walker_5_hand",
                CubeListBuilder.create()
                        .texOffs(110, 29).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F)
                        .texOffs(45, 38).addBox(-1.5F, 2.0F, -1.5F, 1.0F, 2.0F, 1.0F)
                        .texOffs(50, 38).addBox(0.5F, 2.0F, 0.5F, 1.0F, 2.0F, 1.0F),
                PartPose.offsetAndRotation(0.0F, 7.0F, 0.0F, 0.6981F, 0.0F, 0.0F));
        PartDefinition flail0 = knot.addOrReplaceChild("flail_0",
                CubeListBuilder.create()
                        .texOffs(81, 19).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, -6.0F, 3.5F, -0.9599F, 0.0F, 0.0F));
        PartDefinition flail0Mid = flail0.addOrReplaceChild("flail_0_mid",
                CubeListBuilder.create()
                        .texOffs(90, 19).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, 1.9199F, 0.0F, 0.0F));
        PartDefinition flail1 = knot.addOrReplaceChild("flail_1",
                CubeListBuilder.create()
                        .texOffs(99, 19).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(3.3287F, -6.0F, 1.0816F, -0.9599F, 1.2566F, 0.0F));
        PartDefinition flail1Mid = flail1.addOrReplaceChild("flail_1_mid",
                CubeListBuilder.create()
                        .texOffs(108, 19).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, 1.9199F, 0.0F, 0.0F));
        PartDefinition flail2 = knot.addOrReplaceChild("flail_2",
                CubeListBuilder.create()
                        .texOffs(117, 19).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(2.0572F, -6.0F, -2.8316F, -0.9599F, 2.5133F, 0.0F));
        PartDefinition flail2Mid = flail2.addOrReplaceChild("flail_2_mid",
                CubeListBuilder.create()
                        .texOffs(0, 29).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, 1.9199F, 0.0F, 0.0F));
        PartDefinition flail3 = knot.addOrReplaceChild("flail_3",
                CubeListBuilder.create()
                        .texOffs(9, 29).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(-2.0572F, -6.0F, -2.8316F, -0.9599F, 3.7699F, 0.0F));
        PartDefinition flail3Mid = flail3.addOrReplaceChild("flail_3_mid",
                CubeListBuilder.create()
                        .texOffs(18, 29).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, 1.9199F, 0.0F, 0.0F));
        PartDefinition flail4 = knot.addOrReplaceChild("flail_4",
                CubeListBuilder.create()
                        .texOffs(27, 29).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(-3.3287F, -6.0F, 1.0816F, -0.9599F, 5.0265F, 0.0F));
        PartDefinition flail4Mid = flail4.addOrReplaceChild("flail_4_mid",
                CubeListBuilder.create()
                        .texOffs(36, 29).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(0.0F, 6.0F, 0.0F, 1.9199F, 0.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    @Override
    public void setupAnim(ManifoldRenderState state) {
        super.setupAnim(state);

        float pos = state.walkAnimationPos;
        float speed = state.walkAnimationSpeed;
        float idle = state.ageInTicks;

        // Ripple scuttle: each walker lifts and reaches a sixth late.
        for (int i = 0; i < 6; i++) {
            float phase = pos * 1.1F + (Mth.TWO_PI / 6.0F) * i;
            this.walkers[i].xRot += Mth.cos(phase) * 0.55F * speed;
            this.walkerMids[i].xRot += Math.max(0.0F, Mth.sin(phase)) * 0.7F * speed;
            // Idle: fingers drum around the circle.
            this.walkers[i].xRot += Mth.sin(idle * 0.16F + i * 1.7F) * 0.045F;
        }

        // The flails grasp at nothing, out of step with each other.
        for (int i = 0; i < 5; i++) {
            this.flails[i].xRot += Mth.sin(idle * 0.12F + i * 2.1F) * 0.28F;
            this.flails[i].yRot += Mth.cos(idle * 0.09F + i * 1.3F) * 0.22F;
        }

        // The knot itself churns slowly, and tips when climbing.
        this.knot.yRot += Mth.sin(idle * 0.03F) * 0.15F + pos * 0.02F;
        this.core.yRot -= idle * 0.05F;
        if (state.climbing) {
            this.knot.xRot += -0.6F;
        }

        this.attackAnimation.apply(state.attackAnimationState, state.ageInTicks);
        this.constrictAnimation.apply(state.constrictAnimationState, state.ageInTicks);
    }
}
