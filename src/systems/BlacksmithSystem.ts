import { InventoryItem, EquipSlot, ItemTier } from '../types/game.types';
import { ITEMS_DATABASE } from '../data/items.data';
import { CARDS_DATABASE } from '../data/cards.data';
import { Player } from '../entities/Player';
import { SoundFX } from '../core/SoundFX';
import { EventBus } from '../core/EventBus';

export interface RefineInfo {
  zenyCost: number;
  materialId: string;
  materialName: string;
  materialCount: number;
  successChance: number;
}

export interface SynthesisRecipe {
  id: string;
  name: string;
  description: string;
  inputItemId: string;
  inputCount: number;
  outputItemId: string;
  outputCount: number;
  zenyCost: number;
  category: 'essence' | 'soul' | 'ore' | 'salvage';
}

export const SYNTHESIS_RECIPES: SynthesisRecipe[] = [
  // 1. Эссенции Вожаков (3 к 1)
  {
    id: 'synth_essence_t1_to_t2',
    name: 'Эссенция Вожака T2',
    description: 'Синтез 3 эссенций T1 в одну эссенцию T2',
    inputItemId: 'elite_essence_t1',
    inputCount: 3,
    outputItemId: 'elite_essence_t2',
    outputCount: 1,
    zenyCost: 300,
    category: 'essence',
  },
  {
    id: 'synth_essence_t2_to_t3',
    name: 'Эссенция Вожака T3',
    description: 'Синтез 3 эссенций T2 в одну эссенцию T3',
    inputItemId: 'elite_essence_t2',
    inputCount: 3,
    outputItemId: 'elite_essence_t3',
    outputCount: 1,
    zenyCost: 750,
    category: 'essence',
  },
  {
    id: 'synth_essence_t3_to_t4',
    name: 'Эссенция Вожака T4',
    description: 'Синтез 3 эссенций T3 в одну эссенцию T4',
    inputItemId: 'elite_essence_t3',
    inputCount: 3,
    outputItemId: 'elite_essence_t4',
    outputCount: 1,
    zenyCost: 1500,
    category: 'essence',
  },
  {
    id: 'synth_essence_t4_to_t5',
    name: 'Эссенция Вожака T5',
    description: 'Синтез 3 эссенций T4 в одну эссенцию T5',
    inputItemId: 'elite_essence_t4',
    inputCount: 3,
    outputItemId: 'elite_essence_t5',
    outputCount: 1,
    zenyCost: 3000,
    category: 'essence',
  },

  // 2. Души MVP-Боссов (3 к 1)
  {
    id: 'synth_soul_t1_to_t2',
    name: 'Душа MVP-Босса T2',
    description: 'Слияние 3 душ MVP T1 в одну душу T2',
    inputItemId: 'mvp_soul_t1',
    inputCount: 3,
    outputItemId: 'mvp_soul_t2',
    outputCount: 1,
    zenyCost: 1000,
    category: 'soul',
  },
  {
    id: 'synth_soul_t2_to_t3',
    name: 'Душа MVP-Босса T3',
    description: 'Слияние 3 душ MVP T2 в одну душу T3',
    inputItemId: 'mvp_soul_t2',
    inputCount: 3,
    outputItemId: 'mvp_soul_t3',
    outputCount: 1,
    zenyCost: 2500,
    category: 'soul',
  },
  {
    id: 'synth_soul_t3_to_t4',
    name: 'Душа MVP-Босса T4',
    description: 'Слияние 3 душ MVP T3 в одну душу T4',
    inputItemId: 'mvp_soul_t3',
    inputCount: 3,
    outputItemId: 'mvp_soul_t4',
    outputCount: 1,
    zenyCost: 5000,
    category: 'soul',
  },
  {
    id: 'synth_soul_t4_to_t5',
    name: 'Душа MVP-Босса T5',
    description: 'Слияние 3 душ MVP T4 в одну душу T5',
    inputItemId: 'mvp_soul_t4',
    inputCount: 3,
    outputItemId: 'mvp_soul_t5',
    outputCount: 1,
    zenyCost: 10000,
    category: 'soul',
  },

  // 3. Переплавка Руд
  {
    id: 'smelt_copper_to_iron',
    name: 'Выплавка Железной руды',
    description: 'Переплавка 5 кусков медной руды в кусок железной руды',
    inputItemId: 'copper_ore',
    inputCount: 5,
    outputItemId: 'iron_ore',
    outputCount: 1,
    zenyCost: 100,
    category: 'ore',
  },
  {
    id: 'smelt_iron_to_phracon',
    name: 'Выплавка Фракона',
    description: 'Переплавка 5 кусков железной руды во Фракон',
    inputItemId: 'iron_ore',
    inputCount: 5,
    outputItemId: 'phracon',
    outputCount: 1,
    zenyCost: 200,
    category: 'ore',
  },
  {
    id: 'smelt_phracon_to_oridecon',
    name: 'Выплавка Оридекона',
    description: 'Переплавка 5 слитков Фракона в чистый Оридекон',
    inputItemId: 'phracon',
    inputCount: 5,
    outputItemId: 'oridecon',
    outputCount: 1,
    zenyCost: 800,
    category: 'ore',
  },
  {
    id: 'smelt_phracon_to_elunium',
    name: 'Выплавка Элуниума',
    description: 'Переплавка 5 слитков Фракона в чистый Элуниум',
    inputItemId: 'phracon',
    inputCount: 5,
    outputItemId: 'elunium',
    outputCount: 1,
    zenyCost: 800,
    category: 'ore',
  },

  // 4. Обмен материалов старого разбора (1 к 1)
  {
    id: 'convert_scrap_metal',
    name: 'Обмен Обломков металла',
    description: 'Обмен 1 старого обломка на 1 Фракон',
    inputItemId: 'scrap_metal',
    inputCount: 1,
    outputItemId: 'phracon',
    outputCount: 1,
    zenyCost: 50,
    category: 'salvage',
  },
  {
    id: 'convert_magic_dust',
    name: 'Обмен Магической пыли',
    description: 'Обмен 1 магической пыли на 1 Фракон',
    inputItemId: 'magic_dust',
    inputCount: 1,
    outputItemId: 'phracon',
    outputCount: 1,
    zenyCost: 50,
    category: 'salvage',
  },
  {
    id: 'convert_rune_shard',
    name: 'Обмен Рунического осколка',
    description: 'Обмен 1 рунического осколка на 1 Оридекон',
    inputItemId: 'rune_shard',
    inputCount: 1,
    outputItemId: 'oridecon',
    outputCount: 1,
    zenyCost: 100,
    category: 'salvage',
  },
  {
    id: 'convert_star_core',
    name: 'Обмен Звёздного ядра',
    description: 'Обмен 1 звёздного ядра на 1 Элуниум',
    inputItemId: 'star_core',
    inputCount: 1,
    outputItemId: 'elunium',
    outputCount: 1,
    zenyCost: 100,
    category: 'salvage',
  },
];

export class BlacksmithSystem {
  public static readonly CHANCES: Record<number, number> = {
    0: 100, // -> +1
    1: 100, // -> +2
    2: 100, // -> +3
    3: 100, // -> +4 (Безопасный лимит)
    4: 80,  // -> +5
    5: 65,  // -> +6
    6: 50,  // -> +7 (Открывает сияние клинка)
    7: 35,  // -> +8
    8: 25,  // -> +9
    9: 15,  // -> +10
  };

  /**
   * Определение руды для заточки в зависимости от тира и типа слота
   */
  public static getRefineMaterialId(slot: EquipSlot, tier: ItemTier): string {
    if (tier >= 3) {
      return slot === 'weapon' ? 'oridecon' : 'elunium';
    } else if (tier === 2) {
      return slot === 'weapon' ? 'phracon' : 'iron_ore';
    } else {
      return slot === 'weapon' ? 'jellopy' : 'fluff';
    }
  }

  public static getRefineInfo(item: InventoryItem): RefineInfo | null {
    const def = ITEMS_DATABASE[item.itemId];
    if (!def || def.type !== 'equip') return null;

    const currentLvl = item.refineLevel || 0;
    if (currentLvl >= 10) return null;

    const tier = item.tier || def.tier || 1;
    const zenyCost = (currentLvl + 1) * (tier * 150 + 200);
    const materialId = this.getRefineMaterialId(def.slot || 'weapon', tier);
    const materialDef = ITEMS_DATABASE[materialId];
    const materialCount = currentLvl >= 4 ? 3 : 1;
    const successChance = this.CHANCES[currentLvl] ?? 15;

    return {
      zenyCost,
      materialId,
      materialName: materialDef?.name || materialId,
      materialCount,
      successChance,
    };
  }

  public static canRefine(
    item: InventoryItem,
    player: Player
  ): { ok: boolean; reason?: string; info?: RefineInfo } {
    const info = this.getRefineInfo(item);
    if (!info) {
      return { ok: false, reason: 'Предмет достиг максимального уровня заточки (+10)!' };
    }

    if (player.zeny < info.zenyCost) {
      return { ok: false, reason: `Недостаточно Zeny (требуется ${info.zenyCost.toLocaleString()} z)!`, info };
    }

    const matCount = player.getItemCount(info.materialId);
    if (matCount < info.materialCount) {
      return {
        ok: false,
        reason: `Недостаточно материалов: требуется [${info.materialName}] x${info.materialCount} (в наличии: ${matCount})!`,
        info,
      };
    }

    return { ok: true, info };
  }

  public static refine(
    item: InventoryItem,
    player: Player,
    useBlessedStone = false
  ): { success: boolean; newLevel: number; message: string } {
    let targetItem: InventoryItem | null = null;
    let isEquipped = false;

    for (const slot of [
      'weapon',
      'offhand',
      'head',
      'armor',
      'garment',
      'footgear',
      'accessory1',
      'accessory2',
    ] as EquipSlot[]) {
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

    const check = this.canRefine(targetItem, player);
    if (!check.ok || !check.info) {
      return {
        success: false,
        newLevel: targetItem.refineLevel || 0,
        message: check.reason || 'Ошибка заточки',
      };
    }

    const { zenyCost, materialId, materialCount, successChance } = check.info;

    // Списание Zeny и материалов
    player.removeZeny(zenyCost);
    player.removeItemByItemId(materialId, materialCount);

    const rand = Math.random() * 100;
    const isSuccess = rand <= successChance;

    const itemDef = ITEMS_DATABASE[targetItem.itemId];
    const itemName = itemDef?.name || targetItem.itemId;

    if (isSuccess) {
      targetItem.refineLevel = (targetItem.refineLevel || 0) + 1;
      item.refineLevel = targetItem.refineLevel;
      player.recalculateStats();
      SoundFX.playLevelUp();

      if (isEquipped) {
        EventBus.emit('EQUIPMENT_UPDATED', { equipped: { ...player.equipped } });
      } else {
        EventBus.emit('INVENTORY_UPDATED', { items: [...player.inventory] });
      }

      const msg = `🔨 УСПЕХ! [${itemName}] успешно заточен до +${targetItem.refineLevel}!`;
      EventBus.emit('COMBAT_LOG', { message: msg, color: '#fbbf24' });
      return { success: true, newLevel: targetItem.refineLevel, message: msg };
    } else {
      let stoneUsed = false;
      if (targetItem.refineLevel >= 4 && useBlessedStone && player.getItemCount('blessed_refine_stone') > 0) {
        player.removeItemByItemId('blessed_refine_stone', 1);
        stoneUsed = true;
      } else if (targetItem.refineLevel > 4) {
        targetItem.refineLevel -= 1;
      }

      item.refineLevel = targetItem.refineLevel;
      player.recalculateStats();
      SoundFX.playMiss();

      if (isEquipped) {
        EventBus.emit('EQUIPMENT_UPDATED', { equipped: { ...player.equipped } });
      } else {
        EventBus.emit('INVENTORY_UPDATED', { items: [...player.inventory] });
      }

      const stoneMsg = stoneUsed ? ' [Защита Благословенного камня сработала! Уровень сохранен]' : '';
      const msg = `💥 НЕУДАЧА! Заточка сорвалась! Уровень предмета: +${targetItem.refineLevel}.${stoneMsg}`;
      EventBus.emit('COMBAT_LOG', { message: msg, color: '#ef4444' });
      return { success: false, newLevel: targetItem.refineLevel, message: msg };
    }
  }

  // ==========================================
  // БЕЗОПАСНОЕ ИЗВЛЕЧЕНИЕ КАРТ (CARD EXTRACTION)
  // ==========================================

  public static getCardExtractCost(item: InventoryItem): number {
    const tier = item.tier || ITEMS_DATABASE[item.itemId]?.tier || 1;
    return tier * 500;
  }

  public static canExtractCards(
    item: InventoryItem,
    player: Player
  ): { ok: boolean; reason?: string; cost: number } {
    const cost = this.getCardExtractCost(item);
    if (!item.insertedCards || item.insertedCards.length === 0) {
      return { ok: false, reason: 'В предмете нет вставленных карт!', cost };
    }
    if (player.zeny < cost) {
      return {
        ok: false,
        reason: `Недостаточно Zeny: требуется ${cost.toLocaleString()} z (у вас: ${player.zeny.toLocaleString()} z)!`,
        cost,
      };
    }
    return { ok: true, cost };
  }

  public static extractCards(
    item: InventoryItem,
    player: Player
  ): { success: boolean; extractedCards: string[]; message: string } {
    let targetItem: InventoryItem | null = null;
    let isEquipped = false;

    for (const slot of [
      'weapon',
      'offhand',
      'head',
      'armor',
      'garment',
      'footgear',
      'accessory1',
      'accessory2',
    ] as EquipSlot[]) {
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

    const check = this.canExtractCards(targetItem, player);
    if (!check.ok) {
      return { success: false, extractedCards: [], message: check.reason || 'Невозможно извлечь карты' };
    }

    player.removeZeny(check.cost);

    const extractedCards: string[] = [];
    for (const cardId of targetItem.insertedCards) {
      player.addItem(cardId, 1);
      extractedCards.push(CARDS_DATABASE[cardId]?.name || cardId);
    }

    targetItem.insertedCards = [];
    item.insertedCards = [];

    player.recalculateStats();
    SoundFX.playLevelUp();

    if (isEquipped) {
      EventBus.emit('EQUIPMENT_UPDATED', { equipped: { ...player.equipped } });
    } else {
      EventBus.emit('INVENTORY_UPDATED', { items: [...player.inventory] });
    }

    const itemDef = ITEMS_DATABASE[targetItem.itemId];
    const cleanName = itemDef?.name || targetItem.itemId;
    const msg = `🎴 Безопасно извлечено ${extractedCards.length} карт из [${cleanName}]: ${extractedCards.join(', ')} возвращены в инвентарь!`;

    EventBus.emit('COMBAT_LOG', { message: msg, color: '#38bdf8' });
    EventBus.emit('FLOATING_TEXT', {
      text: `Извлечено ${extractedCards.length} карт!`,
      x: player.x,
      y: player.y - 40,
      color: 0x38bdf8,
      isCrit: true,
    });

    return {
      success: true,
      extractedCards,
      message: msg,
    };
  }

  public static canSynthesize(
    recipe: SynthesisRecipe,
    player: Player,
    batches: number = 1
  ): { ok: boolean; reason?: string } {
    if (batches <= 0) return { ok: false, reason: 'Неверное количество!' };
    const totalZeny = recipe.zenyCost * batches;
    if (player.zeny < totalZeny) {
      return { ok: false, reason: `Недостаточно Zeny: требуется ${totalZeny.toLocaleString()} z!` };
    }
    const neededCount = recipe.inputCount * batches;
    const currentCount = player.getItemCount(recipe.inputItemId);
    if (currentCount < neededCount) {
      const inputDef = ITEMS_DATABASE[recipe.inputItemId];
      return {
        ok: false,
        reason: `Недостаточно материалов: требуется ${neededCount}x [${inputDef?.name || recipe.inputItemId}] (у вас: ${currentCount})!`,
      };
    }
    return { ok: true };
  }

  public static synthesize(
    recipe: SynthesisRecipe,
    player: Player,
    batches: number = 1
  ): { success: boolean; message: string } {
    const check = this.canSynthesize(recipe, player, batches);
    if (!check.ok) {
      return { success: false, message: check.reason || 'Ошибка синтеза' };
    }

    const totalZeny = recipe.zenyCost * batches;
    const totalInput = recipe.inputCount * batches;
    const totalOutput = recipe.outputCount * batches;

    player.removeZeny(totalZeny);
    player.removeItem(recipe.inputItemId, totalInput);
    player.addItem(recipe.outputItemId, totalOutput);

    const outDef = ITEMS_DATABASE[recipe.outputItemId];
    const outName = outDef?.name || recipe.outputItemId;
    const msg = `⚗️ Успешный синтез: получено ${totalOutput}x [${outName}]!`;

    SoundFX.playLevelUp();
    EventBus.emit('INVENTORY_UPDATED', { items: [...player.inventory] });
    EventBus.emit('COMBAT_LOG', { message: msg, color: '#38bdf8' });
    EventBus.emit('FLOATING_TEXT', {
      text: `+${totalOutput} ${outName}!`,
      x: player.x,
      y: player.y - 35,
      color: 0x38bdf8,
      isCrit: true,
    });

    return { success: true, message: msg };
  }
}
