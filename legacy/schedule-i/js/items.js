'use strict';

// ── Tile IDs ──────────────────────────────────────────────────────────────
const T = {
    GRASS: 0, ROAD: 1, SIDEWALK: 2, WALL: 3, FLOOR: 4,
    WATER: 5, TREE: 6, FENCE: 7, DIRT: 8, PARKING: 9,
    SAND: 10, COUNTER: 11, BED: 12, DESK: 13,
};

// ── Drug strains ──────────────────────────────────────────────────────────
const STRAINS = {
    og_kush: {
        id:'og_kush', name:'OG Kush', type:'weed',
        seedCost:30, growHours:72, yieldGrams:28,
        basePrice:38, potency:65, addiction:45,
        color:'#5a8a2c', desc:'Classic earthy pine.',
        effects:['Calming'],
    },
    sour_diesel: {
        id:'sour_diesel', name:'Sour Diesel', type:'weed',
        seedCost:40, growHours:80, yieldGrams:24,
        basePrice:46, potency:75, addiction:55,
        color:'#7ab32e', desc:'Energizing head high.',
        effects:['Energizing'],
    },
    granddaddy_purple: {
        id:'granddaddy_purple', name:'Granddaddy Purple', type:'weed',
        seedCost:45, growHours:84, yieldGrams:26,
        basePrice:52, potency:80, addiction:62,
        color:'#7b2d8b', desc:'Heavy body relaxation.',
        effects:['Sedating'],
    },
    green_crack: {
        id:'green_crack', name:'Green Crack', type:'weed',
        seedCost:35, growHours:70, yieldGrams:32,
        basePrice:40, potency:68, addiction:50,
        color:'#4caf50', desc:'Sharp citrus focus.',
        effects:['Focused'],
    },
    white_widow: {
        id:'white_widow', name:'White Widow', type:'weed',
        seedCost:55, growHours:90, yieldGrams:30,
        basePrice:56, potency:85, addiction:70,
        color:'#e0e0e0', desc:'Crystal-coated euphoria.',
        effects:['Euphoric','Calming'],
    },
};

// ── Additives ─────────────────────────────────────────────────────────────
const ADDITIVES = {
    cuke:        { id:'cuke',        name:'Cuke',         cost:2,  icon:'🥒', adds:'Refreshing',   valueMult:1.08 },
    banana:      { id:'banana',      name:'Banana',       cost:2,  icon:'🍌', adds:'Gingivitis',    valueMult:0.85 },
    paracetamol: { id:'paracetamol', name:'Paracetamol',  cost:3,  icon:'💊', adds:'Calorie-Dense', valueMult:1.05 },
    donut:       { id:'donut',       name:'Donut',        cost:3,  icon:'🍩', adds:'Calorie-Dense', valueMult:1.05 },
    flu_med:     { id:'flu_med',     name:'Flu Medicine', cost:4,  icon:'🤧', adds:'Sedating',      valueMult:1.12 },
    gasoline:    { id:'gasoline',    name:'Gasoline',     cost:5,  icon:'⛽', adds:'Toxic',         valueMult:0.70 },
    motor_oil:   { id:'motor_oil',   name:'Motor Oil',    cost:3,  icon:'🔧', adds:'Slippery',      valueMult:0.92 },
    mouth_wash:  { id:'mouth_wash',  name:'Mouth Wash',   cost:4,  icon:'🫧', adds:'Anti-Septic',   valueMult:1.05 },
    mega_bean:   { id:'mega_bean',   name:'Mega Bean',    cost:5,  icon:'🫘', adds:'Foetid',        valueMult:0.80 },
    chili:       { id:'chili',       name:'Chili',        cost:4,  icon:'🌶️', adds:'Spicy',         valueMult:1.10 },
    energy_drink:{ id:'energy_drink',name:'Energy Drink', cost:4,  icon:'⚡', adds:'Energizing',    valueMult:1.15 },
    viagra:      { id:'viagra',      name:'Viagra',       cost:8,  icon:'💙', adds:'Euphoric',      valueMult:1.25 },
};

// ── Effect → price multiplier ─────────────────────────────────────────────
const EFFECT_VALUE = {
    'Calming':1.1,'Energizing':1.15,'Sedating':1.12,'Focused':1.10,
    'Euphoric':1.25,'Refreshing':1.08,'Gingivitis':0.85,'Calorie-Dense':1.05,
    'Toxic':0.70,'Slippery':0.92,'Anti-Septic':1.05,'Foetid':0.80,
    'Spicy':1.10,'Vibrant':1.20,'Wired':1.18,'Deep-Sleep':1.15,'Paranoid':0.65,
};

// ── Effect combination table ──────────────────────────────────────────────
const COMBOS = {
    'Calming+Energizing':'Euphoric',
    'Sedating+Energizing':'Wired',
    'Euphoric+Toxic':'Paranoid',
    'Energizing+Refreshing':'Vibrant',
    'Calming+Sedating':'Deep-Sleep',
    'Focused+Energizing':'Wired',
    'Euphoric+Energizing':'Wired',
};

function applyAdditive(effects, addEffect) {
    const out = [...effects];
    // Check combos
    for (const eff of effects) {
        const key1 = `${eff}+${addEffect}`;
        const key2 = `${addEffect}+${eff}`;
        if (COMBOS[key1]) { out.splice(out.indexOf(eff), 1); return [...out, COMBOS[key1]]; }
        if (COMBOS[key2]) { out.splice(out.indexOf(eff), 1); return [...out, COMBOS[key2]]; }
    }
    if (!out.includes(addEffect)) out.push(addEffect);
    return out;
}

function calcGramPrice(strainId, effects) {
    const strain = STRAINS[strainId];
    if (!strain) return 40;
    let mult = 1;
    for (const e of (effects || [])) mult *= (EFFECT_VALUE[e] || 1);
    return strain.basePrice * mult;
}

function calcBatchValue(strainId, effects, grams) {
    return calcGramPrice(strainId, effects) * grams;
}

// ── Supply-shop stock ─────────────────────────────────────────────────────
const SHOP_ITEMS = [
    { id:'pot',          name:'Flower Pot',      cost:25,  desc:'For growing.',     category:'grow' },
    { id:'soil',         name:'Potting Soil',    cost:8,   desc:'Growing medium.',  category:'grow' },
    { id:'fertilizer',   name:'Fertilizer',      cost:12,  desc:'+20% growth speed.',category:'grow'},
    { id:'baggie',       name:'Baggies ×20',     cost:5,   desc:'Package product.', category:'supply', qty:20 },
    { id:'jar',          name:'Mason Jar',       cost:2,   desc:'Holds 28g.',       category:'supply' },
    ...Object.values(ADDITIVES).map(a => ({
        id: a.id, name: a.name + ' (add.)', cost: a.cost,
        desc: `Adds ${a.adds} effect.`, category:'additive',
    })),
    ...Object.values(STRAINS).map(s => ({
        id: s.id + '_seed', name: s.name + ' Seed', cost: s.seedCost,
        desc: s.desc, category:'seed', strainId: s.id,
    })),
];

const PROPERTIES = [
    {
        id:'motel_room', name:'Motel Room',
        desc:'Your starting room. 1 pot slot.',
        cost:0, owned:true,
        tx:17, ty:3,
        potSlots:1, dealerSlots:0,
        color:'#8B4513',
    },
    {
        id:'bungalow', name:'Bungalow',
        desc:'A small house. 4 pot slots.',
        cost:4500, owned:false,
        tx:52, ty:8,
        potSlots:4, dealerSlots:1,
        color:'#CD853F',
    },
    {
        id:'warehouse', name:'Warehouse',
        desc:'Huge grow operation. 12 pot slots.',
        cost:15000, owned:false,
        tx:12, ty:55,
        potSlots:12, dealerSlots:3,
        color:'#708090',
    },
    {
        id:'penthouse', name:'Penthouse',
        desc:'Luxury apartment. 8 pot slots + lab.',
        cost:30000, owned:false,
        tx:65, ty:48,
        potSlots:8, dealerSlots:4,
        color:'#DAA520',
    },
];
