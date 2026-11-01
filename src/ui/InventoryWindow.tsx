import { useState, useEffect, useRef, useLayoutEffect } from 'preact/hooks';
import { InventoryItem, EquipSlot, WeaponArchetype } from '../types/game.types';
import { EventBus } from '../core/EventBus';
import { Player, getItemGradeMultiplier } from '../entities/Player';
import { ITEMS_DATABASE } from '../data/items.data';
import { CARDS_DATABASE } from '../data/cards.data';
import { CombatSystem } from '../systems/CombatSystem';
import { getSlotsForGrade, CRAFT_GRADE_INFO } from '../systems/CraftingSystem';
import {
  EQUIPMENT_SETS_DATA,
  RARITY_COLORS,
  RARITY_LABELS,
  LEGENDARY_MODS_DATA,
} from '../systems/ItemGeneratorSystem';

interface InventoryWindowProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onOpenStats?: () => void;
}

type InventoryCategory = 'all' | 'equip' | 'card' | 'consumable' | 'material';

export const EQUIP_SLOT_LABELS: Record<string, string> = {
  weapon: 'Оружие',
  offhand: 'Вторая рука',
  head: 'Голова',
  armor: 'Броня',
  garment: 'Накидка',
  footgear: 'Обувь',
  accessory: 'Аксессуар',
  accessory1: 'Аксессуар 1',
  accessory2: 'Аксессуар 2',
};

// Надежный расчет полного числа сокетов экипировки (по ступени ковки RO)
export const getItemTotalSlots = (item: InventoryItem | null | undefined, def?: any): number => {
  if (!item && !def) return 0;
  const itemDef = def || (item ? ITEMS_DATABASE[item.itemId] : undefined);
  if (item?.craftGrade && itemDef?.slot) {
    return getSlotsForGrade(itemDef.slot, item.craftGrade);
  }
  const base = Math.max(item?.maxSlots ?? 0, itemDef?.maxSlots ?? 0);
  return base + (item?.bonusSlots || 0);
};

// Формирование каноничного названия предмета в стиле Ragnarok Online:
// STANDARD: [+N] [Название] [X]
// SLOTTED:  [+N] Мастерский [Название] [X]
// RELIC:    [+N] Реликтовый [Название] [X]
export function getRoItemDisplayName(item: InventoryItem, includeRefine = true): string {
  const card = CARDS_DATABASE[item.itemId];
  if (card) return card.name;

  const def = ITEMS_DATABASE[item.itemId];
  const rawName = def?.name || item.itemId;
  const cleanBase = rawName.replace(/\s*\([^)]*\)/g, '');

  if (!def || def.type !== 'equip') return cleanBase;

  const refinePrefix = includeRefine && item.refineLevel > 0 ? `+${item.refineLevel} ` : '';
  const totalSlots = getItemTotalSlots(item, def);
  const slotsSuffix = ` [${totalSlots}]`;

  let gradePrefix = '';
  if (item.craftGrade === 'SLOTTED') {
    gradePrefix = 'Мастерский ';
  } else if (item.craftGrade === 'RELIC') {
    gradePrefix = 'Реликтовый ';
  }

  return `${refinePrefix}${gradePrefix}${cleanBase}${slotsSuffix}`;
}

export function getItemGradeTheme(item: InventoryItem | null | undefined): {
  textColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
} {
  const grade = item?.craftGrade;
  if (grade === 'RELIC' || item?.rarity === 'LEGENDARY') {
    return {
      textColor: 'text-amber-300',
      borderColor: 'border-amber-500/70 shadow-sm shadow-amber-500/20',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300 font-black',
      badgeBorder: 'border-amber-500/40',
    };
  }
  if (grade === 'SLOTTED' || item?.rarity === 'RARE' || item?.rarity === 'EPIC') {
    return {
      textColor: 'text-sky-300',
      borderColor: 'border-sky-500/70 shadow-sm shadow-sky-500/20',
      badgeBg: 'bg-sky-500/20',
      badgeText: 'text-sky-300 font-bold',
      badgeBorder: 'border-sky-500/40',
    };
  }
  return {
    textColor: 'text-slate-200',
    borderColor: 'border-slate-700/80',
    badgeBg: 'bg-slate-800',
    badgeText: 'text-slate-300 font-medium',
    badgeBorder: 'border-slate-700',
  };
}

export function InventoryWindow({
  isOpen,
  onClose,
  player,
  onOpenStats,
}: InventoryWindowProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([...player.inventory]);
  const [equipped, setEquipped] = useState<Partial<Record<EquipSlot, InventoryItem | null>>>({
    ...player.equipped,
  });
  const [autoPotionPercent, setAutoPotionPercent] = useState<number>(player.autoPotionPercent);

  // Состояние выбора предмета для панели действий в инвентаре
  const [selectedItemUid, setSelectedItemUid] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<'equipped' | 'inventory' | null>(null);
  const [selectedEquipSlot, setSelectedEquipSlot] = useState<EquipSlot | null>(null);

  // Фильтр категорий рюкзака
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory>('all');

  // Модалка инкрустации карты
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [targetItemForSocketing, setTargetItemForSocketing] = useState<InventoryItem | null>(null);

  // Плавающий тултип для предметов
  const [activeTooltip, setActiveTooltip] = useState<{
    item: InventoryItem;
    targetRect: DOMRect;
  } | null>(null);

  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleShowTooltip = (item: InventoryItem, e: MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActiveTooltip({ item, targetRect: rect });
  };

  const handleHideTooltip = () => {
    setActiveTooltip(null);
  };

  useLayoutEffect(() => {
    if (!activeTooltip || !tooltipRef.current) return;
    const tooltipEl = tooltipRef.current;
    const target = activeTooltip.targetRect;
    const pad = 12;

    const tooltipWidth = tooltipEl.offsetWidth || 288;
    const tooltipHeight = tooltipEl.offsetHeight || 260;

    // Горизонтальное позиционирование (справа от цели, если помещается, иначе слева)
    let left: number;
    const spaceRight = window.innerWidth - target.right;
    const spaceLeft = target.left;

    if (spaceRight >= tooltipWidth + pad) {
      left = target.right + pad;
    } else if (spaceLeft >= tooltipWidth + pad) {
      left = target.left - tooltipWidth - pad;
    } else {
      left = spaceRight >= spaceLeft ? target.right + pad : target.left - tooltipWidth - pad;
    }

    // Жесткое ограничение по границам экрана
    left = Math.max(pad, Math.min(window.innerWidth - tooltipWidth - pad, left));

    // Вертикальное позиционирование (по центру наведённого элемента)
    let top = target.top + (target.height - tooltipHeight) / 2;

    // Жесткое ограничение по границам экрана
    top = Math.max(pad, Math.min(window.innerHeight - tooltipHeight - pad, top));

    tooltipEl.style.left = `${Math.round(left)}px`;
    tooltipEl.style.top = `${Math.round(top)}px`;
    tooltipEl.style.opacity = '1';
  }, [activeTooltip]);

  useEffect(() => {
    setActiveTooltip(null);
  }, [isOpen]);

  useEffect(() => {
    const handleScrollOrResize = () => {
      setActiveTooltip(null);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  // Очистка названий от технического английского мусора в скобках
  const getCleanItemName = (rawName: string) => {
    return rawName.replace(/\s*\([^)]*\)/g, '');
  };

  // Быстрый расчет главного параметра предмета для карточки в сетке
  const getItemMainStatPreview = (item: InventoryItem) => {
    const def = ITEMS_DATABASE[item.itemId];
    const card = CARDS_DATABASE[item.itemId];

    if (card) {
      return {
        label: `[${card.targetSlot.toUpperCase()}]`,
        value: `+${card.effect.value} ${card.effect.statKey ? card.effect.statKey.toUpperCase() : ''}`,
        color: 'text-rose-300',
      };
    }

    if (!def) return { label: 'Предмет', value: '', color: 'text-slate-400' };

    if (def.type === 'equip') {
      const tier = item.tier || def.tier || 1;
      const refine = item.refineLevel || 0;
      const gradeMult = getItemGradeMultiplier(item);

      if (def.slot === 'weapon') {
        if (def.archetype === 'MAGIC_STAFF' && (def.baseMatk || def.bonusMatk)) {
          const matkVal =
            Math.floor(((def.baseMatk || 0) + (def.bonusMatk || 0)) * gradeMult) + CombatSystem.getRefineAtkBonus(tier, refine);
          return { label: 'MATK', value: `+${matkVal}`, color: 'text-sky-300' };
        }
        const atkVal =
          Math.floor(((def.baseAtk || 0) + (def.bonusAtk || 0)) * gradeMult) + CombatSystem.getRefineAtkBonus(tier, refine);
        return { label: 'ATK', value: `+${atkVal}`, color: 'text-amber-300' };
      }

      if (def.slot === 'offhand') {
        if (def.offhandType === 'grimoire' || def.bonusMatk) {
          const matkVal = Math.floor(((def.bonusMatk || 0) + (def.baseMatk || 0)) * gradeMult);
          return { label: 'MATK', value: `+${matkVal}`, color: 'text-sky-300' };
        }
        if (def.offhandType === 'quiver' || def.bonusAtk) {
          const atkVal = Math.floor(((def.bonusAtk || 0) + (def.baseAtk || 0)) * gradeMult);
          return { label: 'ATK', value: `+${atkVal}`, color: 'text-amber-300' };
        }
      }

      if (def.baseDef) {
        const defVal =
          Math.floor(def.baseDef * gradeMult) +
          (def.slot !== 'accessory1' && def.slot !== 'accessory2'
            ? CombatSystem.getRefineDefBonus(tier, refine)
            : 0);
        return { label: 'DEF', value: `+${defVal}`, color: 'text-emerald-300' };
      }

      if (def.bonusMatk) {
        const matkVal = Math.floor(def.bonusMatk * gradeMult);
        return { label: 'MATK', value: `+${matkVal}`, color: 'text-sky-300' };
      }

      if (def.bonusAtk) {
        const atkVal = Math.floor(def.bonusAtk * gradeMult);
        return { label: 'ATK', value: `+${atkVal}`, color: 'text-amber-300' };
      }

      if (def.bonusMaxHp) {
        return { label: 'HP', value: `+${def.bonusMaxHp}`, color: 'text-rose-300' };
      }

      if (def.primaryStatBonus) {
        return { label: def.primaryStatBonus.stat.toUpperCase(), value: `+${def.primaryStatBonus.value}`, color: 'text-sky-300' };
      }

      return { label: (def.slot ? def.slot.toUpperCase() : 'ЭКИП'), value: `Т${tier}`, color: 'text-slate-300' };
    }

    if (def.type === 'consumable') {
      if (def.healAmount) {
        return { label: 'Лечение', value: `+${def.healAmount} HP`, color: 'text-emerald-400' };
      }
      if (def.id === 'butterfly_wing') {
        return { label: 'Телепорт', value: 'В Деревню', color: 'text-sky-300' };
      }
      return { label: 'Зелье', value: 'Расходник', color: 'text-emerald-300' };
    }

    if (def.type === 'material') {
      return { label: 'Трофей', value: 'Сырье', color: 'text-slate-400' };
    }

    return { label: 'Предмет', value: '', color: 'text-slate-400' };
  };

  // Проверка: является ли экипировка апгрейдом по сравнению с надетой
  const checkIsUpgrade = (item: InventoryItem): boolean => {
    const def = ITEMS_DATABASE[item.itemId];
    if (!def || def.type !== 'equip' || !def.slot) return false;

    let currentEquipped = equipped[def.slot];
    if (def.slot === 'accessory1' || def.slot === 'accessory2') {
      currentEquipped = equipped.accessory1 || equipped.accessory2;
    }
    if (!currentEquipped) return true; // Пустой слот всегда апгрейд

    const curDef = ITEMS_DATABASE[currentEquipped.itemId];
    const newTier = item.tier || def.tier || 1;
    const curTier = currentEquipped.tier || curDef?.tier || 1;
    const newRefine = item.refineLevel || 0;
    const curRefine = currentEquipped.refineLevel || 0;
    const newGradeMult = getItemGradeMultiplier(item);
    const curGradeMult = getItemGradeMultiplier(currentEquipped);

    if (def.slot === 'weapon') {
      const newAtk =
        Math.floor(((def.baseAtk || 0) + (def.bonusAtk || 0)) * newGradeMult) +
        CombatSystem.getRefineAtkBonus(newTier, newRefine);
      const curAtk =
        Math.floor(((curDef?.baseAtk || 0) + (curDef?.bonusAtk || 0)) * curGradeMult) +
        CombatSystem.getRefineAtkBonus(curTier, curRefine);
      const newMatk =
        Math.floor(((def.baseMatk || 0) + (def.bonusMatk || 0)) * newGradeMult) +
        CombatSystem.getRefineAtkBonus(newTier, newRefine);
      const curMatk =
        Math.floor(((curDef?.baseMatk || 0) + (curDef?.bonusMatk || 0)) * curGradeMult) +
        CombatSystem.getRefineAtkBonus(curTier, curRefine);
      return newAtk > curAtk || newMatk > curMatk;
    }

    if (def.slot === 'offhand') {
      if (def.offhandType === 'grimoire' || def.bonusMatk) {
        const newMatk = Math.floor(((def.baseMatk || 0) + (def.bonusMatk || 0)) * newGradeMult);
        const curMatk = Math.floor(((curDef?.baseMatk || 0) + (curDef?.bonusMatk || 0)) * curGradeMult);
        return newMatk > curMatk;
      }
      if (def.offhandType === 'quiver' || def.bonusAtk) {
        const newAtk = Math.floor(((def.baseAtk || 0) + (def.bonusAtk || 0)) * newGradeMult);
        const curAtk = Math.floor(((curDef?.baseAtk || 0) + (curDef?.bonusAtk || 0)) * curGradeMult);
        return newAtk > curAtk;
      }
    }

    const newDef =
      Math.floor((def.baseDef || 0) * newGradeMult) +
      CombatSystem.getRefineDefBonus(newTier, newRefine);
    const curDefVal =
      Math.floor((curDef?.baseDef || 0) * curGradeMult) +
      CombatSystem.getRefineDefBonus(curTier, curRefine);
    return newDef > curDefVal;
  };

  useEffect(() => {
    const unsubInv = EventBus.on('INVENTORY_UPDATED', (data) => {
      setInventory([...data.items]);
    });
    const unsubEq = EventBus.on('EQUIPMENT_UPDATED', (data) => {
      setEquipped({ ...data.equipped });
    });

    return () => {
      unsubInv();
      unsubEq();
    };
  }, []);

  if (!isOpen) return null;

  const slots: Array<{ slot: EquipSlot; label: string; icon: string }> = [
    { slot: 'head', label: 'Шапка', icon: '🪖' },
    { slot: 'weapon', label: 'Оружие', icon: '⚔️' },
    { slot: 'offhand', label: 'Вторая рука', icon: '🛡️' },
    { slot: 'armor', label: 'Броня', icon: '🥋' },
    { slot: 'garment', label: 'Накидка', icon: '🧣' },
    { slot: 'footgear', label: 'Обувь', icon: '👢' },
    { slot: 'accessory1', label: 'Аксессуар 1', icon: '💍' },
    { slot: 'accessory2', label: 'Аксессуар 2', icon: '📿' },
  ];

  // Поиск выбранного предмета для панели действий
  let selectedItem: InventoryItem | null = null;
  if (selectedSource === 'equipped' && selectedEquipSlot) {
    selectedItem = equipped[selectedEquipSlot] || null;
  } else if (selectedItemUid) {
    selectedItem = inventory.find((i) => i.uid === selectedItemUid) || null;
    if (!selectedItem) {
      for (const s of [
        'weapon',
        'offhand',
        'head',
        'armor',
        'garment',
        'footgear',
        'accessory1',
        'accessory2',
      ] as EquipSlot[]) {
        if (equipped[s]?.uid === selectedItemUid) {
          selectedItem = equipped[s] || null;
          break;
        }
      }
    }
  }

  const selectedDef = selectedItem ? ITEMS_DATABASE[selectedItem.itemId] : null;
  const selectedCardDef = selectedItem ? CARDS_DATABASE[selectedItem.itemId] : null;

  // Обработчики действий в инвентаре
  const handleSelectEquipped = (slot: EquipSlot, item: InventoryItem | null) => {
    if (!item) {
      setSelectedItemUid(null);
      setSelectedSource(null);
      setSelectedEquipSlot(null);
      return;
    }
    if (selectedSource === 'equipped' && selectedEquipSlot === slot) {
      setSelectedItemUid(null);
      setSelectedSource(null);
      setSelectedEquipSlot(null);
    } else {
      setSelectedItemUid(item.uid);
      setSelectedSource('equipped');
      setSelectedEquipSlot(slot);
    }
  };

  const handleSelectInventory = (item: InventoryItem) => {
    if (selectedSource === 'inventory' && selectedItemUid === item.uid) {
      setSelectedItemUid(null);
      setSelectedSource(null);
      setSelectedEquipSlot(null);
    } else {
      setSelectedItemUid(item.uid);
      setSelectedSource('inventory');
      setSelectedEquipSlot(null);
    }
  };

  const handleUnequip = (slot: EquipSlot) => {
    player.unequipItem(slot);
    setSelectedItemUid(null);
    setSelectedSource(null);
    setSelectedEquipSlot(null);
  };

  const handleEquipItem = (itemUid: string) => {
    player.equipItem(itemUid);
    setSelectedItemUid(null);
    setSelectedSource(null);
    setSelectedEquipSlot(null);
  };

  const handleUseConsumable = (itemUid: string) => {
    player.useConsumable(itemUid);
  };

  const handleSocketCard = (targetItem: InventoryItem) => {
    if (!selectedCardId) return;
    const ok = player.insertCard(targetItem.uid, selectedCardId);
    if (ok) {
      setSelectedCardId(null);
    }
  };

  const handleAutoPotionChange = (val: number) => {
    setAutoPotionPercent(val);
    player.autoPotionPercent = val;
  };

  // Фильтрация рюкзака
  const filteredInventory = inventory.filter((item) => {
    const def = ITEMS_DATABASE[item.itemId];
    const card = CARDS_DATABASE[item.itemId];
    if (categoryFilter === 'equip') return def?.type === 'equip';
    if (categoryFilter === 'card') return !!card;
    if (categoryFilter === 'consumable') return def?.type === 'consumable';
    if (categoryFilter === 'material') return def?.type === 'material';
    return true;
  });

  const countEquip = inventory.filter((i) => ITEMS_DATABASE[i.itemId]?.type === 'equip').length;
  const countCards = inventory.filter((i) => !!CARDS_DATABASE[i.itemId]).length;
  const countConsumables = inventory.filter(
    (i) => ITEMS_DATABASE[i.itemId]?.type === 'consumable'
  ).length;
  const countMaterials = inventory.filter(
    (i) => ITEMS_DATABASE[i.itemId]?.type === 'material'
  ).length;

  // Расчет суммарных бонусов экипировки
  let totalEquipAtk = 0;
  let totalEquipMatk = 0;
  let totalEquipDef = 0;
  const totalEquipStatBonuses: Partial<Record<string, number>> = {};

  const allEquipSlots: EquipSlot[] = [
    'weapon',
    'offhand',
    'head',
    'armor',
    'garment',
    'footgear',
    'accessory1',
    'accessory2',
  ];

  const archetype = player.getEquippedWeaponArchetype();

  for (const slot of allEquipSlots) {
    const it = equipped[slot];
    if (!it) continue;
    const def = ITEMS_DATABASE[it.itemId];
    if (def) {
      const itemTier = it.tier || def.tier || 1;
      const refine = it.refineLevel || 0;

      if (slot === 'weapon') {
        if (def.baseAtk) totalEquipAtk += def.baseAtk;
        if (def.baseMatk) totalEquipMatk += def.baseMatk;
        const refAtk = CombatSystem.getRefineAtkBonus(itemTier, refine);
        totalEquipAtk += refAtk;
        if (archetype === 'MAGIC_STAFF') {
          totalEquipMatk += refAtk;
        }
      } else if (slot === 'offhand') {
        const gradeMult = getItemGradeMultiplier(it);
        if (def.offhandType === 'quiver') {
          if (archetype === 'RANGED_BOW') {
            const atkVal = (def.bonusAtk || def.baseAtk || 0);
            if (atkVal) totalEquipAtk += Math.floor(atkVal * gradeMult);
          }
        } else if (def.offhandType === 'grimoire') {
          const matkVal = (def.bonusMatk || def.baseMatk || 0);
          if (matkVal) totalEquipMatk += Math.floor(matkVal * gradeMult);
        } else {
          if (def.baseDef) {
            totalEquipDef += Math.floor(def.baseDef * gradeMult) + CombatSystem.getRefineDefBonus(itemTier, refine);
          }
        }
      } else if (slot === 'head' || slot === 'armor' || slot === 'garment' || slot === 'footgear') {
        if (def.baseDef) {
          totalEquipDef += def.baseDef + CombatSystem.getRefineDefBonus(itemTier, refine);
        }
      } else if (slot === 'accessory1' || slot === 'accessory2') {
        if (def.baseDef) totalEquipDef += def.baseDef;
      }

      if (def.primaryStatBonus) {
        const { stat, value } = def.primaryStatBonus;
        totalEquipStatBonuses[stat] = (totalEquipStatBonuses[stat] || 0) + value;
      }
      if (def.bonusMaxHp) {
        totalEquipStatBonuses['hp'] = (totalEquipStatBonuses['hp'] || 0) + def.bonusMaxHp;
      }
      if (def.bonusFlee) {
        totalEquipStatBonuses['flee'] = (totalEquipStatBonuses['flee'] || 0) + def.bonusFlee;
      }
      if (def.bonusMoveSpeed) {
        totalEquipStatBonuses['speed'] = (totalEquipStatBonuses['speed'] || 0) + def.bonusMoveSpeed;
      }
    }
    if (it.enchantment) {
      const { stat, value } = it.enchantment;
      totalEquipStatBonuses[stat] = (totalEquipStatBonuses[stat] || 0) + value;
    }
    if (it.insertedCards) {
      for (const cId of it.insertedCards) {
        const cDef = CARDS_DATABASE[cId];
        if (cDef && cDef.effect.type === 'STAT_FLAT' && cDef.effect.statKey) {
          const k = cDef.effect.statKey;
          totalEquipStatBonuses[k] = (totalEquipStatBonuses[k] || 0) + cDef.effect.value;
        }
      }
    }
  }

  // Вычисление разницы характеристик при осмотре экипировки из рюкзака
  const getComparisonDiff = (customItem?: InventoryItem, isCustomEquipped?: boolean) => {
    const itemToInspect = customItem || selectedItem;
    const isEquipped =
      isCustomEquipped !== undefined
        ? isCustomEquipped
        : customItem
        ? Object.values(equipped).some((e) => e?.uid === customItem.uid)
        : selectedSource === 'equipped';

    if (!itemToInspect || isEquipped) {
      return null;
    }

    const itemDef = ITEMS_DATABASE[itemToInspect.itemId];
    if (!itemDef || itemDef.type !== 'equip' || !itemDef.slot) {
      return null;
    }

    let slotToCompare: EquipSlot = itemDef.slot;
    if (itemDef.slot === 'accessory1' || itemDef.slot === 'accessory2') {
      if (equipped.accessory1 && !equipped.accessory2) {
        slotToCompare = 'accessory2';
      } else {
        slotToCompare = 'accessory1';
      }
    }

    const currentEquipped = equipped[slotToCompare];
    const currentDef = currentEquipped ? ITEMS_DATABASE[currentEquipped.itemId] : null;

    const newTier = itemToInspect?.tier || itemDef.tier || 1;
    const curTier = currentEquipped?.tier || currentDef?.tier || 1;
    const newRefine = itemToInspect?.refineLevel || 0;
    const curRefine = currentEquipped?.refineLevel || 0;

    const newGradeMult = getItemGradeMultiplier(itemToInspect);
    const curGradeMult = getItemGradeMultiplier(currentEquipped);

    const newBaseAtk = Math.floor(((itemDef.baseAtk || 0) + (itemDef.bonusAtk || 0)) * newGradeMult);
    const curBaseAtk = Math.floor(((currentDef?.baseAtk || 0) + (currentDef?.bonusAtk || 0)) * curGradeMult);

    const newBaseMatk = Math.floor(((itemDef.baseMatk || 0) + (itemDef.bonusMatk || 0)) * newGradeMult);
    const curBaseMatk = Math.floor(((currentDef?.baseMatk || 0) + (currentDef?.bonusMatk || 0)) * curGradeMult);

    const newBaseDef = Math.floor((itemDef.baseDef || 0) * newGradeMult);
    const curBaseDef = Math.floor((currentDef?.baseDef || 0) * curGradeMult);

    let newAffixHp = 0, curAffixHp = 0;
    let newAffixFlee = 0, curAffixFlee = 0;

    itemToInspect?.affixes?.forEach((a) => {
      if (a.type === 'AFFIX_MAX_HP') newAffixHp += a.value;
      if (a.type === 'AFFIX_FLEE') newAffixFlee += a.value;
    });

    currentEquipped?.affixes?.forEach((a) => {
      if (a.type === 'AFFIX_MAX_HP') curAffixHp += a.value;
      if (a.type === 'AFFIX_FLEE') curAffixFlee += a.value;
    });

    const newAtk =
      newBaseAtk +
      (itemDef.slot === 'weapon' ? CombatSystem.getRefineAtkBonus(newTier, newRefine) : 0);
    const curAtk =
      curBaseAtk +
      (currentDef?.slot === 'weapon' ? CombatSystem.getRefineAtkBonus(curTier, curRefine) : 0);
    const diffAtk = newAtk - curAtk;

    const newMatk =
      newBaseMatk +
      (itemDef.slot === 'weapon' && itemDef.archetype === 'MAGIC_STAFF'
        ? CombatSystem.getRefineAtkBonus(newTier, newRefine)
        : 0);
    const curMatk =
      curBaseMatk +
      (currentDef?.slot === 'weapon' && currentDef?.archetype === 'MAGIC_STAFF'
        ? CombatSystem.getRefineAtkBonus(curTier, curRefine)
        : 0);
    const diffMatk = newMatk - curMatk;

    const newDef =
      newBaseDef +
      (itemDef.slot !== 'weapon' &&
      itemDef.slot !== 'accessory1' &&
      itemDef.slot !== 'accessory2'
        ? CombatSystem.getRefineDefBonus(newTier, newRefine)
        : 0);
    const curDef =
      curBaseDef +
      (currentDef &&
      currentDef.slot !== 'weapon' &&
      currentDef.slot !== 'accessory1' &&
      currentDef.slot !== 'accessory2'
        ? CombatSystem.getRefineDefBonus(curTier, curRefine)
        : 0);
    const diffDef = newDef - curDef;

    const diffFlee = (itemDef.bonusFlee || 0) + newAffixFlee - ((currentDef?.bonusFlee || 0) + curAffixFlee);
    const diffHp = (itemDef.bonusMaxHp || 0) + newAffixHp - ((currentDef?.bonusMaxHp || 0) + curAffixHp);
    const diffMoveSpeed = (itemDef.bonusMoveSpeed || 0) - (currentDef?.bonusMoveSpeed || 0);

    return {
      slotToCompare,
      currentEquipped,
      currentDef,
      diffAtk,
      diffMatk,
      diffDef,
      diffFlee,
      diffHp,
      diffMoveSpeed,
    };
  };

  const getArchetypeLabel = (arch?: WeaponArchetype) => {
    switch (arch) {
      case 'MELEE_SWORD':
        return { label: 'Меч (Ближний бой, STR)', perk: 'Фронтальный клив 25% урона в радиусе 45px' };
      case 'RANGED_BOW':
        return { label: 'Лук (Дальний бой, DEX)', perk: 'Физические стрелы (580px/s) на дистанции 270px' };
      case 'MAGIC_STAFF':
        return { label: 'Посох (Магия, INT/DEX)', perk: 'Самонаводящиеся сферы маны (100% точность, обход FLEE)' };
      case 'HOLY_MACE':
        return { label: 'Булава (Священная, STR/INT)', perk: 'Игнорирует 30% брони, +50% по нежити, Святой Резонанс' };
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-auto flex items-center justify-center bg-black/60 z-50 p-3 select-none">
      <div className="w-[920px] max-w-[95vw] h-[540px] max-h-[82vh] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/70 rounded-3xl shadow-2xl p-4 text-slate-100 backdrop-blur-md flex flex-col">
        {/* Шапка окна и кнопка закрытия */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🎒</span>
            <h2 className="text-base font-black text-amber-400 tracking-wide">
              Рюкзак
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenStats && (
              <button
                onClick={() => {
                  onClose();
                  onOpenStats();
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                title="Перейти в окно характеристик"
              >
                <span>📊</span>
                <span>Характеристики</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs transition"
              title="Закрыть (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2 Колонки: Бумажная кукла (4/12) и Расширенный Рюкзак (8/12) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden flex-1 mt-2.5 min-h-0">
          {/* КОЛОНКА 1 (4/12): Бумажная кукла (Надето) + Сводка экипировки */}
          <div className="lg:col-span-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>Экипировка</span>
                </h3>
              </div>

              {/* 8 Слотов экипировки (Paper-Doll: 2x4 Сетка) */}
              <div className="grid grid-cols-2 gap-1.5">
                {slots.map(({ slot, label, icon }) => {
                  const item = equipped[slot];
                  const def = item ? ITEMS_DATABASE[item.itemId] : null;
                  const isSelected = selectedSource === 'equipped' && selectedEquipSlot === slot;
                  const totalSlots = getItemTotalSlots(item, def);
                  const theme = getItemGradeTheme(item);

                  return (
                    <div
                      key={slot}
                      onClick={() => handleSelectEquipped(slot, item || null)}
                      onMouseEnter={(e) => {
                        if (item) handleShowTooltip(item, e as any);
                      }}
                      onMouseLeave={handleHideTooltip}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (item) handleUnequip(slot);
                      }}
                      className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-400 shadow-md ring-1 ring-amber-500/50'
                          : item
                          ? `bg-slate-800/60 hover:bg-slate-800 ${theme.borderColor}`
                          : 'bg-slate-950/40 border-dashed border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 overflow-hidden flex-1 min-w-0">
                        <span className="text-sm w-5 h-5 rounded-md bg-slate-900/80 flex items-center justify-center border border-slate-800 shrink-0">
                          {def?.icon || icon}
                        </span>
                        <div className="overflow-hidden min-w-0 flex-1">
                          <div className="text-[8px] uppercase font-bold text-slate-400 tracking-wider truncate">
                            {label}
                          </div>
                          <div className={`text-[10px] font-bold truncate ${item ? theme.textColor : 'text-slate-500'}`}>
                            {item && def ? (
                              <span>
                                {item.setId && <span className="text-purple-400 mr-0.5">✨</span>}
                                {item.legendaryMod && <span className="text-amber-400 mr-0.5">🌟</span>}
                                {getRoItemDisplayName(item, true)}
                              </span>
                            ) : (
                              <span className="italic text-slate-600 font-normal">Пусто</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {item && (
                        <div className="flex items-center space-x-1 shrink-0 ml-1">
                          {totalSlots > 0 && (
                            <div className="flex space-x-0.5">
                              {Array.from({ length: totalSlots }).map((_, idx) => {
                                const cardId = item.insertedCards?.[idx];
                                return (
                                  <span
                                    key={idx}
                                    className={`text-[7px] w-2.5 h-2.5 flex items-center justify-center rounded font-black ${
                                      cardId
                                        ? 'bg-amber-500 text-slate-950'
                                        : 'bg-slate-900 text-slate-600 border border-slate-800'
                                    }`}
                                    title={cardId ? `Карта: ${cardId}` : 'Свободный сокет'}
                                  >
                                    {cardId ? '★' : '○'}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnequip(slot);
                            }}
                            className="text-[11px] text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 w-4 h-4 flex items-center justify-center rounded transition"
                            title="Снять в рюкзак"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Сводка суммарных бонусов всей экипировки */}
              <div className="mt-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                  Бонусы экипировки:
                </div>
                <div className="grid grid-cols-3 gap-1 text-center text-xs">
                  <div className="bg-slate-900/80 p-1 rounded border border-slate-800">
                    <div className="text-[9px] text-slate-400">⚔️ ATK</div>
                    <div className="font-bold text-amber-300">+{totalEquipAtk}</div>
                  </div>
                  <div className="bg-slate-900/80 p-1 rounded border border-slate-800">
                    <div className="text-[9px] text-slate-400">🪄 MATK</div>
                    <div className="font-bold text-sky-300">+{totalEquipMatk}</div>
                  </div>
                  <div className="bg-slate-900/80 p-1 rounded border border-slate-800">
                    <div className="text-[9px] text-slate-400">🛡️ DEF</div>
                    <div className="font-bold text-emerald-300">+{totalEquipDef}</div>
                  </div>
                </div>

                {Object.keys(totalEquipStatBonuses).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1 text-[9px]">
                    {Object.entries(totalEquipStatBonuses).map(([stat, val]) => (
                      <span
                        key={stat}
                        className="bg-purple-950/40 text-purple-300 px-1 py-0.2 rounded border border-purple-500/20 font-semibold"
                      >
                        +{val} {stat.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Настройка авто-зелий */}
            <div className="mt-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-slate-300 flex items-center gap-1 text-[11px]">
                  <span>🧪</span>
                  <span>Авто-зелья:</span>
                </span>
                <span className="font-bold text-rose-400 text-xs">{autoPotionPercent}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={autoPotionPercent}
                onChange={(e) => handleAutoPotionChange(Number((e.target as HTMLInputElement).value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>
          </div>

          {/* КОЛОНКА 2 (8/12): Расширенный Рюкзак с табами категорий */}
          <div className="lg:col-span-8 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex flex-col justify-between overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <span>📦</span>
                  <span>Рюкзак ({inventory.length} / 100)</span>
                </h3>
              </div>

              {/* Табы-фильтры категорий */}
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {[
                  { id: 'all', label: 'Все', icon: '📦', count: inventory.length },
                  { id: 'equip', label: 'Экип', icon: '⚔️', count: countEquip },
                  { id: 'card', label: 'Карты', icon: '🃏', count: countCards },
                  { id: 'consumable', label: 'Зелья', icon: '🧪', count: countConsumables },
                  { id: 'material', label: 'Лут', icon: '💎', count: countMaterials },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCategoryFilter(f.id as InventoryCategory)}
                    className={`py-1 px-1.5 rounded-xl text-center transition flex items-center justify-center gap-1 ${
                      categoryFilter === f.id
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm ring-1 ring-amber-400'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                    }`}
                    title={`${f.label} (${f.count} шт.)`}
                  >
                    <span className="text-xs">{f.icon}</span>
                    <span className="text-[11px] font-bold truncate">{f.label}</span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                        categoryFilter === f.id
                          ? 'bg-slate-950/20 text-slate-950 font-black'
                          : 'bg-slate-900/60 text-amber-400'
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Сетка предметов рюкзака (Фиксированный размер ячеек, 4 колонки, top-aligned) */}
              <div className="grid grid-cols-4 gap-1.5 content-start auto-rows-max overflow-y-auto flex-1 min-h-0 pr-1">
                {filteredInventory.map((item) => {
                  const def = ITEMS_DATABASE[item.itemId];
                  const card = CARDS_DATABASE[item.itemId];
                  const isCard = !!card;
                  const isEquip = def?.type === 'equip';
                  const isConsumable = def?.type === 'consumable';
                  const isSelected = selectedSource === 'inventory' && selectedItemUid === item.uid;
                  const mainStat = getItemMainStatPreview(item);
                  const isUpgrade = isEquip ? checkIsUpgrade(item) : false;
                  const totalSlots = getItemTotalSlots(item, def);
                  const theme = isCard
                    ? {
                        borderColor: 'border-rose-500/40 shadow-sm shadow-rose-500/20',
                        textColor: 'text-rose-300',
                      }
                    : getItemGradeTheme(item);

                  return (
                    <div
                      key={item.uid}
                      onClick={() => handleSelectInventory(item)}
                      onMouseEnter={(e) => handleShowTooltip(item, e)}
                      onMouseLeave={handleHideTooltip}
                      onDblClick={() => {
                        if (isEquip) handleEquipItem(item.uid);
                        else if (isConsumable) handleUseConsumable(item.uid);
                        else if (isCard) setSelectedCardId(item.itemId);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (isEquip) handleEquipItem(item.uid);
                        else if (isConsumable) handleUseConsumable(item.uid);
                        else if (isCard) setSelectedCardId(item.itemId);
                      }}
                      className={`h-11 min-h-[44px] max-h-[44px] p-1 rounded-xl border transition cursor-pointer flex items-center space-x-1.5 relative group select-none ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-400 shadow-md ring-1 ring-amber-500/50'
                          : isCard
                          ? 'bg-rose-950/20 hover:bg-rose-950/40 border-rose-500/30'
                          : isEquip
                          ? `bg-slate-800/80 hover:bg-slate-800 ${theme.borderColor}`
                          : isConsumable
                          ? 'bg-slate-800/80 hover:bg-emerald-950/30 border-emerald-500/30'
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/50'
                      }`}
                    >
                      {/* Иконка в рамке редкости с бейджами заточки и стека */}
                      <div
                        className={`w-8 h-8 min-w-[32px] max-w-[32px] min-h-[32px] max-h-[32px] rounded-lg bg-slate-900/90 border flex items-center justify-center text-lg shrink-0 relative ${theme.borderColor}`}
                      >
                        <span>{card ? '🎴' : def?.icon || '📦'}</span>

                        {item.refineLevel > 0 && (
                          <span className="absolute -top-1 -left-1 bg-amber-500 text-slate-950 px-1 py-0.2 rounded text-[7px] font-black leading-none shadow">
                            +{item.refineLevel}
                          </span>
                        )}

                        {/* Бейдж тира для эссенций и душ боссов (T1..T5) */}
                        {!item.refineLevel && (item.itemId.startsWith('elite_essence_t') || item.itemId.startsWith('boss_soul_t')) && (
                          <span className="absolute -top-1 -left-1 bg-purple-900/95 text-purple-200 border border-purple-400/70 px-1 py-0.2 rounded font-mono font-black text-[7px] leading-none shadow">
                            T{item.itemId.slice(-1)}
                          </span>
                        )}

                        {item.count > 1 && (
                          <span className="absolute -bottom-1 -right-1 bg-slate-950/90 text-amber-300 border border-slate-800 px-1 py-0.2 rounded font-mono font-bold text-[7px] leading-none shadow">
                            x{item.count}
                          </span>
                        )}
                      </div>

                      {/* Название и параметр */}
                      <div className="flex-1 min-w-0 overflow-hidden pr-3">
                        <div
                          className={`text-[10px] font-bold truncate flex items-center leading-tight ${theme.textColor}`}
                        >
                          {item.setId && (
                            <span className="text-purple-400 mr-0.5 text-[9px]">✨</span>
                          )}
                          {item.legendaryMod && (
                            <span className="text-amber-400 mr-0.5 text-[9px]">🌟</span>
                          )}
                          <span className="truncate">{getRoItemDisplayName(item, false)}</span>
                        </div>

                        <div className="flex items-center justify-between text-[9px] mt-0.5 leading-tight">
                          <span className={`font-semibold truncate ${mainStat.color}`}>
                            {mainStat.value ? `${mainStat.label} ${mainStat.value}` : mainStat.label}
                          </span>

                          {/* Индикаторы сокетов под карты ○ ● */}
                          {isEquip && totalSlots > 0 && (
                            <span
                              className="text-[7px] text-slate-500 flex space-x-0.5 ml-1 shrink-0"
                              title={`Сокеты: ${item.insertedCards?.length || 0}/${totalSlots}`}
                            >
                              {Array.from({ length: totalSlots }).map((_, idx) => (
                                <span
                                  key={idx}
                                  className={
                                    item.insertedCards?.[idx] ? 'text-amber-400' : 'text-slate-600'
                                  }
                                >
                                  {item.insertedCards?.[idx] ? '●' : '○'}
                                </span>
                              ))}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Маркер апгрейда */}
                      {isUpgrade && (
                        <span
                          className={`absolute top-1 ${item.isLocked ? 'right-4' : 'right-1'} text-emerald-400 text-[8px] font-black animate-pulse`}
                          title="Характеристики выше надетых!"
                        >
                          ▲
                        </span>
                      )}

                      {/* Иконка / кнопка блокировки предмета */}
                      {(isEquip || isCard) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            player.toggleItemLock(item.uid);
                          }}
                          className={`absolute top-1 right-1 w-3 h-3 rounded flex items-center justify-center text-[8px] transition ${
                            item.isLocked
                              ? 'text-amber-400 opacity-100'
                              : 'text-slate-500 opacity-0 group-hover:opacity-100 hover:text-amber-300'
                          }`}
                          title={
                            item.isLocked
                              ? 'Предмет защищен (кликните, чтобы разблокировать)'
                              : 'Заблокировать (защитить от продажи/разборки)'
                          }
                        >
                          {item.isLocked ? '🔒' : '🔓'}
                        </button>
                      )}
                    </div>
                  );
                })}

                {filteredInventory.length === 0 && (
                  <div className="col-span-full py-16 text-center text-slate-500 italic text-xs">
                    В этой категории нет предметов.
                  </div>
                )}
              </div>
            </div>

            {/* Подвал рюкзака: Баланс кошелька + Быстрые действия с выбранным предметом */}
            <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center h-8">
              {/* Кошелек */}
              <div className="flex items-center space-x-1.5 text-xs shrink-0">
                <span className="text-slate-400 font-semibold">Баланс:</span>
                <span className="text-amber-400 font-black font-mono flex items-center gap-1 text-xs bg-slate-950/60 px-2 py-0.5 rounded-lg border border-slate-800">
                  <span>💰</span>
                  <span>{player.zeny.toLocaleString('ru-RU')} Z</span>
                </span>
              </div>

              {/* Панель действий выбранного предмета */}
              {selectedItem && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-300 truncate max-w-[160px] mr-1 hidden md:inline">
                    {getRoItemDisplayName(selectedItem, true)}
                  </span>

                  {selectedSource === 'equipped' && selectedEquipSlot && (
                    <button
                      onClick={() => handleUnequip(selectedEquipSlot)}
                      className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-rose-300 border border-slate-700 hover:border-rose-500 font-bold text-xs transition active:scale-95 flex items-center gap-1"
                      title="Снять предмет в рюкзак"
                    >
                      <span>✕</span>
                      <span>Снять</span>
                    </button>
                  )}

                  {selectedSource === 'inventory' && selectedDef?.type === 'equip' && (
                    <button
                      onClick={() => handleEquipItem(selectedItem.uid)}
                      className="py-1 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95 shadow-sm shadow-amber-500/20 flex items-center gap-1"
                      title="Надеть предмет на героя"
                    >
                      <span>🛡️</span>
                      <span>Надеть</span>
                    </button>
                  )}

                  {selectedDef?.type === 'equip' && (() => {
                    const totalSlots = getItemTotalSlots(selectedItem, selectedDef);
                    const freeSlots = totalSlots - (selectedItem?.insertedCards?.length || 0);
                    if (freeSlots <= 0) return null;
                    const hasMatchingCards = inventory.some((inv) => {
                      const c = CARDS_DATABASE[inv.itemId];
                      if (!c) return false;
                      const isAcc = c.targetSlot === 'accessory' && (selectedDef.slot === 'accessory1' || selectedDef.slot === 'accessory2');
                      return c.targetSlot === selectedDef.slot || isAcc;
                    });
                    if (!hasMatchingCards) return null;
                    return (
                      <button
                        onClick={() => setTargetItemForSocketing(selectedItem)}
                        className="py-1 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition active:scale-95 shadow-sm shadow-rose-500/20 flex items-center gap-1"
                        title="Вставить карту в свободный сокет"
                      >
                        <span>🃏</span>
                        <span>Вставить карту</span>
                      </button>
                    );
                  })()}

                  {selectedSource === 'inventory' && selectedDef?.type === 'consumable' && (
                    <button
                      onClick={() => handleUseConsumable(selectedItem.uid)}
                      className="py-1 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition active:scale-95 shadow-sm shadow-emerald-500/20 flex items-center gap-1"
                      title="Использовать расходник"
                    >
                      <span>🧪</span>
                      <span>Использовать ({selectedItem.count} шт.)</span>
                    </button>
                  )}

                  {selectedSource === 'inventory' && selectedCardDef && (
                    <button
                      onClick={() => setSelectedCardId(selectedItem.itemId)}
                      className="py-1 px-3 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-black text-xs transition active:scale-95 shadow-sm shadow-rose-500/20 flex items-center gap-1"
                      title="Инкрустировать карту в экипировку"
                    >
                      <span>🃏</span>
                      <span>Вставить</span>
                    </button>
                  )}

                  {(selectedDef?.type === 'equip' || selectedCardDef) && (
                    <button
                      onClick={() => player.toggleItemLock(selectedItem.uid)}
                      className={`py-1 px-2 rounded-lg border text-xs font-bold transition flex items-center gap-1 ${
                        selectedItem.isLocked
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title={
                        selectedItem.isLocked
                          ? 'Снять защиту (разблокировать)'
                          : 'Заблокировать от продажи/разборки'
                      }
                    >
                      <span>{selectedItem.isLocked ? '🔒' : '🔓'}</span>
                      <span className="hidden lg:inline">
                        {selectedItem.isLocked ? 'Защищен' : 'Защитить'}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedItemUid(null);
                      setSelectedSource(null);
                      setSelectedEquipSlot(null);
                    }}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition"
                    title="Снять выбор"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Модальное окно инкрустации Карты */}
        {selectedCardId && (
          <div className="absolute inset-0 bg-black/80 rounded-3xl flex items-center justify-center p-6 z-50">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl p-5 max-w-md w-full shadow-2xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-amber-400 text-base flex items-center gap-2">
                  <span>🃏</span>
                  <span>Вставка карты: {CARDS_DATABASE[selectedCardId]?.name}</span>
                </h3>
                <button
                  onClick={() => setSelectedCardId(null)}
                  className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-300 mb-3 bg-slate-800/40 p-2 rounded-lg border border-slate-700">
                {CARDS_DATABASE[selectedCardId]?.description}
              </p>

              <p className="text-xs text-slate-400 mb-2 font-semibold">
                Выберите совместимую экипировку со свободными сокетами:
              </p>

              <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4 pr-1">
                {(() => {
                  const card = CARDS_DATABASE[selectedCardId];
                  const candidates = Object.values(equipped)
                    .concat(inventory)
                    .filter((item): item is InventoryItem => {
                      if (!item) return false;
                      const def = ITEMS_DATABASE[item.itemId];
                      if (!def || def.type !== 'equip') return false;
                      const totalSlots = getItemTotalSlots(item, def);
                      const isAccMatch =
                        card.targetSlot === 'accessory' &&
                        (def.slot === 'accessory1' || def.slot === 'accessory2');
                      return (
                        (def.slot === card.targetSlot || isAccMatch) &&
                        totalSlots > (item.insertedCards?.length || 0)
                      );
                    });

                  if (candidates.length === 0) {
                    return (
                      <div className="py-6 text-center text-slate-500 italic text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                        Нет совместимой экипировки со свободными сокетами для слота [{EQUIP_SLOT_LABELS[card?.targetSlot || '']?.toUpperCase() || card?.targetSlot?.toUpperCase() || ''}]
                      </div>
                    );
                  }

                  return candidates.map((item) => {
                    const def = ITEMS_DATABASE[item.itemId];
                    const totalSlots = getItemTotalSlots(item, def);
                    const freeSlots = totalSlots - (item.insertedCards?.length || 0);
                    const isEquipped = Object.values(equipped).some((e) => e?.uid === item.uid);

                    return (
                      <button
                        key={item.uid}
                        onClick={() => handleSocketCard(item)}
                        className="w-full flex items-center justify-between p-2.5 bg-slate-800 hover:bg-amber-900/40 border border-slate-700 hover:border-amber-500 rounded-xl text-left text-xs transition active:scale-95"
                      >
                        <div className="flex items-center space-x-2">
                          <span>{def?.icon || '⚔️'}</span>
                          <div>
                            <span className="font-semibold text-slate-200">
                              {item.refineLevel > 0 && `+${item.refineLevel} `}
                              {def ? getCleanItemName(def.name) : ''}
                            </span>
                            {isEquipped && (
                              <span className="ml-1.5 text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30">
                                Надето
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-amber-400 font-bold text-[11px]">
                          Свободно: {freeSlots}
                        </span>
                      </button>
                    );
                  });
                })()}
              </div>

              <button
                onClick={() => setSelectedCardId(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Модальное окно инкрустации Карты из выбранного предмета экипировки */}
        {targetItemForSocketing && (
          <div className="absolute inset-0 bg-black/80 rounded-3xl flex items-center justify-center p-6 z-50">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl p-5 max-w-md w-full shadow-2xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-amber-400 text-base flex items-center gap-2">
                  <span>🃏</span>
                  <span>
                    Вставка в: {targetItemForSocketing.refineLevel > 0 && `+${targetItemForSocketing.refineLevel} `}
                    {getCleanItemName(ITEMS_DATABASE[targetItemForSocketing.itemId]?.name || '')}
                  </span>
                </h3>
                <button
                  onClick={() => setTargetItemForSocketing(null)}
                  className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-2 font-semibold">
                Выберите совместимую карту из рюкзака:
              </p>

              <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4 pr-1">
                {(() => {
                  const targetDef = ITEMS_DATABASE[targetItemForSocketing.itemId];
                  const cardCandidates = inventory.filter((inv) => {
                    const c = CARDS_DATABASE[inv.itemId];
                    if (!c) return false;
                    const isAcc =
                      c.targetSlot === 'accessory' &&
                      (targetDef?.slot === 'accessory1' || targetDef?.slot === 'accessory2');
                    return targetDef && (c.targetSlot === targetDef.slot || isAcc);
                  });

                  if (cardCandidates.length === 0) {
                    return (
                      <div className="py-6 text-center text-slate-500 italic text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                        В рюкзаке нет совместимых карт для слота [{EQUIP_SLOT_LABELS[targetDef?.slot || '']?.toUpperCase() || targetDef?.slot?.toUpperCase() || ''}]
                      </div>
                    );
                  }

                  return cardCandidates.map((cardItem) => {
                    const card = CARDS_DATABASE[cardItem.itemId];
                    if (!card) return null;
                    return (
                      <button
                        key={cardItem.uid}
                        onClick={() => {
                          const ok = player.insertCard(targetItemForSocketing.uid, card.id);
                          if (ok) setTargetItemForSocketing(null);
                        }}
                        className="w-full flex items-center justify-between p-2.5 bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500 rounded-xl text-left text-xs transition active:scale-95"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🎴</span>
                          <div>
                            <div className="font-semibold text-rose-300">{card.name}</div>
                            <div className="text-[10px] text-slate-400">{card.description}</div>
                          </div>
                        </div>
                        <span className="text-amber-400 font-mono font-bold text-xs shrink-0 ml-2">
                          x{cardItem.count}
                        </span>
                      </button>
                    );
                  });
                })()}
              </div>

              <button
                onClick={() => setTargetItemForSocketing(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Всплывающий подробный тултип предмета */}
      {activeTooltip && (() => {
        const item = activeTooltip.item;
        const def = ITEMS_DATABASE[item.itemId];
        const cardDef = CARDS_DATABASE[item.itemId];
        const isCard = !!cardDef;
        const isEquip = def?.type === 'equip';
        const isConsumable = def?.type === 'consumable';
        const isItemEquipped = Object.values(equipped).some((e) => e?.uid === item.uid);
        const compDiff = isEquip && !isItemEquipped ? getComparisonDiff(item, false) : null;
        const theme = isCard
          ? {
              borderColor: 'border-rose-500 shadow-rose-500/30',
              badgeBg: 'bg-rose-500/20',
              badgeText: 'text-rose-300 font-bold',
              badgeBorder: 'border-rose-500/40',
            }
          : getItemGradeTheme(item);

        const tier = item.tier || def?.tier || 1;
        const refine = item.refineLevel || 0;
        const refAtk = CombatSystem.getRefineAtkBonus(tier, refine);
        const refDef = CombatSystem.getRefineDefBonus(tier, refine);
        const gradeMult = getItemGradeMultiplier(item);

        const rawAtk = (def?.baseAtk || 0) + (def?.bonusAtk || 0);
        const baseAtk = rawAtk > 0 ? Math.floor(rawAtk * gradeMult) : undefined;
        const rawMatk = (def?.baseMatk || 0) + (def?.bonusMatk || 0);
        const baseMatk = rawMatk > 0 ? Math.floor(rawMatk * gradeMult) : undefined;
        const baseDef = def?.baseDef !== undefined ? Math.floor(def.baseDef * gradeMult) : undefined;
        const totalSlots = getItemTotalSlots(item, def);

        const isArmorRefine =
          isEquip &&
          refine > 4 &&
          (def?.slot === 'head' ||
            def?.slot === 'armor' ||
            def?.slot === 'garment' ||
            def?.slot === 'footgear' ||
            (def?.slot === 'offhand' && def.offhandType === 'shield'));
        const refineHpBonusPct = isArmorRefine ? (refine - 4) * 2 : 0;

        const gradeInfo = item.craftGrade ? CRAFT_GRADE_INFO[item.craftGrade] : null;
        const legModDef = item.legendaryMod ? LEGENDARY_MODS_DATA[item.legendaryMod] : null;

        return (
          <div
            ref={tooltipRef}
            style={{ opacity: 0 }}
            className={`fixed z-[100] pointer-events-none w-72 bg-slate-950/95 border-2 ${theme.borderColor} rounded-2xl shadow-2xl p-3 text-slate-100 backdrop-blur-md transition-opacity duration-75 space-y-2 select-none`}
          >
            {/* Шапка тултипа: Иконка, Название, Редкость */}
            <div className="flex items-start space-x-2.5 pb-2 border-b border-slate-800">
              <div className={`w-10 h-10 rounded-xl bg-slate-900 border flex items-center justify-center text-xl shrink-0 ${theme.borderColor}`}>
                {isCard ? '🎴' : def?.icon || '📦'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-amber-300 truncate flex items-center gap-1">
                  {item.setId && <span className="text-purple-400">✨</span>}
                  {item.legendaryMod && <span className="text-amber-400">🌟</span>}
                  <span className="truncate">{getRoItemDisplayName(item, true)}</span>
                </div>
                <div className="flex items-center gap-1 mt-1 flex-wrap text-[9px]">
                  {isEquip && gradeInfo && (
                    <span className={`px-1.5 py-0.2 rounded border font-bold ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                      {gradeInfo.badge}
                    </span>
                  )}
                  {isEquip && def?.slot && (
                    <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
                      {EQUIP_SLOT_LABELS[def.slot]?.toUpperCase() || def.slot.toUpperCase()}
                    </span>
                  )}
                  {def?.tier ? (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      Т{tier} (Lv.{def.requiredLevel || 1}+)
                    </span>
                  ) : (item.itemId.startsWith('elite_essence_t') || item.itemId.startsWith('boss_soul_t')) ? (
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                      Т{item.itemId.slice(-1)} ({item.itemId.startsWith('boss_soul_') ? 'MVP' : 'Элита'})
                    </span>
                  ) : null}
                  {isCard && cardDef && (
                    <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                      Карта [{EQUIP_SLOT_LABELS[cardDef.targetSlot]?.toUpperCase() || cardDef.targetSlot.toUpperCase()}]
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Боевые характеристики экипировки */}
            {isEquip && def && (
              <div className="space-y-1 text-[11px]">
                {baseAtk !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">⚔️ Физическая атака (ATK):</span>
                    <span className="font-bold text-amber-300">
                      +{baseAtk + (def.slot === 'weapon' ? refAtk : 0)}
                      {refine > 0 && def.slot === 'weapon' && (
                        <span className="text-[9px] text-amber-400 font-normal ml-0.5">(+{refAtk} заточка)</span>
                      )}
                    </span>
                  </div>
                )}

                {baseMatk !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">🪄 Магическая атака (MATK):</span>
                    <span className="font-bold text-sky-300">
                      +{baseMatk + (def.archetype === 'MAGIC_STAFF' ? refAtk : 0)}
                      {refine > 0 && def.archetype === 'MAGIC_STAFF' && (
                        <span className="text-[9px] text-sky-400 font-normal ml-0.5">(+{refAtk} заточка)</span>
                      )}
                    </span>
                  </div>
                )}

                {baseDef !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">🛡️ Защита брони (DEF):</span>
                    <span className="font-bold text-emerald-300">
                      +{baseDef + (def.slot !== 'weapon' && def.slot !== 'accessory1' && def.slot !== 'accessory2' ? refDef : 0)}
                      {refine > 0 && def.slot !== 'weapon' && def.slot !== 'accessory1' && def.slot !== 'accessory2' && (
                        <span className="text-[9px] text-emerald-400 font-normal ml-0.5">(+{refDef} заточка)</span>
                      )}
                    </span>
                  </div>
                )}

                {refineHpBonusPct > 0 && (
                  <div className="flex justify-between items-center text-emerald-300 font-bold">
                    <span>✨ Заточка брони (+{refine}):</span>
                    <span>+{refineHpBonusPct}% MaxHP</span>
                  </div>
                )}

                {def.spRegen !== undefined && def.spRegen > 0 && (
                  <div className="flex justify-between items-center text-indigo-300">
                    <span>⚡ Регенерация SP:</span>
                    <span className="font-bold">+{def.spRegen} SP/сек</span>
                  </div>
                )}

                {def.blockChance !== undefined && def.blockChance > 0 && (
                  <div className="flex justify-between items-center text-blue-300">
                    <span>🛡️ Шанс блока щитом:</span>
                    <span className="font-bold">+{def.blockChance}%</span>
                  </div>
                )}

                {def.bonusCrit !== undefined && def.bonusCrit > 0 && (
                  <div className="flex justify-between items-center text-amber-300">
                    <span>🎯 Шанс крита (CRIT):</span>
                    <span className="font-bold">+{def.bonusCrit}%</span>
                  </div>
                )}

                {def.bonusMaxSp !== undefined && def.bonusMaxSp > 0 && (
                  <div className="flex justify-between items-center text-indigo-300">
                    <span>🔷 Запас маны:</span>
                    <span className="font-bold">+{def.bonusMaxSp} SP</span>
                  </div>
                )}

                {def.primaryStatBonus && (
                  <div className="flex justify-between items-center text-sky-300">
                    <span>✨ Характеристика:</span>
                    <span className="font-bold">+{def.primaryStatBonus.value} {def.primaryStatBonus.stat.toUpperCase()}</span>
                  </div>
                )}

                {def.bonusMaxHp && (
                  <div className="flex justify-between items-center text-rose-300">
                    <span>💚 Здоровье:</span>
                    <span className="font-bold">+{def.bonusMaxHp} HP</span>
                  </div>
                )}

                {def.bonusFlee && (
                  <div className="flex justify-between items-center text-teal-300">
                    <span>💨 Уворот:</span>
                    <span className="font-bold">+{def.bonusFlee} FLEE</span>
                  </div>
                )}

                {def.bonusMoveSpeed && (
                  <div className="flex justify-between items-center text-blue-300">
                    <span>👟 Скорость:</span>
                    <span className="font-bold">+{def.bonusMoveSpeed} px/s</span>
                  </div>
                )}

                {/* Фиксированные свойства Реликвии (RELIC) */}
                {item.craftGrade === 'RELIC' && (
                  <div className="pt-1 border-t border-amber-500/30 text-[10px] space-y-1">
                    {def.slot === 'weapon' ? (
                      <div>
                        {def.archetype === 'MELEE_SWORD' && (
                          <div className="text-amber-300 font-semibold">
                            🌟 Свойство Реликвии: +15% Скорость атаки (ASPD)
                          </div>
                        )}
                        {def.archetype === 'RANGED_BOW' && (
                          <div className="text-amber-300 font-semibold">
                            🌟 Свойство Реликвии: +10% Шанс крита (CRIT)
                          </div>
                        )}
                        {def.archetype === 'MAGIC_STAFF' && (
                          <div className="text-amber-300 font-semibold">
                            🌟 Свойство Реликвии: +18% Магическая атака (MATK)
                          </div>
                        )}
                        {def.archetype === 'HOLY_MACE' && (
                          <div className="text-amber-300 font-semibold">
                            🌟 Свойство Реликвии: +12% Атака и Лечение (ATK/MATK)
                          </div>
                        )}
                        {legModDef && (
                          <div className="text-amber-400 bg-amber-950/40 p-1 rounded border border-amber-500/30 mt-1">
                            <span className="font-bold">{legModDef.icon} {legModDef.name}: </span>
                            <span className="text-slate-300">{legModDef.description}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-amber-300 bg-amber-950/40 p-1.5 rounded border border-amber-500/30 font-medium">
                        🌟 Свойство Реликвии: +3 ко всем характеристикам (STR..LUK), +5% MaxHP/SP
                      </div>
                    )}
                  </div>
                )}

                {/* Сокеты для карт */}
                {totalSlots > 0 && (
                  <div className="pt-1 border-t border-slate-800">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5 font-bold">
                      <span>Сокеты для карт:</span>
                      <span className="text-amber-400 font-mono">
                        {item.insertedCards?.length || 0} / {totalSlots}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {Array.from({ length: totalSlots }).map((_, idx) => {
                        const cardId = item.insertedCards?.[idx];
                        const cDef = cardId ? CARDS_DATABASE[cardId] : null;
                        return (
                          <div
                            key={idx}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center justify-between ${
                              cDef
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-900 text-slate-500 border border-slate-800 border-dashed'
                            }`}
                          >
                            <span>{cDef ? `★ ${cDef.name}` : `○ Слот ${idx + 1}: свободно`}</span>
                            {cDef && (
                              <span className="text-[8px] text-amber-400 font-semibold truncate max-w-[120px]">
                                {cDef.description}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Сет */}
                {item.setId && EQUIPMENT_SETS_DATA[item.setId] && (
                  <div className="pt-1 border-t border-slate-800 text-purple-300 text-[10px]">
                    <span>✨ Комплект: <b>{EQUIPMENT_SETS_DATA[item.setId].name}</b></span>
                  </div>
                )}

                {/* Оружейный архетип */}
                {def.archetype && (() => {
                  const arch = getArchetypeLabel(def.archetype);
                  if (!arch) return null;
                  return (
                    <div className="pt-1 border-t border-slate-800 text-[10px] text-amber-400/90">
                      <span>⚔️ {arch.label}</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Описание зелья */}
            {isConsumable && def && (
              <div className="text-[11px] text-slate-200">
                {def.healAmount ? (
                  <span className="text-emerald-300 font-medium">
                    🧪 Мгновенно восстанавливает <b className="text-emerald-400 font-bold">+{def.healAmount} HP</b>.
                  </span>
                ) : (
                  <span>Расходный предмет</span>
                )}
              </div>
            )}

            {/* Описание карты */}
            {isCard && cardDef && (
              <div className="text-[11px] text-slate-200 space-y-1">
                <div className="text-rose-300">{cardDef.description}</div>
                <div className="text-[10px] text-slate-400">
                  Вставляется в слот: <b className="text-rose-400">{EQUIP_SLOT_LABELS[cardDef.targetSlot] || cardDef.targetSlot.toUpperCase()}</b>
                </div>
              </div>
            )}

            {/* Лут / материалы */}
            {def?.type === 'material' && (
              <div className="text-[11px] text-slate-300 italic">
                💎 Материал для кузницы, создания предметов и заданий.
              </div>
            )}

            {/* Сравнение с текущей экипировкой */}
            {compDiff && (compDiff.diffAtk !== 0 || compDiff.diffMatk !== 0 || compDiff.diffDef !== 0 || compDiff.diffHp !== 0 || compDiff.diffFlee !== 0) && (
              <div className="pt-1.5 border-t border-slate-800 text-[10px]">
                <div className="text-slate-400 font-bold mb-0.5 flex justify-between">
                  <span>Сравнение с надетым:</span>
                  <span className="text-slate-300 truncate max-w-[120px]">
                    {compDiff.currentDef ? getCleanItemName(compDiff.currentDef.name) : 'Пусто'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 font-mono">
                  {compDiff.diffAtk !== 0 && (
                    <span className={compDiff.diffAtk > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      ATK {compDiff.diffAtk > 0 ? `+${compDiff.diffAtk}` : compDiff.diffAtk}
                    </span>
                  )}
                  {compDiff.diffMatk !== 0 && (
                    <span className={compDiff.diffMatk > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      MATK {compDiff.diffMatk > 0 ? `+${compDiff.diffMatk}` : compDiff.diffMatk}
                    </span>
                  )}
                  {compDiff.diffDef !== 0 && (
                    <span className={compDiff.diffDef > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      DEF {compDiff.diffDef > 0 ? `+${compDiff.diffDef}` : compDiff.diffDef}
                    </span>
                  )}
                  {compDiff.diffHp !== 0 && (
                    <span className={compDiff.diffHp > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      HP {compDiff.diffHp > 0 ? `+${compDiff.diffHp}` : compDiff.diffHp}
                    </span>
                  )}
                  {compDiff.diffFlee !== 0 && (
                    <span className={compDiff.diffFlee > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      FLEE {compDiff.diffFlee > 0 ? `+${compDiff.diffFlee}` : compDiff.diffFlee}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
