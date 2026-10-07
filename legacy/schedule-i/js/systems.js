'use strict';

// ── Game State (global) ───────────────────────────────────────────────────
const GameState = {
    uiMode:  'playing',   // 'playing' | 'phone' | 'inventory' | 'map' | 'shop' | 'dialog' | 'mixing'
    day:     0,
    gameMins: 8 * 60,     // start 08:00
    heat:    0,
    lastDealTime: 0,      // gameMins when last deal happened

    // Active shop / dialog context
    activeShop:   null,
    activeDialog: null,
    activeMix:    null,    // { key, strainId, effects, grams }

    // Owned properties
    properties: ['motel_room'],

    // Grow pots: [{ propertyId, slotIdx, strainId, plantedAt (gameMins), stage, watered, fertilized, effects }]
    pots: [],

    // Dealer assignments: { dealerId: { productKey, gramsSupplied, gramsLeft, cutPct } }
    dealers: {},

    // Laundry / bank
    bankBalance: 0,

    // Flags
    flags: {},

    tick(dt) {
        const prevMins = this.gameMins;
        this.gameMins += dt * CFG.MIN_PER_SEC;
        if (Math.floor(this.gameMins / (60*24)) > Math.floor(prevMins / (60*24))) {
            this._onNewDay();
        }
    },

    _onNewDay() {
        this.day++;
        // Reset customer spend
        for (const npc of NPCManager.npcs) npc.spentToday = 0;
        // Grow tick
        GrowSystem.dailyTick();
        // Dealer sales tick
        DealerSystem.dailyTick();
        UI.notify(`☀️ ${U.weekday(this.day)} — Day ${this.day + 1}`, '#ffe082');
        // Unlock customers by rank
        CustomerSystem.checkUnlocks();
    },
};

// ── Police System ──────────────────────────────────────────────────────────
const PoliceSystem = {
    wantedFlash: 0,
    searchCooldown: 0,
    bustCooldown: 0,

    update(dt) {
        // Decay heat over time
        if (GameState.heat > 0) {
            GameState.heat = Math.max(0,
                GameState.heat - CFG.HEAT_DECAY_MIN * CFG.MIN_PER_SEC * dt
            );
        }
        if (this.searchCooldown > 0) this.searchCooldown -= dt;
        if (this.bustCooldown   > 0) this.bustCooldown   -= dt;
        if (this.wantedFlash    > 0) this.wantedFlash    -= dt;
    },

    addHeat(amount, reason) {
        GameState.heat = Math.min(CFG.MAX_HEAT, GameState.heat + amount);
        if (reason) UI.notify(`🚨 Heat +${amount} — ${reason}`, '#f44336');
        if (GameState.heat > 60) this.wantedFlash = 0.3;
    },

    bodySearch() {
        if (this.searchCooldown > 0 || Player.hidden) return;
        this.searchCooldown = 30; // 30 real seconds cooldown
        const hasProduct = Player.totalGrams() > 0;
        if (hasProduct && GameState.heat > 20) {
            // Confiscate product
            UI.showDialog('Officer Davis',
                "Body search in progress... We found something on you. You're coming with us.",
                [{ label:'Cooperate', action:'bust' },
                 { label:'Run!', action:'run' }]);
        } else {
            UI.notify('Officer: "Move along, nothing to see here."', '#90caf9');
        }
    },

    bust() {
        if (this.bustCooldown > 0) return;
        this.bustCooldown = 60;
        const lost = Math.min(Player.cash, Math.floor(Player.cash * 0.5));
        const productKeys = Object.keys(Player.inventory);
        Player.cash -= lost;
        Player.inventory = {};
        GameState.heat = Math.max(0, GameState.heat - 40);
        UI.notify(`⚠️ BUSTED! Lost ${U.money(lost)} and all product.`, '#f44336');
        UI.closeAllPanels();
        GameState.uiMode = 'playing';
    },

    flee() {
        // Running adds heat
        this.addHeat(20, 'fleeing police');
    },
};

// ── Grow System ────────────────────────────────────────────────────────────
const GrowSystem = {
    STAGES: ['Planted','Sprouting','Vegetative','Flowering','Ready'],

    plant(propertyId, slotIdx, strainId) {
        const prop = PROPERTIES.find(p => p.id === propertyId);
        if (!prop) return false;
        // Check slot availability
        const occupied = GameState.pots.filter(p => p.propertyId === propertyId).length;
        if (occupied >= prop.potSlots) {
            UI.notify('No free pot slots in this property.', '#f44336');
            return false;
        }
        if (!Player.supplies[strainId + '_seed'] || Player.supplies[strainId + '_seed'] < 1) {
            UI.notify('You need seeds to plant!', '#f44336');
            return false;
        }
        Player.supplies[strainId + '_seed']--;
        GameState.pots.push({
            propertyId, slotIdx,
            strainId,
            plantedAt:  GameState.gameMins,
            stage:      0,
            watered:    true,
            fertilized: false,
            effects:    [...(STRAINS[strainId]?.effects || [])],
            id: Date.now() + Math.random(),
        });
        UI.notify(`🌱 Planted ${STRAINS[strainId]?.name}!`, '#4caf50');
        return true;
    },

    water(potId) {
        const pot = GameState.pots.find(p => p.id === potId);
        if (pot) { pot.watered = true; UI.notify('💧 Watered the plant.', '#64b5f6'); }
    },

    fertilize(potId) {
        const pot = GameState.pots.find(p => p.id === potId);
        if (!pot) return;
        if (!Player.supplies.fertilizer || Player.supplies.fertilizer < 1) {
            UI.notify('No fertilizer in supplies.', '#f44336'); return;
        }
        Player.supplies.fertilizer--;
        pot.fertilized = true;
        UI.notify('🌿 Applied fertilizer — growth boosted!', '#81c784');
    },

    harvest(potId) {
        const idx = GameState.pots.findIndex(p => p.id === potId);
        if (idx < 0) return;
        const pot = GameState.pots[idx];
        if (pot.stage < 4) { UI.notify("Plant isn't ready to harvest yet.", '#f44336'); return; }
        const strain = STRAINS[pot.strainId];
        const base   = strain?.yieldGrams || 28;
        const bonus  = pot.fertilized ? 1.25 : 1.0;
        const grams  = Math.round(base * bonus * (0.8 + Math.random() * 0.4));
        Player.addInventory(pot.strainId, pot.effects, grams);
        GameState.pots.splice(idx, 1);
        Player.addXP(50);
        UI.notify(`✂️ Harvested ${grams}g of ${strain?.name}!`, '#4caf50');
    },

    dailyTick() {
        const hoursPassed = 24;
        for (const pot of GameState.pots) {
            if (!pot.watered) continue; // needs water to grow
            const hoursGrown = (GameState.gameMins - pot.plantedAt) / 60;
            const speed = pot.fertilized ? 1.25 : 1.0;
            const effective = hoursGrown * speed;
            const thresholds = [
                CFG.GROW_SPROUT, CFG.GROW_VEG, CFG.GROW_FLOWER, CFG.GROW_READY
            ];
            let stage = 0;
            for (let i = 0; i < thresholds.length; i++) {
                if (effective >= thresholds[i]) stage = i + 1;
            }
            const oldStage = pot.stage;
            pot.stage = Math.min(4, stage);
            pot.watered = false; // needs watering each "day"
            if (pot.stage !== oldStage) {
                const name = STRAINS[pot.strainId]?.name;
                UI.notify(`🌿 ${name} reached stage: ${this.STAGES[pot.stage]}`, '#81c784');
            }
        }
    },

    getPotsForProperty(propertyId) {
        return GameState.pots.filter(p => p.propertyId === propertyId);
    },
};

// ── Mixing System ──────────────────────────────────────────────────────────
const MixSystem = {
    mix(productKey, additiveId) {
        const slot = Player.inventory[productKey];
        if (!slot) { UI.notify('Product not found.', '#f44336'); return; }
        const add = ADDITIVES[additiveId];
        if (!add) { UI.notify('Additive not found.', '#f44336'); return; }
        if (!Player.supplies[additiveId] || Player.supplies[additiveId] < 1) {
            UI.notify(`No ${add.name} in supplies.`, '#f44336'); return;
        }
        Player.supplies[additiveId]--;

        const newEffects = applyAdditive(slot.effects, add.adds);
        const oldKey = productKey;
        const newKey = slot.strainId + ':' + newEffects.join(',');

        const grams = slot.grams;
        delete Player.inventory[oldKey];

        if (!Player.inventory[newKey]) {
            Player.inventory[newKey] = { strainId: slot.strainId, effects: newEffects, grams: 0, key: newKey };
        }
        Player.inventory[newKey].grams += grams;

        const newEff = newEffects[newEffects.length - 1];
        UI.notify(`🧪 Mixed in ${add.icon} ${add.name} → ${newEff} effect added!`, '#ba68c8');
        Player.addXP(10);

        // Close and reopen mix panel to refresh
        if (GameState.activeMix?.key === oldKey) {
            GameState.activeMix = Player.inventory[newKey]
                ? { ...Player.inventory[newKey], key: newKey }
                : null;
        }
    },
};

// ── Economy / Deal System ─────────────────────────────────────────────────
const EconomySystem = {
    deal(npc, productKey, grams) {
        const slot = Player.inventory[productKey];
        if (!slot || slot.grams < grams) {
            UI.notify("You don't have enough product.", '#f44336'); return false;
        }
        if (npc.spentToday + calcGramPrice(slot.strainId, slot.effects) * grams > npc.maxSpendDay) {
            UI.notify(`${npc.name} has hit their daily budget.`, '#ff9800'); return false;
        }
        const value = Math.round(calcBatchValue(slot.strainId, slot.effects, grams));
        Player.removeInventory(productKey, grams);
        npc.spentToday += value;

        // Heat based on location
        const inBuilding = World.buildingAt(Player.tx, Player.ty) !== null;
        const heatAdd = inBuilding ? CFG.HEAT_INDOOR_DEAL : CFG.HEAT_PUBLIC_DEAL;
        PoliceSystem.addHeat(heatAdd, 'street deal');

        Player.earn(value, `sold ${grams}g to ${npc.name}`);
        Phone.addDealRecord(npc.id, grams, value);

        UI.notify(`💰 Sold ${grams}g to ${npc.name} for ${U.money(value)}`, '#4caf50');
        return true;
    },

    buyItem(itemDef) {
        if (!Player.spend(itemDef.cost)) {
            UI.notify("Not enough cash.", '#f44336'); return false;
        }
        if (itemDef.category === 'seed') {
            const key = itemDef.strainId + '_seed';
            Player.supplies[key] = (Player.supplies[key] || 0) + 1;
        } else if (itemDef.category === 'additive') {
            Player.supplies[itemDef.id] = (Player.supplies[itemDef.id] || 0) + 1;
        } else if (itemDef.id === 'baggie') {
            Player.supplies.baggie = (Player.supplies.baggie || 0) + (itemDef.qty || 1);
        } else {
            Player.supplies[itemDef.id] = (Player.supplies[itemDef.id] || 0) + 1;
        }
        UI.notify(`🛒 Bought: ${itemDef.name} (${U.money(itemDef.cost)})`, '#64b5f6');
        return true;
    },

    buyProperty(propId) {
        const prop = PROPERTIES.find(p => p.id === propId);
        if (!prop) return false;
        if (prop.owned || GameState.properties.includes(propId)) {
            UI.notify("You already own this property.", '#ff9800'); return false;
        }
        if (!Player.spend(prop.cost)) {
            UI.notify(`Need ${U.money(prop.cost)} to buy this.`, '#f44336'); return false;
        }
        GameState.properties.push(propId);
        prop.owned = true;
        Player.addXP(200);
        UI.notify(`🏠 You now own: ${prop.name}!`, '#ffd700');
        return true;
    },

    launder(amount) {
        if (amount <= 0 || Player.cash < amount) {
            UI.notify("Invalid amount.", '#f44336'); return;
        }
        const fee = Math.round(amount * CFG.LAUNDER_FEE);
        const clean = amount - fee;
        if (!Player.spend(amount)) return;
        GameState.bankBalance += clean;
        UI.notify(`🏦 Laundered ${U.money(amount)} — fee: ${U.money(fee)}`, '#90caf9');
    },
};

// ── Customer System ────────────────────────────────────────────────────────
const CustomerSystem = {
    checkUnlocks() {
        const rank = Player.rank;
        for (const npc of NPCManager.npcs) {
            if (npc.role === 'customer' && !npc.unlocked && npc.unlockRank <= rank) {
                // Delay intro message slightly
                setTimeout(() => NPCManager.unlockCustomer(npc.id),
                    U.rng(5000, 20000));
            }
        }
    },

    // Called when player talks to a customer NPC
    openDealMenu(npc) {
        if (!npc.introduced) {
            npc.introduced = true;
            Phone.receiveMessage(npc.id, npc.introMsg);
        }
        GameState.uiMode   = 'deal';
        GameState.dealTarget = npc;
        UI.showDealPanel(npc);
    },
};

// ── Dealer System ──────────────────────────────────────────────────────────
const DealerSystem = {
    hire(npcId) {
        const npc = NPCManager.getById(npcId);
        if (!npc || npc.role !== 'dealer') return;
        if (!Player.spend(npc.hireCost)) {
            UI.notify(`Need ${U.money(npc.hireCost)} to hire ${npc.name}.`, '#f44336'); return;
        }
        npc.hired = true;
        GameState.dealers[npcId] = { productKey: null, gramsSupplied: 0, gramsLeft: 0, cutPct: npc.cutPct };
        Player.addXP(100);
        UI.notify(`🤝 Hired ${npc.name} as a dealer!`, '#4caf50');
        Phone.receiveMessage(npcId, npc.introMsg);
    },

    supply(npcId, productKey, grams) {
        const dealer = GameState.dealers[npcId];
        if (!dealer) return;
        if (!Player.removeInventory(productKey, grams)) {
            UI.notify("Not enough product to supply.", '#f44336'); return;
        }
        dealer.productKey    = productKey;
        dealer.gramsSupplied += grams;
        dealer.gramsLeft     += grams;
        UI.notify(`📦 Supplied ${grams}g to dealer.`, '#64b5f6');
    },

    dailyTick() {
        for (const [npcId, dealer] of Object.entries(GameState.dealers)) {
            if (!dealer.productKey || dealer.gramsLeft <= 0) continue;
            const npc    = NPCManager.getById(npcId);
            const sold   = Math.min(dealer.gramsLeft, U.rng(8, 20));
            const slot   = Player.inventory[dealer.productKey];
            const pricePG = slot
                ? calcGramPrice(slot.strainId, slot.effects)
                : 38;
            const revenue  = Math.round(sold * pricePG);
            const cut      = Math.round(revenue * dealer.cutPct);
            const profit   = revenue - cut;
            dealer.gramsLeft -= sold;
            Player.earn(profit, `${npc?.name || 'Dealer'}'s daily sales`);
            if (dealer.gramsLeft <= 0) {
                Phone.receiveMessage(npcId, "All out of product. Need a re-up ASAP.");
            }
        }
    },
};

// ── Interaction Handler ───────────────────────────────────────────────────
const Interaction = {
    tryInteract() {
        // Check NPC
        const npc = NPCManager.getNearest(Player.x, Player.y, CFG.INTERACT);
        if (npc) { this._interactNPC(npc); return; }

        // Check building door
        const b = World.buildingAt(Player.tx, Player.ty);
        if (b) { this._interactBuilding(b); return; }

        // Check interactive objects
        for (const obj of INTERACT_OBJECTS) {
            const ox = (obj.tx + 0.5) * CFG.TS;
            const oy = (obj.ty + 0.5) * CFG.TS;
            if (U.dist(Player.x, Player.y, ox, oy) < CFG.INTERACT) {
                this._interactObject(obj); return;
            }
        }
    },

    _interactNPC(npc) {
        if (npc.role === 'police') {
            UI.showDialog(npc.name,
                GameState.heat > 30
                    ? "Hold it right there. Mind if I search you?"
                    : "Everything alright? Move along.",
                GameState.heat > 30
                    ? [{ label:'Allow search', action:'search' },
                       { label:'Run!', action:'run_police' }]
                    : [{ label:'Sure officer', action:'dismiss' }]
            );
        } else if (npc.role === 'dealer') {
            if (!npc.hired) {
                UI.showDialog(npc.name, `Hire ${npc.name} as a dealer for ${U.money(npc.hireCost)}?`,
                    [{ label:`Hire (${U.money(npc.hireCost)})`, action:'hire_dealer', npcId: npc.id },
                     { label:'Not now', action:'dismiss' }]);
            } else {
                UI.showDealerPanel(npc);
            }
        } else if (npc.role === 'customer') {
            CustomerSystem.openDealMenu(npc);
        }
    },

    _interactBuilding(b) {
        switch (b.type) {
            case 'store':    UI.showShop('store');      break;
            case 'supplier': UI.showShop('supplier');   break;
            case 'motel':
            case 'house':
            case 'warehouse':
            case 'penthouse':
                UI.showPropertyPanel(b); break;
            case 'laundry':
                UI.showLaundryPanel();   break;
            case 'casino':
                UI.showCasinoPanel();    break;
            case 'pawn':
                UI.showPawnPanel();      break;
            default:
                UI.showDialog(b.name, "You're inside " + b.name + '.', [{ label:'Leave', action:'dismiss' }]);
        }
    },

    _interactObject(obj) {
        if (obj.action === 'atm') UI.showATMPanel();
        if (obj.action === 'hide') {
            Player.hidden = !Player.hidden;
            UI.notify(Player.hidden ? '🗑️ Hiding in dumpster...' : 'You stepped out.', '#90a4ae');
        }
    },
};
