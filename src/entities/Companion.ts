import * as PIXI from 'pixi.js';
import { Player } from './Player';
import { ChibiPuppet } from './ChibiPuppet';
import { SoundFX } from '../core/SoundFX';
import { EventBus } from '../core/EventBus';

export class Companion {
  public puppet: ChibiPuppet;
  public x: number = 0;
  public y: number = 0;
  public isHired: boolean = false;

  private healCooldown: number = 0;
  private buffCooldown: number = 10;
  private haloGraphics = new PIXI.Graphics();

  constructor(startX: number, startY: number) {
    this.x = startX - 45;
    this.y = startY + 20;

    this.puppet = new ChibiPuppet({
      type: 'hero',
      hasWeapon: false,
    });

    this.buildPriestVisuals();
    this.puppet.root.position.set(this.x, this.y);
  }

  private buildPriestVisuals(): void {
    // Бело-золотая мантия Приста
    const bodyGfx = (this.puppet as any).bodyGraphics as PIXI.Graphics;
    if (bodyGfx) {
      bodyGfx.clear();

      // Обувь
      bodyGfx.beginFill(0x94a3b8);
      bodyGfx.drawRoundedRect(-10, -6, 7, 6, 2);
      bodyGfx.drawRoundedRect(3, -6, 7, 6, 2);
      bodyGfx.endFill();

      // Белая ряса
      bodyGfx.beginFill(0xf8fafc);
      bodyGfx.drawRoundedRect(-13, -28, 26, 24, 5);
      bodyGfx.endFill();

      // Синий пояс с золотом
      bodyGfx.beginFill(0x2563eb);
      bodyGfx.drawRect(-13, -16, 26, 3);
      bodyGfx.beginFill(0xf59e0b);
      bodyGfx.drawCircle(0, -15, 3);
      bodyGfx.endFill();

      // Голова
      bodyGfx.beginFill(0xfed7aa);
      bodyGfx.drawCircle(0, -38, 14);
      bodyGfx.endFill();

      // Светлые волосы (каре)
      bodyGfx.beginFill(0xfef08a);
      bodyGfx.drawEllipse(0, -46, 15, 8);
      bodyGfx.drawRoundedRect(-15, -44, 5, 12, 2);
      bodyGfx.drawRoundedRect(10, -44, 5, 12, 2);
      bodyGfx.endFill();

      // Добрые глазки
      bodyGfx.beginFill(0x1e3a8a);
      bodyGfx.drawCircle(-4, -38, 2);
      bodyGfx.drawCircle(4, -38, 2);
      bodyGfx.endFill();
    }

    // Золотой нимб над головой
    this.haloGraphics.clear();
    this.haloGraphics.lineStyle(2, 0xfde047, 0.9);
    this.haloGraphics.drawEllipse(0, -62, 10, 4);
    this.puppet.pivot.addChild(this.haloGraphics);
  }

  public update(dt: number, player: Player, floatingTexts: any): void {
    if (!this.isHired) {
      this.puppet.root.visible = false;
      return;
    }
    this.puppet.root.visible = true;

    if (this.healCooldown > 0) this.healCooldown -= dt;
    if (this.buffCooldown > 0) this.buffCooldown -= dt;

    // 1. Плавное следование за героем на комфортной дистанции (~65px)
    const targetX = player.x - player.puppet.facingDir * 55;
    const targetY = player.y + 15;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 15) {
      const speed = Math.min(320, 140 + dist * 1.5);
      this.x += (dx / dist) * speed * dt;
      this.y += (dy / dist) * speed * dt;
      this.puppet.setFacing(player.x - this.x);
      this.puppet.isMoving = true;
    } else {
      this.puppet.isMoving = false;
    }

    // 2. Авто-хил героя при падении здоровья ниже 50%
    if (player.currentHp < player.derivedStats.maxHp * 0.5 && this.healCooldown <= 0) {
      this.healCooldown = 4.5;
      const healAmount = Math.floor(75 + player.level * 8);
      player.heal(healAmount);
      SoundFX.playHeal();
      floatingTexts.spawn(player.x, player.y - 25, `+${healAmount}💚`, {
        color: 0x4ade80,
        isHeal: true,
      });
      EventBus.emit('COMBAT_LOG', {
        message: `✨ Напарник-Прист применил [Исцеление] (+${healAmount} HP)!`,
        color: '#4ade80',
      });
    }

    // 3. Периодическое наложение баффа Песнь Ангела
    if (this.buffCooldown <= 0) {
      this.buffCooldown = 25;
      SoundFX.playLevelUp();
      floatingTexts.spawn(player.x, player.y - 25, 'ANGEL SONG!★', {
        color: 0xfde047,
        isCrit: true,
      });

      const existingIdx = player.activeBuffs.findIndex((b) => b.id === 'buff_angel_song');
      if (existingIdx !== -1) {
        player.activeBuffs[existingIdx].duration = 25;
      } else {
        player.activeBuffs.push({
          id: 'buff_angel_song',
          name: 'Песнь Ангела',
          icon: '😇',
          statKey: 'atk',
          value: 0.15,
          duration: 25,
          maxDuration: 25,
        });
      }
      player.recalculateStats();
      EventBus.emit('BUFFS_UPDATED', { buffs: [...player.activeBuffs] });

      EventBus.emit('COMBAT_LOG', {
        message: '😇 Напарник сыграл вам: [Песнь Ангела] (+15% к ATK на 25 сек)!',
        color: '#fbbf24',
      });
    }

    this.puppet.root.position.set(this.x, this.y);
    this.puppet.updateAnimation(dt);
  }

  public destroy(): void {
    this.puppet.root.destroy({ children: true });
  }
}
