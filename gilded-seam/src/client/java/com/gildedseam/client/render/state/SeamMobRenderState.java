package com.gildedseam.client.render.state;

import net.minecraft.client.renderer.entity.state.LivingEntityRenderState;

/** Base render state for seam creatures: carries the synced firing tier. */
public class SeamMobRenderState extends LivingEntityRenderState {
    public int tier;
}
