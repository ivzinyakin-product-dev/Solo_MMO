import { MapObstacle, ZoneDef } from '../types/game.types';

export interface NavWaypoint {
  x: number;
  y: number;
}

export interface NavGraphNode {
  id: number;
  x: number;
  y: number;
  neighbors: Array<{ nodeId: number; cost: number }>;
}

/**
 * Высокопроизводительная система поиска пути (Visibility Graph + A* + String Pulling)
 * Позволяет персонажу и монстрам плавно и оптимально огибать любые препятствия (скалы, реки, руины, стены, деревья).
 */
export class PathfindingSystem {
  private currentZone: ZoneDef | null = null;
  private nodes: NavGraphNode[] = [];
  private mapMinX: number = -1150;
  private mapMaxX: number = 1150;
  private mapMinY: number = -1150;
  private mapMaxY: number = 1150;

  /**
   * Инициализация графа навигации при смене или загрузке зоны
   */
  public setZone(zone: ZoneDef | null): void {
    this.currentZone = zone;
    this.rebuildNavGraph();
  }

  /**
   * Перестроение навигационного графа для текущей зоны
   */
  public rebuildNavGraph(): void {
    this.nodes = [];
    if (!this.currentZone) return;

    const w = this.currentZone.width || 2400;
    const h = this.currentZone.height || 2400;
    const halfW = w / 2;
    const halfH = h / 2;
    const borderMargin = 64;

    this.mapMinX = -halfW + borderMargin;
    this.mapMaxX = halfW - borderMargin;
    this.mapMinY = -halfH + borderMargin;
    this.mapMaxY = halfH - borderMargin;

    const obstacles = this.currentZone.obstacles || [];
    if (obstacles.length === 0) return;

    // 1. Генерация опорных точек (Waypoints) вокруг каждого препятствия
    const rawWaypoints: NavWaypoint[] = [];
    const clearance = 26; // Запас расстояния для безопасного прохода персонажа

    for (const obs of obstacles) {
      if (obs.colliderType === 'CIRCLE') {
        const baseRadius = obs.radius || Math.max(obs.width, obs.height) / 2;
        const r = baseRadius + clearance;
        // 8 точек по окружности препятствия
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          rawWaypoints.push({
            x: obs.x + Math.cos(angle) * r,
            y: obs.y + Math.sin(angle) * r,
          });
        }
      } else {
        // Прямоугольные препятствия (стены, реки, дома)
        const halfOw = obs.width / 2;
        const halfOh = obs.height / 2;

        const left = obs.x - halfOw - clearance;
        const right = obs.x + halfOw + clearance;
        const top = obs.y - halfOh - clearance;
        const bottom = obs.y + halfOh + clearance;

        // 4 угла прямоугольника
        rawWaypoints.push({ x: left, y: top });
        rawWaypoints.push({ x: right, y: top });
        rawWaypoints.push({ x: right, y: bottom });
        rawWaypoints.push({ x: left, y: bottom });

        // Если препятствие вытянутое по ширине или высоте, добавляем промежуточные точки
        if (halfOw > 100) {
          rawWaypoints.push({ x: obs.x, y: top });
          rawWaypoints.push({ x: obs.x, y: bottom });
        }
        if (halfOh > 100) {
          rawWaypoints.push({ x: left, y: obs.y });
          rawWaypoints.push({ x: right, y: obs.y });
        }
      }
    }

    // 2. Фильтрация точек: отбрасываем точки внутри других препятствий и за пределами карты
    const validWaypoints: NavWaypoint[] = [];
    for (const pt of rawWaypoints) {
      if (pt.x < this.mapMinX || pt.x > this.mapMaxX || pt.y < this.mapMinY || pt.y > this.mapMaxY) {
        continue;
      }
      if (this.isPointInsideAnyObstacle(pt.x, pt.y, 14, obstacles)) {
        continue;
      }

      // Избегаем дублирования очень близких точек (< 18px)
      const isDuplicate = validWaypoints.some(
        (existing) => Math.hypot(existing.x - pt.x, existing.y - pt.y) < 18
      );
      if (!isDuplicate) {
        validWaypoints.push(pt);
      }
    }

    // 3. Создаем узлы графа
    this.nodes = validWaypoints.map((pt, idx) => ({
      id: idx,
      x: pt.x,
      y: pt.y,
      neighbors: [],
    }));

    // 4. Построение рёбер видимости (Visibility Graph)
    // Соединяем узлы, если между ними нет препятствий
    const maxConnectionDist = 1400;
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const nodeA = this.nodes[i];
        const nodeB = this.nodes[j];
        const dist = Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y);

        if (dist > maxConnectionDist) continue;

        if (this.hasLineOfSight(nodeA.x, nodeA.y, nodeB.x, nodeB.y, 14)) {
          nodeA.neighbors.push({ nodeId: nodeB.id, cost: dist });
          nodeB.neighbors.push({ nodeId: nodeA.id, cost: dist });
        }
      }
    }
  }

  /**
   * Проверка прямой видимости (Raycast) между двумя точками
   */
  public hasLineOfSight(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    checkRadius: number = 14
  ): boolean {
    if (!this.currentZone || !this.currentZone.obstacles || this.currentZone.obstacles.length === 0) {
      return true;
    }

    const dist = Math.hypot(x2 - x1, y2 - y1);
    if (dist < 2) return true;

    const stepSize = 14;
    const steps = Math.max(2, Math.ceil(dist / stepSize));

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const testX = x1 + (x2 - x1) * t;
      const testY = y1 + (y2 - y1) * t;

      if (this.isPointInsideAnyObstacle(testX, testY, checkRadius, this.currentZone.obstacles)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Проверка столкновения точки с заданным радиусом с любым препятствием
   */
  public isPointInsideAnyObstacle(
    px: number,
    py: number,
    radius: number,
    obstacles: MapObstacle[]
  ): boolean {
    for (const obs of obstacles) {
      if (obs.colliderType === 'CIRCLE') {
        const obsRadius = obs.radius || Math.max(obs.width, obs.height) / 2;
        const distSq = (px - obs.x) ** 2 + (py - obs.y) ** 2;
        if (distSq < (radius + obsRadius) ** 2) {
          return true;
        }
      } else {
        const halfOw = obs.width / 2;
        const halfOh = obs.height / 2;
        const closestX = Math.max(obs.x - halfOw, Math.min(px, obs.x + halfOw));
        const closestY = Math.max(obs.y - halfOh, Math.min(py, obs.y + halfOh));
        const distSq = (px - closestX) ** 2 + (py - closestY) ** 2;
        if (distSq < radius ** 2) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Нахождение пути от start к end через A* по навигационному графу с последующим сглаживанием
   */
  public findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    clearance: number = 14
  ): NavWaypoint[] {
    // 1. Если прямой путь полностью чист — возвращаем целевую точку без накладных расходов
    if (this.hasLineOfSight(startX, startY, endX, endY, clearance)) {
      return [{ x: endX, y: endY }];
    }

    // Если нет узлов навигации — возвращаем прямую цель
    if (this.nodes.length === 0) {
      return [{ x: endX, y: endY }];
    }

    // 2. Находим видимые узлы от стартовой точки
    const startConnections: Array<{ nodeId: number; cost: number }> = [];
    let closestStartNodeId = -1;
    let closestStartDist = Infinity;

    for (const node of this.nodes) {
      const d = Math.hypot(node.x - startX, node.y - startY);
      if (d < closestStartDist) {
        closestStartDist = d;
        closestStartNodeId = node.id;
      }
      if (d <= 1200 && this.hasLineOfSight(startX, startY, node.x, node.y, clearance)) {
        startConnections.push({ nodeId: node.id, cost: d });
      }
    }
    if (startConnections.length === 0 && closestStartNodeId !== -1) {
      startConnections.push({ nodeId: closestStartNodeId, cost: closestStartDist });
    }

    // 3. Находим видимые узлы от целевой точки
    const endConnections: Array<{ nodeId: number; cost: number }> = [];
    let closestEndNodeId = -1;
    let closestEndDist = Infinity;

    for (const node of this.nodes) {
      const d = Math.hypot(node.x - endX, node.y - endY);
      if (d < closestEndDist) {
        closestEndDist = d;
        closestEndNodeId = node.id;
      }
      if (d <= 1200 && this.hasLineOfSight(endX, endY, node.x, node.y, clearance)) {
        endConnections.push({ nodeId: node.id, cost: d });
      }
    }
    if (endConnections.length === 0 && closestEndNodeId !== -1) {
      endConnections.push({ nodeId: closestEndNodeId, cost: closestEndDist });
    }

    // 4. Поиск пути алгоритмом A*
    const gScore = new Map<number, number>();
    const fScore = new Map<number, number>();
    const cameFrom = new Map<number, number>();
    const openSet: number[] = [];
    const closedSet = new Set<number>();

    for (const conn of startConnections) {
      const node = this.nodes[conn.nodeId];
      const h = Math.hypot(node.x - endX, node.y - endY);
      gScore.set(conn.nodeId, conn.cost);
      fScore.set(conn.nodeId, conn.cost + h);
      openSet.push(conn.nodeId);
    }

    const endNodeIds = new Set(endConnections.map((c) => c.nodeId));
    let targetReachedNodeId = -1;

    while (openSet.length > 0) {
      // Извлекаем узел с минимальным fScore
      let bestIdx = 0;
      let bestF = fScore.get(openSet[0]) ?? Infinity;
      for (let i = 1; i < openSet.length; i++) {
        const f = fScore.get(openSet[i]) ?? Infinity;
        if (f < bestF) {
          bestF = f;
          bestIdx = i;
        }
      }

      const currentId = openSet.splice(bestIdx, 1)[0];
      if (endNodeIds.has(currentId)) {
        targetReachedNodeId = currentId;
        break;
      }

      closedSet.add(currentId);
      const currentNode = this.nodes[currentId];
      const currentG = gScore.get(currentId) ?? Infinity;

      for (const neighbor of currentNode.neighbors) {
        if (closedSet.has(neighbor.nodeId)) continue;

        const tentativeG = currentG + neighbor.cost;
        const knownG = gScore.get(neighbor.nodeId) ?? Infinity;

        if (tentativeG < knownG) {
          cameFrom.set(neighbor.nodeId, currentId);
          gScore.set(neighbor.nodeId, tentativeG);
          const neighborNode = this.nodes[neighbor.nodeId];
          const h = Math.hypot(neighborNode.x - endX, neighborNode.y - endY);
          fScore.set(neighbor.nodeId, tentativeG + h);

          if (!openSet.includes(neighbor.nodeId)) {
            openSet.push(neighbor.nodeId);
          }
        }
      }
    }

    // Если путь не найден — возвращаем прямую цель
    if (targetReachedNodeId === -1) {
      return [{ x: endX, y: endY }];
    }

    // 5. Восстановление исходного пути по цепочке узлов
    const pathNodes: NavGraphNode[] = [];
    let curr: number | undefined = targetReachedNodeId;
    while (curr !== undefined) {
      pathNodes.unshift(this.nodes[curr]);
      curr = cameFrom.get(curr);
    }

    const rawWaypoints: NavWaypoint[] = [
      { x: startX, y: startY },
      ...pathNodes.map((n) => ({ x: n.x, y: n.y })),
      { x: endX, y: endY },
    ];

    // 6. Сглаживание пути (String Pulling / Raycast Shortcutting)
    // Устраняет лишние углы, если между удалёнными точками уже есть прямая видимость
    const smoothed: NavWaypoint[] = [rawWaypoints[0]];
    let currentIdx = 0;

    while (currentIdx < rawWaypoints.length - 1) {
      let nextIdx = rawWaypoints.length - 1;
      while (nextIdx > currentIdx + 1) {
        if (
          this.hasLineOfSight(
            rawWaypoints[currentIdx].x,
            rawWaypoints[currentIdx].y,
            rawWaypoints[nextIdx].x,
            rawWaypoints[nextIdx].y,
            clearance
          )
        ) {
          break;
        }
        nextIdx--;
      }
      smoothed.push(rawWaypoints[nextIdx]);
      currentIdx = nextIdx;
    }

    // Удаляем начальную точку (текущую позицию игрока) и возвращаем путевые точки обхода
    return smoothed.slice(1);
  }
}
