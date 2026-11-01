import { MarketStallSlot, PriceMarkup, InventoryItem } from '../types/game.types';
import { ITEMS_DATABASE } from '../data/items.data';
import { CARDS_DATABASE } from '../data/cards.data';
import { Player } from '../entities/Player';
import { EventBus } from '../core/EventBus';
import { SoundFX } from '../core/SoundFX';

const NPC_BUYERS = [
  '[Knight_99]',
  '[WizLover]',
  '[AgiHunter]',
  '[Novice_Pro]',
  '[Priestess_Anna]',
  '[ShadowRogue]',
  '[Berserk_Max]',
];

export class MarketStallSystem {
  public slots: MarketStallSlot[] = [];
  public campLevel: number = 1;
  private simTimer: number = 10;

  constructor(initialSlots?: MarketStallSlot[]) {
    if (initialSlots && initialSlots.length === 6) {
      this.slots = [...initialSlots];
    } else {
      this.slots = Array.from({ length: 6 }, (_, index) => ({
        index,
        item: null,
        markup: 'NORMAL',
        listedPrice: 0,
      }));
    }
  }

  public calculateItemBasePrice(item: InventoryItem): number {
    const cardDef = CARDS_DATABASE[item.itemId];
    if (cardDef) {
      return 1500;
    }

    const itemDef = ITEMS_DATABASE[item.itemId];
    if (!itemDef) return 50;

    let price = itemDef.price || 50;
    if (item.refineLevel > 0) {
      price = Math.floor(price * (1 + item.refineLevel * 0.45));
    }
    if (item.insertedCards && item.insertedCards.length > 0) {
      price += item.insertedCards.length * 800;
    }
    return price;
  }

  public calculateListedPrice(item: InventoryItem, markup: PriceMarkup): number {
    const base = this.calculateItemBasePrice(item);
    if (markup === 'DISCOUNT') return Math.max(10, Math.floor(base * 0.8));
    if (markup === 'EXPENSIVE') return Math.floor(base * 1.3);
    return base;
  }

  public putItemOnStall(itemUid: string, slotIndex: number, markup: PriceMarkup, player: Player): boolean {
    if (slotIndex < 0 || slotIndex >= this.slots.length) return false;
    const itemIdx = player.inventory.findIndex((i) => i.uid === itemUid);
    if (itemIdx === -1) return false;

    const item = player.inventory[itemIdx];
    // Если в слоте уже лежит предмет, возвращаем его
    if (this.slots[slotIndex].item) {
      player.inventory.push(this.slots[slotIndex].item!);
    }

    // Если предмет стакуемый, выставляем 1 штуку или пачку
    player.inventory.splice(itemIdx, 1);
    this.slots[slotIndex] = {
      index: slotIndex,
      item,
      markup,
      listedPrice: this.calculateListedPrice(item, markup),
    };

    EventBus.emit('INVENTORY_UPDATED', { items: [...player.inventory] });
    EventBus.emit('MARKET_UPDATED', { slots: [...this.slots] });
    return true;
  }

  public takeItemFromStall(slotIndex: number, player: Player): boolean {
    if (slotIndex < 0 || slotIndex >= this.slots.length) return false;
    const slot = this.slots[slotIndex];
    if (!slot.item) return false;

    player.inventory.push(slot.item);
    slot.item = null;
    slot.listedPrice = 0;

    EventBus.emit('INVENTORY_UPDATED', { items: [...player.inventory] });
    EventBus.emit('MARKET_UPDATED', { slots: [...this.slots] });
    return true;
  }

  public setMarkup(slotIndex: number, markup: PriceMarkup): void {
    const slot = this.slots[slotIndex];
    if (!slot || !slot.item) return;

    slot.markup = markup;
    slot.listedPrice = this.calculateListedPrice(slot.item, markup);
    EventBus.emit('MARKET_UPDATED', { slots: [...this.slots] });
  }

  public update(dt: number, player: Player): void {
    this.simTimer -= dt;
    if (this.simTimer <= 0) {
      this.simTimer = 10;
      this.simulateNpcBuyers(player);
    }
  }

  private simulateNpcBuyers(player: Player): void {
    const filledSlots = this.slots.filter((s) => s.item !== null);
    if (filledSlots.length === 0) return;

    for (const slot of filledSlots) {
      if (!slot.item) continue;

      const basePrice = this.calculateItemBasePrice(slot.item);
      const ratio = basePrice / (slot.listedPrice || 1);

      // Формула вероятности покупки из ТЗ:
      // P = BaseDemand * (BasePrice / ListedPrice)^2 * (1 + CampLevel * 0.15)
      const baseDemand = 0.28;
      const prob = baseDemand * Math.pow(ratio, 2) * (1 + this.campLevel * 0.15);

      if (Math.random() <= prob) {
        // Успешная покупка NPC-приключенцем
        const buyer = NPC_BUYERS[Math.floor(Math.random() * NPC_BUYERS.length)];
        const itemDef = ITEMS_DATABASE[slot.item.itemId];
        const cardDef = CARDS_DATABASE[slot.item.itemId];
        const itemName = cardDef ? cardDef.name : itemDef ? itemDef.name : slot.item.itemId;
        const earnZeny = slot.listedPrice;

        player.zeny += earnZeny;
        slot.item = null;
        slot.listedPrice = 0;

        SoundFX.playLootPickup();
        EventBus.emit('ZENY_CHANGED', { zeny: player.zeny });
        EventBus.emit('MARKET_UPDATED', { slots: [...this.slots] });
        EventBus.emit('COMBAT_LOG', {
          message: `🏪 Торговля: ${buyer} купил у вас [${itemName}] за ${earnZeny.toLocaleString()} z!`,
          color: '#fbbf24',
        });
        break; // Один покупатель за тик
      }
    }
  }
}
