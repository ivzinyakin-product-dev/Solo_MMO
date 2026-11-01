import * as PIXI from 'pixi.js';
import { Projectile, ProjectileOptions, ProjectileType } from '../entities/Projectile';
import { Monster } from '../entities/Monster';

export class ProjectileSystem {
  private container: PIXI.Container;
  public projectiles: Projectile[] = [];

  constructor(container: PIXI.Container) {
    this.container = container;
  }

  public spawnArrow(
    startX: number,
    startY: number,
    targetMonster: Monster,
    onHit: (target: Monster | null) => void
  ): Projectile {
    const proj = new Projectile({
      type: 'ARROW',
      startX,
      startY,
      targetMonster,
      targetX: targetMonster.x,
      targetY: targetMonster.y - 10,
      speed: 580,
      isHoming: false,
      onHit,
    });

    this.container.addChild(proj.root);
    this.projectiles.push(proj);
    return proj;
  }

  public spawnManaOrb(
    startX: number,
    startY: number,
    targetMonster: Monster,
    onHit: (target: Monster | null) => void
  ): Projectile {
    const proj = new Projectile({
      type: 'MANA_ORB',
      startX,
      startY,
      targetMonster,
      targetX: targetMonster.x,
      targetY: targetMonster.y - 12,
      speed: 460,
      isHoming: true,
      onHit,
    });

    this.container.addChild(proj.root);
    this.projectiles.push(proj);
    return proj;
  }

  public spawnArcaneBolt(
    startX: number,
    startY: number,
    targetMonster: Monster,
    onHit: (target: Monster | null) => void,
    delayMs: number = 0
  ): void {
    if (delayMs > 0) {
      setTimeout(() => {
        if (targetMonster && !targetMonster.isDead()) {
          this.createAndAddBolt(startX, startY, targetMonster, onHit);
        }
      }, delayMs);
    } else {
      this.createAndAddBolt(startX, startY, targetMonster, onHit);
    }
  }

  private createAndAddBolt(
    startX: number,
    startY: number,
    targetMonster: Monster,
    onHit: (target: Monster | null) => void
  ): Projectile {
    const proj = new Projectile({
      type: 'ARCANE_BOLT',
      startX,
      startY,
      targetMonster,
      targetX: targetMonster.x,
      targetY: targetMonster.y - 12,
      speed: 490,
      isHoming: true,
      onHit,
    });

    this.container.addChild(proj.root);
    this.projectiles.push(proj);
    return proj;
  }

  public update(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt);
      if (p.isDead) {
        this.container.removeChild(p.root);
        this.projectiles.splice(i, 1);
      }
    }
  }

  public clear(): void {
    for (const p of this.projectiles) {
      this.container.removeChild(p.root);
      p.destroy();
    }
    this.projectiles = [];
  }
}
