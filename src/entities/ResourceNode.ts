import * as PIXI from 'pixi.js';
import { ResourceNodeDef, ResourceNodeType } from '../types/game.types';
import { ITEMS_DATABASE } from '../data/items.data';

export class ResourceNode {
  public def: ResourceNodeDef;
  public root: PIXI.Container;
  public x: number;
  public y: number;

  public isDepleted: boolean = false;
  public respawnTimer: number = 0;
  public channelProgress: number = 0; // 0..1
  public isChanneling: boolean = false;

  private shadowGraphics: PIXI.Graphics;
  private nodeGraphics: PIXI.Graphics;
  private auraGraphics: PIXI.Graphics;
  private progressBar: PIXI.Graphics;
  private labelContainer: PIXI.Container;
  private labelText: PIXI.Text;
  private labelBg: PIXI.Graphics;
  private animTimer: number = Math.random() * 5;

  constructor(def: ResourceNodeDef, onInteract?: (node: ResourceNode) => void) {
    this.def = def;
    this.x = def.x;
    this.y = def.y;

    this.root = new PIXI.Container();
    this.root.position.set(this.x, this.y);

    this.shadowGraphics = new PIXI.Graphics();
    this.auraGraphics = new PIXI.Graphics();
    this.nodeGraphics = new PIXI.Graphics();
    this.progressBar = new PIXI.Graphics();

    this.root.addChild(this.shadowGraphics);
    this.root.addChild(this.auraGraphics);
    this.root.addChild(this.nodeGraphics);
    this.root.addChild(this.progressBar);

    // Парящая метка над жилой/кустом
    this.labelContainer = new PIXI.Container();
    this.labelContainer.position.set(0, -32);

    this.labelBg = new PIXI.Graphics();
    this.labelText = new PIXI.Text(this.getLabelString(), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 10,
      fontWeight: 'bold',
      fill: this.getLabelColor(),
      stroke: 0x0f172a,
      strokeThickness: 3,
      align: 'center',
    });
    this.labelText.anchor.set(0.5);

    this.labelContainer.addChild(this.labelBg);
    this.labelContainer.addChild(this.labelText);
    this.root.addChild(this.labelContainer);

    this.updateLabelBg();
    this.renderVisual();

    // Интерактивный клик
    this.root.eventMode = 'static';
    this.root.cursor = 'pointer';
    if (onInteract) {
      this.root.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        onInteract(this);
      });
    }
  }

  private getLabelString(): string {
    if (this.isDepleted) {
      return `⏳ ${this.def.name} (Пусто)`;
    }
    const icon = this.getNodeIcon();
    return `${icon} ${this.def.name}`;
  }

  private getNodeIcon(): string {
    switch (this.def.type) {
      case 'COPPER_VEIN':
        return '🥉';
      case 'IRON_VEIN':
        return '⛏️';
      case 'MITHRIL_VEIN':
        return '⚙️';
      case 'ORIDECON_VEIN':
        return '🔮';
      case 'DRAGONITE_VEIN':
        return '🌋';
      case 'RED_HERB_BUSH':
        return '🌺';
      case 'BLUE_HERB_BUSH':
        return '🪻';
      case 'AMBER_HERB_BUSH':
        return '🌾';
      case 'WHITE_HERB_BUSH':
        return '🌼';
      case 'STAR_FLOWER_BUSH':
        return '✨';
    }
  }

  private getLabelColor(): number {
    if (this.isDepleted) return 0x94a3b8;
    switch (this.def.type) {
      case 'COPPER_VEIN':
        return 0xfdba74;
      case 'IRON_VEIN':
        return 0xe2e8f0;
      case 'MITHRIL_VEIN':
        return 0x22d3ee;
      case 'ORIDECON_VEIN':
        return 0xe9d5ff;
      case 'DRAGONITE_VEIN':
        return 0xfca5a5;
      case 'RED_HERB_BUSH':
        return 0xfca5a5;
      case 'BLUE_HERB_BUSH':
        return 0x93c5fd;
      case 'AMBER_HERB_BUSH':
        return 0xfcd34d;
      case 'WHITE_HERB_BUSH':
        return 0xf8fafc;
      case 'STAR_FLOWER_BUSH':
        return 0xfde047;
    }
  }

  private updateLabelBg(): void {
    this.labelBg.clear();
    const w = this.labelText.width + 12;
    const h = this.labelText.height + 4;
    this.labelBg.beginFill(0x0f172a, 0.85);
    this.labelBg.lineStyle(1.5, this.isDepleted ? 0x475569 : this.getLabelColor(), 0.8);
    this.labelBg.drawRoundedRect(-w / 2, -h / 2, w, h, 5);
    this.labelBg.endFill();
  }

  public renderVisual(): void {
    const g = this.nodeGraphics;
    const s = this.shadowGraphics;
    g.clear();
    s.clear();

    // 1. Тень от объекта
    s.beginFill(0x000000, 0.35);
    s.drawEllipse(0, 4, 18, 7);
    s.endFill();

    if (this.isDepleted) {
      // Истощенный вид (расколотый камень или голые ветви)
      g.beginFill(0x334155);
      g.lineStyle(1.5, 0x1e293b);
      g.drawPolygon([
        new PIXI.Point(-14, 2),
        new PIXI.Point(-10, -6),
        new PIXI.Point(0, -4),
        new PIXI.Point(12, -2),
        new PIXI.Point(14, 3),
        new PIXI.Point(0, 6),
      ]);
      g.endFill();

      g.lineStyle(1, 0x475569, 0.7);
      g.moveTo(-4, -4);
      g.lineTo(2, 3);
      return;
    }

    const isVein = this.def.type.includes('VEIN');

    if (isVein) {
      this.renderMineralVein(g);
    } else {
      this.renderHerbBush(g);
    }
  }

  private renderMineralVein(g: PIXI.Graphics): void {
    let mineralColor = 0xb45309;
    let highlightColor = 0xf59e0b;
    let facetColor = 0xd97706;

    if (this.def.type === 'IRON_VEIN') {
      mineralColor = 0x64748b;
      highlightColor = 0xf1f5f9;
      facetColor = 0x94a3b8;
    } else if (this.def.type === 'MITHRIL_VEIN') {
      mineralColor = 0x0891b2;
      highlightColor = 0xa5f3fc;
      facetColor = 0x22d3ee;
    } else if (this.def.type === 'ORIDECON_VEIN') {
      mineralColor = 0x7e22ce;
      highlightColor = 0xf3e8ff;
      facetColor = 0xa855f7;
    } else if (this.def.type === 'DRAGONITE_VEIN') {
      mineralColor = 0x991b1b;
      highlightColor = 0xfecaca;
      facetColor = 0xef4444;
    }

    // Базовый валун
    g.beginFill(0x1e293b);
    g.lineStyle(1.5, 0x0f172a);
    g.drawPolygon([
      new PIXI.Point(-16, 4),
      new PIXI.Point(-14, -12),
      new PIXI.Point(-2, -20),
      new PIXI.Point(12, -14),
      new PIXI.Point(16, 4),
      new PIXI.Point(2, 8),
    ]);
    g.endFill();

    // Грани камня
    g.beginFill(0x334155);
    g.drawPolygon([
      new PIXI.Point(-14, -12),
      new PIXI.Point(-2, -20),
      new PIXI.Point(0, -6),
      new PIXI.Point(-10, 0),
    ]);
    g.endFill();

    // Кристаллические друзы / рудные жилы
    g.lineStyle(1, highlightColor, 0.9);
    g.beginFill(facetColor);
    g.drawPolygon([
      new PIXI.Point(-6, -16),
      new PIXI.Point(4, -22),
      new PIXI.Point(8, -12),
      new PIXI.Point(-1, -8),
    ]);
    g.endFill();

    g.beginFill(mineralColor);
    g.drawPolygon([
      new PIXI.Point(-8, -4),
      new PIXI.Point(-1, -8),
      new PIXI.Point(6, -2),
      new PIXI.Point(1, 4),
    ]);
    g.endFill();

    // Металлический блик / искры
    g.lineStyle(0);
    g.beginFill(0xffffff, 0.9);
    g.drawCircle(3, -18, 1.8);
    g.drawCircle(-3, -12, 1.2);
    g.endFill();
  }

  private renderHerbBush(g: PIXI.Graphics): void {
    let flowerColor = 0xef4444;
    let flowerGlow = 0xfca5a5;

    if (this.def.type === 'BLUE_HERB_BUSH') {
      flowerColor = 0x3b82f6;
      flowerGlow = 0x93c5fd;
    } else if (this.def.type === 'AMBER_HERB_BUSH') {
      flowerColor = 0xf59e0b;
      flowerGlow = 0xfef08a;
    } else if (this.def.type === 'WHITE_HERB_BUSH') {
      flowerColor = 0xe2e8f0;
      flowerGlow = 0xffffff;
    } else if (this.def.type === 'STAR_FLOWER_BUSH') {
      flowerColor = 0xeab308;
      flowerGlow = 0xfef9c3;
    }

    // Пышные круглые листья куста
    g.lineStyle(1.5, 0x14532d);
    g.beginFill(0x15803d);
    g.drawCircle(-8, -4, 10);
    g.drawCircle(8, -4, 10);
    g.drawCircle(0, -12, 11);
    g.endFill();

    g.beginFill(0x22c55e);
    g.lineStyle(0);
    g.drawCircle(-5, -6, 7);
    g.drawCircle(5, -6, 7);
    g.drawCircle(0, -13, 8);
    g.endFill();

    // Цветы / лепестки
    g.lineStyle(1, flowerGlow);
    g.beginFill(flowerColor);
    // Левый цветок
    g.drawCircle(-7, -10, 3.5);
    // Правый цветок
    g.drawCircle(7, -8, 3.5);
    // Верхний центральный цветок
    g.drawCircle(1, -17, 4);
    g.endFill();

    // Сердцевинки цветов
    g.beginFill(this.def.type === 'STAR_FLOWER_BUSH' ? 0xffffff : 0xfacc15);
    g.drawCircle(-7, -10, 1.2);
    g.drawCircle(7, -8, 1.2);
    g.drawCircle(1, -17, 1.5);
    g.endFill();
  }

  public update(dt: number): void {
    this.animTimer += dt;

    if (this.isDepleted) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
    } else {
      // Мягкое свечение для магических жил и редких трав
      let auraColor: number | null = null;
      if (this.def.type === 'MITHRIL_VEIN') auraColor = 0x22d3ee;
      else if (this.def.type === 'ORIDECON_VEIN') auraColor = 0xa855f7;
      else if (this.def.type === 'DRAGONITE_VEIN') auraColor = 0xef4444;
      else if (this.def.type === 'BLUE_HERB_BUSH') auraColor = 0x38bdf8;
      else if (this.def.type === 'WHITE_HERB_BUSH') auraColor = 0xffffff;
      else if (this.def.type === 'STAR_FLOWER_BUSH') auraColor = 0xfacc15;

      if (auraColor !== null) {
        const pulse = 0.4 + Math.sin(this.animTimer * 2.5) * 0.25;
        this.auraGraphics.clear();
        this.auraGraphics.beginFill(auraColor, pulse * 0.4);
        this.auraGraphics.drawCircle(0, -10, 18 + Math.sin(this.animTimer * 2) * 3);
        this.auraGraphics.endFill();
      } else {
        this.auraGraphics.clear();
      }
    }

    // Прогресс-бар сбора ресурсов (1.2s channel)
    this.progressBar.clear();
    if (this.isChanneling && this.channelProgress > 0) {
      const barW = 34;
      const barH = 5;
      const barY = -22;

      this.progressBar.beginFill(0x0f172a, 0.9);
      this.progressBar.lineStyle(1, 0x475569);
      this.progressBar.drawRoundedRect(-barW / 2, barY, barW, barH, 2);
      this.progressBar.endFill();

      const fillW = Math.max(0, Math.min(barW - 2, (barW - 2) * this.channelProgress));
      this.progressBar.lineStyle(0);
      this.progressBar.beginFill(
        this.def.type.includes('VEIN') ? 0xf59e0b : 0x10b981
      );
      this.progressBar.drawRoundedRect(-barW / 2 + 1, barY + 1, fillW, barH - 2, 1);
      this.progressBar.endFill();
    }
  }

  public deplete(): void {
    this.isDepleted = true;
    this.isChanneling = false;
    this.channelProgress = 0;
    this.respawnTimer = this.def.respawnTimeSec || 20;

    this.labelText.text = this.getLabelString();
    this.labelText.style.fill = this.getLabelColor();
    this.updateLabelBg();
    this.auraGraphics.clear();
    this.renderVisual();
  }

  public respawn(): void {
    this.isDepleted = false;
    this.respawnTimer = 0;
    this.channelProgress = 0;
    this.isChanneling = false;

    this.labelText.text = this.getLabelString();
    this.labelText.style.fill = this.getLabelColor();
    this.updateLabelBg();
    this.renderVisual();
  }

  public harvestLoot(): { itemId: string; count: number; name: string } {
    const min = this.def.minYield || 1;
    const max = this.def.maxYield || 2;
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const def = ITEMS_DATABASE[this.def.yieldItemId];

    return {
      itemId: this.def.yieldItemId,
      count,
      name: def ? def.name : this.def.yieldItemId,
    };
  }

  public destroy(): void {
    this.root.destroy({ children: true });
  }
}
