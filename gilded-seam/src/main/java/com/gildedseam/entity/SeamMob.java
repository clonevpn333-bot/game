package com.gildedseam.entity;

import com.gildedseam.GildedSeam;
import com.gildedseam.infection.SeamHelper;
import com.gildedseam.registry.ModEffects;
import com.gildedseam.registry.ModItems;

import net.minecraft.core.Holder;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.resources.Identifier;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.ServerLevelAccessor;
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
    private static final EntityDataAccessor<Boolean> DATA_OUTLIER =
            SynchedEntityData.defineId(SeamMob.class, EntityDataSerializers.BOOLEAN);

    private static final Identifier TIER_HEALTH_ID = GildedSeam.id("tier_health");
    private static final Identifier TIER_DAMAGE_ID = GildedSeam.id("tier_damage");
    private static final Identifier TIER_SCALE_ID = GildedSeam.id("tier_scale");
    private static final Identifier TIER_KNOCKBACK_ID = GildedSeam.id("tier_knockback");
    private static final Identifier OUTLIER_HEALTH_ID = GildedSeam.id("outlier_health");
    private static final Identifier OUTLIER_DAMAGE_ID = GildedSeam.id("outlier_damage");
    private static final Identifier OUTLIER_SCALE_ID = GildedSeam.id("outlier_scale");

    /** One firing in fifty comes out of the kiln wrong — and much worse. */
    private static final float OUTLIER_CHANCE = 0.02F;

    protected SeamMob(EntityType<? extends Monster> type, Level level) {
        super(type, level);
    }

    // --- Firing tier ---------------------------------------------------------

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder builder) {
        super.defineSynchedData(builder);
        builder.define(DATA_TIER, (byte) 0);
        builder.define(DATA_OUTLIER, false);
    }

    // --- Outliers ------------------------------------------------------------

    public boolean isOutlier() {
        return this.entityData.get(DATA_OUTLIER);
    }

    /** Marks this creature as a misfiring: twice the body, twice the spite. */
    public void setOutlier(boolean outlier) {
        this.entityData.set(DATA_OUTLIER, outlier);
        this.setOrReplaceModifier(Attributes.MAX_HEALTH, OUTLIER_HEALTH_ID,
                outlier ? 1.0 : 0.0, AttributeModifier.Operation.ADD_MULTIPLIED_BASE);
        this.setOrReplaceModifier(Attributes.ATTACK_DAMAGE, OUTLIER_DAMAGE_ID,
                outlier ? 0.5 : 0.0, AttributeModifier.Operation.ADD_MULTIPLIED_BASE);
        this.setOrReplaceModifier(Attributes.SCALE, OUTLIER_SCALE_ID,
                outlier ? 0.3 : 0.0, AttributeModifier.Operation.ADD_MULTIPLIED_BASE);
        if (outlier) {
            this.setGlowingTag(true);
            this.setCustomName(net.minecraft.network.chat.Component.translatable(
                    "entity.gildedseam.outlier", this.getType().getDescription()));
            this.setHealth(this.getMaxHealth());
        }
    }

    @Override
    protected void dropCustomDeathLoot(ServerLevel level, DamageSource source, boolean recentlyHit) {
        super.dropCustomDeathLoot(level, source, recentlyHit);
        if (this.isOutlier()) {
            this.spawnAtLocation(level, new net.minecraft.world.item.ItemStack(
                    net.minecraft.world.item.Items.GOLD_INGOT, 2 + this.random.nextInt(3)));
            this.spawnAtLocation(level, new net.minecraft.world.item.ItemStack(
                    ModItems.GOLD_THREAD, 1 + this.random.nextInt(2)));
        }
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
            Identifier id, double amount, AttributeModifier.Operation operation) {
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
        if (this.random.nextFloat() < OUTLIER_CHANCE) {
            this.setOutlier(true);
        }
        return data;
    }

    @Override
    protected void addAdditionalSaveData(ValueOutput output) {
        super.addAdditionalSaveData(output);
        output.putInt("SeamTier", this.getTier());
        output.putBoolean("Outlier", this.isOutlier());
    }

    @Override
    protected void readAdditionalSaveData(ValueInput input) {
        super.readAdditionalSaveData(input);
        this.setTier(input.getIntOr("SeamTier", 0));
        if (input.getBooleanOr("Outlier", false)) {
            this.setOutlier(true);
        }
    }

    // --- Combat -----------------------------------------------------------------

    @Override
    public boolean hurtServer(ServerLevel level, DamageSource source, float amount) {
        // The kintsugi blade knows where the seams are.
        if (source.getEntity() instanceof LivingEntity attacker
                && attacker.getMainHandItem().is(ModItems.KINTSUGI_BLADE)) {
            amount *= 1.5F;
        }
        boolean hurt = super.hurtServer(level, source, amount);
        // Nothing of the blight is hurt privately: the neighbourhood answers.
        if (hurt && source.getEntity() instanceof LivingEntity caller) {
            com.gildedseam.infection.HordeCall.answer(this, level, caller);
        }
        return hurt;
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
