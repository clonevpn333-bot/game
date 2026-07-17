package com.gildedseam.client.model;

import com.gildedseam.client.anim.FontOfGoldAnimations;
import com.gildedseam.client.render.state.FontOfGoldRenderState;

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
 * Font of Gold: a rooted amphora that breathes. The waddle is a heavy
 * side-to-side rock on stump roots; the belly swells and settles like
 * something asleep and full.
 */
public class FontOfGoldModel extends EntityModel<FontOfGoldRenderState> {
    private final ModelPart base;
    private final ModelPart belly;
    private final ModelPart rootFr;
    private final ModelPart rootFl;
    private final ModelPart rootBr;
    private final ModelPart rootBl;
    private final KeyframeAnimation birthAnimation;

    public FontOfGoldModel(ModelPart root) {
        super(root);
        this.base = root.getChild("base");
        this.belly = this.base.getChild("belly");
        this.rootFr = root.getChild("root_fr");
        this.rootFl = root.getChild("root_fl");
        this.rootBr = root.getChild("root_br");
        this.rootBl = root.getChild("root_bl");
        this.birthAnimation = FontOfGoldAnimations.BIRTH.bake(root);
    }

    public static LayerDefinition createBodyLayer() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition root = mesh.getRoot();

        PartDefinition base = root.addOrReplaceChild("base",
                CubeListBuilder.create()
                        .texOffs(49, 0).addBox(-5.0F, -4.0F, -5.0F, 10.0F, 4.0F, 10.0F),
                PartPose.offset(0.0F, 20.0F, 0.0F));
        PartDefinition belly = base.addOrReplaceChild("belly",
                CubeListBuilder.create()
                        .texOffs(0, 0).addBox(-6.0F, -8.0F, -6.0F, 12.0F, 8.0F, 12.0F)
                        .texOffs(84, 21).addBox(-3.5F, -7.0F, -6.6F, 3.0F, 6.0F, 1.0F)
                        .texOffs(93, 21).addBox(0.5F, -7.0F, -6.6F, 3.0F, 6.0F, 1.0F)
                        .texOffs(102, 21).addBox(-0.5F, -7.0F, -6.3F, 1.0F, 6.0F, 1.0F),
                PartPose.offset(0.0F, -4.0F, 0.0F));
        PartDefinition shoulder = belly.addOrReplaceChild("shoulder",
                CubeListBuilder.create()
                        .texOffs(0, 21).addBox(-5.0F, -4.0F, -5.0F, 10.0F, 4.0F, 10.0F),
                PartPose.offset(0.0F, -8.0F, 0.0F));
        PartDefinition neck = shoulder.addOrReplaceChild("neck",
                CubeListBuilder.create()
                        .texOffs(41, 21).addBox(-3.0F, -3.0F, -3.0F, 6.0F, 3.0F, 6.0F),
                PartPose.offset(0.0F, -4.0F, 0.0F));
        PartDefinition spout0 = shoulder.addOrReplaceChild("spout_0",
                CubeListBuilder.create()
                        .texOffs(39, 36).addBox(-1.0F, -1.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(-4.0F, -4.0F, -3.0F));
        PartDefinition spout1 = shoulder.addOrReplaceChild("spout_1",
                CubeListBuilder.create()
                        .texOffs(48, 36).addBox(-1.0F, -1.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(4.5F, -4.0F, 2.0F));
        PartDefinition handleR = belly.addOrReplaceChild("handle_r",
                CubeListBuilder.create()
                        .texOffs(66, 21).addBox(-2.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(-6.0F, -6.0F, 0.0F, 0.0F, 0.0F, 0.2443F));
        PartDefinition handleL = belly.addOrReplaceChild("handle_l",
                CubeListBuilder.create()
                        .texOffs(75, 21).addBox(0.0F, 0.0F, -1.0F, 2.0F, 6.0F, 2.0F),
                PartPose.offsetAndRotation(6.0F, -6.0F, 0.0F, 0.0F, 0.0F, -0.2443F));
        PartDefinition rootFr = root.addOrReplaceChild("root_fr",
                CubeListBuilder.create()
                        .texOffs(107, 21).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F),
                PartPose.offset(-4.0F, 20.0F, -4.0F));
        PartDefinition rootFrLower = rootFr.addOrReplaceChild("root_fr_lower",
                CubeListBuilder.create()
                        .texOffs(57, 36).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition rootFl = root.addOrReplaceChild("root_fl",
                CubeListBuilder.create()
                        .texOffs(0, 36).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F),
                PartPose.offset(4.0F, 20.0F, -4.0F));
        PartDefinition rootFlLower = rootFl.addOrReplaceChild("root_fl_lower",
                CubeListBuilder.create()
                        .texOffs(66, 36).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition rootBr = root.addOrReplaceChild("root_br",
                CubeListBuilder.create()
                        .texOffs(13, 36).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F),
                PartPose.offset(-4.0F, 20.0F, 4.0F));
        PartDefinition rootBrLower = rootBr.addOrReplaceChild("root_br_lower",
                CubeListBuilder.create()
                        .texOffs(75, 36).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));
        PartDefinition rootBl = root.addOrReplaceChild("root_bl",
                CubeListBuilder.create()
                        .texOffs(26, 36).addBox(-1.5F, 0.0F, -1.5F, 3.0F, 2.0F, 3.0F),
                PartPose.offset(4.0F, 20.0F, 4.0F));
        PartDefinition rootBlLower = rootBl.addOrReplaceChild("root_bl_lower",
                CubeListBuilder.create()
                        .texOffs(84, 36).addBox(-1.0F, 0.0F, -1.0F, 2.0F, 2.0F, 2.0F),
                PartPose.offset(0.0F, 2.0F, 0.0F));

        return LayerDefinition.create(mesh, 128, 128);
    }

    @Override
    public void setupAnim(FontOfGoldRenderState state) {
        super.setupAnim(state);

        float pos = state.walkAnimationPos;
        float speed = state.walkAnimationSpeed;

        // Rocking waddle on root-stumps.
        float swing = pos * 0.45F;
        this.base.zRot += Mth.cos(swing) * 0.14F * speed;
        this.base.xRot += Mth.cos(swing * 2.0F) * 0.05F * speed;
        this.rootFr.xRot = Mth.cos(swing) * 0.6F * speed;
        this.rootBl.xRot = Mth.cos(swing) * 0.6F * speed;
        this.rootFl.xRot = Mth.cos(swing + Mth.PI) * 0.6F * speed;
        this.rootBr.xRot = Mth.cos(swing + Mth.PI) * 0.6F * speed;

        // Sleeper's breathing.
        float idle = state.ageInTicks;
        float breath = 1.0F + Mth.sin(idle * 0.05F) * 0.03F;
        this.belly.xScale *= breath;
        this.belly.zScale *= breath;

        this.birthAnimation.apply(state.birthAnimationState, state.ageInTicks);
    }
}
