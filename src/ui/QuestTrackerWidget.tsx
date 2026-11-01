import { useState, useEffect } from 'preact/hooks';
import { GameWorld } from '../core/GameWorld';
import { Player } from '../entities/Player';
import { EventBus } from '../core/EventBus';
import { QuestState } from '../systems/QuestSystem';

interface QuestTrackerWidgetProps {
  world: GameWorld;
  player: Player;
  onOpenQuestsWindow: () => void;
}

export function QuestTrackerWidget({ world, player, onOpenQuestsWindow }: QuestTrackerWidgetProps) {
  const [quests, setQuests] = useState<QuestState[]>(Object.values(world.questSystem.quests));
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const unsub = EventBus.on('QUESTS_UPDATED', (data) => {
      setQuests([...data.quests]);
    });

    return () => unsub();
  }, []);

  // Фильтруем задания: отображаются ТОЛЬКО принятые игроком задания, которые еще не сданы
  const activeQuests = quests.filter((q) => {
    return q.isAccepted && !q.isClaimed;
  });

  const handleClaim = (questId: string, e: MouseEvent) => {
    e.stopPropagation();
    world.questSystem.claimReward(questId, player);
  };

  return (
    <div className="pointer-events-auto flex flex-col bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md select-none w-[220px]">
      {/* Заголовок трекера */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-xs font-bold text-slate-300">
        <button
          onClick={onOpenQuestsWindow}
          className="flex items-center space-x-1.5 hover:text-amber-300 transition text-left"
          title="Открыть полный журнал заданий"
        >
          <span>📜</span>
          <span>Задания ({activeQuests.length})</span>
        </button>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="text-slate-400 hover:text-white px-1 font-mono transition text-xs"
          title={isMinimized ? 'Развернуть трекер' : 'Свернуть трекер'}
        >
          {isMinimized ? '□' : '—'}
        </button>
      </div>

      {/* Список активных заданий */}
      {!isMinimized && (
        <div className="mt-2 space-y-2 max-h-[190px] overflow-y-auto pr-1">
          {activeQuests.length === 0 ? (
            <div className="text-[11px] text-slate-400 italic py-1 text-center">
              Нет активных заданий в этой зоне. Посетите Доску Заказов!
            </div>
          ) : (
            activeQuests.map((q) => {
              const progress = Math.min(100, (q.currentCount / q.def.requiredCount) * 100);

              return (
                <div
                  key={q.def.id}
                  className={`p-2 rounded-xl border text-[11px] transition ${
                    q.isCompleted
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                      : 'bg-slate-950/50 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-200 truncate pr-1">{q.def.title}</span>
                    <span
                      className={`text-[10px] font-mono ${
                        q.isCompleted ? 'text-emerald-400 font-black' : 'text-amber-400'
                      }`}
                    >
                      {q.currentCount}/{q.def.requiredCount}
                    </span>
                  </div>

                  {/* Полоса прогресса */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        q.isCompleted ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Кнопка сдачи награды */}
                  {q.isCompleted && !q.isClaimed && (
                    <button
                      onClick={(e) => handleClaim(q.def.id, e)}
                      className="mt-2 w-full py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-[10px] shadow-md shadow-emerald-500/30 animate-pulse transition active:scale-95"
                    >
                      ✨ Забрать +{q.def.rewardGold.toLocaleString()} Zeny
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
