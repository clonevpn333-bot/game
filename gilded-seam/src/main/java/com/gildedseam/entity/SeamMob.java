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
    /** Down but not finished. The client renders the collapse from this. */
    private static final EntityDataAccessor<Boolean> DATA_DOWNED =
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

    /** How long a body lies there before it gets back up. */
    public static final int RISE_DELAY = 1200;          // one minute

    private int downedTicks;

    protected SeamMob(EntityType<? extends Monster> type, Level level) {
        super(type, level);
    }

    public boolean isDowned() {
        return this.entityData.get(DATA_DOWNED);
    }

    /** Ticks left before it rises, for the renderer to lean on. */
    public int getDownedTicks() {
        return this.downedTicks;
    }

    /**
     * Whether this one can still come back. The Creaking is exempt - a boss
     * that refuses to die is a chore, not a threat - and so is anything that
     * has already been through it and come out at full maturity.
     */
    protected boolean canRise() {
        return this.getTier() < SeamHelper.TIER_LUSTRE;
    }

    /**
     * Killing a seam mob does not finish it.
     *
     * <p>It falls where it stood and lies there for a full minute, and then it
     * gets up faster, angrier and one stage further gone, with the abilities
     * that stage brings. The corpse is the fight's clock: a minute is long
     * enough to break contact, loot, reposition or run, and short enough that
     * standing still is never the answer.
     *
     * <p>A body on the floor can be <b>finished</b> - see
     * {@code finish} - which is the only way to make a kill permanent before
     * full maturity, and the reason to carry rivening salt.
     */
    private void goDown(ServerLevel level, DamageSource source) {
        this.entityData.set(DATA_DOWNED, true);
        this.downedTicks = RISE_DELAY;
        this.setHealth(1.0F);
        this.setTarget(null);
        this.getNavigation().stop();
        this.setDeltaMovement(net.minecraft.world.phys.Vec3.ZERO);
        this.setNoAi(true);
        level.broadcastEntityEvent(this, (byte) 61);     // client: play the fall
        level.playSound(null, this.blockPosition(), SoundEvents.DECORATED_POT_SHATTER,
                net.minecraft.sounds.SoundSource.HOSTILE, 1.2F, 0.55F);
        level.sendParticles(net.minecraft.core.particles.ParticleTypes.FALLING_HONEY,
                this.getX(), this.getY() + this.getBbHeight() * 0.4, this.getZ(),
                30, 0.4, 0.3, 0.4, 0.02);
    }

    /** Puts a downed body out for good. */
    public void finish(ServerLevel level) {
        this.entityData.set(DATA_DOWNED, false);
        this.downedTicks = 0;
        this.setNoAi(false);
        level.sendParticles(net.minecraft.core.particles.ParticleTypes.ASH,
                this.getX(), this.getY() + 0.4, this.getZ(), 40, 0.5, 0.4, 0.5, 0.03);
        level.playSound(null, this.blockPosition(), SoundEvents.AMETHYST_CLUSTER_BREAK,
                net.minecraft.sounds.SoundSource.HOSTILE, 1.4F, 0.5F);
        this.setHealth(0.0F);
        this.die(this.damageSources().genericKill());
    }

    private void rise(ServerLevel level) {
        this.entityData.set(DATA_DOWNED, false);
        this.setNoAi(false);
        this.setTier(Math.min(SeamHelper.TIER_LUSTRE, this.getTier() + 1));
        this.setHealth(this.getMaxHealth());
        this.addEffect(new MobEffectInstance(
                net.minecraft.world.effect.MobEffects.SPEED, 400, 1));
        this.addEffect(new MobEffectInstance(
                net.minecraft.world.effect.MobEffects.RESISTANCE, 200, 0));
        level.broadcastEntityEvent(this, (byte) 62);      // client: play the rise
        level.playSound(null, this.blockPosition(), SoundEvents.CREAKING_HEART_SPAWN,
                net.minecraft.sounds.SoundSource.HOSTILE, 1.6F, 0.6F);
        level.sendParticles(net.minecraft.core.particles.ParticleTypes.SCULK_SOUL,
                this.getX(), this.getY() + this.getBbHeight() * 0.5, this.getZ(),
                50, 0.5, 0.6, 0.5, 0.05);
        // Whatever put it down is the first thing it looks for.
        Player nearest = level.getNearestPlayer(this, 24.0);
        if (nearest != null) {
            this.setTarget(nearest);
        }
    }

    // --- Firing tier ---------------------------------------------------------

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder builder) {
        builder.define(DATA_DOWNED, false);
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
        // A body on the floor. Rivening salt or the kintsugi blade ends it for
        // good; anything else is wasted on it, and it will get up.
        if (this.isDowned()) {
            if (source.getEntity() instanceof LivingEntity finisher
                    && (finisher.getMainHandItem().is(ModItems.RIVENING_SALT)
                        || finisher.getMainHandItem().is(ModItems.KINTSUGI_BLADE))) {
                this.finish(level);
                return true;
            }
            return false;
        }
        // The kintsugi blade knows where the seams are.
        if (source.getEntity() instanceof LivingEntity attacker
                && attacker.getMainHandItem().is(ModItems.KINTSUGI_BLADE)) {
            amount *= 1.5F;
        }
        // Lethal, but not final: it goes down and the clock starts.
        if (this.canRise() && amount >= this.getHealth()
                && !source.is(net.minecraft.tags.DamageTypeTags.BYPASSES_INVULNERABILITY)) {
            this.goDown(level, source);
            if (source.getEntity() instanceof LivingEntity caller) {
                com.gildedseam.infection.HordeCall.answer(this, level, caller);
            }
            return true;
        }
        boolean hurt = super.hurtServer(level, source, amount);
        // Nothing of the blight is hurt privately: the neighbourhood answers.
        if (hurt && source.getEntity() instanceof LivingEntity caller) {
            com.gildedseam.infection.HordeCall.answer(this, level, caller);
        }
        return hurt;
    }

    @Override
    public void aiStep() {
        super.aiStep();
        if (!(this.level() instanceof ServerLevel level) || !this.isDowned()) {
            return;
        }
        this.downedTicks--;
        // It twitches harder the closer it is to getting up, so a body is
        // never quiet scenery - you can see the minute running out.
        if (this.downedTicks % 20 == 0) {
            float urgency = 1.0F - this.downedTicks / (float) RISE_DELAY;
            level.sendParticles(net.minecraft.core.particles.ParticleTypes.CRIMSON_SPORE,
                    this.getX(), this.getY() + 0.3, this.getZ(),
                    2 + (int) (urgency * 8), 0.35, 0.15, 0.35, 0.01);
            if (urgency > 0.6F && this.getRandom().nextInt(3) == 0) {
                level.playSound(null, this.blockPosition(), SoundEvents.CREAKING_HEART_IDLE,
                        net.minecraft.sounds.SoundSource.HOSTILE, 0.8F,
                        0.5F + urgency * 0.5F);
            }
        }
        if (this.downedTicks <= 0) {
            this.rise(level);
        }
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
