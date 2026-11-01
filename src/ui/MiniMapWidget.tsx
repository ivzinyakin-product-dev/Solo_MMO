import { useState, useEffect, useRef } from 'preact/hooks';
import { GameWorld } from '../core/GameWorld';
import { Player } from '../entities/Player';
import { ZONES_DATABASE } from '../data/zones.data';
import { EventBus } from '../core/EventBus';

interface MiniMapWidgetProps {
  world: GameWorld;
  player: Player;
}

export function MiniMapWidget({ world, player }: MiniMapWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const zone = ZONES_DATABASE[player.currentZoneId] || ZONES_DATABASE.poring_meadow;
  const mapW = zone.width || 2400;
  const mapH = zone.height || 2400;

  useEffect(() => {
    let animId: number;
    let pulseTimer = 0;

    const renderRadar = () => {
      const canvas = canvasRef.current;
      if (!canvas || isMinimized) {
        animId = requestAnimationFrame(renderRadar);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = 140;
      canvas.width = size;
      canvas.height = size;
      pulseTimer += 0.05;

      // 1. Очистка и фон радара
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, size, size);

      // Легкая сетка радара
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.stroke();

      // Функция перевода мировых координат в радар (0..140)
      const toRadarX = (wx: number) => ((wx + mapW / 2) / mapW) * size;
      const toRadarY = (wy: number) => ((wy + mapH / 2) / mapH) * size;

      // 2. Отрисовка препятствий (река, дома, фонтан)
      if (zone.obstacles) {
        for (const obs of zone.obstacles) {
          const rx = toRadarX(obs.x);
          const ry = toRadarY(obs.y);
          const rw = (obs.width / mapW) * size;
          const rh = (obs.height / mapH) * size;

          if (obs.type === 'WATER_RIVER') {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
            ctx.fillRect(rx - rw / 2, ry - rh / 2, Math.max(2, rw), Math.max(2, rh));
          } else if (obs.type === 'VILLAGE_FOUNTAIN') {
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(rx, ry, Math.max(3, (obs.radius || 40) / mapW * size), 0, Math.PI * 2);
            ctx.fill();
          } else if (obs.type === 'VILLAGE_HOUSE') {
            ctx.fillStyle = 'rgba(180, 83, 9, 0.75)';
            ctx.fillRect(rx - rw / 2, ry - rh / 2, Math.max(4, rw), Math.max(4, rh));
          } else {
            ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
            ctx.fillRect(rx - rw / 2, ry - rh / 2, Math.max(2, rw), Math.max(2, rh));
          }
        }
      }

      // 3. Порталы (Фиолетовые круги)
      for (const p of world.portals) {
        const px = toRadarX(p.def.x);
        const py = toRadarY(p.def.y);
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 4. Точки Интереса POI (Золотая звезда для Статуи, Янтарный квадрат для Сундука)
      for (const poi of world.pointsOfInterest) {
        const px = toRadarX(poi.x);
        const py = toRadarY(poi.y);
        if (poi.def.type === 'GODDESS_STATUE') {
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = poi.isOpened ? '#78716c' : '#f59e0b';
          ctx.fillRect(px - 2.5, py - 2.5, 5, 5);
        }
      }

      // 4.1 Ресурсные жилы и кусты трав (Оранжевые и изумрудные ромбы)
      for (const node of world.resourceNodes) {
        const rx = toRadarX(node.x);
        const ry = toRadarY(node.y);
        if (node.isDepleted) {
          ctx.fillStyle = '#475569';
        } else if (node.def.type === 'MITHRIL_VEIN') {
          ctx.fillStyle = '#22d3ee';
        } else if (node.def.type === 'ORIDECON_VEIN') {
          ctx.fillStyle = '#c084fc';
        } else if (node.def.type === 'DRAGONITE_VEIN') {
          ctx.fillStyle = '#f87171';
        } else if (node.def.type === 'AMBER_HERB_BUSH') {
          ctx.fillStyle = '#f59e0b';
        } else if (node.def.type === 'WHITE_HERB_BUSH') {
          ctx.fillStyle = '#f8fafc';
        } else if (node.def.type === 'STAR_FLOWER_BUSH') {
          ctx.fillStyle = '#fde047';
        } else if (node.def.type === 'BLUE_HERB_BUSH') {
          ctx.fillStyle = '#60a5fa';
        } else if (node.def.type === 'RED_HERB_BUSH') {
          ctx.fillStyle = '#f43f5e';
        } else if (node.def.type.includes('VEIN')) {
          ctx.fillStyle = '#fb923c';
        } else {
          ctx.fillStyle = '#4ade80';
        }
        ctx.beginPath();
        ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. NPC (Бирюзовые точки)
      for (const npc of world.fieldNpcs) {
        const nx = toRadarX(npc.x);
        const ny = toRadarY(npc.y);
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. Монстры (Красные точки, MVP — крупный золотой череп/точка)
      for (const m of world.monsters) {
        if (m.isDead()) continue;
        const mx = toRadarX(m.x);
        const my = toRadarY(m.y);

        if (m.def.isMvp) {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(mx, my, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(mx, my, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 7. Игрок (Ярко-зеленая точка с пульсирующей радио-волной)
      const plX = toRadarX(player.x);
      const plY = toRadarY(player.y);

      // Пульсирующая волна
      const pulseRad = 4 + (Math.sin(pulseTimer) + 1) * 3;
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(plX, plY, pulseRad, 0, Math.PI * 2);
      ctx.stroke();

      // Точка игрока
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(plX, plY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      animId = requestAnimationFrame(renderRadar);
    };

    animId = requestAnimationFrame(renderRadar);
    return () => cancelAnimationFrame(animId);
  }, [world, player, player.currentZoneId, isMinimized, mapW, mapH]);

  const handleMiniMapClick = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const size = 140;

    // Перевод обратно в координаты мира
    const targetWx = (clickX / size) * mapW - mapW / 2;
    const targetWy = (clickY / size) * mapH - mapH / 2;

    player.moveTo(targetWx, targetWy);
  };

  return (
    <div className="pointer-events-auto flex flex-col bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2 shadow-2xl backdrop-blur-md select-none w-[156px]">
      {/* Заголовок радара */}
      <div className="flex items-center justify-between pb-1 px-1 border-b border-slate-800 text-[11px] font-bold text-slate-300">
        <span className="truncate max-w-[95px] text-amber-300" title={zone.name}>
          🧭 {zone.name}
        </span>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => EventBus.emit('OPEN_WORLD_MAP', true)}
            className="text-slate-400 hover:text-sky-300 transition text-[11px]"
            title="Открыть Карту Мира (M)"
          >
            🗺️
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-slate-400 hover:text-white px-0.5 font-mono transition"
            title={isMinimized ? 'Развернуть радар' : 'Свернуть радар'}
          >
            {isMinimized ? '□' : '—'}
          </button>
        </div>
      </div>

      {/* Канвас радара */}
      {!isMinimized && (
        <div className="relative mt-1.5 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            onClick={handleMiniMapClick}
            className="cursor-crosshair block"
            title="Кликните на радар для перемещения"
          />
          {/* Стороны света */}
          <span className="absolute top-0.5 text-[8px] font-black text-slate-500 pointer-events-none">N</span>
          <span className="absolute bottom-0.5 text-[8px] font-black text-slate-500 pointer-events-none">S</span>
          <span className="absolute left-1 text-[8px] font-black text-slate-500 pointer-events-none">W</span>
          <span className="absolute right-1 text-[8px] font-black text-slate-500 pointer-events-none">E</span>
        </div>
      )}
    </div>
  );
}
