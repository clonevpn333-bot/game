package com.gildedseam.client.anim.gen;

import org.jetbrains.annotations.Nullable;

import net.minecraft.client.animation.AnimationDefinition;

/**
 * Generated index of the animations in this package.
 * `python3 tools/bench/gen_geo.py` overwrites this file.
 *
 * <p>A null field means that creature has no animation of that kind -
 * the Creaking has no death because it never stood up, and the abstracts
 * that do not walk have no walk. Callers check rather than assume.
 */
public record GenAnimations(
        @Nullable AnimationDefinition idle,
        @Nullable AnimationDefinition walk,
        @Nullable AnimationDefinition run,
        @Nullable AnimationDefinition attack,
        @Nullable AnimationDefinition death,
        @Nullable AnimationDefinition rise) {

    /** Null when nothing was generated for this creature. */
    @Nullable
    public static GenAnimations of(String name) {
        return switch (name) {
            case "blighted_dragon" -> new GenAnimations(
                    BlightedDragonAnimations.IDLE, BlightedDragonAnimations.WALK, BlightedDragonAnimations.RUN, BlightedDragonAnimations.ATTACK, BlightedDragonAnimations.DEATH, BlightedDragonAnimations.RISE);
            case "blighted_enderman" -> new GenAnimations(
                    BlightedEndermanAnimations.IDLE, BlightedEndermanAnimations.WALK, BlightedEndermanAnimations.RUN, BlightedEndermanAnimations.ATTACK, BlightedEndermanAnimations.DEATH, BlightedEndermanAnimations.RISE);
            case "blighted_warden" -> new GenAnimations(
                    BlightedWardenAnimations.IDLE, BlightedWardenAnimations.WALK, BlightedWardenAnimations.RUN, BlightedWardenAnimations.ATTACK, BlightedWardenAnimations.DEATH, BlightedWardenAnimations.RISE);
            case "blighted_wither" -> new GenAnimations(
                    BlightedWitherAnimations.IDLE, null, null, BlightedWitherAnimations.ATTACK, BlightedWitherAnimations.DEATH, BlightedWitherAnimations.RISE);
            case "creaking_hand" -> new GenAnimations(
                    CreakingHandAnimations.IDLE, null, null, null, null, null);
            case "creaking_risen" -> new GenAnimations(
                    CreakingRisenAnimations.IDLE, null, null, null, null, null);
            case "gilded_cask" -> new GenAnimations(
                    GildedCaskAnimations.IDLE, GildedCaskAnimations.WALK, GildedCaskAnimations.RUN, GildedCaskAnimations.ATTACK, GildedCaskAnimations.DEATH, GildedCaskAnimations.RISE);
            case "gilded_cat" -> new GenAnimations(
                    GildedCatAnimations.IDLE, GildedCatAnimations.WALK, GildedCatAnimations.RUN, GildedCatAnimations.ATTACK, GildedCatAnimations.DEATH, GildedCatAnimations.RISE);
            case "gilded_chicken" -> new GenAnimations(
                    GildedChickenAnimations.IDLE, GildedChickenAnimations.WALK, GildedChickenAnimations.RUN, GildedChickenAnimations.ATTACK, GildedChickenAnimations.DEATH, GildedChickenAnimations.RISE);
            case "gilded_cow" -> new GenAnimations(
                    GildedCowAnimations.IDLE, GildedCowAnimations.WALK, GildedCowAnimations.RUN, GildedCowAnimations.ATTACK, GildedCowAnimations.DEATH, GildedCowAnimations.RISE);
            case "gilded_fox" -> new GenAnimations(
                    GildedFoxAnimations.IDLE, GildedFoxAnimations.WALK, GildedFoxAnimations.RUN, GildedFoxAnimations.ATTACK, GildedFoxAnimations.DEATH, GildedFoxAnimations.RISE);
            case "gilded_goat" -> new GenAnimations(
                    GildedGoatAnimations.IDLE, GildedGoatAnimations.WALK, GildedGoatAnimations.RUN, GildedGoatAnimations.ATTACK, GildedGoatAnimations.DEATH, GildedGoatAnimations.RISE);
            case "gilded_hare" -> new GenAnimations(
                    GildedHareAnimations.IDLE, GildedHareAnimations.WALK, GildedHareAnimations.RUN, GildedHareAnimations.ATTACK, GildedHareAnimations.DEATH, GildedHareAnimations.RISE);
            case "gilded_horse" -> new GenAnimations(
                    GildedHorseAnimations.IDLE, GildedHorseAnimations.WALK, GildedHorseAnimations.RUN, GildedHorseAnimations.ATTACK, GildedHorseAnimations.DEATH, GildedHorseAnimations.RISE);
            case "gilded_llama" -> new GenAnimations(
                    GildedLlamaAnimations.IDLE, GildedLlamaAnimations.WALK, GildedLlamaAnimations.RUN, GildedLlamaAnimations.ATTACK, GildedLlamaAnimations.DEATH, GildedLlamaAnimations.RISE);
            case "gilded_pig" -> new GenAnimations(
                    GildedPigAnimations.IDLE, GildedPigAnimations.WALK, GildedPigAnimations.RUN, GildedPigAnimations.ATTACK, GildedPigAnimations.DEATH, GildedPigAnimations.RISE);
            case "gilded_sheep" -> new GenAnimations(
                    GildedSheepAnimations.IDLE, GildedSheepAnimations.WALK, GildedSheepAnimations.RUN, GildedSheepAnimations.ATTACK, GildedSheepAnimations.DEATH, GildedSheepAnimations.RISE);
            case "gilded_spider" -> new GenAnimations(
                    GildedSpiderAnimations.IDLE, GildedSpiderAnimations.WALK, GildedSpiderAnimations.RUN, GildedSpiderAnimations.ATTACK, GildedSpiderAnimations.DEATH, GildedSpiderAnimations.RISE);
            case "gilded_wolf" -> new GenAnimations(
                    GildedWolfAnimations.IDLE, GildedWolfAnimations.WALK, GildedWolfAnimations.RUN, GildedWolfAnimations.ATTACK, GildedWolfAnimations.DEATH, GildedWolfAnimations.RISE);
            case "the_choir" -> new GenAnimations(
                    TheChoirAnimations.IDLE, null, null, TheChoirAnimations.ATTACK, TheChoirAnimations.DEATH, TheChoirAnimations.RISE);
            case "the_creaking" -> new GenAnimations(
                    TheCreakingAnimations.IDLE, null, null, null, null, null);
            case "the_harrow" -> new GenAnimations(
                    TheHarrowAnimations.IDLE, TheHarrowAnimations.WALK, TheHarrowAnimations.RUN, TheHarrowAnimations.ATTACK, TheHarrowAnimations.DEATH, TheHarrowAnimations.RISE);
            case "the_lacuna" -> new GenAnimations(
                    TheLacunaAnimations.IDLE, TheLacunaAnimations.WALK, TheLacunaAnimations.RUN, TheLacunaAnimations.ATTACK, TheLacunaAnimations.DEATH, TheLacunaAnimations.RISE);
            default -> null;
        };
    }
}
