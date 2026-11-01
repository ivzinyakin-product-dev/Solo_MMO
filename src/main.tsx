import { render } from 'preact';
import { GameWorld } from './core/GameWorld';
import { App } from './ui/App';
import './index.css';

function initGame(): void {
  const canvasContainer = document.getElementById('canvas-container');
  const uiLayer = document.getElementById('ui-layer');

  if (!canvasContainer || !uiLayer) {
    console.error('Не найдены корневые контейнеры canvas-container или ui-layer');
    return;
  }

  // 1. Инициализация игрового мира PixiJS v7.4
  const world = new GameWorld(canvasContainer);

  // 2. Монтирование Preact UI
  render(<App world={world} player={world.player} />, uiLayer);
}

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
