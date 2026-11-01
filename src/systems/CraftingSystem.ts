import {
  EquipSlot,
  InventoryItem,
  CraftGrade,
  ItemTier,
  WeaponArchetype,
} from '../types/game.types';
import { ITEMS_DATABASE } from '../data/items.data';
import { Player } from '../entities/Player';
import { EventBus } from '../core/EventBus';
import { SoundFX } from '../core/SoundFX';
import { ItemGeneratorSystem } from './ItemGeneratorSystem';

export const CRAFT_GRADE_INFO: Record<
  CraftGrade,
  {
    name: string;
    badge: string;
    icon: string;
    statsMult: number;
    statsDesc: string;
    slotsDesc: string;
    color: string;
  }
> = {
  STANDARD: {
    name: 'Походная ковка',
    badge: 'Походный',
    icon: '⚒️',
    statsMult: 1.0,
    statsDesc: 'Базовые характеристики',
    slotsDesc: 'Слоты карт: 0–1',
    color: '#94a3b8',
  },
  SLOTTED: {
    name: 'Мастерская ковка',
    badge: 'Мастерский',
    icon: '✨',
    statsMult: 1.2,
    statsDesc: '+20% к характеристикам',
    slotsDesc: 'Слоты карт: 1–2',
    color: '#38bdf8',
  },
  RELIC: {
    name: 'Ковка Реликвии',
    badge: 'Реликвия',
    icon: '🌟',
    statsMult: 1.45,
    statsDesc: '+45% + Свойство Реликвии',
    slotsDesc: 'Слоты карт: 1–4',
    color: '#fbbf24',
  },
};

/**
 * Определение фиксированного числа слотов для предмета по ступени ковки
 */
export function getSlotsForGrade(slot: EquipSlot, grade: CraftGrade): number {
  if (grade === 'STANDARD') {
    return slot === 'weapon' || slot === 'armor' ? 1 : 0;
  }
  if (grade === 'SLOTTED') {
    return slot === 'weapon' || slot === 'armor' ? 2 : 1;
  }
  if (grade === 'RELIC') {
    if (slot === 'weapon') return 4;
    if (slot === 'armor') return 3;
    if (slot === 'accessory1' || slot === 'accessory2') return 1;
    return 2; // head, offhand, garment, footgear
  }
  return 0;
}

export interface CraftingRecipe {
  id: string;
  resultItemId: string;
  name: string;
  icon: string;
  description: string;
  slot: EquipSlot;
  tier: ItemTier;
  archetype?: WeaponArchetype;
  zenyCost: number;
  oreItemId: string;
  trophyItemId: string;
  blacksmithExpReward: number;
  baseAtk?: number;
  baseMatk?: number;
  baseDef?: number;
  materials?: Array<{ itemId: string; count: number }>;
}

export interface GradeMaterialCost {
  zeny: number;
  materials: Array<{ itemId: string; count: number; name: string; icon: string }>;
}

/**
 * Расчет требуемых реагентов для крафта новой экипировки выбранной ступени
 */
export function getCraftCost(recipe: CraftingRecipe, grade: CraftGrade): GradeMaterialCost {
  const tier = recipe.tier || 1;
  const oreId = recipe.oreItemId;
  const trophyId = recipe.trophyItemId;
  const oreDef = ITEMS_DATABASE[oreId];
  const trophyDef = ITEMS_DATABASE[trophyId];
  const essenceId = `elite_essence_t${tier}`;
  const essenceDef = ITEMS_DATABASE[essenceId];
  const soulId = `mvp_soul_t${tier}`;
  const soulDef = ITEMS_DATABASE[soulId];

  if (grade === 'STANDARD') {
    return {
      zeny: recipe.zenyCost,
      materials: [
        { itemId: oreId, count: 15, name: oreDef?.name || oreId, icon: oreDef?.icon || '⛏️' },
        { itemId: trophyId, count: 25, name: trophyDef?.name || trophyId, icon: trophyDef?.icon || '📦' },
      ],
    };
  }
  if (grade === 'SLOTTED') {
    return {
      zeny: recipe.zenyCost * 2,
      materials: [
        { itemId: oreId, count: 30, name: oreDef?.name || oreId, icon: oreDef?.icon || '⛏️' },
        { itemId: trophyId, count: 50, name: trophyDef?.name || trophyId, icon: trophyDef?.icon || '📦' },
        { itemId: essenceId, count: 2, name: essenceDef?.name || essenceId, icon: essenceDef?.icon || '🔮' },
      ],
    };
  }
  return {
    zeny: recipe.zenyCost * 4,
    materials: [
      { itemId: oreId, count: 60, name: oreDef?.name || oreId, icon: oreDef?.icon || '⛏️' },
      { itemId: trophyId, count: 100, name: trophyDef?.name || trophyId, icon: trophyDef?.icon || '📦' },
      { itemId: essenceId, count: 5, name: essenceDef?.name || essenceId, icon: essenceDef?.icon || '🔮' },
      { itemId: soulId, count: 1, name: soulDef?.name || soulId, icon: soulDef?.icon || '🌟' },
    ],
  };
}

/**
 * Расчет разницы в реагентах для улучшения ступени уже имеющегося предмета
 */
export function getUpgradeCost(
  item: InventoryItem,
  targetGrade: CraftGrade,
  recipe?: CraftingRecipe
): GradeMaterialCost | null {
  const currentGrade: CraftGrade =
    item.craftGrade ||
    (item.rarity === 'LEGENDARY' || item.rarity === 'EPIC'
      ? 'RELIC'
      : item.rarity === 'RARE' || item.rarity === 'UNCOMMON'
      ? 'SLOTTED'
      : 'STANDARD');

  if (currentGrade === targetGrade) return null;
  if (currentGrade === 'RELIC') return null;
  if (currentGrade === 'SLOTTED' && targetGrade === 'STANDARD') return null;

  const tier = item.tier || recipe?.tier || 1;
  const oreId =
    recipe?.oreItemId ||
    (tier >= 4 ? 'oridecon' : tier === 3 ? 'mithril_ore' : tier === 2 ? 'phracon' : 'copper_ore');
  const trophyId =
    recipe?.trophyItemId ||
    (tier >= 4 ? 'magic_dust' : tier === 3 ? 'iron_ore' : 'jellopy');
  const baseZeny = recipe?.zenyCost || tier * 400;

  const oreDef = ITEMS_DATABASE[oreId];
  const trophyDef = ITEMS_DATABASE[trophyId];
  const essenceId = `elite_essence_t${tier}`;
  const essenceDef = ITEMS_DATABASE[essenceId];
  const soulId = `mvp_soul_t${tier}`;
  const soulDef = ITEMS_DATABASE[soulId];

  // Ступень STANDARD -> SLOTTED
  if (currentGrade === 'STANDARD' && targetGrade === 'SLOTTED') {
    return {
      zeny: baseZeny,
      materials: [
        { itemId: oreId, count: 15, name: oreDef?.name || oreId, icon: oreDef?.icon || '⛏️' },
        { itemId: trophyId, count: 25, name: trophyDef?.name || trophyId, icon: trophyDef?.icon || '📦' },
        { itemId: essenceId, count: 2, name: essenceDef?.name || essenceId, icon: essenceDef?.icon || '🔮' },
      ],
    };
  }

  // Ступень SLOTTED -> RELIC
  if (currentGrade === 'SLOTTED' && targetGrade === 'RELIC') {
    return {
      zeny: baseZeny * 2,
      materials: [
        { itemId: oreId, count: 30, name: oreDef?.name || oreId, icon: oreDef?.icon || '⛏️' },
        { itemId: trophyId, count: 50, name: trophyDef?.name || trophyId, icon: trophyDef?.icon || '📦' },
        { itemId: essenceId, count: 3, name: essenceDef?.name || essenceId, icon: essenceDef?.icon || '🔮' },
        { itemId: soulId, count: 1, name: soulDef?.name || soulId, icon: soulDef?.icon || '🌟' },
      ],
    };
  }

  // Ступень STANDARD -> RELIC
  if (currentGrade === 'STANDARD' && targetGrade === 'RELIC') {
    return {
      zeny: baseZeny * 3,
      materials: [
        { itemId: oreId, count: 45, name: oreDef?.name || oreId, icon: oreDef?.icon || '⛏️' },
        { itemId: trophyId, count: 75, name: trophyDef?.name || trophyId, icon: trophyDef?.icon || '📦' },
        { itemId: essenceId, count: 5, name: essenceDef?.name || essenceId, icon: essenceDef?.icon || '🔮' },
        { itemId: soulId, count: 1, name: soulDef?.name || soulId, icon: soulDef?.icon || '🌟' },
      ],
    };
  }

  return null;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // ==========================================
  // ТИР 1 (Tier 1 - 13 предметов)
  // ==========================================
  {
    id: "craft_sword_t1",
    resultItemId: "sword_t1",
    name: "Медный меч",
    icon: "🗡️",
    description: "Медный меч (Тир 1). ATK +18.",
    slot: "weapon",
    tier: 1,
    archetype: "MELEE_SWORD",
    zenyCost: 500,
    oreItemId: "copper_ore",
    trophyItemId: "jellopy",
    blacksmithExpReward: 15,
    baseAtk: 18,
  },
  {
    id: "craft_bow_t1",
    resultItemId: "bow_t1",
    name: "Медный лук",
    icon: "🏹",
    description: "Медный лук (Тир 1). ATK +18.",
    slot: "weapon",
    tier: 1,
    archetype: "RANGED_BOW",
    zenyCost: 500,
    oreItemId: "copper_ore",
    trophyItemId: "jellopy",
    blacksmithExpReward: 15,
    baseAtk: 18,
  },
  {
    id: "craft_staff_t1",
    resultItemId: "staff_t1",
    name: "Медный жезл",
    icon: "🪄",
    description: "Медный жезл (Тир 1). ATK +6. MATK +18.",
    slot: "weapon",
    tier: 1,
    archetype: "MAGIC_STAFF",
    zenyCost: 500,
    oreItemId: "copper_ore",
    trophyItemId: "jellopy",
    blacksmithExpReward: 15,
    baseAtk: 6,
    baseMatk: 18,
  },
  {
    id: "craft_mace_t1",
    resultItemId: "mace_t1",
    name: "Медная булава",
    icon: "🔨",
    description: "Медная булава (Тир 1). ATK +18.",
    slot: "weapon",
    tier: 1,
    archetype: "HOLY_MACE",
    zenyCost: 500,
    oreItemId: "copper_ore",
    trophyItemId: "jellopy",
    blacksmithExpReward: 15,
    baseAtk: 18,
  },
  {
    id: "craft_shield_t1",
    resultItemId: "shield_t1",
    name: "Деревянный щит",
    icon: "🛡️",
    description: "Деревянный щит (Тир 1). DEF +6.",
    slot: "offhand",
    tier: 1,
    zenyCost: 350,
    oreItemId: "copper_ore",
    trophyItemId: "fluff",
    blacksmithExpReward: 15,
    baseDef: 6,
  },
  {
    id: "craft_quiver_t1",
    resultItemId: "quiver_t1",
    name: "Колчан ученика",
    icon: "🎒",
    description: "Колчан ученика (Тир 1).",
    slot: "offhand",
    tier: 1,
    zenyCost: 350,
    oreItemId: "copper_ore",
    trophyItemId: "fluff",
    blacksmithExpReward: 15,
  },
  {
    id: "craft_grimoire_t1",
    resultItemId: "grimoire_t1",
    name: "Гримуар ученика",
    icon: "📖",
    description: "Гримуар ученика (Тир 1).",
    slot: "offhand",
    tier: 1,
    zenyCost: 350,
    oreItemId: "copper_ore",
    trophyItemId: "fluff",
    blacksmithExpReward: 15,
  },
  {
    id: "craft_head_t1",
    resultItemId: "head_t1",
    name: "Медная шапочка",
    icon: "🪖",
    description: "Медная шапочка (Тир 1). DEF +4.",
    slot: "head",
    tier: 1,
    zenyCost: 250,
    oreItemId: "copper_ore",
    trophyItemId: "solid_shell",
    blacksmithExpReward: 15,
    baseDef: 4,
  },
  {
    id: "craft_armor_t1",
    resultItemId: "armor_t1",
    name: "Ученический доспех",
    icon: "🥋",
    description: "Ученический доспех (Тир 1). DEF +8.",
    slot: "armor",
    tier: 1,
    zenyCost: 350,
    oreItemId: "copper_ore",
    trophyItemId: "solid_shell",
    blacksmithExpReward: 15,
    baseDef: 8,
  },
  {
    id: "craft_garment_t1",
    resultItemId: "garment_t1",
    name: "Полотняная накидка",
    icon: "🧣",
    description: "Полотняная накидка (Тир 1). DEF +3.",
    slot: "garment",
    tier: 1,
    zenyCost: 250,
    oreItemId: "copper_ore",
    trophyItemId: "fluff",
    blacksmithExpReward: 15,
    baseDef: 3,
  },
  {
    id: "craft_footgear_t1",
    resultItemId: "footgear_t1",
    name: "Кожаные сандалии",
    icon: "👢",
    description: "Кожаные сандалии (Тир 1). DEF +3.",
    slot: "footgear",
    tier: 1,
    zenyCost: 250,
    oreItemId: "copper_ore",
    trophyItemId: "fluff",
    blacksmithExpReward: 15,
    baseDef: 3,
  },
  {
    id: "craft_ring_str_t1",
    resultItemId: "ring_str_t1",
    name: "Медное кольцо силы",
    icon: "💍",
    description: "Медное кольцо силы (Тир 1). STR +1.",
    slot: "accessory1",
    tier: 1,
    zenyCost: 250,
    oreItemId: "copper_ore",
    trophyItemId: "jellopy",
    blacksmithExpReward: 15,
  },
  {
    id: "craft_amulet_int_t1",
    resultItemId: "amulet_int_t1",
    name: "Медный амулет мудрости",
    icon: "📿",
    description: "Медный амулет мудрости (Тир 1). INT +1.",
    slot: "accessory2",
    tier: 1,
    zenyCost: 250,
    oreItemId: "copper_ore",
    trophyItemId: "jellopy",
    blacksmithExpReward: 15,
  },
  {
    id: "craft_iron_broadsword",
    resultItemId: "iron_broadsword",
    name: "Кованый палаш",
    icon: "⚔️",
    description: "Тяжелый закаленный клинок (ATK +24).",
    slot: "weapon",
    tier: 1,
    archetype: "MELEE_SWORD",
    zenyCost: 400,
    oreItemId: "iron_ore",
    trophyItemId: "solid_shell",
    blacksmithExpReward: 25,
    baseAtk: 24,
  },
  {
    id: "craft_hunter_bow",
    resultItemId: "hunter_bow",
    name: "Охотничий лук",
    icon: "🏹",
    description: "Упругий композитный лук (ATK +20).",
    slot: "weapon",
    tier: 1,
    archetype: "RANGED_BOW",
    zenyCost: 400,
    oreItemId: "iron_ore",
    trophyItemId: "fluff",
    blacksmithExpReward: 25,
    baseAtk: 20,
  },
  {
    id: "craft_arcane_wand",
    resultItemId: "arcane_wand",
    name: "Магический жезл",
    icon: "🪄",
    description: "Фокусирующий жезл (MATK +36, ATK +10).",
    slot: "weapon",
    tier: 1,
    archetype: "MAGIC_STAFF",
    zenyCost: 500,
    oreItemId: "iron_ore",
    trophyItemId: "jellopy",
    blacksmithExpReward: 30,
    baseAtk: 10,
    baseMatk: 36,
  },
  {
    id: "craft_war_mace",
    resultItemId: "war_mace",
    name: "Боевая булава",
    icon: "🔨",
    description: "Граненая ударная булава (ATK +26).",
    slot: "weapon",
    tier: 1,
    archetype: "HOLY_MACE",
    zenyCost: 500,
    oreItemId: "iron_ore",
    trophyItemId: "solid_shell",
    blacksmithExpReward: 30,
    baseAtk: 26,
  },
  {
    id: "craft_chain_mail",
    resultItemId: "chain_mail",
    name: "Кольчужная броня",
    icon: "🛡️",
    description: "Прочная кольчатая броня (DEF +12).",
    slot: "armor",
    tier: 1,
    zenyCost: 600,
    oreItemId: "iron_ore",
    trophyItemId: "solid_shell",
    blacksmithExpReward: 35,
    baseDef: 12,
  },
  {
    id: "craft_reinforced_helm",
    resultItemId: "reinforced_helm",
    name: "Укрепленный шлем",
    icon: "🪖",
    description: "Тяжелый шлем с забралом (DEF +8).",
    slot: "head",
    tier: 1,
    zenyCost: 500,
    oreItemId: "iron_ore",
    trophyItemId: "solid_shell",
    blacksmithExpReward: 30,
    baseDef: 8,
  },
  {
    id: "craft_iron_shield",
    resultItemId: "iron_shield",
    name: "Железный баклер",
    icon: "🛡️",
    description: "Круглый щит из железа (DEF +10, Блок 8%).",
    slot: "offhand",
    tier: 1,
    zenyCost: 500,
    oreItemId: "iron_ore",
    trophyItemId: "solid_shell",
    blacksmithExpReward: 30,
    baseDef: 10,
  },
  {
    id: "craft_hunter_cloak",
    resultItemId: "hunter_cloak",
    name: "Плащ следопыта",
    icon: "🧣",
    description: "Легкая накидка (DEF +6, FLEE +8).",
    slot: "garment",
    tier: 1,
    zenyCost: 450,
    oreItemId: "iron_ore",
    trophyItemId: "fluff",
    blacksmithExpReward: 25,
    baseDef: 6,
  },
  {
    id: "craft_combat_boots",
    resultItemId: "combat_boots",
    name: "Походные сапоги",
    icon: "👢",
    description: "Укрепленные сапоги (DEF +6, Скорость +12).",
    slot: "footgear",
    tier: 1,
    zenyCost: 450,
    oreItemId: "iron_ore",
    trophyItemId: "fluff",
    blacksmithExpReward: 25,
    baseDef: 6,
  },
  {
    id: "craft_iron_ring",
    resultItemId: "iron_ring",
    name: "Железное кольцо",
    icon: "💍",
    description: "Железное кольцо силы (Тир 1). STR +2.",
    slot: "accessory1",
    tier: 1,
    zenyCost: 400,
    oreItemId: "iron_ore",
    trophyItemId: "solid_shell",
    blacksmithExpReward: 20,
  },
  {
    id: "craft_insight_amulet",
    resultItemId: "insight_amulet",
    name: "Амулет озарения",
    icon: "📿",
    description: "Амулет озарения (Тир 1). INT +2.",
    slot: "accessory2",
    tier: 1,
    zenyCost: 400,
    oreItemId: "iron_ore",
    trophyItemId: "jellopy",
    blacksmithExpReward: 20,
  },
  // ==========================================
  // ТИР 2 (Tier 2 - 13 предметов)
  // ==========================================
  {
    id: "craft_sword_t2",
    resultItemId: "sword_t2",
    name: "Железный меч",
    icon: "⚔️",
    description: "Железный меч (Тир 2). ATK +38.",
    slot: "weapon",
    tier: 2,
    archetype: "MELEE_SWORD",
    zenyCost: 2000,
    oreItemId: "phracon",
    trophyItemId: "solid_shell",
    blacksmithExpReward: 30,
    baseAtk: 38,
  },
  {
    id: "craft_bow_t2",
    resultItemId: "bow_t2",
    name: "Железный лук",
    icon: "🏹",
    description: "Железный лук (Тир 2). ATK +38.",
    slot: "weapon",
    tier: 2,
    archetype: "RANGED_BOW",
    zenyCost: 2000,
    oreItemId: "phracon",
    trophyItemId: "solid_shell",
    blacksmithExpReward: 30,
    baseAtk: 38,
  },
  {
    id: "craft_staff_t2",
    resultItemId: "staff_t2",
    name: "Жезл заклинателя",
    icon: "🪄",
    description: "Жезл заклинателя (Тир 2). ATK +12. MATK +38.",
    slot: "weapon",
    tier: 2,
    archetype: "MAGIC_STAFF",
    zenyCost: 2000,
    oreItemId: "phracon",
    trophyItemId: "solid_shell",
    blacksmithExpReward: 30,
    baseAtk: 12,
    baseMatk: 38,
  },
  {
    id: "craft_mace_t2",
    resultItemId: "mace_t2",
    name: "Железная булава",
    icon: "🔨",
    description: "Железная булава (Тир 2). ATK +38.",
    slot: "weapon",
    tier: 2,
    archetype: "HOLY_MACE",
    zenyCost: 2000,
    oreItemId: "phracon",
    trophyItemId: "solid_shell",
    blacksmithExpReward: 30,
    baseAtk: 38,
  },
  {
    id: "craft_shield_t2",
    resultItemId: "shield_t2",
    name: "Железный щит",
    icon: "🛡️",
    description: "Железный щит (Тир 2). DEF +12.",
    slot: "offhand",
    tier: 2,
    zenyCost: 1400,
    oreItemId: "phracon",
    trophyItemId: "hard_shell",
    blacksmithExpReward: 30,
    baseDef: 12,
  },
  {
    id: "craft_quiver_t2",
    resultItemId: "quiver_t2",
    name: "Охотничий колчан",
    icon: "🎒",
    description: "Охотничий колчан (Тир 2).",
    slot: "offhand",
    tier: 2,
    zenyCost: 1400,
    oreItemId: "phracon",
    trophyItemId: "hard_shell",
    blacksmithExpReward: 30,
  },
  {
    id: "craft_grimoire_t2",
    resultItemId: "grimoire_t2",
    name: "Фолиант мага",
    icon: "📖",
    description: "Фолиант мага (Тир 2).",
    slot: "offhand",
    tier: 2,
    zenyCost: 1400,
    oreItemId: "phracon",
    trophyItemId: "hard_shell",
    blacksmithExpReward: 30,
  },
  {
    id: "craft_head_t2",
    resultItemId: "head_t2",
    name: "Железный шлем",
    icon: "🪖",
    description: "Железный шлем (Тир 2). DEF +8.",
    slot: "head",
    tier: 2,
    zenyCost: 1000,
    oreItemId: "phracon",
    trophyItemId: "hard_shell",
    blacksmithExpReward: 30,
    baseDef: 8,
  },
  {
    id: "craft_armor_t2",
    resultItemId: "armor_t2",
    name: "Кольчужный доспех",
    icon: "🥋",
    description: "Кольчужный доспех (Тир 2). DEF +15.",
    slot: "armor",
    tier: 2,
    zenyCost: 1400,
    oreItemId: "phracon",
    trophyItemId: "hard_shell",
    blacksmithExpReward: 30,
    baseDef: 15,
  },
  {
    id: "craft_garment_t2",
    resultItemId: "garment_t2",
    name: "Охотничий плащ",
    icon: "🧣",
    description: "Охотничий плащ (Тир 2). DEF +6.",
    slot: "garment",
    tier: 2,
    zenyCost: 1000,
    oreItemId: "phracon",
    trophyItemId: "solid_shell",
    blacksmithExpReward: 30,
    baseDef: 6,
  },
  {
    id: "craft_footgear_t2",
    resultItemId: "footgear_t2",
    name: "Боевые сапоги",
    icon: "👢",
    description: "Боевые сапоги (Тир 2). DEF +6.",
    slot: "footgear",
    tier: 2,
    zenyCost: 1000,
    oreItemId: "phracon",
    trophyItemId: "solid_shell",
    blacksmithExpReward: 30,
    baseDef: 6,
  },
  {
    id: "craft_ring_str_t2",
    resultItemId: "ring_str_t2",
    name: "Железное кольцо воина",
    icon: "💍",
    description: "Железное кольцо воина (Тир 2). STR +2.",
    slot: "accessory1",
    tier: 2,
    zenyCost: 1000,
    oreItemId: "phracon",
    trophyItemId: "honey",
    blacksmithExpReward: 30,
  },
  {
    id: "craft_amulet_int_t2",
    resultItemId: "amulet_int_t2",
    name: "Железный талисман духа",
    icon: "📿",
    description: "Железный талисман духа (Тир 2). INT +2.",
    slot: "accessory2",
    tier: 2,
    zenyCost: 1000,
    oreItemId: "phracon",
    trophyItemId: "honey",
    blacksmithExpReward: 30,
  },
  // ==========================================
  // ТИР 3 (Tier 3 - 13 предметов)
  // ==========================================
  {
    id: "craft_sword_t3",
    resultItemId: "sword_t3",
    name: "Мифриловый меч",
    icon: "⚔️",
    description: "Мифриловый меч (Тир 3). ATK +68.",
    slot: "weapon",
    tier: 3,
    archetype: "MELEE_SWORD",
    zenyCost: 4500,
    oreItemId: "oridecon",
    trophyItemId: "cyfar",
    blacksmithExpReward: 45,
    baseAtk: 68,
  },
  {
    id: "craft_bow_t3",
    resultItemId: "bow_t3",
    name: "Мифриловый лук",
    icon: "🏹",
    description: "Мифриловый лук (Тир 3). ATK +68.",
    slot: "weapon",
    tier: 3,
    archetype: "RANGED_BOW",
    zenyCost: 4500,
    oreItemId: "oridecon",
    trophyItemId: "cyfar",
    blacksmithExpReward: 45,
    baseAtk: 68,
  },
  {
    id: "craft_staff_t3",
    resultItemId: "staff_t3",
    name: "Мифриловый посох",
    icon: "🪄",
    description: "Мифриловый посох (Тир 3). ATK +18. MATK +68.",
    slot: "weapon",
    tier: 3,
    archetype: "MAGIC_STAFF",
    zenyCost: 4500,
    oreItemId: "oridecon",
    trophyItemId: "cyfar",
    blacksmithExpReward: 45,
    baseAtk: 18,
    baseMatk: 68,
  },
  {
    id: "craft_mace_t3",
    resultItemId: "mace_t3",
    name: "Мифриловая булава",
    icon: "🔨",
    description: "Мифриловая булава (Тир 3). ATK +68.",
    slot: "weapon",
    tier: 3,
    archetype: "HOLY_MACE",
    zenyCost: 4500,
    oreItemId: "oridecon",
    trophyItemId: "cyfar",
    blacksmithExpReward: 45,
    baseAtk: 68,
  },
  {
    id: "craft_shield_t3",
    resultItemId: "shield_t3",
    name: "Мифриловый баклер",
    icon: "🛡️",
    description: "Мифриловый баклер (Тир 3). DEF +20.",
    slot: "offhand",
    tier: 3,
    zenyCost: 3150,
    oreItemId: "elunium",
    trophyItemId: "honey",
    blacksmithExpReward: 45,
    baseDef: 20,
  },
  {
    id: "craft_quiver_t3",
    resultItemId: "quiver_t3",
    name: "Следопытский колчан",
    icon: "🎒",
    description: "Следопытский колчан (Тир 3).",
    slot: "offhand",
    tier: 3,
    zenyCost: 3150,
    oreItemId: "elunium",
    trophyItemId: "honey",
    blacksmithExpReward: 45,
  },
  {
    id: "craft_grimoire_t3",
    resultItemId: "grimoire_t3",
    name: "Древний фолиант",
    icon: "📖",
    description: "Древний фолиант (Тир 3).",
    slot: "offhand",
    tier: 3,
    zenyCost: 3150,
    oreItemId: "elunium",
    trophyItemId: "honey",
    blacksmithExpReward: 45,
  },
  {
    id: "craft_head_t3",
    resultItemId: "head_t3",
    name: "Мифриловая диадема",
    icon: "👑",
    description: "Мифриловая диадема (Тир 3). DEF +14.",
    slot: "head",
    tier: 3,
    zenyCost: 2250,
    oreItemId: "elunium",
    trophyItemId: "hard_shell",
    blacksmithExpReward: 45,
    baseDef: 14,
  },
  {
    id: "craft_armor_t3",
    resultItemId: "armor_t3",
    name: "Мифриловые латы",
    icon: "🥋",
    description: "Мифриловые латы (Тир 3). DEF +26.",
    slot: "armor",
    tier: 3,
    zenyCost: 3150,
    oreItemId: "elunium",
    trophyItemId: "hard_shell",
    blacksmithExpReward: 45,
    baseDef: 26,
  },
  {
    id: "craft_garment_t3",
    resultItemId: "garment_t3",
    name: "Теневая накидка",
    icon: "🧣",
    description: "Теневая накидка (Тир 3). DEF +10.",
    slot: "garment",
    tier: 3,
    zenyCost: 2250,
    oreItemId: "elunium",
    trophyItemId: "cyfar",
    blacksmithExpReward: 45,
    baseDef: 10,
  },
  {
    id: "craft_footgear_t3",
    resultItemId: "footgear_t3",
    name: "Мифриловые поножи",
    icon: "👢",
    description: "Мифриловые поножи (Тир 3). DEF +10.",
    slot: "footgear",
    tier: 3,
    zenyCost: 2250,
    oreItemId: "elunium",
    trophyItemId: "cyfar",
    blacksmithExpReward: 45,
    baseDef: 10,
  },
  {
    id: "craft_ring_str_t3",
    resultItemId: "ring_str_t3",
    name: "Мифриловая печатка титана",
    icon: "💍",
    description: "Мифриловая печатка титана (Тир 3). STR +4.",
    slot: "accessory1",
    tier: 3,
    zenyCost: 2250,
    oreItemId: "elunium",
    trophyItemId: "honey",
    blacksmithExpReward: 45,
  },
  {
    id: "craft_amulet_int_t3",
    resultItemId: "amulet_int_t3",
    name: "Мифриловый кулон арканы",
    icon: "📿",
    description: "Мифриловый кулон арканы (Тир 3). INT +4.",
    slot: "accessory2",
    tier: 3,
    zenyCost: 2250,
    oreItemId: "elunium",
    trophyItemId: "honey",
    blacksmithExpReward: 45,
  },
  // ==========================================
  // ТИР 4 (Tier 4 - 13 предметов)
  // ==========================================
  {
    id: "craft_sword_t4",
    resultItemId: "sword_t4",
    name: "Оридеконовый палаш",
    icon: "⚔️",
    description: "Оридеконовый палаш (Тир 4). ATK +108.",
    slot: "weapon",
    tier: 4,
    archetype: "MELEE_SWORD",
    zenyCost: 8000,
    oreItemId: "oridecon",
    trophyItemId: "brigan",
    blacksmithExpReward: 60,
    baseAtk: 108,
  },
  {
    id: "craft_bow_t4",
    resultItemId: "bow_t4",
    name: "Оридеконовый лук",
    icon: "🏹",
    description: "Оридеконовый лук (Тир 4). ATK +108.",
    slot: "weapon",
    tier: 4,
    archetype: "RANGED_BOW",
    zenyCost: 8000,
    oreItemId: "oridecon",
    trophyItemId: "brigan",
    blacksmithExpReward: 60,
    baseAtk: 108,
  },
  {
    id: "craft_staff_t4",
    resultItemId: "staff_t4",
    name: "Рунический посох",
    icon: "🪄",
    description: "Рунический посох (Тир 4). ATK +25. MATK +108.",
    slot: "weapon",
    tier: 4,
    archetype: "MAGIC_STAFF",
    zenyCost: 8000,
    oreItemId: "oridecon",
    trophyItemId: "brigan",
    blacksmithExpReward: 60,
    baseAtk: 25,
    baseMatk: 108,
  },
  {
    id: "craft_mace_t4",
    resultItemId: "mace_t4",
    name: "Оридеконовая булава",
    icon: "🔨",
    description: "Оридеконовая булава (Тир 4). ATK +108.",
    slot: "weapon",
    tier: 4,
    archetype: "HOLY_MACE",
    zenyCost: 8000,
    oreItemId: "oridecon",
    trophyItemId: "brigan",
    blacksmithExpReward: 60,
    baseAtk: 108,
  },
  {
    id: "craft_shield_t4",
    resultItemId: "shield_t4",
    name: "Рунический щит",
    icon: "🛡️",
    description: "Рунический щит (Тир 4). DEF +30.",
    slot: "offhand",
    tier: 4,
    zenyCost: 5600,
    oreItemId: "elunium",
    trophyItemId: "cyfar",
    blacksmithExpReward: 60,
    baseDef: 30,
  },
  {
    id: "craft_quiver_t4",
    resultItemId: "quiver_t4",
    name: "Элитный колчан бури",
    icon: "🎒",
    description: "Элитный колчан бури (Тир 4).",
    slot: "offhand",
    tier: 4,
    zenyCost: 5600,
    oreItemId: "elunium",
    trophyItemId: "cyfar",
    blacksmithExpReward: 60,
  },
  {
    id: "craft_grimoire_t4",
    resultItemId: "grimoire_t4",
    name: "Гримуар архимага",
    icon: "📖",
    description: "Гримуар архимага (Тир 4).",
    slot: "offhand",
    tier: 4,
    zenyCost: 5600,
    oreItemId: "elunium",
    trophyItemId: "cyfar",
    blacksmithExpReward: 60,
  },
  {
    id: "craft_head_t4",
    resultItemId: "head_t4",
    name: "Рунический шлем",
    icon: "🪖",
    description: "Рунический шлем (Тир 4). DEF +22.",
    slot: "head",
    tier: 4,
    zenyCost: 4000,
    oreItemId: "elunium",
    trophyItemId: "brigan",
    blacksmithExpReward: 60,
    baseDef: 22,
  },
  {
    id: "craft_armor_t4",
    resultItemId: "armor_t4",
    name: "Рунические латы",
    icon: "🥋",
    description: "Рунические латы (Тир 4). DEF +40.",
    slot: "armor",
    tier: 4,
    zenyCost: 5600,
    oreItemId: "elunium",
    trophyItemId: "brigan",
    blacksmithExpReward: 60,
    baseDef: 40,
  },
  {
    id: "craft_garment_t4",
    resultItemId: "garment_t4",
    name: "Плащ ветра",
    icon: "🧣",
    description: "Плащ ветра (Тир 4). DEF +16.",
    slot: "garment",
    tier: 4,
    zenyCost: 4000,
    oreItemId: "elunium",
    trophyItemId: "cyfar",
    blacksmithExpReward: 60,
    baseDef: 16,
  },
  {
    id: "craft_footgear_t4",
    resultItemId: "footgear_t4",
    name: "Сапоги странника",
    icon: "👢",
    description: "Сапоги странника (Тир 4). DEF +16.",
    slot: "footgear",
    tier: 4,
    zenyCost: 4000,
    oreItemId: "elunium",
    trophyItemId: "cyfar",
    blacksmithExpReward: 60,
    baseDef: 16,
  },
  {
    id: "craft_ring_str_t4",
    resultItemId: "ring_str_t4",
    name: "Рунический перстень мощи",
    icon: "💍",
    description: "Рунический перстень мощи (Тир 4). STR +6.",
    slot: "accessory1",
    tier: 4,
    zenyCost: 4000,
    oreItemId: "elunium",
    trophyItemId: "cyfar",
    blacksmithExpReward: 60,
  },
  {
    id: "craft_amulet_int_t4",
    resultItemId: "amulet_int_t4",
    name: "Рунический кулон эфира",
    icon: "📿",
    description: "Рунический кулон эфира (Тир 4). INT +6.",
    slot: "accessory2",
    tier: 4,
    zenyCost: 4000,
    oreItemId: "elunium",
    trophyItemId: "cyfar",
    blacksmithExpReward: 60,
  },
  // ==========================================
  // ТИР 5 (Tier 5 - 13 предметов)
  // ==========================================
  {
    id: "craft_sword_t5",
    resultItemId: "sword_t5",
    name: "Драконий клинок",
    icon: "⚔️",
    description: "Драконий клинок (Тир 5). ATK +160.",
    slot: "weapon",
    tier: 5,
    archetype: "MELEE_SWORD",
    zenyCost: 12500,
    oreItemId: "oridecon",
    trophyItemId: "brigan",
    blacksmithExpReward: 75,
    baseAtk: 160,
  },
  {
    id: "craft_bow_t5",
    resultItemId: "bow_t5",
    name: "Драконий композитный лук",
    icon: "🏹",
    description: "Драконий композитный лук (Тир 5). ATK +160.",
    slot: "weapon",
    tier: 5,
    archetype: "RANGED_BOW",
    zenyCost: 12500,
    oreItemId: "oridecon",
    trophyItemId: "brigan",
    blacksmithExpReward: 75,
    baseAtk: 160,
  },
  {
    id: "craft_staff_t5",
    resultItemId: "staff_t5",
    name: "Божественный скипетр",
    icon: "🪄",
    description: "Божественный скипетр (Тир 5). ATK +35. MATK +160.",
    slot: "weapon",
    tier: 5,
    archetype: "MAGIC_STAFF",
    zenyCost: 12500,
    oreItemId: "oridecon",
    trophyItemId: "brigan",
    blacksmithExpReward: 75,
    baseAtk: 35,
    baseMatk: 160,
  },
  {
    id: "craft_mace_t5",
    resultItemId: "mace_t5",
    name: "Божественная булава",
    icon: "🔨",
    description: "Божественная булава (Тир 5). ATK +160.",
    slot: "weapon",
    tier: 5,
    archetype: "HOLY_MACE",
    zenyCost: 12500,
    oreItemId: "oridecon",
    trophyItemId: "brigan",
    blacksmithExpReward: 75,
    baseAtk: 160,
  },
  {
    id: "craft_shield_t5",
    resultItemId: "shield_t5",
    name: "Божественная эгида",
    icon: "🛡️",
    description: "Божественная эгида (Тир 5). DEF +44.",
    slot: "offhand",
    tier: 5,
    zenyCost: 8750,
    oreItemId: "elunium",
    trophyItemId: "cyfar",
    blacksmithExpReward: 75,
    baseDef: 44,
  },
  {
    id: "craft_quiver_t5",
    resultItemId: "quiver_t5",
    name: "Небесный колчан",
    icon: "🎒",
    description: "Небесный колчан (Тир 5).",
    slot: "offhand",
    tier: 5,
    zenyCost: 8750,
    oreItemId: "elunium",
    trophyItemId: "cyfar",
    blacksmithExpReward: 75,
  },
  {
    id: "craft_grimoire_t5",
    resultItemId: "grimoire_t5",
    name: "Книга Апокалипсиса",
    icon: "📖",
    description: "Книга Апокалипсиса (Тир 5).",
    slot: "offhand",
    tier: 5,
    zenyCost: 8750,
    oreItemId: "elunium",
    trophyItemId: "cyfar",
    blacksmithExpReward: 75,
  },
  {
    id: "craft_head_t5",
    resultItemId: "head_t5",
    name: "Драконья корона",
    icon: "👑",
    description: "Драконья корона (Тир 5). DEF +32.",
    slot: "head",
    tier: 5,
    zenyCost: 6250,
    oreItemId: "elunium",
    trophyItemId: "brigan",
    blacksmithExpReward: 75,
    baseDef: 32,
  },
  {
    id: "craft_armor_t5",
    resultItemId: "armor_t5",
    name: "Божественные латы дракона",
    icon: "🥋",
    description: "Божественные латы дракона (Тир 5). DEF +58.",
    slot: "armor",
    tier: 5,
    zenyCost: 8750,
    oreItemId: "elunium",
    trophyItemId: "brigan",
    blacksmithExpReward: 75,
    baseDef: 58,
  },
  {
    id: "craft_garment_t5",
    resultItemId: "garment_t5",
    name: "Небесная мантия",
    icon: "🧣",
    description: "Небесная мантия (Тир 5). DEF +24.",
    slot: "garment",
    tier: 5,
    zenyCost: 6250,
    oreItemId: "elunium",
    trophyItemId: "brigan",
    blacksmithExpReward: 75,
    baseDef: 24,
  },
  {
    id: "craft_footgear_t5",
    resultItemId: "footgear_t5",
    name: "Крылатые сапоги Гермеса",
    icon: "👢",
    description: "Крылатые сапоги Гермеса (Тир 5). DEF +24.",
    slot: "footgear",
    tier: 5,
    zenyCost: 6250,
    oreItemId: "elunium",
    trophyItemId: "brigan",
    blacksmithExpReward: 75,
    baseDef: 24,
  },
  {
    id: "craft_ring_str_t5",
    resultItemId: "ring_str_t5",
    name: "Кольцо Драконьего Владыки",
    icon: "💍",
    description: "Кольцо Драконьего Владыки (Тир 5). STR +10.",
    slot: "accessory1",
    tier: 5,
    zenyCost: 6250,
    oreItemId: "elunium",
    trophyItemId: "cyfar",
    blacksmithExpReward: 75,
  },
  {
    id: "craft_amulet_int_t5",
    resultItemId: "amulet_int_t5",
    name: "Око Богов",
    icon: "📿",
    description: "Око Богов (Тир 5). INT +10.",
    slot: "accessory2",
    tier: 5,
    zenyCost: 6250,
    oreItemId: "elunium",
    trophyItemId: "cyfar",
    blacksmithExpReward: 75,
  },
];

export class CraftingSystem {
  public blacksmithLevel: number = 1;
  public blacksmithExp: number = 0;

  constructor(blacksmithLevel = 1, blacksmithExp = 0) {
    this.blacksmithLevel = Math.max(1, blacksmithLevel);
    this.blacksmithExp = Math.max(0, blacksmithExp);
  }

  public getExpToNextLevel(): number {
    return Math.floor(60 * Math.pow(this.blacksmithLevel, 1.4));
  }

  public canCraft(
    recipe: CraftingRecipe,
    player: Player,
    grade: CraftGrade = 'STANDARD'
  ): { ok: boolean; reason?: string; cost?: GradeMaterialCost } {
    const cost = getCraftCost(recipe, grade);
    if (player.zeny < cost.zeny) {
      return {
        ok: false,
        reason: `Недостаточно Zeny: требуется ${cost.zeny.toLocaleString()} z (у вас: ${player.zeny.toLocaleString()} z)!`,
        cost,
      };
    }

    for (const mat of cost.materials) {
      const current = player.getItemCount(mat.itemId);
      if (current < mat.count) {
        return {
          ok: false,
          reason: `Недостаточно [${mat.name}]: требуется ${mat.count} шт. (в наличии: ${current})!`,
          cost,
        };
      }
    }

    return { ok: true, cost };
  }

  public craft(
    recipe: CraftingRecipe,
    player: Player,
    grade: CraftGrade = 'STANDARD'
  ): {
    success: boolean;
    item?: InventoryItem;
    message: string;
  } {
    const check = this.canCraft(recipe, player, grade);
    if (!check.ok || !check.cost) {
      return {
        success: false,
        message: check.reason || 'Невозможно выковать предмет.',
      };
    }

    // Списание Zeny
    player.removeZeny(check.cost.zeny);

    // Списание материалов
    for (const mat of check.cost.materials) {
      player.removeItemByItemId(mat.itemId, mat.count);
    }

    const itemDef = ITEMS_DATABASE[recipe.resultItemId];
    const maxSlots = getSlotsForGrade(recipe.slot, grade);
    const gradeInfo = CRAFT_GRADE_INFO[grade];

    const newItem: InventoryItem = {
      uid: `${recipe.resultItemId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      itemId: recipe.resultItemId,
      count: 1,
      tier: recipe.tier,
      craftGrade: grade,
      rarity: grade === 'RELIC' ? 'LEGENDARY' : grade === 'SLOTTED' ? 'RARE' : 'COMMON',
      refineLevel: 0,
      maxSlots,
      insertedCards: [],
      isLocked: false,
    };

    if (grade === 'RELIC' && recipe.slot === 'weapon') {
      newItem.legendaryMod = ItemGeneratorSystem.determineLegendaryMod(recipe.archetype);
    }

    player.addInventoryItem(newItem);

    // Опыт кузнеца
    const expMult = grade === 'RELIC' ? 4 : grade === 'SLOTTED' ? 2 : 1;
    this.addBlacksmithExp(recipe.blacksmithExpReward * expMult);

    SoundFX.playLevelUp();

    const cleanName = itemDef?.name || recipe.name;
    const logMessage = `⚒️ Мастер Бранд выковал [${cleanName} [${maxSlots}]] (${gradeInfo.badge})!`;
    EventBus.emit('COMBAT_LOG', {
      message: logMessage,
      color: gradeInfo.color,
    });

    EventBus.emit('FLOATING_TEXT', {
      text: `${gradeInfo.badge}: ${cleanName}!`,
      x: player.x,
      y: player.y - 40,
      color: grade === 'RELIC' ? 0xfbbf24 : grade === 'SLOTTED' ? 0x38bdf8 : 0x94a3b8,
      isCrit: true,
    });

    EventBus.emit('INVENTORY_UPDATED', { items: [...player.inventory] });

    return {
      success: true,
      item: newItem,
      message: logMessage,
    };
  }

  public canUpgrade(
    item: InventoryItem,
    player: Player,
    targetGrade: CraftGrade
  ): { ok: boolean; reason?: string; cost?: GradeMaterialCost } {
    const recipe = CRAFTING_RECIPES.find((r) => r.resultItemId === item.itemId);
    const cost = getUpgradeCost(item, targetGrade, recipe);
    if (!cost) {
      return { ok: false, reason: 'Предмет уже достиг максимальной ступени или ступень ниже текущей!' };
    }

    if (player.zeny < cost.zeny) {
      return {
        ok: false,
        reason: `Недостаточно Zeny: требуется ${cost.zeny.toLocaleString()} z!`,
        cost,
      };
    }

    for (const mat of cost.materials) {
      const current = player.getItemCount(mat.itemId);
      if (current < mat.count) {
        return {
          ok: false,
          reason: `Недостаточно [${mat.name}]: требуется ${mat.count} шт. (в наличии: ${current})!`,
          cost,
        };
      }
    }

    return { ok: true, cost };
  }

  public upgradeCraftGrade(
    item: InventoryItem,
    player: Player,
    targetGrade: CraftGrade
  ): {
    success: boolean;
    item?: InventoryItem;
    message: string;
  } {
    let targetItem: InventoryItem | null = null;
    let isEquipped = false;

    for (const slot of Object.keys(player.equipped) as EquipSlot[]) {
      if (player.equipped[slot]?.uid === item.uid) {
        targetItem = player.equipped[slot];
        isEquipped = true;
        break;
      }
    }
    if (!targetItem) {
      targetItem = player.inventory.find((i) => i.uid === item.uid) || null;
    }
    if (!targetItem) {
      targetItem = item;
    }

    const check = this.canUpgrade(targetItem, player, targetGrade);
    if (!check.ok || !check.cost) {
      return {
        success: false,
        message: check.reason || 'Невозможно улучшить ступень.',
      };
    }

    // Списание Zeny
    player.removeZeny(check.cost.zeny);

    // Списание материалов
    for (const mat of check.cost.materials) {
      player.removeItemByItemId(mat.itemId, mat.count);
    }

    const itemDef = ITEMS_DATABASE[targetItem.itemId];
    const slot = itemDef?.slot || 'weapon';
    const newSlots = getSlotsForGrade(slot, targetGrade);

    targetItem.craftGrade = targetGrade;
    targetItem.rarity = targetGrade === 'RELIC' ? 'LEGENDARY' : targetGrade === 'SLOTTED' ? 'RARE' : 'COMMON';
    targetItem.maxSlots = Math.max(targetItem.maxSlots || 0, newSlots);

    if (targetGrade === 'RELIC' && slot === 'weapon' && !targetItem.legendaryMod) {
      targetItem.legendaryMod = ItemGeneratorSystem.determineLegendaryMod(itemDef?.archetype);
    }

    // Сохранение заточки и карт гарантировано
    item.craftGrade = targetItem.craftGrade;
    item.maxSlots = targetItem.maxSlots;
    item.rarity = targetItem.rarity;
    item.legendaryMod = targetItem.legendaryMod;

    player.recalculateStats();
    SoundFX.playLevelUp();

    if (isEquipped) {
      EventBus.emit('EQUIPMENT_UPDATED', { equipped: { ...player.equipped } });
    } else {
      EventBus.emit('INVENTORY_UPDATED', { items: [...player.inventory] });
    }

    const gradeInfo = CRAFT_GRADE_INFO[targetGrade];
    const cleanName = itemDef?.name || targetItem.itemId;
    const msg = `✨ Ступень [${cleanName}] повышена до ${gradeInfo.badge}! Заточка (+${targetItem.refineLevel}) и карты (${targetItem.insertedCards?.length || 0}) сохранены!`;

    EventBus.emit('COMBAT_LOG', { message: msg, color: gradeInfo.color });
    EventBus.emit('FLOATING_TEXT', {
      text: `Апгрейд: ${gradeInfo.badge}!`,
      x: player.x,
      y: player.y - 40,
      color: targetGrade === 'RELIC' ? 0xfbbf24 : 0x38bdf8,
      isCrit: true,
    });

    return {
      success: true,
      item: targetItem,
      message: msg,
    };
  }

  public addBlacksmithExp(amount: number): void {
    this.blacksmithExp += amount;
    const required = this.getExpToNextLevel();

    if (this.blacksmithExp >= required) {
      this.blacksmithExp -= required;
      this.blacksmithLevel += 1;
      SoundFX.playLevelUp();
      EventBus.emit('COMBAT_LOG', {
        message: `🎉 Мастерство Кузнеца повышено до Уровня ${this.blacksmithLevel}!`,
        color: '#facc15',
      });
    }

    EventBus.emit('BLACKSMITH_PROGRESS_UPDATED', {
      level: this.blacksmithLevel,
      exp: this.blacksmithExp,
      nextExp: this.getExpToNextLevel(),
    });
  }
}
