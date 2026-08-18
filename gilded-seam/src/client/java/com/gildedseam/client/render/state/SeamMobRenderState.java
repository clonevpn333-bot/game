package com.gildedseam.client.render.state;

import net.minecraft.client.renderer.entity.state.LivingEntityRenderState;

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
}
