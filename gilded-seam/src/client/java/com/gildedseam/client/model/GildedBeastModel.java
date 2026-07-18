package com.gildedseam.client.model;

import com.gildedseam.client.render.state.GildedBeastRenderState;
import com.gildedseam.infection.SeamHelper;

import java.util.Map;

import net.minecraft.client.model.EntityModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.util.Mth;

/**
 * One model class, six gilded beasts. Geometry comes from the generated
 * per-species {@link GildedBeastLayers}; this class supplies the shared
 * behaviour — a diagonal-pair gait, head tracking, a procedural
 * attack-lunge driven by {@code attackTime}, and mutation parts revealed
 * by firing tier (paths prefixed {@code mut1_}/{@code mut2_} in the
 * geometry data).
 */
public class GildedBeastModel extends EntityModel<GildedBeastRenderState> {
    /** Per-species wiring: which parts are the head, the legs, the mutations. */
    public record Config(String head, String[] legs, String[] mut1, String[] mut2,
                         float gaitFreq, float gaitAmp) {
    }

    public static final Map<String, Config> CONFIGS = Map.of(
            "gilded_cow", new Config("body/head",
                    new String[] {"leg_fr", "leg_fl", "leg_br", "leg_bl"},
                    new String[] {"body/mut1_spine_0", "body/mut1_spine_1"},
                    new String[] {"body/hump/mut2_bloom"}, 0.6662F, 0.9F),
            "gilded_pig", new Config("body/head",
                    new String[] {"leg_fr", "leg_fl", "leg_br", "leg_bl"},
                    new String[] {"body/mut1_spout_r", "body/mut1_spout_l"},
                    new String[] {"body/mut2_glow_ring", "mut2_leg_mr", "mut2_leg_ml"}, 0.8F, 1.0F),
            "gilded_sheep", new Config("body/head",
                    new String[] {"leg_fr", "leg_fl", "leg_br", "leg_bl"},
                    new String[] {"body/fleece/mut1_needle_0", "body/fleece/mut1_needle_1",
                                  "body/fleece/mut1_needle_2", "body/fleece/mut1_needle_3"},
                    new String[] {"body/fleece/mut2_spool"}, 0.6662F, 0.9F),
            "gilded_chicken", new Config("body/head",
                    new String[] {"leg_r", "leg_l"},
                    new String[] {"body/mut1_wing2_r", "body/mut1_wing2_l"},
                    new String[] {"body/mut2_head2"}, 1.0F, 1.2F),
            "gilded_spider", new Config("cephalo",
                    new String[] {"leg_0", "leg_1", "leg_2", "leg_3",
                                  "leg_4", "leg_5", "leg_6", "leg_7"},
                    new String[] {"abdomen/lid/mut1_gem", "abdomen/mut1_spikes"},
                    new String[] {"mut2_leg_0", "mut2_leg_1"}, 1.1F, 0.5F),
            "gilded_cask", new Config("body",
                    new String[] {"leg_fr", "leg_fl", "leg_br", "leg_bl"},
                    new String[] {"body/mut1_vent_r", "body/mut1_vent_l"},
                    new String[] {"body/mut2_crown"}, 0.6662F, 1.1F));

    private final Config config;
    private final ModelPart head;
    private final ModelPart[] legs;
    private final ModelPart[] mut1Parts;
    private final ModelPart[] mut2Parts;

    public GildedBeastModel(ModelPart root, Config config) {
        super(root);
        this.config = config;
        this.head = resolve(root, config.head());
        this.legs = resolveAll(root, config.legs());
        this.mut1Parts = resolveAll(root, config.mut1());
        this.mut2Parts = resolveAll(root, config.mut2());
    }

    private static ModelPart resolve(ModelPart root, String path) {
        ModelPart part = root;
        for (String name : path.split("/")) {
            part = part.getChild(name);
        }
        return part;
    }

    private static ModelPart[] resolveAll(ModelPart root, String[] paths) {
        ModelPart[] parts = new ModelPart[paths.length];
        for (int i = 0; i < paths.length; i++) {
            parts[i] = resolve(root, paths[i]);
        }
        return parts;
    }

    @Override
    public void setupAnim(GildedBeastRenderState state) {
        super.setupAnim(state);

        for (ModelPart part : this.mut1Parts) {
            part.visible = state.tier >= SeamHelper.TIER_STONEWARE;
        }
        for (ModelPart part : this.mut2Parts) {
            part.visible = state.tier >= SeamHelper.TIER_LUSTRE;
        }

        this.head.yRot += state.yRot * Mth.DEG_TO_RAD * 0.6F;
        this.head.xRot += state.xRot * Mth.DEG_TO_RAD * 0.6F;

        float pos = state.walkAnimationPos;
        float speed = state.walkAnimationSpeed;
        for (int i = 0; i < this.legs.length; i++) {
            // Diagonal pairs; long leg rows ripple down the line.
            float phase = (((i % 2) + (i / 2 % 2)) % 2) * Mth.PI + (i / 4) * Mth.HALF_PI;
            this.legs[i].xRot += Mth.cos(pos * this.config.gaitFreq() + phase)
                    * this.config.gaitAmp() * speed;
        }

        // The lunge: attackTime rises 0->1 across a swing.
        if (state.attackTime > 0.0F) {
            float lunge = Mth.sin(state.attackTime * Mth.PI);
            this.head.xRot += lunge * 0.6F;
            this.head.y += lunge * 1.5F;
        }

        // Porcelain never sits quite still.
        this.head.zRot += Mth.sin(state.ageInTicks * 0.07F) * 0.03F;
    }
}
