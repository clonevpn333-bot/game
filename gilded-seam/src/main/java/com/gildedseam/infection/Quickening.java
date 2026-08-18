package com.gildedseam.infection;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.Mth;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;

import com.gildedseam.registry.ModBlocks;

/**
 * The Quickening - the Mother Tree growing where you can watch it.
 *
 * <p>A structure that is simply pasted into the world has no weight. It is
 * there, and it always was. This grows instead: roots crawl out first and take
 * hold, the buttress swells, the trunk climbs a ring at a time with the bark
 * splitting audibly as it widens, the boughs are thrown out one after another,
 * and only then does the canopy close over the top. It takes about three
 * minutes and you can stand underneath the whole time.
 *
 * <p>The geometry is generated here rather than read from the structure
 * template on purpose. Growth needs an <em>order</em> - every block has to know
 * when its turn is - and that ordering is a property of how a tree is built,
 * not something recoverable from a finished template. So the same four
 * registers the template generator uses (buttress, shaft, flare, crown) are
 * reproduced here, and each block is stamped with the stage it belongs to.
 */
public final class Quickening {

    /** Blocks placed per tick at full speed. */
    private static final int RATE = 26;
    /** Ticks between stages, so each register reads as its own event. */
    private static final int STAGE_PAUSE = 22;

    private static final List<Quickening> ACTIVE = new ArrayList<>();

    /** One block of the tree, and when it is due. */
    private record Cell(BlockPos pos, BlockState state, int stage, double sort) { }

    private final ServerLevel level;
    private final BlockPos origin;
    private final List<Cell> cells;
    private int index;
    private int stage;
    private int pause;
    private int age;

    private Quickening(ServerLevel level, BlockPos origin) {
        this.level = level;
        this.origin = origin;
        this.cells = plan(origin);
    }

    public static void begin(ServerLevel level, BlockPos origin) {
        for (Quickening q : ACTIVE) {
            if (q.level == level && q.origin.closerThan(origin, 48)) {
                return;                       // one tree at a time in an area
            }
        }
        Quickening q = new Quickening(level, origin);
        ACTIVE.add(q);
        level.playSound(null, origin, SoundEvents.CREAKING_HEART_SPAWN,
                SoundSource.BLOCKS, 3.0F, 0.5F);
    }

    public static void stopAll() {
        ACTIVE.clear();
    }

    /** Hooked from {@code ServerTickEvents.END_SERVER_TICK}. */
    public static void tickAll(MinecraftServer server) {
        ACTIVE.removeIf(Quickening::tick);
    }

    public static boolean isGrowingNear(ServerLevel level, BlockPos pos) {
        for (Quickening q : ACTIVE) {
            if (q.level == level && q.origin.closerThan(pos, 64)) {
                return true;
            }
        }
        return false;
    }

    private boolean tick() {
        this.age++;
        if (this.pause > 0) {
            this.pause--;
            return false;
        }
        if (this.index >= this.cells.size()) {
            finish();
            return true;
        }

        // Ease in: the first seconds are slow, so the roots read individually.
        int budget = Math.max(4, Math.round(RATE * Math.min(1.0F, this.age / 90.0F)));
        int placed = 0;
        while (placed < budget && this.index < this.cells.size()) {
            Cell cell = this.cells.get(this.index);
            if (cell.stage() > this.stage) {
                // A whole register has finished. Breathe, then start the next.
                this.stage = cell.stage();
                this.pause = STAGE_PAUSE;
                announce(cell.stage());
                return false;
            }
            this.index++;
            if (!this.level.isLoaded(cell.pos())) {
                continue;
            }
            BlockState existing = this.level.getBlockState(cell.pos());
            if (existing.is(Blocks.BEDROCK)) {
                continue;
            }
            this.level.setBlock(cell.pos(), cell.state(), 3);
            placed++;
            if ((this.index & 3) == 0) {
                frontier(cell.pos());
            }
        }
        return false;
    }

    /** Dust and a creak at the growing edge, so you can see where it is. */
    private void frontier(BlockPos pos) {
        this.level.sendParticles(ParticleTypes.CRIMSON_SPORE,
                pos.getX() + 0.5, pos.getY() + 0.6, pos.getZ() + 0.5,
                3, 0.4, 0.4, 0.4, 0.01);
        if (this.level.getRandom().nextInt(14) == 0) {
            this.level.playSound(null, pos, SoundEvents.CREAKING_HEART_IDLE,
                    SoundSource.BLOCKS, 0.9F, 0.6F + this.level.getRandom().nextFloat() * 0.5F);
        }
    }

    private void announce(int stage) {
        BlockPos at = this.origin.above(stage * 8);
        this.level.playSound(null, at, SoundEvents.WOOD_BREAK, SoundSource.BLOCKS,
                4.0F, 0.42F);
        this.level.sendParticles(ParticleTypes.WHITE_ASH,
                this.origin.getX() + 0.5, this.origin.getY() + 6.0, this.origin.getZ() + 0.5,
                80, 9.0, 5.0, 9.0, 0.02);
    }

    private void finish() {
        this.level.playSound(null, this.origin, SoundEvents.CREAKING_HEART_SPAWN,
                SoundSource.BLOCKS, 5.0F, 0.35F);
        this.level.sendParticles(ParticleTypes.SCULK_SOUL,
                this.origin.getX() + 0.5, this.origin.getY() + 40.0, this.origin.getZ() + 0.5,
                160, 14.0, 18.0, 14.0, 0.05);
    }

    // -----------------------------------------------------------------------
    // The plan: every block, and the stage it belongs to.
    // -----------------------------------------------------------------------

    private static final int STAGE_ROOTS = 0;
    private static final int STAGE_BUTTRESS = 1;
    private static final int STAGE_SHAFT = 2;
    private static final int STAGE_BOUGHS = 3;
    private static final int STAGE_CANOPY = 4;

    private static List<Cell> plan(BlockPos origin) {
        List<Cell> out = new ArrayList<>();
        BlockState log = Blocks.PALE_OAK_LOG.defaultBlockState();
        BlockState wood = Blocks.PALE_OAK_WOOD.defaultBlockState();
        BlockState leaves = Blocks.PALE_OAK_LEAVES.defaultBlockState();
        BlockState resin = Blocks.RESIN_BLOCK.defaultBlockState();
        BlockState heart = ModBlocks.KILN_HEART.defaultBlockState();

        // --- roots: crawling outward along the ground ---------------------
        final int lobes = 11;
        for (int i = 0; i < lobes; i++) {
            double a = (Math.PI * 2 * i) / lobes;
            for (int step = 6; step < 30; step++) {
                double px = Math.sin(a) * step;
                double pz = Math.cos(a) * step;
                int h = Math.max(0, 4 - step / 6);
                for (int y = 0; y <= h; y++) {
                    out.add(new Cell(origin.offset((int) Math.round(px), y, (int) Math.round(pz)),
                            (step % 3 == 0) ? resin : log, STAGE_ROOTS, step));
                }
            }
        }

        // --- buttress and shaft: rings climbing the trunk ------------------
        for (int y = 0; y <= 46; y++) {
            double base = profile(y);
            double amp = lobing(y);
            int ri = (int) Math.ceil(base + amp) + 1;
            int stage = (y <= 14) ? STAGE_BUTTRESS : STAGE_SHAFT;
            for (int dx = -ri; dx <= ri; dx++) {
                for (int dz = -ri; dz <= ri; dz++) {
                    double d = Math.max(0.5, Math.sqrt(dx * dx + dz * dz));
                    double ang = Math.atan2(dx, dz);
                    double r = base + amp * Math.cos(lobes * ang + y * 0.055);
                    if (d > r) {
                        continue;
                    }
                    double inner = r - (y < 20 ? 7.0 : 5.0);
                    if (y < 20 && d < inner) {
                        continue;
                    }
                    if (y >= 20 && y <= 34 && d < r - 5.5) {
                        continue;
                    }
                    out.add(new Cell(origin.offset(dx, y, dz), log, stage, y));
                }
            }
            if (y % 4 == 0) {
                for (int k = 0; k < 5; k++) {
                    double a = (Math.PI * 2 * k) / 5 + y * 0.21;
                    out.add(new Cell(origin.offset((int) Math.round(Math.sin(a) * (base - 0.4)), y,
                            (int) Math.round(Math.cos(a) * (base - 0.4))), resin, stage, y));
                }
            }
            if (y == 16 || y == 25 || y == 34 || y == 43) {
                out.add(new Cell(origin.offset((int) base - 1, y, 0), heart, stage, y));
            }
        }

        // --- boughs: thrown out one at a time ------------------------------
        List<double[]> tips = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            double a = (Math.PI * 2 * i) / 8 + 0.26;
            double[] end = limb(out, origin, Math.sin(a) * 6, 39 + (i % 3) * 2, Math.cos(a) * 6,
                    a, 0.14, 26.0, 5.2, 2.4, wood, STAGE_BOUGHS, i);
            for (int j = -1; j <= 1; j += 2) {
                double[] e2 = limb(out, origin, end[0], end[1], end[2], a + j * 0.40, 0.34,
                        14.0, 2.4, 1.3, wood, STAGE_BOUGHS, i);
                tips.add(e2);
            }
        }
        tips.add(limb(out, origin, 0, 46, 0, 0.0, 1.45, 15.0, 3.0, 1.4, wood,
                STAGE_BOUGHS, 8));

        // --- canopy: closes over the top ----------------------------------
        for (double[] tip : tips) {
            blob(out, origin, tip[0], tip[1] + 5, tip[2], 6.2, leaves, STAGE_CANOPY);
        }
        final double RX = 29.0;
        final double RY = 17.0;
        for (int dx = -(int) RX - 1; dx <= RX + 1; dx++) {
            for (int dz = -(int) RX - 1; dz <= RX + 1; dz++) {
                for (int dy = 1; dy <= RY + 1; dy++) {
                    double q = (dx * dx + dz * dz) / (RX * RX) + (dy * dy) / (RY * RY);
                    if (q > 1.0 || q < 0.74) {
                        continue;
                    }
                    if ((dx * 5 + dy * 11 + dz * 7) % 7 == 0) {
                        continue;
                    }
                    out.add(new Cell(origin.offset(dx, 62 + dy, dz), leaves, STAGE_CANOPY,
                            Math.sqrt(dx * dx + dz * dz)));
                }
            }
        }

        // Within a stage, grow outward from the trunk and upward from the
        // ground, so the frontier is a wave rather than a scatter.
        out.sort(Comparator.<Cell>comparingInt(Cell::stage).thenComparingDouble(Cell::sort));
        return out;
    }

    private static double profile(int y) {
        if (y <= 14) {
            return 21.0 - 6.0 * Math.pow(y / 14.0, 0.75);
        }
        if (y <= 34) {
            return 15.0 - 6.2 * Math.pow((y - 14) / 20.0, 1.35);
        }
        return 8.8 + 1.9 * Math.pow(Math.min(1.0, (y - 34) / 12.0), 1.5);
    }

    private static double lobing(int y) {
        if (y <= 14) {
            return 4.2 - 1.4 * (y / 14.0);
        }
        if (y <= 34) {
            return 2.8 * (1.0 - (y - 14) / 20.0) + 0.6;
        }
        return 0.6;
    }

    private static double[] limb(List<Cell> out, BlockPos origin, double x, double y, double z,
            double yaw, double pitch, double length, double r0, double r1,
            BlockState mat, int stage, int order) {
        int steps = (int) (length * 1.6);
        double droop = 0.34;
        for (int i = 0; i <= steps; i++) {
            double f = (double) i / steps;
            double p = pitch + droop * f * f;
            double d = length * f;
            blob(out, origin,
                    x + Math.sin(yaw) * Math.cos(p) * d,
                    y + Math.sin(p) * d,
                    z + Math.cos(yaw) * Math.cos(p) * d,
                    r0 + (r1 - r0) * f, mat, stage, order * 100 + i);
        }
        double p = pitch + droop;
        return new double[]{x + Math.sin(yaw) * Math.cos(p) * length,
                y + Math.sin(p) * length,
                z + Math.cos(yaw) * Math.cos(p) * length};
    }

    private static void blob(List<Cell> out, BlockPos origin, double x, double y, double z,
            double r, BlockState mat, int stage) {
        blob(out, origin, x, y, z, r, mat, stage, Mth.floor(Math.sqrt(x * x + z * z)));
    }

    private static void blob(List<Cell> out, BlockPos origin, double x, double y, double z,
            double r, BlockState mat, int stage, double sort) {
        int ri = (int) Math.ceil(r);
        double rr = r * r;
        int cx = (int) Math.round(x);
        int cy = (int) Math.round(y);
        int cz = (int) Math.round(z);
        for (int dx = -ri; dx <= ri; dx++) {
            for (int dy = -ri; dy <= ri; dy++) {
                for (int dz = -ri; dz <= ri; dz++) {
                    if (dx * dx + dy * dy + dz * dz > rr) {
                        continue;
                    }
                    out.add(new Cell(origin.offset(cx + dx, cy + dy, cz + dz), mat, stage, sort));
                }
            }
        }
    }
}
