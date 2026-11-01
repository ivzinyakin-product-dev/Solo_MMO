import { useState, useEffect } from 'preact/hooks';
import { EventBus } from '../core/EventBus';
import { SoundFX } from '../core/SoundFX';
import { Player } from '../entities/Player';
import type { GameWorld } from '../core/GameWorld';
import { CampState, JobClass, ActiveBuff, MonsterRank } from '../types/game.types';
import { CombatSystem } from '../systems/CombatSystem';
import { SaveManager } from '../core/SaveManager';
import { ZONES_DATABASE } from '../data/zones.data';
import { MiniMapWidget } from './MiniMapWidget';
import { QuestTrackerWidget } from './QuestTrackerWidget';

interface HUDProps {
  player: Player;
  world: GameWorld;
  onOpenStats: () => void;
  onOpenInventory: () => void;
  onOpenBestiary: () => void;
  onOpenJobChange: () => void;
  onOpenSkills: () => void;
  onOpenCamp?: () => void;
  onOpenQuests: () => void;
  onOpenWorldMap?: () => void;
}

interface MvpTimerData {
  zoneId: string;
  bossName: string;
  remainingSec: number;
  totalSec: number;
  isAlive: boolean;
  hasMvp: boolean;
}

export function HUD({
  player,
  world,
  onOpenStats,
  onOpenInventory,
  onOpenBestiary,
  onOpenJobChange,
  onOpenSkills,
  onOpenCamp,
  onOpenQuests,
  onOpenWorldMap,
}: HUDProps) {
  const [hp, setHp] = useState({ current: player.currentHp, max: player.derivedStats.maxHp });
  const [sp, setSp] = useState({ current: player.currentSp, max: player.derivedStats.maxSp });
  const [exp, setExp] = useState({
    baseExp: player.baseExp,
    maxExp: 100,
    jobExp: player.jobExp,
    maxJobExp: 100,
    level: player.level,
    jobLevel: player.jobLevel,
  });
  const [statPoints, setStatPoints] = useState<number>(player.statPoints);
  const [campActive, setCampActive] = useState<boolean>(player.campActive);
  const [campState, setCampState] = useState<CampState>(player.campState);
  const [jobClass, setJobClass] = useState<JobClass>(player.jobClass);
  const [zoneName, setZoneName] = useState<string>(
    ZONES_DATABASE[player.currentZoneId]?.name || 'Поляна Слаймов'
  );
  const [zeny, setZeny] = useState<number>(player.zeny);
  const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>(player.activeBuffs || []);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [mvpStatus, setMvpStatus] = useState<MvpTimerData>({
    zoneId: player.currentZoneId,
    bossName: '',
    remainingSec: 0,
    totalSec: 180,
    isAlive: false,
    hasMvp: false,
  });
  const [targetMonster, setTargetMonster] = useState<{
    id: string;
    name: string;
    rank: MonsterRank;
    level: number;
    currentHp: number;
    maxHp: number;
    isMvp?: boolean;
    isElite?: boolean;
  } | null>(null);

  useEffect(() => {
    const unsubHp = EventBus.on('HP_CHANGED', (data) => setHp(data));
    const unsubSp = EventBus.on('SP_CHANGED', (data) => setSp(data));
    const unsubExp = EventBus.on('EXP_CHANGED', (data) => setExp(data));
    const unsubPoints = EventBus.on('STAT_POINTS_CHANGED', (data) => setStatPoints(data.statPoints));
    const unsubCamp = EventBus.on('CAMP_TOGGLED', (data) => setCampActive(data.active));
    const unsubState = EventBus.on('CAMP_STATE_CHANGED', (data) => setCampState(data.state));
    const unsubJob = EventBus.on('JOB_CHANGED', (data) => setJobClass(data.jobClass));
    const unsubZone = EventBus.on('ZONE_CHANGED', (data) => setZoneName(data.zoneName));
    const unsubZeny = EventBus.on('ZENY_CHANGED', (data) => setZeny(data.zeny));
    const unsubBuffs = EventBus.on('BUFFS_UPDATED', (data) => setActiveBuffs([...data.buffs]));
    const unsubMvp = EventBus.on('MVP_TIMER_UPDATED', (data: MvpTimerData) => setMvpStatus(data));
    const unsubTarget = EventBus.on('TARGET_MONSTER_CHANGED', (data) => setTargetMonster(data.monster));

    return () => {
      unsubHp();
      unsubSp();
      unsubExp();
      unsubPoints();
      unsubCamp();
      unsubState();
      unsubJob();
      unsubZone();
      unsubZeny();
      unsubBuffs();
      unsubMvp();
      unsubTarget();
    };
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleCampfire = () => {
    player.toggleCamp();
  };

  const toggleAudio = () => {
    const muted = SoundFX.toggleMute();
    setIsMuted(muted);
  };

  const hpPercent = Math.max(0, Math.min(100, (hp.current / (hp.max || 1)) * 100));
  const spPercent = Math.max(0, Math.min(100, (sp.current / (sp.max || 1)) * 100));
  const expPercent = Math.max(0, Math.min(100, (exp.baseExp / (exp.maxExp || 1)) * 100));
  const targetHpPercent = targetMonster
    ? Math.max(0, Math.min(100, (targetMonster.currentHp / (targetMonster.maxHp || 1)) * 100))
    : 0;

  const getCampStateLabel = (state: CampState) => {
    switch (state) {
      case 'FIND_TARGET':
        return 'Поиск цели';
      case 'CHASE_AND_ATTACK':
        return 'Бой с мобом';
      case 'HARVEST_RESOURCE':
        return 'Сбор ресурсов';
      case 'IDLE':
        return 'Патруль поляны';
      case 'RETURN_TO_CAMP':
        return 'Поиск цели';
      default:
        return 'Ожидание';
    }
  };

  const JOB_NAMES: Record<JobClass, { name: string; icon: string }> = {
    Novice: { name: 'Новичок', icon: '⚔️' },
    Swordsman: { name: 'Мечник', icon: '🗡️' },
    Mage: { name: 'Маг', icon: '🧙‍♂️' },
    Archer: { name: 'Лучник', icon: '🏹' },
    Acolyte: { name: 'Аколит', icon: '✝️' },
    Knight: { name: 'Рыцарь', icon: '🛡️' },
    Crusader: { name: 'Крестоносец', icon: '⛨' },
    Hunter: { name: 'Охотник', icon: '🦅' },
    Bard: { name: 'Бард', icon: '🎵' },
    Wizard: { name: 'Волшебник', icon: '🔮' },
    Sage: { name: 'Мудрец', icon: '📖' },
    Priest: { name: 'Прист', icon: '🕊️' },
    Monk: { name: 'Монах', icon: '👊' },
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 pointer-events-none select-none">
      {/* Верхний блок: Статы героя и кнопки управления */}
      <div className="flex justify-between items-start">
        {/* Панель персонажа */}
        <div className="pointer-events-auto bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 shadow-xl backdrop-blur-md w-72">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-lg font-bold border border-sky-400/50 shadow-inner">
              {JOB_NAMES[jobClass]?.icon || '⚔️'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-amber-400">
                  {JOB_NAMES[jobClass]?.name || 'Новичок'}
                </span>
                <span className="text-xs bg-slate-800 text-sky-300 font-bold px-1.5 py-0.5 rounded border border-sky-500/30">
                  Lv. {exp.level}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px] gap-2">
                <div className="text-slate-400 font-semibold flex items-center space-x-1 truncate">
                  <span>📍</span>
                  <span className="truncate">{zoneName}</span>
                </div>
                <div className="font-bold text-amber-300 flex items-center space-x-1 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0">
                  <span>🪙</span>
                  <span>{zeny.toLocaleString()} z</span>
                </div>
              </div>
            </div>
          </div>

          {/* HP Bar */}
          <div className="mb-1.5">
            <div className="flex justify-between text-[11px] font-semibold mb-0.5 text-slate-300">
              <span className="text-rose-400 font-bold">HP</span>
              <span>
                {hp.current} / {hp.max}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-150"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* SP Bar */}
          <div className="mb-1.5">
            <div className="flex justify-between text-[11px] font-semibold mb-0.5 text-slate-300">
              <span className="text-blue-400 font-bold">SP</span>
              <span>
                {sp.current} / {sp.max}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-sky-500 transition-all duration-150"
                style={{ width: `${spPercent}%` }}
              />
            </div>
          </div>

          {/* EXP Bar */}
          <div>
            <div className="flex justify-between text-[10px] font-semibold mb-0.5 text-slate-400">
              <span className="text-emerald-400 font-bold">EXP</span>
              <span>{expPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-green-400 transition-all duration-150"
                style={{ width: `${expPercent}%` }}
              />
            </div>
          </div>

          {/* Активные баффы */}
          {activeBuffs.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
              {activeBuffs.map((buff) => (
                <div
                  key={buff.id}
                  className="flex items-center space-x-1 bg-slate-800/90 border border-slate-600/70 px-2 py-0.5 rounded-md text-[10px] text-amber-200 shadow-sm"
                  title={`${buff.name}: +${Math.round(buff.value * 100)}% к ${buff.statKey.toUpperCase()}`}
                >
                  <span>{buff.icon}</span>
                  <span className="font-bold text-amber-300">{Math.ceil(buff.duration)}s</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Центральный блок: Индикатор статуса MVP-Босса */}
        {mvpStatus.hasMvp && (
          <div className="pointer-events-auto flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/50 shadow-xl backdrop-blur-md text-xs font-bold transition-all">
            <span className="text-base">👑</span>
            <span className="text-amber-300 font-extrabold">{mvpStatus.bossName}</span>
            {mvpStatus.isAlive ? (
              <span className="text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-500/40 animate-pulse font-black flex items-center space-x-1">
                <span>⚔️</span>
                <span>В БОЮ!</span>
              </span>
            ) : (
              <span className="text-sky-300 font-mono bg-slate-800/80 px-2 py-0.5 rounded-full border border-sky-500/30">
                ⏳ {formatTimer(mvpStatus.remainingSec)}
              </span>
            )}
          </div>
        )}

        {/* Правый блок: Кнопки интерфейса */}
        <div className="pointer-events-auto flex items-center space-x-2">
          {/* Кнопка Телепорта в деревню (Крыло Бабочки) */}
          {player.currentZoneId === 'zone_village' ? (
            <button
              disabled
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800/80 border border-emerald-500/50 text-emerald-300 font-bold text-sm shadow-md cursor-default opacity-90"
              title="Деревня Новичков (Текущая локация)"
            >
              <span>🏡</span>
              <span>Деревня</span>
            </button>
          ) : (
            <button
              onClick={() => world.teleportToVillage()}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 border border-sky-400/60 text-white font-bold text-sm shadow-lg shadow-sky-950/40 transition active:scale-95"
              title="Крыло Бабочки: мгновенный телепорт в Деревню Новичков"
            >
              <span>🦋</span>
              <span>В Деревню</span>
            </button>
          )}

          {/* Кнопка Телепорта в Цитадель Альдебаран (Хаб 2, Ур. 24+) */}
          {player.level >= 24 && (
            player.currentZoneId === 'zone_high_city' ? (
              <button
                disabled
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800/80 border border-amber-500/50 text-amber-300 font-bold text-sm shadow-md cursor-default opacity-90"
                title="Горная Цитадель Альдебаран (Текущая локация)"
              >
                <span>🏰</span>
                <span>Цитадель</span>
              </button>
            ) : (
              <button
                onClick={() => world.changeZone('zone_high_city', 0, 100)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 border border-amber-400/60 text-white font-bold text-sm shadow-lg shadow-purple-950/40 transition active:scale-95"
                title="Быстрый переход в Горную Цитадель Альдебаран"
              >
                <span>🏰</span>
                <span>В Цитадель</span>
              </button>
            )
          )}

          {/* Кнопка Карты Мира */}
          <button
            onClick={onOpenWorldMap || (() => EventBus.emit('OPEN_WORLD_MAP', true))}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm shadow-lg transition active:scale-95"
            title="Открыть Карту Мира (M)"
          >
            <span>🗺️</span>
            <span>Карта</span>
          </button>

          {/* Кнопка Заданий */}
          <button
            onClick={onOpenQuests}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm shadow-lg transition active:scale-95"
            title="Открыть Доску Заказов"
          >
            <span>📜</span>
            <span>Квесты</span>
          </button>

          {/* Кнопка Навыков и Профессий */}
          <button
            onClick={onOpenSkills}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm shadow-lg transition active:scale-95"
            title="Открыть Древо навыков и Смену классов"
          >
            <span>⚡</span>
            <span>Навыки</span>
          </button>

          {/* Кнопка Статов */}
          <button
            onClick={onOpenStats}
            className="relative flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm shadow-lg transition active:scale-95"
          >
            <span>📊</span>
            <span>Статы</span>
            {statPoints > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[10px] font-black bg-amber-500 text-slate-950 rounded-full animate-bounce">
                +{statPoints}
              </span>
            )}
          </button>

          {/* Кнопка Инвентаря */}
          <button
            onClick={onOpenInventory}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm shadow-lg transition active:scale-95"
            title="Открыть рюкзак и экипировку"
          >
            <span>🎒</span>
            <span>Рюкзак</span>
          </button>

          {/* Кнопка Бестиария и Альбома */}
          <button
            onClick={onOpenBestiary}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm shadow-lg transition active:scale-95"
            title="Открыть Книгу (Альбом карт и Бестиарий)"
          >
            <span>📖</span>
            <span>Книга</span>
          </button>

          {/* Кнопка смены профессии (при достижении 10 уровня) */}
          {exp.level >= 10 && jobClass === 'Novice' && (
            <button
              onClick={onOpenJobChange}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/40 animate-pulse transition active:scale-95 border border-yellow-200"
              title="Доступен выбор профессии!"
            >
              <span>👑</span>
              <span>Профессия!</span>
            </button>
          )}

          {/* Кнопка Звука */}
          <button
            onClick={toggleAudio}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-base shadow-lg transition active:scale-95"
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          {/* Кнопка Сохранить */}
          <button
            onClick={() => SaveManager.save(player, true)}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-base shadow-lg transition active:scale-95"
            title="Сохранить прогресс вручную (также сохраняется каждые 5 сек)"
          >
            💾
          </button>

          {/* Кнопка Сбросить сохранение */}
          <button
            onClick={() => {
              if (window.confirm('Сбросить весь сохранённый прогресс и начать заново?')) {
                SaveManager.clearSave();
              }
            }}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-700 text-slate-400 hover:text-rose-300 text-base shadow-lg transition active:scale-95"
            title="Сбросить прогресс и начать заново"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Фрейм выделенной цели (Target Enemy Frame) */}
      {targetMonster && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl px-4 py-2.5 shadow-2xl flex flex-col min-w-[270px] max-w-[340px]">
            {/* Заголовок: Имя цели, значок ранга, уровень и кнопка сброса */}
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {targetMonster.isMvp && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-1.5 py-0.5 rounded border border-amber-500/40 shrink-0">
                    👑 MVP
                  </span>
                )}
                {targetMonster.isElite && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-1.5 py-0.5 rounded border border-purple-500/40 shrink-0">
                    ⚡ Вожак
                  </span>
                )}
                <span className="font-bold text-xs text-slate-100 truncate">
                  {targetMonster.name.replace(/👑\s*\[MVP\]\s*|\[Вожак\]\s*/g, '')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {(() => {
                  const mult = CombatSystem.getExpLevelPenalty(
                    player.level,
                    targetMonster.level,
                    targetMonster.rank
                  );
                  if (mult <= 0) {
                    return (
                      <span
                        className="text-[9px] bg-slate-800 text-slate-500 font-bold px-1.5 py-0.5 rounded border border-slate-700/80"
                        title="Уровень моба слишком низок: опыт не начисляется"
                      >
                        0% EXP
                      </span>
                    );
                  }
                  if (mult < 1.0) {
                    return (
                      <span
                        className="text-[9px] bg-amber-950/80 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-800/80"
                        title={`Штраф за разницу уровней: -${Math.round((1 - mult) * 100)}% EXP`}
                      >
                        {Math.round(mult * 100)}% EXP
                      </span>
                    );
                  }
                  return null;
                })()}
                <span className="text-[10px] bg-slate-800 text-slate-300 font-semibold px-1.5 py-0.5 rounded border border-slate-700">
                  Lv. {targetMonster.level}
                </span>
                <button
                  onClick={() => player.clearTargetMonster()}
                  className="w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition text-[11px]"
                  title="Снять цель"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ХП-бар цели */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold mb-0.5 text-slate-300">
                <span className="text-rose-400 font-bold">HP</span>
                <span>
                  {targetMonster.currentHp.toLocaleString()} / {targetMonster.maxHp.toLocaleString()} ({Math.round(targetHpPercent)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80">
                <div
                  className={`h-full transition-all duration-150 ${
                    targetHpPercent > 50
                      ? 'bg-gradient-to-r from-emerald-600 to-green-500'
                      : targetHpPercent > 25
                      ? 'bg-gradient-to-r from-amber-600 to-yellow-500'
                      : 'bg-gradient-to-r from-red-600 to-rose-500'
                  }`}
                  style={{ width: `${targetHpPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Правая панель: Радар Мини-карта и Трекер квестов */}
      <div className="absolute right-4 top-20 flex flex-col space-y-3 items-end pointer-events-none z-10">
        <MiniMapWidget world={world} player={player} />
        <QuestTrackerWidget world={world} player={player} onOpenQuestsWindow={onOpenQuests} />
      </div>

      {/* Круглая кнопка авто-охоты в правой нижней части экрана */}
      <div className="fixed bottom-4 right-4 md:bottom-5 md:right-5 pointer-events-auto z-30">
        <button
          onClick={toggleCampfire}
          className={`relative group w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 transition-all duration-300 active:scale-95 shadow-2xl ${
            campActive
              ? 'bg-gradient-to-tr from-amber-600 via-orange-500 to-rose-600 border-amber-300 text-white shadow-orange-500/50 ring-4 ring-orange-500/30'
              : 'bg-slate-900/95 hover:bg-slate-800 border-slate-700 hover:border-amber-400 text-slate-300 hover:text-amber-300 backdrop-blur-md'
          }`}
          title={
            campActive
              ? `⚔️ Авто-охота активна (${getCampStateLabel(campState)})\nНажмите, чтобы отключить авто-бой`
              : '⚔️ Включить авто-охоту\nПлавное передвижение по поляне от моба к мобу и сбор ресурсов'
          }
          aria-label="Авто-охота"
        >
          {campActive && (
            <div className="absolute inset-0 rounded-full bg-orange-500/30 animate-ping pointer-events-none" />
          )}

          <span
            className={`text-2xl md:text-3xl select-none transition-transform duration-200 group-hover:scale-110 ${
              campActive ? 'animate-pulse' : ''
            }`}
          >
            {campActive ? '⚔️' : '🗡️'}
          </span>

          {campActive && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950" />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
