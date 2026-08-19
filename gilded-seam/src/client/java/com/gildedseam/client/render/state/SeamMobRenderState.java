package com.gildedseam.client.render.state;

import net.minecraft.client.renderer.entity.state.LivingEntityRenderState;
import net.minecraft.world.entity.AnimationState;

/**
 * Base render state for seam creatures.
 *
 * <p>Carries the synced firing tier, and our own swing value: the models
 * animate their lunges from {@code attackSwing} rather than a vanilla field,
 * so a rename in the game cannot silently break every creature at once.
 */
public class SeamMobRenderState extends LivingEntityRenderState {
    public int tier;
    /** 0 when idle, rising to 1 across a swing. */
    public float attackSwing;
    /**
     * True while the creature is on the floor waiting to get back up. Killing
     * one of these does not finish it - it falls, lies there for a minute and
     * returns worse - so "downed" is a pose it holds, not a despawn.
     */
    public boolean downed;
    public final AnimationState deathAnimationState = new AnimationState();
    public final AnimationState riseAnimationState = new AnimationState();
}
