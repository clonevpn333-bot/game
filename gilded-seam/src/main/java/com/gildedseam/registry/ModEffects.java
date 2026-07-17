package com.gildedseam.registry;

import com.gildedseam.GildedSeam;
import com.gildedseam.infection.GildedEffect;

import net.minecraft.core.Holder;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.effect.MobEffect;

public final class ModEffects {
    public static final Holder<MobEffect> GILDED = Registry.registerForHolder(
            BuiltInRegistries.MOB_EFFECT,
            ResourceKey.create(Registries.MOB_EFFECT, GildedSeam.id("gilded")),
            new GildedEffect());

    private ModEffects() {
    }

    public static void init() {
        // Static initialisers run registration.
    }
}
