import * as PIXI from 'pixi.js';

export type FalconState = 'IDLE' | 'DIVING' | 'RETURNING';

export class FalconCompanion {
  public root = new PIXI.Container();
  private gfx = new PIXI.Graphics();
  public x: number = 0;
  public y: number = 0;

  private state: FalconState = 'IDLE';
  private targetX: number = 0;
  private targetY: number = 0;
  private onImpact?: () => void;

  private flapTimer: number = 0;
  private hoverTimer: number = 0;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.root.position.set(this.x, this.y);
    this.root.addChild(this.gfx);
    this.drawFalcon(0, 1);
  }

  public triggerDive(targetX: number, targetY: number, onImpact?: () => void): void {
    this.state = 'DIVING';
    this.targetX = targetX;
    this.targetY = targetY;
    this.onImpact = onImpact;
  }

  public update(dt: number, playerX: number, playerY: number, facingDir: number): void {
    this.flapTimer += dt * (this.state === 'DIVING' ? 22 : 8);
    this.hoverTimer += dt * 4;

    const wingPhase = Math.sin(this.flapTimer);

    if (this.state === 'IDLE') {
      // Парение у плеча игрока
      const desiredX = playerX - facingDir * 28;
      const desiredY = playerY - 32 + Math.sin(this.hoverTimer) * 3;

      this.x += (desiredX - this.x) * Math.min(1, dt * 7);
      this.y += (desiredY - this.y) * Math.min(1, dt * 7);

      this.drawFalcon(wingPhase, facingDir);
    } else if (this.state === 'DIVING') {
      // Стремительное пике к цели
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 18) {
        this.onImpact?.();
        this.onImpact = undefined;
        this.state = 'RETURNING';
      } else {
        const speed = 680;
        this.x += (dx / dist) * speed * dt;
        this.y += (dy / dist) * speed * dt;
        this.drawFalcon(wingPhase, dx >= 0 ? 1 : -1, true);
      }
    } else if (this.state === 'RETURNING') {
      // Возврат к плечу героя
      const desiredX = playerX - facingDir * 28;
      const desiredY = playerY - 32;
      const dx = desiredX - this.x;
      const dy = desiredY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 20) {
        this.state = 'IDLE';
      } else {
        const speed = 460;
        this.x += (dx / dist) * speed * dt;
        this.y += (dy / dist) * speed * dt;
        this.drawFalcon(wingPhase, dx >= 0 ? 1 : -1);
      }
    }

    this.root.position.set(this.x, this.y);
  }

  private drawFalcon(wingPhase: number, facingDir: number, isDiving: boolean = false): void {
    this.gfx.clear();

    const dir = facingDir >= 0 ? 1 : -1;
    const wingH = wingPhase * 7;

    // Хвост
    this.gfx.beginFill(0x78350f);
    this.gfx.drawPolygon([
      new PIXI.Point(-dir * 8, 2),
      new PIXI.Point(-dir * 14, 4),
      new PIXI.Point(-dir * 12, -1),
    ]);
    this.gfx.endFill();

    // Тело
    this.gfx.beginFill(0xb45309);
    this.gfx.drawEllipse(0, 0, 7, 5);
    this.gfx.endFill();

    // Белая грудка
    this.gfx.beginFill(0xfef3c7);
    this.gfx.drawEllipse(dir * 2, 1, 4, 3);
    this.gfx.endFill();

    // Голова
    this.gfx.beginFill(0x92400e);
    this.gfx.drawCircle(dir * 6, -2, 4);
    this.gfx.endFill();

    // Желтый клюв
    this.gfx.beginFill(0xf59e0b);
    this.gfx.drawPolygon([
      new PIXI.Point(dir * 9, -2),
      new PIXI.Point(dir * 13, -1),
      new PIXI.Point(dir * 9, 1),
    ]);
    this.gfx.endFill();

    // Глаз
    this.gfx.beginFill(0x0f172a);
    this.gfx.drawCircle(dir * 7, -3, 1.2);
    this.gfx.endFill();

    // Крыло (анимированное)
    this.gfx.beginFill(0xd97706);
    this.gfx.lineStyle(1, 0x78350f, 0.7);
    if (isDiving) {
      // Сложенные назад крылья во время пике
      this.gfx.drawPolygon([
        new PIXI.Point(-dir * 2, -1),
        new PIXI.Point(-dir * 12, -6),
        new PIXI.Point(dir * 3, 2),
      ]);
    } else {
      // Размах крыла
      this.gfx.drawPolygon([
        new PIXI.Point(-dir * 4, 1),
        new PIXI.Point(0, -7 - wingH),
        new PIXI.Point(dir * 4, 0),
      ]);
    }
    this.gfx.endFill();
  }

  public destroy(): void {
    if (this.root.parent) {
      this.root.parent.removeChild(this.root);
    }
    if (!this.root.destroyed) {
      this.root.destroy({ children: true });
    }
  }
}
