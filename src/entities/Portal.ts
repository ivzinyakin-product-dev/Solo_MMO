import * as PIXI from 'pixi.js';
import { PortalDef } from '../types/game.types';

export class Portal {
  public root = new PIXI.Container();
  public def: PortalDef;

  private outerCircle = new PIXI.Graphics();
  private innerRune = new PIXI.Graphics();
  private labelText: PIXI.Text;
  private animTimer: number = 0;

  constructor(def: PortalDef) {
    this.def = def;
    this.root.position.set(def.x, def.y);

    this.buildVisuals();
    this.labelText = new PIXI.Text(def.label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 12,
      fontWeight: 'bold',
      fill: 0x38bdf8,
      stroke: 0x0f172a,
      strokeThickness: 3,
      align: 'center',
    });
    this.labelText.anchor.set(0.5, 1);
    this.labelText.position.set(0, -38);
    this.root.addChild(this.labelText);
  }

  private buildVisuals(): void {
    // Внешнее свечение
    this.outerCircle.beginFill(0x0284c7, 0.25);
    this.outerCircle.drawEllipse(0, 0, 36, 18);
    this.outerCircle.endFill();

    this.outerCircle.lineStyle(2, 0x38bdf8, 0.8);
    this.outerCircle.drawEllipse(0, 0, 32, 16);
    this.outerCircle.lineStyle(0);
    this.root.addChild(this.outerCircle);

    // Внутренние рунические лучи
    this.innerRune.lineStyle(2, 0xe0f2fe, 0.9);
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i;
      this.innerRune.moveTo(0, 0);
      this.innerRune.lineTo(Math.cos(angle) * 22, Math.sin(angle) * 11);
    }
    this.root.addChild(this.innerRune);
  }

  public update(dt: number): void {
    this.animTimer += dt * 3;
    this.innerRune.rotation += dt * 1.8;

    const pulse = 1 + Math.sin(this.animTimer) * 0.08;
    this.outerCircle.scale.set(pulse, pulse);
    this.labelText.y = -38 + Math.sin(this.animTimer) * 3;
  }

  public isPlayerNear(playerX: number, playerY: number): boolean {
    const dist = Math.hypot(this.def.x - playerX, this.def.y - playerY);
    return dist <= 48;
  }

  public destroy(): void {
    this.root.destroy({ children: true });
  }
}
