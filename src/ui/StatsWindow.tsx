import { useState, useEffect, useRef, useLayoutEffect } from 'preact/hooks';
import { StatKey, EquipmentSetId } from '../types/game.types';
import { EventBus } from '../core/EventBus';
import { Player } from '../entities/Player';
import { CombatSystem } from '../systems/CombatSystem';
import { SoundFX } from '../core/SoundFX';
import {
  EQUIPMENT_SETS_DATA,
  LEGENDARY_MODS_DATA,
} from '../systems/ItemGeneratorSystem';

interface StatsWindowProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onOpenInventory?: () => void;
}

interface TooltipRow {
  label: string;
  value: string | number;
  color?: string;
}

interface TooltipData {
  title: string;
  subtitle?: string;
  rows: TooltipRow[];
  footer?: { label: string; value: string | number; color?: string };
}

const STAT_DESCRIPTIONS: Record<StatKey, string> = {
  str: 'Сила: увеличивает базовую физическую атаку (ATK) ближнего боя и булавы.',
  agi: 'Ловкость: увеличивает скорость атаки (ASPD), уворот (FLEE) и скорость бега.',
  vit: 'Живучесть: увеличивает максимальный запас HP и снижает входящий урон (Soft DEF).',
  int: 'Интеллект: увеличивает магическую атаку (MATK), урон булавы и запас SP.',
  dex: 'Сноровка: увеличивает точность (HIT), урон лука/посоха и слегка ускоряет атаку.',
  luk: 'Удача: повышает шанс критического удара (CRIT), уворот и меткость.',
};

const CROSS_JOB_STAT_LABELS: Record<string, string> = {
  critDmgPct: 'Крит. урон',
  bossDmgIncreasePct: 'Урон по Боссам',
  bossDmgReductionPct: 'Защита от Боссов',
  beastDmgIncreasePct: 'Урон по Зверям',
  elementalSkillDmgPct: 'Стихийный урон',
  autocastBonusPct: 'Шанс автокаста',
  atkPct: 'ATK',
  matkPct: 'MATK',
  aspdPct: 'ASPD',
  maxHpPct: 'MaxHP',
  maxSpPct: 'MaxSP',
  cdReductionPct: 'Откат умений',
  spRegenPct: 'Реген SP',
  healPowerPct: 'Лечение',
  bonusExpPct: 'Опыт',
  moveSpeedPct: 'Скорость бега',
  hit: 'HIT',
  flee: 'FLEE',
  hardDef: 'DEF',
  blockChance: 'Шанс блока',
  critChance: 'Крит. шанс',
  def: 'DEF',
  mdef: 'MDEF',
  str: 'STR',
  agi: 'AGI',
  vit: 'VIT',
  int: 'INT',
  dex: 'DEX',
  luk: 'LUK',
  allStats: 'Все статы',
};

function formatCrossJobBonus(stat: string, val: number): string {
  const label = CROSS_JOB_STAT_LABELS[stat] || stat.toUpperCase();
  const isPercent =
    stat.endsWith('Pct') ||
    stat.includes('Percent') ||
    stat === 'critChance' ||
    stat === 'blockChance';
  return `+${val}${isPercent ? '%' : ''} ${label}`;
}

export function StatsWindow({
  isOpen,
  onClose,
  player,
  onOpenInventory,
}: StatsWindowProps) {
  const [statPoints, setStatPoints] = useState<number>(player.statPoints);
  const [, setTimerTick] = useState(0);

  // Плавающий тултип для характеристик и формул
  const [activeTooltip, setActiveTooltip] = useState<{
    data: TooltipData;
    targetRect: DOMRect;
  } | null>(null);

  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleShowTooltip = (data: TooltipData, e: MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActiveTooltip({ data, targetRect: rect });
  };

  const handleHideTooltip = () => {
    setActiveTooltip(null);
  };

  useLayoutEffect(() => {
    if (!activeTooltip || !tooltipRef.current) return;
    const tooltipEl = tooltipRef.current;
    const target = activeTooltip.targetRect;
    const pad = 12;

    const tooltipWidth = tooltipEl.offsetWidth || 288;
    const tooltipHeight = tooltipEl.offsetHeight || 260;

    // Горизонтальное позиционирование (справа от цели, если помещается, иначе слева)
    let left: number;
    const spaceRight = window.innerWidth - target.right;
    const spaceLeft = target.left;

    if (spaceRight >= tooltipWidth + pad) {
      left = target.right + pad;
    } else if (spaceLeft >= tooltipWidth + pad) {
      left = target.left - tooltipWidth - pad;
    } else {
      left = spaceRight >= spaceLeft ? target.right + pad : target.left - tooltipWidth - pad;
    }

    // Жесткое ограничение по границам экрана по горизонтали
    left = Math.max(pad, Math.min(window.innerWidth - tooltipWidth - pad, left));

    // Вертикальное позиционирование (центрирование относительно наведённого элемента)
    let top = target.top + (target.height - tooltipHeight) / 2;

    // Жесткое ограничение по границам экрана по вертикали (чтобы тултип никогда не уезжал вниз/вверх)
    top = Math.max(pad, Math.min(window.innerHeight - tooltipHeight - pad, top));

    tooltipEl.style.left = `${Math.round(left)}px`;
    tooltipEl.style.top = `${Math.round(top)}px`;
    tooltipEl.style.opacity = '1';
  }, [activeTooltip]);

  useEffect(() => {
    setActiveTooltip(null);
  }, [isOpen]);

  useEffect(() => {
    const handleScrollOrResize = () => {
      setActiveTooltip(null);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  useEffect(() => {
    const unsubPoints = EventBus.on('STAT_POINTS_CHANGED', (data) => {
      setStatPoints(data.statPoints);
    });

    const unsubEq = EventBus.on('EQUIPMENT_UPDATED', () => {
      setTimerTick((t) => t + 1);
    });

    // Живой таймер для баффов (каждую секунду)
    const interval = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 1000);

    return () => {
      unsubPoints();
      unsubEq();
      clearInterval(interval);
    };
  }, []);

  if (!isOpen) return null;

  // Данные полного расчёта характеристик
  const breakdown = player.getStatBreakdown();

  const handleStatUpgrade = (stat: StatKey, times: number = 1) => {
    let upgraded = false;
    for (let i = 0; i < times; i++) {
      if (!player.increaseStat(stat)) break;
      upgraded = true;
    }
    if (upgraded) {
      setStatPoints(player.statPoints);
      SoundFX.playLevelUp();
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-auto flex items-center justify-center bg-black/60 z-50 p-3 select-none">
      <div className="w-full max-w-5xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/70 rounded-3xl shadow-2xl p-5 text-slate-100 backdrop-blur-md flex flex-col max-h-[94vh]">
        {/* Шапка окна и кнопка закрытия */}
        <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <span className="text-xl">📊</span>
            <div>
              <h2 className="text-base font-black text-amber-400 tracking-wide">
                Характеристики
              </h2>
              <p className="text-xs text-slate-400">
                Уровень {player.level} • <span className="text-amber-300 font-semibold">{player.jobClass}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenInventory && (
              <button
                onClick={() => {
                  onClose();
                  onOpenInventory();
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                title="Перейти в окно рюкзака и экипировки"
              >
                <span>🎒</span>
                <span>Рюкзак</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition"
              title="Закрыть (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Основной контент: 3 Колонки */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 overflow-y-auto mt-3">
          {/* ЗОНА 1 (4/12): Базовые характеристики и прокачка */}
          <div className="lg:col-span-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <span>🌟</span>
                  <span>Базовые параметры</span>
                </h3>
              </div>

              {/* Баннер свободных очков характеристик */}
              <div className="mb-2 flex justify-between items-center bg-gradient-to-r from-amber-950/40 to-slate-900 px-2.5 py-1.5 rounded-xl border border-amber-500/40">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>✨</span>
                  <span>Свободные очки:</span>
                </span>
                <span className="text-sm font-black text-amber-400 font-mono">
                  {statPoints}
                </span>
              </div>

              {/* Список 6 базовых характеристик */}
              <div className="space-y-1">
                {(['str', 'agi', 'vit', 'int', 'dex', 'luk'] as StatKey[]).map((stat) => {
                  const invested = breakdown.baseStats.invested[stat];
                  const fromGear = breakdown.baseStats.fromGear[stat];
                  const fromCards = breakdown.baseStats.fromCards[stat];
                  const fromAlbum = breakdown.baseStats.fromAlbum[stat];
                  const fromBuffs = breakdown.baseStats.fromBuffs[stat];
                  const fromPassives = breakdown.baseStats.fromPassives ? breakdown.baseStats.fromPassives[stat] : 0;
                  const bonusTotal = fromGear + fromCards + fromAlbum + fromBuffs + fromPassives;
                  const total = invested + bonusTotal;

                  const cost = CombatSystem.getStatPointCost(invested);
                  const canUpgrade = statPoints >= cost;

                  const handleMouseEnterStat = (e: MouseEvent) => {
                    const statRows: TooltipRow[] = [
                      { label: '🔹 Очки уровня:', value: invested, color: 'text-slate-200' },
                      { label: '⚔️ Экипировка:', value: `+${fromGear}`, color: 'text-sky-300' },
                      { label: '🃏 Карты сокетов:', value: `+${fromCards}`, color: 'text-rose-300' },
                      { label: '📖 Альбом карт:', value: `+${fromAlbum}`, color: 'text-amber-300' },
                    ];
                    if (fromPassives > 0) {
                      statRows.push({
                        label: '🎖️ Пассивки и Мастерство:',
                        value: `+${fromPassives}`,
                        color: 'text-yellow-400',
                      });
                    }
                    if (fromBuffs > 0) {
                      statRows.push({
                        label: '✨ Временные баффы:',
                        value: `+${fromBuffs}`,
                        color: 'text-emerald-300',
                      });
                    }
                    handleShowTooltip(
                      {
                        title: `${stat.toUpperCase()} • Источники характеристики`,
                        subtitle: STAT_DESCRIPTIONS[stat],
                        rows: statRows,
                        footer: {
                          label: 'Итоговое значение:',
                          value: total,
                          color: 'text-amber-400',
                        },
                      },
                      e
                    );
                  };

                  return (
                    <div
                      key={stat}
                      onMouseEnter={handleMouseEnterStat}
                      onMouseLeave={handleHideTooltip}
                      className="flex items-center justify-between bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-xl border border-slate-700/60 transition cursor-help"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-8 uppercase font-black text-[11px] text-sky-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-center shadow-inner">
                          {stat}
                        </span>
                        <div className="flex items-center gap-1 font-mono">
                          <span className="text-xs font-bold text-slate-100">{invested}</span>
                          {bonusTotal > 0 ? (
                            <>
                              <span className="text-[11px] font-bold text-emerald-400">
                                +{bonusTotal}
                              </span>
                              <span className="text-[11px] font-bold text-amber-300 bg-amber-950/50 px-1 py-0.2 rounded border border-amber-500/30">
                                = {total}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-400">
                          Цена: <b className="text-amber-300 font-mono">{cost}</b>
                        </span>
                        <button
                          onClick={(e) => {
                            const times = e.shiftKey ? 5 : 1;
                            handleStatUpgrade(stat, times);
                          }}
                          disabled={!canUpgrade}
                          className={`w-6 h-6 flex items-center justify-center font-black text-xs rounded-lg transition active:scale-95 ${
                            canUpgrade
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                              : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                          }`}
                          title={
                            canUpgrade
                              ? `Повысить ${stat.toUpperCase()} (за ${cost} очк.)\nShift+Клик: повысить до +5 раз`
                              : 'Недостаточно очков'
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ЗОНА 2 (4/12): Боевые параметры с плавающими Tooltip-формулами */}
          <div className="lg:col-span-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <span>⚔️</span>
                  <span>Боевые параметры</span>
                </h3>
              </div>

              <div className="space-y-1.5">
                {/* 1. ATK */}
                <div
                  onMouseEnter={(e) => {
                    const atkRows: TooltipRow[] = [
                      {
                        label: 'База от STR / DEX:',
                        value: `+${breakdown.combat.atk.fromStats}`,
                        color: 'text-slate-200',
                      },
                      {
                        label: 'Базовый урон оружия:',
                        value: `+${breakdown.combat.atk.weaponBase}`,
                        color: 'text-sky-300',
                      },
                      {
                        label: 'Заточка оружия (+N*7):',
                        value: `+${breakdown.combat.atk.refine}`,
                        color: 'text-amber-400',
                      },
                    ];
                    if (breakdown.combat.atk.enchant > 0) {
                      atkRows.push({
                        label: 'Зачарование оружия:',
                        value: `+${breakdown.combat.atk.enchant}`,
                        color: 'text-purple-400',
                      });
                    }
                    if (breakdown.combat.atk.passiveMult > 1) {
                      atkRows.push({
                        label: 'Пассивка класса (+15%):',
                        value: `x${breakdown.combat.atk.passiveMult.toFixed(2)}`,
                        color: 'text-emerald-400',
                      });
                    }
                    if (breakdown.combat.atk.passivePct && breakdown.combat.atk.passivePct > 0) {
                      atkRows.push({
                        label: 'Мастерство Клинка / Булавы:',
                        value: `+${breakdown.combat.atk.passivePct}%`,
                        color: 'text-yellow-400',
                      });
                    }
                    if (breakdown.combat.atk.crossJobPct && breakdown.combat.atk.crossJobPct > 0) {
                      atkRows.push({
                        label: 'Мастерство профессии:',
                        value: `+${breakdown.combat.atk.crossJobPct}%`,
                        color: 'text-amber-400',
                      });
                    }
                    if (breakdown.combat.atk.buffsMult > 1) {
                      atkRows.push({
                        label: 'Временные баффы:',
                        value: `x${breakdown.combat.atk.buffsMult.toFixed(2)}`,
                        color: 'text-emerald-400',
                      });
                    }
                    handleShowTooltip(
                      {
                        title: '⚔️ Физическая Атака (ATK)',
                        subtitle:
                          'Суммарный физический урон при базовой атаке и физических скиллах',
                        rows: atkRows,
                        footer: {
                          label: 'Итоговый ATK:',
                          value: breakdown.combat.atk.total,
                          color: 'text-amber-400',
                        },
                      },
                      e
                    );
                  }}
                  onMouseLeave={handleHideTooltip}
                  className="flex justify-between items-center bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-xl border border-slate-700/60 text-xs transition cursor-help"
                >
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>⚔️</span>
                    <span>Физ. атака (ATK):</span>
                  </span>
                  <span className="font-bold text-amber-300 font-mono text-sm">
                    {breakdown.combat.atk.total}
                  </span>
                </div>

                {/* 2. MATK */}
                <div
                  onMouseEnter={(e) => {
                    const matkRows: TooltipRow[] = [
                      {
                        label: 'База от INT / DEX:',
                        value: `+${breakdown.combat.matk.fromStats}`,
                        color: 'text-slate-200',
                      },
                      {
                        label: 'Базовый MATK посоха:',
                        value: `+${breakdown.combat.matk.weaponBase}`,
                        color: 'text-sky-300',
                      },
                    ];
                    if (breakdown.combat.matk.refine > 0) {
                      matkRows.push({
                        label: 'Заточка посоха (+N*7):',
                        value: `+${breakdown.combat.matk.refine}`,
                        color: 'text-amber-400',
                      });
                    }
                    if (breakdown.combat.matk.passiveMult > 1) {
                      matkRows.push({
                        label: 'Пассивка класса (+20%):',
                        value: `x${breakdown.combat.matk.passiveMult.toFixed(2)}`,
                        color: 'text-emerald-400',
                      });
                    }
                    if (breakdown.combat.matk.meditationBonusPct && breakdown.combat.matk.meditationBonusPct > 0) {
                      matkRows.push({
                        label: 'Медитация Маны (Пассивка):',
                        value: `+${breakdown.combat.matk.meditationBonusPct}%`,
                        color: 'text-sky-300',
                      });
                    }
                    if (breakdown.combat.matk.mysticalAmplifyPct && breakdown.combat.matk.mysticalAmplifyPct > 0) {
                      matkRows.push({
                        label: 'Усиление Магии (Пассивка):',
                        value: `+${breakdown.combat.matk.mysticalAmplifyPct}%`,
                        color: 'text-purple-300',
                      });
                    }
                    if (breakdown.combat.matk.maceFaithPct && breakdown.combat.matk.maceFaithPct > 0) {
                      matkRows.push({
                        label: 'Вера и Мастерство Булавы:',
                        value: `+${breakdown.combat.matk.maceFaithPct}%`,
                        color: 'text-yellow-400',
                      });
                    }
                    if (breakdown.combat.matk.freeCastBonusMatk && breakdown.combat.matk.freeCastBonusMatk > 0) {
                      matkRows.push({
                        label: 'Свободный Каст (от AGI):',
                        value: `+${breakdown.combat.matk.freeCastBonusMatk}`,
                        color: 'text-teal-300',
                      });
                    }
                    if (breakdown.combat.matk.crossJobPct && breakdown.combat.matk.crossJobPct > 0) {
                      matkRows.push({
                        label: 'Мастерство профессии:',
                        value: `+${breakdown.combat.matk.crossJobPct}%`,
                        color: 'text-amber-400',
                      });
                    }
                    if (breakdown.combat.matk.buffsFlat > 0) {
                      matkRows.push({
                        label: 'Эликсир синей маны:',
                        value: `+${breakdown.combat.matk.buffsFlat}`,
                        color: 'text-purple-400',
                      });
                    }
                    handleShowTooltip(
                      {
                        title: '🪄 Магическая Атака (MATK)',
                        subtitle: 'Сила магических сфер, болтов и заклинаний волшебства',
                        rows: matkRows,
                        footer: {
                          label: 'Итоговый MATK:',
                          value: breakdown.combat.matk.total,
                          color: 'text-sky-400',
                        },
                      },
                      e
                    );
                  }}
                  onMouseLeave={handleHideTooltip}
                  className="flex justify-between items-center bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-xl border border-slate-700/60 text-xs transition cursor-help"
                >
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>🪄</span>
                    <span>Маг. атака (MATK):</span>
                  </span>
                  <span className="font-bold text-sky-300 font-mono text-sm">
                    {breakdown.combat.matk.total}
                  </span>
                </div>

                {/* 3. DEF */}
                <div
                  onMouseEnter={(e) => {
                    const effDef = breakdown.combat.def.totalPercent;
                    const dmgReduction = Math.round((effDef / (100 + effDef)) * 100);
                    const defRows: TooltipRow[] = [
                      {
                        label: 'Базовая броня снаряжения:',
                        value: `+${breakdown.combat.def.armorBase} DEF`,
                        color: 'text-slate-200',
                      },
                      {
                        label: 'Заточка брони и щита:',
                        value: `+${breakdown.combat.def.refine} DEF`,
                        color: 'text-amber-400',
                      },
                    ];
                    if (breakdown.combat.def.crossJobHardDef && breakdown.combat.def.crossJobHardDef > 0) {
                      defRows.push({
                        label: 'Мастерство профессии (DEF):',
                        value: `+${breakdown.combat.def.crossJobHardDef} DEF`,
                        color: 'text-amber-400',
                      });
                    }
                    defRows.push(
                      {
                        label: 'Hard DEF (100 / (100 + DEF)):',
                        value: `-${dmgReduction}% физ. урона`,
                        color: 'text-sky-300',
                      },
                      {
                        label: 'Soft DEF от VIT (плоский):',
                        value: `-${breakdown.combat.def.totalSoft} урона`,
                        color: 'text-emerald-400',
                      }
                    );
                    handleShowTooltip(
                      {
                        title: '🛡️ Физическая Защита (DEF)',
                        subtitle:
                          'Гиперболическое поглощение урона и снижение от VIT (Hard & Soft DEF)',
                        rows: defRows,
                        footer: {
                          label: 'Итоговая защита:',
                          value: `DEF ${effDef} (-${dmgReduction}% / -${breakdown.combat.def.totalSoft})`,
                          color: 'text-emerald-300',
                        },
                      },
                      e
                    );
                  }}
                  onMouseLeave={handleHideTooltip}
                  className="flex justify-between items-center bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-xl border border-slate-700/60 text-xs transition cursor-help"
                >
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>🛡️</span>
                    <span>Защита (DEF):</span>
                  </span>
                  <span className="font-bold text-emerald-300 font-mono text-sm">
                    {breakdown.combat.def.totalPercent} (+{breakdown.combat.def.totalSoft})
                  </span>
                </div>

                {/* 4. HP */}
                <div
                  onMouseEnter={(e) => {
                    const hpRows: TooltipRow[] = [
                      {
                        label: `База от уровня (${breakdown.level} ур):`,
                        value: breakdown.combat.maxHp.baseLevel,
                        color: 'text-slate-200',
                      },
                      {
                        label: 'Прибавка от VIT:',
                        value: `+${breakdown.combat.maxHp.vitBonus}`,
                        color: 'text-emerald-400',
                      },
                    ];
                    if (breakdown.combat.maxHp.gearCards > 0) {
                      hpRows.push({
                        label: 'Экипировка и карты:',
                        value: `+${breakdown.combat.maxHp.gearCards}`,
                        color: 'text-sky-400',
                      });
                    }
                    if (breakdown.combat.maxHp.buffsFlat > 0) {
                      hpRows.push({
                        label: 'Статуя Богини / Обед:',
                        value: `+${breakdown.combat.maxHp.buffsFlat}`,
                        color: 'text-amber-400',
                      });
                    }
                    if (breakdown.combat.maxHp.buffsMult > 1) {
                      hpRows.push({
                        label: 'Эликсир живучести (+15%):',
                        value: `x${breakdown.combat.maxHp.buffsMult.toFixed(2)}`,
                        color: 'text-purple-400',
                      });
                    }
                    if (breakdown.combat.maxHp.passiveMult > 1) {
                      hpRows.push({
                        label: 'Пассивка класса (+12%):',
                        value: `x${breakdown.combat.maxHp.passiveMult.toFixed(2)}`,
                        color: 'text-emerald-400',
                      });
                    }
                    if (breakdown.combat.maxHp.cavalryBonusPct && breakdown.combat.maxHp.cavalryBonusPct > 0) {
                      hpRows.push({
                        label: 'Кавалерийский Натиск:',
                        value: `+${breakdown.combat.maxHp.cavalryBonusPct}%`,
                        color: 'text-yellow-400',
                      });
                    }
                    if (breakdown.combat.maxHp.autoGuardBonusPct && breakdown.combat.maxHp.autoGuardBonusPct > 0) {
                      hpRows.push({
                        label: 'Священный Заслон:',
                        value: `+${breakdown.combat.maxHp.autoGuardBonusPct}%`,
                        color: 'text-yellow-400',
                      });
                    }
                    if (breakdown.combat.maxHp.crossJobPct && breakdown.combat.maxHp.crossJobPct > 0) {
                      hpRows.push({
                        label: 'Мастерство профессии:',
                        value: `+${breakdown.combat.maxHp.crossJobPct}%`,
                        color: 'text-amber-400',
                      });
                    }
                    handleShowTooltip(
                      {
                        title: '❤️ Максимум Здоровья (Max HP)',
                        subtitle: 'Запас жизненных сил персонажа',
                        rows: hpRows,
                        footer: {
                          label: 'Итоговый Max HP:',
                          value: breakdown.combat.maxHp.total,
                          color: 'text-rose-400',
                        },
                      },
                      e
                    );
                  }}
                  onMouseLeave={handleHideTooltip}
                  className="flex justify-between items-center bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-xl border border-slate-700/60 text-xs transition cursor-help"
                >
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>❤️</span>
                    <span>Здоровье (Max HP):</span>
                  </span>
                  <span className="font-bold text-rose-400 font-mono text-sm">
                    {breakdown.combat.maxHp.total}
                  </span>
                </div>

                {/* 5. SP */}
                <div
                  onMouseEnter={(e) => {
                    const spRows: TooltipRow[] = [
                      {
                        label: 'База от уровня:',
                        value: breakdown.combat.maxSp.baseLevel,
                        color: 'text-slate-200',
                      },
                      {
                        label: 'Бонус от INT (+2%/ед):',
                        value: `+${breakdown.combat.maxSp.intBonus}`,
                        color: 'text-indigo-300',
                      },
                    ];
                    if (breakdown.combat.maxSp.meditationRegenRate && breakdown.combat.maxSp.meditationRegenRate > 0) {
                      spRows.push({
                        label: 'Медитация Маны (Реген SP):',
                        value: `+${breakdown.combat.maxSp.meditationRegenRate} SP / 3 сек`,
                        color: 'text-sky-300',
                      });
                    }
                    if (breakdown.combat.maxSp.musicLessonsRegenRate && breakdown.combat.maxSp.musicLessonsRegenRate > 0) {
                      spRows.push({
                        label: 'Уроки Гармонии (Реген SP):',
                        value: `+${breakdown.combat.maxSp.musicLessonsRegenRate} SP / сек`,
                        color: 'text-sky-300',
                      });
                    }
                    if (breakdown.combat.maxSp.crossJobPct && breakdown.combat.maxSp.crossJobPct > 0) {
                      spRows.push({
                        label: 'Мастерство профессии:',
                        value: `+${breakdown.combat.maxSp.crossJobPct}%`,
                        color: 'text-amber-400',
                      });
                    }
                    handleShowTooltip(
                      {
                        title: '💙 Запас Маны (Max SP)',
                        subtitle:
                          'Энергия для применения классовых заклинаний и способностей',
                        rows: spRows,
                        footer: {
                          label: 'Итоговый Max SP:',
                          value: breakdown.combat.maxSp.total,
                          color: 'text-indigo-400',
                        },
                      },
                      e
                    );
                  }}
                  onMouseLeave={handleHideTooltip}
                  className="flex justify-between items-center bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-xl border border-slate-700/60 text-xs transition cursor-help"
                >
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>💙</span>
                    <span>Мана (Max SP):</span>
                  </span>
                  <span className="font-bold text-indigo-400 font-mono text-sm">
                    {breakdown.combat.maxSp.total}
                  </span>
                </div>

                {/* 6. ASPD */}
                <div
                  onMouseEnter={(e) => {
                    const aspdRows: TooltipRow[] = [
                      {
                        label: 'База + AGI/DEX:',
                        value: `${breakdown.combat.aspd.baseAgiDex} /с`,
                        color: 'text-slate-200',
                      },
                    ];
                    if (breakdown.combat.aspd.enchantBonus > 0) {
                      aspdRows.push({
                        label: 'Зачарование кузнеца:',
                        value: `+${breakdown.combat.aspd.enchantBonus}`,
                        color: 'text-purple-400',
                      });
                    }
                    if (breakdown.combat.aspd.cavalryBonusPct && breakdown.combat.aspd.cavalryBonusPct > 0) {
                      aspdRows.push({
                        label: 'Кавалерийский Натиск:',
                        value: `+${breakdown.combat.aspd.cavalryBonusPct}%`,
                        color: 'text-yellow-400',
                      });
                    }
                    if (breakdown.combat.aspd.musicLessonsBonusPct && breakdown.combat.aspd.musicLessonsBonusPct > 0) {
                      aspdRows.push({
                        label: 'Уроки Гармонии:',
                        value: `+${breakdown.combat.aspd.musicLessonsBonusPct}%`,
                        color: 'text-yellow-400',
                      });
                    }
                    if (breakdown.combat.aspd.freeCastBonusPct && breakdown.combat.aspd.freeCastBonusPct > 0) {
                      aspdRows.push({
                        label: 'Свободный Каст:',
                        value: `+${breakdown.combat.aspd.freeCastBonusPct}%`,
                        color: 'text-yellow-400',
                      });
                    }
                    if (breakdown.combat.aspd.crossJobPct && breakdown.combat.aspd.crossJobPct > 0) {
                      aspdRows.push({
                        label: 'Мастерство профессии:',
                        value: `+${breakdown.combat.aspd.crossJobPct}%`,
                        color: 'text-amber-400',
                      });
                    }
                    if (breakdown.combat.aspd.buffsMult > 1) {
                      aspdRows.push({
                        label: 'Зелье концентрации (+15%):',
                        value: `x${breakdown.combat.aspd.buffsMult.toFixed(2)}`,
                        color: 'text-emerald-400',
                      });
                    }
                    handleShowTooltip(
                      {
                        title: '⚡ Скорость Атаки (ASPD)',
                        subtitle: 'Количество авто-атак оружием в секунду',
                        rows: aspdRows,
                        footer: {
                          label: 'Итоговая скорость:',
                          value: `${breakdown.combat.aspd.total} /сек`,
                          color: 'text-amber-400',
                        },
                      },
                      e
                    );
                  }}
                  onMouseLeave={handleHideTooltip}
                  className="flex justify-between items-center bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-xl border border-slate-700/60 text-xs transition cursor-help"
                >
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Скорость атаки (ASPD):</span>
                  </span>
                  <span className="font-bold text-amber-300 font-mono text-sm">
                    {breakdown.combat.aspd.total} /сек
                  </span>
                </div>

                {/* 7. CRIT */}
                <div
                  onMouseEnter={(e) => {
                    const critRows: TooltipRow[] = [
                      {
                        label: 'База + LUK (x0.35):',
                        value: `${breakdown.combat.critChance.fromLuk}%`,
                        color: 'text-slate-200',
                      },
                    ];
                    if (breakdown.combat.critChance.cardsEnchant > 0) {
                      critRows.push({
                        label: 'Карты и зачарования:',
                        value: `+${breakdown.combat.critChance.cardsEnchant}%`,
                        color: 'text-amber-400',
                      });
                    }
                    if (breakdown.combat.critChance.crossJobBonus && breakdown.combat.critChance.crossJobBonus > 0) {
                      critRows.push({
                        label: 'Мастерство профессии:',
                        value: `+${breakdown.combat.critChance.crossJobBonus}%`,
                        color: 'text-amber-400',
                      });
                    }
                    handleShowTooltip(
                      {
                        title: '🎯 Шанс Критического Удара (CRIT)',
                        subtitle:
                          'Вероятность нанести двойной урон в обход защиты цели',
                        rows: critRows,
                        footer: {
                          label: 'Итоговый шанс:',
                          value: `${breakdown.combat.critChance.total}%`,
                          color: 'text-yellow-400',
                        },
                      },
                      e
                    );
                  }}
                  onMouseLeave={handleHideTooltip}
                  className="flex justify-between items-center bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-xl border border-slate-700/60 text-xs transition cursor-help"
                >
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>🎯</span>
                    <span>Крит. шанс (CRIT):</span>
                  </span>
                  <span className="font-bold text-yellow-400 font-mono text-sm">
                    {breakdown.combat.critChance.total}%
                  </span>
                </div>

                {/* 8. HIT & FLEE */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div
                    onMouseEnter={(e) => {
                      const hitRows: TooltipRow[] = [
                        { label: 'Базовая точность:', value: 175, color: 'text-slate-200' },
                        {
                          label: `Бонус уровня (${breakdown.level} ур):`,
                          value: `+${breakdown.level}`,
                          color: 'text-sky-300',
                        },
                        {
                          label: 'Бонус от DEX:',
                          value: `+${breakdown.baseStats.total.dex}`,
                          color: 'text-emerald-300',
                        },
                        {
                          label: 'Бонус от LUK (LUK/3):',
                          value: `+${Math.floor(breakdown.baseStats.total.luk / 3)}`,
                          color: 'text-amber-300',
                        },
                      ];
                      if (breakdown.combat.hit.swordMasteryBonus && breakdown.combat.hit.swordMasteryBonus > 0) {
                        hitRows.push({
                          label: 'Мастерство Клинка:',
                          value: `+${breakdown.combat.hit.swordMasteryBonus}`,
                          color: 'text-yellow-400',
                        });
                      }
                      if (breakdown.combat.hit.crossJobBonus && breakdown.combat.hit.crossJobBonus > 0) {
                        hitRows.push({
                          label: 'Мастерство профессии:',
                          value: `+${breakdown.combat.hit.crossJobBonus}`,
                          color: 'text-amber-400',
                        });
                      }
                      handleShowTooltip(
                        {
                          title: '🏹 Меткость (HIT)',
                          subtitle:
                            'Точность попадания физическими атаками (противостоит FLEE цели)',
                          rows: hitRows,
                          footer: {
                            label: 'Итоговый HIT:',
                            value: breakdown.combat.hit.total,
                            color: 'text-sky-400',
                          },
                        },
                        e
                      );
                    }}
                    onMouseLeave={handleHideTooltip}
                    className="flex justify-between items-center bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-xl border border-slate-700/60 text-xs transition cursor-help"
                  >
                    <span className="text-slate-400 flex items-center gap-1">
                      <span>🏹</span>
                      <span>HIT:</span>
                    </span>
                    <span className="font-bold text-sky-300 font-mono">
                      {breakdown.combat.hit.total}
                    </span>
                  </div>

                  <div
                    onMouseEnter={(e) => {
                      const fleeRows: TooltipRow[] = [
                        { label: 'Базовый уворот:', value: 100, color: 'text-slate-200' },
                        {
                          label: `Бонус уровня (${breakdown.level} ур):`,
                          value: `+${breakdown.level}`,
                          color: 'text-teal-300',
                        },
                        {
                          label: 'Бонус от AGI:',
                          value: `+${breakdown.baseStats.total.agi}`,
                          color: 'text-emerald-300',
                        },
                        {
                          label: 'Бонус от LUK (LUK/5):',
                          value: `+${Math.floor(breakdown.baseStats.total.luk / 5)}`,
                          color: 'text-amber-300',
                        },
                      ];
                      if (breakdown.combat.flee.passiveBonus > 0) {
                        fleeRows.push({
                          label: 'Пассивка класса (+15):',
                          value: `+${breakdown.combat.flee.passiveBonus}`,
                          color: 'text-emerald-400',
                        });
                      }
                      if (breakdown.combat.flee.crossJobBonus && breakdown.combat.flee.crossJobBonus > 0) {
                        fleeRows.push({
                          label: 'Мастерство профессии:',
                          value: `+${breakdown.combat.flee.crossJobBonus}`,
                          color: 'text-amber-400',
                        });
                      }
                      handleShowTooltip(
                        {
                          title: '💨 Уворот (FLEE)',
                          subtitle:
                            'Шанс уклониться от физической атаки противника',
                          rows: fleeRows,
                          footer: {
                            label: 'Итоговый FLEE:',
                            value: breakdown.combat.flee.total,
                            color: 'text-teal-400',
                          },
                        },
                        e
                      );
                    }}
                    onMouseLeave={handleHideTooltip}
                    className="flex justify-between items-center bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-xl border border-slate-700/60 text-xs transition cursor-help"
                  >
                    <span className="text-slate-400 flex items-center gap-1">
                      <span>💨</span>
                      <span>FLEE:</span>
                    </span>
                    <span className="font-bold text-teal-300 font-mono">
                      {breakdown.combat.flee.total}
                    </span>
                  </div>
                </div>

                {/* 9. Скорость бега */}
                <div
                  onMouseEnter={(e) => {
                    const speedRows: TooltipRow[] = [
                      { label: 'Базовая скорость:', value: '160 px/s', color: 'text-slate-200' },
                      {
                        label: 'Бонус от AGI (x0.8):',
                        value: `+${breakdown.combat.moveSpeed.agiBonus} px/s`,
                        color: 'text-emerald-300',
                      },
                    ];
                    if (breakdown.combat.moveSpeed.cavalryBonusSpeed && breakdown.combat.moveSpeed.cavalryBonusSpeed > 0) {
                      speedRows.push({
                        label: 'Кавалерийский Натиск:',
                        value: `+${breakdown.combat.moveSpeed.cavalryBonusSpeed} px/s`,
                        color: 'text-yellow-400',
                      });
                    }
                    if (breakdown.combat.moveSpeed.crossJobPct && breakdown.combat.moveSpeed.crossJobPct > 0) {
                      speedRows.push({
                        label: 'Мастерство профессии:',
                        value: `+${breakdown.combat.moveSpeed.crossJobPct}%`,
                        color: 'text-amber-400',
                      });
                    }
                    if (breakdown.combat.moveSpeed.buffsMult > 1) {
                      speedRows.push({
                        label: 'Воля Путника / Зелья (+15%):',
                        value: `x${breakdown.combat.moveSpeed.buffsMult.toFixed(2)}`,
                        color: 'text-amber-300',
                      });
                    }
                    handleShowTooltip(
                      {
                        title: '👟 Скорость Передвижения',
                        subtitle: 'Скорость перемещения героя по карте мира',
                        rows: speedRows,
                        footer: {
                          label: 'Итоговая скорость:',
                          value: `${breakdown.combat.moveSpeed.total} px/s`,
                          color: 'text-slate-100',
                        },
                      },
                      e
                    );
                  }}
                  onMouseLeave={handleHideTooltip}
                  className="flex justify-between items-center bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-xl border border-slate-700/60 text-xs transition cursor-help"
                >
                  <span className="text-slate-400 flex items-center gap-1">
                    <span>👟</span>
                    <span>Скорость бега:</span>
                  </span>
                  <span className="font-bold text-slate-200 font-mono">
                    {breakdown.combat.moveSpeed.total} px/s
                  </span>
                </div>

                {/* 10. Блок щитом (если экипирован щит или активна пассивка) */}
                {breakdown.combat.blockChance && breakdown.combat.blockChance.total > 0 && (
                  <div
                    onMouseEnter={(e) => {
                      const blockRows: TooltipRow[] = [
                        { label: 'База от щита:', value: `${breakdown.combat.blockChance!.shieldBase}%`, color: 'text-slate-200' },
                      ];
                      if (breakdown.combat.blockChance!.autoGuardBonus > 0) {
                        blockRows.push({
                          label: 'Священный Заслон:',
                          value: `+${breakdown.combat.blockChance!.autoGuardBonus}%`,
                          color: 'text-yellow-400',
                        });
                      }
                      if (breakdown.combat.blockChance!.crossJobBonus > 0) {
                        blockRows.push({
                          label: 'Мастерство профессии:',
                          value: `+${breakdown.combat.blockChance!.crossJobBonus}%`,
                          color: 'text-amber-400',
                        });
                      }
                      handleShowTooltip(
                        {
                          title: '🛡️ Блок Щитом (Block Chance)',
                          subtitle: 'Шанс заблокировать 80% входящего физического урона при атаке врагов',
                          rows: blockRows,
                          footer: {
                            label: 'Итоговый блок:',
                            value: `${breakdown.combat.blockChance!.total}%`,
                            color: 'text-emerald-400',
                          },
                        },
                        e
                      );
                    }}
                    onMouseLeave={handleHideTooltip}
                    className="flex justify-between items-center bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-xl border border-slate-700/60 text-xs transition cursor-help"
                  >
                    <span className="text-slate-400 flex items-center gap-1">
                      <span>🛡️</span>
                      <span>Блок щитом:</span>
                    </span>
                    <span className="font-bold text-sky-300 font-mono">
                      {breakdown.combat.blockChance.total}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ЗОНА 3 (4/12): Источники усилений (Пассивки, Комплекты, Баффы, Альбом) */}
          <div className="lg:col-span-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex flex-col justify-start space-y-2.5 overflow-y-auto">
            {/* 1. Классовая пассивка профессии */}
            <div className="p-2 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-0.5 flex items-center gap-1.5">
                <span>👑</span>
                <span>Классовое мастерство ({breakdown.jobClass})</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-lg">{breakdown.classPassive.icon}</span>
                <div>
                  <div className="text-xs font-bold text-slate-100">
                    {breakdown.classPassive.name}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug">
                    {breakdown.classPassive.description}
                  </div>
                </div>
              </div>
            </div>

            {/* 1.1. Изученные пассивные навыки древа умений */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <span>📖</span>
                  <span>Пассивные навыки ({breakdown.activePassives?.length || 0})</span>
                </h4>
              </div>

              {breakdown.activePassives && breakdown.activePassives.length > 0 ? (
                <div className="space-y-1.5">
                  {breakdown.activePassives.map((passive) => (
                    <div
                      key={passive.id}
                      className="p-2 rounded-xl bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 border border-amber-500/30 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-sm">{passive.icon}</span>
                          <span className="font-bold text-slate-100">{passive.name}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Ур. {passive.level}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight">
                        {passive.description}
                      </div>
                      {passive.bonuses && passive.bonuses.length > 0 && (
                        <div className="pt-0.5 border-t border-slate-800/80 flex flex-wrap gap-1">
                          {passive.bonuses.map((b, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-emerald-300 border border-emerald-500/30 font-medium"
                            >
                              <b className="text-slate-300">{b.label}</b> {b.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-1.5 px-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-slate-500 text-[11px] italic">
                  Нет изученных пассивных навыков на текущем классе. Откройте окно навыков [K] для прокачки.
                </div>
              )}
            </div>

            {/* 2. Комплекты экипировки (Equipment Sets) - отображаются ТОЛЬКО если хотя бы 1 предмет надет */}
            {(() => {
              const equippedSets = Object.entries(player.activeSets || {}).filter(
                ([_, count]) => count > 0
              );
              if (equippedSets.length === 0) return null;

              return (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                      <span>✨</span>
                      <span>Надетые комплекты ({equippedSets.length})</span>
                    </h4>
                  </div>
                  <div className="space-y-1">
                    {equippedSets.map(([setId, count]) => {
                      const setDef = EQUIPMENT_SETS_DATA[setId as EquipmentSetId];
                      if (!setDef) return null;
                      const has2pc = count >= 2;
                      const has4pc = count >= 4;
                      return (
                        <div
                          key={setId}
                          className="p-1.5 rounded-xl bg-purple-950/25 border border-purple-500/40 text-[11px] space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-200">{setDef.name}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                has2pc
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                  : 'bg-slate-900 text-slate-400 border-slate-700'
                              }`}
                            >
                              {count}/4 частей
                            </span>
                          </div>
                          {has2pc && (
                            <div className="text-[10px] text-purple-300/90 pl-1 border-l-2 border-purple-500/60">
                              <span className="font-bold text-purple-200">[2]: </span>
                              {setDef.twoPieceDesc}
                            </div>
                          )}
                          {has4pc && (
                            <div className="text-[10px] text-amber-300/90 pl-1 border-l-2 border-amber-500/60">
                              <span className="font-bold text-amber-200">[4]: </span>
                              {setDef.fourPieceDesc}
                            </div>
                          )}
                          {!has2pc && (
                            <div className="text-[9px] text-slate-400 italic">
                              (Надето {count}/4. Требуется 2 части для активации эффекта).
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 3. Активное легендарное оружие */}
            {player.activeLegendaryMod && LEGENDARY_MODS_DATA[player.activeLegendaryMod] && (() => {
              const modDef = LEGENDARY_MODS_DATA[player.activeLegendaryMod];
              return (
                <div className="p-2 rounded-xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/40 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400 text-[10px] uppercase tracking-wider mb-0.5">
                    <span>{modDef.icon}</span>
                    <span>Легендарный эффект: {modDef.name}</span>
                  </div>
                  <div className="text-[10px] text-amber-200/80 leading-tight">
                    {modDef.description}
                  </div>
                </div>
              );
            })()}

            {/* 4. Мастерство текущей профессии */}
            {player.crossJobBonuses && Object.values(player.crossJobBonuses).some((v) => v > 0) && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <span>🎖️</span>
                    <span>Мастерство Профессии</span>
                  </h4>
                </div>
                <div className="flex flex-wrap gap-1 p-1.5 rounded-xl bg-amber-950/20 border border-amber-500/30">
                  {Object.entries(player.crossJobBonuses)
                    .filter(([_, v]) => v > 0)
                    .map(([stat, val]) => (
                      <span
                        key={stat}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-amber-500/40 text-amber-300 font-mono font-bold"
                      >
                        {formatCrossJobBonus(stat, val)}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* 5. Активные временные баффы */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <span>✨</span>
                  <span>Временные баффы ({breakdown.activeBuffs.length})</span>
                </h4>
              </div>

              {breakdown.activeBuffs.length > 0 ? (
                <div className="space-y-1">
                  {breakdown.activeBuffs.map((buff) => {
                    const durationLeft = Math.max(0, Math.ceil(buff.duration));
                    return (
                      <div
                        key={buff.id}
                        className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-base">{buff.icon}</span>
                          <div>
                            <div className="text-xs font-bold text-slate-200 leading-tight">
                              {buff.name}
                            </div>
                            <div className="text-[10px] text-emerald-400">
                              {buff.value < 1
                                ? `+${Math.round(buff.value * 100)}% к ${buff.statKey.toUpperCase()}`
                                : `+${buff.value} к ${buff.statKey.toUpperCase()}`}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 border border-slate-800">
                          ⏳ {durationLeft}с
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-1 text-center text-slate-500 text-[11px]">
                  Нет активных баффов
                </div>
              )}
            </div>

            {/* 6. Постоянные бонусы Альбома Карт */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <span>📖</span>
                  <span>Бонусы Альбома Карт ({breakdown.albumBonuses.length})</span>
                </h4>
              </div>

              {breakdown.albumBonuses.length > 0 ? (
                <div className="grid grid-cols-2 gap-1">
                  {breakdown.albumBonuses.map((b) => (
                    <div
                      key={b.cardId}
                      className="p-1 rounded-lg bg-amber-950/20 border border-amber-500/30 flex items-center justify-between text-[10px]"
                    >
                      <span className="truncate text-slate-300 font-semibold">
                        {b.cardName}
                      </span>
                      <span className="font-bold text-amber-400 ml-1 font-mono">
                        +{b.value} {b.stat.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-1 text-center text-slate-500 text-[11px]">
                  Бонусы альбома не открыты
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Плавающий тултип параметров и формул (размещен на верхнем уровне оверлея вне backdrop-filter контейнера) */}
      {activeTooltip && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            opacity: 0,
            zIndex: 99999,
            pointerEvents: 'none',
          }}
          className="w-72 max-h-[calc(100vh-24px)] overflow-y-auto p-3 bg-slate-950/95 border-2 border-amber-500/80 rounded-2xl shadow-2xl backdrop-blur-md text-[11px] space-y-1.5 pointer-events-none select-none transition-opacity duration-75"
        >
          <div className="font-bold text-amber-300 pb-1 border-b border-slate-800 flex items-center justify-between text-xs">
            <span>{activeTooltip.data.title}</span>
          </div>
          {activeTooltip.data.subtitle && (
            <div className="text-[10px] text-slate-400 italic mb-1 leading-tight">
              {activeTooltip.data.subtitle}
            </div>
          )}
          <div className="space-y-1">
            {activeTooltip.data.rows.map((row, idx) => (
              <div key={idx} className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">{row.label}</span>
                <span className={`font-mono font-bold ${row.color || 'text-slate-200'}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          {activeTooltip.data.footer && (
            <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center font-black text-white">
              <span>{activeTooltip.data.footer.label}</span>
              <span className={`font-mono text-xs ${activeTooltip.data.footer.color || 'text-amber-400'}`}>
                {activeTooltip.data.footer.value}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
