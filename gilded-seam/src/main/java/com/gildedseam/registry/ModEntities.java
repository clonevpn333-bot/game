package com.gildedseam.registry;

import com.gildedseam.GildedSeam;
import com.gildedseam.entity.ChimeEntity;
import com.gildedseam.entity.FontOfGoldEntity;
import com.gildedseam.entity.GildedBeastEntity;
import com.gildedseam.entity.GiltMadEntity;
import com.gildedseam.entity.HalfSewnEntity;
import com.gildedseam.entity.PorcelainAutarchEntity;
import com.gildedseam.entity.RefugeeEntity;
import com.gildedseam.entity.SaltDartEntity;
import com.gildedseam.entity.SaltSwornEntity;
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

    /** The Overlord King, enthroned in the Gilded Palace. */
    public static final EntityType<PorcelainAutarchEntity> PORCELAIN_AUTARCH = register("porcelain_autarch",
            EntityType.Builder.of(PorcelainAutarchEntity::new, MobCategory.MONSTER)
                    .sized(2.4F, 5.4F).eyeHeight(4.6F).fireImmune().clientTrackingRange(16));

    // --- The gilded livestock: every farmyard shape, kept -------------------

    public static final EntityType<GildedBeastEntity> GILDED_COW = beast("gilded_cow", 1.25F, 1.6F);
    public static final EntityType<GildedBeastEntity> GILDED_PIG = beast("gilded_pig", 0.9F, 1.15F);
    public static final EntityType<GildedBeastEntity> GILDED_SHEEP = beast("gilded_sheep", 0.9F, 1.3F);
    public static final EntityType<GildedBeastEntity> GILDED_CHICKEN = beast("gilded_chicken", 0.5F, 0.9F);
    public static final EntityType<GildedBeastEntity> GILDED_SPIDER = beast("gilded_spider", 1.3F, 0.9F);
    public static final EntityType<GildedBeastEntity> GILDED_CASK = beast("gilded_cask", 0.7F, 1.8F);
    public static final EntityType<GildedBeastEntity> GILDED_WOLF = beast("gilded_wolf", 0.7F, 1.0F);
    public static final EntityType<GildedBeastEntity> GILDED_GOAT = beast("gilded_goat", 0.95F, 1.35F);
    public static final EntityType<GildedBeastEntity> GILDED_HARE = beast("gilded_hare", 0.5F, 0.6F);

    // --- The folk -------------------------------------------------------------

    public static final EntityType<RefugeeEntity> REFUGEE = register("refugee",
            EntityType.Builder.of(RefugeeEntity::new, MobCategory.CREATURE)
                    .sized(0.6F, 1.9F).eyeHeight(1.65F).clientTrackingRange(8));

    public static final EntityType<GiltMadEntity> GILT_MAD = register("gilt_mad",
            EntityType.Builder.of(GiltMadEntity::new, MobCategory.CREATURE)
                    .sized(0.6F, 1.9F).eyeHeight(1.65F).clientTrackingRange(8));

    public static final EntityType<HalfSewnEntity> HALF_SEWN = register("half_sewn",
            EntityType.Builder.of(HalfSewnEntity::new, MobCategory.MONSTER)
                    .sized(0.6F, 1.9F).eyeHeight(1.62F).clientTrackingRange(8));

    private static EntityType<GildedBeastEntity> beast(String name, float width, float height) {
        return register(name, EntityType.Builder.of(GildedBeastEntity::new, MobCategory.MONSTER)
                .sized(width, height).clientTrackingRange(8));
    }

    // --- The living ----------------------------------------------------------

    public static final EntityType<SaltSwornEntity> SALT_SWORN = register("salt_sworn",
            EntityType.Builder.of(SaltSwornEntity::new, MobCategory.CREATURE)
                    .sized(0.6F, 1.9F).eyeHeight(1.65F).clientTrackingRange(8));

    public static final EntityType<SaltDartEntity> SALT_DART = register("salt_dart",
            EntityType.Builder.<SaltDartEntity>of(SaltDartEntity::new, MobCategory.MISC)
                    .sized(0.25F, 0.25F).clientTrackingRange(4).updateInterval(10));

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
    public static final Item PORCELAIN_AUTARCH_SPAWN_EGG =
            ModItems.registerSpawnEgg("porcelain_autarch", PORCELAIN_AUTARCH);
    public static final Item SALT_SWORN_SPAWN_EGG = ModItems.registerSpawnEgg("salt_sworn", SALT_SWORN);
    public static final Item GILDED_COW_SPAWN_EGG = ModItems.registerSpawnEgg("gilded_cow", GILDED_COW);
    public static final Item GILDED_PIG_SPAWN_EGG = ModItems.registerSpawnEgg("gilded_pig", GILDED_PIG);
    public static final Item GILDED_SHEEP_SPAWN_EGG = ModItems.registerSpawnEgg("gilded_sheep", GILDED_SHEEP);
    public static final Item GILDED_CHICKEN_SPAWN_EGG = ModItems.registerSpawnEgg("gilded_chicken", GILDED_CHICKEN);
    public static final Item GILDED_SPIDER_SPAWN_EGG = ModItems.registerSpawnEgg("gilded_spider", GILDED_SPIDER);
    public static final Item GILDED_CASK_SPAWN_EGG = ModItems.registerSpawnEgg("gilded_cask", GILDED_CASK);
    public static final Item GILDED_WOLF_SPAWN_EGG = ModItems.registerSpawnEgg("gilded_wolf", GILDED_WOLF);
    public static final Item GILDED_GOAT_SPAWN_EGG = ModItems.registerSpawnEgg("gilded_goat", GILDED_GOAT);
    public static final Item GILDED_HARE_SPAWN_EGG = ModItems.registerSpawnEgg("gilded_hare", GILDED_HARE);
    public static final Item REFUGEE_SPAWN_EGG = ModItems.registerSpawnEgg("refugee", REFUGEE);
    public static final Item GILT_MAD_SPAWN_EGG = ModItems.registerSpawnEgg("gilt_mad", GILT_MAD);
    public static final Item HALF_SEWN_SPAWN_EGG = ModItems.registerSpawnEgg("half_sewn", HALF_SEWN);

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
        FabricDefaultAttributeRegistry.register(PORCELAIN_AUTARCH, PorcelainAutarchEntity.createAttributes());
        FabricDefaultAttributeRegistry.register(SALT_SWORN, SaltSwornEntity.createAttributes());
        FabricDefaultAttributeRegistry.register(GILDED_COW, GildedBeastEntity.createAttributes(30.0, 0.28, 6.0));
        FabricDefaultAttributeRegistry.register(GILDED_PIG, GildedBeastEntity.createAttributes(24.0, 0.3, 5.0));
        FabricDefaultAttributeRegistry.register(GILDED_SHEEP, GildedBeastEntity.createAttributes(22.0, 0.3, 4.0));
        FabricDefaultAttributeRegistry.register(GILDED_CHICKEN, GildedBeastEntity.createAttributes(12.0, 0.34, 3.0));
        FabricDefaultAttributeRegistry.register(GILDED_SPIDER, GildedBeastEntity.createAttributes(20.0, 0.34, 5.0));
        FabricDefaultAttributeRegistry.register(GILDED_CASK, GildedBeastEntity.createAttributes(26.0, 0.3, 6.0));
        FabricDefaultAttributeRegistry.register(GILDED_WOLF, GildedBeastEntity.createAttributes(24.0, 0.36, 7.0));
        FabricDefaultAttributeRegistry.register(GILDED_GOAT, GildedBeastEntity.createAttributes(26.0, 0.3, 6.0));
        FabricDefaultAttributeRegistry.register(GILDED_HARE, GildedBeastEntity.createAttributes(14.0, 0.42, 4.0));
        FabricDefaultAttributeRegistry.register(REFUGEE, RefugeeEntity.createAttributes());
        FabricDefaultAttributeRegistry.register(GILT_MAD, GiltMadEntity.createAttributes());
        FabricDefaultAttributeRegistry.register(HALF_SEWN, HalfSewnEntity.createAttributes());
    }
}
