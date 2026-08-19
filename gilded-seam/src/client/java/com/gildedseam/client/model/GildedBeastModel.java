package com.gildedseam.client.model;

import com.gildedseam.GildedSeam;
import com.gildedseam.client.anim.gen.GenAnimations;
import com.gildedseam.client.render.state.GildedBeastRenderState;
import com.gildedseam.infection.SeamHelper;

import java.util.Map;

import net.minecraft.client.animation.AnimationDefinition;
import net.minecraft.client.animation.KeyframeAnimation;
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

    public static final Map<String, Config> CONFIGS = Map.ofEntries(
            Map.entry("gilded_cow", new Config("body/head", QUAD_LEGS,
                    new String[] {"body/mut1_flank", "body/mut1_plates",
                                  "body/mut1_bulb", "body/head/mut1_tongue"},
                    new String[] {"body/mut2_arm_r", "body/mut2_arm_l",
                                  "body/head/mut2_roots_r", "body/head/mut2_roots_l",
                                  "body/mut2_stalks"},
                    new String[] {"body/head/mut1_tongue"}, 0.72F, 0.95F)),
            Map.entry("gilded_pig", new Config("body/head", QUAD_LEGS,
                    new String[] {"body/mut1_belly", "body/mut1_bulb",
                                  "body/head/mut1_tongue"},
                    new String[] {"body/mut2_legs_r0", "body/mut2_legs_l0",
                                  "body/mut2_arm_r", "body/head/mut2_stalks"},
                    new String[] {"body/head/mut1_tongue"}, 0.80F, 0.85F)),
            Map.entry("gilded_sheep", new Config("body/head", QUAD_LEGS,
                    new String[] {"body/mut1_fleecerift", "body/mut1_plates",
                                  "body/head/mut1_tongue"},
                    new String[] {"body/mut2_stalks", "body/mut2_arm_r",
                                  "body/mut2_arm_l", "body/head/mut2_roots_r"},
                    new String[] {"body/head/mut1_tongue"}, 0.74F, 0.90F)),
            Map.entry("gilded_chicken", new Config("body/head", new String[] {"leg_r", "leg_l"},
                    new String[] {"body/mut1_neck", "body/mut1_crop",
                                  "body/head/mut1_tongue"},
                    new String[] {"body/mut2_arm_r", "body/mut2_arm_l",
                                  "body/head/mut2_stalks"},
                    new String[] {"body/head/mut1_tongue"}, 1.15F, 1.20F)),
            Map.entry("gilded_spider", new Config("body/head",
                    new String[] {"body/leg_r0", "body/leg_r1", "body/leg_r2",
                                  "body/leg_r3", "body/leg_l0", "body/leg_l1",
                                  "body/leg_l2", "body/leg_l3"},
                    new String[] {"body/abdomen/mut1_sac", "body/abdomen/mut1_bulb",
                                  "body/head/mut1_tongue"},
                    new String[] {"body/abdomen/mut2_legs00", "body/abdomen/mut2_legs01",
                                  "body/abdomen/mut2_legs10", "body/abdomen/mut2_legs11",
                                  "body/head/mut2_stalks"},
                    new String[] {"body/head/mut1_tongue"}, 0.90F, 0.55F)),
            Map.entry("gilded_cask", new Config("body/head", QUAD_LEGS,
                    new String[] {"body/mut1_core", "body/mut1_heart", "body/mut1_plates"},
                    new String[] {"body/mut2_arm_r", "body/mut2_arm_l",
                                  "body/head/mut2_stalks", "body/head/mut2_tongue"},
                    new String[] {"body/head/mut2_tongue"}, 0.86F, 0.75F)),
            Map.entry("gilded_wolf", new Config("body/head", QUAD_LEGS,
                    new String[] {"body/mut1_ribs", "body/mut1_plates",
                                  "body/head/mut1_tongue", "body/head/mut1_eyes"},
                    new String[] {"body/head/mut2_roots_r", "body/head/mut2_roots_l",
                                  "body/mut2_arm_r", "body/mut2_arm_l", "body/mut2_stalks"},
                    new String[] {"body/head/mut1_tongue"}, 1.05F, 1.15F)),
            Map.entry("gilded_goat", new Config("body/head", QUAD_LEGS,
                    new String[] {"body/mut1_flank", "body/head/mut1_roots_r",
                                  "body/head/mut1_roots_l", "body/head/mut1_tongue",
                                  "body/head/mut1_eyes"},
                    new String[] {"body/mut2_arm_r", "body/mut2_arm_l", "body/mut2_stalks"},
                    new String[] {"body/head/mut1_tongue"}, 0.78F, 0.95F)),
            Map.entry("gilded_hare", new Config("body/head", QUAD_LEGS,
                    new String[] {"body/mut1_ribs", "body/head/mut1_tongue",
                                  "body/head/mut1_eyes"},
                    new String[] {"body/head/mut2_stalks", "body/mut2_legs_r0",
                                  "body/mut2_legs_l0"},
                    new String[] {"body/head/mut1_tongue"}, 1.30F, 1.05F)),
            Map.entry("gilded_fox", new Config("body/head", QUAD_LEGS,
                    new String[] {"body/mut1_flank", "body/mut1_plates",
                                  "body/head/mut1_tongue", "body/head/mut1_eyes"},
                    new String[] {"body/mut2_arm_r", "body/mut2_arm_l",
                                  "body/mut2_stalks"},
                    new String[] {"body/head/mut1_tongue"}, 1.0F, 1.05F)),
            Map.entry("gilded_cat", new Config("body/head", QUAD_LEGS,
                    new String[] {"body/mut1_flank", "body/mut1_plates",
                                  "body/head/mut1_tongue", "body/head/mut1_eyes"},
                    new String[] {"body/mut2_arm_r", "body/mut2_arm_l",
                                  "body/mut2_stalks"},
                    new String[] {"body/head/mut1_tongue"}, 1.15F, 1.1F)),
            Map.entry("gilded_horse", new Config("body/head", QUAD_LEGS,
                    new String[] {"body/mut1_flank", "body/mut1_plates",
                                  "body/head/mut1_tongue", "body/head/mut1_eyes"},
                    new String[] {"body/mut2_arm_r", "body/mut2_arm_l",
                                  "body/mut2_stalks"},
                    new String[] {"body/head/mut1_tongue"}, 0.68F, 1.0F)),
            Map.entry("gilded_llama", new Config("body/head", QUAD_LEGS,
                    new String[] {"body/mut1_flank", "body/mut1_plates",
                                  "body/head/mut1_tongue", "body/head/mut1_eyes"},
                    new String[] {"body/mut2_arm_r", "body/mut2_arm_l",
                                  "body/mut2_stalks"},
                    new String[] {"body/head/mut1_tongue"}, 0.72F, 0.95F)));

    private final Config config;
    private final ModelPart body;
    private final ModelPart jaw;
    private final ModelPart head;
    private float bodyBaseY = Float.NaN;
    private final ModelPart[] legs;
    private final ModelPart[] mut1;
    private final ModelPart[] mut2;
    private final ModelPart[] dangle;

    // Solved on the bench and baked here. Null means this creature has no
    // generated animation of that kind, or baking it failed - see `bake`.
    private final KeyframeAnimation idleAnim;
    private final KeyframeAnimation walkAnim;
    private final KeyframeAnimation runAnim;
    private final KeyframeAnimation attackAnim;

    public GildedBeastModel(ModelPart root, Config config, String name) {
        super(root);
        this.config = config;
        this.body = resolve(root, "body");
        this.jaw = resolve(root, config.head() + "/face/face_jaw");
        this.head = resolve(root, config.head());
        this.legs = resolveAll(root, config.legs());
        this.mut1 = resolveAll(root, config.mut1());
        this.mut2 = resolveAll(root, config.mut2());
        this.dangle = resolveAll(root, config.dangle());

        GenAnimations gen = GenAnimations.of(name);
        this.idleAnim = bake(root, gen == null ? null : gen.idle(), name);
        this.walkAnim = bake(root, gen == null ? null : gen.walk(), name);
        this.runAnim = bake(root, gen == null ? null : gen.run(), name);
        this.attackAnim = bake(root, gen == null ? null : gen.attack(), name);
    }

    /**
     * Bakes a generated animation onto this model's parts.
     *
     * <p>Baking resolves every bone the animation names against the model, and
     * a name that is not there is fatal. That should not happen - the geometry
     * and the animations are generated from the same bench model in the same
     * run - but "should not" is not "cannot", and the failure would be a client
     * crash on spawning a cow. A miss costs this creature its solved gait and
     * drops it back to the procedural one below, which is what it had before
     * any of this existed.
     */
    private static KeyframeAnimation bake(ModelPart root, AnimationDefinition definition,
                                          String name) {
        if (definition == null) {
            return null;
        }
        try {
            return definition.bake(root);
        } catch (RuntimeException failed) {
            GildedSeam.LOGGER.warn("{}: could not bake an animation onto the model, "
                    + "falling back to the procedural gait", name, failed);
            return null;
        }
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

        float pos = state.walkAnimationPos;
        float speed = Math.min(1.0F, state.walkAnimationSpeed);
        float freq = this.config.gaitFreq();
        float amp = this.config.gaitAmp();
        float age = state.ageInTicks;
        float gait = pos * freq;

        if (this.walkAnim != null) {
            solved(state, pos, speed, age);
            return;
        }

        // --- the gait ----------------------------------------------------
        // A plain sine reads as floaty. Adding the second harmonic makes the
        // leg snap forward and drag back, which is what gives a walk its
        // punch; the diagonal pairing is how a real quadruped actually moves.
        for (int i = 0; i < this.legs.length; i++) {
            ModelPart leg = this.legs[i];
            if (leg == null) {
                continue;
            }
            float phase = (((i % 2) + ((i / 2) % 2)) % 2) * Mth.PI;
            float th = gait + phase;
            float swing = Mth.sin(th) + 0.35F * Mth.sin(2.0F * th);
            leg.xRot = swing * amp * speed;
            // Legs lift slightly on the forward half of the stride.
            leg.zRot = Mth.cos(th) * 0.06F * speed;
        }

        // --- weight ------------------------------------------------------
        // The body drops onto each footfall and rolls into the stride. Two
        // bounces per cycle, because both diagonals hit the ground.
        if (this.body != null) {
            if (Float.isNaN(this.bodyBaseY)) {
                this.bodyBaseY = this.body.y;
            }
            float bounce = Math.abs(Mth.cos(gait)) * speed;
            float breath = Mth.sin(age * 0.06F) * 0.18F * (1.0F - speed);
            this.body.y = this.bodyBaseY - bounce * 1.15F + breath;
            this.body.zRot = Mth.sin(gait) * 0.05F * speed;
            this.body.xRot = -bounce * 0.05F;
        }

        // --- head --------------------------------------------------------
        if (this.head != null) {
            this.head.yRot = state.yRot * Mth.DEG_TO_RAD;
            // The head lags the body's bounce instead of tracking it, which
            // is most of what makes an animated walk feel weighted.
            this.head.xRot = state.xRot * Mth.DEG_TO_RAD
                    + Mth.cos(gait - 0.6F) * 0.09F * speed;
            this.head.zRot = -Mth.sin(gait) * 0.04F * speed;
        }

        // --- the jaw ------------------------------------------------------
        // It never fully closes, and it chews on the stride.
        if (this.jaw != null) {
            this.jaw.xRot = 0.42F
                    + Mth.sin(age * 0.13F) * 0.12F
                    + Math.abs(Mth.sin(gait)) * 0.22F * speed;
        }

        // --- everything that hangs ---------------------------------------
        // Tongues and grafted limbs trail a quarter-cycle behind and keep
        // moving after the body stops.
        float sway = Mth.sin(age * 0.09F);
        float trail = Mth.sin(gait - Mth.HALF_PI) * speed;
        for (ModelPart part : this.dangle) {
            if (part != null) {
                part.xRot += sway * 0.14F + trail * 0.22F;
                part.zRot = Mth.cos(age * 0.07F) * 0.12F + trail * 0.10F;
            }
        }

        // --- the strike --------------------------------------------------
        // Three beats rather than one sine: a slow wind-up, a snap, and a
        // recoil that overshoots before settling. Punchy comes from the
        // asymmetry - the strike takes a fifth of the time the wind-up does.
        float swing = state.attackSwing;
        if (swing > 0.0F) {
            float lunge;
            if (swing < 0.35F) {
                float k = swing / 0.35F;
                lunge = -0.35F * k * k;            // coil back
            } else if (swing < 0.55F) {
                float k = (swing - 0.35F) / 0.20F;
                lunge = -0.35F + 1.60F * k * k;    // snap
            } else {
                float k = (swing - 0.55F) / 0.45F;
                lunge = 1.25F * (1.0F - k) * (1.0F - k * 0.4F);
            }
            if (this.head != null) {
                this.head.xRot -= lunge * 0.55F;
                this.head.y -= lunge * 0.6F;
            }
            if (this.body != null) {
                this.body.xRot -= lunge * 0.18F;
            }
            if (this.jaw != null) {
                // The bite opens wide on the coil and snaps shut on contact.
                this.jaw.xRot += Math.max(0.0F, -lunge) * 1.1F - Math.max(0.0F, lunge) * 0.35F;
            }
            for (ModelPart part : this.mut2) {
                if (part != null) {
                    part.xRot -= lunge * 0.75F;
                }
            }
        }
    }

    /**
     * The solved path: gaits, an idle and a swing that came off the bench.
     *
     * <p>The procedural gait below this is a sine wave through each leg from
     * the shoulder. It has no knee in it - a leg cannot lift, only swing - and
     * "run" is the same curve driven faster, which is why a charging cow looks
     * like a walking cow on fast-forward. What replaces it is solved: an IK
     * pass over limb lengths measured off this creature's own geometry, so the
     * foot follows a real path and the joints bend to reach it, and the run is
     * a separate gait with a suspension phase rather than the walk sped up.
     *
     * <p>Walk and run are driven by `applyWalk`, which takes the distance
     * walked rather than a clock, so the cycle stays locked to the feet at any
     * speed. The idle is driven the same way off `ageInTicks`, which is what
     * makes it loop continuously while the creature is standing still.
     */
    private void solved(GildedBeastRenderState state, float pos, float speed, float age) {
        // Under a third of full speed it is walking; above two thirds it is
        // running; between, whichever is closer, so the changeover happens
        // once rather than flickering back and forth on the boundary.
        boolean running = this.runAnim != null && speed > 0.55F;
        KeyframeAnimation moving = running ? this.runAnim : this.walkAnim;

        if (speed > 0.02F) {
            moving.applyWalk(pos, speed, running ? 3.6F : 5.4F, 2.6F);
        } else if (this.idleAnim != null) {
            // Standing. `applyWalk` off the clock rather than off distance,
            // with a full amplitude, is a continuously looping idle.
            this.idleAnim.applyWalk(age, 1.0F, 14.0F, 1.0F);
        }

        if (this.attackAnim != null) {
            this.attackAnim.apply(state.attackAnimationState, age);
        }

        // Look-at is not animation - it is where the creature is pointing -
        // so it is applied on top of whatever the gait just did.
        if (this.head != null) {
            this.head.yRot += state.yRot * Mth.DEG_TO_RAD;
            this.head.xRot += state.xRot * Mth.DEG_TO_RAD;
        }
    }
}
