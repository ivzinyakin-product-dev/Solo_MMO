import { useState, useEffect } from 'preact/hooks';
import { Player } from '../entities/Player';
import { EventBus } from '../core/EventBus';
import { MONSTERS_DATABASE } from '../data/monsters.data';
import { CARDS_DATABASE } from '../data/cards.data';
import { CardTargetSlot, MonsterRank } from '../types/game.types';

interface BestiaryWindowProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
}

const SLOT_LABELS: Record<string, string> = {
  all: 'Все слоты',
  weapon: 'Оружие ⚔️',
  offhand: 'Вторая рука 🛡️',
  head: 'Голова 👑',
  armor: 'Броня 🥋',
  garment: 'Накидка 🧣',
  footgear: 'Обувь 👢',
  accessory: 'Аксессуары 💍',
};

export function BestiaryWindow({ isOpen, onClose, player }: BestiaryWindowProps) {
  const [activeTab, setActiveTab] = useState<'cards' | 'monsters'>('cards');
  const [cardStatusFilter, setCardStatusFilter] = useState<'all' | 'pasted' | 'inventory' | 'missing'>('all');
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [cardRankFilter, setCardRankFilter] = useState<string>('all');
  const [monsterRankFilter, setMonsterRankFilter] = useState<string>('all');
  const [monsterStatusFilter, setMonsterStatusFilter] = useState<'all' | 'killed' | 'unbeaten'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kills, setKills] = useState<Record<string, number>>({ ...player.bestiaryKills });
  const [unlockedCards, setUnlockedCards] = useState<string[]>([...player.unlockedCards]);

  useEffect(() => {
    const unsub = EventBus.on('BESTIARY_UPDATED', (data) => {
      setKills({ ...data.kills });
      setUnlockedCards([...data.unlockedCards]);
    });

    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handlePasteCard = (cardId: string) => {
    player.pasteCardIntoAlbum(cardId);
  };

  const cardList = Object.values(CARDS_DATABASE);
  const monsterList = Object.values(MONSTERS_DATABASE);

  // Подсчет статистики для табов
  const pastedCount = cardList.filter((c) => unlockedCards.includes(c.id)).length;
  const inInventoryCount = cardList.filter((c) => player.inventory.some((i) => i.itemId === c.id)).length;
  const missingCount = cardList.length - pastedCount;

  const killedMonstersCount = monsterList.filter((m) => (kills[m.id] || 0) > 0).length;
  const unbeatenMonstersCount = monsterList.length - killedMonstersCount;

  // Фильтрация карт
  const filteredCards = cardList.filter((card) => {
    const isPasted = unlockedCards.includes(card.id);
    const hasInInventory = player.inventory.some((i) => i.itemId === card.id);
    const monDef = MONSTERS_DATABASE[card.monsterId];
    const rank = monDef?.rank || 'NORMAL';

    // 1. Статус вклейки
    if (cardStatusFilter === 'pasted' && !isPasted) return false;
    if (cardStatusFilter === 'inventory' && !hasInInventory) return false;
    if (cardStatusFilter === 'missing' && isPasted) return false;

    // 2. Слот экипировки
    if (slotFilter !== 'all') {
      if (slotFilter === 'accessory') {
        const isAcc = card.targetSlot === 'accessory' || card.targetSlot === 'accessory1' || card.targetSlot === 'accessory2';
        if (!isAcc) return false;
      } else if (card.targetSlot !== slotFilter) {
        return false;
      }
    }

    // 3. Ранг карты/моба
    if (cardRankFilter !== 'all') {
      if (cardRankFilter === 'MVP' && rank !== 'MVP') return false;
      if (cardRankFilter === 'ELITE' && rank !== 'ELITE') return false;
      if (cardRankFilter === 'NORMAL' && rank !== 'NORMAL') return false;
    }

    // 4. Поиск
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = card.name.toLowerCase().includes(q);
      const matchDesc = card.description.toLowerCase().includes(q);
      const matchMob = monDef?.name?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchMob) return false;
    }

    return true;
  });

  // Фильтрация монстров
  const filteredMonsters = monsterList.filter((m) => {
    const count = kills[m.id] || 0;
    const isMvp = m.rank === 'MVP' || m.isMvp;
    const isElite = m.rank === 'ELITE' || m.isElite;

    // 1. Ранг монстра
    if (monsterRankFilter !== 'all') {
      if (monsterRankFilter === 'MVP' && !isMvp) return false;
      if (monsterRankFilter === 'ELITE' && !isElite) return false;
      if (monsterRankFilter === 'NORMAL' && (isElite || isMvp)) return false;
    }

    // 2. Статус победы
    if (monsterStatusFilter === 'killed' && count === 0) return false;
    if (monsterStatusFilter === 'unbeaten' && count > 0) return false;

    // 3. Поиск по тексту
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      if (!m.name.toLowerCase().includes(q)) return false;
    }

    return true;
  });

  const resetCardFilters = () => {
    setCardStatusFilter('all');
    setSlotFilter('all');
    setCardRankFilter('all');
    setSearchQuery('');
  };

  const resetMonsterFilters = () => {
    setMonsterRankFilter('all');
    setMonsterStatusFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="fixed inset-0 pointer-events-auto flex items-center justify-center bg-black/70 z-50 p-4">
      <div className="w-full max-w-3xl bg-slate-900/95 border-2 border-amber-600/80 rounded-2xl shadow-2xl p-6 text-slate-100 backdrop-blur-md flex flex-col max-h-[88vh]">
        {/* Заголовок и вкладки */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-700/80">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">📖</span>
            <div>
              <h2 className="text-xl font-bold text-amber-400">Книга Приключений и Атлас</h2>
              <div className="text-xs text-slate-400">
                Вклеено карт: <span className="font-bold text-amber-300">{unlockedCards.length}</span> из{' '}
                <span className="font-bold text-slate-200">{cardList.length}</span> (вечные бонусы альбома)
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs font-bold">
              <button
                onClick={() => setActiveTab('cards')}
                className={`px-3 py-1.5 rounded transition ${
                  activeTab === 'cards'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎴 Альбом Карт ({unlockedCards.length})
              </button>
              <button
                onClick={() => setActiveTab('monsters')}
                className={`px-3 py-1.5 rounded transition ${
                  activeTab === 'monsters'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                👾 Бестиарий (40 монстров)
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition px-2.5 py-1 rounded hover:bg-slate-800 text-lg font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Панель фильтров для Карт */}
        {activeTab === 'cards' && (
          <div className="mt-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-2.5 shrink-0">
            {/* Строка 1: Табы статуса и поиск */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                {[
                  { id: 'all', label: 'Все карты', count: cardList.length },
                  { id: 'pasted', label: '★ Вклеены', count: pastedCount },
                  { id: 'inventory', label: '📦 В рюкзаке', count: inInventoryCount },
                  { id: 'missing', label: '❓ Не открыты', count: missingCount },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setCardStatusFilter(st.id as any)}
                    className={`px-2.5 py-1 rounded-lg border font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 text-xs ${
                      cardStatusFilter === st.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:text-white hover:border-slate-500'
                    }`}
                  >
                    <span>{st.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        cardStatusFilter === st.id
                          ? 'bg-slate-950/25 text-slate-950'
                          : 'bg-slate-800 text-amber-300'
                      }`}
                    >
                      {st.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Поле поиска */}
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                  placeholder="Поиск карты, моба или бонуса..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                    title="Очистить поиск"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Строка 2: Фильтры по слоту и рангу */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Слот:</span>
                {Object.keys(SLOT_LABELS).map((slotKey) => (
                  <button
                    key={slotKey}
                    type="button"
                    onClick={() => setSlotFilter(slotKey)}
                    className={`px-2 py-0.5 rounded-md border font-medium transition cursor-pointer text-[11px] ${
                      slotFilter === slotKey
                        ? 'bg-amber-500/25 text-amber-300 border-amber-500 font-bold shadow-sm'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {SLOT_LABELS[slotKey]}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Ранг:</span>
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'NORMAL', label: 'Обычные' },
                  { id: 'ELITE', label: '🐺 Вожаки' },
                  { id: 'MVP', label: '👑 MVP' },
                ].map((rk) => (
                  <button
                    key={rk.id}
                    type="button"
                    onClick={() => setCardRankFilter(rk.id)}
                    className={`px-2 py-0.5 rounded-md border font-medium transition cursor-pointer text-[11px] ${
                      cardRankFilter === rk.id
                        ? 'bg-amber-500/25 text-amber-300 border-amber-500 font-bold shadow-sm'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {rk.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Индикатор результатов и сброс */}
            {(cardStatusFilter !== 'all' || slotFilter !== 'all' || cardRankFilter !== 'all' || searchQuery.trim()) && (
              <div className="flex justify-between items-center pt-1 text-[11px] text-slate-400">
                <span>
                  Найдено карт: <strong className="text-amber-300">{filteredCards.length}</strong> из {cardList.length}
                </span>
                <button
                  type="button"
                  onClick={resetCardFilters}
                  className="text-amber-400 hover:text-amber-300 font-bold transition hover:underline cursor-pointer"
                >
                  Сбросить все фильтры ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* Панель фильтров для Монстров */}
        {activeTab === 'monsters' && (
          <div className="mt-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-2.5 shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { id: 'all', label: 'Все монстры', count: monsterList.length },
                  { id: 'NORMAL', label: 'Обычные', count: monsterList.filter((m) => !m.isElite && !m.isMvp && m.rank !== 'ELITE' && m.rank !== 'MVP').length },
                  { id: 'ELITE', label: 'Вожаки 🐺', count: monsterList.filter((m) => m.rank === 'ELITE' || m.isElite).length },
                  { id: 'MVP', label: 'Боссы MVP 👑', count: monsterList.filter((m) => m.rank === 'MVP' || m.isMvp).length },
                ].map((rk) => (
                  <button
                    key={rk.id}
                    type="button"
                    onClick={() => setMonsterRankFilter(rk.id)}
                    className={`px-3 py-1 rounded-lg border font-bold transition cursor-pointer flex items-center gap-1.5 text-xs ${
                      monsterRankFilter === rk.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:text-white hover:border-slate-500'
                    }`}
                  >
                    <span>{rk.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        monsterRankFilter === rk.id
                          ? 'bg-slate-950/25 text-slate-950'
                          : 'bg-slate-800 text-amber-300'
                      }`}
                    >
                      {rk.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Поиск моба */}
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                  placeholder="Поиск монстра..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                    title="Очистить поиск"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Статус побед */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Прогресс:</span>
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'killed', label: `Побежденные (${killedMonstersCount})` },
                  { id: 'unbeaten', label: `Не открытые (${unbeatenMonstersCount})` },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setMonsterStatusFilter(st.id as any)}
                    className={`px-2 py-0.5 rounded-md border font-medium transition cursor-pointer text-[11px] ${
                      monsterStatusFilter === st.id
                        ? 'bg-amber-500/25 text-amber-300 border-amber-500 font-bold shadow-sm'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {(monsterRankFilter !== 'all' || monsterStatusFilter !== 'all' || searchQuery.trim()) && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">
                    Найдено: <strong className="text-amber-300">{filteredMonsters.length}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={resetMonsterFilters}
                    className="text-amber-400 hover:text-amber-300 font-bold transition hover:underline cursor-pointer text-[11px]"
                  >
                    Сбросить фильтры ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Контент: Альбом карт */}
        {activeTab === 'cards' && (
          <div className="mt-3 flex-1 overflow-y-auto pr-1">
            {filteredCards.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center">
                <span className="text-3xl mb-2">🔍</span>
                <div className="font-bold text-slate-200">Карты не найдены</div>
                <div className="text-xs text-slate-500 mt-1">Попробуйте изменить выбранные параметры фильтрации</div>
                <button
                  type="button"
                  onClick={resetCardFilters}
                  className="mt-3 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Сбросить все фильтры
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCards.map((card) => {
                const isPasted = unlockedCards.includes(card.id);
                const hasInInventory = player.inventory.some((i) => i.itemId === card.id);
                const monDef = MONSTERS_DATABASE[card.monsterId];

                const secBonusText = card.albumBonus.secondaryStat
                  ? `, +${card.albumBonus.secondaryValue} ${card.albumBonus.secondaryStat.toUpperCase()}`
                  : '';

                return (
                  <div
                    key={card.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
                      isPasted
                        ? 'bg-amber-950/30 border-amber-500/80 shadow-md shadow-amber-500/10'
                        : hasInInventory
                        ? 'bg-slate-800/90 border-sky-500 shadow-md shadow-sky-500/20'
                        : 'bg-slate-900/50 border-slate-800 opacity-65'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">
                            {monDef?.rank === 'MVP' ? '👑' : monDef?.rank === 'ELITE' ? '🐺' : '🎴'}
                          </span>
                          <div>
                            <span className="font-bold text-sm text-slate-100">{card.name}</span>
                            <span className="text-[10px] text-amber-400 ml-2 font-semibold">
                              [{SLOT_LABELS[card.targetSlot] || card.targetSlot}]
                            </span>
                          </div>
                        </div>

                        {isPasted && (
                          <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/50">
                            ★ Вклеена
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 leading-tight mb-2 mt-1">
                        {card.description}
                      </p>

                      <div className="text-[11px] bg-slate-800/80 p-1.5 rounded border border-slate-700/60 text-emerald-300 font-semibold">
                        Вечный бонус альбома: +{card.albumBonus.value}{' '}
                        {card.albumBonus.stat === 'allStats'
                          ? 'КО ВСЕМ СТАТАМ'
                          : card.albumBonus.stat.toUpperCase()}
                        {secBonusText}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-700/50 flex justify-between items-center text-xs">
                      {isPasted ? (
                        <span className="text-[11px] text-amber-400 font-bold">
                          ✨ Бонус навсегда активен
                        </span>
                      ) : hasInInventory ? (
                        <button
                          onClick={() => handlePasteCard(card.id)}
                          className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-lg shadow transition active:scale-95"
                        >
                          Вклеить в альбом (есть в рюкзаке!)
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          Выбивается из: {monDef?.name || card.monsterId}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* Контент: Список монстров */}
        {activeTab === 'monsters' && (
          <div className="mt-3 flex-1 overflow-y-auto pr-1">
            {filteredMonsters.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center">
                <span className="text-3xl mb-2">🔍</span>
                <div className="font-bold text-slate-200">Монстры не найдены</div>
                <div className="text-xs text-slate-500 mt-1">Попробуйте изменить выбранные параметры фильтрации</div>
                <button
                  type="button"
                  onClick={resetMonsterFilters}
                  className="mt-3 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Сбросить фильтры
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredMonsters.map((m) => {
                  const count = kills[m.id] || 0;
                  const isMvp = m.rank === 'MVP' || m.isMvp;
                  const isElite = m.rank === 'ELITE' || m.isElite;

                  return (
                    <div
                      key={m.id}
                      className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold border border-slate-600 shadow-inner"
                          style={{ backgroundColor: `#${m.colorHex.toString(16).padStart(6, '0')}33` }}
                        >
                          {isMvp ? '👑' : isElite ? '🐺' : '👾'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-sm text-slate-100">{m.name}</span>
                            <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-sky-400 font-bold">
                              Ур. {m.level}
                            </span>
                            {isMvp && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-500/40">
                                MVP
                              </span>
                            )}
                            {isElite && (
                              <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-1.5 py-0.5 rounded border border-purple-500/40">
                                Вожак
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            HP: {m.hp.toLocaleString()} | ATK: {m.atk.toLocaleString()} | DEF: {m.def.toLocaleString()} | Тир {m.tier || 1}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Побед</div>
                        <div className="text-base font-black text-amber-400">{count}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
