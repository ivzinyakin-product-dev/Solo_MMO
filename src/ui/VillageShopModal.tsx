import { useState, useEffect } from 'preact/hooks';
import { Player } from '../entities/Player';
import { GameWorld } from '../core/GameWorld';
import { ITEMS_DATABASE } from '../data/items.data';
import { CARDS_DATABASE } from '../data/cards.data';
import { EventBus } from '../core/EventBus';
import { SoundFX } from '../core/SoundFX';
import { EquipSlot, InventoryItem } from '../types/game.types';

interface VillageShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  world: GameWorld;
}

const SHOP_ITEMS = [
  // Зелья и расходники
  'red_potion',
  'orange_potion',
  'yellow_potion',
  'white_potion',
  'greater_white_potion',
  'blue_potion',
  'aspd_potion',
  'awakening_potion',
  'berserk_potion',
  'yggdrasil_elixir',
  'apple',
  'green_herb',
  'butterfly_wing',
  // Руды заточки
  'iron_ore',
  'phracon',
  'oridecon',
  'elunium',
  // Базовое оружие
  'training_sword',
  'short_bow',
  'apprentice_rod',
  'wooden_mace',
];

type SellFilter = 'all' | 'material' | 'equip' | 'card' | 'consumable';

export function VillageShopModal({ isOpen, onClose, player, world }: VillageShopModalProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [sellFilter, setSellFilter] = useState<SellFilter>('all');
  const [zeny, setZeny] = useState(player.zeny);
  const [inventory, setInventory] = useState([...player.inventory]);
  const [equipped, setEquipped] = useState<Partial<Record<EquipSlot, InventoryItem | null>>>({
    ...player.equipped,
  });
  const [overchargeState, setOverchargeState] = useState(
    world.economySystem.getOverchargeProgress()
  );

  useEffect(() => {
    const unsubZeny = EventBus.on('ZENY_CHANGED', (d) => setZeny(d.zeny));
    const unsubInv = EventBus.on('INVENTORY_UPDATED', (d) => {
      setInventory([...d.items]);
      setOverchargeState(world.economySystem.getOverchargeProgress());
    });
    const unsubEq = EventBus.on('EQUIPMENT_UPDATED', (d) => {
      setEquipped({ ...d.equipped });
    });
    const unsubOvercharge = EventBus.on('OVERCHARGE_UPDATED', () => {
      setOverchargeState(world.economySystem.getOverchargeProgress());
    });

    return () => {
      unsubZeny();
      unsubInv();
      unsubEq();
      unsubOvercharge();
    };
  }, [world]);

  if (!isOpen) return null;

  const handleBuy = (itemId: string) => {
    const def = ITEMS_DATABASE[itemId];
    if (!def) return;

    if (player.zeny < def.price) {
      EventBus.emit('COMBAT_LOG', {
        message: 'Недостаточно Zeny для покупки!',
        color: '#ef4444',
      });
      return;
    }

    player.removeZeny(def.price);
    player.addItem(itemId, 1);
    SoundFX.playCampToggle();

    EventBus.emit('COMBAT_LOG', {
      message: `🛒 Куплен предмет: [${def.name}] за ${def.price} Zeny`,
      color: '#38bdf8',
    });
  };

  const handleSellOne = (itemUid: string) => {
    world.economySystem.sellItem(player, itemUid, 1);
  };

  const handleSellAllStack = (itemUid: string, count: number) => {
    world.economySystem.sellItem(player, itemUid, count);
  };

  const handleSellAllLoot = () => {
    world.economySystem.sellAllMaterials(player);
  };

  const handleSellAllEquip = () => {
    world.economySystem.sellAllEquip(player);
  };

  const handleSellAllCards = () => {
    world.economySystem.sellAllCards(player);
  };

  // Категории предметов в инвентаре
  const materialItems = inventory.filter((item) => {
    const def = ITEMS_DATABASE[item.itemId];
    return def && def.type === 'material';
  });

  const equipInventoryItems = inventory.filter((item) => {
    const def = ITEMS_DATABASE[item.itemId];
    return def && def.type === 'equip';
  });

  const cardItems = inventory.filter((item) => {
    return !!CARDS_DATABASE[item.itemId];
  });

  const consumableItems = inventory.filter((item) => {
    const def = ITEMS_DATABASE[item.itemId];
    return def && def.type === 'consumable';
  });

  // Подсчет объемов для быстрых кнопок продажи
  const totalMaterialsCount = materialItems.reduce((acc, item) => acc + item.count, 0);
  const totalMaterialsZeny = materialItems.reduce((acc, item) => {
    return acc + world.economySystem.getItemSellPrice(item).unitPrice * item.count;
  }, 0);

  const totalEquipCount = equipInventoryItems.reduce((acc, item) => acc + item.count, 0);
  const totalEquipZeny = equipInventoryItems.reduce((acc, item) => {
    return acc + world.economySystem.getItemSellPrice(item).unitPrice * item.count;
  }, 0);

  const totalCardsCount = cardItems.reduce((acc, item) => acc + item.count, 0);
  const totalCardsZeny = cardItems.reduce((acc, item) => {
    return acc + world.economySystem.getItemSellPrice(item).unitPrice * item.count;
  }, 0);

  // Фильтрация отображаемого списка
  const filteredInventory = inventory.filter((item) => {
    const def = ITEMS_DATABASE[item.itemId];
    const isCard = !!CARDS_DATABASE[item.itemId];
    if (sellFilter === 'material') return def?.type === 'material';
    if (sellFilter === 'equip') return def?.type === 'equip';
    if (sellFilter === 'card') return isCard;
    if (sellFilter === 'consumable') return def?.type === 'consumable';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm pointer-events-auto select-none">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🛒</span>
            <div>
              <h2 className="text-lg font-black text-amber-300">Торговая Лавка Деревни</h2>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="font-bold text-amber-300 text-sm bg-slate-950 px-3 py-1 rounded-full border border-amber-500/40">
              💰 {zeny.toLocaleString()} Zeny
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Вкладки Купить / Продать */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 gap-2">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'buy'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <span>🛒</span>
            <span>Купить товары</span>
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'sell'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <span>💰</span>
            <span>Продать предметы</span>
            {overchargeState.bonusPercent > 0 && (
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-md text-[10px]">
                +{overchargeState.bonusPercent}%
              </span>
            )}
          </button>
        </div>

        {/* Вкладка 1: Покупка товаров */}
        {activeTab === 'buy' && (
          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            {SHOP_ITEMS.map((itemId) => {
              const def = ITEMS_DATABASE[itemId];
              if (!def) return null;

              const canAfford = zeny >= def.price;

              return (
                <div
                  key={itemId}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl">
                      {def.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">{def.name}</h4>
                      <p className="text-xs text-slate-400">
                        {def.healAmount
                          ? `Восстанавливает +${def.healAmount} HP`
                          : def.baseAtk
                          ? `Базовая атака ATK +${def.baseAtk}`
                          : def.baseMatk
                          ? `Магическая атака MATK +${def.baseMatk}`
                          : 'Материал или расходник'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-amber-300 text-sm">{def.price} Zeny</span>
                    <button
                      disabled={!canAfford}
                      onClick={() => handleBuy(itemId)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition active:scale-95 ${
                        canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Купить
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Вкладка 2: Продажа любых предметов (Трофеи, Экипировка, Карты) */}
        {activeTab === 'sell' && (
          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            {/* Карточка Наценки (Overcharge) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-slate-900/60 border border-amber-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2.5">
                  <span className="text-xl">🌟</span>
                  <div>
                    <h3 className="font-black text-xs text-amber-300 tracking-wide uppercase">
                      Торговая репутация • Наценка (Overcharge) Lv.{overchargeState.level}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Бонус к стоимости любой продажи:{' '}
                      <span className="text-emerald-400 font-bold">
                        +{overchargeState.bonusPercent}% Zeny
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {overchargeState.isMax
                      ? 'МАКС. УРОВЕНЬ'
                      : `${overchargeState.currentVolume.toLocaleString()} / ${overchargeState.nextVolume.toLocaleString()}z`}
                  </span>
                </div>
              </div>

              {/* Прогресс-бар прокачки Наценки */}
              {!overchargeState.isMax && (
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300 rounded-full"
                    style={{ width: `${overchargeState.progressPercent}%` }}
                  />
                </div>
              )}
            </div>

            {/* Блок быстрых кнопок массовой скупки */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between px-1">
                <span>⚡ Быстрая продажа оптом:</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* 1. Все трофеи */}
                <button
                  disabled={totalMaterialsCount === 0}
                  onClick={handleSellAllLoot}
                  className={`p-2.5 rounded-xl text-left border transition active:scale-95 flex flex-col justify-between ${
                    totalMaterialsCount > 0
                      ? 'bg-gradient-to-br from-blue-950/40 to-slate-900 border-blue-500/40 hover:border-blue-400'
                      : 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-300 flex items-center gap-1">
                      <span>💎</span>
                      <span>Все трофеи</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{totalMaterialsCount} шт.</span>
                  </div>
                  <div className="text-xs font-black text-amber-300 mt-1">
                    +{totalMaterialsZeny.toLocaleString()} z
                  </div>
                </button>

                {/* 2. Вся экипировка */}
                <button
                  disabled={totalEquipCount === 0}
                  onClick={handleSellAllEquip}
                  className={`p-2.5 rounded-xl text-left border transition active:scale-95 flex flex-col justify-between ${
                    totalEquipCount > 0
                      ? 'bg-gradient-to-br from-purple-950/40 to-slate-900 border-purple-500/40 hover:border-purple-400'
                      : 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-300 flex items-center gap-1">
                      <span>⚔️</span>
                      <span>Всё снаряжение</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{totalEquipCount} шт.</span>
                  </div>
                  <div className="text-xs font-black text-amber-300 mt-1">
                    +{totalEquipZeny.toLocaleString()} z
                  </div>
                </button>

                {/* 3. Все карты */}
                <button
                  disabled={totalCardsCount === 0}
                  onClick={handleSellAllCards}
                  className={`p-2.5 rounded-xl text-left border transition active:scale-95 flex flex-col justify-between ${
                    totalCardsCount > 0
                      ? 'bg-gradient-to-br from-rose-950/40 to-slate-900 border-rose-500/40 hover:border-rose-400'
                      : 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-rose-300 flex items-center gap-1">
                      <span>🃏</span>
                      <span>Все карты</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{totalCardsCount} шт.</span>
                  </div>
                  <div className="text-xs font-black text-amber-300 mt-1">
                    +{totalCardsZeny.toLocaleString()} z
                  </div>
                </button>
              </div>
            </div>

            {/* Фильтр по категориям */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { id: 'all', label: `Все (${inventory.length})`, icon: '📦' },
                { id: 'material', label: `Трофеи (${materialItems.length})`, icon: '💎' },
                {
                  id: 'equip',
                  label: `Снаряжение (${equipInventoryItems.length})`,
                  icon: '⚔️',
                },
                { id: 'card', label: `Карты (${cardItems.length})`, icon: '🃏' },
                { id: 'consumable', label: `Расходники (${consumableItems.length})`, icon: '🧪' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSellFilter(f.id as SellFilter)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    sellFilter === f.id
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>

            {/* Список предметов для штучной продажи */}
            <div className="space-y-2">
              {filteredInventory.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs italic bg-slate-900/30 rounded-2xl border border-slate-800/50">
                  В этой категории нет предметов для продажи.
                </div>
              ) : (
                filteredInventory.map((item) => {
                  const def = ITEMS_DATABASE[item.itemId];
                  const cardDef = CARDS_DATABASE[item.itemId];
                  const itemName = def ? def.name : cardDef ? cardDef.name : item.itemId;
                  const itemIcon = def ? def.icon : cardDef ? '🃏' : '📦';
                  const priceInfo = world.economySystem.getItemSellPrice(item);
                  const isMaterial = def?.type === 'material';
                  const isEquip = def?.type === 'equip';
                  const isCard = !!cardDef;

                  return (
                    <div
                      key={item.uid}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                        isCard
                          ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-400/60'
                          : isEquip
                          ? 'bg-purple-950/20 border-purple-500/30 hover:border-purple-400/60'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border ${
                            isCard
                              ? 'bg-rose-950/50 border-rose-500/50 text-rose-300'
                              : isEquip
                              ? 'bg-purple-950/50 border-purple-500/50'
                              : 'bg-slate-800 border-slate-700'
                          }`}
                        >
                          {itemIcon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5
                              className={`font-bold text-xs ${
                                isCard
                                  ? 'text-rose-200'
                                  : isEquip
                                  ? 'text-purple-200'
                                  : 'text-slate-200'
                              }`}
                            >
                              {itemName}
                              {item.refineLevel > 0 && (
                                <span className="text-amber-400 ml-1 font-mono">
                                  +{item.refineLevel}
                                </span>
                              )}
                            </h5>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${
                                isMaterial
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : isEquip
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                  : isCard
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : 'bg-slate-700/30 text-slate-400 border-slate-600/30'
                              }`}
                            >
                              {isMaterial
                                ? 'Трофей'
                                : isEquip
                                ? 'Снаряжение'
                                : isCard
                                ? `Карта [${cardDef.targetSlot}]`
                                : 'Расходник'}
                            </span>
                            {item.count > 1 && (
                              <span className="text-xs font-mono font-bold text-amber-400">
                                ×{item.count}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>
                              Цена за шт.:{' '}
                              <span className="font-bold text-amber-300">
                                {priceInfo.unitPrice}z
                              </span>
                            </span>
                            {priceInfo.bonusPercent > 0 && (
                              <span className="text-emerald-400 text-[10px] font-bold">
                                (+{priceInfo.bonusGold}z бонус)
                              </span>
                            )}
                            {cardDef && (
                              <span className="text-[10px] text-rose-300 italic">
                                • {cardDef.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Кнопки продажи */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSellOne(item.uid)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition active:scale-95"
                          title="Продать 1 шт."
                        >
                          {item.count > 1 ? '1 шт.' : 'Продать'}
                        </button>
                        {item.count > 1 && (
                          <button
                            onClick={() => handleSellAllStack(item.uid, item.count)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95 shadow-md shadow-amber-500/10"
                            title={`Продать все ${item.count} шт.`}
                          >
                            Все ({item.count})
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
