import * as PIXI from 'pixi.js';
import { MapObstacle, ZoneDef } from '../types/game.types';
import { PathfindingSystem, NavWaypoint } from './PathfindingSystem';

export class WorldMapSystem {
  public currentZone: ZoneDef | null = null;
  public groundGraphics: PIXI.Graphics;
  public borderGraphics: PIXI.Graphics;
  public pathfinding: PathfindingSystem = new PathfindingSystem();

  constructor() {
    this.groundGraphics = new PIXI.Graphics();
    this.borderGraphics = new PIXI.Graphics();
  }

  public setZone(zone: ZoneDef, groundContainer: PIXI.Container): void {
    this.currentZone = zone;
    this.pathfinding.setZone(zone);

    if (!groundContainer.children.includes(this.groundGraphics)) {
      groundContainer.addChildAt(this.groundGraphics, 0);
    }
    if (!groundContainer.children.includes(this.borderGraphics)) {
      groundContainer.addChild(this.borderGraphics);
    }

    this.renderZoneGround();
  }

  /**
   * Разрешение перемещения сущности с гладким скольжением вдоль препятствий и границ (Sliding Collision)
   */
  public resolveMovement(
    currX: number,
    currY: number,
    targetX: number,
    targetY: number,
    radius: number = 16
  ): { x: number; y: number } {
    if (!this.currentZone) {
      return { x: targetX, y: targetY };
    }

    const halfW = (this.currentZone.width || 2400) / 2;
    const halfH = (this.currentZone.height || 2400) / 2;
    const margin = 48 + radius;

    // 1. Ограничение границами карты
    const minX = -halfW + margin;
    const maxX = halfW - margin;
    const minY = -halfH + margin;
    const maxY = halfH - margin;

    const obstacles = this.currentZone.obstacles || [];

    // Автоматическое выталкивание (Unstuck), если сущность оказалась внутри препятствия
    for (const obs of obstacles) {
      if (obs.colliderType === 'CIRCLE') {
        const obsRadius = obs.radius || Math.max(obs.width, obs.height) / 2;
        const dist = Math.hypot(currX - obs.x, currY - obs.y);
        const minDist = radius + obsRadius + 2;
        if (dist < minDist) {
          if (dist < 0.1) {
            // Если точно в центре (на 0, 0 в фонтане), сдвигаем вниз на дорожку
            currY = obs.y + minDist + 24;
          } else {
            const factor = minDist / dist;
            currX = obs.x + (currX - obs.x) * factor;
            currY = obs.y + (currY - obs.y) * factor;
          }
        }
      } else {
        const halfOw = obs.width / 2;
        const halfOh = obs.height / 2;
        const closestX = Math.max(obs.x - halfOw, Math.min(currX, obs.x + halfOw));
        const closestY = Math.max(obs.y - halfOh, Math.min(currY, obs.y + halfOh));
        const dist = Math.hypot(currX - closestX, currY - closestY);
        if (dist < radius) {
          if (Math.abs(currX - obs.x) / halfOw > Math.abs(currY - obs.y) / halfOh) {
            currX = currX >= obs.x ? obs.x + halfOw + radius + 2 : obs.x - halfOw - radius - 2;
          } else {
            currY = currY >= obs.y ? obs.y + halfOh + radius + 2 : obs.y - halfOh - radius - 2;
          }
        }
      }
    }

    const clampedTargetX = Math.max(minX, Math.min(maxX, targetX));
    const clampedTargetY = Math.max(minY, Math.min(maxY, targetY));

    const dx = clampedTargetX - currX;
    const dy = clampedTargetY - currY;

    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
      return { x: currX, y: currY };
    }

    // 2. Проверяем движение по оси X
    let testX = currX + dx;
    let testY = currY;
    if (this.checkCollisionWithObstacles(testX, testY, radius, obstacles)) {
      // Столкновение по оси X — сбрасываем смещение по X (скольжение вдоль стены)
      testX = currX;
    }

    // 3. Проверяем движение по оси Y
    testY = currY + dy;
    if (this.checkCollisionWithObstacles(testX, testY, radius, obstacles)) {
      // Столкновение по оси Y — сбрасываем смещение по Y (скольжение вдоль стены)
      testY = currY;
    }

    // 4. Тангенциальное скольжение (Tangent Deflection)
    // Если прямое смещение по осям полностью заблокировано углом или окружностью препятствия,
    // пробуем скользить по касательной в направлении минимального отклонения
    if (testX === currX && testY === currY) {
      const mag = Math.hypot(dx, dy);
      if (mag > 0.001) {
        const baseAngle = Math.atan2(dy, dx);
        const deflectionAngles = [
          Math.PI / 6, -Math.PI / 6,
          Math.PI / 4, -Math.PI / 4,
          Math.PI / 3, -Math.PI / 3,
          Math.PI / 2, -Math.PI / 2,
        ];
        for (const offset of deflectionAngles) {
          const testAngle = baseAngle + offset;
          const candX = Math.max(minX, Math.min(maxX, currX + Math.cos(testAngle) * mag));
          const candY = Math.max(minY, Math.min(maxY, currY + Math.sin(testAngle) * mag));
          if (!this.checkCollisionWithObstacles(candX, candY, radius, obstacles)) {
            testX = candX;
            testY = candY;
            break;
          }
        }
      }
    }

    return {
      x: Math.max(minX, Math.min(maxX, testX)),
      y: Math.max(minY, Math.min(maxY, testY)),
    };
  }

  /**
   * Проверка на столкновение круга сущности с препятствиями
   */
  public checkCollisionWithObstacles(
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
        // AABB прямоугольное препятствие
        const halfW = obs.width / 2;
        const halfH = obs.height / 2;
        const closestX = Math.max(obs.x - halfW, Math.min(px, obs.x + halfW));
        const closestY = Math.max(obs.y - halfH, Math.min(py, obs.y + halfH));
        const distSq = (px - closestX) ** 2 + (py - closestY) ** 2;

        if (distSq < radius ** 2) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Проверка линии видимости (Raycast) между двумя точками
   */
  public hasLineOfSight(x1: number, y1: number, x2: number, y2: number, checkRadius: number = 14): boolean {
    return this.pathfinding.hasLineOfSight(x1, y1, x2, y2, checkRadius);
  }

  /**
   * Поиск пути в обход препятствий через навигационный граф (A* + String Pulling)
   */
  public findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    clearance: number = 14
  ): NavWaypoint[] {
    return this.pathfinding.findPath(startX, startY, endX, endY, clearance);
  }

  /**
   * Отрисовка декораций грунта, дорог, площадей, рек и границ карты
   */
  public renderZoneGround(): void {
    if (!this.currentZone) return;

    this.groundGraphics.clear();
    this.borderGraphics.clear();

    const w = this.currentZone.width || 2400;
    const h = this.currentZone.height || 2400;
    const halfW = w / 2;
    const halfH = h / 2;

    // 1. Отрисовка границ локации (Border wall & fences)
    this.borderGraphics.lineStyle(8, 0x1e293b, 0.9);
    this.borderGraphics.drawRoundedRect(-halfW + 24, -halfH + 24, w - 48, h - 48, 20);

    // Угловые и настенные каменные столбы
    const postColor = 0x334155;
    this.borderGraphics.lineStyle(0);
    this.borderGraphics.beginFill(postColor);
    const step = 200;
    for (let x = -halfW + 24; x <= halfW - 24; x += step) {
      this.borderGraphics.drawCircle(x, -halfH + 24, 7);
      this.borderGraphics.drawCircle(x, halfH - 24, 7);
    }
    for (let y = -halfH + 24; y <= halfH - 24; y += step) {
      this.borderGraphics.drawCircle(-halfW + 24, y, 7);
      this.borderGraphics.drawCircle(halfW - 24, y, 7);
    }
    this.borderGraphics.endFill();

    // 2. Специфичный для локации арт грунта
    if (this.currentZone.id === 'zone_village') {
      this.renderVillageGround(halfW, halfH);
    } else if (this.currentZone.id === 'zone_meadow' || this.currentZone.id === 'poring_meadow') {
      this.renderMeadowGround();
    } else if (this.currentZone.id === 'zone_forest' || this.currentZone.id === 'mushroom_forest') {
      this.renderForestGround();
    } else if (this.currentZone.id === 'zone_sunken_ruins' || this.currentZone.id === 'undead_ruins') {
      this.renderSunkenRuinsGround();
    } else if (this.currentZone.id === 'zone_ant_canyon') {
      this.renderAntCanyonGround();
    } else if (this.currentZone.id === 'zone_high_city') {
      this.renderHighCityGround(halfW, halfH);
    } else if (this.currentZone.id === 'zone_orc_fortress') {
      this.renderOrcFortressGround();
    } else if (this.currentZone.id === 'zone_cursed_abbey') {
      this.renderCursedAbbeyGround();
    } else if (this.currentZone.id === 'zone_clock_tower') {
      this.renderClockTowerGround();
    } else if (this.currentZone.id === 'zone_dragon_volcano' || this.currentZone.id === 'dragon_lair') {
      this.renderVolcanoGround();
    }

    // 3. Отрисовка статических препятствий (здания, фонтан, скалы)
    this.renderObstacleGraphics();
  }

  private renderVillageGround(halfW: number, halfH: number): void {
    const g = this.groundGraphics;

    // Фоновая мостовая / мягкий зеленый газон
    g.beginFill(0x2d4f28);
    g.drawRect(-halfW, -halfH, halfW * 2, halfH * 2);
    g.endFill();

    // Главная мощеная площадь (Central Cobblestone Plaza)
    g.beginFill(0x64748b, 0.45);
    g.lineStyle(4, 0x94a3b8, 0.6);
    g.drawCircle(0, 0, 320);
    g.endFill();

    // Внутренний каменный круг площади
    g.beginFill(0x475569, 0.5);
    g.lineStyle(2, 0xcbd5e1, 0.7);
    g.drawCircle(0, 0, 180);
    g.endFill();

    // Мощеные дороги к 4 сторонам
    g.lineStyle(0);
    g.beginFill(0x64748b, 0.4);
    // Дорога на Восток (к порталу на Поляну)
    g.drawRect(0, -50, halfW - 40, 100);
    // Дорога на Запад
    g.drawRect(-halfW + 40, -50, halfW, 100);
    // Дорога на Север
    g.drawRect(-50, -halfH + 40, 100, halfH);
    // Дорога на Юг
    g.drawRect(-50, 0, 100, halfH - 40);
    g.endFill();

    // Каменная плитка (декоративные полосы)
    g.lineStyle(1, 0x334155, 0.25);
    for (let r = 40; r <= 300; r += 40) {
      g.drawCircle(0, 0, r);
    }
  }

  private renderMeadowGround(): void {
    const g = this.groundGraphics;

    // Река по центру (Y от -1200 до 1200, X: -50..50)
    g.beginFill(0x2563eb, 0.75);
    g.lineStyle(4, 0x60a5fa, 0.9);
    g.drawRect(-50, -1200, 100, 2400);
    g.endFill();

    // Внутренний водный поток
    g.lineStyle(2, 0x93c5fd, 0.6);
    for (let y = -1150; y <= 1150; y += 120) {
      g.moveTo(-30, y);
      g.lineTo(-10, y + 40);
      g.moveTo(15, y + 20);
      g.lineTo(35, y + 60);
    }

    // Деревянные мосты через реку (North Bridge: Y ~ -400, South Bridge: Y ~ 400)
    this.renderBridge(0, -400, 140, 80);
    this.renderBridge(0, 400, 140, 80);

    // Грунтовая тропа между мостами и порталами
    g.lineStyle(0);
    g.beginFill(0x785638, 0.35);
    g.drawRoundedRect(-1100, -25, 2200, 50, 20);
    g.endFill();
  }

  private renderBridge(x: number, y: number, w: number, h: number): void {
    const g = this.groundGraphics;

    // Настил из деревянных досок
    g.lineStyle(0);
    g.beginFill(0x854d0e);
    g.drawRect(x - w / 2, y - h / 2, w, h);
    g.endFill();

    // Доски
    g.lineStyle(2, 0x451a03, 0.8);
    for (let px = x - w / 2 + 10; px <= x + w / 2 - 10; px += 14) {
      g.moveTo(px, y - h / 2);
      g.lineTo(px, y + h / 2);
    }

    // Деревянные перила (Railings)
    g.lineStyle(4, 0x713f12, 1);
    g.moveTo(x - w / 2, y - h / 2);
    g.lineTo(x + w / 2, y - h / 2);
    g.moveTo(x - w / 2, y + h / 2);
    g.lineTo(x + w / 2, y + h / 2);

    // Опоры перил
    g.beginFill(0x3a1d04);
    g.drawCircle(x - w / 2 + 6, y - h / 2, 5);
    g.drawCircle(x + w / 2 - 6, y - h / 2, 5);
    g.drawCircle(x - w / 2 + 6, y + h / 2, 5);
    g.drawCircle(x + w / 2 - 6, y + h / 2, 5);
    g.endFill();
  }

  private renderForestGround(): void {
    const g = this.groundGraphics;
    // Лесные мшистые тропы
    g.lineStyle(0);
    g.beginFill(0x1e3a1f, 0.5);
    g.drawCircle(-200, -200, 180);
    g.drawCircle(250, 150, 220);
    g.drawCircle(-150, 300, 160);
    g.endFill();
  }

  private renderSunkenRuinsGround(): void {
    const g = this.groundGraphics;
    // Затопленные каменные плиты и лужи
    g.lineStyle(2, 0x1e293b, 0.4);
    for (let x = -800; x <= 800; x += 160) {
      for (let y = -800; y <= 800; y += 160) {
        g.drawRect(x, y, 140, 140);
      }
    }
    // Водные заводи / лужи
    g.lineStyle(0);
    g.beginFill(0x0284c7, 0.35);
    g.drawEllipse(-300, 200, 140, 70);
    g.drawEllipse(350, -250, 160, 80);
    g.drawEllipse(0, -100, 100, 50);
    g.endFill();
  }

  private renderAntCanyonGround(): void {
    const g = this.groundGraphics;
    // Песчаные барханы и дюны
    g.lineStyle(0);
    g.beginFill(0x785324, 0.35);
    g.drawEllipse(-350, -250, 260, 120);
    g.drawEllipse(300, 250, 280, 140);
    g.drawEllipse(-100, 350, 200, 90);
    g.endFill();

    // Ветровые песчаные гребни (Dune ripples)
    g.lineStyle(2, 0xa16207, 0.3);
    for (let y = -900; y <= 900; y += 150) {
      g.moveTo(-800, y);
      g.bezierCurveTo(-400, y + 40, 200, y - 40, 800, y + 20);
    }
  }

  private renderHighCityGround(halfW: number, halfH: number): void {
    const g = this.groundGraphics;

    // Бело-мраморная площадь Альдебарана
    g.beginFill(0x1e293b, 0.7);
    g.drawRect(-halfW, -halfH, halfW * 2, halfH * 2);
    g.endFill();

    // Главная круглая площадь с часовым узором
    g.beginFill(0x334155, 0.6);
    g.lineStyle(4, 0x38bdf8, 0.8);
    g.drawCircle(0, 0, 340);
    g.endFill();

    // Внутреннее декоративное кольцо
    g.lineStyle(2, 0x93c5fd, 0.7);
    g.drawCircle(0, 0, 220);
    g.drawCircle(0, 0, 120);

    // Радиальные часовые деления на площади
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const x1 = Math.cos(ang) * 120;
      const y1 = Math.sin(ang) * 120;
      const x2 = Math.cos(ang) * 340;
      const y2 = Math.sin(ang) * 340;
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
    }

    // Мощеные проспекты к воротам
    g.lineStyle(0);
    g.beginFill(0x475569, 0.5);
    g.drawRect(-halfW + 40, -50, halfW - 40, 100);
    g.drawRect(0, -50, halfW - 40, 100);
    g.drawRect(-50, 0, 100, halfH - 40);
    g.endFill();
  }

  private renderOrcFortressGround(): void {
    const g = this.groundGraphics;
    // Глинистая земля и следы костров
    g.lineStyle(0);
    g.beginFill(0x271a0c, 0.5);
    g.drawCircle(0, 0, 300);
    g.drawCircle(-350, 200, 220);
    g.drawCircle(350, -200, 220);
    g.endFill();

    // Деревянный настил и грязевые колеи
    g.lineStyle(2, 0x78350f, 0.4);
    for (let x = -700; x <= 700; x += 180) {
      g.moveTo(x, -600);
      g.lineTo(x + 50, 600);
    }
  }

  private renderCursedAbbeyGround(): void {
    const g = this.groundGraphics;
    // Готические темные плиты аббатства
    g.lineStyle(2, 0x3b0764, 0.35);
    for (let x = -800; x <= 800; x += 120) {
      for (let y = -800; y <= 800; y += 120) {
        g.drawRect(x, y, 100, 100);
      }
    }
    // Тёмно-магические печати на полу
    g.lineStyle(2, 0xa855f7, 0.25);
    g.drawCircle(0, 0, 260);
    g.drawCircle(0, 0, 180);
  }

  private renderClockTowerGround(): void {
    const g = this.groundGraphics;
    // Бронзовые пластины пола
    g.lineStyle(2, 0x78350f, 0.4);
    for (let x = -800; x <= 800; x += 160) {
      for (let y = -800; y <= 800; y += 160) {
        g.drawRect(x, y, 140, 140);
      }
    }
    // Огромные декоративные шестеренки на полу
    g.lineStyle(3, 0xd97706, 0.4);
    g.drawCircle(0, 0, 240);
    g.drawCircle(-400, 350, 160);
    g.drawCircle(400, -350, 160);
  }

  private renderVolcanoGround(): void {
    const g = this.groundGraphics;
    // Базальтовые темные камни
    g.lineStyle(0);
    g.beginFill(0x180808, 0.6);
    g.drawCircle(0, 0, 350);
    g.drawCircle(-350, -250, 240);
    g.drawCircle(350, 250, 240);
    g.endFill();

    // Растрескавшаяся вулканическая магма
    g.lineStyle(3, 0xf97316, 0.7);
    g.moveTo(-600, -300);
    g.lineTo(-200, -100);
    g.lineTo(0, -400);
    g.lineTo(350, -150);
    g.lineTo(600, -350);

    g.moveTo(-500, 300);
    g.lineTo(-100, 200);
    g.lineTo(200, 450);
    g.lineTo(500, 250);

    // Дополнительные магматические разломы
    g.lineStyle(2, 0xfacc15, 0.8);
    g.moveTo(-150, -80);
    g.lineTo(0, 100);
    g.lineTo(180, 50);
  }

  private renderObstacleGraphics(): void {
    if (!this.currentZone || !this.currentZone.obstacles) return;

    const g = this.groundGraphics;

    for (const obs of this.currentZone.obstacles) {
      if (obs.type === 'VILLAGE_FOUNTAIN') {
        // Большой каменный фонтан деревни
        g.lineStyle(5, 0x94a3b8, 1);
        g.beginFill(0x475569);
        g.drawCircle(obs.x, obs.y, 48);
        g.endFill();

        // Вода в фонтане
        g.lineStyle(0);
        g.beginFill(0x38bdf8, 0.85);
        g.drawCircle(obs.x, obs.y, 38);
        g.endFill();

        // Центральная чаша
        g.beginFill(0x64748b);
        g.drawCircle(obs.x, obs.y, 14);
        g.endFill();
        g.beginFill(0xe0f2fe);
        g.drawCircle(obs.x, obs.y, 6);
        g.endFill();
      } else if (obs.type === 'CITADEL_TOWER') {
        // Башня Цитадели Альдебаран
        g.lineStyle(6, 0x38bdf8, 0.9);
        g.beginFill(0x1e293b);
        g.drawCircle(obs.x, obs.y, obs.radius || 58);
        g.endFill();

        // Внутренняя крыша и золотые часы
        g.lineStyle(2, 0xfacc15, 0.9);
        g.beginFill(0x0f172a);
        g.drawCircle(obs.x, obs.y, 34);
        g.endFill();
        g.lineStyle(0);
        g.beginFill(0xfde047);
        g.drawCircle(obs.x, obs.y, 8);
        g.endFill();
      } else if (obs.type === 'VILLAGE_HOUSE') {
        // Дома деревни (стены и черепичная крыша)
        const hw = obs.width / 2;
        const hh = obs.height / 2;

        // Тень дома
        g.lineStyle(0);
        g.beginFill(0x000000, 0.35);
        g.drawRoundedRect(obs.x - hw + 8, obs.y - hh + 12, obs.width, obs.height, 8);
        g.endFill();

        // Каменные стены
        g.beginFill(0x475569);
        g.drawRoundedRect(obs.x - hw, obs.y - hh, obs.width, obs.height, 6);
        g.endFill();

        // Черепичная крыша (Terracotta roof)
        g.beginFill(0x991b1b);
        g.lineStyle(3, 0x7f1d1d, 1);
        g.drawRoundedRect(obs.x - hw + 6, obs.y - hh + 6, obs.width - 12, obs.height - 12, 4);
        g.endFill();

        // Дымоход
        g.lineStyle(1, 0x1e293b);
        g.beginFill(0x334155);
        g.drawRect(obs.x + hw - 30, obs.y - hh + 10, 16, 16);
        g.endFill();

        // Окна с теплым светом
        g.lineStyle(0);
        g.beginFill(0xfde047, 0.9);
        g.drawRect(obs.x - hw + 20, obs.y + hh - 25, 20, 16);
        g.drawRect(obs.x + hw - 40, obs.y + hh - 25, 20, 16);
        g.endFill();

        // Дверь
        g.beginFill(0x78350f);
        g.drawRect(obs.x - 12, obs.y + hh - 28, 24, 28);
        g.endFill();
      } else if (obs.type === 'ROCK' || obs.type === 'CANYON_ROCK') {
        const rad = obs.radius || obs.width / 2;
        const isCanyon = obs.type === 'CANYON_ROCK';
        g.lineStyle(2, isCanyon ? 0x78350f : 0x334155, 0.8);
        g.beginFill(isCanyon ? 0x9a3412 : 0x64748b);
        g.drawCircle(obs.x, obs.y, rad);
        g.endFill();
        // Блик света
        g.lineStyle(0);
        g.beginFill(isCanyon ? 0xfdba74 : 0x94a3b8, 0.5);
        g.drawCircle(obs.x - 6, obs.y - 6, rad * 0.45);
        g.endFill();
      } else if (obs.type === 'RUIN_WALL') {
        const hw = obs.width / 2;
        const hh = obs.height / 2;
        g.lineStyle(2, 0x0f172a, 0.9);
        g.beginFill(0x334155);
        g.drawRect(obs.x - hw, obs.y - hh, obs.width, obs.height);
        g.endFill();
        // Каменные блоки
        g.lineStyle(1, 0x64748b, 0.6);
        for (let px = obs.x - hw + 20; px < obs.x + hw; px += 25) {
          g.moveTo(px, obs.y - hh);
          g.lineTo(px, obs.y + hh);
        }
      } else if (obs.type === 'ORC_BARRICADE') {
        const hw = obs.width / 2;
        const hh = obs.height / 2;
        g.lineStyle(2, 0x1c1917, 1);
        g.beginFill(0x78350f);
        g.drawRect(obs.x - hw, obs.y - hh, obs.width, obs.height);
        g.endFill();
        // Заостренные колья
        g.lineStyle(2, 0x451a03, 1);
        for (let px = obs.x - hw + 10; px <= obs.x + hw - 10; px += 18) {
          g.moveTo(px, obs.y + hh);
          g.lineTo(px, obs.y - hh - 6);
        }
      } else if (obs.type === 'GRAVE_TOMB') {
        const hw = obs.width / 2;
        const hh = obs.height / 2;
        g.lineStyle(2, 0x1e1b4b, 1);
        g.beginFill(0x312e81);
        g.drawRoundedRect(obs.x - hw, obs.y - hh, obs.width, obs.height, 4);
        g.endFill();
        // Крест на гробнице
        g.lineStyle(2, 0xc084fc, 0.7);
        g.moveTo(obs.x, obs.y - hh + 10);
        g.lineTo(obs.x, obs.y + hh - 10);
        g.moveTo(obs.x - 14, obs.y - 4);
        g.lineTo(obs.x + 14, obs.y - 4);
      } else if (obs.type === 'CLOCK_GEAR') {
        const rad = obs.radius || obs.width / 2;
        g.lineStyle(3, 0x92400e, 1);
        g.beginFill(0xb45309);
        g.drawCircle(obs.x, obs.y, rad);
        g.endFill();
        // Зубья шестеренки
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2;
          const cx = obs.x + Math.cos(ang) * (rad + 4);
          const cy = obs.y + Math.sin(ang) * (rad + 4);
          g.beginFill(0x78350f);
          g.drawCircle(cx, cy, 6);
          g.endFill();
        }
        // Центральная золотая ось
        g.lineStyle(1, 0xfde047);
        g.beginFill(0xf59e0b);
        g.drawCircle(obs.x, obs.y, rad * 0.35);
        g.endFill();
      } else if (obs.type === 'LAVA_CRATER') {
        const rad = obs.radius || obs.width / 2;
        g.lineStyle(3, 0x7f1d1d, 1);
        g.beginFill(0x450a0a);
        g.drawCircle(obs.x, obs.y, rad);
        g.endFill();
        // Кипящая лава внутри
        g.lineStyle(0);
        g.beginFill(0xf97316, 0.9);
        g.drawCircle(obs.x, obs.y, rad * 0.65);
        g.endFill();
        g.beginFill(0xfacc15, 0.95);
        g.drawCircle(obs.x - 4, obs.y - 4, rad * 0.3);
        g.endFill();
      } else if (obs.type === 'TREE_CLUSTER') {
        // Скопление вековых деревьев
        const rad = obs.radius || obs.width / 2;
        g.lineStyle(0);
        g.beginFill(0x0f172a, 0.3);
        g.drawCircle(obs.x + 6, obs.y + 10, rad);
        g.endFill();

        g.beginFill(0x14532d);
        g.drawCircle(obs.x, obs.y, rad);
        g.endFill();

        g.beginFill(0x16a34a, 0.8);
        g.drawCircle(obs.x - 6, obs.y - 6, rad * 0.65);
        g.endFill();
      }
    }
  }
}
