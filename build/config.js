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

    DIVE_SPEED:   610,     // forward burst speed (punchy lunge)
    DIVE_TIME:    0.42,    // seconds of dive lunge
    DIVE_RECOVER: 0.15,    // prone time after landing a dive (no control)
    DIVE_CD:      0.08,    // cooldown before diving again
    DIVE_HOP:     205,     // z hop given by a dive (clears low bars)
    DIVE_STEER:   0.10,    // how much you can curve a dive mid-air (0..1)
    DIVE_DRAG:    0.25,    // velocity bleed during the lunge (lower = longer slide)

    BOUNCE_V:     760,     // bounce-pad launch velocity (z)

    GRAB_RANGE:   42,      // reach to grab another bean
    GRAB_TIME:    1.0,     // how long a grab holds

    // ---- Ragdoll ------------------------------------------------------
    RAGDOLL_FRICTION: 950, // slowdown while ragdolling

    // ---- Show / field -------------------------------------------------
    FIELD_SIZE:   20,      // total beans at the start of a show (you + 19)

    // ---- UI -------------------------------------------------------------
    INTRO_TIME:   2.4,     // round name card duration (s)
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
    { name: 'Wild Viking',    prop: 'viking',    rarity: 'uncommon'  },
    { name: 'Shark Hood',     prop: 'shark',     rarity: 'rare'      },
    { name: 'Robo-Bean',      prop: 'robot',     rarity: 'rare'      },
    { name: 'Astro Helmet',   prop: 'astronaut', rarity: 'epic'      },
    { name: 'Wizard Hat',     prop: 'wizard',    rarity: 'epic'      },
    { name: 'Unicorn',        prop: 'unicorn',   rarity: 'legendary' },
];

// Lower costumes — prop tells the renderer what to draw at the base
const COSTUMES_LOWER = [
    { name: 'None',           prop: 'none',   rarity: 'common'    },
    { name: 'Sneakers',       prop: 'shoes',  rarity: 'common'    },
    { name: 'Tutu',           prop: 'tutu',   rarity: 'uncommon'  },
    { name: 'Dino Tail',      prop: 'tail',   rarity: 'rare'      },
    { name: 'Rocket Boots',   prop: 'rocket', rarity: 'epic'      },
    { name: 'Golden Greaves', prop: 'gold',   rarity: 'legendary' },
    { name: 'Denim Jeans',    prop: 'jeans',    rarity: 'common'    },
    { name: 'Scuba Flippers', prop: 'flippers', rarity: 'uncommon'  },
    { name: 'Mech Legs',      prop: 'mech',     rarity: 'rare'      },
    { name: 'Spring Legs',    prop: 'spring',   rarity: 'rare'      },
    { name: 'Mermaid Tail',   prop: 'mermaid',  rarity: 'epic'      },
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
   FALL PASS — a free seasonal reward track. Earn Fame by playing Shows
   (qualify / win / just taking part) and climb the tiers to claim Kudos
   and exclusive cosmetics. `fame` is the CUMULATIVE Fame to unlock a tier.
   reward: {kudos:n} | {slot, idx} (grants a cosmetic) | {crown:1}
   ===================================================================== */
const PASS_FAME = { qualify: 30, win: 150, played: 12, perRound: 8 };
const FALL_PASS = [
    { tier: 1,  fame: 120,  reward: { kudos: 150 } },
    { tier: 2,  fame: 240,  reward: { slot: 'color', idx: 4 } },        // Mint Leaf
    { tier: 3,  fame: 360,  reward: { kudos: 200 } },
    { tier: 4,  fame: 480,  reward: { slot: 'pattern', idx: 3 } },      // Checkerboard
    { tier: 5,  fame: 620,  reward: { slot: 'upper', idx: 3 } },        // Pigeon  ★
    { tier: 6,  fame: 780,  reward: { kudos: 250 } },
    { tier: 7,  fame: 940,  reward: { slot: 'lower', idx: 2 } },        // Tutu
    { tier: 8,  fame: 1100, reward: { slot: 'faceplate', idx: 2 } },    // Cyber Shades
    { tier: 9,  fame: 1280, reward: { kudos: 300 } },
    { tier: 10, fame: 1480, reward: { slot: 'upper', idx: 9 } },        // Wild Viking ★
    { tier: 11, fame: 1680, reward: { slot: 'color', idx: 6 } },        // Tangerine
    { tier: 12, fame: 1900, reward: { kudos: 350 } },
    { tier: 13, fame: 2120, reward: { slot: 'lower', idx: 7 } },        // Scuba Flippers
    { tier: 14, fame: 2360, reward: { slot: 'pattern', idx: 5 } },      // Tiger Stripe
    { tier: 15, fame: 2620, reward: { slot: 'upper', idx: 5 } },        // Cool Cat ★
    { tier: 16, fame: 2880, reward: { kudos: 400 } },
    { tier: 17, fame: 3160, reward: { slot: 'color', idx: 8 } },        // Electric Teal
    { tier: 18, fame: 3460, reward: { slot: 'lower', idx: 8 } },        // Mech Legs
    { tier: 19, fame: 3760, reward: { slot: 'faceplate', idx: 3 } },    // Sunset Glow
    { tier: 20, fame: 4080, reward: { slot: 'upper', idx: 10 } },       // Shark Hood ★
    { tier: 21, fame: 4420, reward: { kudos: 500 } },
    { tier: 22, fame: 4780, reward: { slot: 'pattern', idx: 7 } },      // Tie-Dye Dream
    { tier: 23, fame: 5160, reward: { slot: 'upper', idx: 7 } },        // Dinosaur
    { tier: 24, fame: 5560, reward: { slot: 'lower', idx: 4 } },        // Rocket Boots
    { tier: 25, fame: 6000, reward: { slot: 'color', idx: 9 } },        // Crimson Crown ★
    { tier: 26, fame: 6480, reward: { kudos: 700 } },
    { tier: 27, fame: 6980, reward: { slot: 'faceplate', idx: 4 } },    // Royal Amethyst
    { tier: 28, fame: 7520, reward: { slot: 'upper', idx: 13 } },       // Wizard Hat
    { tier: 29, fame: 8100, reward: { slot: 'pattern', idx: 8 } },      // Galaxy Swirl
    { tier: 30, fame: 8720, reward: { slot: 'upper', idx: 14 } },       // Unicorn ★ GRAND
];
const SHOP_ROTATION_SIZE = 8;   // featured items available to buy at once

// Perfect Match fruits (tile colours + the called-fruit banner)
const FRUITS = [
    { name: 'Apple',      color: '#e6395a', icon: '🍎' },
    { name: 'Banana',     color: '#ffd23f', icon: '🍌' },
    { name: 'Grape',      color: '#9a6cff', icon: '🍇' },
    { name: 'Orange',     color: '#ff9447', icon: '🍊' },
    { name: 'Watermelon', color: '#46d36a', icon: '🍉' },
    { name: 'Pear',       color: '#7ce0b0', icon: '🍐' },
];

/* =====================================================================
   ROUND DEFINITIONS — the Show is an ordered list of these.
   category: Race | Survival | Final  (Team / Hunt / Logic exist in the
   real game; this tribute ships the Race/Survival/Final pillars.)
   build: name of the builder in Rounds.builders
   ===================================================================== */
const SHOW = [
    // ---------- RACES (long, multi-section courses) ----------
    { id: 'door_dash',     name: 'Door Dash',     category: 'Race', build: 'doorDash',
      tagline: 'Charge the walls of doors — smash the fakes, bounce off the real ones!', qualify: 14 },
    { id: 'gate_crash',    name: 'Gate Crash',    category: 'Race', build: 'gateCrash',
      tagline: 'Doors, spinning beams and wrecking balls — pick a lane and floor it!', qualify: 10 },
    { id: 'whirlygig',     name: 'The Whirlygig', category: 'Race', build: 'whirlygig',
      tagline: 'Rotating beams, treadmills and giant windmills. Twirl your way up!', qualify: 7 },
    { id: 'dizzy_heights', name: 'Dizzy Heights', category: 'Race', build: 'dizzyHeights',
      tagline: 'Spinning platforms and a cannonade of fruit raining down the slope.', qualify: 10 },
    { id: 'fruit_chute',   name: 'Fruit Chute',   category: 'Race', build: 'fruitChute',
      tagline: 'Climb the conveyor belts while the fruit cannons blast you back down!', qualify: 9 },
    { id: 'hit_parade',    name: 'Hit Parade',    category: 'Race', build: 'hitParade',
      tagline: 'The everything course — doors, beams, hammers, belts, blocks and balls.', qualify: 8 },
    { id: 'knight_fever',  name: 'Knight Fever',  category: 'Race', build: 'knightFever',
      tagline: 'A medieval gauntlet of swinging axes, sliding blocks and bumpers.', qualify: 8 },
    { id: 'slime_climb',   name: 'Slime Climb',   category: 'Race', build: 'slimeClimb',
      tagline: 'Scramble up the obstacle climb and outrun the rising tide of slime!', qualify: 10 },
    { id: 'slime_scramble',name: 'Slime Scramble',category: 'Race', build: 'slimeScramble',
      tagline: 'A brutal climb — faster slime, meaner obstacles. Don\'t look back.', qualify: 8 },

    // ---------- SURVIVAL ----------
    { id: 'jump_club',     name: 'Jump Club',     category: 'Survival', build: 'jumpClub',     duration: 30,
      tagline: 'Hop the spinning beam. Miss the beat, kiss the slime.' },
    { id: 'jump_showdown', name: 'Jump Showdown', category: 'Survival', build: 'jumpShowdown', duration: 28,
      tagline: 'Two stacked beams on a shrinking floor — jump the low one, duck the high.' },
    { id: 'bounce_bash',   name: 'Bounce Bash',   category: 'Survival', build: 'bounceBash',   duration: 26,
      tagline: 'Spring pads and a sweeper bar — bounce high, stay alive!' },

    // ---------- HUNT ----------
    { id: 'tail_tag',      name: 'Tail Tag',      category: 'Hunt', build: 'tailTag',  duration: 30,
      tagline: 'Snatch a tail and keep it — no tail when the timer ends, no qualify!' },
    { id: 'tail_chase',    name: 'Tail Chase',    category: 'Hunt', build: 'tailChase', duration: 28,
      tagline: 'Tighter floor, fewer tails. Steal one and run for your life!' },

    // ---------- LOGIC ----------
    { id: 'tip_toe',       name: 'Tip Toe',       category: 'Logic', build: 'tipToe',
      tagline: 'Hidden fake tiles drop into the slime. Memorise the safe path!' },
    { id: 'tip_toe_twins', name: 'Tip Toe Twins', category: 'Logic', build: 'tipToeTwins',
      tagline: 'A wider maze of stepping stones — more fakes, more nerves.' },
    { id: 'perfect_match', name: 'Perfect Match', category: 'Logic', build: 'perfectMatch',
      tagline: 'A fruit is called — dash to a matching tile before the rest drop away!' },

    // ---------- FINALS ----------
    { id: 'hexagone',      name: 'Hex-A-Gone',     category: 'Final', build: 'hexAGone',
      tagline: 'The floor dissolves beneath you. Last bean bouncing takes the Crown!' },
    { id: 'hex_blitz',     name: 'Hex Blitz',      category: 'Final', build: 'hexBlitz',
      tagline: 'Hex-A-Gone, but the tiles melt twice as fast!' },
    { id: 'hex_giant',     name: 'Hexagon Heights',category: 'Final', build: 'hexGiant',
      tagline: 'A giant honeycomb tower. Outlast them all!' },
    { id: 'hex_royale',    name: 'Hex Royale',     category: 'Final', build: 'hexRoyale',
      tagline: 'A medium honeycomb melt-down. Last bean wins!' },
    { id: 'honeycomb',     name: 'Honeycomb',      category: 'Final', build: 'honeycomb',
      tagline: 'Tiny tiles, fast melt. Keep moving!' },
    { id: 'fall_mountain', name: 'Fall Mountain',  category: 'Final', build: 'fallMountain',
      tagline: 'Scramble up the mountain dodging cannonballs — grab the Crown to win!' },
    { id: 'lost_temple',   name: 'Lost Temple',    category: 'Final', build: 'lostTemple',
      tagline: 'A steeper climb of doors and wrecking balls to the Crown.' },
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
