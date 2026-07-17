package com.gildedseam.client.render.state;

import net.minecraft.world.entity.AnimationState;

public class ManifoldRenderState extends SeamMobRenderState {
    public final AnimationState attackAnimationState = new AnimationState();
    public final AnimationState constrictAnimationState = new AnimationState();
    public boolean climbing;
}
