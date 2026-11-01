import { useState, useEffect, useMemo } from 'preact/hooks';
import { GameWorld } from '../core/GameWorld';
import { Player } from '../entities/Player';
import { EventBus } from '../core/EventBus';
import { QuestState } from '../systems/QuestSystem';
import { BountyContract } from '../types/game.types';
import { ZONES_DATABASE } from '../data/zones.data';
import { ITEMS_DATABASE } from '../data/items.data';

interface QuestsWindowProps {
  isOpen: boolean;
  onClose: () => void;
  world: GameWorld;
  player: Player;
}

const COMBAT_ZONES = [
  { id: 'all', name: 'Все зоны' },
  { id: 'zone_meadow', name: '1. Поляна' },
  { id: 'zone_forest', name: '2. Лес' },
  { id: 'zone_sunken_ruins', name: '3. Храм' },
  { id: 'zone_ant_canyon', name: '4. Каньон' },
  { id: 'zone_orc_fortress', name: '5. Крепость' },
  { id: 'zone_cursed_abbey', name: '6. Монастырь' },
  { id: 'zone_clock_tower', name: '7. Башня' },
  { id: 'zone_dragon_volcano', name: '8. Вулкан' },
];

export function QuestsWindow({ isOpen, onClose, world, player }: QuestsWindowProps) {
  const [activeTab, setActiveTab] = useState<'bounties' | 'hunting'>('bounties');
  const [quests, setQuests] = useState<QuestState[]>(Object.values(world.questSystem.quests));
  const [bounties, setBounties] = useState<BountyContract[]>([
    ...world.economySystem.bountyContracts,
  ]);
  const [, setInventoryVersion] = useState(0);

  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'active' | 'available' | 'claimed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const currentZoneId = world.spawnSystem?.currentZone?.id;

  useEffect(() => {
    const unsubQuests = EventBus.on('QUESTS_UPDATED', (data) => {
      setQuests([...data.quests]);
    });
    const unsubBounties = EventBus.on('BOUNTY_CONTRACTS_UPDATED', (data) => {
      setBounties([...data.contracts]);
    });
    const unsubInv = EventBus.on('INVENTORY_UPDATED', () => {
      setInventoryVersion((v) => v + 1);
    });

    return () => {
      unsubQuests();
      unsubBounties();
      unsubInv();
    };
  }, []);

  if (!isOpen) return null;

  const handleClaimHunting = (questId: string) => {
    world.questSystem.claimReward(questId, player);
  };

  const handleClaimBounty = (contractId: string) => {
    world.economySystem.claimContract(player, contractId);
  };

  // Подсчет готовых к сдаче контрактов и квестов
  const readyBountiesCount = bounties.filter((b) =>
    world.economySystem.canFulfillContract(player, b)
  ).length;

  const readyHuntingCount = quests.filter((q) => q.isCompleted && !q.isClaimed).length;

  // Фильтрация квестов
  const filteredQuests = quests.filter((q) => {
    if (selectedZone !== 'all' && q.def.zoneId !== selectedZone) {
      return false;
    }

    if (statusFilter === 'ready' && !(q.isCompleted && !q.isClaimed)) {
      return false;
    }
    if (statusFilter === 'active' && !(q.isAccepted && !q.isCompleted)) {
      return false;
    }
    if (statusFilter === 'available' && q.isAccepted) {
      return false;
    }
    if (statusFilter === 'claimed' && !q.isClaimed) {
      return false;
    }

    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      const matchTitle = q.def.title.toLowerCase().includes(qLower);
      const matchDesc = q.def.description.toLowerCase().includes(qLower);
      const zoneName = (ZONES_DATABASE[q.def.zoneId]?.name || '').toLowerCase();
      return matchTitle || matchDesc || zoneName.includes(qLower);
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm pointer-events-auto select-none">
      <div className="relative w-full max-w-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📜</span>
            <div>
              <h2 className="text-lg font-black text-amber-300">Доска Заказов и Поручений</h2>
              <p className="text-xs text-slate-400">Срочные заказы торговцев и королевские охотничьи задания</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Переключатель вкладок */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 gap-2">
          <button
            onClick={() => setActiveTab('bounties')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'bounties'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <span>⚡</span>
            <span>Срочные контракты (x2.5 Zeny)</span>
            {readyBountiesCount > 0 && (
              <span className="bg-emerald-500 text-slate-950 font-black px-2 py-0.2 rounded-full text-[10px] animate-pulse">
                {readyBountiesCount} готовы!
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('hunting')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'hunting'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <span>⚔️</span>
            <span>Охотничьи поручения ({quests.length})</span>
            {readyHuntingCount > 0 && (
              <span className="bg-emerald-500 text-slate-950 font-black px-2 py-0.2 rounded-full text-[10px] animate-pulse">
                {readyHuntingCount} готовы!
              </span>
            )}
          </button>
        </div>

        {/* Вкладка 1: Срочные контракты (Bounty Contracts) */}
        {activeTab === 'bounties' && (
          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            {bounties.map((contract) => {
              const canFulfill = world.economySystem.canFulfillContract(player, contract);
              const cleanTitle = contract.title.replace(/\s*\([^)]*\)/g, '');

              return (
                <div
                  key={contract.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    canFulfill
                      ? 'bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-black text-base text-slate-100">{cleanTitle}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700 flex items-center gap-1">
                          <span>{contract.clientIcon}</span>
                          <span>{contract.clientName}</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          x2.5 Zeny
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{contract.description}</p>
                    </div>

                    {/* Кнопка сдачи контракта или статус-бейдж */}
                    <div className="shrink-0">
                      {canFulfill ? (
                        <button
                          onClick={() => handleClaimBounty(contract.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/40 animate-pulse transition active:scale-95 whitespace-nowrap"
                        >
                          ✨ Сдать контракт
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/50 text-amber-300 border border-amber-800/60 whitespace-nowrap">
                          ⏳ В сборе
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Требования контракта в виде единого прогресс-бара */}
                  {contract.requirements.map((req) => {
                    const itemDef = ITEMS_DATABASE[req.itemId];
                    const currentCount = player.getItemCount(req.itemId);
                    const isMet = currentCount >= req.count;
                    const progress = Math.min(100, Math.floor((currentCount / req.count) * 100));
                    const cleanItemName = (itemDef?.name || req.itemId).replace(/\s*\([^)]*\)/g, '');

                    return (
                      <div key={req.itemId} className="mt-3">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <span>{itemDef?.icon || '📦'}</span>
                            <span>{cleanItemName}</span>
                          </span>
                          <span className={isMet ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono'}>
                            {currentCount} / {req.count} шт.
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              isMet ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Награда */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Награда скупщика:</span>
                    <div className="flex items-center space-x-3 font-bold">
                      <span className="text-amber-300">💰 +{contract.rewardGold.toLocaleString()} Zeny</span>
                      <span className="text-purple-300">⚡ +{contract.rewardJobExp} Job EXP</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Вкладка 2: Охотничьи поручения (Hunting Quests) */}
        {activeTab === 'hunting' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Панель фильтров по зонам и поиску */}
            <div className="p-3 bg-slate-950/40 border-b border-slate-800 space-y-2.5 shrink-0">
              {/* Поиск и статус-фильтры */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative flex-1 min-w-[160px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                    placeholder="Поиск по названию или описанию..."
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1.5 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Статусные кнопки */}
                <div className="flex flex-wrap gap-1 text-[11px]">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2 py-1 rounded-lg font-bold transition ${
                      statusFilter === 'all'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Все ({quests.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('ready')}
                    className={`px-2 py-1 rounded-lg font-bold transition ${
                      statusFilter === 'ready'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ✨ Готовы ({readyHuntingCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('active')}
                    className={`px-2 py-1 rounded-lg font-bold transition ${
                      statusFilter === 'active'
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⏳ В процессе ({quests.filter((q) => q.isAccepted && !q.isCompleted).length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('available')}
                    className={`px-2 py-1 rounded-lg font-bold transition ${
                      statusFilter === 'available'
                        ? 'bg-yellow-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📜 Свободные ({quests.filter((q) => !q.isAccepted).length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('claimed')}
                    className={`px-2 py-1 rounded-lg font-bold transition ${
                      statusFilter === 'claimed'
                        ? 'bg-slate-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ✅ Сдано ({quests.filter((q) => q.isClaimed).length})
                  </button>
                </div>
              </div>

              {/* Фильтр по зонам */}
              <div className="flex flex-wrap gap-1.5">
                {COMBAT_ZONES.map((zone) => {
                  const isCurrent = zone.id !== 'all' && currentZoneId === zone.id;
                  const isSelected = selectedZone === zone.id;
                  return (
                    <button
                      key={zone.id}
                      onClick={() => setSelectedZone(zone.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : isCurrent
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-500/50 hover:bg-amber-900/60'
                          : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {isCurrent && <span className="text-[10px]">📍</span>}
                      <span>{zone.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Список поручений */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {filteredQuests.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Нет поручений, соответствующих выбранным фильтрам.
                </div>
              ) : (
                filteredQuests.map((q) => {
                  const zoneName = ZONES_DATABASE[q.def.zoneId]?.name || q.def.zoneId;
                  const progress = Math.min(100, (q.currentCount / q.def.requiredCount) * 100);

                  return (
                    <div
                      key={q.def.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        q.isClaimed
                          ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                          : q.isCompleted
                          ? 'bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-black text-base text-slate-100">{q.def.title}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              📍 {zoneName}
                            </span>
                            {q.def.isEliteBounty && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  q.def.title.includes('MVP')
                                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                                    : 'bg-purple-950/80 text-purple-300 border-purple-500/50'
                                }`}
                              >
                                {q.def.title.includes('MVP') ? '👑 MVP-Босс' : '🐺 Вожак Стаи'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{q.def.description}</p>
                        </div>

                        {/* Статус бейдж или кнопка действия */}
                        <div className="shrink-0">
                          {q.isClaimed ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 whitespace-nowrap">
                              ✅ Сдано
                            </span>
                          ) : q.isCompleted ? (
                            <button
                              onClick={() => handleClaimHunting(q.def.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/40 animate-pulse transition active:scale-95 whitespace-nowrap"
                            >
                              ✨ Забрать награду
                            </button>
                          ) : q.isAccepted ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/50 text-amber-300 border border-amber-800/60 whitespace-nowrap">
                              ⏳ В процессе
                            </span>
                          ) : (
                            <button
                              onClick={() => world.questSystem.acceptQuest(q.def.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/30 transition active:scale-95 whitespace-nowrap"
                            >
                              📜 Взять заказ
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Прогресс (только для взятых заданий) */}
                      {q.isAccepted ? (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-400">Прогресс выполнения</span>
                            <span className={q.isCompleted ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono'}>
                              {q.currentCount} / {q.def.requiredCount}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${
                                q.isCompleted ? 'bg-emerald-400' : 'bg-amber-400'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-500 italic">
                          Заказ свободен на Доске. Нажмите «Взять заказ», чтобы приступить к выполнению.
                        </div>
                      )}

                      {/* Награды */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-slate-500 font-medium">Награда:</span>
                        <div className="flex flex-wrap items-center gap-2 font-bold">
                          <span className="text-amber-300">💰 +{q.def.rewardGold.toLocaleString()} z</span>
                          <span className="text-blue-300">🌟 +{q.def.rewardBaseExp.toLocaleString()} Base EXP</span>
                          <span className="text-purple-300">⚡ +{q.def.rewardJobExp.toLocaleString()} Job EXP</span>
                          {q.def.rewardItems &&
                            q.def.rewardItems.map((r) => {
                              const itemDef = ITEMS_DATABASE[r.itemId];
                              return (
                                <span
                                  key={r.itemId}
                                  className="text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1 font-semibold"
                                >
                                  <span>{itemDef?.icon || '🎁'}</span>
                                  <span>{itemDef ? itemDef.name.replace(/\s*\([^)]*\)/g, '') : r.itemId}</span>
                                  <span className="text-emerald-400 font-mono">x{r.count}</span>
                                </span>
                              );
                            })}
                          {!q.def.rewardItems && q.def.rewardItemId && (() => {
                            const itemDef = ITEMS_DATABASE[q.def.rewardItemId];
                            return (
                              <span className="text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1 font-semibold">
                                <span>{itemDef?.icon || '🎁'}</span>
                                <span>{itemDef ? itemDef.name.replace(/\s*\([^)]*\)/g, '') : q.def.rewardItemId}</span>
                                <span className="text-emerald-400 font-mono">x2</span>
                              </span>
                            );
                          })()}
                        </div>
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
