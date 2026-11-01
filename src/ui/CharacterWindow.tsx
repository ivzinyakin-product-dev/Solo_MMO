import { StatsWindow } from './StatsWindow';
import { InventoryWindow } from './InventoryWindow';
import { Player } from '../entities/Player';

export { StatsWindow } from './StatsWindow';
export { InventoryWindow } from './InventoryWindow';

export interface CharacterWindowProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  initialTab?: 'inventory' | 'stats';
}

export function CharacterWindow({
  isOpen,
  onClose,
  player,
  initialTab = 'inventory',
}: CharacterWindowProps) {
  if (initialTab === 'stats') {
    return <StatsWindow isOpen={isOpen} onClose={onClose} player={player} />;
  }

  return <InventoryWindow isOpen={isOpen} onClose={onClose} player={player} />;
}
