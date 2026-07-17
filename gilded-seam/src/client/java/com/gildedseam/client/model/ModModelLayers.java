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

    private ModModelLayers() {
    }

    private static ModelLayerLocation layer(String name) {
        return new ModelLayerLocation(GildedSeam.id(name), "main");
    }
}
