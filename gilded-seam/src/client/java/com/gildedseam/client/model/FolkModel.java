package com.gildedseam.client.model;

import com.gildedseam.client.render.state.FolkRenderState;
import com.gildedseam.infection.SeamHelper;

import java.util.Map;

import net.minecraft.client.model.EntityModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.util.Mth;

/**
 * One model class for the human folk — refugees, gilt-mad prophets, and
 * the half-sewn. Shared humanoid gait; the half-sewn drags its finished
 * porcelain leg and reveals its mutations by tier.
 */
public class FolkModel extends EntityModel<FolkRenderState> {
    public record Config(String[] mut1, String[] mut2, boolean stagger) {
    }

    public static final Map<String, Config> CONFIGS = Map.of(
            "refugee", new Config(new String[0], new String[0], false),
            "gilt_mad", new Config(new String[0], new String[0], false),
            "half_sewn", new Config(new String[] {"body/mut1_patch"},
                    new String[] {"body/mut2_spare_arm"}, true));

    private final Config config;
    private final ModelPart head;
    private final ModelPart armR;
    private final ModelPart armL;
    private final ModelPart legR;
    private final ModelPart legL;
    private final ModelPart[] mut1Parts;
    private final ModelPart[] mut2Parts;

    public FolkModel(ModelPart root, Config config) {
        super(root);
        this.config = config;
        ModelPart body = root.getChild("body");
        this.head = body.getChild("head");
        this.armR = body.getChild("arm_r");
        this.armL = body.getChild("arm_l");
        this.legR = root.getChild("leg_r");
        this.legL = root.getChild("leg_l");
        this.mut1Parts = resolveAll(root, config.mut1());
        this.mut2Parts = resolveAll(root, config.mut2());
    }

    private static ModelPart[] resolveAll(ModelPart root, String[] paths) {
        ModelPart[] parts = new ModelPart[paths.length];
        for (int i = 0; i < paths.length; i++) {
            ModelPart part = root;
            for (String name : paths[i].split("/")) {
                part = part.getChild(name);
            }
            parts[i] = part;
        }
        return parts;
    }

    @Override
    public void setupAnim(FolkRenderState state) {
        super.setupAnim(state);

        for (ModelPart part : this.mut1Parts) {
            part.visible = state.tier >= SeamHelper.TIER_STONEWARE;
        }
        for (ModelPart part : this.mut2Parts) {
            part.visible = state.tier >= SeamHelper.TIER_LUSTRE;
        }

        this.head.yRot = state.yRot * Mth.DEG_TO_RAD;
        this.head.xRot = state.xRot * Mth.DEG_TO_RAD;

        float pos = state.walkAnimationPos;
        float speed = state.walkAnimationSpeed;
        // The half-sewn drag their porcelain side; everyone else just walks.
        float dragR = this.config.stagger() ? 0.5F : 1.0F;
        this.legR.xRot = Mth.cos(pos * 0.6662F) * 1.1F * speed * dragR;
        this.legL.xRot = Mth.cos(pos * 0.6662F + Mth.PI) * 1.1F * speed;
        this.armR.xRot = Mth.cos(pos * 0.6662F + Mth.PI) * 0.8F * speed * dragR;
        this.armL.xRot = Mth.cos(pos * 0.6662F) * 0.8F * speed;

        if (this.config.stagger()) {
            // The finished arm reaches; the body lists toward its ware side.
            this.armR.xRot += -0.5F + Mth.sin(state.ageInTicks * 0.08F) * 0.12F;
            this.head.zRot += 0.08F;
        }

        if (state.attackTime > 0.0F) {
            float swing = Mth.sin(state.attackTime * Mth.PI);
            this.armR.xRot += -swing * 1.6F;
        }
    }
}
