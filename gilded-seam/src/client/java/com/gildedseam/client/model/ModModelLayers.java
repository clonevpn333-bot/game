package com.gildedseam.client.model;

import com.gildedseam.GildedSeam;

import net.minecraft.client.model.geom.ModelLayerLocation;

public final class ModModelLayers {
    public static final ModelLayerLocation SHARDLING = layer("shardling");
    public static final ModelLayerLocation VESSEL = layer("vessel");
    public static final ModelLayerLocation PORCELAIN_HOUND = layer("porcelain_hound");
    public static final ModelLayerLocation SEAMSTRESS = layer("seamstress");
    public static final ModelLayerLocation KILNBORN = layer("kilnborn");
    public static final ModelLayerLocation CHIME = layer("chime");
    public static final ModelLayerLocation FONT_OF_GOLD = layer("font_of_gold");
    public static final ModelLayerLocation MANIFOLD = layer("manifold");
    public static final ModelLayerLocation RELIQUARY_COLOSSUS = layer("reliquary_colossus");
    public static final ModelLayerLocation PORCELAIN_AUTARCH = layer("porcelain_autarch");
    public static final ModelLayerLocation SALT_SWORN = layer("salt_sworn");
    public static final ModelLayerLocation GILDED_COW = layer("gilded_cow");
    public static final ModelLayerLocation GILDED_PIG = layer("gilded_pig");
    public static final ModelLayerLocation GILDED_SHEEP = layer("gilded_sheep");
    public static final ModelLayerLocation GILDED_CHICKEN = layer("gilded_chicken");
    public static final ModelLayerLocation GILDED_SPIDER = layer("gilded_spider");
    public static final ModelLayerLocation GILDED_CASK = layer("gilded_cask");
    public static final ModelLayerLocation REFUGEE = layer("refugee");
    public static final ModelLayerLocation GILT_MAD = layer("gilt_mad");
    public static final ModelLayerLocation HALF_SEWN = layer("half_sewn");

    private ModModelLayers() {
    }

    private static ModelLayerLocation layer(String name) {
        return new ModelLayerLocation(GildedSeam.id(name), "main");
    }
}
