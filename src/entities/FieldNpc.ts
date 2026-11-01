import * as PIXI from 'pixi.js';
import { FieldNpcDef, FieldNpcRole } from '../types/game.types';

export class FieldNpc {
  public def: FieldNpcDef;
  public root: PIXI.Container;
  public x: number;
  public y: number;

  private graphics: PIXI.Graphics;
  private labelText: PIXI.Text;
  private animTimer: number = Math.random() * 5;

  constructor(def: FieldNpcDef, onInteract?: (npc: FieldNpc) => void) {
    this.def = def;
    this.x = def.x;
    this.y = def.y;

    this.root = new PIXI.Container();
    this.root.position.set(this.x, this.y);

    this.graphics = new PIXI.Graphics();
    this.root.addChild(this.graphics);

    // Отрисовка визуала Chibi NPC в зависимости от роли
    this.renderNpcVisual();

    // Создаем парящий бейдж с именем и иконкой над головой
    const badgeContainer = new PIXI.Container();
    badgeContainer.position.set(0, -48);

    const fullTitle = `${def.icon} ${def.name}`;
    this.labelText = new PIXI.Text(fullTitle, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 11,
      fontWeight: 'bold',
      fill: 0xfffbeb,
      stroke: 0x0f172a,
      strokeThickness: 3,
      align: 'center',
    });
    this.labelText.anchor.set(0.5);

    // Подложка под бейдж
    const bg = new PIXI.Graphics();
    bg.beginFill(0x0f172a, 0.85);
    bg.lineStyle(1.5, this.getRoleColor(def.role), 0.9);
    const padX = 8;
    const padY = 3;
    bg.drawRoundedRect(
      -this.labelText.width / 2 - padX,
      -this.labelText.height / 2 - padY,
      this.labelText.width + padX * 2,
      this.labelText.height + padY * 2,
      6
    );
    bg.endFill();

    badgeContainer.addChild(bg);
    badgeContainer.addChild(this.labelText);
    this.root.addChild(badgeContainer);

    // Интерактивность клика
    this.root.eventMode = 'static';
    this.root.cursor = 'pointer';
    if (onInteract) {
      this.root.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        onInteract(this);
      });
    }
  }

  private getRoleColor(role: FieldNpcRole): number {
    switch (role) {
      case 'VILLAGE_SHOP':
        return 0x10b981; // Изумрудно-зеленый
      case 'VILLAGE_BLACKSMITH':
        return 0xf97316; // Оранжево-стальной
      case 'JOB_MENTOR':
        return 0x38bdf8; // Небесно-голубой
      case 'BOUNTY_BOARD':
      case 'FIELD_QUEST_GIVER':
        return 0xfacc15; // Золотой
      case 'VILLAGE_ALCHEMIST':
        return 0xa855f7; // Магически фиолетовый
      case 'COMPANION_RECRUITER':
        return 0xef4444; // Красный
      case 'MASTER_BLACKSMITH':
        return 0xe11d48; // Рубиново-огненный
      case 'HIGH_JOB_MENTOR':
        return 0x06b6d4; // Сияющий лазурный
      case 'ELITE_BOUNTY_BOARD':
        return 0xf59e0b; // Золотой королевский
      case 'BESTIARY_SCHOLAR':
        return 0xa855f7; // Мистический фиолетовый
      default:
        return 0x94a3b8;
    }
  }

  private renderNpcVisual(): void {
    const g = this.graphics;
    g.clear();

    // 1. Тень под ногами
    g.lineStyle(0);
    g.beginFill(0x000000, 0.35);
    g.drawEllipse(0, 6, 16, 6);
    g.endFill();

    if (this.def.role === 'BOUNTY_BOARD') {
      // Доска объявлений — деревянный стенд
      g.beginFill(0x451a03);
      g.drawRect(-14, -28, 4, 32);
      g.drawRect(10, -28, 4, 32);
      g.endFill();

      g.beginFill(0x78350f);
      g.lineStyle(2, 0x451a03, 1);
      g.drawRoundedRect(-22, -38, 44, 26, 3);
      g.endFill();

      g.lineStyle(0);
      g.beginFill(0xfef3c7);
      g.drawRect(-16, -34, 12, 16);
      g.drawRect(2, -32, 14, 15);
      g.endFill();

      g.beginFill(0xef4444);
      g.drawCircle(-10, -20, 2);
      g.drawCircle(8, -19, 2);
      g.endFill();

      g.beginFill(0x3f1c07);
      g.drawPolygon([
        new PIXI.Point(-26, -38),
        new PIXI.Point(26, -38),
        new PIXI.Point(0, -46),
      ]);
      g.endFill();
      return;
    }

    if (this.def.role === 'ELITE_BOUNTY_BOARD') {
      // Королевская доска охоты за головами — обсидиан и золото
      g.beginFill(0x1e1b4b);
      g.drawRect(-16, -34, 5, 38);
      g.drawRect(11, -34, 5, 38);
      g.endFill();

      // Обсидиановый щит с золотой окантовкой
      g.beginFill(0x09090b);
      g.lineStyle(2, 0xf59e0b, 1);
      g.drawRoundedRect(-24, -44, 48, 30, 4);
      g.endFill();

      // Королевские пергаменты с пурпурными печатями
      g.lineStyle(0);
      g.beginFill(0xfef08a);
      g.drawRect(-18, -40, 15, 20);
      g.drawRect(3, -38, 15, 18);
      g.endFill();

      // Пурпурные сургучные печати элиты
      g.beginFill(0xa855f7);
      g.drawCircle(-10, -24, 2.5);
      g.drawCircle(10, -23, 2.5);
      g.endFill();

      // Золотая корона на вершине щита
      g.beginFill(0xfacc15);
      g.drawPolygon([
        new PIXI.Point(-14, -44),
        new PIXI.Point(-8, -52),
        new PIXI.Point(0, -46),
        new PIXI.Point(8, -52),
        new PIXI.Point(14, -44),
      ]);
      g.endFill();
      return;
    }

    // Chibi NPC тело и одежда
    const role = this.def.role;

    // Ноги
    g.beginFill(0x1e293b);
    g.drawRoundedRect(-6, -2, 4, 8, 2);
    g.drawRoundedRect(2, -2, 4, 8, 2);
    g.endFill();

    // Тело / Одежда
    let tunicColor = 0x3b82f6;
    if (role === 'VILLAGE_SHOP') tunicColor = 0x059669;
    if (role === 'VILLAGE_BLACKSMITH') tunicColor = 0xb45309;
    if (role === 'MASTER_BLACKSMITH') tunicColor = 0x991b1b;
    if (role === 'JOB_MENTOR') tunicColor = 0x2563eb;
    if (role === 'HIGH_JOB_MENTOR') tunicColor = 0x0284c7;
    if (role === 'VILLAGE_ALCHEMIST') tunicColor = 0x7e22ce;
    if (role === 'BESTIARY_SCHOLAR') tunicColor = 0x6b21a8;
    if (role === 'COMPANION_RECRUITER') tunicColor = 0x991b1b;

    g.beginFill(tunicColor);
    g.drawRoundedRect(-9, -16, 18, 16, 4);
    g.endFill();

    // Голова
    g.beginFill(0xfde047, 0.4);
    g.beginFill(0xffedd5);
    g.drawCircle(0, -24, 12);
    g.endFill();

    // Глаза
    g.beginFill(0x0f172a);
    g.drawCircle(-4, -24, 1.8);
    g.drawCircle(4, -24, 1.8);
    g.endFill();

    // Прическа / Головной убор и аксессуары
    if (role === 'MASTER_BLACKSMITH') {
      // Великий Кузнец Торгрим: огненная борода и рунический молот
      g.beginFill(0xb45309);
      g.drawCircle(0, -31, 11);
      g.drawRoundedRect(-8, -20, 16, 10, 3); // Пышная борода
      g.endFill();

      // Золотая диадема кузнеца
      g.beginFill(0xf59e0b);
      g.drawRect(-11, -30, 22, 4);
      g.endFill();

      // Пылающий молот
      g.lineStyle(2, 0x451a03);
      g.moveTo(9, -12);
      g.lineTo(19, -3);
      g.lineStyle(0);
      g.beginFill(0xef4444);
      g.drawRoundedRect(15, -10, 10, 14, 2);
      g.beginFill(0xfacc15);
      g.drawCircle(20, -3, 3);
      g.endFill();
    } else if (role === 'HIGH_JOB_MENTOR') {
      // Верховный Магистр Орденов: золотая тиара и небесная мантия
      g.beginFill(0xe0f2fe);
      g.drawCircle(0, -31, 10);
      g.endFill();

      // Сияющая корона
      g.beginFill(0xfacc15);
      g.drawPolygon([
        new PIXI.Point(-8, -32),
        new PIXI.Point(-4, -40),
        new PIXI.Point(0, -35),
        new PIXI.Point(4, -40),
        new PIXI.Point(8, -32),
      ]);
      g.endFill();

      // Посох высшей магии
      g.lineStyle(2, 0x38bdf8);
      g.moveTo(11, -28);
      g.lineTo(11, 4);
      g.lineStyle(0);
      g.beginFill(0x38bdf8);
      g.drawCircle(11, -30, 4);
      g.endFill();
    } else if (role === 'BESTIARY_SCHOLAR') {
      // Архивариус Бестиария: шапочка ученого и светящаяся карта
      g.beginFill(0x4a044e);
      g.drawRoundedRect(-12, -34, 24, 6, 2);
      g.drawPolygon([
        new PIXI.Point(-10, -34),
        new PIXI.Point(10, -34),
        new PIXI.Point(0, -42),
      ]);
      g.endFill();

      // Очки / монокль
      g.lineStyle(1.5, 0xfacc15);
      g.drawCircle(4, -24, 3);

      // Парящая карта в руке
      g.lineStyle(1, 0xc084fc);
      g.beginFill(0xfae8ff);
      g.drawRoundedRect(10, -14, 8, 12, 1);
      g.endFill();
    } else if (role === 'VILLAGE_BLACKSMITH') {
      // Повязка на лоб и темные растрепанные волосы
      g.beginFill(0xd97706);
      g.drawCircle(0, -31, 10);
      g.endFill();
      g.beginFill(0xef4444); // Красная бандана
      g.drawRect(-11, -29, 22, 4);
      g.endFill();

      // Молот в руке
      g.lineStyle(2, 0x78350f);
      g.moveTo(9, -10);
      g.lineTo(17, -2);
      g.lineStyle(0);
      g.beginFill(0x64748b);
      g.drawRoundedRect(14, -8, 8, 12, 2);
      g.endFill();
    } else if (role === 'VILLAGE_SHOP') {
      // Зеленая шляпа торговца с пером
      g.beginFill(0x065f46);
      g.drawRoundedRect(-12, -33, 24, 7, 3);
      g.endFill();
      g.beginFill(0x10b981);
      g.drawPolygon([
        new PIXI.Point(6, -33),
        new PIXI.Point(12, -42),
        new PIXI.Point(9, -33),
      ]);
      g.endFill();

      // Мешок с товарами за спиной
      g.beginFill(0xa16207);
      g.drawCircle(-11, -12, 7);
      g.endFill();
    } else if (role === 'VILLAGE_ALCHEMIST') {
      // Остроконечная фиолетовая шляпа мага
      g.beginFill(0x581c87);
      g.drawPolygon([
        new PIXI.Point(-14, -30),
        new PIXI.Point(14, -30),
        new PIXI.Point(0, -48),
      ]);
      g.endFill();

      // Колба с зельем в руке
      g.beginFill(0x38bdf8);
      g.drawCircle(11, -8, 5);
      g.endFill();
      g.beginFill(0xa855f7);
      g.drawCircle(11, -7, 3);
      g.endFill();
    } else if (role === 'JOB_MENTOR') {
      // Рыцарский шлем с золотым султаном
      g.beginFill(0x94a3b8);
      g.drawCircle(0, -27, 11);
      g.endFill();
      g.beginFill(0xf59e0b);
      g.drawRoundedRect(-3, -40, 6, 12, 3);
      g.endFill();
    } else {
      // Стандартная прическа
      g.beginFill(0x78350f);
      g.drawCircle(0, -30, 10);
      g.endFill();
    }
  }

  public update(dt: number): void {
    this.animTimer += dt * 3;
    // Легкое покачивание (Idle дыхание)
    this.graphics.scale.y = 1 + Math.sin(this.animTimer) * 0.03;
  }

  public destroy(): void {
    this.root.destroy({ children: true });
  }
}
