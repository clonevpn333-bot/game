package com.gildedseam.registry;

import com.gildedseam.GildedSeam;
import com.gildedseam.entity.ChimeEntity;
import com.gildedseam.entity.FontOfGoldEntity;
import com.gildedseam.entity.KilnbornEntity;
import com.gildedseam.entity.ManifoldEntity;
import com.gildedseam.entity.PorcelainHoundEntity;
import com.gildedseam.entity.ReliquaryColossusEntity;
import com.gildedseam.entity.SeamstressEntity;
import com.gildedseam.entity.ShardlingEntity;
import com.gildedseam.entity.VesselEntity;

import net.fabricmc.fabric.api.object.builder.v1.entity.FabricDefaultAttributeRegistry;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.item.Item;

public final class ModEntities {

    // --- Stage I: Hairline --------------------------------------------------

    public static final EntityType<ShardlingEntity> SHARDLING = register("shardling",
            EntityType.Builder.of(ShardlingEntity::new, MobCategory.MONSTER)
                    .sized(0.75F, 0.55F).eyeHeight(0.4F).clientTrackingRange(8));

    public static final EntityType<VesselEntity> VESSEL = register("vessel",
            EntityType.Builder.of(VesselEntity::new, MobCategory.MONSTER)
                    .sized(0.6F, 1.9F).eyeHeight(1.62F).clientTrackingRange(8));

    public static final EntityType<PorcelainHoundEntity> PORCELAIN_HOUND = register("porcelain_hound",
            EntityType.Builder.of(PorcelainHoundEntity::new, MobCategory.MONSTER)
                    .sized(0.95F, 1.15F).eyeHeight(0.95F).clientTrackingRange(8));

    // --- Stage II: Crazing ----------------------------------------------------

    public static final EntityType<SeamstressEntity> SEAMSTRESS = register("seamstress",
            EntityType.Builder.of(SeamstressEntity::new, MobCategory.MONSTER)
                    .sized(0.7F, 2.45F).eyeHeight(2.15F).clientTrackingRange(10));

    public static final EntityType<KilnbornEntity> KILNBORN = register("kilnborn",
            EntityType.Builder.of(KilnbornEntity::new, MobCategory.MONSTER)
                    .sized(1.2F, 2.35F).eyeHeight(2.0F).fireImmune().clientTrackingRange(10));

    public static final EntityType<ChimeEntity> CHIME = register("chime",
            EntityType.Builder.of(ChimeEntity::new, MobCategory.MONSTER)
                    .sized(0.85F, 0.9F).eyeHeight(0.5F).clientTrackingRange(10));

    public static final EntityType<FontOfGoldEntity> FONT_OF_GOLD = register("font_of_gold",
            EntityType.Builder.of(FontOfGoldEntity::new, MobCategory.MONSTER)
                    .sized(1.1F, 1.7F).eyeHeight(1.3F).clientTrackingRange(10));

    // --- Stage III: Lustre -----------------------------------------------------

    public static final EntityType<ManifoldEntity> MANIFOLD = register("manifold",
            EntityType.Builder.of(ManifoldEntity::new, MobCategory.MONSTER)
                    .sized(1.5F, 1.7F).eyeHeight(1.1F).clientTrackingRange(10));

    public static final EntityType<ReliquaryColossusEntity> RELIQUARY_COLOSSUS = register("reliquary_colossus",
            EntityType.Builder.of(ReliquaryColossusEntity::new, MobCategory.MONSTER)
                    .sized(1.9F, 3.7F).eyeHeight(3.2F).fireImmune().clientTrackingRange(12));

    // --- Spawn eggs ----------------------------------------------------------

    public static final Item SHARDLING_SPAWN_EGG = ModItems.registerSpawnEgg("shardling", SHARDLING);
    public static final Item VESSEL_SPAWN_EGG = ModItems.registerSpawnEgg("vessel", VESSEL);
    public static final Item PORCELAIN_HOUND_SPAWN_EGG = ModItems.registerSpawnEgg("porcelain_hound", PORCELAIN_HOUND);
    public static final Item SEAMSTRESS_SPAWN_EGG = ModItems.registerSpawnEgg("seamstress", SEAMSTRESS);
    public static final Item KILNBORN_SPAWN_EGG = ModItems.registerSpawnEgg("kilnborn", KILNBORN);
    public static final Item CHIME_SPAWN_EGG = ModItems.registerSpawnEgg("chime", CHIME);
    public static final Item FONT_OF_GOLD_SPAWN_EGG = ModItems.registerSpawnEgg("font_of_gold", FONT_OF_GOLD);
    public static final Item MANIFOLD_SPAWN_EGG = ModItems.registerSpawnEgg("manifold", MANIFOLD);
    public static final Item RELIQUARY_COLOSSUS_SPAWN_EGG =
            ModItems.registerSpawnEgg("reliquary_colossus", RELIQUARY_COLOSSUS);

    private ModEntities() {
    }

    private static <T extends Entity> EntityType<T> register(String name, EntityType.Builder<T> builder) {
        ResourceKey<EntityType<?>> key = ResourceKey.create(Registries.ENTITY_TYPE, GildedSeam.id(name));
        return Registry.register(BuiltInRegistries.ENTITY_TYPE, key, builder.build(key));
    }

    public static void init() {
        FabricDefaultAttributeRegistry.register(SHARDLING, ShardlingEntity.createAttributes());
        FabricDefaultAttributeRegistry.register(VESSEL, VesselEntity.createAttributes());
        FabricDefaultAttributeRegistry.register(PORCELAIN_HOUND, PorcelainHoundEntity.createAttributes());
        FabricDefaultAttributeRegistry.register(SEAMSTRESS, SeamstressEntity.createAttributes());
        FabricDefaultAttributeRegistry.register(KILNBORN, KilnbornEntity.createAttributes());
        FabricDefaultAttributeRegistry.register(CHIME, ChimeEntity.createAttributes());
        FabricDefaultAttributeRegistry.register(FONT_OF_GOLD, FontOfGoldEntity.createAttributes());
        FabricDefaultAttributeRegistry.register(MANIFOLD, ManifoldEntity.createAttributes());
        FabricDefaultAttributeRegistry.register(RELIQUARY_COLOSSUS, ReliquaryColossusEntity.createAttributes());
    }
}
