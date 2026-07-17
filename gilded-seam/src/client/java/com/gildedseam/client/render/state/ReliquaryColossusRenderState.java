package com.gildedseam.client.render.state;

import net.minecraft.world.entity.AnimationState;

public class ReliquaryColossusRenderState extends SeamMobRenderState {
    public final AnimationState awakenAnimationState = new AnimationState();
    public final AnimationState sweepAnimationState = new AnimationState();
    public final AnimationState slamAnimationState = new AnimationState();
    public final AnimationState summonAnimationState = new AnimationState();
    public boolean dormant;
}
