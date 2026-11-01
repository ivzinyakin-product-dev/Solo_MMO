import { useState, useEffect } from 'preact/hooks';
import { GameWorld } from '../core/GameWorld';
import { Player } from '../entities/Player';
import { EventBus } from '../core/EventBus';
import { QuestState } from '../systems/QuestSystem';
import { ITEMS_DATABASE } from '../data/items.data';
import { ZONES_DATABASE } from '../data/zones.data';

interface EliteBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  world: GameWorld;
  player: Player;
}

export function EliteBountyModal({ isOpen, onClose, world, player }: EliteBountyModalProps) {
  if (!isOpen) return null;

  const [quests, setQuests] = useState<QuestState[]>(
    Object.values(world.questSystem.quests).filter((q) => q.def.isEliteBounty)
  );
  const [rankFilter, setRankFilter] = useState<'all' | 'elite' | 'mvp'>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');

  useEffect(() => {
    const unsub = EventBus.on('QUESTS_UPDATED', (data) => {
      setQuests(data.quests.filter((q: QuestState) => q.def.isEliteBounty));
    });
    return () => unsub();
  }, []);

  const handleAccept = (questId: string) => {
    world.questSystem.acceptQuest(questId);
  };

  const handleClaim = (questId: string) => {
    world.questSystem.claimReward(questId, player);
  };

  const handleReset = (questId: string) => {
    world.questSystem.resetEliteBounty(questId);
  };

  const filteredBounties = quests.filter((q) => {
    const isMvp = q.def.title.includes('MVP');
    if (rankFilter === 'elite' && isMvp) return false;
    if (rankFilter === 'mvp' && !isMvp) return false;
    if (selectedZone !== 'all' && q.def.zoneId !== selectedZone) return false;
    return true;
  });

  const readyCount = quests.filter((q) => q.isCompleted && !q.isClaimed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md pointer-events-auto select-none">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/30 bg-amber-950/30">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">👑</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-300">
                  Королевский Охотник за Головами
                </h2>
                {readyCount > 0 && (
                  <span className="bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                    {readyCount} к сдаче!
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-300/80">
                Элитные контракты на истребление Вожаков стай и MVP-Боссов всех 8 регионов
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
          >
            ✕
          </button>
        </div>

        {/* Панель фильтров */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Фильтр по рангу */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRankFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                rankFilter === 'all'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              Все контракты ({quests.length})
            </button>
            <button
              onClick={() => setRankFilter('elite')}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                rankFilter === 'elite'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-900 text-purple-300/70 hover:text-purple-200'
              }`}
            >
              <span>🐺</span>
              <span>Вожаки ({quests.filter((q) => !q.def.title.includes('MVP')).length})</span>
            </button>
            <button
              onClick={() => setRankFilter('mvp')}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                rankFilter === 'mvp'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-900 text-rose-300/70 hover:text-rose-200'
              }`}
            >
              <span>👑</span>
              <span>MVP-Боссы ({quests.filter((q) => q.def.title.includes('MVP')).length})</span>
            </button>
          </div>

          {/* Фильтр по зонам */}
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone((e.target as HTMLSelectElement).value)}
            className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-500"
          >
            <option value="all">📍 Все зоны (1-8)</option>
            <option value="zone_meadow">Зона 1: Изумрудная Поляна</option>
            <option value="zone_forest">Зона 2: Шепчущий Лес</option>
            <option value="zone_sunken_ruins">Зона 3: Затопленный Храм</option>
            <option value="zone_ant_canyon">Зона 4: Песчаный Каньон</option>
            <option value="zone_orc_fortress">Зона 5: Крепость Орков</option>
            <option value="zone_cursed_abbey">Зона 6: Монастырь Гластхейм</option>
            <option value="zone_clock_tower">Зона 7: Заводная Башня</option>
            <option value="zone_dragon_volcano">Зона 8: Вулкан Ифрита</option>
          </select>
        </div>

        {/* Список контрактов */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBounties.map((q) => {
              const def = q.def;
              const zone = ZONES_DATABASE[def.zoneId];
              const isFinished = q.isCompleted && !q.isClaimed;

              return (
                <div
                  key={def.id}
                  className={`relative p-4 rounded-xl border flex flex-col justify-between transition-all shadow-md ${
                    q.isClaimed
                      ? 'border-slate-800/80 bg-slate-900/40 opacity-70'
                      : isFinished
                      ? 'border-amber-400 bg-amber-950/30 shadow-amber-950/40'
                      : q.isAccepted
                      ? 'border-sky-500/40 bg-slate-900/90'
                      : 'border-slate-700/80 bg-slate-900/70 hover:border-amber-500/50'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Бейдж зоны и ранга */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                        📍 {zone ? zone.name : def.zoneId}
                      </span>
                      {def.title.includes('MVP') ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/50 font-bold animate-pulse">
                          👑 MVP-Босс
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/50 font-bold">
                          🐺 Вожак Стаи
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-black text-amber-200 leading-tight">
                      {def.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {def.description}
                    </p>

                    {/* Прогресс */}
                    {q.isAccepted && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                          <span>Прогресс ликвидации:</span>
                          <span
                            className={
                              q.isCompleted ? 'text-emerald-400' : 'text-amber-300'
                            }
                          >
                            {q.currentCount} / {def.requiredCount}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              q.isCompleted
                                ? 'bg-emerald-500'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                (q.currentCount / def.requiredCount) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Награды */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Королевская награда:
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold">
                          💰 {def.rewardGold.toLocaleString()} z
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-500/30 text-sky-300 font-semibold">
                          🌟 +{def.rewardBaseExp.toLocaleString()} Base EXP
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 font-semibold">
                          ⚡ +{def.rewardJobExp.toLocaleString()} Job EXP
                        </span>
                        {def.rewardItems &&
                          def.rewardItems.map((r) => {
                            const itemDef = ITEMS_DATABASE[r.itemId];
                            return (
                              <span
                                key={r.itemId}
                                className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-200 font-semibold"
                              >
                                {itemDef ? itemDef.icon : '📦'}{' '}
                                {itemDef ? itemDef.name.split(' (')[0] : r.itemId} x{r.count}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  {/* Кнопки действия */}
                  <div className="mt-4 pt-2 border-t border-slate-800/60">
                    {q.isClaimed ? (
                      <div className="flex items-center justify-between gap-2 p-1 bg-slate-900/60 rounded-xl border border-slate-800/80">
                        <span className="text-xs font-bold text-slate-400 pl-2">
                          ✓ Контракт исполнен
                        </span>
                        <button
                          onClick={() => handleReset(def.id)}
                          className="py-1.5 px-3 rounded-lg font-bold text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-400 transition active:scale-95 flex items-center gap-1.5 shadow"
                          title="Взять королевский контракт повторно для фарма руд и опыта"
                        >
                          <span>🔄</span>
                          <span>Взять повторно</span>
                        </button>
                      </div>
                    ) : isFinished ? (
                      <button
                        onClick={() => handleClaim(def.id)}
                        className="w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-950/60 transition active:scale-98 animate-pulse"
                      >
                        🎁 Получить {def.rewardGold.toLocaleString()} z и трофеи!
                      </button>
                    ) : q.isAccepted ? (
                      <div className="py-2 text-center text-xs font-bold text-sky-400 bg-sky-950/40 rounded-xl border border-sky-500/20">
                        ⚔️ В процессе охоты ({q.currentCount}/{def.requiredCount})
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAccept(def.id)}
                        className="w-full py-2 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-800 hover:bg-amber-600/30 text-slate-200 hover:text-amber-200 border border-slate-700 hover:border-amber-500/50 transition active:scale-98"
                      >
                        📜 Принять контракт
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
