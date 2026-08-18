package com.gildedseam.client.model;

import com.gildedseam.client.render.state.GildedBeastRenderState;
import com.gildedseam.infection.SeamHelper;

import java.util.Map;

import net.minecraft.client.model.EntityModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.util.Mth;

/**
 * One model class for every blighted animal.
 *
 * <p>The geometry is built by the AmberBench pipeline from the *vanilla*
 * silhouette of the host, so a blighted cow still walks on a cow's four legs
 * and carries a cow's head. Everything the infection added is named
 * {@code mut1_*} or {@code mut2_*} and is simply hidden until the creature has
 * been fired that far, which is what produces the mutation line.
 */
public class GildedBeastModel extends EntityModel<GildedBeastRenderState> {
    /**
     * @param head    path to the head part, for look-at
     * @param legs    leg parts, walked in diagonal pairs
     * @param mut1    parts that appear at Stoneware
     * @param mut2    parts that appear at Lustre
     * @param dangle  parts that hang and swing (tongues, stalks, grafted arms)
     * @param gaitAmp how far the legs swing
     */
    public record Config(String head, String[] legs, String[] mut1, String[] mut2,
                         String[] dangle, float gaitFreq, float gaitAmp) {
    }

    private static final String[] QUAD_LEGS = {"leg_fr", "leg_fl", "leg_br", "leg_bl"};

    public static final Map<String, Config> CONFIGS = Map.of(
            "gilded_cow", new Config("body/head", QUAD_LEGS,
                    new String[] {"body/mut1_flank", "body/mut1_plates",
                                  "body/mut1_bulb", "body/head/mut1_tongue"},
                    new String[] {"body/mut2_arm_r", "body/mut2_arm_l",
                                  "body/head/mut2_roots_r", "body/head/mut2_roots_l",
                                  "body/mut2_stalks"},
                    new String[] {"body/head/mut1_tongue"}, 0.72F, 0.95F),
            "gilded_pig", new Config("body/head", QUAD_LEGS,
                    new String[] {"body/mut1_belly", "body/mut1_bulb",
                                  "body/head/mut1_tongue"},
                    new String[] {"body/mut2_legs_r0", "body/mut2_legs_l0",
                                  "body/mut2_arm_r", "body/head/mut2_stalks"},
                    new String[] {"body/head/mut1_tongue"}, 0.80F, 0.85F),
            "gilded_sheep", new Config("body/head", QUAD_LEGS,
                    new String[] {"body/mut1_fleecerift", "body/mut1_plates",
                                  "body/head/mut1_tongue"},
                    new String[] {"body/mut2_stalks", "body/mut2_arm_r",
                                  "body/mut2_arm_l", "body/head/mut2_roots_r"},
                    new String[] {"body/head/mut1_tongue"}, 0.74F, 0.90F),
            "gilded_chicken", new Config("body/head", new String[] {"leg_r", "leg_l"},
                    new String[] {"body/mut1_neck", "body/mut1_crop",
                                  "body/head/mut1_tongue"},
                    new String[] {"body/mut2_arm_r", "body/mut2_arm_l",
                                  "body/head/mut2_stalks"},
                    new String[] {"body/head/mut1_tongue"}, 1.15F, 1.20F),
            "gilded_spider", new Config("body/head",
                    new String[] {"body/leg_r0", "body/leg_r1", "body/leg_r2",
                                  "body/leg_r3", "body/leg_l0", "body/leg_l1",
                                  "body/leg_l2", "body/leg_l3"},
                    new String[] {"body/abdomen/mut1_sac", "body/abdomen/mut1_bulb",
                                  "body/head/mut1_tongue"},
                    new String[] {"body/abdomen/mut2_legs00", "body/abdomen/mut2_legs01",
                                  "body/abdomen/mut2_legs10", "body/abdomen/mut2_legs11",
                                  "body/head/mut2_stalks"},
                    new String[] {"body/head/mut1_tongue"}, 0.90F, 0.55F),
            "gilded_cask", new Config("body/head", QUAD_LEGS,
                    new String[] {"body/mut1_core", "body/mut1_heart", "body/mut1_plates"},
                    new String[] {"body/mut2_arm_r", "body/mut2_arm_l",
                                  "body/head/mut2_stalks", "body/head/mut2_tongue"},
                    new String[] {"body/head/mut2_tongue"}, 0.86F, 0.75F));

    private final Config config;
    private final ModelPart head;
    private final ModelPart[] legs;
    private final ModelPart[] mut1;
    private final ModelPart[] mut2;
    private final ModelPart[] dangle;

    public GildedBeastModel(ModelPart root, Config config) {
        super(root);
        this.config = config;
        this.head = resolve(root, config.head());
        this.legs = resolveAll(root, config.legs());
        this.mut1 = resolveAll(root, config.mut1());
        this.mut2 = resolveAll(root, config.mut2());
        this.dangle = resolveAll(root, config.dangle());
    }

    /** Missing parts resolve to null rather than throwing, so a geometry edit
     *  never hard-crashes a client mid-session. */
    private static ModelPart resolve(ModelPart root, String path) {
        ModelPart part = root;
        for (String name : path.split("/")) {
            if (!part.hasChild(name)) {
                return null;
            }
            part = part.getChild(name);
        }
        return part;
    }

    private static ModelPart[] resolveAll(ModelPart root, String[] paths) {
        ModelPart[] out = new ModelPart[paths.length];
        for (int i = 0; i < paths.length; i++) {
            out[i] = resolve(root, paths[i]);
        }
        return out;
    }

    private static void setVisible(ModelPart[] parts, boolean visible) {
        for (ModelPart part : parts) {
            if (part != null) {
                part.visible = visible;
            }
        }
    }

    @Override
    public void setupAnim(GildedBeastRenderState state) {
        super.setupAnim(state);

        setVisible(this.mut1, state.tier >= SeamHelper.TIER_STONEWARE);
        setVisible(this.mut2, state.tier >= SeamHelper.TIER_LUSTRE);

        if (this.head != null) {
            this.head.yRot = state.yRot * Mth.DEG_TO_RAD;
            this.head.xRot = state.xRot * Mth.DEG_TO_RAD;
        }

        float pos = state.walkAnimationPos;
        float speed = state.walkAnimationSpeed;
        float freq = this.config.gaitFreq();
        float amp = this.config.gaitAmp();
        // Diagonal pairs, the way a real quadruped moves: front-left swings
        // with back-right. Legs beyond the fourth join the nearest pair.
        for (int i = 0; i < this.legs.length; i++) {
            ModelPart leg = this.legs[i];
            if (leg == null) {
                continue;
            }
            float phase = (((i % 2) + ((i / 2) % 2)) % 2) * Mth.PI;
            leg.xRot = Mth.cos(pos * freq + phase) * amp * speed;
        }

        // Anything hanging keeps swinging after the body stops - tongues and
        // grafted limbs never quite settle.
        float sway = Mth.sin(state.ageInTicks * 0.09F);
        for (ModelPart part : this.dangle) {
            if (part != null) {
                part.xRot += sway * 0.16F + speed * 0.10F;
                part.zRot = Mth.cos(state.ageInTicks * 0.07F) * 0.12F;
            }
        }

        if (state.attackSwing > 0.0F) {
            float lunge = Mth.sin(state.attackSwing * Mth.PI);
            if (this.head != null) {
                this.head.xRot -= lunge * 0.5F;
            }
            for (ModelPart part : this.mut2) {
                if (part != null) {
                    part.xRot -= lunge * 0.7F;
                }
            }
        }
    }
}
