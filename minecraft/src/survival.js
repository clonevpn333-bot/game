// ============================================================================
//  Survival mechanics: hunger, saturation, exhaustion, regen, starvation
// ============================================================================
import { ITEM } from './ids.js';

export function updateSurvival(player, dt) {
  if (player.mode === 'creative' || player.dead) return;

  // exhaustion from sprinting / movement handled partly in player; add passive drift
  if (player.sprinting) player.exhaustion += 0.04 * dt * 20 * 0.1;
  player.exhaustion += 0.0008; // tiny passive

  // exhaustion -> saturation/hunger
  while (player.exhaustion >= 4) {
    player.exhaustion -= 4;
    if (player.saturation > 0) player.saturation = Math.max(0, player.saturation - 1);
    else player.hunger = Math.max(0, player.hunger - 1);
  }

  // regen / starvation timer
  player._healTimer = (player._healTimer || 0) + dt;
  if (player.hunger >= 18 && player.health < player.maxHealth) {
    if (player._healTimer >= 3.5) {
      player._healTimer = 0;
      player.heal(1);
      player.exhaustion += 1.5;
    }
  } else if (player.hunger <= 0) {
    if (player._healTimer >= 4) {
      player._healTimer = 0;
      if (player.health > 1) player.takeDamage(1, 'starve');
    }
  } else {
    player._healTimer = 0;
  }
}

export function eatFood(player, inventory, def, slot) {
  if (player.hunger >= 20 && def.id !== ITEM.MILK) return false;
  player.hunger = Math.min(20, player.hunger + (def.food || 0));
  player.saturation = Math.min(player.hunger, player.saturation + (def.sat || 0));
  inventory.consumeHeld(1);
  if (def.container) inventory.addItem(def.container, 1);
  return true;
}

// damage reduction from armor (each armor point ~4% up to 80%)
export function applyArmor(amount, armorValue) {
  const reduction = Math.min(0.8, armorValue * 0.04);
  return amount * (1 - reduction);
}
