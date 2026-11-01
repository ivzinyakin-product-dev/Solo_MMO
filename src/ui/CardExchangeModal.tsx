import { useState } from 'preact/hooks';
import { Player } from '../entities/Player';
import { CARDS_DATABASE } from '../data/cards.data';
import { ITEMS_DATABASE } from '../data/items.data';
import { InventoryItem, CardDef } from '../types/game.types';
import { SoundFX } from '../core/SoundFX';
import { EventBus } from '../core/EventBus';

interface CardExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
}

export function CardExchangeModal({ isOpen, onClose, player }: CardExchangeModalProps) {
  if (!isOpen) return null;

  // Выбранные 3 карты для обмена (храним их uid)
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [revealedCard, setRevealedCard] = useState<CardDef | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  // Список всех карт в инвентаре
  const inventoryCards = player.inventory.filter((item) => {
    const itemDef = ITEMS_DATABASE[item.itemId];
    return itemDef?.type === 'card' || item.itemId.endsWith('_card');
  });

  const handleSelectCard = (item: InventoryItem) => {
    if (selectedUids.includes(item.uid)) {
      // Убираем из выбора
      setSelectedUids((prev) => prev.filter((uid) => uid !== item.uid));
      return;
    }
    if (selectedUids.length >= 3) return;
    setSelectedUids((prev) => [...prev, item.uid]);
  };

  const handleRemoveSlot = (index: number) => {
    setSelectedUids((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSynthesize = () => {
    if (selectedUids.length !== 3) return;

    // Списание 3 карт
    for (const uid of selectedUids) {
      player.removeItem(uid, 1);
    }
    setSelectedUids([]);

    // Находим еще не открытые карты в Альбоме игрока
    const allCards = Object.values(CARDS_DATABASE);
    const uncollectedCards = allCards.filter(
      (c) => !player.unlockedCards.includes(c.id)
    );

    // Если есть неоткрытые карты — даем одну из них, иначе любую случайную
    const pool = uncollectedCards.length > 0 ? uncollectedCards : allCards;
    const rolled = pool[Math.floor(Math.random() * pool.length)];

    // Добавляем выбитую карту в инвентарь игрока
    player.addItem(rolled.id, 1);

    SoundFX.playLevelUp();
    EventBus.emit('COMBAT_LOG', {
      message: `📚 Архивариус Бестиария: Из Мистического Ларца извлечена карта [${rolled.name}]!`,
      color: '#c084fc',
    });

    setIsOpening(true);
    setRevealedCard(rolled);
  };

  const getSlotCard = (index: number): InventoryItem | null => {
    const uid = selectedUids[index];
    if (!uid) return null;
    return player.inventory.find((i) => i.uid === uid) || null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md pointer-events-auto">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/30 bg-purple-950/30">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">📚</span>
            <div>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-200 to-amber-200">
                Архивариус Бестиария
              </h2>
              <p className="text-xs text-purple-300/80">
                Синтез 3 лишних дубликатов в Мистический Карточный Ларец
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

        {/* Основной контент */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Алтарь синтеза: 3 слота */}
          <div className="p-5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-center space-y-4">
            <div className="text-sm font-semibold text-purple-200">
              Поместите 3 любые карты монстров на алтарь для трансмутации:
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              {[0, 1, 2].map((idx) => {
                const item = getSlotCard(idx);
                const cardDef = item ? CARDS_DATABASE[item.itemId] : null;
                return (
                  <div
                    key={idx}
                    onClick={() => item && handleRemoveSlot(idx)}
                    className={`relative h-28 rounded-xl border-2 flex flex-col items-center justify-center p-2 text-center transition-all ${
                      item
                        ? 'border-purple-400 bg-purple-900/40 cursor-pointer hover:border-rose-400 hover:bg-rose-950/30'
                        : 'border-dashed border-slate-700 bg-slate-900/60 text-slate-500'
                    }`}
                  >
                    {item && cardDef ? (
                      <>
                        <span className="text-2xl mb-1">{ITEMS_DATABASE[cardDef.id]?.icon || '🃏'}</span>
                        <span className="text-[11px] font-bold text-amber-200 line-clamp-2 leading-tight">
                          {cardDef.name}
                        </span>
                        <span className="text-[9px] text-purple-300 mt-1 uppercase font-mono">
                          {cardDef.targetSlot}
                        </span>
                        <span className="absolute top-1 right-1.5 text-xs text-rose-400 opacity-60 hover:opacity-100 font-bold">
                          ✕
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl mb-1 opacity-40">🃏</span>
                        <span className="text-[10px]">Слот {idx + 1}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Кнопка синтеза */}
            <button
              onClick={handleSynthesize}
              disabled={selectedUids.length !== 3}
              className={`w-full max-w-md mx-auto py-3 px-6 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-lg ${
                selectedUids.length === 3
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white cursor-pointer shadow-purple-950/60 active:scale-98 animate-pulse'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <span>🔮</span>
              <span>Синтезировать Ларец ({selectedUids.length} / 3)</span>
            </button>
          </div>

          {/* Список доступных карт в инвентаре */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider">
                Карты в вашем инвентаре ({inventoryCards.length}):
              </span>
              <span>Нажмите на карту, чтобы положить на алтарь</span>
            </div>

            {inventoryCards.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-500 text-sm">
                В вашем инвентаре пока нет карт монстров. Выбивайте карты в битвах с обычными мобами, Вожаками и MVP-Боссами!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {inventoryCards.map((item) => {
                  const cardDef = CARDS_DATABASE[item.itemId];
                  const isSelected = selectedUids.includes(item.uid);
                  const isAlbumUnlocked = player.unlockedCards.includes(item.itemId);

                  return (
                    <button
                      key={item.uid}
                      onClick={() => handleSelectCard(item)}
                      disabled={!isSelected && selectedUids.length >= 3}
                      className={`relative flex items-center space-x-2.5 p-2 rounded-xl border text-left transition ${
                        isSelected
                          ? 'border-purple-400 bg-purple-950/60 text-white shadow-md'
                          : selectedUids.length >= 3
                          ? 'border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                          : 'border-slate-700/80 bg-slate-900/80 hover:border-purple-500/60 text-slate-300'
                      }`}
                    >
                      <span className="text-2xl">{ITEMS_DATABASE[item.itemId]?.icon || '🃏'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate text-amber-200">
                          {cardDef?.name || item.itemId}
                        </div>
                        <div className="text-[10px] text-purple-300 font-mono">
                          {cardDef?.targetSlot || 'Любой'}
                        </div>
                      </div>
                      {isAlbumUnlocked && (
                        <span
                          className="text-[9px] px-1 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-semibold"
                          title="Карта уже есть в вашем Альбоме"
                        >
                          Вклеена
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно открытия и демонстрации полученной карты */}
      {revealedCard && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg">
          <div className="relative w-full max-w-sm bg-gradient-to-b from-purple-900 via-slate-900 to-slate-950 border-2 border-amber-400 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="text-xs uppercase tracking-widest text-amber-300 font-black">
              ✨ Мистический Карточный Ларец открыт! ✨
            </div>

            {/* Карточка */}
            <div className="mx-auto w-40 h-56 rounded-2xl bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 border-2 border-amber-300 shadow-xl flex flex-col items-center justify-between p-3 relative overflow-hidden">
              <div className="text-xs font-mono text-purple-300 font-bold uppercase">
                [{revealedCard.targetSlot}]
              </div>
              <div className="text-5xl my-2 filter drop-shadow-md">
                {ITEMS_DATABASE[revealedCard.id]?.icon || '🃏'}
              </div>
              <div className="text-center">
                <div className="text-sm font-black text-amber-200 leading-tight">
                  {revealedCard.name}
                </div>
              </div>
            </div>

            {/* Описание свойств */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-purple-500/30 text-xs text-purple-200 text-left space-y-1.5">
              <div>
                <span className="font-bold text-amber-300">Эффект слота: </span>
                {revealedCard.description}
              </div>
              {revealedCard.albumBonus && (
                <div className="text-emerald-300 font-semibold text-[11px]">
                  📖 Бонус Альбома: +{revealedCard.albumBonus.value}{' '}
                  {revealedCard.albumBonus.stat.toUpperCase()}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setRevealedCard(null);
                setIsOpening(false);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-lg transition active:scale-98"
            >
              Забрать Карту в Инвентарь
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
