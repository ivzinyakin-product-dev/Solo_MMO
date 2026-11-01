import * as PIXI from 'pixi.js';
import { ItemDef, CardDef, InventoryItem } from '../types/game.types';
import { ITEMS_DATABASE } from '../data/items.data';
import { CARDS_DATABASE } from '../data/cards.data';
import { VfxSystem } from '../systems/VfxSystem';

export class LootDrop {
  public root = new PIXI.Container();
  public x: number;
  public y: number;
  public z: number = 0; // Высота над землёй

  public itemDef?: ItemDef;
  public cardDef?: CardDef;
  public equipmentInstance?: InventoryItem;
  public isCard: boolean = false;
  public isLanded: boolean = false;
  public isCollected: boolean = false;

  private shadow = new PIXI.Graphics();
  private spriteContainer = new PIXI.Container();
  private graphics = new PIXI.Graphics();

  // Физика броска
  private vx: number;
  private vy: number;
  private vz: number;
  private gravity: number = 550;
  private bounceCount: number = 0;
  private cardBeamHandle?: { destroy: () => void };

  // Анимация парения после приземления
  private hoverTimer: number = Math.random() * 5;

  constructor(
    startX: number,
    startY: number,
    lootId: string,
    isCard: boolean = false,
    vfxSystem?: VfxSystem,
    equipmentInstance?: InventoryItem
  ) {
    this.x = startX;
    this.y = startY;
    this.isCard = isCard;
    this.equipmentInstance = equipmentInstance;

    if (isCard) {
      this.cardDef = CARDS_DATABASE[lootId];
    } else {
      this.itemDef = ITEMS_DATABASE[lootId];
    }

    // Случайный начальный импульс вылета
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 70;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.vz = 200 + Math.random() * 60; // Вертикальный прыжок

    this.buildVisuals();

    // Для карты или Реликвии/Эпика создаём световой столб в небеса
    if (vfxSystem) {
      if (
        this.isCard ||
        equipmentInstance?.rarity === 'LEGENDARY' ||
        equipmentInstance?.rarity === 'EPIC'
      ) {
        this.cardBeamHandle = vfxSystem.createCardLightPillar(this.x, this.y);
      }
    }
  }

  private buildVisuals(): void {
    // 1. Тень на земле
    this.shadow.beginFill(0x000000, 0.3);
    this.shadow.drawEllipse(0, 0, 10, 5);
    this.shadow.endFill();
    this.root.addChild(this.shadow);

    // 2. Визуальный узел предмета (поднимается по z)
    this.spriteContainer.addChild(this.graphics);
    this.root.addChild(this.spriteContainer);

    this.renderItemGraphics();
    this.root.position.set(this.x, this.y);
  }

  private renderItemGraphics(): void {
    this.graphics.clear();

    if (this.isCard) {
      // Иллюстрация Карты (золотая карточка)
      this.graphics.beginFill(0xf59e0b);
      this.graphics.drawRoundedRect(-9, -12, 18, 24, 3);
      this.graphics.endFill();

      this.graphics.beginFill(0x1e293b);
      this.graphics.drawRoundedRect(-7, -10, 14, 20, 2);
      this.graphics.endFill();

      this.graphics.beginFill(0xfef08a);
      this.graphics.drawCircle(0, 0, 4);
      this.graphics.endFill();
    } else if (this.itemDef) {
      const color = this.itemDef.visualColor || 0x38bdf8;

      if (this.itemDef.type === 'consumable') {
        // Колба с зельем
        this.graphics.beginFill(color);
        this.graphics.drawCircle(0, -6, 7);
        this.graphics.endFill();

        this.graphics.beginFill(0x78350f);
        this.graphics.drawRect(-2.5, -16, 5, 4);
        this.graphics.endFill();
      } else if (this.itemDef.type === 'equip') {
        // Оружие / экипировка (сияющий ромб / щит)
        this.graphics.beginFill(0xf1f5f9);
        this.graphics.drawPolygon([
          new PIXI.Point(0, -18),
          new PIXI.Point(7, -8),
          new PIXI.Point(0, 2),
          new PIXI.Point(-7, -8),
        ]);
        this.graphics.endFill();

        this.graphics.beginFill(color);
        this.graphics.drawCircle(0, -8, 3);
        this.graphics.endFill();
      } else {
        // Материал (кристалл Джеллопи / пух)
        this.graphics.beginFill(color);
        this.graphics.drawPolygon([
          new PIXI.Point(0, -15),
          new PIXI.Point(8, -8),
          new PIXI.Point(5, 2),
          new PIXI.Point(-5, 2),
          new PIXI.Point(-8, -8),
        ]);
        this.graphics.endFill();
      }
    }
  }

  public update(dt: number, playerX: number, playerY: number, inCampRange: boolean): void {
    if (this.isCollected) return;

    // 1. Физика параболического падения
    if (!this.isLanded) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.z += this.vz * dt;
      this.vz -= this.gravity * dt;

      if (this.z <= 0) {
        this.z = 0;
        this.bounceCount += 1;
        if (this.bounceCount < 2) {
          this.vz = 85; // Мягкий отскок
          this.vx *= 0.5;
          this.vy *= 0.5;
        } else {
          this.isLanded = true;
          this.vx = 0;
          this.vy = 0;
          this.vz = 0;
        }
      }
    } else {
      // 2. Плавное покачивание на земле
      this.hoverTimer += dt * 3.5;
      this.spriteContainer.y = -6 + Math.sin(this.hoverTimer) * 3;

      // 3. Магнит к игроку (если игрок близко или включён костёр)
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const dist = Math.hypot(dx, dy);

      const magnetDistance = inCampRange ? 350 : 55;
      if (dist <= magnetDistance) {
        const pullSpeed = Math.min(420, 160 + (magnetDistance - dist) * 2.5);
        this.x += (dx / dist) * pullSpeed * dt;
        this.y += (dy / dist) * pullSpeed * dt;
      }
    }

    // Синхронизация позиции
    this.root.position.set(this.x, this.y);
    if (!this.isLanded) {
      this.spriteContainer.y = -this.z;
    }
  }

  public destroy(): void {
    if (this.cardBeamHandle) {
      this.cardBeamHandle.destroy();
    }
    this.root.destroy({ children: true });
  }
}
