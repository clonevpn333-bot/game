package com.gildedseam.client.render.state;

import net.minecraft.world.entity.AnimationState;

public class KilnbornRenderState extends SeamMobRenderState {
    public final AnimationState attackAnimationState = new AnimationState();
    public final AnimationState chargeAnimationState = new AnimationState();
    public boolean overfired;
}
