package com.gildedseam.infection;

import com.gildedseam.entity.SeamMob;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.phys.AABB;

/**
 * The Call of the Horde.
 *
 * <p>Hitting one seam creature is never a private transaction. The struck
 * creature screams, and everything of the blight inside earshot turns, picks
 * up your scent and comes - which is what makes a scattered handful of mobs
 * feel like an army rather than a set of independent encounters.
 *
 * <p>The horde also remembers. Every seam creature that dies feeds a running
 * <em>pressure</em> count, and once enough of them have died the blight starts
 * firing its replacements hotter: pressure raises the minimum tier of anything
 * new, so a long war of attrition makes the enemy worse, not better. That is
 * the escalation loop - you cannot grind the infection down.
 */
public final class HordeCall {
    /** How far a scream carries. */
    private static final double CALL_RADIUS = 28.0;
    /** Seam deaths needed per step of escalation. */
    private static final int PRESSURE_PER_STEP = 40;
    private static final int MAX_STEPS = 2;

    private static int pressure;
    private static long lastCallTick;

    private HordeCall() {
    }

    /**
     * Called when a seam creature is struck. Turns the neighbourhood onto the
     * attacker and gives it the brief burst of speed that reads, in play, as
     * the horde noticing you.
     */
    public static void answer(SeamMob victim, ServerLevel level, LivingEntity attacker) {
        if (attacker == null || attacker instanceof SeamMob) {
            return;
        }
        // One call per creature per second at most: a mob taking a flurry of
        // hits should not scream once per hit.
        long now = level.getGameTime();
        if (now - lastCallTick < 20L && lastCallTick != 0L) {
            return;
        }
        lastCallTick = now;

        AABB earshot = victim.getBoundingBox().inflate(CALL_RADIUS);
        int answered = 0;
        for (SeamMob ally : level.getEntitiesOfClass(SeamMob.class, earshot)) {
            if (ally == victim || !ally.isAlive()) {
                continue;
            }
            if (ally.getTarget() == null || ally.getTarget() != attacker) {
                ally.setTarget(attacker);
            }
            ally.addEffect(new MobEffectInstance(MobEffects.SPEED, 120, 0), victim);
            answered++;
        }

        level.playSound(null, victim.blockPosition(), SoundEvents.WARDEN_SONIC_CHARGE,
                SoundSource.HOSTILE, 0.7F, 1.5F);
        level.sendParticles(ParticleTypes.SCULK_SOUL,
                victim.getX(), victim.getY() + 0.9, victim.getZ(),
                6 + Math.min(answered, 12), 0.4, 0.3, 0.4, 0.02);
    }

    /** Every seam death feeds the pressure that fires the next one hotter. */
    public static void feed() {
        pressure++;
    }

    /** How many tiers the horde's accumulated pressure adds to new creatures. */
    public static int tierBonus() {
        return Math.min(MAX_STEPS, pressure / PRESSURE_PER_STEP);
    }

    public static int pressure() {
        return pressure;
    }

    /** Used when the Rivening finishes: the horde loses its memory with it. */
    public static void reset() {
        pressure = 0;
        lastCallTick = 0L;
    }
}
