package com.gildedseam.client.render.state;

import net.minecraft.client.renderer.entity.state.LivingEntityRenderState;

/** Render state for the living folk: tier for the half-sapped, plus the
 *  same swing value the seam creatures animate from. */
public class FolkRenderState extends LivingEntityRenderState {
    public int tier;
    /** 0 when idle, rising to 1 across a swing. */
    public float attackSwing;
}
