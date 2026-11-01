import * as PIXI from 'pixi.js';

export class PixiStage {
  public app: PIXI.Application;
  public worldContainer = new PIXI.Container();
  public groundLayer = new PIXI.Container();       // Почва, тропинки, радиус костра
  public ySortLayer = new PIXI.Container();        // Герой, мобы, костёр, деревья, лут
  public vfxLayer = new PIXI.Container();          // Молнии, взмахи меча, АОЕ-эффекты
  public floatingTextLayer = new PIXI.Container(); // Цифры урона, криты, MISS

  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;
  private shakeTimer: number = 0;

  constructor(mountNode: HTMLElement) {
    this.app = new PIXI.Application({
      resizeTo: window,
      backgroundColor: 0x3b6e38,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    mountNode.appendChild(this.app.view as HTMLCanvasElement);

    // Включаем автоматическую сортировку глубины (2.5D эффект)
    this.ySortLayer.sortableChildren = true;

    this.worldContainer.addChild(
      this.groundLayer,
      this.ySortLayer,
      this.vfxLayer,
      this.floatingTextLayer
    );
    this.app.stage.addChild(this.worldContainer);

    this.drawGroundDetails();
  }

  /**
   * Отрисовка фоновой сетки/деталей поляны (трава, плитка, цветочки)
   */
  private drawGroundDetails(): void {
    const bg = new PIXI.Graphics();
    
    // Мягкая сетка травы в радиусе 2000x2000
    const size = 3000;
    const step = 80;
    
    bg.lineStyle(1, 0x346231, 0.4);
    for (let x = -size; x <= size; x += step) {
      bg.moveTo(x, -size);
      bg.lineTo(x, size);
    }
    for (let y = -size; y <= size; y += step) {
      bg.moveTo(-size, y);
      bg.lineTo(size, y);
    }

    // Случайные пучки травы для уюта
    const rng = (seed: number) => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < 200; i++) {
      const gx = (rng(i * 3) - 0.5) * 2400;
      const gy = (rng(i * 3 + 1) - 0.5) * 2400;
      const patchColor = rng(i * 3 + 2) > 0.5 ? 0x488344 : 0x2e592b;
      
      bg.beginFill(patchColor, 0.6);
      bg.drawRoundedRect(gx, gy, 8 + rng(i) * 12, 4 + rng(i + 1) * 6, 2);
      bg.endFill();
    }

    this.groundLayer.addChild(bg);
  }

  public triggerScreenShake(intensity: number = 8, duration: number = 0.22): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  /**
   * Плавное следование камеры за героем
   */
  public updateCamera(targetX: number, targetY: number, dt: number): void {
    const goalX = this.app.screen.width / 2 - targetX;
    const goalY = this.app.screen.height / 2 - targetY;
    
    const smoothFactor = Math.min(1, dt * 7);
    this.worldContainer.x += (goalX - this.worldContainer.x) * smoothFactor;
    this.worldContainer.y += (goalY - this.worldContainer.y) * smoothFactor;

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = Math.max(0, this.shakeTimer / this.shakeDuration);
      const offsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity * progress;
      const offsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity * progress;
      this.worldContainer.x += offsetX;
      this.worldContainer.y += offsetY;
    }
  }

  /**
   * Y-Sorting: сортировка по zIndex = Math.floor(entity.y)
   */
  public updateYSorting(): void {
    const children = this.ySortLayer.children;
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child.destroyed) {
        this.ySortLayer.removeChild(child);
        continue;
      }
      child.zIndex = Math.floor(child.y);
    }
  }

  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX - this.worldContainer.x,
      y: screenY - this.worldContainer.y,
    };
  }

  public destroy(): void {
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }
}
