import * as PIXI from 'pixi.js';

interface ActiveVfx {
  container: PIXI.Container;
  update: (dt: number) => boolean; // возвращает true, когда эффект завершён
}

export class VfxSystem {
  private vfxLayer: PIXI.Container;
  private activeEffects: ActiveVfx[] = [];

  constructor(vfxLayer: PIXI.Container) {
    this.vfxLayer = vfxLayer;
  }

  /**
   * Удар молнии (Lightning Bolt) сверху вниз
   */
  public castLightningBolt(targetX: number, targetY: number, onImpact?: () => void): void {
    const container = new PIXI.Container();
    const boltGfx = new PIXI.Graphics();
    container.addChild(boltGfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.32;
    let impactCalled = false;

    const startY = targetY - 450;
    const steps = 8;
    const points: Array<{ x: number; y: number }> = [{ x: targetX + (Math.random() - 0.5) * 40, y: startY }];

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      points.push({
        x: targetX + (Math.random() - 0.5) * 50 * (1 - t),
        y: startY + (targetY - startY) * t,
      });
    }
    points.push({ x: targetX, y: targetY });

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        if (!impactCalled && progress > 0.08) {
          impactCalled = true;
          onImpact?.();
        }

        boltGfx.clear();
        const alpha = Math.max(0, 1 - progress / duration);

        boltGfx.lineStyle(8, 0x38bdf8, alpha * 0.6);
        boltGfx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          boltGfx.lineTo(points[i].x, points[i].y);
        }

        boltGfx.lineStyle(3, 0xffffff, alpha);
        boltGfx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          boltGfx.lineTo(points[i].x, points[i].y);
        }

        if (progress < 0.18) {
          boltGfx.beginFill(0x38bdf8, (0.18 - progress) * 3);
          boltGfx.drawCircle(targetX, targetY, 28);
          boltGfx.endFill();
        }

        return progress >= duration;
      },
    });
  }

  /**
   * Огненный Столб (Fire Pillar) — взрыв пламени из земли
   */
  public castFirePillar(targetX: number, targetY: number, onImpact?: () => void): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.45;
    let impactCalled = false;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        if (!impactCalled && progress > 0.08) {
          impactCalled = true;
          onImpact?.();
        }

        gfx.clear();
        const alpha = Math.max(0, 1 - progress / duration);
        const height = Math.min(180, progress * 600);
        const width = 36 * (1 - (progress / duration) * 0.5);

        // Внешнее пламя (оранжево-красное)
        gfx.beginFill(0xef4444, alpha * 0.7);
        gfx.drawRect(targetX - width / 2, targetY - height, width, height);
        gfx.endFill();

        // Сердцевина пламени (золотисто-желтая)
        gfx.beginFill(0xfacc15, alpha * 0.9);
        gfx.drawRect(targetX - width / 4, targetY - height, width / 2, height);
        gfx.endFill();

        // Основание столба на земле
        gfx.beginFill(0xf97316, alpha * 0.8);
        gfx.drawEllipse(targetX, targetY, width * 0.9, 12);
        gfx.endFill();

        return progress >= duration;
      },
    });
  }

  /**
   * Ледяная Нова (Frost Nova) — взрыв морозного кольца и кристаллов
   */
  public castFrostNova(targetX: number, targetY: number, onImpact?: () => void): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.38;
    let impactCalled = false;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        if (!impactCalled && progress > 0.06) {
          impactCalled = true;
          onImpact?.();
        }

        gfx.clear();
        const alpha = Math.max(0, 1 - progress / duration);
        const currentR = 20 + (progress / duration) * 65;

        // Расширяющееся ледяное кольцо
        gfx.lineStyle(3, 0x38bdf8, alpha * 0.85);
        gfx.drawCircle(targetX, targetY, currentR);

        // Белая внутренняя волна
        gfx.lineStyle(1.5, 0xffffff, alpha * 0.95);
        gfx.drawCircle(targetX, targetY, currentR * 0.7);

        // 8 ледяных кристаллов/шипов
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8 + progress * 2;
          const sx = targetX + Math.cos(angle) * currentR;
          const sy = targetY + Math.sin(angle) * currentR * 0.6;
          gfx.beginFill(0xa5f3fc, alpha);
          gfx.drawCircle(sx, sy, 3.5);
          gfx.endFill();
        }

        return progress >= duration;
      },
    });
  }

  /**
   * Великий Крест (Grand Cross) — гигантский золотой крест света на земле
   */
  public castGrandCross(centerX: number, centerY: number, radius: number = 160, onTick?: (wave: number) => void): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 1.3;
    let waveTicks = 0;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        gfx.clear();

        const currentWave = Math.floor(progress / 0.4);
        if (currentWave > waveTicks && waveTicks < 3) {
          waveTicks++;
          onTick?.(waveTicks);
        }

        const alpha = Math.sin((progress / duration) * Math.PI);
        const pulse = 1 + Math.sin(progress * 15) * 0.15;
        const beamLen = radius * pulse;
        const beamWidth = 24 * pulse;

        // Золотое свечение ореола
        gfx.beginFill(0xf59e0b, alpha * 0.35);
        gfx.drawCircle(centerX, centerY, radius * 0.9);
        gfx.endFill();

        // Вертикальный золотой луч
        gfx.beginFill(0xfef08a, alpha * 0.85);
        gfx.drawRect(centerX - beamWidth / 2, centerY - beamLen, beamWidth, beamLen * 2);
        // Горизонтальный золотой луч
        gfx.drawRect(centerX - beamLen, centerY - beamWidth / 2, beamLen * 2, beamWidth);
        gfx.endFill();

        // Белая яркая сердцевина
        gfx.beginFill(0xffffff, alpha * 0.95);
        gfx.drawRect(centerX - beamWidth / 4, centerY - beamLen, beamWidth / 2, beamLen * 2);
        gfx.drawRect(centerX - beamLen, centerY - beamWidth / 4, beamLen * 2, beamWidth / 2);
        gfx.endFill();

        return progress >= duration;
      },
    });
  }

  /**
   * Ледяной Буран (Storm Gust) — завихрение снежной бури на 3 секунды
   */
  public castStormGust(centerX: number, centerY: number, radius: number = 170, onTick?: () => void): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 3.0;
    let tickTimer = 0;

    // Снежинки
    const snowflakes: Array<{ dist: number; angle: number; speed: number; size: number }> = [];
    for (let i = 0; i < 28; i++) {
      snowflakes.push({
        dist: Math.random() * radius * 0.9,
        angle: Math.random() * Math.PI * 2,
        speed: 2 + Math.random() * 4,
        size: 2 + Math.random() * 3,
      });
    }

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        tickTimer += dt;
        if (tickTimer >= 1.0) {
          tickTimer -= 1.0;
          onTick?.();
        }

        gfx.clear();
        const fade = progress < 0.3 ? progress / 0.3 : progress > duration - 0.5 ? (duration - progress) / 0.5 : 1;

        // Ледяная зона на земле
        gfx.beginFill(0x38bdf8, 0.22 * fade);
        gfx.drawCircle(centerX, centerY, radius);
        gfx.endFill();

        gfx.lineStyle(2, 0xa5f3fc, 0.5 * fade);
        gfx.drawCircle(centerX, centerY, radius);

        // Вращающиеся снежинки
        for (const sf of snowflakes) {
          sf.angle += sf.speed * dt;
          const sx = centerX + Math.cos(sf.angle) * sf.dist;
          const sy = centerY + Math.sin(sf.angle) * sf.dist;

          gfx.beginFill(0xffffff, 0.8 * fade);
          gfx.drawCircle(sx, sy, sf.size);
          gfx.endFill();
        }

        return progress >= duration;
      },
    });
  }

  /**
   * Метеоритный Дождь (Meteor Storm) — огненные метеоры с небес
   */
  public castMeteorStorm(centerX: number, centerY: number, radius: number = 180, count: number = 4, onImpact?: () => void): void {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const targetX = centerX + (Math.random() - 0.5) * radius * 1.5;
        const targetY = centerY + (Math.random() - 0.5) * radius * 1.2;
        this.spawnSingleMeteor(targetX, targetY, onImpact);
      }, i * 220);
    }
  }

  private spawnSingleMeteor(targetX: number, targetY: number, onImpact?: () => void): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const fallDuration = 0.35;
    const startX = targetX - 180;
    const startY = targetY - 320;
    let exploded = false;
    let explodeProgress = 0;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        gfx.clear();

        if (!exploded) {
          progress += dt;
          const t = Math.min(1, progress / fallDuration);
          const currentX = startX + (targetX - startX) * t;
          const currentY = startY + (targetY - startY) * t;

          // Огненный хвост метеора
          gfx.lineStyle(6, 0xf97316, 0.8);
          gfx.moveTo(currentX - 40, currentY - 70);
          gfx.lineTo(currentX, currentY);

          gfx.lineStyle(3, 0xfef08a, 0.95);
          gfx.moveTo(currentX - 25, currentY - 45);
          gfx.lineTo(currentX, currentY);

          // Ядро метеора
          gfx.beginFill(0xef4444);
          gfx.drawCircle(currentX, currentY, 9);
          gfx.endFill();

          if (t >= 1) {
            exploded = true;
            onImpact?.();
          }
          return false;
        } else {
          explodeProgress += dt;
          const alpha = Math.max(0, 1 - explodeProgress / 0.4);
          const r = 35 + explodeProgress * 80;

          // Взрывной круг
          gfx.beginFill(0xf97316, alpha * 0.6);
          gfx.drawCircle(targetX, targetY, r);
          gfx.endFill();

          gfx.lineStyle(3, 0xfef08a, alpha);
          gfx.drawCircle(targetX, targetY, r * 0.8);

          return explodeProgress >= 0.4;
        }
      },
    });
  }

  /**
   * Святилище Приста (Sanctuary) — освященная лечебная зона на 5 секунд
   */
  public castSanctuary(centerX: number, centerY: number, radius: number = 140, onTick?: () => void): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 5.0;
    let tickTimer = 0;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        tickTimer += dt;
        if (tickTimer >= 1.0) {
          tickTimer -= 1.0;
          onTick?.();
        }

        gfx.clear();
        const fade = progress < 0.4 ? progress / 0.4 : progress > duration - 0.6 ? (duration - progress) / 0.6 : 1;
        const pulse = 1 + Math.sin(progress * 4) * 0.05;

        // Святой круг
        gfx.beginFill(0x4ade80, 0.18 * fade);
        gfx.drawCircle(centerX, centerY, radius * pulse);
        gfx.endFill();

        gfx.lineStyle(2, 0x86efac, 0.6 * fade);
        gfx.drawCircle(centerX, centerY, radius * pulse);

        // Внутренний крест
        gfx.lineStyle(2, 0xffffff, 0.5 * fade);
        gfx.moveTo(centerX - 20, centerY);
        gfx.lineTo(centerX + 20, centerY);
        gfx.moveTo(centerX, centerY - 20);
        gfx.lineTo(centerX, centerY + 20);

        return progress >= duration;
      },
    });
  }

  /**
   * Сокрушительный Удар Азуры (Asura Strike) — ослепительная вспышка и удар
   */
  public triggerAsuraStrike(targetX: number, targetY: number, onImpact?: () => void): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.45;
    let impactCalled = false;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        gfx.clear();

        if (!impactCalled && progress > 0.05) {
          impactCalled = true;
          onImpact?.();
        }

        const alpha = Math.max(0, 1 - progress / duration);
        const radius = 60 + progress * 160;

        // Взрывная волна Азуры
        gfx.beginFill(0xffffff, alpha * 0.85);
        gfx.drawCircle(targetX, targetY, radius * 0.6);
        gfx.endFill();

        gfx.lineStyle(5, 0xf59e0b, alpha);
        gfx.drawCircle(targetX, targetY, radius);

        // Каллиграфические крестообразные росчерки удара
        gfx.lineStyle(6, 0xef4444, alpha);
        gfx.moveTo(targetX - radius * 0.7, targetY - radius * 0.7);
        gfx.lineTo(targetX + radius * 0.7, targetY + radius * 0.7);
        gfx.moveTo(targetX + radius * 0.7, targetY - radius * 0.7);
        gfx.lineTo(targetX - radius * 0.7, targetY + radius * 0.7);

        return progress >= duration;
      },
    });
  }

  /**
   * Спиральный Пробой Рыцаря (Spiral Pierce) — скоростной бурав режущих волн
   */
  public castSpiralPierce(fromX: number, fromY: number, toX: number, toY: number): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.28;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        gfx.clear();
        const alpha = Math.max(0, 1 - progress / duration);

        gfx.lineStyle(4, 0xf59e0b, alpha);
        gfx.moveTo(fromX, fromY);
        gfx.lineTo(toX, toY);

        gfx.lineStyle(2, 0xffffff, alpha * 1.2);
        gfx.moveTo(fromX, fromY);
        gfx.lineTo(toX, toY);

        return progress >= duration;
      },
    });
  }

  /**
   * Проекция Щита Крестоносца (Shield Chain)
   */
  public castShieldChain(fromX: number, fromY: number, toX: number, toY: number, onImpact?: () => void): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.22;
    let hit = false;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        gfx.clear();

        const t = Math.min(1, progress / duration);
        const curX = fromX + (toX - fromX) * t;
        const curY = fromY + (toY - fromY) * t;

        // Проекция летящего золотого щита
        gfx.beginFill(0xf59e0b, 0.85);
        gfx.lineStyle(2, 0xfef08a, 0.95);
        gfx.drawRoundedRect(curX - 10, curY - 14, 20, 28, 4);
        gfx.endFill();

        if (t >= 1 && !hit) {
          hit = true;
          onImpact?.();
        }

        return progress >= duration + 0.05;
      },
    });
  }

  /**
   * Взрыв Магмы (Magnum Break) — мощная расширяющаяся огненная волна с искрами
   */
  public castMagnumBreak(centerX: number, centerY: number, radius: number = 130, onImpact?: () => void): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.48;
    let impactCalled = false;

    // 16 огненных искр/осколков
    const embers: Array<{ angle: number; dist: number; speed: number; size: number }> = [];
    for (let i = 0; i < 16; i++) {
      embers.push({
        angle: (i * Math.PI * 2) / 16 + (Math.random() - 0.5) * 0.3,
        dist: 10,
        speed: 180 + Math.random() * 140,
        size: 3 + Math.random() * 3.5,
      });
    }

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        if (!impactCalled && progress > 0.06) {
          impactCalled = true;
          onImpact?.();
        }

        gfx.clear();
        const alpha = Math.max(0, 1 - progress / duration);
        const curRadius = 15 + (progress / duration) * (radius - 15);

        // 1. Огненный опаленный след на земле
        gfx.beginFill(0x991b1b, alpha * 0.35);
        gfx.drawEllipse(centerX, centerY, curRadius * 1.05, curRadius * 0.55);
        gfx.endFill();

        // 2. Взрывное кольцо пламени
        gfx.lineStyle(6, 0xef4444, alpha * 0.85);
        gfx.drawEllipse(centerX, centerY, curRadius, curRadius * 0.5);

        // 3. Внутренняя золотая волна
        gfx.lineStyle(3, 0xfef08a, alpha * 0.95);
        gfx.drawEllipse(centerX, centerY, curRadius * 0.75, curRadius * 0.38);

        // 4. Огненные искры
        for (const emb of embers) {
          emb.dist += emb.speed * dt;
          const ex = centerX + Math.cos(emb.angle) * emb.dist;
          const ey = centerY + Math.sin(emb.angle) * (emb.dist * 0.55);

          gfx.beginFill(0xf97316, alpha);
          gfx.drawCircle(ex, ey, emb.size * alpha);
          gfx.endFill();
          gfx.beginFill(0xfef08a, alpha * 0.8);
          gfx.drawCircle(ex, ey, emb.size * 0.5 * alpha);
          gfx.endFill();
        }

        return progress >= duration;
      },
    });
  }

  /**
   * Рассекающий рубящий удар клинка (Bash / Slash)
   */
  public castBashSlash(targetX: number, targetY: number, color: number = 0xf59e0b, scale: number = 1.0): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.26;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        gfx.clear();
        const alpha = Math.max(0, 1 - progress / duration);

        const len = 42 * scale;
        // Светящийся серп удара
        gfx.lineStyle(6, color, alpha * 0.8);
        gfx.moveTo(targetX - len * 0.7, targetY - len * 0.6);
        gfx.lineTo(targetX + len * 0.7, targetY + len * 0.6);

        // Бело-горячая сердцевина
        gfx.lineStyle(2.5, 0xffffff, alpha);
        gfx.moveTo(targetX - len * 0.7, targetY - len * 0.6);
        gfx.lineTo(targetX + len * 0.7, targetY + len * 0.6);

        // Вспышка в точке удара
        if (progress < 0.12) {
          gfx.beginFill(0xffffff, (0.12 - progress) * 8);
          gfx.drawCircle(targetX, targetY, 20 * scale);
          gfx.endFill();
        }

        return progress >= duration;
      },
    });
  }

  /**
   * Сокрушительный Боулинг-удар (Bowling Bash) — двойной перекрестный срез и взрывная кинетическая волна
   */
  public castBowlingBash(
    playerX: number,
    playerY: number,
    targetX: number,
    targetY: number,
    onImpact?: () => void
  ): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.36;
    let impactCalled = false;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        if (!impactCalled && progress > 0.05) {
          impactCalled = true;
          onImpact?.();
        }

        gfx.clear();
        const alpha = Math.max(0, 1 - progress / duration);
        const radius = 25 + progress * 130;

        // Кинетическая ударная волна
        gfx.lineStyle(4, 0xf97316, alpha * 0.9);
        gfx.drawCircle(targetX, targetY, radius);

        gfx.lineStyle(2, 0xfef08a, alpha);
        gfx.drawCircle(targetX, targetY, radius * 0.7);

        // Двойной перекрестный срез (X-Slash)
        const cutLen = 45;
        gfx.lineStyle(5, 0xef4444, alpha);
        gfx.moveTo(targetX - cutLen, targetY - cutLen);
        gfx.lineTo(targetX + cutLen, targetY + cutLen);

        gfx.lineStyle(5, 0xf59e0b, alpha);
        gfx.moveTo(targetX + cutLen, targetY - cutLen);
        gfx.lineTo(targetX - cutLen, targetY + cutLen);

        return progress >= duration;
      },
    });
  }

  /**
   * Ливень Стрел (Arrow Shower) — град падающих с неба стрел в область
   */
  public castArrowShower(targetX: number, targetY: number, radius: number = 120, onImpact?: () => void): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.65;
    let impactCalled = false;

    // Генерируем 16 стрел
    const arrows: Array<{
      landX: number;
      landY: number;
      delay: number;
      landed: boolean;
    }> = [];

    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius * 0.85;
      arrows.push({
        landX: targetX + Math.cos(angle) * dist,
        landY: targetY + Math.sin(angle) * dist,
        delay: (i / 16) * 0.35,
        landed: false,
      });
    }

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        if (!impactCalled && progress > 0.12) {
          impactCalled = true;
          onImpact?.();
        }

        gfx.clear();
        const globalAlpha = Math.max(0, 1 - progress / duration);

        // Индикатор зоны обстрела на земле
        gfx.lineStyle(1.5, 0x38bdf8, globalAlpha * 0.4);
        gfx.drawCircle(targetX, targetY, radius);

        for (const arr of arrows) {
          if (progress < arr.delay) continue;
          const arrowTime = progress - arr.delay;
          const flightDuration = 0.18;

          if (arrowTime < flightDuration) {
            const t = arrowTime / flightDuration;
            const startX = arr.landX - 80;
            const startY = arr.landY - 260;
            const curX = startX + (arr.landX - startX) * t;
            const curY = startY + (arr.landY - startY) * t;

            // Хвост падающей стрелы
            gfx.lineStyle(2, 0x38bdf8, 0.8);
            gfx.moveTo(curX - 16, curY - 50);
            gfx.lineTo(curX, curY);

            gfx.lineStyle(1.5, 0xffffff, 0.95);
            gfx.moveTo(curX - 8, curY - 25);
            gfx.lineTo(curX, curY);
          } else {
            // Всплеск при попадании в землю
            const splashT = (arrowTime - flightDuration) / 0.2;
            if (splashT < 1) {
              const splashAlpha = 1 - splashT;
              gfx.lineStyle(1.5, 0x38bdf8, splashAlpha * 0.7);
              gfx.drawCircle(arr.landX, arr.landY, 8 + splashT * 12);
            }
          }
        }

        return progress >= duration;
      },
    });
  }

  /**
   * Разрывной Капкан (Blast Mine) — физическая мина с таймером и мощным взрывом
   */
  public castBlastMine(x: number, y: number, onExplode?: () => void): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const fuseTime = 0.6;
    const explodeDuration = 0.45;
    let exploded = false;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        gfx.clear();

        if (progress < fuseTime) {
          // Стадия тикающей мины
          const blinkRate = 8 + (progress / fuseTime) * 16;
          const isLedOn = Math.sin(progress * blinkRate) > 0;

          // Корпус мины
          gfx.beginFill(0x334155);
          gfx.lineStyle(1.5, 0x64748b, 1);
          gfx.drawCircle(x, y, 9);
          gfx.endFill();

          // Жёлтые предупреждающие полоски
          gfx.lineStyle(1, 0xfacc15, 0.8);
          gfx.drawCircle(x, y, 6);

          // Пульсирующий красный светодиод
          if (isLedOn) {
            gfx.beginFill(0xef4444);
            gfx.drawCircle(x, y, 3.5);
            gfx.endFill();
          }
          return false;
        } else {
          // Взрыв!
          if (!exploded) {
            exploded = true;
            onExplode?.();
          }

          const expProgress = progress - fuseTime;
          const alpha = Math.max(0, 1 - expProgress / explodeDuration);
          const r = 20 + expProgress * 180;

          // Огненный шар взрыва
          gfx.beginFill(0xf97316, alpha * 0.65);
          gfx.drawCircle(x, y, r * 0.85);
          gfx.endFill();

          gfx.beginFill(0xfef08a, alpha * 0.85);
          gfx.drawCircle(x, y, r * 0.45);
          gfx.endFill();

          // Ударная волна
          gfx.lineStyle(4, 0xef4444, alpha);
          gfx.drawCircle(x, y, r);

          return expProgress >= explodeDuration;
        }
      },
    });
  }

  /**
   * Копьё Геи (Earth Spike) — гигантские каменные шипы, вырывающиеся из земли
   */
  public castEarthSpike(targetX: number, targetY: number, onImpact?: () => void): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.52;
    let impactCalled = false;

    // 5 каменных шипов
    const spikes: Array<{ ox: number; oy: number; maxH: number; w: number; delay: number }> = [
      { ox: 0, oy: 0, maxH: 65, w: 16, delay: 0 },
      { ox: -16, oy: 6, maxH: 48, w: 12, delay: 0.04 },
      { ox: 16, oy: -4, maxH: 52, w: 13, delay: 0.05 },
      { ox: -26, oy: -8, maxH: 38, w: 10, delay: 0.08 },
      { ox: 24, oy: 8, maxH: 42, w: 11, delay: 0.09 },
    ];

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        if (!impactCalled && progress > 0.08) {
          impactCalled = true;
          onImpact?.();
        }

        gfx.clear();
        const alpha = Math.max(0, 1 - progress / duration);

        // Трещины в земле под врагом
        gfx.lineStyle(2, 0x78350f, alpha * 0.6);
        gfx.moveTo(targetX - 35, targetY);
        gfx.lineTo(targetX + 35, targetY);
        gfx.moveTo(targetX, targetY - 18);
        gfx.lineTo(targetX, targetY + 18);

        for (const sp of spikes) {
          if (progress < sp.delay) continue;
          const t = Math.min(1, (progress - sp.delay) / 0.16);
          const currentH = sp.maxH * Math.sin(t * Math.PI * 0.5);
          const sx = targetX + sp.ox;
          const sy = targetY + sp.oy;

          // Тело каменного пика
          gfx.beginFill(0x57534e, alpha);
          gfx.lineStyle(1.5, 0xa8a29e, alpha);
          gfx.drawPolygon([
            new PIXI.Point(sx - sp.w / 2, sy),
            new PIXI.Point(sx, sy - currentH),
            new PIXI.Point(sx + sp.w / 2, sy),
          ]);
          gfx.endFill();

          // Освещенная грань
          gfx.beginFill(0xd6d3d1, alpha * 0.6);
          gfx.drawPolygon([
            new PIXI.Point(sx, sy - currentH),
            new PIXI.Point(sx + sp.w / 2, sy),
            new PIXI.Point(sx, sy),
          ]);
          gfx.endFill();
        }

        return progress >= duration;
      },
    });
  }

  /**
   * Святой Свет (Holy Light) — священный луч солнца с небес с ореолом
   */
  public castHolyLight(targetX: number, targetY: number, onImpact?: () => void): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.42;
    let impactCalled = false;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        if (!impactCalled && progress > 0.08) {
          impactCalled = true;
          onImpact?.();
        }

        gfx.clear();
        const alpha = Math.max(0, 1 - progress / duration);
        const beamW = 28 * Math.sin((progress / duration) * Math.PI);

        // Вертикальный луч с неба
        const topY = targetY - 420;
        gfx.beginFill(0xfef08a, alpha * 0.7);
        gfx.drawRect(targetX - beamW / 2, topY, beamW, targetY - topY);
        gfx.endFill();

        gfx.beginFill(0xffffff, alpha * 0.95);
        gfx.drawRect(targetX - beamW / 4, topY, beamW / 2, targetY - topY);
        gfx.endFill();

        // Святой ореол на земле
        gfx.beginFill(0xf59e0b, alpha * 0.5);
        gfx.drawEllipse(targetX, targetY, beamW * 1.4, beamW * 0.6);
        gfx.endFill();

        // Маленький сияющий крест в эпицентре
        gfx.lineStyle(2, 0xffffff, alpha);
        gfx.moveTo(targetX, targetY - 14);
        gfx.lineTo(targetX, targetY + 14);
        gfx.moveTo(targetX - 10, targetY - 4);
        gfx.lineTo(targetX + 10, targetY - 4);

        return progress >= duration;
      },
    });
  }

  /**
   * Великий Экзорцизм (Magnus Exorcismus) — священная пентаграмма и нисходящие столбы света
   */
  public castMagnusExorcismus(
    centerX: number,
    centerY: number,
    radius: number = 180,
    onWave?: (wave: number) => void
  ): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 2.0;
    let currentWave = 0;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        gfx.clear();

        const wave = Math.floor(progress / 0.45);
        if (wave > currentWave && currentWave < 4) {
          currentWave++;
          onWave?.(currentWave);
        }

        const alpha = Math.sin((progress / duration) * Math.PI);
        const rot = progress * 0.8;

        // 1. Внешний магический круг на земле
        gfx.lineStyle(2.5, 0xfef08a, alpha * 0.7);
        gfx.drawCircle(centerX, centerY, radius);

        gfx.lineStyle(1, 0xf59e0b, alpha * 0.5);
        gfx.drawCircle(centerX, centerY, radius * 0.8);

        // 2. Вращающийся святой геометрический узор
        const points = 6;
        gfx.lineStyle(1.5, 0xffffff, alpha * 0.6);
        for (let i = 0; i < points; i++) {
          const a1 = rot + (i * Math.PI * 2) / points;
          const a2 = rot + ((i + 2) * Math.PI * 2) / points;
          const x1 = centerX + Math.cos(a1) * radius * 0.8;
          const y1 = centerY + Math.sin(a1) * radius * 0.8;
          const x2 = centerX + Math.cos(a2) * radius * 0.8;
          const y2 = centerY + Math.sin(a2) * radius * 0.8;
          gfx.moveTo(x1, y1);
          gfx.lineTo(x2, y2);
        }

        // 3. Столбы священного света во время волн
        if (currentWave > 0) {
          const wavePhase = (progress % 0.45) / 0.45;
          const pAlpha = Math.sin(wavePhase * Math.PI) * alpha;
          gfx.beginFill(0xfef08a, pAlpha * 0.4);
          gfx.drawRect(centerX - 35, centerY - 350, 70, 350);
          gfx.endFill();
          gfx.beginFill(0xffffff, pAlpha * 0.7);
          gfx.drawRect(centerX - 15, centerY - 350, 30, 350);
          gfx.endFill();
        }

        return progress >= duration;
      },
    });
  }

  /**
   * Цепное Сокрушение Монаха (Chain Crush) — шквал звуковых ударных волн кулака
   */
  public castChainCrush(
    playerX: number,
    playerY: number,
    targetX: number,
    targetY: number,
    onHit?: (hitIndex: number) => void
  ): void {
    const hits = 4;
    for (let i = 0; i < hits; i++) {
      setTimeout(() => {
        this.spawnPunchShockwave(targetX, targetY, i);
        onHit?.(i);
      }, i * 75);
    }
  }

  private spawnPunchShockwave(targetX: number, targetY: number, index: number): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.22;
    const ox = (Math.random() - 0.5) * 20;
    const oy = (Math.random() - 0.5) * 16;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        gfx.clear();
        const alpha = Math.max(0, 1 - progress / duration);
        const r = 8 + progress * 70;

        // Кольцо кинетического удара
        gfx.lineStyle(3.5, 0xf59e0b, alpha);
        gfx.drawCircle(targetX + ox, targetY + oy, r);

        // Вспышка в центре
        if (progress < 0.08) {
          gfx.beginFill(0xffffff, 0.9);
          gfx.drawCircle(targetX + ox, targetY + oy, 12);
          gfx.endFill();
        }

        return progress >= duration;
      },
    });
  }

  /**
   * Вулкан Мелодий (Arrow Vulcan) — музыкальные стрелы с нотными вспышками
   */
  public castArrowVulcan(
    playerX: number,
    playerY: number,
    targetX: number,
    targetY: number,
    onHit?: (hitIndex: number) => void
  ): void {
    const count = 4;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.spawnMusicalImpact(targetX, targetY, i);
        onHit?.(i);
      }, i * 110);
    }
  }

  private spawnMusicalImpact(targetX: number, targetY: number, index: number): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.35;
    const ox = (Math.random() - 0.5) * 24;
    const oy = (Math.random() - 0.5) * 20;

    const colors = [0xf43f5e, 0xec4899, 0xa855f7, 0x38bdf8];
    const color = colors[index % colors.length];

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        gfx.clear();
        const alpha = Math.max(0, 1 - progress / duration);
        const r = 6 + progress * 60;

        // Музыкальная цветовая волна
        gfx.lineStyle(3, color, alpha);
        gfx.drawCircle(targetX + ox, targetY + oy, r);

        // Маленькие парящие нотки
        const noteDist = 12 + progress * 28;
        for (let j = 0; j < 3; j++) {
          const a = (j * Math.PI * 2) / 3 + progress * 2;
          const nx = targetX + ox + Math.cos(a) * noteDist;
          const ny = targetY + oy + Math.sin(a) * noteDist;
          gfx.beginFill(0xffffff, alpha * 0.9);
          gfx.drawCircle(nx, ny, 2.5);
          gfx.endFill();
        }

        return progress >= duration;
      },
    });
  }

  /**
   * Аура при активации стойки или баффа (Эффектный каст баффа вокруг персонажа)
   */
  public castBuffAura(
    x: number,
    y: number,
    buffType:
      | 'iron_shield'
      | 'speed_wind'
      | 'mirror_shield'
      | 'true_sight'
      | 'energy_coat'
      | 'blessing'
      | 'kyrie'
      | 'grit'
      | 'hindsight'
      | 'elemental_endow'
  ): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.65;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        gfx.clear();
        const alpha = Math.max(0, 1 - progress / duration);
        const t = progress / duration;

        switch (buffType) {
          case 'iron_shield': {
            // Золотой защитный щит, поднимающийся вверх
            const shieldY = y - 10 - t * 30;
            gfx.lineStyle(2.5, 0xf59e0b, alpha);
            gfx.drawRoundedRect(x - 14, shieldY - 18, 28, 36, 6);
            gfx.lineStyle(1.5, 0xffffff, alpha * 0.8);
            gfx.drawCircle(x, shieldY, 8);
            break;
          }
          case 'speed_wind': {
            // Зелёно-золотой вихрь ускорения
            for (let i = 0; i < 3; i++) {
              const a = t * 10 + (i * Math.PI * 2) / 3;
              const r = 24 * (1 - t * 0.3);
              const wx = x + Math.cos(a) * r;
              const wy = y - t * 35 + Math.sin(a) * 8;
              gfx.beginFill(0x22c55e, alpha);
              gfx.drawCircle(wx, wy, 3);
              gfx.endFill();
            }
            break;
          }
          case 'mirror_shield': {
            // Зеркальный ромб
            const my = y - 14 - t * 20;
            gfx.lineStyle(2, 0xfacc15, alpha);
            gfx.drawPolygon([
              new PIXI.Point(x, my - 20),
              new PIXI.Point(x + 16, my),
              new PIXI.Point(x, my + 20),
              new PIXI.Point(x - 16, my),
            ]);
            break;
          }
          case 'true_sight': {
            // Золотой Соколиный Глаз
            const ey = y - 28 - t * 15;
            gfx.lineStyle(2.5, 0x38bdf8, alpha);
            gfx.drawEllipse(x, ey, 20, 10);
            gfx.beginFill(0xfef08a, alpha);
            gfx.drawCircle(x, ey, 4.5);
            gfx.endFill();
            break;
          }
          case 'energy_coat': {
            // Фиолетовая плазменная сфера
            const r = 24 + Math.sin(t * Math.PI) * 6;
            gfx.lineStyle(2, 0xa855f7, alpha * 0.85);
            gfx.drawCircle(x, y - 12, r);
            gfx.beginFill(0xc084fc, alpha * 0.2);
            gfx.drawCircle(x, y - 12, r * 0.9);
            gfx.endFill();
            break;
          }
          case 'blessing': {
            // Ангельские золотые крылья света
            const wingY = y - 24 - t * 24;
            gfx.lineStyle(2.5, 0xfef08a, alpha);
            // Левое крыло
            gfx.arc(x - 16, wingY, 14, -Math.PI * 0.6, Math.PI * 0.2);
            // Правое крыло
            gfx.arc(x + 16, wingY, 14, Math.PI * 0.8, Math.PI * 1.6);
            break;
          }
          case 'kyrie': {
            // Золотой купол Кирие
            const kyrR = 30;
            gfx.lineStyle(2.5, 0xfef08a, alpha * 0.9);
            gfx.drawCircle(x, y - 14, kyrR);
            gfx.beginFill(0xf59e0b, alpha * 0.15);
            gfx.drawCircle(x, y - 14, kyrR);
            gfx.endFill();
            break;
          }
          case 'grit': {
            // Золотой импульс скорости под ногами
            const gr = 15 + t * 45;
            gfx.lineStyle(2, 0x38bdf8, alpha);
            gfx.drawCircle(x, y, gr);
            break;
          }
          case 'hindsight': {
            // Три стихийных шара
            const hR = 26;
            const colors = [0xef4444, 0x38bdf8, 0xfacc15];
            for (let i = 0; i < 3; i++) {
              const a = t * 8 + (i * Math.PI * 2) / 3;
              const hx = x + Math.cos(a) * hR;
              const hy = y - 14 + Math.sin(a) * (hR * 0.5);
              gfx.beginFill(colors[i], alpha);
              gfx.drawCircle(hx, hy, 4);
              gfx.endFill();
            }
            break;
          }
          case 'elemental_endow': {
            // Огненный столб стихии вокруг оружия
            gfx.beginFill(0xf97316, alpha * 0.4);
            gfx.drawRect(x - 10, y - 60, 20, 60);
            gfx.endFill();
            gfx.beginFill(0xfef08a, alpha * 0.7);
            gfx.drawRect(x - 4, y - 60, 8, 60);
            gfx.endFill();
            break;
          }
        }

        return progress >= duration;
      },
    });
  }

  /**
   * Искры исцеления (Первая помощь / отхил)
   */
  public castHealSparkles(x: number, y: number): void {
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this.vfxLayer.addChild(container);

    let progress = 0;
    const duration = 0.5;

    this.activeEffects.push({
      container,
      update: (dt: number) => {
        progress += dt;
        gfx.clear();
        const alpha = Math.max(0, 1 - progress / duration);
        const t = progress / duration;

        // Зеленый святой крест, поднимающийся над героем
        const cy = y - 20 - t * 32;
        gfx.lineStyle(3, 0x4ade80, alpha);
        gfx.moveTo(x, cy - 10);
        gfx.lineTo(x, cy + 10);
        gfx.moveTo(x - 7, cy - 3);
        gfx.lineTo(x + 7, cy - 3);

        // Зелёные искры
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI * 2) / 6 + t * 3;
          const r = 14 + t * 22;
          const sx = x + Math.cos(a) * r;
          const sy = y - 10 + Math.sin(a) * (r * 0.6) - t * 20;
          gfx.beginFill(0x86efac, alpha);
          gfx.drawCircle(sx, sy, 2);
          gfx.endFill();
        }

        return progress >= duration;
      },
    });
  }

  /**
   * Золотой луч света для выпавшей карты (Card Pillar of Light)
   */
  public createCardLightPillar(x: number, y: number): { container: PIXI.Container; destroy: () => void } {
    const container = new PIXI.Container();
    const beamGfx = new PIXI.Graphics();
    container.addChild(beamGfx);
    this.vfxLayer.addChild(container);

    let phase = 0;
    let isAlive = true;

    const effect: ActiveVfx = {
      container,
      update: (dt: number) => {
        if (!isAlive) return true;
        phase += dt * 4;

        beamGfx.clear();
        const beamWidth = 14 + Math.sin(phase) * 3;
        const beamAlpha = 0.45 + Math.sin(phase * 1.5) * 0.15;

        // Золотой луч в небо
        beamGfx.beginFill(0xf59e0b, beamAlpha);
        beamGfx.drawRect(x - beamWidth / 2, y - 300, beamWidth, 300);
        beamGfx.endFill();

        // Белая сердцевина
        beamGfx.beginFill(0xfef08a, beamAlpha * 1.3);
        beamGfx.drawRect(x - beamWidth / 4, y - 300, beamWidth / 2, 300);
        beamGfx.endFill();

        // Ореол на земле
        beamGfx.beginFill(0xf59e0b, 0.4);
        beamGfx.drawEllipse(x, y, 22, 10);
        beamGfx.endFill();

        return false;
      },
    };

    this.activeEffects.push(effect);

    return {
      container,
      destroy: () => {
        isAlive = false;
        container.destroy({ children: true });
      },
    };
  }

  public update(dt: number): void {
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const vfx = this.activeEffects[i];
      const isFinished = vfx.update(dt);
      if (isFinished) {
        this.vfxLayer.removeChild(vfx.container);
        vfx.container.destroy({ children: true });
        this.activeEffects.splice(i, 1);
      }
    }
  }

  public clear(): void {
    for (const vfx of this.activeEffects) {
      this.vfxLayer.removeChild(vfx.container);
      vfx.container.destroy({ children: true });
    }
    this.activeEffects = [];
  }
}
