'use strict';

/* =====================================================================
   BEAN ROYALE — a Fall Guys: Ultimate Knockout tribute
   ---------------------------------------------------------------------
   config.js — all tuning constants + game data (rounds, cosmetics,
   gestures/emotes, achievements, bean names). Pure data, no DOM.
   ===================================================================== */

const CFG = {
    // Canvas (scaled to viewport by CSS, 16:9)
    W: 1280,
    H: 720,

    // ---- Bean physics -------------------------------------------------
    BEAN_R:       17,      // body radius (px)
    RUN_SPEED:    232,     // px/s ground running
    ACCEL:        2000,    // px/s^2 toward desired velocity
    FRICTION:     1700,    // px/s^2 decel when no input
    AIR_CONTROL:  0.55,    // steering multiplier while airborne

    JUMP_V:       430,     // initial vertical (z) velocity px/s
    GRAVITY:      1350,    // z gravity px/s^2

    DIVE_SPEED:   430,     // forward burst speed
    DIVE_TIME:    0.42,    // seconds of dive lunge
    DIVE_RECOVER: 0.40,    // prone time after landing a dive (no control)
    DIVE_CD:      0.25,    // cooldown before diving again
    DIVE_HOP:     150,     // small z hop given by a dive

    BOUNCE_V:     760,     // bounce-pad launch velocity (z)

    GRAB_RANGE:   42,      // reach to grab another bean
    GRAB_TIME:    1.0,     // how long a grab holds

    // ---- Ragdoll ------------------------------------------------------
    RAGDOLL_FRICTION: 950, // slowdown while ragdolling

    // ---- Show / field -------------------------------------------------
    FIELD_SIZE:   20,      // total beans at the start of a show (you + 19)

    // ---- UI -------------------------------------------------------------
    INTRO_TIME:   3.6,     // round name card duration (s)
    COUNTDOWN:    3,       // "3..2..1..GO"
    BANNER_TIME:  2.4,     // QUALIFIED / ELIMINATED banner
    ROUND_MAXTIME: 105,    // hard cap on a race/survival round (s)

    // Persisted-save key
    SAVE_KEY: 'beanRoyaleSave_v1',
};

/* =====================================================================
   PALETTE — UI + slime colors (Fall Guys' bubblegum/neon look)
   ===================================================================== */
const PAL = {
    skyTop:    '#5ad1ff',
    skyBot:    '#b8f0ff',
    slime:     '#d23bb0',
    slimeDark: '#9c1f86',
    track:     '#7fd0ff',
    trackEdge: '#4aa3e0',
    arena:     '#8be0ff',
    gold:      '#ffd23f',
    goldDark:  '#e8a200',
    pink:      '#ff5fa2',
    purple:    '#7b46d6',
    ink:       '#2a1c4a',
    white:     '#ffffff',
    qualGreen: '#46d36a',
    elimRed:   '#ff4d6d',
};

/* =====================================================================
   COSMETICS — Colours, Patterns, Costumes, Faceplates
   Real Fall Guys cosmetic names across the rarity tiers.
   rarity: common | uncommon | rare | epic | legendary
   ===================================================================== */

const COLORS = [
    { name: 'Bean White',     hex: '#f2f2f2', rarity: 'common'    },
    { name: 'Coral Pink',     hex: '#ff7eb6', rarity: 'common'    },
    { name: 'Sky Blue',       hex: '#6cc6ff', rarity: 'common'    },
    { name: 'Mellow Yellow',  hex: '#ffd95a', rarity: 'common'    },
    { name: 'Mint Leaf',      hex: '#74e0a8', rarity: 'uncommon'  },
    { name: 'Lilac Haze',     hex: '#c79bff', rarity: 'uncommon'  },
    { name: 'Tangerine',      hex: '#ff9447', rarity: 'uncommon'  },
    { name: 'Slime Magenta',  hex: '#e0379f', rarity: 'rare'      },
    { name: 'Electric Teal',  hex: '#23d6c8', rarity: 'rare'      },
    { name: 'Crimson Crown',  hex: '#e6395a', rarity: 'epic'      },
    { name: 'Midnight Bean',  hex: '#3b3f6b', rarity: 'epic'      },
    { name: 'Golden Gleam',   hex: '#ffcf3f', rarity: 'legendary' },
];

const PATTERNS = [
    { name: 'Plain',          type: 'solid',  rarity: 'common'    },
    { name: 'Pinstripe',      type: 'stripes',rarity: 'common'    },
    { name: 'Polka Pop',      type: 'spots',  rarity: 'common'    },
    { name: 'Checkerboard',   type: 'check',  rarity: 'uncommon'  },
    { name: 'Commando Camo',  type: 'camo',   rarity: 'uncommon'  },
    { name: 'Tiger Stripe',   type: 'tiger',  rarity: 'rare'      },
    { name: 'Star Spangle',   type: 'star',   rarity: 'rare'      },
    { name: 'Tie-Dye Dream',  type: 'tiedye', rarity: 'epic'      },
    { name: 'Galaxy Swirl',   type: 'galaxy', rarity: 'legendary' },
];

// Upper costumes — prop tells the renderer what headgear to draw
const COSTUMES_UPPER = [
    { name: 'None',           prop: 'none',   rarity: 'common'    },
    { name: 'Party Hat',      prop: 'party',  rarity: 'common'    },
    { name: 'Backwards Cap',  prop: 'cap',    rarity: 'common'    },
    { name: 'Pigeon',         prop: 'pigeon', rarity: 'uncommon'  },
    { name: 'Busy Bee',       prop: 'bee',    rarity: 'uncommon'  },
    { name: 'Cool Cat',       prop: 'cat',    rarity: 'rare'      },
    { name: 'Pirate Captain', prop: 'pirate', rarity: 'rare'      },
    { name: 'Dinosaur',       prop: 'dino',   rarity: 'epic'      },
    { name: 'Crown Royale',   prop: 'crown',  rarity: 'legendary' },
];

// Lower costumes — prop tells the renderer what to draw at the base
const COSTUMES_LOWER = [
    { name: 'None',           prop: 'none',   rarity: 'common'    },
    { name: 'Sneakers',       prop: 'shoes',  rarity: 'common'    },
    { name: 'Tutu',           prop: 'tutu',   rarity: 'uncommon'  },
    { name: 'Dino Tail',      prop: 'tail',   rarity: 'rare'      },
    { name: 'Rocket Boots',   prop: 'rocket', rarity: 'epic'      },
    { name: 'Golden Greaves', prop: 'gold',   rarity: 'legendary' },
];

const FACEPLATES = [
    { name: 'Classic Visor',  visor: '#3fd2ff', rarity: 'common'    },
    { name: 'Rosy Cheeks',    visor: '#ff8fb0', rarity: 'common'    },
    { name: 'Cyber Shades',   visor: '#23e0a0', rarity: 'uncommon'  },
    { name: 'Sunset Glow',    visor: '#ff9a3f', rarity: 'rare'      },
    { name: 'Royal Amethyst', visor: '#b06bff', rarity: 'epic'      },
    { name: 'Gold Reflect',   visor: '#ffd23f', rarity: 'legendary' },
];

/* =====================================================================
   GESTURES / EMOTES
   Each maps to an animation + a "bean sound" audio cue + tactical note.
   anim: wave | dance | crouch | think | flex | spin | point | heart
   ===================================================================== */
const EMOTES = [
    { name: 'Wave',          anim: 'wave',   rarity: 'common',    sound: 'cheerful bean chirp',     note: 'Friendly greeting at the start gate.' },
    { name: 'Chicken Dance', anim: 'dance',  rarity: 'common',    sound: 'clucky squawk loop',      note: 'Classic celebration / time-waster.' },
    { name: 'The Crouch',    anim: 'crouch', rarity: 'common',    sound: 'squeaky bob',             note: 'The infamous taunt over a fallen rival.' },
    { name: 'Thinking',      anim: 'think',  rarity: 'uncommon',  sound: 'pensive hum',             note: 'Bait a Perfect Match / fake hesitation.' },
    { name: 'Flex',          anim: 'flex',   rarity: 'uncommon',  sound: 'grunty flex puff',        note: 'Intimidate before a grab duel.' },
    { name: 'Spin to Win',   anim: 'spin',   rarity: 'rare',      sound: 'whirling whee!',          note: 'Showboat after qualifying.' },
    { name: 'You! There!',   anim: 'point',  rarity: 'rare',      sound: 'accusing beep',           note: 'Call out a door / direct teammates.' },
    { name: 'Bean Hearts',   anim: 'heart',  rarity: 'epic',      sound: 'twinkly aww',             note: 'Wholesome finish-line flex.' },
];

/* =====================================================================
   ACHIEVEMENTS / TROPHIES (cross-platform)
   ===================================================================== */
const ACHIEVEMENTS = [
    { id: 'first_qual',  name: 'Off the Mark',  desc: 'Qualify from your very first round.' },
    { id: 'crowned',     name: 'Winner Winner', desc: 'Win a Show and claim the Crown.' },
    { id: 'big_tease',   name: 'Big Tease',     desc: 'Perform a gesture moments before qualifying in 1st.' },
    { id: 'infallible',  name: 'Infallible',    desc: 'Win 5 Shows in a row.' },
    { id: 'head_turner', name: 'Head Turner',   desc: 'Equip a Legendary Colour, Pattern, Faceplate and Costume at once.' },
    { id: 'flawless',    name: 'Flawless',      desc: 'Win a Show without ever being ragdolled.' },
    { id: 'survivor',    name: 'Last Bean Standing', desc: 'Survive a Survival round without falling.' },
];

/* =====================================================================
   ROUND DEFINITIONS — the Show is an ordered list of these.
   category: Race | Survival | Final  (Team / Hunt / Logic exist in the
   real game; this tribute ships the Race/Survival/Final pillars.)
   build: name of the builder in Rounds.builders
   ===================================================================== */
const SHOW = [
    {
        id: 'door_dash',
        name: 'Door Dash',
        category: 'Race',
        tagline: 'Smash the fakes, dodge the duds — first to the finish flies through!',
        build: 'doorDash',
        qualify: 12,
    },
    {
        id: 'whirlygig',
        name: 'The Whirlygig',
        category: 'Race',
        tagline: 'Spinning bars and swinging hammers between you and glory.',
        build: 'whirlygig',
        qualify: 7,
    },
    {
        id: 'jump_club',
        name: 'Jump Club',
        category: 'Survival',
        tagline: 'Hop the sweeper. Miss the beat, kiss the slime.',
        build: 'jumpClub',
        duration: 32,
    },
    {
        id: 'hexagone',
        name: 'Hex-A-Gone',
        category: 'Final',
        tagline: 'The floor is lava-pink. Last bean bouncing takes the Crown!',
        build: 'hexAGone',
    },
];

/* =====================================================================
   AI BEAN NAMES — random roster flavor
   ===================================================================== */
const BEAN_NAMES = [
    'WobbleGoblin', 'SirFallsALot', 'BeanieSanders', 'TumbleBuns', 'NoodleArms',
    'JellyLegs', 'CrownChaser', 'GrabbyMcGee', 'YeetMaster', 'SlimeSurfer',
    'HexHopper', 'DiveBomb', 'FlopHouse', 'BumbleBean', 'RagdollRick',
    'ZoomZoom', 'GateKeeper', 'WhirlyWanda', 'BounceBoi', 'PerfectMissy',
    'TailGrabber', 'JumpJunkie', 'StumbleBee', 'LeapFroggo', 'CloudNine',
    'WigglyPete', 'TopplePop', 'GiddyGus', 'SnoozeBean', 'TurboTofu',
];
