# UE5 Project Structure & Naming Conventions
Companion to Art Bible §12. Keeps a small team fast and a 1-hour scope tight.

## Top-level content layout
```
Content/
  SmallHours/
    Art/
      Characters/
        Eli/            (hands, arms, lower body, reflection proxy)
        Vane/           (the hero antagonist — most polish)
        Renata/
        LongSubject/    (Room 4)
        Visitor/        (the entity)
        _Shared/        (skin master material, eye/hair shaders, fuzz cards)
      Environments/
        AshgroveClinic/
          WaitingRoom/  Corridor/  SleepRoom/  ObservationRoom/  Basement/
          _DecayStates/ (re-dress sets for the SleepRoom dream states)
        _TilingMaterials/ (linoleum, ceiling tile, vinyl, drywall, glass)
      Props/
        Harness/        (HERO: electrodes, gel, leads, cap, IV, pulse-ox)
        Phone/  Clipboard/  Forms/  Clock/  Camera/  FishTank/  Tapes/
      Decals/           (medical grime, fingerprints, scuffs, the stains, rot)
    FX/
      PostProcess/      (M_SmallHours_Degrade — wraps SmallHours_PostProcess.hlsl)
      Niagara/          (dust, flicker, dream-decay, audio-reactive WPO drivers)
    Audio/
      Body/ Room/ Vane_VO/ Maya_VO/ Renata_VO/ Dread/ Music/
    Blueprints/
      Core/             (BP_GameMode, BP_PlayerPawn, BP_SaveProfile)
      Systems/
        BP_DreadSystem        (drives Degradation + character stress params)
        BP_TetherSystem       (the sensor leash + radius + payout logic)
        BP_SleepSystem        (breathe-to-sleep, micro-sleeps, faked wake)
        BP_ParalysisSystem    (eyes-only state)
        BP_FearProfiler       (THE SURPRISE — local behavioral model)  ⭐
        BP_PhoneSystem        (texts, timestamps, battery)
        BP_DiegeticClock      (binds to REAL system time)               ⭐
      UI/
        WBP_Phone/ WBP_Forms/ WBP_EEG/ WBP_FearProfile (end-card)       ⭐
    Levels/
      L_Persistent/  L_WaitingRoom/  L_SleepRoom/  L_Observation/  L_Basement/
      L_OtherSide/   (New Game+ — Vane's shift; replays the player's run)  ⭐
    Cinematics/       (Sequencer: intro drive, the turn, the endings)
```

## Naming conventions
| Prefix | Asset |
|---|---|
| `SK_` / `SM_` | Skeletal / Static Mesh |
| `T_` | Texture — `T_<Asset>_<Channel>` (e.g. `T_Vane_Skin_SSS`, `T_Lino_ORM`) |
| `M_` / `MI_` | Material / Material Instance |
| `MF_` | Material Function (e.g. `MF_DualLobeSpec`, `MF_PoreDetail`) |
| `BP_` | Blueprint |
| `WBP_` | Widget Blueprint (UI) |
| `NS_` | Niagara System |
| `S_` / `SC_` | Sound Wave / Sound Cue |
| `L_` | Level |
| `DA_` | Data Asset (e.g. `DA_FearProfileSchema`) |

Texture channel suffixes: `_BC` base color, `_N` normal, `_ORM`
(Occlusion-Roughness-Metallic packed), `_SSS` subsurface/thickness, `_MASK`.

## Save / persistence (the meta layer — see docs/04_THE_SURPRISE.md)
```
[User Saved]/Ashgrove/
  profile.sav            (local-only behavioral model; opt-in)
  visits.sav             ("the clinic remembers you" — visit count, last result)
  sessions/
    session_<date>.txt   (the Fear Profile printout — found-footage on disk)
    session_<date>.tape  (compressed replay used by New Game+ "The Other Side")
```
All local. No network. Opt-in. One click to delete. (Ethics: Surprise doc.)

## Performance notes
- The camcorder downscale (`InternalRes ~540`) means the heavy scene render can
  run at reduced internal resolution for free — atmosphere *and* headroom.
- One hero building, re-dressed for decay states (no new geometry per dream).
- Strand groom + SSS only on hero characters on-screen; background = cards/2K.
