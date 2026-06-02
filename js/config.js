'use strict';

const CFG = {
    // Canvas
    W: 1280,
    H: 720,
    TS: 32,          // tile size px

    // World
    WW: 96,
    WH: 96,

    // Player
    SPEED:   150,    // px/s walking
    SPRINT:  270,    // px/s sprinting
    INTERACT: 52,    // px radius

    // Game time  (1 real sec = 2 game-minutes)
    MIN_PER_SEC: 2,
    START_HOUR: 8,   // 08:00 Monday

    // Economy
    START_CASH: 200,
    DEALER_CUT: 0.35,
    LAUNDER_FEE: 0.08,

    // Police
    MAX_HEAT: 100,
    HEAT_DECAY_MIN: 1.2,   // per game-minute idle
    HEAT_PUBLIC_DEAL: 12,
    HEAT_INDOOR_DEAL: 2,
    BUST_THRESHOLD: 85,

    // Growing (game-hours)
    GROW_SPROUT:  8,
    GROW_VEG:    24,
    GROW_FLOWER: 48,
    GROW_READY:  72,

    // UI
    NOTIF_MS:   4000,
    MSG_DELAY_MS: 9000,  // delay before NPC first texts

    // Ranks
    RANKS: [
        { name: 'Street Rat',    xp: 0     },
        { name: 'Peddler',       xp: 500   },
        { name: 'Hustler',       xp: 1500  },
        { name: 'Dealer',        xp: 4000  },
        { name: 'Operator',      xp: 9000  },
        { name: 'Distributor',   xp: 18000 },
        { name: 'Kingpin',       xp: 35000 },
        { name: 'Drug Lord',     xp: 60000 },
        { name: 'Cartel Boss',   xp: 100000},
    ],
};
