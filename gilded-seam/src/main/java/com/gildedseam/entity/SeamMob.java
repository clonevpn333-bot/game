package com.gildedseam.entity;

import com.gildedseam.GildedSeam;
import com.gildedseam.infection.SeamHelper;
import com.gildedseam.registry.ModEffects;
import com.gildedseam.registry.ModItems;

import net.minecraft.core.Holder;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerLevelAccessor;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.util.Mth;
import net.minecraft.world.DifficultyInstance;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.SpawnGroupData;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;

import org.jetbrains.annotations.Nullable;

/**
 * Base class for every creature of the Gilded Seam.
 *
 * <p>All seam mobs carry a synced <b>firing tier</b>:</p>
 * <ul>
 *   <li><b>0 — Bisque:</b> fresh from the kiln, matte and brittle.</li>
 *   <li><b>1 — Stoneware:</b> refired. Larger, harder, meaner.</li>
 *   <li><b>2 — Lustre:</b> fired until the glaze runs gold. Larger again,
 *       heavily gilded, and on some species the Seam stops pretending
 *       anatomy matters — extra limbs erupt along the seams.</li>
 * </ul>
 *
 * <p>Tier is rolled at spawn from local Seam saturation ({@link SeamHelper}),
 * so outbreaks escalate where they are left to feed.</p>
 */
public abstract class SeamMob extends Monster {
    private static final EntityDataAccessor<Byte> DATA_TIER =
            SynchedEntityData.defineId(SeamMob.class, EntityDataSerializers.BYTE);

    private static final ResourceLocation TIER_HEALTH_ID = GildedSeam.id("tier_health");
    private static final ResourceLocation TIER_DAMAGE_ID = GildedSeam.id("tier_damage");
    private static final ResourceLocation TIER_SCALE_ID = GildedSeam.id("tier_scale");
    private static final ResourceLocation TIER_KNOCKBACK_ID = GildedSeam.id("tier_knockback");

    protected SeamMob(EntityType<? extends Monster> type, Level level) {
        super(type, level);
    }

    // --- Firing tier ---------------------------------------------------------

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder builder) {
        super.defineSynchedData(builder);
        builder.define(DATA_TIER, (byte) 0);
    }

    public int getTier() {
        return this.entityData.get(DATA_TIER);
    }

    public void setTier(int tier) {
        tier = Mth.clamp(tier, SeamHelper.TIER_BISQUE, SeamHelper.TIER_LUSTRE);
        this.entityData.set(DATA_TIER, (byte) tier);
        this.applyTierModifiers(tier);
        this.setHealth(this.getMaxHealth());
    }

    /** The lowest tier this species can be fired at. */
    protected int minimumTier() {
        return SeamHelper.TIER_BISQUE;
    }

    /** How much the body grows per tier. Species override to taste. */
    protected double tierScaleStep() {
        return 0.16;
    }

    protected void applyTierModifiers(int tier) {
        this.setOrReplaceModifier(Attributes.MAX_HEALTH, TIER_HEALTH_ID,
                0.40 * tier, AttributeModifier.Operation.ADD_MULTIPLIED_BASE);
        this.setOrReplaceModifier(Attributes.ATTACK_DAMAGE, TIER_DAMAGE_ID,
                0.35 * tier, AttributeModifier.Operation.ADD_MULTIPLIED_BASE);
        this.setOrReplaceModifier(Attributes.SCALE, TIER_SCALE_ID,
                this.tierScaleStep() * tier, AttributeModifier.Operation.ADD_MULTIPLIED_BASE);
        this.setOrReplaceModifier(Attributes.KNOCKBACK_RESISTANCE, TIER_KNOCKBACK_ID,
                0.25 * tier, AttributeModifier.Operation.ADD_VALUE);
    }

    private void setOrReplaceModifier(Holder<net.minecraft.world.entity.ai.attributes.Attribute> attribute,
            ResourceLocation id, double amount, AttributeModifier.Operation operation) {
        AttributeInstance instance = this.getAttribute(attribute);
        if (instance == null) {
            return;
        }
        instance.removeModifier(id);
        if (amount != 0.0) {
            instance.addPermanentModifier(new AttributeModifier(id, amount, operation));
        }
    }

    // --- Spawning / persistence -----------------------------------------------

    @Override
    @Nullable
    public SpawnGroupData finalizeSpawn(ServerLevelAccessor level, DifficultyInstance difficulty,
            EntitySpawnReason spawnReason, @Nullable SpawnGroupData spawnGroupData) {
        SpawnGroupData data = super.finalizeSpawn(level, difficulty, spawnReason, spawnGroupData);
        int rolled = SeamHelper.rollTier(level, this.blockPosition(), this.random);
        this.setTier(Math.max(rolled, this.minimumTier()));
        return data;
    }

    @Override
    protected void addAdditionalSaveData(ValueOutput output) {
        super.addAdditionalSaveData(output);
        output.putInt("SeamTier", this.getTier());
    }

    @Override
    protected void readAdditionalSaveData(ValueInput input) {
        super.readAdditionalSaveData(input);
        this.setTier(input.getIntOr("SeamTier", 0));
    }

    // --- Combat -----------------------------------------------------------------

    @Override
    public boolean hurtServer(ServerLevel level, DamageSource source, float amount) {
        // The kintsugi blade knows where the seams are.
        if (source.getEntity() instanceof LivingEntity attacker
                && attacker.getMainHandItem().is(ModItems.KINTSUGI_BLADE)) {
            amount *= 1.5F;
        }
        return super.hurtServer(level, source, amount);
    }

    @Override
    public boolean canBeAffected(MobEffectInstance effect) {
        // Porcelain neither bleeds nor rots — and the thread cannot re-stitch itself.
        if (effect.is(ModEffects.GILDED)
                || effect.is(net.minecraft.world.effect.MobEffects.POISON)) {
            return false;
        }
        return super.canBeAffected(effect);
    }

    // --- Presentation --------------------------------------------------------------

    @Override
    protected SoundEvent getHurtSound(DamageSource source) {
        return SoundEvents.DECORATED_POT_HIT;
    }

    @Override
    protected SoundEvent getDeathSound() {
        return SoundEvents.DECORATED_POT_SHATTER;
    }

    @Override
    protected void playStepSound(BlockPos pos, BlockState state) {
        this.playSound(SoundEvents.DECORATED_POT_STEP, 0.35F, 0.9F + this.random.nextFloat() * 0.2F);
    }
}
