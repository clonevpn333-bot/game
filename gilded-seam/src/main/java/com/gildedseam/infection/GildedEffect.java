package com.gildedseam.infection;

import com.gildedseam.GildedSeam;
import com.gildedseam.registry.ModDamageTypes;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectCategory;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;

/**
 * The Gilded infection. Golden thread works its way under the skin,
 * stiffening joints (movement slow per level) and, at Stoneware strength
 * and beyond (amplifier &ge; 1), sewing shut something vital every few
 * seconds. Dying while Gilded near the Seam is how new vessels are made —
 * see {@link SeamConversion}.
 */
public class GildedEffect extends MobEffect {
    private static final int PULSE_INTERVAL = 40;

    public GildedEffect() {
        super(MobEffectCategory.HARMFUL, 0xE8B84B);
        this.addAttributeModifier(
                Attributes.MOVEMENT_SPEED,
                GildedSeam.id("effect.gilded_stiffness"),
                -0.08,
                AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL);
    }

    @Override
    public boolean applyEffectTick(ServerLevel level, LivingEntity entity, int amplifier) {
        if (amplifier >= 1) {
            entity.hurtServer(level, level.damageSources().source(ModDamageTypes.GILDING), 1.0F + amplifier);
        }
        level.sendParticles(ParticleTypes.WAX_ON,
                entity.getX(), entity.getY() + entity.getBbHeight() * 0.5, entity.getZ(),
                3 + amplifier * 2, 0.3, 0.4, 0.3, 0.0);
        if (entity.getRandom().nextInt(4) == 0) {
            level.playSound(null, entity.blockPosition(), SoundEvents.AMETHYST_BLOCK_CHIME,
                    SoundSource.HOSTILE, 0.35F, 0.6F + entity.getRandom().nextFloat() * 0.3F);
        }
        return true;
    }

    @Override
    public boolean shouldApplyEffectTickThisTick(int duration, int amplifier) {
        return duration % PULSE_INTERVAL == 0;
    }
}
