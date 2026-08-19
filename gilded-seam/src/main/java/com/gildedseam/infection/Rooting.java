package com.gildedseam.infection;

import java.util.Optional;

import net.minecraft.core.BlockPos;
import net.minecraft.resources.Identifier;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.world.level.levelgen.structure.templatesystem.StructureTemplate;
import net.minecraft.world.level.levelgen.structure.templatesystem.StructurePlaceSettings;

import com.gildedseam.GildedSeam;

/**
 * Puts the Mother Tree in the ground, once, when the world is first made.
 *
 * <p>It used to be an item you placed. That is the wrong shape for the thing
 * the entire mod grows out of: it made the source of the infection a decoration
 * the player chose to install, which is the opposite of how being infested
 * works. Nobody chooses. It is already there when you arrive.
 *
 * <p>So you spawn looking at it. The ground under it is wrong, the clearing
 * around it is quiet, and everything the blight does afterwards radiates from
 * this point - see {@link Blightfront}, which centres on the same place
 * precisely so that the tree and the front are the same fact seen two ways.
 *
 * <p>Placed from the structure template rather than generated as a worldgen
 * structure, because a worldgen structure lands where the generator decides and
 * this one has to land <em>here</em>.
 */
public final class Rooting {

    private Rooting() {
    }

    private static final Identifier TEMPLATE = GildedSeam.id("mother_tree");

    public static void onServerStarted(MinecraftServer server) {
        ServerLevel level = server.getLevel(Level.OVERWORLD);
        if (level == null) {
            return;
        }
        // Only on a genuinely new world. World age is the test rather than a
        // saved flag: a flag is one more thing that can fail to load across a
        // version bump, and "has this world been running for ten seconds" is
        // already persisted by the game and cannot disagree with itself.
        if (level.getGameTime() > 200L) {
            return;
        }
        // Where the front is centred, which is the origin - see Blightfront.
        BlockPos here = Blightfront.origin(level);
        plant(level, here);
        GildedSeam.LOGGER.info("The Mother Tree is rooted at ({}, {}).",
                here.getX(), here.getZ());
    }

    /**
     * Drops the template with its trunk on the surface at {@code centre}.
     *
     * <p>Failure here is not fatal and is not silent: a world without its tree
     * is a world where the blight has no visible source, and that is worth a
     * line in the log rather than a crash on world creation.
     */
    public static void plant(ServerLevel level, BlockPos centre) {
        Optional<StructureTemplate> loaded =
                level.getStructureManager().get(TEMPLATE);
        if (loaded.isEmpty()) {
            GildedSeam.LOGGER.warn("No {} template to plant; world spawn will have no tree.",
                    TEMPLATE);
            return;
        }
        StructureTemplate template = loaded.get();
        var size = template.getSize();
        // Centre the footprint on spawn, and sit it on the surface rather than
        // wherever the template's own origin happens to be.
        BlockPos corner = centre.offset(-size.getX() / 2, 0, -size.getZ() / 2);
        int surface = level.getHeight(Heightmap.Types.WORLD_SURFACE_WG,
                centre.getX(), centre.getZ());
        corner = new BlockPos(corner.getX(), surface - 2, corner.getZ());
        template.placeInWorld(level, corner, corner, new StructurePlaceSettings(),
                level.getRandom(), 2);
    }
}
