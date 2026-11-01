import * as PIXI from 'pixi.js';
import { Monster } from './Monster';

export type ProjectileType = 'ARROW' | 'MANA_ORB' | 'ARCANE_BOLT';

export interface ProjectileOptions {
  type: ProjectileType;
  startX: number;
  startY: number;
  targetMonster: Monster | null;
  targetX: number;
  targetY: number;
  speed: number;
  isHoming?: boolean;
  onHit: (target: Monster | null) => void;
}

export class Projectile {
  public root = new PIXI.Container();
  private gfx = new PIXI.Graphics();
  private trailGfx = new PIXI.Graphics();

  public x: number;
  public y: number;
  public isDead: boolean = false;

  private type: ProjectileType;
  private targetMonster: Monster | null;
  private targetX: number;
  private targetY: number;
  private speed: number;
  private isHoming: boolean;
  private onHit: (target: Monster | null) => void;
  private lifetime: number = 0;
  private trailHistory: Array<{ x: number; y: number; alpha: number }> = [];

  constructor(options: ProjectileOptions) {
    this.type = options.type;
    this.x = options.startX;
    this.y = options.startY;
    this.targetMonster = options.targetMonster;
    this.targetX = options.targetX;
    this.targetY = options.targetY;
    this.speed = options.speed;
    this.isHoming = options.isHoming ?? (this.type === 'MANA_ORB' || this.type === 'ARCANE_BOLT');
    this.onHit = options.onHit;

    this.root.addChild(this.trailGfx);
    this.root.addChild(this.gfx);
    this.root.position.set(this.x, this.y);

    this.drawProjectile();
  }

  private drawProjectile(): void {
    this.gfx.clear();

    if (this.type === 'ARROW') {
      // 1. Древко стрелы
      this.gfx.lineStyle(2, 0x78350f, 1);
      this.gfx.moveTo(-10, 0);
      this.gfx.lineTo(8, 0);

      // 2. Наконечник
      this.gfx.lineStyle(0);
      this.gfx.beginFill(0x94a3b8);
      this.gfx.drawPolygon([
        new PIXI.Point(12, 0),
        new PIXI.Point(6, -3),
        new PIXI.Point(6, 3),
      ]);
      this.gfx.endFill();

      // 3. Оперение
      this.gfx.beginFill(0xffffff);
      this.gfx.drawPolygon([
        new PIXI.Point(-10, 0),
        new PIXI.Point(-14, -3),
        new PIXI.Point(-11, 0),
      ]);
      this.gfx.drawPolygon([
        new PIXI.Point(-10, 0),
        new PIXI.Point(-14, 3),
        new PIXI.Point(-11, 0),
      ]);
      this.gfx.endFill();
    } else if (this.type === 'MANA_ORB') {
      // Светящаяся сфера маны (голубая/синяя)
      this.gfx.beginFill(0x38bdf8, 0.45);
      this.gfx.drawCircle(0, 0, 7);
      this.gfx.endFill();

      this.gfx.beginFill(0x0284c7, 0.85);
      this.gfx.drawCircle(0, 0, 4.5);
      this.gfx.endFill();

      this.gfx.beginFill(0xffffff, 0.95);
      this.gfx.drawCircle(-1.5, -1.5, 2);
      this.gfx.endFill();
    } else {
      // Арканный сгусток магии (фиолетовый)
      this.gfx.beginFill(0xc084fc, 0.45);
      this.gfx.drawCircle(0, 0, 8);
      this.gfx.endFill();

      this.gfx.beginFill(0x9333ea, 0.85);
      this.gfx.drawCircle(0, 0, 5);
      this.gfx.endFill();

      this.gfx.beginFill(0xffffff, 0.95);
      this.gfx.drawCircle(-1.5, -1.5, 2);
      this.gfx.endFill();
    }
  }

  public update(dt: number): void {
    if (this.isDead) return;

    this.lifetime += dt;
    if (this.lifetime > 4.0) {
      this.destroy();
      return;
    }

    // Обновление координат цели при самонаведении
    if (this.isHoming && this.targetMonster && !this.targetMonster.isDead()) {
      this.targetX = this.targetMonster.x;
      this.targetY = this.targetMonster.y - 12; // Центр туловища моба
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    // Достижение цели
    const moveStep = this.speed * dt;
    if (dist <= Math.max(14, moveStep)) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.onHit(this.targetMonster);
      this.destroy();
      return;
    }

    // Движение вперед
    const angle = Math.atan2(dy, dx);
    this.x += Math.cos(angle) * moveStep;
    this.y += Math.sin(angle) * moveStep;

    this.root.position.set(this.x, this.y);
    this.gfx.rotation = angle;

    // Хвост частиц для магии
    if (this.type === 'MANA_ORB' || this.type === 'ARCANE_BOLT') {
      this.trailHistory.push({ x: this.x, y: this.y, alpha: 0.6 });
      if (this.trailHistory.length > 5) {
        this.trailHistory.shift();
      }

      this.trailGfx.clear();
      const color = this.type === 'MANA_ORB' ? 0x38bdf8 : 0xa855f7;
      for (let i = 0; i < this.trailHistory.length; i++) {
        const pt = this.trailHistory[i];
        const relX = pt.x - this.x;
        const relY = pt.y - this.y;
        const a = (i + 1) / this.trailHistory.length * 0.45;
        this.trailGfx.beginFill(color, a);
        this.trailGfx.drawCircle(relX, relY, 2 + i * 0.5);
        this.trailGfx.endFill();
      }
    }
  }

  public destroy(): void {
    this.isDead = true;
    this.root.destroy({ children: true });
  }
}
