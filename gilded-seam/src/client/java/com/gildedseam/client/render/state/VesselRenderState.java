package com.gildedseam.client.render.state;

import net.minecraft.world.entity.AnimationState;

public class VesselRenderState extends SeamMobRenderState {
    public final AnimationState attackAnimationState = new AnimationState();
    public final AnimationState risingAnimationState = new AnimationState();
    public boolean rising;
}
