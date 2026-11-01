import { useState, useEffect } from 'preact/hooks';
import { Player } from '../entities/Player';
import { EventBus } from '../core/EventBus';
import { SoundFX } from '../core/SoundFX';
import { JobId, SkillDef, CrossJobMasteryBonus } from '../types/game.types';
import { JOBS_METADATA, JobMeta } from '../systems/JobSystem';
import { SKILLS_DATABASE } from '../systems/SkillSystem';

interface SkillsWindowProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  initialTab?: 'skills' | 'jobs' | 'mastery';
}

interface MasteryMilestone {
  jobId: JobId;
  name: string;
  icon: string;
  lv25Desc: string;
  lv50Desc: string;
}

const MASTERY_INFOS: MasteryMilestone[] = [
  {
    jobId: 'knight',
    name: 'Рыцарь',
    icon: '🛡️',
    lv25Desc: '+4 STR, +5% ATK',
    lv50Desc: '+8% MaxHP, +5% ASPD',
  },
  {
    jobId: 'crusader',
    name: 'Крестоносец',
    icon: '⛨',
    lv25Desc: '+4 VIT, +15 Hard DEF',
    lv50Desc: '+5% блок щитом, -8% урона от Боссов',
  },
  {
    jobId: 'hunter',
    name: 'Охотник',
    icon: '🦅',
    lv25Desc: '+4 DEX, +12 HIT',
    lv50Desc: '+6% CRIT, +10% по зверям и насекомым',
  },
  {
    jobId: 'bard',
    name: 'Бард',
    icon: '🎵',
    lv25Desc: '+4 AGI, +8% скорости бега',
    lv50Desc: '-10% откат всех умений, +15% реген SP',
  },
  {
    jobId: 'wizard',
    name: 'Волшебник',
    icon: '🔮',
    lv25Desc: '+4 INT, +6% MATK',
    lv50Desc: '+10% MaxSP, +10% стихийный урон',
  },
  {
    jobId: 'sage',
    name: 'Мудрец',
    icon: '📖',
    lv25Desc: '+3 INT, +3 AGI, +10 FLEE',
    lv50Desc: '+8% к авто-кастам (карт и стоек)',
  },
  {
    jobId: 'priest',
    name: 'Прист',
    icon: '🕊️',
    lv25Desc: '+4 VIT, +3 INT, +15% сила лечения',
    lv50Desc: '+10% Base и Job EXP со всех монстров',
  },
  {
    jobId: 'monk',
    name: 'Монах',
    icon: '👊',
    lv25Desc: '+3 STR, +3 LUK, +10% крит. урона',
    lv50Desc: '+12% урона по Элите и MVP-боссам',
  },
];

const JOB_TREES: Array<{
  title: string;
  parent: JobId;
  children: [JobId, JobId];
}> = [
  { title: 'Путь Воина и Стали', parent: 'swordsman', children: ['knight', 'crusader'] },
  { title: 'Путь Стрелка и Гармонии', parent: 'archer', children: ['hunter', 'bard'] },
  { title: 'Путь Тайных Знаний', parent: 'mage', children: ['wizard', 'sage'] },
  { title: 'Путь Света и Духа', parent: 'acolyte', children: ['priest', 'monk'] },
];

export function SkillsWindow({ isOpen, onClose, player, initialTab }: SkillsWindowProps) {
  const [activeTab, setActiveTab] = useState<'skills' | 'jobs' | 'mastery'>(initialTab || 'skills');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  const [activeJobId, setActiveJobId] = useState<JobId>(player.jobSystem.activeJobId);
  const [selectedJobView, setSelectedJobView] = useState<JobId>(player.jobSystem.activeJobId);
  const [jobProgressState, setJobProgressState] = useState({ ...player.jobSystem.jobs });
  const [zeny, setZeny] = useState(player.zeny);
  const [hotbarSlotsState, setHotbarSlotsState] = useState<(string | null)[]>([
    ...player.hotbarSlots,
  ]);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);

  // Список классов в строгой линии развития персонажа (мультикласс отключён)
  const lineageJobs = player.jobSystem.getLineageJobs();

  // Если выбранный класс не входит в текущую линию, вернуть на активный
  useEffect(() => {
    if (!lineageJobs.includes(selectedJobView)) {
      setSelectedJobView(player.jobSystem.activeJobId);
    }
  }, [lineageJobs, selectedJobView]);

  useEffect(() => {
    const unsubProg = EventBus.on('JOB_PROGRESS_UPDATED', (d) => {
      setJobProgressState({ ...d.allJobs });
      setActiveJobId(d.activeJobId);
      if (!player.jobSystem.getLineageJobs().includes(selectedJobView)) {
        setSelectedJobView(d.activeJobId);
      }
    });
    const unsubZeny = EventBus.on('ZENY_CHANGED', (d) => {
      setZeny(d.zeny);
    });
    const unsubHotbar = EventBus.on('HOTBAR_UPDATED', (d) => {
      setHotbarSlotsState([...d.slots]);
    });

    return () => {
      unsubProg();
      unsubZeny();
      unsubHotbar();
    };
  }, [selectedJobView]);

  if (!isOpen) return null;

  const currentJobProgress = jobProgressState[selectedJobView] || player.jobSystem.jobs[selectedJobView];
  const meta = JOBS_METADATA[selectedJobView] || JOBS_METADATA.novice;
  const crossBonuses = player.crossJobBonuses;
  const activeMeta = player.jobSystem.getActiveMeta();

  // Список всех умений для выбранного в окне класса (исключая устаревшие алиасы)
  const LEGACY_SKILL_ALIASES = ['magnum_break', 'double_strafe', 'fire_bolt', 'holy_light'];
  const jobSkills: SkillDef[] = Object.values(SKILLS_DATABASE).filter(
    (s) => s.jobId === selectedJobView && !LEGACY_SKILL_ALIASES.includes(s.id)
  );

  const handleUpgradeSkill = (skillId: string) => {
    player.jobSystem.upgradeSkill(skillId, player);
    setJobProgressState({ ...player.jobSystem.jobs });
  };

  const handleAdvanceJob = (targetJobId: JobId) => {
    const success = player.jobSystem.switchJob(targetJobId, player);
    if (success) {
      setSelectedJobView(targetJobId);
      setJobProgressState({ ...player.jobSystem.jobs });
      setHotbarSlotsState([...player.hotbarSlots]);
    }
  };

  const handleDropToSlot = (e: DragEvent, slotIdx: number) => {
    e.preventDefault();
    setDragOverSlotIndex(null);
    const skillIdFromList = e.dataTransfer?.getData('application/skill-id');
    const fromSlot = e.dataTransfer?.getData('application/hotbar-slot');

    if (skillIdFromList) {
      player.assignSkillToHotbar(slotIdx, skillIdFromList);
      SoundFX.playCoins();
      setHotbarSlotsState([...player.hotbarSlots]);
    } else if (fromSlot !== undefined && fromSlot !== '') {
      const fromIdx = parseInt(fromSlot, 10);
      if (!isNaN(fromIdx) && fromIdx >= 0 && fromIdx < 6) {
        player.swapHotbarSlots(fromIdx, slotIdx);
        SoundFX.playCoins();
        setHotbarSlotsState([...player.hotbarSlots]);
      }
    }
  };

  const handleAutoFillHotbar = () => {
    player.autoFillHotbarDefaults();
    SoundFX.playCampToggle();
    setHotbarSlotsState([...player.hotbarSlots]);
  };

  return (
    <div className="fixed inset-0 pointer-events-auto flex items-center justify-center bg-black/60 z-50 p-4">
      <div className="w-full max-w-3xl bg-slate-900/95 border-2 border-indigo-500/80 rounded-2xl shadow-2xl p-6 text-slate-100 backdrop-blur-md flex flex-col max-h-[88vh]">
        {/* Заголовок */}
        <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/80">
          <div className="flex items-center space-x-2.5">
            <span className="text-xl">📜</span>
            <div>
              <h2 className="text-base font-bold text-indigo-400">Навыки и Профессия</h2>
              <div className="text-xs text-slate-400">
                Класс: <b className="text-amber-300">{JOBS_METADATA[activeJobId]?.name}</b> • Казна:{' '}
                <b className="text-amber-300">{zeny.toLocaleString()} z</b>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold gap-1">
              <button
                onClick={() => setActiveTab('skills')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeTab === 'skills' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ Навыки
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeTab === 'jobs' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                👑 Профессия
              </button>
              <button
                onClick={() => setActiveTab('mastery')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeTab === 'mastery'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-amber-400/80 hover:text-amber-300'
                }`}
              >
                🌟 Мастерство
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-lg px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 transition font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ================= ВКЛАДКА 1: НАВЫКИ ================= */}
        {activeTab === 'skills' && (
          <div className="mt-4 flex-1 flex flex-col overflow-hidden">
            {/* Переключатель классов в строгой линии развития персонажа */}
            <div className="flex space-x-1.5 overflow-x-auto pb-1.5 border-b border-slate-800 scrollbar-none">
              {lineageJobs.map((jId) => {
                const jMeta = JOBS_METADATA[jId];
                const isSelected = selectedJobView === jId;
                const isCurrent = jId === activeJobId;
                const isParent = jId !== activeJobId && jId !== 'novice';
                const isNovice = jId === 'novice' && activeJobId !== 'novice';

                return (
                  <button
                    key={jId}
                    onClick={() => setSelectedJobView(jId)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-1 ring-indigo-400/50'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span className="text-sm">{jMeta.icon}</span>
                    <span>{jMeta.name}</span>
                    {isCurrent && (
                      <span className="text-[9px] font-black uppercase bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full">
                        Активен
                      </span>
                    )}
                    {isParent && (
                      <span className="text-[9px] font-semibold text-sky-300 bg-sky-950/80 border border-sky-500/30 px-1 rounded">
                        1-й тир
                      </span>
                    )}
                    {isNovice && (
                      <span className="text-[9px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-1 rounded">
                        Базовый
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Инфо-панель выбранного класса */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 my-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <div className="text-xs flex flex-wrap items-center gap-2">
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <span>{meta.icon}</span>
                  <span>{meta.name}</span>
                </span>
                <span className="text-slate-400">•</span>
                <span>
                  Job Lv. <b>{currentJobProgress.jobLevel}</b> / {meta.maxLevel}
                </span>
                {selectedJobView === 'novice' && activeJobId !== 'novice' && (
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                    ✨ Навыки унаследованы всеми классами
                  </span>
                )}
                {selectedJobView !== activeJobId && selectedJobView !== 'novice' && (
                  <span className="text-[10px] text-sky-300 font-semibold bg-sky-950/50 border border-sky-500/30 px-2 py-0.5 rounded-lg">
                    ✨ Навыки 1-го тира унаследованы текущей профессией
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs text-sky-300 font-bold bg-sky-950/60 px-2.5 py-1 rounded-lg border border-sky-600/40 shadow-sm">
                  Очки умений ({meta.name}): <b>{currentJobProgress.skillPoints} SP</b>
                </span>
              </div>
            </div>

            {/* Интерактивная лента хотбара для текущей профессии */}
            <div className="mb-2.5 bg-slate-950/80 p-2 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-inner">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>⌨️ Хотбар ({JOBS_METADATA[activeJobId]?.name})</span>
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1.5">
                  {hotbarSlotsState.map((skillId, slotIdx) => {
                    const skill = skillId ? SKILLS_DATABASE[skillId] : null;
                    const isHovered = dragOverSlotIndex === slotIdx;

                    return (
                      <div
                        key={slotIdx}
                        draggable={!!skill}
                        onDragStart={(e) => {
                          if (skill) {
                            e.dataTransfer?.setData('application/hotbar-slot', String(slotIdx));
                            e.dataTransfer?.setData('text/plain', skill.id);
                            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
                          }
                        }}
                        onDragEnd={(e) => {
                          if (e.dataTransfer && e.dataTransfer.dropEffect === 'none') {
                            player.clearHotbarSlot(slotIdx);
                            SoundFX.playCoins();
                            setHotbarSlotsState([...player.hotbarSlots]);
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverSlotIndex(slotIdx);
                        }}
                        onDragLeave={() => setDragOverSlotIndex(null)}
                        onDrop={(e) => handleDropToSlot(e, slotIdx)}
                        className={`relative w-10 h-10 rounded-lg border flex flex-col items-center justify-center transition-all duration-100 select-none ${
                          isHovered
                            ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400 scale-105 shadow-md'
                            : skill
                            ? 'bg-slate-800 border-amber-500/60 hover:border-amber-400 cursor-grab active:cursor-grabbing shadow'
                            : 'bg-slate-900/60 border-dashed border-slate-700 text-slate-600 hover:border-slate-500'
                        }`}
                        title={
                          skill
                            ? `[${slotIdx + 1}] ${skill.name}\n💡 Перетащите на другой слот для обмена или в пустоту для удаления`
                            : `Слот [${slotIdx + 1}]: Пусто\nПеретащите сюда навык из списка ниже`
                        }
                      >
                        <span className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-slate-900 border border-slate-700 text-[8px] font-black rounded-full flex items-center justify-center text-amber-400 shadow">
                          {slotIdx + 1}
                        </span>
                        {skill ? (
                          <span className="text-base pointer-events-none">{skill.icon}</span>
                        ) : (
                          <span className="text-sm font-bold text-slate-600 pointer-events-none">+</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleAutoFillHotbar}
                  className="text-xs font-bold text-amber-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 transition active:scale-95 shrink-0 ml-1"
                  title="Заполнить хотбар рекомендованным набором способностей для текущей профессии"
                >
                  ↺ Авто-набор
                </button>
              </div>
            </div>

            {/* Список умений */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
              {jobSkills.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Нет умений для этого класса.
                </div>
              ) : (
                jobSkills.map((skill) => {
                  const currentLevel = currentJobProgress.learnedSkills[skill.id] || 0;
                  const isMax = currentLevel >= skill.maxLevel;
                  const hasSkillPoints = currentJobProgress.skillPoints >= 1;
                  const canUpgrade = !isMax && hasSkillPoints;
                  const isAssignedSlotIdx = hotbarSlotsState.indexOf(skill.id);
                  const isDraggable = currentLevel > 0 && skill.type !== 'PASSIVE';

                  return (
                    <div
                      key={skill.id}
                      draggable={isDraggable}
                      onDragStart={(e) => {
                        if (isDraggable) {
                          e.dataTransfer?.setData('application/skill-id', skill.id);
                          e.dataTransfer?.setData('text/plain', skill.id);
                          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copyMove';
                        }
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between transition ${
                        isDraggable
                          ? 'bg-slate-800/80 border-slate-700/80 hover:border-amber-500/50 cursor-grab active:cursor-grabbing'
                          : 'bg-slate-800/50 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3 max-w-md">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl shadow-inner shrink-0 pointer-events-none">
                          {skill.icon}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-100">{skill.name}</span>
                            <span className="text-xs font-black text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-amber-500/30">
                              Lv.{currentLevel} / {skill.maxLevel}
                            </span>
                            {isAssignedSlotIdx !== -1 && (
                              <span className="text-[10px] font-black text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/50 shadow">
                                Хотбар [{isAssignedSlotIdx + 1}]
                              </span>
                            )}
                            {skill.requiredWeapon && (
                              <span className="text-[10px] text-sky-300 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-600/30">
                                {skill.requiredWeapon.replace('MELEE_', '').replace('RANGED_', '').replace('MAGIC_', '')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5 leading-snug">{skill.description}</p>
                          <div className="text-[10px] text-slate-400 mt-1 space-x-3">
                            <span>
                              Расход: <b className="text-sky-300">{skill.spCostBase} SP</b>
                            </span>
                            <span>
                              Перезарядка: <b className="text-amber-300">{skill.cooldownSec} сек</b>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-1.5 shrink-0 ml-3">
                        {isMax ? (
                          <div className="px-4 py-1.5 rounded-xl font-bold text-xs bg-slate-800 text-amber-400 border border-amber-500/40 cursor-default shadow">
                            МАКС. УР.
                          </div>
                        ) : (
                          <button
                            onClick={() => handleUpgradeSkill(skill.id)}
                            disabled={!canUpgrade}
                            className={`px-4 py-1.5 rounded-xl font-bold text-xs transition active:scale-95 shadow ${
                              canUpgrade
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            }`}
                            title={
                              !hasSkillPoints
                                ? `Недостаточно очков умений [${meta.name}] (требуется 1 SP)!`
                                : currentLevel === 0
                                ? 'Изучить способность (1 SP)'
                                : 'Повысить уровень способности (1 SP)'
                            }
                          >
                            {currentLevel === 0 ? 'Изучить (1 SP)' : '+1 Уровень (1 SP)'}
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

        {/* ================= ВКЛАДКА 2: ПУТЬ ПРОФЕССИИ (КАРЬЕРА) ================= */}
        {activeTab === 'jobs' && (
          <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-4">
            {/* Визуальная цепочка карьерного роста */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 shadow-inner">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <span>🧭</span>
                <span>Линия развития персонажа (Мультикласс отключён)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {/* Шаг 1: Новичок */}
                <div
                  className={`p-2.5 rounded-xl border flex items-center space-x-2.5 ${
                    activeJobId === 'novice'
                      ? 'bg-indigo-950/60 border-indigo-400 shadow-md ring-1 ring-indigo-400/50'
                      : 'bg-emerald-950/30 border-emerald-500/40'
                  }`}
                >
                  <span className="text-2xl">⚔️</span>
                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
                      <span>Новичок</span>
                      {activeJobId !== 'novice' && <span className="text-emerald-400 text-[10px]">✅</span>}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {activeJobId === 'novice'
                        ? `Активен (Job Lv. ${jobProgressState.novice?.jobLevel || 1}/10)`
                        : 'Навыки унаследованы'}
                    </div>
                  </div>
                </div>

                {/* Шаг 2: 1-й Тир */}
                <div
                  className={`p-2.5 rounded-xl border flex items-center space-x-2.5 ${
                    activeMeta.tier === 1
                      ? 'bg-indigo-950/60 border-indigo-400 shadow-md ring-1 ring-indigo-400/50'
                      : activeMeta.tier === 2
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : 'bg-slate-900/40 border-slate-800 opacity-60'
                  }`}
                >
                  <span className="text-2xl">
                    {activeMeta.tier === 0
                      ? '🗡️'
                      : activeMeta.tier === 1
                      ? activeMeta.icon
                      : activeMeta.requiredParentJob
                      ? JOBS_METADATA[activeMeta.requiredParentJob].icon
                      : '🗡️'}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
                      <span>
                        {activeMeta.tier === 0
                          ? '1-й Тир (Выбор)'
                          : activeMeta.tier === 1
                          ? activeMeta.name
                          : activeMeta.requiredParentJob
                          ? JOBS_METADATA[activeMeta.requiredParentJob].name
                          : '1-й Тир'}
                      </span>
                      {activeMeta.tier === 2 && <span className="text-emerald-400 text-[10px]">✅</span>}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {activeMeta.tier === 0
                        ? 'Требуется 10 ур. Новичка'
                        : activeMeta.tier === 1
                        ? `Активен (Job Lv. ${jobProgressState[activeJobId]?.jobLevel || 1}/50)`
                        : 'Навыки унаследованы'}
                    </div>
                  </div>
                </div>

                {/* Шаг 3: 2-й Тир */}
                <div
                  className={`p-2.5 rounded-xl border flex items-center space-x-2.5 ${
                    activeMeta.tier === 2
                      ? 'bg-indigo-950/60 border-indigo-400 shadow-md ring-1 ring-indigo-400/50'
                      : activeMeta.tier === 1 && (jobProgressState[activeJobId]?.jobLevel || 1) >= 30
                      ? 'bg-amber-950/40 border-amber-500/60'
                      : 'bg-slate-900/40 border-slate-800 opacity-60'
                  }`}
                >
                  <span className="text-2xl">{activeMeta.tier === 2 ? activeMeta.icon : '🛡️'}</span>
                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
                      <span>{activeMeta.tier === 2 ? activeMeta.name : '2-й Тир (Специализация)'}</span>
                      {activeMeta.tier === 2 && <span className="text-amber-400 text-[10px]">👑</span>}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {activeMeta.tier === 2
                        ? `Активен (Job Lv. ${jobProgressState[activeJobId]?.jobLevel || 1}/50)`
                        : activeMeta.tier === 1 && (jobProgressState[activeJobId]?.jobLevel || 1) >= 30
                        ? '⚡ Доступно к выбору!'
                        : 'Требуется 30 Job Lv. 1-го тира'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* СИТУАЦИЯ 1: ИГРОК НОВИЧОК */}
            {activeJobId === 'novice' && (
              <div className="space-y-4">
                {(jobProgressState.novice?.jobLevel || 1) >= 10 || player.level >= 10 ? (
                  <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 p-4 rounded-2xl border-2 border-amber-500/80 shadow-lg">
                    <div className="flex items-center space-x-2 text-amber-300 font-bold text-sm mb-1">
                      <span className="text-xl">🎉</span>
                      <span>Доступен выбор первой постоянной профессии!</span>
                    </div>
                    <p className="text-xs text-amber-100/90 leading-relaxed">
                      ⚠️ <b>Внимание:</b> выбор профессии 1-го тира окончателен и бесповоротен. Мультикласс в игре
                      отсутствует! Все изученные способности Новичка останутся с вами навсегда.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                    <span className="text-lg">🔒</span>
                    <span>
                      Выбор профессии откроется при достижении <b>10 Job Level Новичка</b> (или 10 Base Level).
                      Текущий прогресс: <b>{jobProgressState.novice?.jobLevel || 1} / 10</b>.
                    </span>
                  </div>
                )}

                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Доступные ветки развития (1-й тир):
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {JOB_TREES.map((tree) => {
                    const parentMeta = JOBS_METADATA[tree.parent];
                    const child1Meta = JOBS_METADATA[tree.children[0]];
                    const child2Meta = JOBS_METADATA[tree.children[1]];
                    const canChoose =
                      (jobProgressState.novice?.jobLevel || 1) >= 10 || player.level >= 10;

                    return (
                      <div
                        key={tree.parent}
                        className="p-4 rounded-2xl border border-slate-700 bg-slate-950/50 hover:border-slate-600 transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-3xl">{parentMeta.icon}</span>
                            <div>
                              <h3 className="font-bold text-sm text-slate-100">{parentMeta.name}</h3>
                              <span className="text-[10px] text-amber-400">{tree.title}</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-300 mb-3 leading-snug">{parentMeta.description}</p>

                          <div className="text-[10px] text-slate-400 mb-2">
                            Ветки 2-го тира:{' '}
                            <b className="text-sky-300">
                              {child1Meta.name} ({child1Meta.icon})
                            </b>{' '}
                            или{' '}
                            <b className="text-amber-300">
                              {child2Meta.name} ({child2Meta.icon})
                            </b>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAdvanceJob(tree.parent)}
                          disabled={!canChoose}
                          className={`mt-3 w-full py-2 rounded-xl text-xs font-bold transition active:scale-95 shadow ${
                            canChoose
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          }`}
                        >
                          {canChoose ? `Выбрать путь [${parentMeta.name}]` : '🔒 Требуется 10 ур. Новичка'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* СИТУАЦИЯ 2: ИГРОК НА 1-М ТИРЕ */}
            {activeMeta.tier === 1 && (
              <div className="space-y-4">
                {/* Карточка текущего 1-го тира */}
                <div className="p-4 rounded-2xl border border-indigo-500/60 bg-indigo-950/30">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{activeMeta.icon}</span>
                      <div>
                        <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                          <span>{activeMeta.name}</span>
                          <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase">
                            Текущая профессия
                          </span>
                        </div>
                        <div className="text-xs text-amber-300 mt-0.5">
                          Job Level: <b>{jobProgressState[activeJobId]?.jobLevel || 1}</b> / 50
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-snug">{activeMeta.description}</p>
                </div>

                {/* Выбор 2-го тира */}
                {(() => {
                  const currentJobLvl = jobProgressState[activeJobId]?.jobLevel || 1;
                  const currentTree = JOB_TREES.find((t) => t.parent === activeJobId);
                  if (!currentTree) return null;

                  const child1Meta = JOBS_METADATA[currentTree.children[0]];
                  const child2Meta = JOBS_METADATA[currentTree.children[1]];
                  const canAdvance = currentJobLvl >= 30;

                  return (
                    <div className="space-y-3">
                      {canAdvance ? (
                        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 p-4 rounded-2xl border-2 border-amber-500/80 shadow-lg">
                          <div className="flex items-center space-x-2 text-amber-300 font-bold text-sm mb-1">
                            <span className="text-xl">🎉</span>
                            <span>Достигнут 30 Job Level! Доступно продвижение на 2-й тир!</span>
                          </div>
                          <p className="text-xs text-amber-100/90 leading-relaxed">
                            ⚠️ <b>Внимание:</b> выбор специализации окончателен! Все способности Мечника и Новичка
                            сохранятся, а вторая ветка закроется навсегда.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                          <span className="text-lg">🔒</span>
                          <span>
                            Продвижение на 2-й тир откроется на <b>30 Job Level</b> текущего класса. Текущий уровень:{' '}
                            <b>{currentJobLvl} / 30</b>.
                          </span>
                        </div>
                      )}

                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Специализации 2-го тира для класса [<b>{activeMeta.name}</b>]:
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[child1Meta, child2Meta].map((child) => (
                          <div
                            key={child.id}
                            className="p-4 rounded-2xl border border-slate-700 bg-slate-950/50 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="text-3xl">{child.icon}</span>
                                <div>
                                  <h3 className="font-bold text-sm text-slate-100">{child.name}</h3>
                                  <span className="text-[10px] text-amber-400 font-semibold">
                                    Класс 2-го тира
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-300 mb-3 leading-snug">{child.description}</p>
                            </div>

                            <button
                              onClick={() => handleAdvanceJob(child.id)}
                              disabled={!canAdvance}
                              className={`mt-3 w-full py-2 rounded-xl text-xs font-bold transition active:scale-95 shadow ${
                                canAdvance
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                              }`}
                            >
                              {canAdvance ? `Выбрать путь [${child.name}]` : '🔒 Требуется 30 Job Level'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* СИТУАЦИЯ 3: ИГРОК НА 2-М ТИРЕ */}
            {activeMeta.tier === 2 && (
              <div className="space-y-4">
                {/* Карточка высшей профессии */}
                <div className="p-4 rounded-2xl border-2 border-amber-500/80 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 shadow-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <span className="text-4xl">{activeMeta.icon}</span>
                      <div>
                        <div className="font-bold text-base text-slate-100 flex items-center gap-2">
                          <span>{activeMeta.name}</span>
                          <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                            👑 Высшая профессия
                          </span>
                        </div>
                        <div className="text-xs text-amber-300 mt-0.5">
                          Job Level: <b>{jobProgressState[activeJobId]?.jobLevel || 1}</b> / 50
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-2.5 leading-snug">{activeMeta.description}</p>
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-emerald-300 flex items-center gap-1.5">
                    <span>✨</span>
                    <span>
                      Вам полностью доступны все изученные навыки родительского класса [
                      <b>{activeMeta.requiredParentJob ? JOBS_METADATA[activeMeta.requiredParentJob].name : ''}</b>]
                      и базовые способности Новичка.
                    </span>
                  </div>
                </div>

                {/* Ветка-сестра (закрытая) */}
                {(() => {
                  const parentJobId = activeMeta.requiredParentJob;
                  const currentTree = JOB_TREES.find((t) => t.parent === parentJobId);
                  if (!currentTree) return null;

                  const siblingId = currentTree.children.find((c) => c !== activeJobId);
                  if (!siblingId) return null;
                  const siblingMeta = JOBS_METADATA[siblingId];

                  return (
                    <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl opacity-60 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-2xl grayscale">{siblingMeta.icon}</span>
                        <div>
                          <div className="text-xs font-bold text-slate-400">{siblingMeta.name}</div>
                          <div className="text-[10px] text-slate-500">
                            🔒 Параллельная ветка закрыта (выбран путь {activeMeta.name})
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-rose-400 font-bold bg-rose-950/40 border border-rose-800/40 px-2 py-0.5 rounded-lg">
                        Ветка закрыта
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ================= ВКЛАДКА 3: МАСТЕРСТВО ПРОФЕССИИ ================= */}
        {activeTab === 'mastery' && (
          <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-4">
            {/* Описание системы */}
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 p-3.5 rounded-2xl border border-amber-600/40 flex items-start gap-3">
              <span className="text-3xl">🌟</span>
              <div>
                <h3 className="font-bold text-sm text-amber-300">Мастерство Профессии (Job Mastery)</h3>
                <p className="text-xs text-slate-300 mt-1 leading-snug">
                  При достижении <b>Job Lv. 25</b> и <b>Job Lv. 50</b> выбранной профессии 2-го тира ваш герой
                  навсегда открывает пассивные боевые бонусы специализации.
                </p>
              </div>
            </div>

            {/* Если активный класс игрока — класс 2-го тира, отображаем его крупную карточку */}
            {activeMeta.tier === 2 && (
              <div className="p-4 bg-slate-800/90 border-2 border-amber-500/70 rounded-2xl shadow-lg space-y-3">
                {(() => {
                  const mInfo = MASTERY_INFOS.find((m) => m.jobId === activeJobId);
                  const currentLvl = jobProgressState[activeJobId]?.jobLevel || 1;
                  const is25 = currentLvl >= 25;
                  const is50 = currentLvl >= 50;

                  return (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{activeMeta.icon}</span>
                          <div>
                            <div className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                              <span>Мастерство: {activeMeta.name}</span>
                              <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                                Ваша профессия
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Job Level: <b>{currentLvl}</b> / 50
                            </div>
                          </div>
                        </div>

                        {is50 ? (
                          <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full shadow">
                            МАСТЕР 50★
                          </span>
                        ) : is25 ? (
                          <span className="text-[10px] bg-sky-500 text-slate-950 font-black px-2 py-0.5 rounded-full shadow">
                            РУБЕЖ 25★
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-700 text-slate-400 font-semibold px-2 py-0.5 rounded-full">
                            В ПРОЦЕССЕ
                          </span>
                        )}
                      </div>

                      {/* Прогресс-бар */}
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden mb-3">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-yellow-300 h-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (currentLvl / 50) * 100)}%` }}
                        />
                      </div>

                      {/* Рубежи */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div
                          className={`p-2.5 rounded-xl border flex items-center justify-between ${
                            is25
                              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                              : 'bg-slate-900/40 border-slate-800 text-slate-500'
                          }`}
                        >
                          <div>
                            <div className="font-bold flex items-center gap-1">
                              <span>{is25 ? '✅' : '🔒'}</span>
                              <span>Рубеж Lv.25</span>
                            </div>
                            <div className="text-[11px] mt-0.5">{mInfo?.lv25Desc}</div>
                          </div>
                          {is25 && <span className="text-[9px] font-black uppercase text-emerald-400">АКТИВЕН</span>}
                        </div>

                        <div
                          className={`p-2.5 rounded-xl border flex items-center justify-between ${
                            is50
                              ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                              : 'bg-slate-900/40 border-slate-800 text-slate-500'
                          }`}
                        >
                          <div>
                            <div className="font-bold flex items-center gap-1">
                              <span>{is50 ? '✅' : '🔒'}</span>
                              <span>Рубеж Lv.50</span>
                            </div>
                            <div className="text-[11px] mt-0.5">{mInfo?.lv50Desc}</div>
                          </div>
                          {is50 && <span className="text-[9px] font-black uppercase text-amber-400">АКТИВЕН</span>}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Если игрок еще на Новичке или 1-м тире */}
            {activeMeta.tier < 2 && (
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                <span className="text-xl">ℹ️</span>
                <span>
                  Бонусы Мастерства активируются при продвижении на профессию 2-го тира (с 30 Job Level базового
                  класса) и прокачке до 25 и 50 уровней.
                </span>
              </div>
            )}

            {/* Итоговая сводка текущих активных бонусов Мастерства */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>⚡</span>
                <span>Активные бонусы Мастерства текущей профессии:</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {crossBonuses.str > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-rose-300 font-bold">
                    +{crossBonuses.str} STR
                  </span>
                )}
                {crossBonuses.agi > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-300 font-bold">
                    +{crossBonuses.agi} AGI
                  </span>
                )}
                {crossBonuses.vit > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-bold">
                    +{crossBonuses.vit} VIT
                  </span>
                )}
                {crossBonuses.int > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-300 font-bold">
                    +{crossBonuses.int} INT
                  </span>
                )}
                {crossBonuses.dex > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-bold">
                    +{crossBonuses.dex} DEX
                  </span>
                )}
                {crossBonuses.luk > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-yellow-300 font-bold">
                    +{crossBonuses.luk} LUK
                  </span>
                )}

                {crossBonuses.atkPct > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-orange-400 font-bold">
                    +{crossBonuses.atkPct}% ATK
                  </span>
                )}
                {crossBonuses.matkPct > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-purple-400 font-bold">
                    +{crossBonuses.matkPct}% MATK
                  </span>
                )}
                {crossBonuses.aspdPct > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-teal-300 font-bold">
                    +{crossBonuses.aspdPct}% ASPD
                  </span>
                )}
                {crossBonuses.maxHpPct > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-green-400 font-bold">
                    +{crossBonuses.maxHpPct}% MaxHP
                  </span>
                )}
                {crossBonuses.maxSpPct > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-blue-400 font-bold">
                    +{crossBonuses.maxSpPct}% MaxSP
                  </span>
                )}
                {crossBonuses.hardDef > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">
                    +{crossBonuses.hardDef} Hard DEF
                  </span>
                )}
                {crossBonuses.blockChance > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-bold">
                    +{crossBonuses.blockChance}% Блок щитом
                  </span>
                )}
                {crossBonuses.critChance > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-bold">
                    +{crossBonuses.critChance}% CRIT
                  </span>
                )}
                {crossBonuses.hit > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-bold">
                    +{crossBonuses.hit} HIT
                  </span>
                )}
                {crossBonuses.flee > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-300 font-bold">
                    +{crossBonuses.flee} FLEE
                  </span>
                )}
                {crossBonuses.moveSpeedPct > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-lime-300 font-bold">
                    +{crossBonuses.moveSpeedPct}% Скорость бега
                  </span>
                )}
                {crossBonuses.cdReductionPct > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-pink-300 font-bold">
                    -{crossBonuses.cdReductionPct}% Откат скиллов
                  </span>
                )}
                {crossBonuses.spRegenPct > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-300 font-bold">
                    +{crossBonuses.spRegenPct}% Реген SP
                  </span>
                )}
                {crossBonuses.autocastBonusPct > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-violet-300 font-bold">
                    +{crossBonuses.autocastBonusPct}% Авто-касты
                  </span>
                )}
                {crossBonuses.healPowerPct > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400 font-bold">
                    +{crossBonuses.healPowerPct}% Сила лечения
                  </span>
                )}
                {crossBonuses.bonusExpPct > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-yellow-300 font-bold">
                    +{crossBonuses.bonusExpPct}% EXP со всех мобов
                  </span>
                )}
                {crossBonuses.critDmgPct > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-red-400 font-bold">
                    +{crossBonuses.critDmgPct}% Крит. урон
                  </span>
                )}
                {crossBonuses.bossDmgIncreasePct > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-500 font-bold">
                    +{crossBonuses.bossDmgIncreasePct}% Урон по Элите/MVP
                  </span>
                )}
                {crossBonuses.bossDmgReductionPct > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-blue-300 font-bold">
                    -{crossBonuses.bossDmgReductionPct}% Урон от Боссов
                  </span>
                )}
                {crossBonuses.beastDmgIncreasePct > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-lime-400 font-bold">
                    +{crossBonuses.beastDmgIncreasePct}% Урон по зверям
                  </span>
                )}

                {Object.values(crossBonuses).every((v) => v === 0) && (
                  <span className="text-slate-500 italic">
                    Пока нет открытых бонусов. Достигните 25 Job Level на профессии 2-го тира!
                  </span>
                )}
              </div>
            </div>

            {/* Справочник бонусов всех классов 2-го тира */}
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>📖</span>
                <span>Справочник бонусов всех классов 2-го тира:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {MASTERY_INFOS.map((info) => (
                  <div
                    key={info.jobId}
                    className={`p-3 rounded-xl border flex flex-col justify-between ${
                      info.jobId === activeJobId
                        ? 'bg-amber-950/30 border-amber-500/60'
                        : 'bg-slate-900/40 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1.5">
                      <span className="text-xl">{info.icon}</span>
                      <span className="font-bold text-xs text-slate-200">{info.name}</span>
                      {info.jobId === activeJobId && (
                        <span className="text-[9px] font-bold text-amber-400 bg-slate-900 px-1.5 rounded">
                          Ваш класс
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-300 space-y-0.5">
                      <div>
                        <b className="text-slate-400">Lv.25:</b> {info.lv25Desc}
                      </div>
                      <div>
                        <b className="text-slate-400">Lv.50:</b> {info.lv50Desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
