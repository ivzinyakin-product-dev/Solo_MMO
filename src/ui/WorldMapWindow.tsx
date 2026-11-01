import { useState } from 'preact/hooks';
import { Player } from '../entities/Player';
import type { GameWorld } from '../core/GameWorld';
import { ZONES_DATABASE } from '../data/zones.data';
import { MONSTERS_DATABASE } from '../data/monsters.data';
import { CARDS_DATABASE } from '../data/cards.data';
import { ITEMS_DATABASE } from '../data/items.data';
import { ZoneDef, CardTargetSlot } from '../types/game.types';
import { SoundFX } from '../core/SoundFX';
import { EventBus } from '../core/EventBus';

interface WorldMapWindowProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  world: GameWorld;
}

const ZONE_ORDER: string[] = [
  'zone_village',
  'zone_meadow',
  'zone_forest',
  'zone_sunken_ruins',
  'zone_ant_canyon',
  'zone_high_city',
  'zone_orc_fortress',
  'zone_cursed_abbey',
  'zone_clock_tower',
  'zone_dragon_volcano',
];

const ZONE_META: Record<
  string,
  {
    icon: string;
    category: 'hub' | 'low' | 'high';
    subtitle: string;
    description: string;
    resources: string[];
  }
> = {
  zone_village: {
    icon: '🏡',
    category: 'hub',
    subtitle: 'Мирный Город-Хаб (Пронтера-Кэмп)',
    description: 'Уютная стартовая деревня с фонтаном, лавкой торговца, кузницей, мастером классов, доской заказов, алхимиком и наёмниками.',
    resources: ['Торговая лавка', 'Кузница', 'Алхимия', 'Доска заказов', 'Гильдия наёмников'],
  },
  zone_meadow: {
    icon: '🌿',
    category: 'low',
    subtitle: 'Изумрудная Поляна (Tier 1)',
    description: 'Безмятежные цветущие луга, населенные Порингами, Фабрами и Лунатиками. Здесь властвует элитный Золотой Жук и великий Король Порингов.',
    resources: ['Медная руда (Т1)', 'Красная трава (Т1)'],
  },
  zone_forest: {
    icon: '🍄',
    category: 'low',
    subtitle: 'Шепчущий Грибной Лес (Tier 1)',
    description: 'Пышные кроны деревьев и грибные поляны. Остерегайтесь Спорогрибов, Ивовых Древней и Лесных Волков под предводительством Вожака Волков и Древнего Энта.',
    resources: ['Медная руда (Т1)', 'Красная трава (Т1)'],
  },
  zone_sunken_ruins: {
    icon: '🏛️',
    category: 'low',
    subtitle: 'Затопленный Храм и Топи (Tier 2)',
    description: 'Полузатопленные колонны древней цивилизации. Здесь обитают Жабы Рода, Водяные Гидры и Панцирные Крабы, охраняемые Стражем Шлюза и пиратским призраком Капитана Дрейка.',
    resources: ['Железная руда (Т2)', 'Синяя трава (Т2)'],
  },
  zone_ant_canyon: {
    icon: '🏜️',
    category: 'low',
    subtitle: 'Песчаный Каньон и Муравьиный Улей (Tier 2)',
    description: 'Знойные скалы и подземные катакомбы гигантских муравьев. Пустынные Скорпионы, Муравьи-Солдаты и Песчаные Големы служат Центуриону Муравьёв и Королеве Майе.',
    resources: ['Железная руда (Т2)', 'Синяя трава (Т2)'],
  },
  zone_high_city: {
    icon: '🏰',
    category: 'hub',
    subtitle: 'Горная Цитадель Альдебаран (Хаб 2)',
    description: 'Величественный высокогорный оплот мастеров. Здесь ждут Верховный Магистр Орденов, Великий Кузнец Торгрим, Королевские Контракты и Архивариус Карт.',
    resources: ['Магистр Орденов (2-1/2-2)', 'Великий Кузнец Торгрим (Т3–Т5)', 'Архивариус (Обмен карт)', 'Королевские Контракты'],
  },
  zone_orc_fortress: {
    icon: '⚔️',
    category: 'high',
    subtitle: 'Крепость Орков и Шахты (Tier 3)',
    description: 'Укрепленный лагерь свирепых орочьих берсерков. Штольни заполнены Орками-Воинами, Лучниками и Шаманами под началом Орочьего Воеводы и могущественного Повелителя Орков.',
    resources: ['Мифриловая руда (Т3)', 'Янтарная трава (Т3)'],
  },
  zone_cursed_abbey: {
    icon: '⛪',
    category: 'high',
    subtitle: 'Проклятый Монастырь Гластхейм (Tier 3)',
    description: 'Развалины готического аббатства, кишащие Скелетами-Рыцарями, Призраками Уиспер и Древними Мимиками. Монастырь находится во власти Палача Аббатства и Тёмного Лорда Иллюзий.',
    resources: ['Мифриловая руда (Т3)', 'Янтарная трава (Т3)'],
  },
  zone_clock_tower: {
    icon: '⚙️',
    category: 'high',
    subtitle: 'Заводная Башня Древних (Tier 4)',
    description: 'Бесконечные лабиринты шестеренок, маятников и часовых механизмов. Обитель Заводных Стражей, Хроно-Стрелок и Архимагов Батори под надзором Хранителя Времени и Рыцаря Бури.',
    resources: ['Оридеконовая руда (Т4)', 'Белая трава (Т4)'],
  },
  zone_dragon_volcano: {
    icon: '🌋',
    category: 'high',
    subtitle: 'Вулкан Ифрита и Храм Драконов (Tier 5)',
    description: 'Раскаленные реки магмы и цитадель первородного пламени. Здесь обитают Лавовые Импы, Огненные Виверны и Дракониды под предводительством Пламенного Драконида и великого Дракона Ифрита.',
    resources: ['Драконитовая руда (Т5)', 'Звёздный цветок (Т5)'],
  },
};

const ZONE_SPAWN_COORDS: Record<string, { x: number; y: number }> = {
  zone_village: { x: 0, y: 100 },
  zone_meadow: { x: -950, y: 0 },
  zone_forest: { x: -950, y: 0 },
  zone_sunken_ruins: { x: -950, y: 0 },
  zone_ant_canyon: { x: -950, y: 0 },
  zone_high_city: { x: 0, y: 100 },
  zone_orc_fortress: { x: -950, y: 0 },
  zone_cursed_abbey: { x: -950, y: 0 },
  zone_clock_tower: { x: -950, y: 0 },
  zone_dragon_volcano: { x: -950, y: 0 },
};

const SLOT_NAMES: Record<CardTargetSlot, string> = {
  weapon: 'Оружие',
  offhand: 'Щит/Гримуар',
  head: 'Голова',
  armor: 'Броня',
  garment: 'Накидка',
  footgear: 'Обувь',
  accessory: 'Аксессуар',
  accessory1: 'Аксессуар 1',
  accessory2: 'Аксессуар 2',
};

export function WorldMapWindow({ isOpen, onClose, player, world }: WorldMapWindowProps) {
  if (!isOpen) return null;

  const [selectedZoneId, setSelectedZoneId] = useState<string>(
    player.currentZoneId || 'zone_village'
  );
  const [filter, setFilter] = useState<'all' | 'hub' | 'low' | 'high'>('all');

  const selectedZone: ZoneDef =
    ZONES_DATABASE[selectedZoneId] || ZONES_DATABASE.zone_village;
  const meta = ZONE_META[selectedZoneId] || ZONE_META.zone_village;

  // Подсчет статистики
  const totalGoddesses = 8;
  const activatedGoddesses = Array.from(world.interactedPois).filter((poiId) =>
    poiId.includes('_statue')
  ).length;

  // Фильтрация зон
  const displayedZoneIds = ZONE_ORDER.filter((id) => {
    if (filter === 'all') return true;
    return ZONE_META[id]?.category === filter;
  });

  // Получаем список всех 5 монстров выбранной зоны
  const getZoneMonsters = (zone: ZoneDef) => {
    const list: string[] = [];
    if (zone.spawnPool) {
      for (const item of zone.spawnPool) {
        if (!list.includes(item.monsterId)) list.push(item.monsterId);
      }
    }
    if (zone.eliteMonsterId && !list.includes(zone.eliteMonsterId)) {
      list.push(zone.eliteMonsterId);
    }
    if (zone.mvpBossId && !list.includes(zone.mvpBossId)) {
      list.push(zone.mvpBossId);
    }
    return list.map((id) => MONSTERS_DATABASE[id]).filter(Boolean);
  };

  const zoneMonsters = getZoneMonsters(selectedZone);

  // Статус Статуи Богини и Сундука в зоне
  const goddessPoi = selectedZone.pois?.find((p) => p.type === 'GODDESS_STATUE');
  const chestPoi = selectedZone.pois?.find((p) => p.type === 'FIELD_CHEST');

  const isGoddessActive = goddessPoi ? world.interactedPois.has(goddessPoi.id) : false;
  const isChestOpened = chestPoi ? world.interactedPois.has(chestPoi.id) : false;

  const isCurrentZone = player.currentZoneId === selectedZone.id;
  const isUnderLeveled =
    !selectedZone.isSafeZone && player.level < (selectedZone.minLevel || 1);

  const handleTeleport = () => {
    if (isCurrentZone) return;

    const coords = ZONE_SPAWN_COORDS[selectedZone.id] || { x: 0, y: 100 };
    world.changeZone(selectedZone.id, coords.x, coords.y);

    SoundFX.playLevelUp();
    EventBus.emit('COMBAT_LOG', {
      message: `🌀 Пространственный переход: Вы прибыли в [${selectedZone.name}]!`,
      color: '#38bdf8',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md pointer-events-auto">
      <div className="relative w-full max-w-5xl h-[92vh] bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-sky-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Верхняя панель заголовка */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-sky-500/20 bg-sky-950/20">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🗺️</span>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-cyan-200 to-amber-200">
                Атлас Мира Мидгард
              </h2>
              <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                <span>
                  Регионы: <strong className="text-sky-300">10 / 10</strong>
                </span>
                <span>•</span>
                <span>
                  Святилища Богинь:{' '}
                  <strong className="text-amber-300">
                    {activatedGoddesses} / {totalGoddesses}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Карт в Альбоме:{' '}
                  <strong className="text-emerald-300">
                    {player.unlockedCards.length} / 40
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="hidden sm:inline-block text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              Горячая клавиша: <strong className="text-white">M</strong>
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Закрыть (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Фильтры по категориям */}
        <div className="flex items-center space-x-2 px-6 py-2.5 border-b border-slate-800 bg-slate-900/60 text-xs overflow-x-auto">
          <span className="text-slate-400 font-bold uppercase tracking-wider mr-2 text-[10px]">
            Категория:
          </span>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              filter === 'all'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Все Регионы (10)
          </button>
          <button
            onClick={() => setFilter('hub')}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              filter === 'hub'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🏰 Города-Хабы (2)
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              filter === 'low'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🌿 Начальные Земли Т1–Т2 (4)
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              filter === 'high'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🔥 Опасные Бездны Т3–Т5 (4)
          </button>
        </div>

        {/* Основной двухколоночный контент */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Левая колонка: Сетка карточек локаций */}
          <div className="md:col-span-5 p-4 border-r border-slate-800 overflow-y-auto space-y-2.5 bg-slate-950/40">
            {displayedZoneIds.map((zId) => {
              const zoneDef = ZONES_DATABASE[zId];
              const zMeta = ZONE_META[zId];
              if (!zoneDef || !zMeta) return null;

              const isSelected = selectedZoneId === zId;
              const isHere = player.currentZoneId === zId;
              const isDanger =
                !zoneDef.isSafeZone && player.level < (zoneDef.minLevel || 1);

              // Проверка святилища
              const gPoi = zoneDef.pois?.find((p) => p.type === 'GODDESS_STATUE');
              const gActive = gPoi ? world.interactedPois.has(gPoi.id) : false;

              return (
                <div
                  key={zId}
                  onClick={() => setSelectedZoneId(zId)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative flex flex-col space-y-1.5 ${
                    isSelected
                      ? 'border-sky-400 bg-sky-950/40 shadow-lg shadow-sky-950/60 ring-1 ring-sky-400/50'
                      : 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-800/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-2xl">{zMeta.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-slate-100 flex items-center space-x-1.5">
                          <span>{zoneDef.name}</span>
                          {isHere && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 border border-sky-400 text-sky-300 font-extrabold animate-pulse">
                              ВЫ ЗДЕСЬ
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {zMeta.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1">
                      {zoneDef.isSafeZone ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-bold">
                          Мирная
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                            isDanger
                              ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                              : 'bg-slate-800 text-amber-300 border-slate-700'
                          }`}
                        >
                          Ур. {zoneDef.minLevel}–{zoneDef.maxLevel || zoneDef.minLevel + 7}
                        </span>
                      )}
                      {zoneDef.tier && (
                        <span className="text-[9px] text-slate-400 font-bold">
                          Тир {zoneDef.tier}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Дополнительные маркеры статуи и сундука */}
                  {!zoneDef.isSafeZone && (
                    <div className="flex items-center space-x-3 text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span
                        className={
                          gActive
                            ? 'text-amber-300 font-semibold flex items-center space-x-1'
                            : 'text-slate-500 flex items-center space-x-1'
                        }
                      >
                        <span>{gActive ? '✨' : '🗿'}</span>
                        <span>{gActive ? 'Богиня освящена' : 'Богиня не найдена'}</span>
                      </span>
                      <span>•</span>
                      <span className="text-slate-400">
                        {zoneDef.mvpBossId
                          ? `👑 ${MONSTERS_DATABASE[zoneDef.mvpBossId]?.name || 'MVP'}`
                          : 'Нет MVP'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Правая колонка: Детализация выбранной локации */}
          <div className="md:col-span-7 p-6 overflow-y-auto space-y-6 flex flex-col justify-between bg-gradient-to-b from-slate-900/40 to-slate-950">
            <div className="space-y-6">
              {/* Шапка локации */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div className="flex items-center space-x-3.5">
                  <span className="text-4xl p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 shadow-lg">
                    {meta.icon}
                  </span>
                  <div>
                    <h3 className="text-xl font-black text-white flex items-center space-x-2 flex-wrap gap-2">
                      <span>{selectedZone.name}</span>
                      {selectedZone.isSafeZone ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-bold">
                          Мирный Хаб
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                            isUnderLeveled
                              ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                              : 'bg-slate-800 text-amber-300 border-slate-700'
                          }`}
                        >
                          Ур. {selectedZone.minLevel}–{selectedZone.maxLevel || selectedZone.minLevel + 7}
                        </span>
                      )}
                      {selectedZone.tier && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-500/30 font-bold">
                          Тир {selectedZone.tier}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-sky-300/80 font-medium">{meta.subtitle}</p>
                  </div>
                </div>

                {/* Кнопка Телепорта */}
                <div className="sm:self-start">
                  <button
                    onClick={handleTeleport}
                    disabled={isCurrentZone}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-lg ${
                      isCurrentZone
                        ? 'bg-slate-800/80 text-sky-400 border border-sky-500/30 cursor-default'
                        : isUnderLeveled
                        ? 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white cursor-pointer active:scale-95 shadow-rose-950/50'
                        : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white cursor-pointer active:scale-95 shadow-sky-950/50'
                    }`}
                  >
                    <span>{isCurrentZone ? '📍' : '🌀'}</span>
                    <span>
                      {isCurrentZone
                        ? 'Вы здесь'
                        : isUnderLeveled
                        ? `Перейти (Опасно! Ур. ${selectedZone.minLevel}+)`
                        : 'Телепортироваться'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Описание региона */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {meta.description}
              </div>

              {/* Точки интереса: Статуя Богини, Сундук и Ресурсы */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Святилище Богини */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start space-x-3">
                  <span className="text-2xl mt-0.5">
                    {isGoddessActive ? '✨' : '🗿'}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      {goddessPoi?.name || 'Святилище Богини'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {isGoddessActive ? (
                        <span className="text-emerald-400 font-semibold">
                          ✓ Освящена (+1 SP, +3 Стата получено)
                        </span>
                      ) : goddessPoi ? (
                        <span className="text-amber-300">
                          Не найдена (+1 SP, +3 Стата ждут вас)
                        </span>
                      ) : (
                        <span className="text-slate-500">Отсутствует в городе</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Древний Сундук */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start space-x-3">
                  <span className="text-2xl mt-0.5">
                    {isChestOpened ? '📦' : '🎁'}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      {chestPoi?.name || 'Сокровища локации'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {isChestOpened ? (
                        <span className="text-emerald-400 font-semibold">
                          ✓ Сундук открыт
                        </span>
                      ) : chestPoi ? (
                        <span className="text-amber-300">Спрятан на локации</span>
                      ) : (
                        <span className="text-slate-500">Отсутствует в городе</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Природные ресурсы */}
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center space-x-2 text-xs">
                <span className="text-amber-300 font-bold">⛏️ Ресурсы:</span>
                <div className="flex flex-wrap gap-1.5">
                  {meta.resources.map((res, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] border border-slate-700/80 font-medium"
                    >
                      {res}
                    </span>
                  ))}
                </div>
              </div>

              {/* NPC и городские службы / Полевые исследователи */}
              {selectedZone.npcs && selectedZone.npcs.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {selectedZone.isSafeZone ? '🏛️ Городские службы и мастера:' : '⛺ Полевой лагерь исследователя:'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedZone.npcs.map((npc) => (
                      <div
                        key={npc.id}
                        className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center space-x-2.5"
                      >
                        <span className="text-2xl shrink-0">{npc.icon || '👤'}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-200 truncate">{npc.name}</div>
                          <div className="text-[10px] text-slate-400 truncate" title={npc.dialogGreeting}>
                            {npc.dialogGreeting}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Бестиарий зоны: 5 монстров и их карты */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-slate-300">
                    Обитатели зоны ({zoneMonsters.length}):
                  </span>
                  <span>Карты выпадают со всех мобов</span>
                </div>

                {zoneMonsters.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs">
                    В мирных хабах монстры не обитают. Здесь можно отдохнуть, починиться и поторговать.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {zoneMonsters.map((mon) => {
                      const kills = player.bestiaryKills[mon.id] || 0;
                      const cardDef = mon.cardId ? CARDS_DATABASE[mon.cardId] : null;
                      const isCardUnlocked = cardDef
                        ? player.unlockedCards.includes(cardDef.id)
                        : false;
                      const isMvp = mon.rank === 'MVP' || mon.isMvp;
                      const isElite = mon.rank === 'ELITE' || mon.isElite;

                      return (
                        <div
                          key={mon.id}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                            isMvp
                              ? 'border-amber-500/50 bg-amber-950/20'
                              : isElite
                              ? 'border-purple-500/40 bg-purple-950/20'
                              : 'border-slate-800 bg-slate-900/60'
                          }`}
                        >
                          {/* Инфо о монстре */}
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">
                              {isMvp ? '👑' : isElite ? '🐺' : '👾'}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-100 flex items-center space-x-2">
                                <span>{mon.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Ур. {mon.level}
                                </span>
                                {isMvp && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400 text-amber-300 font-black">
                                    MVP БОСС
                                  </span>
                                )}
                                {isElite && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 border border-purple-400 text-purple-300 font-black">
                                    ВОЖАК
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Побеждено: <strong className="text-slate-200">{kills}</strong>{' '}
                                раз
                              </div>
                            </div>
                          </div>

                          {/* Карта монстра */}
                          {cardDef && (
                            <div
                              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs shrink-0 max-w-full sm:max-w-[340px]"
                              title={cardDef.description}
                            >
                              <span className="text-lg shrink-0">
                                {ITEMS_DATABASE[cardDef.id]?.icon || '🃏'}
                              </span>
                              <div className="text-left min-w-0 flex-1">
                                <div className="text-[11px] font-bold text-amber-200 flex items-center space-x-1.5 truncate">
                                  <span className="truncate">{cardDef.name}</span>
                                  <span className="text-[9px] text-purple-300 font-mono shrink-0">
                                    [{SLOT_NAMES[cardDef.targetSlot] || cardDef.targetSlot}]
                                  </span>
                                </div>
                                <div className="text-[9px] text-slate-400 truncate">
                                  {cardDef.description}
                                </div>
                              </div>
                              <div className="ml-2 shrink-0">
                                {isCardUnlocked ? (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/30 font-bold whitespace-nowrap">
                                    📖 Вклеена
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800 whitespace-nowrap">
                                    Не открыта
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
