package com.gildedseam.client.render.state;

import net.minecraft.world.entity.AnimationState;

public class PorcelainAutarchRenderState extends SeamMobRenderState {
    public final AnimationState awakenAnimationState = new AnimationState();
    public final AnimationState sweepAnimationState = new AnimationState();
    public final AnimationState stormAnimationState = new AnimationState();
    public final AnimationState novaAnimationState = new AnimationState();
    public final AnimationState decreeAnimationState = new AnimationState();
    public boolean dormant;
    public boolean enraged;
}
