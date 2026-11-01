import { useState, useEffect } from 'preact/hooks';
import { SkillDef } from '../types/game.types';
import { EventBus } from '../core/EventBus';
import { Player } from '../entities/Player';
import { SkillSystem } from '../systems/SkillSystem';
import { SoundFX } from '../core/SoundFX';

interface SkillHotbarProps {
  player: Player;
  skillSystem: SkillSystem;
  onCastSkill: (skillId: string) => void;
}

export function SkillHotbar({ player, skillSystem, onCastSkill }: SkillHotbarProps) {
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [skills, setSkills] = useState<(SkillDef | null)[]>([]);
  const [autoSkills, setAutoSkills] = useState<boolean>(player.autoSkillsEnabled);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [, setBuffTick] = useState<number>(0);

  const refreshHotbar = () => {
    setSkills(player.getEffectiveHotbarSkills());
    setAutoSkills(player.autoSkillsEnabled);
  };

  useEffect(() => {
    refreshHotbar();

    const unsubCd = EventBus.on('SKILL_COOLDOWNS_UPDATED', (data) => {
      setCooldowns({ ...data.cooldowns });
    });
    const unsubJob = EventBus.on('JOB_CHANGED', () => {
      refreshHotbar();
    });
    const unsubSkillProg = EventBus.on('JOB_PROGRESS_UPDATED', () => {
      refreshHotbar();
    });
    const unsubEquip = EventBus.on('EQUIPMENT_UPDATED', () => {
      refreshHotbar();
    });
    const unsubHotbar = EventBus.on('HOTBAR_UPDATED', (data) => {
      setAutoSkills(data.autoSkillsEnabled);
      setSkills(player.getEffectiveHotbarSkills());
    });
    const unsubBuffs = EventBus.on('BUFFS_UPDATED', () => {
      setBuffTick((t) => t + 1);
    });

    // Хоткеи 1, 2, 3, 4, 5, 6
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 6) {
        const skill = skills[num - 1];
        if (skill && skillSystem.canCast(skill.id, player).ok) {
          onCastSkill(skill.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubCd();
      unsubJob();
      unsubSkillProg();
      unsubEquip();
      unsubHotbar();
      unsubBuffs();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [skills, player.currentSp, player.equipped.weapon, player.jobClass]);

  const handleToggleAutoSkills = () => {
    const nextState = player.toggleAutoSkills();
    setAutoSkills(nextState);
  };

  const handleDrop = (e: DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (!e.dataTransfer) return;

    const skillIdFromList = e.dataTransfer.getData('application/skill-id');
    const hotbarSlotFrom = e.dataTransfer.getData('application/hotbar-slot');

    if (skillIdFromList) {
      // Установка или замена умения из окна навыков
      player.assignSkillToHotbar(targetIndex, skillIdFromList);
      SoundFX.playCoins();
    } else if (hotbarSlotFrom !== '') {
      const fromIdx = parseInt(hotbarSlotFrom, 10);
      if (!isNaN(fromIdx) && fromIdx >= 0 && fromIdx < 6) {
        // Обмен местами двух слотов
        player.swapHotbarSlots(fromIdx, targetIndex);
        SoundFX.playCoins();
      }
    }
  };

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center space-x-2.5 bg-slate-950/90 border border-slate-700/80 p-2 rounded-2xl shadow-2xl backdrop-blur-md z-30">
      {/* Кнопка тумблера Авто-скиллов */}
      <button
        onClick={handleToggleAutoSkills}
        className={`px-3 py-2 rounded-xl border flex items-center space-x-2 font-bold text-xs transition-all shadow-md select-none ${
          autoSkills
            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-amber-500/30 hover:bg-amber-500/30 ring-1 ring-amber-400/40'
            : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
        }`}
        title="Авто-скиллы (Auto-Cast Skills):&#10;Герой автоматически поддерживает стойки, баффы, кастует АОЕ по толпе и бурст по боссам в режиме Костра и в бою"
      >
        <span className={`text-base leading-none ${autoSkills ? 'animate-spin' : ''}`}>🔄</span>
        <div className="flex flex-col text-left leading-tight">
          <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Ротация AI</span>
          <span className="text-[11px] font-black">{autoSkills ? 'АВТО: ВКЛ' : 'АВТО: ВЫКЛ'}</span>
        </div>
      </button>

      <div className="h-10 w-px bg-slate-800" />

      {/* Слоты умений 1..6 */}
      {skills.map((skill, index) => {
        const isHovered = dragOverIndex === index;

        // Если слот пуст: отображаем ячейку для Drag & Drop с иконкой +
        if (!skill) {
          return (
            <div
              key={`empty_${index}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => handleDrop(e, index)}
              className={`relative w-14 h-14 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-100 select-none ${
                isHovered
                  ? 'bg-amber-500/25 border-amber-400 scale-105 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/50'
                  : 'bg-slate-900/40 border-slate-700/60 text-slate-600 hover:border-slate-500 hover:text-slate-400'
              }`}
              title={`Слот [${index + 1}]: Пусто\nПеретащите сюда навык из окна умений`}
            >
              {/* Горячая клавиша 1..6 */}
              <span className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-slate-900 border border-slate-700 text-[10px] font-black rounded-full flex items-center justify-center text-slate-500 shadow">
                {index + 1}
              </span>
              <span className="text-xl text-slate-500 font-bold leading-none">+</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5 tracking-wider">
                Пусто
              </span>
            </div>
          );
        }

        const cd = cooldowns[skill.id] || 0;
        const check = skillSystem.canCast(skill.id, player);
        const isReady = check.ok && cd <= 0;
        const level = player.jobSystem.getSkillLevel(skill.id) || 1;

        // Определение активных стоек/эффектов для подсветки слота
        let isStanceActive = false;
        let stanceBadge: string | null = null;

        if (skill.id === 'ba_poem_of_bragi' && player.isPoemOfBragiActive) {
          isStanceActive = true;
          stanceBadge = '🎶 АУРА';
        } else if (skill.id === 'sg_hindsight' && player.isHindsightActive) {
          isStanceActive = true;
          stanceBadge = '⚡ АВТО';
        } else if (skill.id === 'mo_spirit_spheres' && player.spiritSpheres > 0) {
          isStanceActive = true;
          stanceBadge = `⚪ ×${player.spiritSpheres}`;
        } else if (skill.id === 'cr_reflect_shield' && player.isReflectShieldActive) {
          isStanceActive = true;
          stanceBadge = '🛡️ ЩИТ';
        } else if (skill.id === 'pr_kyrie_magnific' && player.shieldBarrierHp > 0) {
          isStanceActive = true;
          stanceBadge = `🛡️ ${player.shieldBarrierHp}`;
        }

        return (
          <button
            key={skill.id}
            onClick={() => onCastSkill(skill.id)}
            disabled={!isReady && !isStanceActive}
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer?.setData('application/hotbar-slot', String(index));
              e.dataTransfer?.setData('text/plain', skill.id);
              if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={(e) => {
              // Если перетащили в пустое пространство за пределы панели — освобождаем ячейку
              if (e.dataTransfer && e.dataTransfer.dropEffect === 'none') {
                player.clearHotbarSlot(index);
                SoundFX.playCoins();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverIndex(index);
            }}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => handleDrop(e, index)}
            className={`relative group w-14 h-14 p-1 rounded-xl border flex flex-col items-center justify-between transition-all duration-100 cursor-grab active:cursor-grabbing select-none ${
              isHovered
                ? 'bg-amber-500/30 border-amber-400 scale-105 shadow-xl shadow-amber-500/40 ring-2 ring-amber-400'
                : isStanceActive
                ? 'bg-amber-950/50 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/30'
                : isReady
                ? 'bg-slate-800/90 hover:bg-slate-700 border-amber-500/70 hover:scale-105 active:scale-95 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/60 border-slate-800 opacity-60 cursor-not-allowed'
            }`}
            title={`${skill.name} (Lv.${level}/${skill.maxLevel})\n${skill.description}\nРасход: ${skill.spCostBase} SP | Кулдаун: ${skill.cooldownSec} сек\n💡 Перетащите на другой слот для обмена или в пустоту для удаления${
              !check.ok ? `\n❌ ${check.reason}` : ''
            }`}
          >
            {/* Горячая клавиша 1..6 */}
            <span className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-slate-900 border border-slate-700 text-[10px] font-black rounded-full flex items-center justify-center text-amber-400 shadow">
              {index + 1}
            </span>

            {/* Уровень умения */}
            <span className="absolute -top-1.5 -right-1.5 px-1 bg-amber-950 border border-amber-500/60 text-[9px] font-black rounded text-amber-300 shadow">
              Lv.{level}
            </span>

            {/* Иконка */}
            <span className="text-xl mt-0.5 pointer-events-none">{skill.icon}</span>

            {/* Индикатор стойки или стоимость SP */}
            {stanceBadge ? (
              <span className="text-[9px] font-black text-amber-300 bg-amber-950/80 px-1 rounded border border-amber-500/50 leading-tight pointer-events-none">
                {stanceBadge}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-sky-400 leading-none pointer-events-none">
                {skill.spCostBase} SP
              </span>
            )}

            {/* Оверлей кулдауна */}
            {cd > 0 && (
              <div className="absolute inset-0 bg-black/75 rounded-xl flex items-center justify-center text-amber-300 font-black text-xs backdrop-blur-[1px]">
                {cd.toFixed(1)}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
