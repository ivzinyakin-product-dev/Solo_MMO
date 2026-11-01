import {
  BountyContract,
  BountyContractRequirement,
  InventoryItem,
  EquipSlot,
} from '../types/game.types';
import { ITEMS_DATABASE } from '../data/items.data';
import { CARDS_DATABASE } from '../data/cards.data';
import { Player } from '../entities/Player';
import { EventBus } from '../core/EventBus';
import { SoundFX } from '../core/SoundFX';

export interface OverchargeLevelDef {
  level: number;
  requiredVolume: number;
  bonusPercent: number;
}

export const OVERCHARGE_LEVELS: OverchargeLevelDef[] = [
  { level: 0, requiredVolume: 0, bonusPercent: 0 },
  { level: 1, requiredVolume: 500, bonusPercent: 5 },
  { level: 2, requiredVolume: 1500, bonusPercent: 8 },
  { level: 3, requiredVolume: 3500, bonusPercent: 12 },
  { level: 4, requiredVolume: 7000, bonusPercent: 16 },
  { level: 5, requiredVolume: 12000, bonusPercent: 20 },
  { level: 6, requiredVolume: 18000, bonusPercent: 23 },
  { level: 7, requiredVolume: 26000, bonusPercent: 26 },
  { level: 8, requiredVolume: 36000, bonusPercent: 28 },
  { level: 9, requiredVolume: 50000, bonusPercent: 30 },
  { level: 10, requiredVolume: 75000, bonusPercent: 35 },
];

export interface BountyClientDef {
  name: string;
  icon: string;
  titlePrefix: string;
  dialogues: string[];
}

export const BOUNTY_CLIENTS: BountyClientDef[] = [
  {
    name: 'Алхимик Селия',
    icon: '⚗️',
    titlePrefix: 'Заказ на сырье для настоек',
    dialogues: [
      'Запасы трав и экстрактов стремительно тают! Срочно нужны свежие образцы для варки зелий.',
      'Для нового укрепляющего эликсира требуются чистые ингредиенты. Щедро заплачу!',
    ],
  },
  {
    name: 'Кузнец Бранд',
    icon: '🔨',
    titlePrefix: 'Смазка и крепежи для кузни',
    dialogues: [
      'Для закалки клинков и охлаждения горна требуется природная вязкая смазка.',
      'Готовлю партию брони для гарнизона. Доставьте мне расходные материалы!',
    ],
  },
  {
    name: 'Портной Лука',
    icon: '🪡',
    titlePrefix: 'Поставка мягкого пуха',
    dialogues: [
      'Шью теплые зимние плащи для искателей приключений. Нужен лучший пух Фабре!',
      'Заказчик просит особо мягкую набивку для дорожного плаща. Поможешь достать?',
    ],
  },
  {
    name: 'Трактирщик Ганс',
    icon: '🍲',
    titlePrefix: 'Провиант для постояльцев',
    dialogues: [
      'Наплыв новобранцев в таверну огромен! Требуются свежие хрустящие яблоки и припасы.',
      'Варю фирменное деревенское рагу. Нам срочно нужны свежие деревенские припасы!',
    ],
  },
  {
    name: 'Мастер Вальтер',
    icon: '🔮',
    titlePrefix: 'Исследования Академии Магии',
    dialogues: [
      'Джеллопи содержат кристаллизованную первородную ману. Академия скупает их для опытов.',
      'Провожу ритуал стабилизации защитного барьера деревни. Нужны накопители маны.',
    ],
  },
  {
    name: 'Капитан Роланд',
    icon: '🛡️',
    titlePrefix: 'Снабжение дозора',
    dialogues: [
      'Пограничные посты нуждаются в аптечках и перевязочных материалах. Доставка первостепенна!',
      'Формируем припасы для экспедиции вглубь леса. Награда из казны гарантирована.',
    ],
  },
];

export interface BountyItemPoolDef {
  itemId: string;
  minCount: number;
  maxCount: number;
}

export const BOUNTY_DEMAND_POOL: BountyItemPoolDef[] = [
  { itemId: 'jellopy', minCount: 6, maxCount: 15 },
  { itemId: 'fluff', minCount: 5, maxCount: 14 },
  { itemId: 'green_herb', minCount: 4, maxCount: 10 },
  { itemId: 'red_herb', minCount: 4, maxCount: 10 },
  { itemId: 'blue_herb', minCount: 3, maxCount: 8 },
  { itemId: 'apple', minCount: 4, maxCount: 12 },
  { itemId: 'copper_ore', minCount: 4, maxCount: 10 },
  { itemId: 'iron_ore', minCount: 3, maxCount: 8 },
];

export class EconomySystem {
  public tradeVolume: number = 0;
  public bountyContracts: BountyContract[] = [];

  constructor(tradeVolume: number = 0, initialContracts?: BountyContract[]) {
    this.tradeVolume = tradeVolume;
    this.initContracts(initialContracts);
  }

  // --- OVERCHARGE PROGRESSION ---

  public getOverchargeLevel(): number {
    let currentLvl = 0;
    for (let i = OVERCHARGE_LEVELS.length - 1; i >= 0; i--) {
      if (this.tradeVolume >= OVERCHARGE_LEVELS[i].requiredVolume) {
        currentLvl = OVERCHARGE_LEVELS[i].level;
        break;
      }
    }
    return currentLvl;
  }

  public getOverchargeBonusPercent(): number {
    const lvl = this.getOverchargeLevel();
    const def = OVERCHARGE_LEVELS.find((d) => d.level === lvl);
    return def ? def.bonusPercent : 0;
  }

  public getOverchargeProgress(): {
    level: number;
    bonusPercent: number;
    currentVolume: number;
    nextVolume: number;
    progressPercent: number;
    isMax: boolean;
  } {
    const level = this.getOverchargeLevel();
    const currentDef = OVERCHARGE_LEVELS.find((d) => d.level === level) || OVERCHARGE_LEVELS[0];
    const nextDef = OVERCHARGE_LEVELS.find((d) => d.level === level + 1);

    if (!nextDef) {
      return {
        level,
        bonusPercent: currentDef.bonusPercent,
        currentVolume: this.tradeVolume,
        nextVolume: currentDef.requiredVolume,
        progressPercent: 100,
        isMax: true,
      };
    }

    const range = nextDef.requiredVolume - currentDef.requiredVolume;
    const progressInCurrentTier = Math.max(0, this.tradeVolume - currentDef.requiredVolume);
    const progressPercent = Math.min(100, Math.floor((progressInCurrentTier / range) * 100));

    return {
      level,
      bonusPercent: currentDef.bonusPercent,
      currentVolume: this.tradeVolume,
      nextVolume: nextDef.requiredVolume,
      progressPercent,
      isMax: false,
    };
  }

  private checkLevelUp(prevLevel: number): void {
    const newLevel = this.getOverchargeLevel();
    if (newLevel > prevLevel) {
      const bonus = this.getOverchargeBonusPercent();
      SoundFX.playLevelUp();
      EventBus.emit('COMBAT_LOG', {
        message: `🌟 Торговая репутация повышена до Уровня ${newLevel}! Навык «Наценка» теперь даёт +${bonus}% золота при продаже!`,
        color: '#facc15',
      });
      EventBus.emit('FLOATING_TEXT', {
        text: `Overcharge Lv.${newLevel} (+${bonus}%)!`,
        x: 0,
        y: 0,
        color: 0xfacc15,
        isCrit: true,
      });
    }

    EventBus.emit('OVERCHARGE_UPDATED', {
      level: newLevel,
      bonusPercent: this.getOverchargeBonusPercent(),
      tradeVolume: this.tradeVolume,
    });
  }

  // --- ITEM PRICING & SELLING ---

  public getItemSellPrice(item: InventoryItem | { itemId: string; refineLevel?: number; insertedCards?: string[] }): {
    basePrice: number;
    bonusPercent: number;
    bonusGold: number;
    unitPrice: number;
  } {
    const bonusPercent = this.getOverchargeBonusPercent();

    // Карта монстра
    const cardDef = CARDS_DATABASE[item.itemId];
    if (cardDef) {
      const base = 1500;
      const bonusGold = Math.floor((base * bonusPercent) / 100);
      return {
        basePrice: base,
        bonusPercent,
        bonusGold,
        unitPrice: base + bonusGold,
      };
    }

    const itemDef = ITEMS_DATABASE[item.itemId];
    let base = itemDef ? itemDef.price : 10;

    // Заточка экипировки повышает ценность
    if (item.refineLevel && item.refineLevel > 0) {
      base = Math.floor(base * (1 + item.refineLevel * 0.45));
    }
    // Вставленные карты повышают стоимость
    if (item.insertedCards && item.insertedCards.length > 0) {
      base += item.insertedCards.length * 800;
    }

    const bonusGold = Math.floor((base * bonusPercent) / 100);
    return {
      basePrice: base,
      bonusPercent,
      bonusGold,
      unitPrice: base + bonusGold,
    };
  }

  public sellItem(
    player: Player,
    itemUid: string,
    countToSell = 1
  ): { success: boolean; zenyEarned: number; itemName: string } {
    let item: InventoryItem | null = null;
    let isFromEquipped = false;
    let equippedSlot: EquipSlot | null = null;

    // Сначала ищем в инвентаре
    const itemIdx = player.inventory.findIndex((i) => i.uid === itemUid);
    if (itemIdx !== -1) {
      item = player.inventory[itemIdx];
    } else {
      // Проверяем, не экипирован ли этот предмет
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
        if (player.equipped[slot]?.uid === itemUid) {
          item = player.equipped[slot]!;
          isFromEquipped = true;
          equippedSlot = slot;
          break;
        }
      }
    }

    if (!item) {
      return { success: false, zenyEarned: 0, itemName: '' };
    }

    if (item.isLocked) {
      EventBus.emit('COMBAT_LOG', {
        message: '🔒 Нельзя продать заблокированный предмет! Сначала снимите защиту.',
        color: '#fbbf24',
      });
      return { success: false, zenyEarned: 0, itemName: '' };
    }

    const itemDef = ITEMS_DATABASE[item.itemId];
    const cardDef = CARDS_DATABASE[item.itemId];
    const itemName = itemDef ? itemDef.name : cardDef ? cardDef.name : item.itemId;

    const actualCount = Math.min(item.count, Math.max(1, countToSell));
    const priceInfo = this.getItemSellPrice(item);
    const totalZeny = priceInfo.unitPrice * actualCount;

    const prevLevel = this.getOverchargeLevel();

    // Удаляем из экипировки или инвентаря
    if (isFromEquipped && equippedSlot) {
      player.equipped[equippedSlot] = null;
      player.recalculateStats();
      EventBus.emit('EQUIPMENT_UPDATED', { equipped: { ...player.equipped } });
    } else {
      player.removeItem(itemUid, actualCount);
    }

    // Начисляем Zeny игроку
    player.addZeny(totalZeny);
    this.tradeVolume += totalZeny;

    SoundFX.playCoins();

    EventBus.emit('COMBAT_LOG', {
      message: `💰 Продано: ${actualCount > 1 ? `${actualCount}x ` : ''}[${itemName}] за ${totalZeny.toLocaleString()} Zeny ${
        priceInfo.bonusPercent > 0 ? `(+${priceInfo.bonusPercent}% бонус Наценки)` : ''
      }`,
      color: '#38bdf8',
    });

    this.checkLevelUp(prevLevel);

    return {
      success: true,
      zenyEarned: totalZeny,
      itemName,
    };
  }

  public sellAllEquip(player: Player): {
    success: boolean;
    totalSold: number;
    totalZenyEarned: number;
  } {
    // Выбираем только неэкипированную и незаблокированную экипировку из инвентаря
    const equipItems = player.inventory.filter((item) => {
      const def = ITEMS_DATABASE[item.itemId];
      return def && def.type === 'equip' && !item.isLocked;
    });

    if (equipItems.length === 0) {
      return { success: false, totalSold: 0, totalZenyEarned: 0 };
    }

    let totalSold = 0;
    let totalZenyEarned = 0;
    const prevLevel = this.getOverchargeLevel();

    for (const item of equipItems) {
      const priceInfo = this.getItemSellPrice(item);
      const totalItemZeny = priceInfo.unitPrice * item.count;

      totalSold += item.count;
      totalZenyEarned += totalItemZeny;

      player.removeItem(item.uid, item.count);
    }

    player.addZeny(totalZenyEarned);
    this.tradeVolume += totalZenyEarned;

    SoundFX.playCoins();

    EventBus.emit('COMBAT_LOG', {
      message: `⚔️ Продано ${totalSold} шт. экипировки на сумму +${totalZenyEarned.toLocaleString()} Zeny!`,
      color: '#a855f7',
    });

    this.checkLevelUp(prevLevel);

    return { success: true, totalSold, totalZenyEarned };
  }

  public sellAllCards(player: Player): {
    success: boolean;
    totalSold: number;
    totalZenyEarned: number;
  } {
    // Выбираем все незаблокированные карты монстров из инвентаря
    const cardItems = player.inventory.filter((item) => {
      return !!CARDS_DATABASE[item.itemId] && !item.isLocked;
    });

    if (cardItems.length === 0) {
      return { success: false, totalSold: 0, totalZenyEarned: 0 };
    }

    let totalSold = 0;
    let totalZenyEarned = 0;
    const prevLevel = this.getOverchargeLevel();

    for (const item of cardItems) {
      const priceInfo = this.getItemSellPrice(item);
      const totalItemZeny = priceInfo.unitPrice * item.count;

      totalSold += item.count;
      totalZenyEarned += totalItemZeny;

      player.removeItem(item.uid, item.count);
    }

    player.addZeny(totalZenyEarned);
    this.tradeVolume += totalZenyEarned;

    SoundFX.playCoins();

    EventBus.emit('COMBAT_LOG', {
      message: `🃏 Продано ${totalSold} шт. карт монстров на сумму +${totalZenyEarned.toLocaleString()} Zeny!`,
      color: '#f43f5e',
    });

    this.checkLevelUp(prevLevel);

    return { success: true, totalSold, totalZenyEarned };
  }

  public sellAllMaterials(player: Player): {
    success: boolean;
    totalSold: number;
    totalZenyEarned: number;
    itemsList: Array<{ name: string; count: number; zeny: number }>;
  } {
    // Выбираем только материалы (лут). Экипировка, карты и расходники НЕ трогаются!
    const materialItems = player.inventory.filter((item) => {
      const def = ITEMS_DATABASE[item.itemId];
      return def && def.type === 'material';
    });

    if (materialItems.length === 0) {
      return { success: false, totalSold: 0, totalZenyEarned: 0, itemsList: [] };
    }

    let totalSold = 0;
    let totalZenyEarned = 0;
    const itemsList: Array<{ name: string; count: number; zeny: number }> = [];

    const prevLevel = this.getOverchargeLevel();

    // Продаем каждый материал
    for (const item of materialItems) {
      const def = ITEMS_DATABASE[item.itemId];
      const count = item.count;
      const priceInfo = this.getItemSellPrice(item);
      const totalItemZeny = priceInfo.unitPrice * count;

      totalSold += count;
      totalZenyEarned += totalItemZeny;
      itemsList.push({
        name: def ? def.name : item.itemId,
        count,
        zeny: totalItemZeny,
      });

      // Удаляем из инвентаря
      player.removeItem(item.uid, count);
    }

    // Начисляем Zeny
    player.addZeny(totalZenyEarned);
    this.tradeVolume += totalZenyEarned;

    SoundFX.playCoins();

    const bonus = this.getOverchargeBonusPercent();
    EventBus.emit('COMBAT_LOG', {
      message: `💰 Мгновенная скупка: продано ${totalSold} трофеев на сумму +${totalZenyEarned.toLocaleString()} Zeny! ${
        bonus > 0 ? `(Включая бонус Наценки +${bonus}%)` : ''
      }`,
      color: '#38bdf8',
    });

    this.checkLevelUp(prevLevel);

    return {
      success: true,
      totalSold,
      totalZenyEarned,
      itemsList,
    };
  }

  // --- BOUNTY CONTRACTS (x2.5 ZENY) ---

  public initContracts(initialContracts?: BountyContract[]): void {
    if (initialContracts && initialContracts.length === 5) {
      this.bountyContracts = [...initialContracts];
      return;
    }

    this.bountyContracts = [];
    for (let i = 0; i < 5; i++) {
      this.bountyContracts.push(this.generateContract(i));
    }
  }

  public generateContract(slotIndex: number): BountyContract {
    const client = BOUNTY_CLIENTS[slotIndex % BOUNTY_CLIENTS.length];
    const dialogue = client.dialogues[Math.floor(Math.random() * client.dialogues.length)];

    // Выбираем 1 предмет из пула спроса
    const poolItem = BOUNTY_DEMAND_POOL[Math.floor(Math.random() * BOUNTY_DEMAND_POOL.length)];
    const count =
      Math.floor(Math.random() * (poolItem.maxCount - poolItem.minCount + 1)) + poolItem.minCount;
    const itemDef = ITEMS_DATABASE[poolItem.itemId];
    const baseUnitPrice = itemDef ? itemDef.price : 15;

    // Расчет награды: x2.5 множитель от базовой цены скупщика + бонус Наценки
    const overchargePercent = this.getOverchargeBonusPercent();
    const baseContractValue = baseUnitPrice * count * 2.5;
    const rewardGold = Math.floor(baseContractValue * (1 + overchargePercent / 100));

    // Награда опытом профессии (Job EXP)
    const rewardJobExp = Math.floor(count * 25 + 75);

    const contractId = `contract_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const title = `${client.titlePrefix}: ${itemDef ? itemDef.name : poolItem.itemId}`;

    return {
      id: contractId,
      title,
      clientName: client.name,
      clientIcon: client.icon,
      description: dialogue,
      requirements: [
        {
          itemId: poolItem.itemId,
          count,
        },
      ],
      rewardGold,
      rewardJobExp,
    };
  }

  public canFulfillContract(player: Player, contract: BountyContract): boolean {
    for (const req of contract.requirements) {
      const current = player.getItemCount(req.itemId);
      if (current < req.count) {
        return false;
      }
    }
    return true;
  }

  public claimContract(player: Player, contractId: string): boolean {
    const idx = this.bountyContracts.findIndex((c) => c.id === contractId);
    if (idx === -1) return false;

    const contract = this.bountyContracts[idx];
    if (!this.canFulfillContract(player, contract)) {
      EventBus.emit('COMBAT_LOG', {
        message: 'Недостаточно предметов в инвентаре для сдачи контракта!',
        color: '#ef4444',
      });
      return false;
    }

    const prevLevel = this.getOverchargeLevel();

    // Списываем требуемые предметы из инвентаря игрока
    for (const req of contract.requirements) {
      player.removeItemByItemId(req.itemId, req.count);
    }

    // Выдаем щедрую награду: x2.5 Zeny + Job EXP
    player.addZeny(contract.rewardGold);
    player.gainJobExp(contract.rewardJobExp);
    this.tradeVolume += contract.rewardGold;

    SoundFX.playLevelUp();

    EventBus.emit('COMBAT_LOG', {
      message: `✨ Выполнен срочный контракт [${contract.title}]! Житель [${contract.clientName}] выплатил вам ${contract.rewardGold.toLocaleString()} Zeny (x2.5) и ${contract.rewardJobExp} Job EXP!`,
      color: '#10b981',
    });

    EventBus.emit('FLOATING_TEXT', {
      text: `+${contract.rewardGold}z (x2.5) / +${contract.rewardJobExp} JEXP!`,
      x: player.x,
      y: player.y - 40,
      color: 0x10b981,
      isCrit: true,
    });

    // На место сданного заказа мгновенно генерируется новый!
    this.bountyContracts[idx] = this.generateContract(idx);

    this.checkLevelUp(prevLevel);

    EventBus.emit('BOUNTY_CONTRACTS_UPDATED', {
      contracts: [...this.bountyContracts],
    });

    return true;
  }

  public serialize(): { tradeVolume: number; bountyContracts: BountyContract[] } {
    return {
      tradeVolume: this.tradeVolume,
      bountyContracts: [...this.bountyContracts],
    };
  }
}
