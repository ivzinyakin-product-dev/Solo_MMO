import {
  InventoryItem,
  ItemTier,
  ItemRarity,
  EquipSlot,
  AffixType,
  ItemAffixRoll,
  EquipmentSetId,
  LegendaryModifierId,
  WeaponArchetype,
  OffhandType,
} from '../types/game.types';
import { ITEMS_DATABASE } from '../data/items.data';

export const RARITY_MULTIPLIERS: Record<ItemRarity, number> = {
  COMMON: 1.0,
  UNCOMMON: 1.15,
  RARE: 1.35,
  EPIC: 1.6,
  LEGENDARY: 1.9,
};

export const RARITY_COLORS: Record<ItemRarity, { text: string; border: string; bg: string }> = {
  COMMON: { text: '#9ca3af', border: '#4b5563', bg: '#1f2937' },
  UNCOMMON: { text: '#22c55e', border: '#16a34a', bg: '#052e16' },
  RARE: { text: '#38bdf8', border: '#0284c7', bg: '#082f49' },
  EPIC: { text: '#c084fc', border: '#9333ea', bg: '#3b0764' },
  LEGENDARY: { text: '#fbbf24', border: '#d97706', bg: '#451a03' },
};

export const RARITY_LABELS: Record<ItemRarity, string> = {
  COMMON: 'Обычный',
  UNCOMMON: 'Необычный',
  RARE: 'Редкий',
  EPIC: 'Эпический',
  LEGENDARY: 'Легендарный',
};

export interface SetBonusDef {
  id: EquipmentSetId;
  name: string;
  icon: string;
  twoPieceDesc: string;
  fourPieceDesc: string;
}

export const EQUIPMENT_SETS_DATA: Record<EquipmentSetId, SetBonusDef> = {
  SET_WARLORD: {
    id: 'SET_WARLORD',
    name: 'Комплект Воеводы',
    icon: '⚔️',
    twoPieceDesc: '+12% MaxHP, +10% физического урона (ATK)',
    fourPieceDesc: '25% шанс при получении урона вызвать ударную волну вокруг на 150% ATK (70px)',
  },
  SET_WINDWALKER: {
    id: 'SET_WINDWALKER',
    name: 'Комплект Ветрокрыла',
    icon: '🏹',
    twoPieceDesc: '+12% ASPD, +15 FLEE, +10% Crit Damage',
    fourPieceDesc: 'Каждая 4-я автоатака гарантированно критическая и наносит +50% урона',
  },
  SET_ARCHMAGE: {
    id: 'SET_ARCHMAGE',
    name: 'Комплект Арканы',
    icon: '🔮',
    twoPieceDesc: '+15% MATK, -20% расход SP, +5 SP/сек',
    fourPieceDesc: '-25% перезарядка умений, +50% шанс срабатывания авто-кастов заклинаний',
  },
  SET_SERAPHIM: {
    id: 'SET_SERAPHIM',
    name: 'Комплект Серафима',
    icon: '😇',
    twoPieceDesc: '+12% ATK и MATK, +25% эффективность лечения',
    fourPieceDesc: 'Святой Резонанс булавы срабатывает с шансом 50% и накладывает святой щит на 10% MaxHP',
  },
};

export interface LegendaryModDef {
  id: LegendaryModifierId;
  name: string;
  description: string;
  icon: string;
}

export const LEGENDARY_MODS_DATA: Record<LegendaryModifierId, LegendaryModDef> = {
  LEG_SWORD_SOLAR: {
    id: 'LEG_SWORD_SOLAR',
    name: 'Солнечный Разрез',
    icon: '☀️',
    description: 'Удары мечом вызывают солнечный разрез, поджигающий всех врагов в радиусе 90px на 80% ATK/сек на 3 сек',
  },
  LEG_BOW_STORM: {
    id: 'LEG_BOW_STORM',
    name: 'Гнев Бури',
    icon: '⚡',
    description: 'Выстрелы из лука раздваиваются на 2 стрелы и при попадании бьют цепной молнией по 3 соседним целям на 60% урона',
  },
  LEG_STAFF_ASTRAL: {
    id: 'LEG_STAFF_ASTRAL',
    name: 'Астральная Пульсация',
    icon: '🌌',
    description: 'Автоатаки посохом выпускают 2 самонаводящиеся сферы маны и восстанавливают 2% MaxSP при попадании',
  },
  LEG_MACE_JUDGMENT: {
    id: 'LEG_MACE_JUDGMENT',
    name: 'Карающий Крест',
    icon: '✝️',
    description: 'Каждый 3-й удар булавой обрушивает с неба Крест Правосудия на 220% (ATK + MATK) по площади 80px',
  },
};

interface AffixRule {
  type: AffixType;
  name: string;
  isPercent: boolean;
  minVal: (tier: ItemTier) => number;
  maxVal: (tier: ItemTier) => number;
  isAllowed: (slot: EquipSlot, archetype?: WeaponArchetype, offhandType?: OffhandType) => boolean;
}

const AFFIX_RULES: AffixRule[] = [
  {
    type: 'AFFIX_STR',
    name: 'Сила',
    isPercent: false,
    minVal: (t) => t,
    maxVal: (t) => t * 2 + 1,
    isAllowed: (slot) =>
      slot === 'weapon' ||
      slot === 'offhand' ||
      slot === 'head' ||
      slot === 'armor' ||
      slot === 'accessory1' ||
      slot === 'accessory2',
  },
  {
    type: 'AFFIX_AGI',
    name: 'Ловкость',
    isPercent: false,
    minVal: (t) => t,
    maxVal: (t) => t * 2 + 1,
    isAllowed: (slot) =>
      slot === 'weapon' ||
      slot === 'garment' ||
      slot === 'footgear' ||
      slot === 'armor' ||
      slot === 'accessory1' ||
      slot === 'accessory2',
  },
  {
    type: 'AFFIX_VIT',
    name: 'Живучесть',
    isPercent: false,
    minVal: (t) => t,
    maxVal: (t) => t * 2 + 1,
    isAllowed: (slot) =>
      slot === 'offhand' ||
      slot === 'armor' ||
      slot === 'head' ||
      slot === 'footgear' ||
      slot === 'accessory1' ||
      slot === 'accessory2',
  },
  {
    type: 'AFFIX_INT',
    name: 'Интеллект',
    isPercent: false,
    minVal: (t) => t,
    maxVal: (t) => t * 2 + 1,
    isAllowed: (slot, arch, offhand) =>
      arch === 'MAGIC_STAFF' ||
      arch === 'HOLY_MACE' ||
      offhand === 'grimoire' ||
      slot === 'head' ||
      slot === 'accessory1' ||
      slot === 'accessory2',
  },
  {
    type: 'AFFIX_DEX',
    name: 'Сноровка',
    isPercent: false,
    minVal: (t) => t,
    maxVal: (t) => t * 2 + 1,
    isAllowed: (slot, arch, offhand) =>
      arch === 'RANGED_BOW' ||
      arch === 'MELEE_SWORD' ||
      offhand === 'quiver' ||
      slot === 'accessory1' ||
      slot === 'accessory2',
  },
  {
    type: 'AFFIX_LUK',
    name: 'Удача',
    isPercent: false,
    minVal: (t) => t,
    maxVal: (t) => t * 2 + 2,
    isAllowed: () => true,
  },
  {
    type: 'AFFIX_ATK_PCT',
    name: 'Физический урон',
    isPercent: true,
    minVal: (t) => 2 * t,
    maxVal: (t) => 4 * t,
    isAllowed: (slot, arch, offhand) =>
      slot === 'weapon' || offhand === 'quiver' || slot === 'accessory1' || slot === 'accessory2',
  },
  {
    type: 'AFFIX_MATK_PCT',
    name: 'Магический урон',
    isPercent: true,
    minVal: (t) => 2 * t,
    maxVal: (t) => 4 * t,
    isAllowed: (slot, arch, offhand) =>
      arch === 'MAGIC_STAFF' ||
      arch === 'HOLY_MACE' ||
      offhand === 'grimoire' ||
      slot === 'accessory1' ||
      slot === 'accessory2',
  },
  {
    type: 'AFFIX_ASPD_PCT',
    name: 'Скорость атаки',
    isPercent: true,
    minVal: (t) => 2 * t,
    maxVal: (t) => 3 * t + 2,
    isAllowed: (slot) =>
      slot === 'weapon' || slot === 'garment' || slot === 'accessory1' || slot === 'accessory2',
  },
  {
    type: 'AFFIX_CRIT',
    name: 'Шанс крита',
    isPercent: true,
    minVal: (t) => 2 * t,
    maxVal: (t) => 3 * t + 2,
    isAllowed: (slot, arch, offhand) =>
      slot === 'weapon' || offhand === 'quiver' || slot === 'accessory1' || slot === 'accessory2',
  },
  {
    type: 'AFFIX_MAX_HP',
    name: 'Запас здоровья',
    isPercent: false,
    minVal: (t) => 25 * t,
    maxVal: (t) => 50 * t,
    isAllowed: (slot) =>
      slot === 'armor' || slot === 'offhand' || slot === 'head' || slot === 'footgear',
  },
  {
    type: 'AFFIX_FLEE',
    name: 'Уклонение',
    isPercent: false,
    minVal: (t) => 3 * t,
    maxVal: (t) => 6 * t,
    isAllowed: (slot) =>
      slot === 'garment' || slot === 'footgear' || slot === 'accessory1' || slot === 'accessory2',
  },
  {
    type: 'AFFIX_LIFESTEAL',
    name: 'Вампиризм',
    isPercent: true,
    minVal: () => 1,
    maxVal: (t) => 2 + Math.floor(t / 2),
    isAllowed: (slot) => slot === 'weapon',
  },
];

export class ItemGeneratorSystem {
  /**
   * Определение числа слотов под карты по таблице Раздела 4
   */
  public static calculateMaxSlots(slot: EquipSlot, rarity: ItemRarity): number {
    const isWeapon = slot === 'weapon';
    const isArmor = slot === 'armor';
    const isAccessory = slot === 'accessory1' || slot === 'accessory2';

    switch (rarity) {
      case 'COMMON':
        return isWeapon ? (Math.random() < 0.5 ? 1 : 0) : 0;
      case 'UNCOMMON':
        return isAccessory ? 0 : 1;
      case 'RARE':
        return isWeapon || isArmor ? 2 : 1;
      case 'EPIC':
        return isWeapon ? 3 : 2;
      case 'LEGENDARY':
        if (isWeapon) return 4;
        if (isArmor) return 3;
        if (isAccessory) return 1;
        return 2;
    }
  }

  /**
   * Назначение комплекта экипировки (Set ID) для EPIC и LEGENDARY предметов
   */
  public static determineEquipmentSet(
    slot: EquipSlot,
    archetype?: WeaponArchetype,
    offhandType?: OffhandType,
    itemId?: string
  ): EquipmentSetId {
    if (slot === 'weapon') {
      if (archetype === 'MELEE_SWORD') return 'SET_WARLORD';
      if (archetype === 'RANGED_BOW') return 'SET_WINDWALKER';
      if (archetype === 'MAGIC_STAFF') return 'SET_ARCHMAGE';
      if (archetype === 'HOLY_MACE') return 'SET_SERAPHIM';
    }

    if (slot === 'offhand') {
      if (offhandType === 'quiver') return 'SET_WINDWALKER';
      if (offhandType === 'grimoire') return 'SET_ARCHMAGE';
      if (offhandType === 'shield') return Math.random() < 0.5 ? 'SET_WARLORD' : 'SET_SERAPHIM';
    }

    if (itemId?.includes('ring_str') || itemId?.includes('ring_t')) return 'SET_WARLORD';
    if (itemId?.includes('amulet_int') || itemId?.includes('amulet_t')) return 'SET_ARCHMAGE';

    const allSets: EquipmentSetId[] = ['SET_WARLORD', 'SET_WINDWALKER', 'SET_ARCHMAGE', 'SET_SERAPHIM'];
    return allSets[Math.floor(Math.random() * allSets.length)];
  }

  /**
   * Назначение уникального легендарного модификатора оружия
   */
  public static determineLegendaryMod(archetype?: WeaponArchetype): LegendaryModifierId | undefined {
    switch (archetype) {
      case 'MELEE_SWORD':
        return 'LEG_SWORD_SOLAR';
      case 'RANGED_BOW':
        return 'LEG_BOW_STORM';
      case 'MAGIC_STAFF':
        return 'LEG_STAFF_ASTRAL';
      case 'HOLY_MACE':
        return 'LEG_MACE_JUDGMENT';
      default:
        return undefined;
    }
  }

  /**
   * Генерация случайных неповторяющихся аффиксов из пула
   */
  public static rollAffixes(
    slot: EquipSlot,
    tier: ItemTier,
    rarity: ItemRarity,
    archetype?: WeaponArchetype,
    offhandType?: OffhandType
  ): ItemAffixRoll[] {
    let count = 0;
    if (rarity === 'UNCOMMON') count = 1;
    else if (rarity === 'RARE') count = 2;
    else if (rarity === 'EPIC' || rarity === 'LEGENDARY') count = 3;

    if (count === 0) return [];

    // Доступные аффиксы для данного типа предмета
    let pool = AFFIX_RULES.filter((rule) => {
      // Вампиризм доступен только для RARE и выше
      if (rule.type === 'AFFIX_LIFESTEAL' && (rarity === 'COMMON' || rarity === 'UNCOMMON')) {
        return false;
      }
      return rule.isAllowed(slot, archetype, offhandType);
    });

    if (pool.length === 0) pool = [...AFFIX_RULES];

    // Выбираем N уникальных правил
    const selectedRules: AffixRule[] = [];
    const available = [...pool];

    for (let i = 0; i < count && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      selectedRules.push(available[idx]);
      available.splice(idx, 1);
    }

    // Вычисляем значения ролла
    return selectedRules.map((rule) => {
      const min = rule.minVal(tier);
      const max = rule.maxVal(tier);
      let val: number;

      if (rarity === 'LEGENDARY') {
        // Топ ролл в верхнем диапазоне 80%..100%
        const range = max - min;
        val = Math.round(min + range * (0.8 + Math.random() * 0.2));
      } else {
        val = min + Math.floor(Math.random() * (max - min + 1));
      }

      val = Math.max(min, Math.min(max, val));
      const suffix = rule.isPercent ? '%' : '';

      return {
        type: rule.type,
        label: `+${val}${suffix} ${rule.name}`,
        value: val,
        isPercent: rule.isPercent,
      };
    });
  }

  /**
   * Генерация нового экземпляра экипировки со свойствами v3
   */
  public static generateEquipmentInstance(
    itemId: string,
    forcedRarity?: ItemRarity,
    forcedTier?: ItemTier
  ): InventoryItem {
    const def = ITEMS_DATABASE[itemId];
    const tier: ItemTier = forcedTier || def?.tier || 1;
    const rarity: ItemRarity = forcedRarity || 'COMMON';

    const slot: EquipSlot = def?.slot || 'weapon';
    const archetype = def?.archetype;
    const offhandType = def?.offhandType;

    const baseSlots = def?.maxSlots || 0;
    const maxSlots = Math.max(baseSlots, this.calculateMaxSlots(slot, rarity));
    const affixes = this.rollAffixes(slot, tier, rarity, archetype, offhandType);

    let setId: EquipmentSetId | undefined;
    if (rarity === 'EPIC' || rarity === 'LEGENDARY') {
      setId = this.determineEquipmentSet(slot, archetype, offhandType, itemId);
    }

    let legendaryMod: LegendaryModifierId | undefined;
    if (rarity === 'LEGENDARY' && slot === 'weapon') {
      legendaryMod = this.determineLegendaryMod(archetype);
    }

    return {
      uid: `${itemId}_${Math.random().toString(36).substring(2, 9)}`,
      itemId,
      count: 1,
      tier,
      rarity,
      refineLevel: 0,
      maxSlots,
      insertedCards: [],
      affixes,
      setId,
      legendaryMod,
      isLocked: false,
    };
  }

  /**
   * Перековка аффиксов (Reforge): заново генерирует случайные аффиксы предмета,
   * сохраняя грейд, заточку, вставленные карты и статус замка.
   */
  public static reforgeItemAffixes(item: InventoryItem): InventoryItem {
    const def = ITEMS_DATABASE[item.itemId];
    const tier = item.tier || def?.tier || 1;
    const rarity = item.rarity || 'COMMON';
    const slot = def?.slot || 'weapon';

    const newAffixes = this.rollAffixes(slot, tier, rarity, def?.archetype, def?.offhandType);
    item.affixes = newAffixes;
    return item;
  }

  /**
   * Определение Тира по уровню моба:
   * Lv 1-11: Tier 1
   * Lv 12-25: Tier 2
   * Lv 26-39: Tier 3
   * Lv 40-54: Tier 4
   * Lv 55+: Tier 5
   */
  public static getTierForMonsterLevel(level: number): ItemTier {
    if (level <= 11) return 1;
    if (level <= 25) return 2;
    if (level <= 39) return 3;
    if (level <= 54) return 4;
    return 5;
  }

  /**
   * Строгая таблица дропа экипировки 3.0 (Таблица 2.1):
   * - Обычные мобы: 6.0% COMMON, 2.2% UNCOMMON, 0.35% RARE
   * - Элитные вожаки: 25.0% UNCOMMON, 12.0% RARE, 1.8% EPIC
   * - MVP Боссы: 50.0% RARE, 25.0% EPIC, 3.5% LEGENDARY
   */
  public static rollMonsterEquipmentDrop(
    monsterLevel: number,
    isElite: boolean = false,
    isMvp: boolean = false
  ): InventoryItem | null {
    const tier = this.getTierForMonsterLevel(monsterLevel);
    let rolledRarity: ItemRarity | null = null;
    const roll = Math.random() * 100;

    if (isMvp) {
      // MVP Босс: LEGENDARY 3.5%, EPIC 25%, RARE 50%
      if (roll < 3.5) {
        rolledRarity = 'LEGENDARY'; // 3.5%
      } else if (roll < 28.5) {
        rolledRarity = 'EPIC'; // 25.0%
      } else if (roll < 78.5) {
        rolledRarity = 'RARE'; // 50.0%
      }
    } else if (isElite) {
      // Элитный вожак: EPIC 1.8%, RARE 12%, UNCOMMON 25%
      if (roll < 1.8) {
        rolledRarity = 'EPIC'; // 1.8%
      } else if (roll < 13.8) {
        rolledRarity = 'RARE'; // 12.0%
      } else if (roll < 38.8) {
        rolledRarity = 'UNCOMMON'; // 25.0%
      }
    } else {
      // Обычный монстр: RARE 0.35%, UNCOMMON 2.2%, COMMON 6.0%
      if (roll < 0.35) {
        rolledRarity = 'RARE'; // 0.35%
      } else if (roll < 2.55) {
        rolledRarity = 'UNCOMMON'; // 2.2%
      } else if (roll < 8.55) {
        rolledRarity = 'COMMON'; // 6.0%
      }
    }

    if (!rolledRarity) return null;

    // Выбираем случайный предмет экипировки подходящего тира
    const availableEquipIds: string[] = [
      `sword_t${tier}`,
      `bow_t${tier}`,
      `staff_t${tier}`,
      `mace_t${tier}`,
      `shield_t${tier}`,
      `quiver_t${tier}`,
      `grimoire_t${tier}`,
      `head_t${tier}`,
      `armor_t${tier}`,
      `garment_t${tier}`,
      `footgear_t${tier}`,
      `ring_str_t${tier}`,
      `amulet_int_t${tier}`,
    ].filter((id) => !!ITEMS_DATABASE[id]);

    if (availableEquipIds.length === 0) return null;

    const chosenId = availableEquipIds[Math.floor(Math.random() * availableEquipIds.length)];
    return this.generateEquipmentInstance(chosenId, rolledRarity, tier);
  }
}
