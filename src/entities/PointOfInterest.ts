import * as PIXI from 'pixi.js';
import { PointOfInterestDef } from '../types/game.types';

export class PointOfInterest {
  public def: PointOfInterestDef;
  public root: PIXI.Container;
  public x: number;
  public y: number;

  public isOpened: boolean = false;
  public isInteracted: boolean = false;
  public channelProgress: number = 0; // 0..1
  public isChanneling: boolean = false;

  private graphics: PIXI.Graphics;
  private auraGraphics: PIXI.Graphics;
  private progressBar: PIXI.Graphics;
  private animTimer: number = Math.random() * 5;

  constructor(
    def: PointOfInterestDef,
    isAlreadyInteracted: boolean = false,
    onInteract?: (poi: PointOfInterest) => void
  ) {
    this.def = def;
    this.x = def.x;
    this.y = def.y;
    this.isInteracted = isAlreadyInteracted;

    this.root = new PIXI.Container();
    this.root.position.set(this.x, this.y);

    this.auraGraphics = new PIXI.Graphics();
    this.graphics = new PIXI.Graphics();
    this.progressBar = new PIXI.Graphics();

    this.root.addChild(this.auraGraphics);
    this.root.addChild(this.graphics);
    this.root.addChild(this.progressBar);

    this.renderVisual();

    // Парящая метка над объектом
    const labelContainer = new PIXI.Container();
    labelContainer.position.set(0, def.type === 'GODDESS_STATUE' ? -58 : -32);

    const icon = def.type === 'GODDESS_STATUE' ? '🌟' : '📦';
    const labelText = new PIXI.Text(`${icon} ${def.name}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 10,
      fontWeight: 'bold',
      fill: def.type === 'GODDESS_STATUE' ? 0xfef08a : 0xfde68a,
      stroke: 0x0f172a,
      strokeThickness: 3,
      align: 'center',
    });
    labelText.anchor.set(0.5);

    const bg = new PIXI.Graphics();
    bg.beginFill(0x0f172a, 0.85);
    bg.lineStyle(1.5, def.type === 'GODDESS_STATUE' ? 0xf59e0b : 0xd97706, 0.8);
    bg.drawRoundedRect(
      -labelText.width / 2 - 6,
      -labelText.height / 2 - 2,
      labelText.width + 12,
      labelText.height + 4,
      5
    );
    bg.endFill();

    labelContainer.addChild(bg);
    labelContainer.addChild(labelText);
    this.root.addChild(labelContainer);

    // Клик по объекту
    this.root.eventMode = 'static';
    this.root.cursor = 'pointer';
    if (onInteract) {
      this.root.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        onInteract(this);
      });
    }
  }

  public renderVisual(): void {
    const g = this.graphics;
    g.clear();

    if (this.def.type === 'GODDESS_STATUE') {
      // 1. Тень
      g.lineStyle(0);
      g.beginFill(0x000000, 0.35);
      g.drawEllipse(0, 4, 22, 8);
      g.endFill();

      // 2. Мраморный постамент со ступенями
      g.beginFill(0x64748b);
      g.drawRoundedRect(-18, -4, 36, 8, 2);
      g.drawRoundedRect(-14, -12, 28, 9, 2);
      g.endFill();

      // 3. Статуя Богини (Мраморное крылатое изваяние)
      g.beginFill(0xe2e8f0);
      g.lineStyle(1, 0x94a3b8, 0.6);
      // Крылья
      g.drawPolygon([
        new PIXI.Point(-12, -24),
        new PIXI.Point(-24, -42),
        new PIXI.Point(-6, -34),
      ]);
      g.drawPolygon([
        new PIXI.Point(12, -24),
        new PIXI.Point(24, -42),
        new PIXI.Point(6, -34),
      ]);

      // Мантия и торс
      g.drawRoundedRect(-7, -32, 14, 22, 3);

      // Голова
      g.drawCircle(0, -38, 7);

      // Золотой нимб
      g.lineStyle(2, 0xfacc15, 0.9);
      g.drawCircle(0, -42, 10);
      g.endFill();
    } else if (this.def.type === 'FIELD_CHEST') {
      // Сундук
      g.lineStyle(0);
      g.beginFill(0x000000, 0.35);
      g.drawEllipse(0, 4, 16, 6);
      g.endFill();

      if (this.isOpened) {
        // Открытый сундук
        g.beginFill(0x78350f);
        g.lineStyle(2, 0x451a03);
        g.drawRoundedRect(-14, -12, 28, 16, 3);
        g.endFill();

        // Открытая крышка
        g.beginFill(0x92400e);
        g.drawPolygon([
          new PIXI.Point(-14, -12),
          new PIXI.Point(14, -12),
          new PIXI.Point(12, -22),
          new PIXI.Point(-12, -22),
        ]);
        g.endFill();

        // Золотое сияние внутри открытого сундука
        g.lineStyle(0);
        g.beginFill(0xfde047, 0.8);
        g.drawEllipse(0, -10, 8, 4);
        g.endFill();
      } else {
        // Закрытый сундук
        g.beginFill(0x78350f);
        g.lineStyle(2, 0x451a03);
        g.drawRoundedRect(-14, -14, 28, 18, 3);
        g.endFill();

        // Металлические полосы и замок
        g.lineStyle(0);
        g.beginFill(0xfacc15);
        g.drawRect(-12, -14, 4, 18);
        g.drawRect(8, -14, 4, 18);
        // Золотой замочек
        g.drawRoundedRect(-3, -7, 6, 8, 2);
        g.endFill();
      }
    }
  }

  public update(dt: number): void {
    this.animTimer += dt;

    if (this.def.type === 'GODDESS_STATUE') {
      // Аура золотого сияния Богини
      this.auraGraphics.clear();
      const alpha = 0.25 + Math.sin(this.animTimer * 2) * 0.15;
      this.auraGraphics.beginFill(0xfde047, alpha);
      this.auraGraphics.drawCircle(0, -24, 34 + Math.sin(this.animTimer * 1.5) * 4);
      this.auraGraphics.endFill();

      this.auraGraphics.lineStyle(1.5, 0xfbbf24, alpha * 1.2);
      this.auraGraphics.drawCircle(0, -24, 44);
    }

    // Отрисовка прогресс-бара открывания сундука
    this.progressBar.clear();
    if (this.isChanneling && this.channelProgress > 0 && this.channelProgress < 1) {
      const barW = 36;
      const barH = 5;
      const barY = -22;

      // Фон полосы
      this.progressBar.beginFill(0x0f172a, 0.85);
      this.progressBar.lineStyle(1, 0x475569);
      this.progressBar.drawRoundedRect(-barW / 2, barY, barW, barH, 2);
      this.progressBar.endFill();

      // Заполнение прогресса
      this.progressBar.lineStyle(0);
      this.progressBar.beginFill(0x22c55e);
      this.progressBar.drawRoundedRect(
        -barW / 2 + 1,
        barY + 1,
        Math.max(2, (barW - 2) * this.channelProgress),
        barH - 2,
        1
      );
      this.progressBar.endFill();
    }
  }

  public destroy(): void {
    this.root.destroy({ children: true });
  }
}
