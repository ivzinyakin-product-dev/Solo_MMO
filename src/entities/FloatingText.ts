import * as PIXI from 'pixi.js';

interface ActiveText {
  text: PIXI.Text;
  vx: number;
  vy: number;
  lifetime: number;
  maxLifetime: number;
  isCrit: boolean;
  scaleProgress: number;
}

export class FloatingTextManager {
  private container: PIXI.Container;
  private activeTexts: ActiveText[] = [];

  constructor(container: PIXI.Container) {
    this.container = container;
  }

  public spawn(
    x: number,
    y: number,
    content: string,
    options: {
      color?: number;
      isCrit?: boolean;
      isMiss?: boolean;
      isHeal?: boolean;
    } = {}
  ): void {
    const { color = 0xffffff, isCrit = false, isMiss = false, isHeal = false } = options;

    let fontSize = 16;
    let strokeColor = '#000000';
    let strokeThickness = 3;
    let fontWeight = 'bold';

    if (isCrit) {
      fontSize = 22;
      strokeColor = '#7f1d1d';
      strokeThickness = 4;
      fontWeight = '900';
    } else if (isMiss) {
      fontSize = 14;
      strokeColor = '#0f172a';
      strokeThickness = 2;
    } else if (isHeal) {
      fontSize = 17;
      strokeColor = '#064e3b';
      strokeThickness = 3;
    }

    const pixiText = new PIXI.Text(content, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize,
      fontWeight: fontWeight as any,
      fill: color,
      stroke: strokeColor,
      strokeThickness,
      align: 'center',
    });

    pixiText.anchor.set(0.5, 0.5);
    pixiText.x = x + (Math.random() - 0.5) * 36;
    pixiText.y = y - 10 + (Math.random() - 0.5) * 18;

    if (isCrit) {
      pixiText.scale.set(1.4);
    }

    this.container.addChild(pixiText);

    const maxLifetime = isCrit ? 0.95 : 0.7;
    const vx = isMiss ? (Math.random() > 0.5 ? 40 : -40) : (Math.random() - 0.5) * 45;
    const vy = isCrit ? -80 : -55;

    this.activeTexts.push({
      text: pixiText,
      vx,
      vy,
      lifetime: 0,
      maxLifetime,
      isCrit,
      scaleProgress: 0,
    });
  }

  public update(dt: number): void {
    for (let i = this.activeTexts.length - 1; i >= 0; i--) {
      const item = this.activeTexts[i];
      item.lifetime += dt;

      // Движение вверх
      item.text.x += item.vx * dt;
      item.text.y += item.vy * dt;

      // Затухание к концу жизни
      const progress = item.lifetime / item.maxLifetime;
      if (progress > 0.5) {
        item.text.alpha = Math.max(0, 1 - (progress - 0.5) * 2);
      }

      // Эффект пружинящего масштаба для критов
      if (item.isCrit && item.lifetime < 0.25) {
        const s = 1.4 - Math.sin((item.lifetime / 0.25) * Math.PI) * 0.3;
        item.text.scale.set(s);
      }

      if (item.lifetime >= item.maxLifetime) {
        this.container.removeChild(item.text);
        item.text.destroy();
        this.activeTexts.splice(i, 1);
      }
    }
  }

  public clear(): void {
    for (const item of this.activeTexts) {
      this.container.removeChild(item.text);
      item.text.destroy();
    }
    this.activeTexts = [];
  }
}
