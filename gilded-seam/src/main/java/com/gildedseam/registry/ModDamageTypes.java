package com.gildedseam.registry;

import com.gildedseam.GildedSeam;

import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.damagesource.DamageType;

/**
 * Damage type keys. The actual definitions live in data JSON
 * ({@code data/gildedseam/damage_type/}) so packs can tune them.
 */
public final class ModDamageTypes {
    /** Being sewn shut from the inside by the Gilded infection. */
    public static final ResourceKey<DamageType> GILDING =
            ResourceKey.create(Registries.DAMAGE_TYPE, GildedSeam.id("gilding"));

    /** Crushed by the Reliquary Colossus' idol arms. */
    public static final ResourceKey<DamageType> RELIQUARY_SLAM =
            ResourceKey.create(Registries.DAMAGE_TYPE, GildedSeam.id("reliquary_slam"));

    private ModDamageTypes() {
    }
}
