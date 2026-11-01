import { useState, useEffect } from 'preact/hooks';
import { Player } from '../entities/Player';
import { GameWorld } from '../core/GameWorld';
import { EventBus } from '../core/EventBus';
import { SoundFX } from '../core/SoundFX';
import { BlacksmithSystem, SYNTHESIS_RECIPES, SynthesisRecipe } from '../systems/BlacksmithSystem';
import {
  CRAFTING_RECIPES,
  CraftingRecipe,
  CRAFT_GRADE_INFO,
  getCraftCost,
  getUpgradeCost,
  getSlotsForGrade,
} from '../systems/CraftingSystem';
import { ALCHEMY_RECIPES } from '../systems/AlchemySystem';
import { ITEMS_DATABASE } from '../data/items.data';
import { CARDS_DATABASE } from '../data/cards.data';
import { PriceMarkup, InventoryItem, CraftGrade, EquipSlot } from '../types/game.types';
import { RARITY_COLORS, RARITY_LABELS } from '../systems/ItemGeneratorSystem';
import { EQUIP_SLOT_LABELS } from './InventoryWindow';

interface CampWindowProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  world: GameWorld;
  initialTab?: 'blacksmith' | 'market' | 'alchemy' | 'companion';
  initialSubTab?: 'forge' | 'refine' | 'synthesis' | 'card_extract' | 'salvage' | 'reforge';
}

const getCleanItemName = (rawName?: string) => {
  if (!rawName) return '';
  return rawName.replace(/\s*\([^)]*\)/g, '').trim();
};

const TIER_BADGES: Record<number, string> = {
  1: 'bg-amber-950/40 text-amber-300 border-amber-600/40',
  2: 'bg-emerald-950/40 text-emerald-300 border-emerald-600/40',
  3: 'bg-sky-950/40 text-sky-300 border-sky-600/40',
  4: 'bg-purple-950/40 text-purple-300 border-purple-600/40',
  5: 'bg-rose-950/40 text-rose-300 border-rose-600/40',
};

type ForgeCategory = 'all' | 'weapon' | 'armor' | 'offhand' | 'accessory';

const isRecipeInCategory = (recipe: CraftingRecipe, cat: ForgeCategory): boolean => {
  if (cat === 'all') return true;
  if (cat === 'weapon') return recipe.slot === 'weapon';
  if (cat === 'armor') return ['armor', 'head', 'garment', 'footgear'].includes(recipe.slot);
  if (cat === 'offhand') return recipe.slot === 'offhand';
  if (cat === 'accessory') return recipe.slot === 'accessory1' || recipe.slot === 'accessory2';
  return true;
};

export function CampWindow({ isOpen, onClose, player, world, initialTab, initialSubTab }: CampWindowProps) {
  const [activeTab, setActiveTab] = useState<'blacksmith' | 'market' | 'alchemy' | 'companion'>(
    initialTab || 'blacksmith'
  );

  const getMappedSubTab = (sub?: string): 'forge' | 'refine' | 'synthesis' | 'card_extract' => {
    if (sub === 'refine') return 'refine';
    if (sub === 'synthesis') return 'synthesis';
    if (sub === 'card_extract' || sub === 'reforge') return 'card_extract';
    return 'forge';
  };

  const [blacksmithSubTab, setBlacksmithSubTab] = useState<'forge' | 'refine' | 'synthesis' | 'card_extract'>(
    getMappedSubTab(initialSubTab)
  );

  const [synthesisCategory, setSynthesisCategory] = useState<'all' | 'essence' | 'soul' | 'ore' | 'salvage'>('all');
  const [synthesisBatches, setSynthesisBatches] = useState<Record<string, number>>({});

  const [forgeMode, setForgeMode] = useState<'create' | 'upgrade'>('create');
  const [selectedCraftGrade, setSelectedCraftGrade] = useState<CraftGrade>('STANDARD');
  const [forgeCategory, setForgeCategory] = useState<ForgeCategory>('all');

  const [selectedRefineUid, setSelectedRefineUid] = useState<string | null>(
    player.equipped.weapon?.uid || null
  );
  const [useBlessedStone, setUseBlessedStone] = useState(false);

  const [selectedUpgradeUid, setSelectedUpgradeUid] = useState<string | null>(null);
  const [targetUpgradeGrade, setTargetUpgradeGrade] = useState<CraftGrade>('SLOTTED');

  const [selectedCardExtractUid, setSelectedCardExtractUid] = useState<string | null>(null);

  const [blacksmithLevel, setBlacksmithLevel] = useState(world.craftingSystem.blacksmithLevel);
  const [blacksmithExp, setBlacksmithExp] = useState(world.craftingSystem.blacksmithExp);
  const [, setInventoryVersion] = useState(0);
  const [stallSlots, setStallSlots] = useState([...world.marketStall.slots]);
  const [zeny, setZeny] = useState(player.zeny);
  const [isCompanionHired, setIsCompanionHired] = useState(world.companion.isHired);
  const [autoCraft, setAutoCraft] = useState(world.alchemy.autoCraftEnabled);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
    if (initialSubTab) {
      setBlacksmithSubTab(getMappedSubTab(initialSubTab));
    }
  }, [initialTab, initialSubTab, isOpen]);

  useEffect(() => {
    const unsubZeny = EventBus.on('ZENY_CHANGED', (d) => setZeny(d.zeny));
    const unsubMarket = EventBus.on('MARKET_UPDATED', (d) => setStallSlots([...d.slots]));
    const unsubComp = EventBus.on('COMPANION_STATE_CHANGED', (d) => setIsCompanionHired(d.hired));
    const unsubBlacksmith = EventBus.on('BLACKSMITH_PROGRESS_UPDATED', (d) => {
      setBlacksmithLevel(d.level);
      setBlacksmithExp(d.exp);
    });
    const unsubInv = EventBus.on('INVENTORY_UPDATED', () => {
      setInventoryVersion((v) => v + 1);
    });
    const unsubEq = EventBus.on('EQUIPMENT_UPDATED', () => {
      setInventoryVersion((v) => v + 1);
    });

    return () => {
      unsubZeny();
      unsubMarket();
      unsubComp();
      unsubBlacksmith();
      unsubInv();
      unsubEq();
    };
  }, []);

  const equippedUids = new Set(
    Object.values(player.equipped)
      .filter((eq): eq is InventoryItem => eq !== null && eq !== undefined)
      .map((eq) => eq.uid)
  );

  const equipList = Object.values(player.equipped)
    .filter((i): i is InventoryItem => i !== null)
    .concat(player.inventory.filter((i) => ITEMS_DATABASE[i.itemId]?.type === 'equip'));

  // 1. Заточка:
  const selectedRefineItem =
    equipList.find((i) => i.uid === selectedRefineUid) || equipList[0] || null;
  const refineInfo = selectedRefineItem ? BlacksmithSystem.getRefineInfo(selectedRefineItem) : null;
  const canRefineResult = selectedRefineItem ? BlacksmithSystem.canRefine(selectedRefineItem, player) : null;

  // 2. Апгрейд: предметы, у которых ступень ниже RELIC
  const upgradeList = equipList.filter((item) => {
    const g: CraftGrade =
      item.craftGrade ||
      (item.rarity === 'LEGENDARY' || item.rarity === 'EPIC'
        ? 'RELIC'
        : item.rarity === 'RARE' || item.rarity === 'UNCOMMON'
        ? 'SLOTTED'
        : 'STANDARD');
    return g !== 'RELIC';
  });

  const selectedUpgradeItem =
    upgradeList.find((i) => i.uid === selectedUpgradeUid) || upgradeList[0] || null;

  const selectedUpgradeItemCurrentGrade: CraftGrade = selectedUpgradeItem
    ? selectedUpgradeItem.craftGrade ||
      (selectedUpgradeItem.rarity === 'LEGENDARY' || selectedUpgradeItem.rarity === 'EPIC'
        ? 'RELIC'
        : selectedUpgradeItem.rarity === 'RARE' || selectedUpgradeItem.rarity === 'UNCOMMON'
        ? 'SLOTTED'
        : 'STANDARD')
    : 'STANDARD';

  const effectiveTargetGrade: CraftGrade =
    selectedUpgradeItemCurrentGrade === 'SLOTTED' ? 'RELIC' : targetUpgradeGrade;

  const upgradeRecipe = selectedUpgradeItem
    ? CRAFTING_RECIPES.find((r) => r.resultItemId === selectedUpgradeItem.itemId)
    : undefined;

  const canUpgradeResult = selectedUpgradeItem
    ? world.craftingSystem.canUpgrade(selectedUpgradeItem, player, effectiveTargetGrade)
    : null;

  const upgradeCost = selectedUpgradeItem
    ? getUpgradeCost(selectedUpgradeItem, effectiveTargetGrade, upgradeRecipe)
    : null;

  // 3. Извлечение Карт: предметы со вставленными картами
  const cardExtractList = equipList.filter(
    (item) => item.insertedCards && item.insertedCards.length > 0
  );

  const selectedCardExtractItem =
    cardExtractList.find((i) => i.uid === selectedCardExtractUid) || cardExtractList[0] || null;

  const canExtractCardsResult = selectedCardExtractItem
    ? BlacksmithSystem.canExtractCards(selectedCardExtractItem, player)
    : null;

  // 4. Фильтры рецептов ковки:
  const SLOT_ORDER: Record<string, number> = {
    weapon: 1,
    offhand: 2,
    armor: 3,
    head: 4,
    garment: 5,
    footgear: 6,
    accessory1: 7,
    accessory2: 8,
  };

  const weaponCount = CRAFTING_RECIPES.filter((r) => isRecipeInCategory(r, 'weapon')).length;
  const armorCount = CRAFTING_RECIPES.filter((r) => isRecipeInCategory(r, 'armor')).length;
  const offhandCount = CRAFTING_RECIPES.filter((r) => isRecipeInCategory(r, 'offhand')).length;
  const accessoryCount = CRAFTING_RECIPES.filter((r) => isRecipeInCategory(r, 'accessory')).length;

  const filteredRecipes = CRAFTING_RECIPES
    .filter((r) => isRecipeInCategory(r, forgeCategory))
    .slice()
    .sort((a, b) => {
      // Строгая сортировка по тиру от Т1 до Т5
      if (a.tier !== b.tier) {
        return a.tier - b.tier;
      }
      const slotA = SLOT_ORDER[a.slot] || 99;
      const slotB = SLOT_ORDER[b.slot] || 99;
      if (slotA !== slotB) {
        return slotA - slotB;
      }
      return a.name.localeCompare(b.name, 'ru');
    });

  if (!isOpen) return null;

  const handleRefine = () => {
    if (!selectedRefineItem) return;
    BlacksmithSystem.refine(selectedRefineItem, player, useBlessedStone);
    setSelectedRefineUid(selectedRefineItem.uid);
    setInventoryVersion((v) => v + 1);
  };

  const handleForgeItem = (recipe: CraftingRecipe) => {
    const check = world.craftingSystem.canCraft(recipe, player, selectedCraftGrade);
    if (!check.ok) {
      SoundFX.playMiss();
      EventBus.emit('FLOATING_TEXT', {
        text: `❌ ${check.reason || 'Не хватает ресурсов!'}`,
        x: player.x,
        y: player.y - 28,
        color: 0xf87171,
      });
      EventBus.emit('COMBAT_LOG', {
        message: `❌ Нельзя выковать "${getCleanItemName(recipe.name)}": ${check.reason || 'недостаточно сырья или Zeny'}`,
        color: '#f87171',
      });
      return;
    }

    world.craftingSystem.craft(recipe, player, selectedCraftGrade);
    setInventoryVersion((v) => v + 1);
  };

  const handleUpgradeClick = () => {
    if (!selectedUpgradeItem) return;
    const res = world.craftingSystem.upgradeCraftGrade(
      selectedUpgradeItem,
      player,
      effectiveTargetGrade
    );
    if (!res.success) {
      SoundFX.playMiss();
    }
    setInventoryVersion((v) => v + 1);
  };

  const handleExtractCardsClick = () => {
    if (!selectedCardExtractItem) return;
    const res = BlacksmithSystem.extractCards(selectedCardExtractItem, player);
    if (!res.success) {
      SoundFX.playMiss();
    }
    setSelectedCardExtractUid(null);
    setInventoryVersion((v) => v + 1);
  };

  const handleTakeFromStall = (slotIndex: number) => {
    world.marketStall.takeItemFromStall(slotIndex, player);
    setStallSlots([...world.marketStall.slots]);
  };

  const handleChangeMarkup = (slotIndex: number, markup: PriceMarkup) => {
    world.marketStall.setMarkup(slotIndex, markup);
    setStallSlots([...world.marketStall.slots]);
  };

  const handlePutOnStall = (item: InventoryItem, slotIndex: number) => {
    world.marketStall.putItemOnStall(item.uid, slotIndex, 'NORMAL', player);
    setStallSlots([...world.marketStall.slots]);
  };

  const handleCraft = (recipe: any) => {
    world.alchemy.craft(recipe, player);
  };

  const handleToggleAutoCraft = () => {
    world.alchemy.autoCraftEnabled = !autoCraft;
    setAutoCraft(!autoCraft);
  };

  const handleToggleCompanion = () => {
    if (isCompanionHired) {
      world.companion.isHired = false;
      EventBus.emit('COMPANION_STATE_CHANGED', { hired: false });
    } else {
      if (player.zeny >= 1000) {
        player.removeZeny(1000);
        world.companion.isHired = true;
        EventBus.emit('COMPANION_STATE_CHANGED', { hired: true });
        SoundFX.playLevelUp();
      } else {
        SoundFX.playMiss();
        EventBus.emit('COMBAT_LOG', { message: '❌ Недостаточно Zeny для найма напарника (1,000 z)!', color: '#f87171' });
      }
    }
    setIsCompanionHired(world.companion.isHired);
  };

  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'blacksmith':
        return { icon: '⚒️', title: 'Кузница мастера Бранда', sub: 'Ковка, заточка и извлечение карт' };
      case 'alchemy':
        return { icon: '⚗️', title: 'Алхимическая лаборатория Селии', sub: 'Варка боевых эликсиров и полезных настоек' };
      case 'companion':
        return { icon: '🛡️', title: 'Гильдия Наёмников', sub: 'Контракты со спутниками и целителями' };
      case 'market':
        return { icon: '🏪', title: 'Торговая витрина', sub: 'Выставление трофеев на продажу' };
    }
  };
  const header = getHeaderInfo();

  return (
    <div className="fixed inset-0 pointer-events-auto flex items-center justify-center bg-black/60 z-50 p-4">
      <div className="w-[940px] max-w-[96vw] h-[680px] max-h-[92vh] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/70 rounded-3xl shadow-2xl p-4 text-slate-100 backdrop-blur-md flex flex-col select-none">
        {/* Заголовок и баланс */}
        <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/80 shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">{header.icon}</span>
            <div>
              <h2 className="text-base font-bold text-amber-400">{header.title}</h2>
              <div className="text-xs text-slate-400">
                Казна: <b className="text-amber-300 font-bold">{zeny.toLocaleString()} z</b>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-lg px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 transition font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 1. Вкладка Кузницы */}
        {activeTab === 'blacksmith' && (
          <div className="mt-3 flex-1 overflow-y-auto pr-1 flex flex-col space-y-3">
            {/* 4 Подвкладки Кузницы Классического RO */}
            <div className="grid grid-cols-2 md:grid-cols-4 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 gap-2 shrink-0">
              <button
                onClick={() => setBlacksmithSubTab('forge')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  blacksmithSubTab === 'forge'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>⚒️</span>
                <span>Ковка</span>
              </button>
              <button
                onClick={() => setBlacksmithSubTab('refine')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  blacksmithSubTab === 'refine'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>🔨</span>
                <span>Заточка (+10)</span>
              </button>
              <button
                onClick={() => setBlacksmithSubTab('synthesis')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  blacksmithSubTab === 'synthesis'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>⚗️</span>
                <span>Синтез ресурсов</span>
              </button>
              <button
                onClick={() => setBlacksmithSubTab('card_extract')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  blacksmithSubTab === 'card_extract'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>🎴</span>
                <span>Извлечение карт</span>
              </button>
            </div>

            {/* Подвкладка 1: Ковка снаряжения и Апгрейд */}
            {blacksmithSubTab === 'forge' && (
              <div className="space-y-3 pb-2">
                {/* Карточка прогресса Мастерства Кузнеца */}
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-slate-900/60 border border-amber-500/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">⚒️</span>
                      <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                        Кузнечное дело • Уровень {blacksmithLevel}
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      {blacksmithExp} / {world.craftingSystem.getExpToNextLevel()} EXP
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.floor(
                            (blacksmithExp / world.craftingSystem.getExpToNextLevel()) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Переключатель режима ковки: Создать новое / Улучшить ступень */}
                <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setForgeMode('create')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        forgeMode === 'create'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>⚒️</span>
                      <span>Создать новое</span>
                    </button>
                    <button
                      onClick={() => setForgeMode('upgrade')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        forgeMode === 'upgrade'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>⬆️</span>
                      <span>Улучшить ступень</span>
                    </button>
                  </div>
                </div>

                {/* РЕЖИМ 1: СОЗДАТЬ НОВОЕ СНАРЯЖЕНИЕ */}
                {forgeMode === 'create' && (
                  <div className="space-y-3">
                    {/* Выбор ступени ковки */}
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <span>🌟</span>
                        <span>Ступень качества:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(['STANDARD', 'SLOTTED', 'RELIC'] as CraftGrade[]).map((grade) => {
                          const info = CRAFT_GRADE_INFO[grade];
                          const isSelected = selectedCraftGrade === grade;
                          return (
                            <button
                              key={grade}
                              onClick={() => setSelectedCraftGrade(grade)}
                              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-amber-950/50 border-amber-500 ring-1 ring-amber-500/50 shadow-md'
                                  : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-black" style={{ color: info.color }}>
                                  {info.badge}
                                </span>
                                <span>{info.icon}</span>
                              </div>
                              <div className="text-[10px] text-slate-300 font-medium">
                                {info.statsDesc}
                              </div>
                              <div className="text-[9px] text-slate-400 mt-1">
                                {info.slotsDesc}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Фильтры категорий */}
                    <div className="flex items-center gap-1.5 bg-slate-950/50 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
                      <button
                        onClick={() => setForgeCategory('all')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                          forgeCategory === 'all'
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Все ({CRAFTING_RECIPES.length})
                      </button>
                      <button
                        onClick={() => setForgeCategory('weapon')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                          forgeCategory === 'weapon'
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Оружие ({weaponCount})
                      </button>
                      <button
                        onClick={() => setForgeCategory('armor')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                          forgeCategory === 'armor'
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Броня ({armorCount})
                      </button>
                      <button
                        onClick={() => setForgeCategory('offhand')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                          forgeCategory === 'offhand'
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Вторая рука ({offhandCount})
                      </button>
                      <button
                        onClick={() => setForgeCategory('accessory')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                          forgeCategory === 'accessory'
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Бижутерия ({accessoryCount})
                      </button>
                    </div>

                    {/* Сетка рецептов */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredRecipes.map((recipe) => {
                        const check = world.craftingSystem.canCraft(recipe, player, selectedCraftGrade);
                        const canCraft = check.ok;
                        const cost = getCraftCost(recipe, selectedCraftGrade);
                        const hasZeny = player.zeny >= cost.zeny;
                        const slotsCount = getSlotsForGrade(recipe.slot, selectedCraftGrade);
                        const gradeInfo = CRAFT_GRADE_INFO[selectedCraftGrade];

                        return (
                          <div
                            key={recipe.id}
                            className={`p-3.5 rounded-2xl border flex flex-col justify-between transition ${
                              canCraft
                                ? 'bg-slate-800/80 border-slate-700/80 hover:border-amber-500/60 shadow-md'
                                : 'bg-slate-900/60 border-slate-800'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-10 h-10 rounded-xl bg-slate-950/80 border border-slate-700/70 flex items-center justify-center text-2xl shrink-0">
                                    {recipe.icon}
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                                      <span>{getCleanItemName(recipe.name)}</span>
                                      <span className="text-amber-400 font-mono font-bold">
                                        [{slotsCount}]
                                      </span>
                                    </h5>
                                    {(() => {
                                      const itemDef = ITEMS_DATABASE[recipe.resultItemId];
                                      const effAtk = recipe.baseAtk || itemDef?.baseAtk || itemDef?.bonusAtk;
                                      const effMatk = recipe.baseMatk || itemDef?.baseMatk || itemDef?.bonusMatk;
                                      const effDef = recipe.baseDef || itemDef?.baseDef;
                                      const statBonus = itemDef?.primaryStatBonus;
                                      return (
                                        <>
                                          <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                                            <span className="text-amber-400 font-mono font-bold uppercase">
                                              [{EQUIP_SLOT_LABELS[recipe.slot] || recipe.slot}]
                                            </span>
                                            <span
                                              className={`px-1.5 py-0.2 rounded border font-mono font-bold text-[9px] ${
                                                TIER_BADGES[recipe.tier] || 'text-slate-400 border-slate-700'
                                              }`}
                                            >
                                              Т{recipe.tier}
                                            </span>
                                            {statBonus && (
                                              <span className="text-emerald-300 font-bold bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                                +{Math.round(statBonus.value * gradeInfo.statsMult)} {statBonus.stat.toUpperCase()}
                                              </span>
                                            )}
                                            {effAtk && (
                                              <span className="text-rose-300 font-semibold">
                                                ATK +{Math.round(effAtk * gradeInfo.statsMult)}
                                              </span>
                                            )}
                                            {effMatk && (
                                              <span className="text-purple-300 font-semibold">
                                                MATK +{Math.round(effMatk * gradeInfo.statsMult)}
                                              </span>
                                            )}
                                            {effDef && (
                                              <span className="text-sky-300 font-semibold">
                                                DEF +{Math.round(effDef * gradeInfo.statsMult)}
                                              </span>
                                            )}
                                            {itemDef?.bonusMaxHp && (
                                              <span className="text-rose-300 font-semibold">
                                                HP +{Math.round(itemDef.bonusMaxHp * gradeInfo.statsMult)}
                                              </span>
                                            )}
                                            {itemDef?.bonusMaxSp && (
                                              <span className="text-blue-300 font-semibold">
                                                SP +{Math.round(itemDef.bonusMaxSp * gradeInfo.statsMult)}
                                              </span>
                                            )}
                                            {itemDef?.spRegen && (
                                              <span className="text-indigo-300 font-semibold">
                                                +{itemDef.spRegen} SP/с
                                              </span>
                                            )}
                                            {itemDef?.bonusCrit && (
                                              <span className="text-amber-300 font-semibold">
                                                CRIT +{itemDef.bonusCrit}%
                                              </span>
                                            )}
                                            {itemDef?.bonusFlee && (
                                              <span className="text-teal-300 font-semibold">
                                                FLEE +{Math.round(itemDef.bonusFlee * gradeInfo.statsMult)}
                                              </span>
                                            )}
                                            {itemDef?.bonusMoveSpeed && (
                                              <span className="text-amber-300 font-semibold">
                                                Скорость +{itemDef.bonusMoveSpeed}
                                              </span>
                                            )}
                                            {itemDef?.blockChance && (
                                              <span className="text-blue-300 font-semibold">
                                                Блок +{itemDef.blockChance}%
                                              </span>
                                            )}
                                          </div>
                                          {recipe.description && (
                                            <p className="text-[10px] text-slate-400 mt-1 italic leading-tight">
                                              {recipe.description}
                                            </p>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                                <span
                                  className={`font-bold text-xs px-2 py-0.5 rounded-lg border shrink-0 ${
                                    hasZeny
                                      ? 'bg-slate-950 text-amber-300 border-amber-500/30'
                                      : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                                  }`}
                                >
                                  💰 {cost.zeny.toLocaleString()} z
                                </span>
                              </div>

                              {/* Требуемые материалы */}
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {cost.materials.map((mat) => {
                                  const currentCount = player.getItemCount(mat.itemId);
                                  const hasEnough = currentCount >= mat.count;
                                  return (
                                    <span
                                      key={mat.itemId}
                                      className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                                        hasEnough
                                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                                          : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                                      }`}
                                    >
                                      <span>{mat.icon}</span>
                                      <span>{getCleanItemName(mat.name)}:</span>
                                      <span
                                        className={`font-mono font-bold ${
                                          hasEnough ? 'text-emerald-200' : 'text-rose-200'
                                        }`}
                                      >
                                        {currentCount}/{mat.count}
                                      </span>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Кнопка ковки */}
                            <button
                              disabled={!canCraft}
                              onClick={() => handleForgeItem(recipe)}
                              title={!canCraft ? check.reason : undefined}
                              className={`w-full mt-3 py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                                canCraft
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95'
                                  : 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                              }`}
                            >
                              <span>⚒️</span>
                              <span>
                                {canCraft
                                  ? `Выковать [${gradeInfo.badge}]`
                                  : !hasZeny
                                  ? 'Не хватает Zeny'
                                  : 'Не хватает ресурсов'}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* РЕЖИМ 2: УЛУЧШИТЬ СТУПЕНЬ (АПГРЕЙД) */}
                {forgeMode === 'upgrade' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Список предметов для улучшения */}
                    <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 flex flex-col">
                      <h4 className="text-xs font-bold uppercase text-amber-300 mb-2">
                        Выберите предмет для улучшения ({upgradeList.length}):
                      </h4>
                      <div className="space-y-1.5 pr-1 max-h-[460px] overflow-y-auto">
                        {upgradeList.map((item) => {
                          const def = ITEMS_DATABASE[item.itemId];
                          const isSelected = selectedUpgradeItem?.uid === item.uid;
                          const currentGrade: CraftGrade =
                            item.craftGrade ||
                            (item.rarity === 'LEGENDARY' || item.rarity === 'EPIC'
                              ? 'RELIC'
                              : item.rarity === 'RARE' || item.rarity === 'UNCOMMON'
                              ? 'SLOTTED'
                              : 'STANDARD');
                          const gradeInfo = CRAFT_GRADE_INFO[currentGrade];
                          const isEquipped = equippedUids.has(item.uid);

                          return (
                            <div
                              key={item.uid}
                              onClick={() => setSelectedUpgradeUid(item.uid)}
                              className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                                isSelected
                                  ? 'bg-amber-950/40 border-amber-500 shadow ring-1 ring-amber-500/40'
                                  : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 overflow-hidden">
                                <span className="text-xl shrink-0">{def?.icon || '🗡️'}</span>
                                <div className="overflow-hidden">
                                  <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                    {item.refineLevel > 0 && (
                                      <span className="text-amber-400 shrink-0">+{item.refineLevel} </span>
                                    )}
                                    <span className="truncate">{getCleanItemName(def?.name || item.itemId)}</span>
                                    <span className="text-[10px] text-amber-300 font-mono font-bold">
                                      [{item.maxSlots || 0}]
                                    </span>
                                    {isEquipped && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                        Надето
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                    <span style={{ color: gradeInfo.color }} className="font-bold">
                                      {gradeInfo.badge}
                                    </span>
                                    <span>•</span>
                                    <span>Т{item.tier || def?.tier || 1}</span>
                                    {item.insertedCards && item.insertedCards.length > 0 && (
                                      <span className="text-amber-400 font-medium">
                                        • 🎴 {item.insertedCards.length} карт
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] text-slate-400 font-bold shrink-0 ml-1">
                                [{EQUIP_SLOT_LABELS[def?.slot || ''] || def?.slot}]
                              </span>
                            </div>
                          );
                        })}

                        {upgradeList.length === 0 && (
                          <div className="text-center py-16 text-slate-500 italic text-xs">
                            Все доступные предметы уже улучшены до наивысшей ступени [Реликвия].
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Правая колонка: параметры улучшения */}
                    <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 flex flex-col justify-between">
                      {selectedUpgradeItem && upgradeCost ? (
                        <div>
                          <h4 className="text-xs font-bold uppercase text-amber-300 mb-2">
                            Параметры улучшения ступени:
                          </h4>
                          <div className="text-base font-black text-amber-400 mb-1 flex items-center gap-2">
                            <span>
                              {getCleanItemName(ITEMS_DATABASE[selectedUpgradeItem.itemId]?.name)}
                            </span>
                            {equippedUids.has(selectedUpgradeItem.uid) && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                Надето
                              </span>
                            )}
                            {selectedUpgradeItem.refineLevel > 0 && (
                              <span className="text-amber-300 font-mono text-sm">
                                (+{selectedUpgradeItem.refineLevel})
                              </span>
                            )}
                          </div>

                          {/* Выбор целевой ступени */}
                          <div className="mt-2.5 mb-3">
                            <span className="text-xs text-slate-400 block mb-1">
                              Целевая ступень улучшения:
                            </span>
                            <div className="flex gap-2">
                              {selectedUpgradeItemCurrentGrade === 'STANDARD' && (
                                <button
                                  onClick={() => setTargetUpgradeGrade('SLOTTED')}
                                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                    effectiveTargetGrade === 'SLOTTED'
                                      ? 'bg-sky-950/60 text-sky-200 border-sky-500 ring-1 ring-sky-500/40'
                                      : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-white'
                                  }`}
                                >
                                  ✨ МАСТЕРСКИЙ [2]
                                </button>
                              )}
                              <button
                                onClick={() => setTargetUpgradeGrade('RELIC')}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                  effectiveTargetGrade === 'RELIC'
                                    ? 'bg-amber-950/60 text-amber-200 border-amber-500 ring-1 ring-amber-500/40'
                                    : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-white'
                                }`}
                              >
                                🌟 РЕЛИКВИЯ [4]
                              </button>
                            </div>
                          </div>

                          {/* Баннер гарантированного сохранения заточки и карт */}
                          <div className="bg-emerald-950/40 border border-emerald-500/40 p-2.5 rounded-xl text-xs text-emerald-300 flex items-center gap-2 mb-3">
                            <span className="text-lg">🛡️</span>
                            <span>
                              Заточка (<b>+{selectedUpgradeItem.refineLevel || 0}</b>) и все вставленные карты (
                              <b>{selectedUpgradeItem.insertedCards?.length || 0} шт.</b>) полностью сохраняются!
                            </span>
                          </div>

                          {/* Доплата ресурсов */}
                          <div className="space-y-2 bg-slate-900/80 p-3 rounded-xl border border-slate-700 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Доплата в Zeny:</span>
                              <span
                                className={`font-bold font-mono ${
                                  player.zeny >= upgradeCost.zeny ? 'text-amber-300' : 'text-rose-400'
                                }`}
                              >
                                {upgradeCost.zeny.toLocaleString()} z
                              </span>
                            </div>

                            {upgradeCost.materials.map((mat) => {
                              const cur = player.getItemCount(mat.itemId);
                              const hasEnough = cur >= mat.count;
                              return (
                                <div key={mat.itemId} className="flex justify-between items-center">
                                  <span className="text-slate-300 flex items-center gap-1.5">
                                    <span>{mat.icon}</span>
                                    <span>{getCleanItemName(mat.name)}:</span>
                                  </span>
                                  <span
                                    className={`font-bold font-mono ${
                                      hasEnough ? 'text-emerald-300' : 'text-rose-400'
                                    }`}
                                  >
                                    {mat.count} шт. (в наличии: {cur})
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-16 text-slate-500 italic text-xs">
                          Выберите предмет слева для улучшения ступени.
                        </div>
                      )}

                      <button
                        disabled={!canUpgradeResult?.ok}
                        onClick={handleUpgradeClick}
                        title={!canUpgradeResult?.ok ? canUpgradeResult?.reason : undefined}
                        className={`w-full mt-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 ${
                          canUpgradeResult?.ok
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110 shadow-amber-500/20 cursor-pointer active:scale-95'
                            : 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <span>⬆️</span>
                        <span>
                          {!selectedUpgradeItem
                            ? 'Выберите предмет'
                            : canUpgradeResult?.ok
                            ? `Улучшить до ${CRAFT_GRADE_INFO[effectiveTargetGrade].badge}`
                            : player.zeny < (upgradeCost?.zeny || 0)
                            ? 'Не хватает Zeny'
                            : 'Не хватает ресурсов'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

                        {/* Подвкладка 2: Заточка экипировки (+1..+10) */}
            {blacksmithSubTab === 'refine' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 flex flex-col">
                  <h3 className="text-xs font-bold uppercase text-amber-300 mb-2">
                    Выберите предмет для заточки ({equipList.length}):
                  </h3>
                  <div className="space-y-1.5 pr-1 max-h-[460px] overflow-y-auto">
                    {equipList.map((item) => {
                      const def = ITEMS_DATABASE[item.itemId];
                      const isSelected = selectedRefineItem?.uid === item.uid;
                      const r = item.rarity || 'COMMON';
                      const isEquipped = equippedUids.has(item.uid);
                      const grade = item.craftGrade || 'STANDARD';
                      const gradeInfo = CRAFT_GRADE_INFO[grade];

                      return (
                        <div
                          key={item.uid}
                          onClick={() => setSelectedRefineUid(item.uid)}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                            isSelected
                              ? 'bg-amber-950/40 border-amber-500 shadow ring-1 ring-amber-500/40'
                              : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 overflow-hidden">
                            <span className="text-xl shrink-0">{def?.icon || '🗡️'}</span>
                            <div className="overflow-hidden">
                              <div
                                className="text-xs font-bold truncate flex items-center gap-1.5"
                                style={{ color: RARITY_COLORS[r].text }}
                              >
                                {item.refineLevel > 0 && (
                                  <span className="text-amber-400 shrink-0">+{item.refineLevel} </span>
                                )}
                                <span className="truncate">{getCleanItemName(def?.name || item.itemId)}</span>
                                <span className="text-[10px] text-amber-300 font-mono font-bold">
                                  [{item.maxSlots || 0}]
                                </span>
                                {isEquipped && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                    Надето
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                <span style={{ color: gradeInfo.color }} className="font-bold">
                                  {gradeInfo.badge}
                                </span>
                                <span>•</span>
                                <span>Т{item.tier || def?.tier || 1}</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase font-mono shrink-0 ml-1">
                            [{def?.slot}]
                          </span>
                        </div>
                      );
                    })}

                    {equipList.length === 0 && (
                      <div className="text-center py-12 text-slate-500 italic text-xs">
                        Нет предметов экипировки в рюкзаке или слотах.
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 flex flex-col justify-between">
                  {selectedRefineItem && refineInfo ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase text-amber-300 mb-2">Параметры заточки:</h3>
                      <div className="text-base font-black text-amber-400 mb-1 flex items-center gap-2">
                        <span>{getCleanItemName(ITEMS_DATABASE[selectedRefineItem.itemId]?.name)}</span>
                        {equippedUids.has(selectedRefineItem.uid) && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Надето
                          </span>
                        )}
                        <span className="text-sky-300 font-mono text-sm">
                          (+{selectedRefineItem.refineLevel || 0} ➔ +{(selectedRefineItem.refineLevel || 0) + 1})
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 space-y-2 mt-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-700">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Шанс успеха:</span>
                          <span className="font-bold text-emerald-400 font-mono text-sm">
                            {refineInfo.successChance}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Стоимость в Zeny:</span>
                          <span
                            className={`font-bold font-mono ${
                              player.zeny >= refineInfo.zenyCost ? 'text-amber-300' : 'text-rose-400'
                            }`}
                          >
                            {refineInfo.zenyCost.toLocaleString()} z
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Необходимые материалы:</span>
                          <span
                            className={`font-bold font-mono ${
                              player.getItemCount(refineInfo.materialId) >= refineInfo.materialCount
                                ? 'text-sky-300'
                                : 'text-rose-400'
                            }`}
                          >
                            {refineInfo.materialName} x{refineInfo.materialCount} (у вас:{' '}
                            {player.getItemCount(refineInfo.materialId)})
                          </span>
                        </div>

                        {/* Чекбокс использования Благословенного камня */}
                        {selectedRefineItem.refineLevel >= 4 && (
                          <div className="pt-2 border-t border-slate-800">
                            <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-amber-300">
                              <input
                                type="checkbox"
                                checked={useBlessedStone}
                                onChange={(e) => setUseBlessedStone((e.target as HTMLInputElement).checked)}
                                className="rounded accent-amber-500 cursor-pointer"
                              />
                              <span>
                                💎 Благословенный камень (в наличии: {player.getItemCount('blessed_refine_stone')})
                              </span>
                            </label>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Защищает предмет от падения уровня (-1) при неудачной заточке.
                            </div>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                          {selectedRefineItem.refineLevel < 4 ? (
                            <span className="text-emerald-400 font-medium">
                              🛡️ Безопасная заточка +1..+4 (100% шанс)
                            </span>
                          ) : (
                            <span className="text-amber-400 font-medium">
                              ⚠️ При неудаче уровень заточки снижается на 1 (без поломки предмета).
                            </span>
                          )}
                          {selectedRefineItem.refineLevel + 1 >= 7 && (
                            <div className="text-amber-400 font-bold mt-0.5">
                              ✨ Открывает светящуюся ауру оружия!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-slate-500 italic text-xs">
                      Выберите предмет в списке слева для просмотра параметров заточки.
                    </div>
                  )}

                  <button
                    disabled={!canRefineResult?.ok}
                    onClick={handleRefine}
                    title={!canRefineResult?.ok ? canRefineResult?.reason : undefined}
                    className={`w-full mt-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 ${
                      canRefineResult?.ok
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110 shadow-amber-500/20 cursor-pointer active:scale-95'
                        : 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span>🔨</span>
                    <span>
                      {!selectedRefineItem
                        ? 'Выберите предмет'
                        : canRefineResult?.ok
                        ? `Заточить (+${selectedRefineItem.refineLevel || 0} ➔ +${(selectedRefineItem.refineLevel || 0) + 1})`
                        : player.zeny < (refineInfo?.zenyCost || 0)
                        ? 'Не хватает Zeny'
                        : 'Не хватает ресурсов'}
                    </span>
                  </button>
                </div>
              </div>
            )}

                        {/* Подвкладка 3: Безопасное Извлечение Карт */}
            {blacksmithSubTab === 'card_extract' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                {/* Список предметов со вставленными картами */}
                <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 flex flex-col">
                  <h4 className="text-xs font-bold uppercase text-sky-300 mb-2">
                    Предметы со вставленными картами ({cardExtractList.length}):
                  </h4>
                  <div className="space-y-1.5 pr-1 max-h-[460px] overflow-y-auto">
                    {cardExtractList.map((item) => {
                      const def = ITEMS_DATABASE[item.itemId];
                      const isSelected = selectedCardExtractItem?.uid === item.uid;
                      const isEquipped = equippedUids.has(item.uid);

                      return (
                        <div
                          key={item.uid}
                          onClick={() => setSelectedCardExtractUid(item.uid)}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                            isSelected
                              ? 'bg-sky-950/40 border-sky-400 shadow ring-1 ring-sky-500/40'
                              : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 overflow-hidden">
                            <span className="text-xl shrink-0">{def?.icon || '🗡️'}</span>
                            <div className="overflow-hidden">
                              <div className="text-xs font-bold truncate flex items-center gap-1.5 text-slate-100">
                                {item.refineLevel > 0 && (
                                  <span className="text-amber-400 shrink-0">+{item.refineLevel} </span>
                                )}
                                <span className="truncate">{getCleanItemName(def?.name || item.itemId)}</span>
                                {isEquipped && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                    Надето
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-amber-300 font-medium">
                                ★ {item.insertedCards.length} вставленных карт
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase font-mono shrink-0 ml-1">
                            [{def?.slot}]
                          </span>
                        </div>
                      );
                    })}

                    {cardExtractList.length === 0 && (
                      <div className="text-center py-16 text-slate-500 italic text-xs">
                        Нет предметов со вставленными картами в слотах или рюкзаке.
                      </div>
                    )}
                  </div>
                </div>

                {/* Правая колонка: предпросмотр и извлечение */}
                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 flex flex-col justify-between">
                  {selectedCardExtractItem ? (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-sky-300 mb-2">
                        Извлечение карт из слотов:
                      </h4>
                      <div className="text-base font-black text-slate-100 mb-1 flex items-center gap-2">
                        <span>{getCleanItemName(ITEMS_DATABASE[selectedCardExtractItem.itemId]?.name)}</span>
                        {equippedUids.has(selectedCardExtractItem.uid) && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Надето
                          </span>
                        )}
                        {selectedCardExtractItem.refineLevel > 0 && (
                          <span className="text-amber-300 font-mono text-sm">
                            (+{selectedCardExtractItem.refineLevel})
                          </span>
                        )}
                      </div>

                      {/* Информационный баннер */}
                      <div className="bg-sky-950/40 border border-sky-500/40 p-2.5 rounded-xl text-xs text-sky-200 flex items-center gap-2 mt-2 mb-3">
                        <span className="text-lg">🎴</span>
                        <span>
                          Все карты со 100% шансом вернутся в ваш инвентарь. Слоты предмета очистятся для новой инкрустации.
                        </span>
                      </div>

                      {/* Список карт для возврата */}
                      <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-xl border border-slate-700 mb-3">
                        <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider mb-1">
                          Карты, которые будут возвращены ({selectedCardExtractItem.insertedCards.length} шт.):
                        </div>
                        {selectedCardExtractItem.insertedCards.map((cardId, idx) => {
                          const cardDef = CARDS_DATABASE[cardId];
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-200"
                            >
                              <div className="flex items-center gap-2">
                                <span>🃏</span>
                                <span className="font-bold">{getCleanItemName(cardDef?.name || cardId)}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                [{cardDef?.targetSlot || 'slot'}]
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Стоимость */}
                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 flex justify-between items-center text-xs">
                        <span className="text-slate-400">Стоимость услуги мастера:</span>
                        <span
                          className={`font-bold font-mono ${
                            canExtractCardsResult?.ok ? 'text-amber-300' : 'text-rose-400'
                          }`}
                        >
                          {(canExtractCardsResult?.cost || 500).toLocaleString()} z
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-slate-500 italic text-xs">
                      Выберите предмет слева для извлечения карт.
                    </div>
                  )}

                  <button
                    disabled={!canExtractCardsResult?.ok}
                    onClick={handleExtractCardsClick}
                    title={!canExtractCardsResult?.ok ? canExtractCardsResult?.reason : undefined}
                    className={`w-full mt-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 ${
                      canExtractCardsResult?.ok
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/20 cursor-pointer active:scale-95'
                        : 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span>🎴</span>
                    <span>
                      {!selectedCardExtractItem
                        ? 'Выберите предмет'
                        : canExtractCardsResult?.ok
                        ? `Извлечь все карты (${canExtractCardsResult.cost.toLocaleString()} z)`
                        : 'Не хватает Zeny'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Подвкладка 4: Синтез и Переплавка Ресурсов */}
            {blacksmithSubTab === 'synthesis' && (
              <div className="space-y-3 pb-2">
                {/* Фильтры категорий синтеза */}
                <div className="flex gap-1.5 flex-wrap bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
                  {[
                    { id: 'all', label: 'Все рецепты', icon: '⚗️' },
                    { id: 'essence', label: 'Эссенции Вожаков', icon: '🔮' },
                    { id: 'soul', label: 'Души MVP', icon: '👑' },
                    { id: 'ore', label: 'Переплавка руд', icon: '⛏️' },
                    { id: 'salvage', label: 'Обмен старых рун', icon: '♻️' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSynthesisCategory(cat.id as any)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        synthesisCategory === cat.id
                          ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                          : 'bg-slate-900/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Список рецептов синтеза */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[58vh] overflow-y-auto pr-1">
                  {SYNTHESIS_RECIPES.filter(
                    (r) => synthesisCategory === 'all' || r.category === synthesisCategory
                  ).map((recipe) => {
                    const inDef = ITEMS_DATABASE[recipe.inputItemId];
                    const outDef = ITEMS_DATABASE[recipe.outputItemId];
                    const curCount = player.getItemCount(recipe.inputItemId);
                    const batches = synthesisBatches[recipe.id] || 1;
                    const maxPossible = Math.floor(curCount / recipe.inputCount);
                    const canAfford = player.zeny >= recipe.zenyCost * batches && curCount >= recipe.inputCount * batches;

                    const handleBatchChange = (count: number) => {
                      const validCount = Math.max(1, count);
                      setSynthesisBatches((prev) => ({ ...prev, [recipe.id]: validCount }));
                    };

                    const handleExecute = () => {
                      BlacksmithSystem.synthesize(recipe, player, batches);
                      setInventoryVersion((v) => v + 1);
                    };

                    return (
                      <div
                        key={recipe.id}
                        className={`p-3 rounded-2xl border transition flex flex-col justify-between ${
                          canAfford
                            ? 'bg-slate-900/90 border-slate-700/80 hover:border-amber-500/50'
                            : 'bg-slate-950/60 border-slate-800/80 opacity-75'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xl w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                                {outDef?.icon || '⚗️'}
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                                  <span>{recipe.name}</span>
                                </h4>
                                <p className="text-[10px] text-slate-400">{recipe.description}</p>
                              </div>
                            </div>
                          </div>

                          {/* Формула обмена */}
                          <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 text-[11px] my-2">
                            <div className="flex items-center gap-1.5 truncate">
                              <span>{inDef?.icon || '📦'}</span>
                              <span className="font-semibold text-slate-300 truncate">
                                {recipe.inputCount * batches}x {inDef?.name || recipe.inputItemId}
                              </span>
                              <span
                                className={`text-[10px] font-mono font-bold shrink-0 ${
                                  curCount >= recipe.inputCount * batches ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                ({curCount})
                              </span>
                            </div>
                            <span className="text-slate-500 px-1 shrink-0">➔</span>
                            <div className="flex items-center gap-1.5 text-amber-300 font-bold truncate">
                              <span>{outDef?.icon || '✨'}</span>
                              <span className="truncate">
                                {recipe.outputCount * batches}x {outDef?.name || recipe.outputItemId}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Нижняя плашка: Стоимость, выбор количества и кнопка */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 gap-2">
                          <div className="text-[11px] text-slate-400 font-mono">
                            Цена: <b className="text-amber-300">{(recipe.zenyCost * batches).toLocaleString()} z</b>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleBatchChange(1)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                                batches === 1
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                              }`}
                            >
                              x1
                            </button>
                            <button
                              onClick={() => handleBatchChange(5)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                                batches === 5
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                              }`}
                            >
                              x5
                            </button>
                            {maxPossible > 1 && (
                              <button
                                onClick={() => handleBatchChange(maxPossible)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                                  batches === maxPossible
                                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                }`}
                              >
                                Max ({maxPossible})
                              </button>
                            )}
                            <button
                              disabled={!canAfford}
                              onClick={handleExecute}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shadow active:scale-95 flex items-center gap-1 ${
                                canAfford
                                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 font-black cursor-pointer'
                                  : 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed'
                              }`}
                            >
                              <span>⚗️</span>
                              <span>Синтез</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Вкладка Торговой Лавки */}
        {activeTab === 'market' && (
          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            <p className="text-xs text-slate-400 mb-3 bg-slate-800/40 p-2.5 rounded-lg border border-slate-700">
              💡 <b>Витрина приключенца:</b> Выставляйте лишний лут и карты на витрину. Каждые 10 секунд витрину
              навещают виртуальные NPC-искатели и выкупают товары за Zeny!
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {stallSlots.map((slot) => {
                const item = slot.item;
                const def = item ? ITEMS_DATABASE[item.itemId] : null;
                const cardDef = item ? CARDS_DATABASE[item.itemId] : null;
                const itemName = def ? def.name : cardDef ? cardDef.name : item?.itemId;
                const itemIcon = def ? def.icon : cardDef ? '🃏' : '📦';

                return (
                  <div key={slot.index} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 mb-1">
                        <span>Слот #{slot.index + 1}</span>
                        {item && (
                          <button
                            onClick={() => handleTakeFromStall(slot.index)}
                            className="text-rose-400 hover:text-rose-300"
                            title="Забрать в рюкзак"
                          >
                            Забрать
                          </button>
                        )}
                      </div>

                      {item ? (
                        <div className="mt-1">
                          <div className="text-sm font-bold text-slate-100 flex items-center space-x-1.5">
                            <span>{itemIcon}</span>
                            <span className="truncate">
                              {item.refineLevel > 0 && <b className="text-amber-400">+{item.refineLevel} </b>}
                              {getCleanItemName(itemName)}
                            </span>
                          </div>
                          {cardDef && (
                            <div className="text-[10px] text-rose-300 font-semibold">
                              Карта [{cardDef.targetSlot}]
                            </div>
                          )}
                          <div className="text-xs font-bold text-amber-300 mt-1">
                            {slot.listedPrice.toLocaleString()} z
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center">
                          <span className="text-slate-600 italic text-xs">Свободно</span>
                        </div>
                      )}
                    </div>

                    {item ? (
                      <div className="mt-3 pt-2 border-t border-slate-700/60 flex space-x-1">
                        {(['DISCOUNT', 'NORMAL', 'EXPENSIVE'] as PriceMarkup[]).map((m) => (
                          <button
                            key={m}
                            onClick={() => handleChangeMarkup(slot.index, m)}
                            className={`flex-1 py-1 rounded text-[9px] font-bold ${
                              slot.markup === m
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-900 text-slate-400 hover:text-white'
                            }`}
                          >
                            {m === 'DISCOUNT' ? '-20%' : m === 'NORMAL' ? '100%' : '+30%'}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <select
                          onChange={(e) => {
                            const uid = (e.target as HTMLSelectElement).value;
                            if (uid) handlePutOnStall(player.inventory.find((i) => i.uid === uid)!, slot.index);
                          }}
                          className="w-full text-xs bg-slate-900 border border-slate-700 rounded p-1 text-slate-300"
                        >
                          <option value="">+ Выставить предмет</option>
                          {player.inventory.map((inv) => {
                            const invDef = ITEMS_DATABASE[inv.itemId];
                            const invCard = CARDS_DATABASE[inv.itemId];
                            const label = invCard
                              ? `🃏 [Карта] ${getCleanItemName(invCard.name)}`
                              : invDef?.type === 'equip'
                              ? `⚔️ ${inv.refineLevel > 0 ? `+${inv.refineLevel} ` : ''}${getCleanItemName(invDef.name)}`
                              : `${invDef?.icon || '📦'} ${getCleanItemName(invDef?.name || inv.itemId)}`;
                            return (
                              <option key={inv.uid} value={inv.uid}>
                                {label} (x{inv.count})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Вкладка Алхимии */}
        {activeTab === 'alchemy' && (
          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            <div className="flex justify-between items-center mb-3 bg-slate-800/40 p-2.5 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-300">
                Крафт мощных зелий и боевых эликсиров из добычи с монстров.
              </div>
              <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-amber-300">
                <input
                  type="checkbox"
                  checked={autoCraft}
                  onChange={handleToggleAutoCraft}
                  className="rounded accent-amber-500 cursor-pointer"
                />
                <span>Авто-варка при наличии лута</span>
              </label>
            </div>

            <div className="space-y-3">
              {ALCHEMY_RECIPES.map((recipe) => {
                const can = world.alchemy.canCraft(recipe, player);
                return (
                  <div key={recipe.id} className="p-3 bg-slate-800/70 rounded-xl border border-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{recipe.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-slate-100">{recipe.name}</div>
                        <div className="text-xs text-slate-300">{recipe.description}</div>
                        <div className="text-[11px] text-amber-300 font-semibold mt-1">
                          Ингредиенты:{' '}
                          {recipe.ingredients
                            .map((ing) => `${getCleanItemName(ITEMS_DATABASE[ing.itemId]?.name || ing.itemId)} x${ing.count}`)
                            .join(', ')}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCraft(recipe)}
                      disabled={!can}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                        can
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow cursor-pointer'
                          : 'bg-slate-700/60 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {can ? 'Сварить' : 'Не хватает ресурсов'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Вкладка Напарника */}
        {activeTab === 'companion' && (
          <div className="mt-4 flex-1 overflow-y-auto pr-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-4xl shadow-xl border-2 border-yellow-300">
              😇
            </div>
            <h3 className="text-lg font-bold text-amber-400 mt-3">Сестра Анна (Напарник-Прист)</h3>
            <p className="text-xs text-slate-300 max-w-md mt-1 leading-relaxed">
              Преданный спутник лагеря, который бегает за вашим персонажем, автоматически исцеляет вас при
              падении здоровья ниже 50% и периодически накладывает баффы <b>Blessing</b> и <b>Agi Up</b>.
            </p>

            <div className="mt-4 bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs text-slate-300 space-y-1 w-full max-w-sm text-left">
              <div>💚 <b>Авто-хил:</b> Исцеляет до 150+ HP каждые 4.5 сек при низком здоровье.</div>
              <div>⭐ <b>Благословение (Blessing):</b> +15% к силе атаки (ATK) на 25 сек.</div>
              <div>🕊️ <b>Стоимость контракта:</b> 1,000 Zeny (единоразово).</div>
            </div>

            <button
              onClick={handleToggleCompanion}
              className={`mt-6 px-6 py-2.5 rounded-xl font-bold text-sm shadow-xl transition active:scale-95 ${
                isCompanionHired
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110'
              }`}
            >
              {isCompanionHired ? 'Отпустить напарника' : 'Нанять за 1,000 z'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
