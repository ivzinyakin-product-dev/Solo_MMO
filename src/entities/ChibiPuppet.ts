import * as PIXI from 'pixi.js';

export type PuppetType =
  | 'hero'
  | 'poring'
  | 'fabre'
  | 'spore'
  | 'poison_spore'
  | 'skeleton'
  | 'zombie'
  | 'dragon_fly'
  | 'mvp_drake'
  | 'wolf'
  | 'orc'
  | 'spirit'
  | 'golem'
  | 'custom';

export interface PuppetConfig {
  type: PuppetType;
  colorHex?: number;
  radius?: number;
  hasWeapon?: boolean;
  isMvp?: boolean;
  isElite?: boolean;
  rank?: 'NORMAL' | 'ELITE' | 'MVP';
  scaleMultiplier?: number;
}

export type SkillAnimType =
  | 'slash'
  | 'spin'
  | 'thrust'
  | 'magic'
  | 'pray'
  | 'shot'
  | 'shout'
  | 'flurry';

export class ChibiPuppet {
  public root = new PIXI.Container();
  public shadow = new PIXI.Graphics();
  public auraRing = new PIXI.Graphics();
  public hasMasterAura: boolean = false;
  public hpBarContainer = new PIXI.Container();
  public pivot = new PIXI.Container();
  public bodyNode = new PIXI.Container();
  public headgearSocket = new PIXI.Container();
  public weaponSocket = new PIXI.Container();
  public slashArc = new PIXI.Graphics();

  private bodyGraphics = new PIXI.Graphics();
  private weaponGraphics = new PIXI.Graphics();
  private weaponGlow = new PIXI.Graphics();
  private headgearGraphics = new PIXI.Graphics();
  private hpBarFill = new PIXI.Graphics();
  private hpBarBg = new PIXI.Graphics();
  private hitFilter = new PIXI.ColorMatrixFilter();

  public facingDir: number = 1; // 1 = right, -1 = left
  public isMoving: boolean = false;
  public isAttacking: boolean = false;
  public isSkillCasting: boolean = false;

  private skillAnimType: SkillAnimType = 'slash';
  private skillAnimProgress: number = 1;
  private skillAnimDuration: number = 0.35;
  private skillCustomColor: number = 0xffffff;

  private walkPhase: number = Math.random() * 10;
  private idlePhase: number = Math.random() * 10;
  private glowPhase: number = 0;
  private swingProgress: number = 1;
  private hitFlashTimer: number = 0;
  private aspd: number = 1.2;

  private config: PuppetConfig;

  constructor(config: PuppetConfig) {
    this.config = config;
    this.buildHierarchy();
    this.renderProceduralVisuals();
  }

  private buildHierarchy(): void {
    // 1. Тень и аура под ногами
    this.root.addChild(this.shadow);
    this.root.addChild(this.auraRing);

    // 2. Полоска HP над головой
    this.hpBarContainer.y = -58;
    this.hpBarContainer.addChild(this.hpBarBg);
    this.hpBarContainer.addChild(this.hpBarFill);
    this.root.addChild(this.hpBarContainer);

    // 3. Основной узел масштабирования и прыжков
    this.root.addChild(this.pivot);

    // Тело чибика
    this.bodyNode.addChild(this.bodyGraphics);
    this.pivot.addChild(this.bodyNode);

    // Сокет шапки
    this.headgearSocket.position.set(0, -50);
    this.headgearSocket.addChild(this.headgearGraphics);
    this.pivot.addChild(this.headgearSocket);

    // Сокет оружия
    if (this.config.hasWeapon) {
      this.weaponSocket.position.set(14, -20);
      this.weaponSocket.addChild(this.weaponGlow);
      this.weaponSocket.addChild(this.weaponGraphics);
      this.weaponSocket.addChild(this.slashArc);
      this.slashArc.visible = false;
      this.pivot.addChild(this.weaponSocket);
    }
  }

  private renderProceduralVisuals(): void {
    const { type, colorHex = 0xff7eb6 } = this.config;

    // Определение масштаба чибика в зависимости от ранга
    const isElite = !!this.config.isElite || this.config.rank === 'ELITE';
    const isMvp = !!this.config.isMvp || this.config.rank === 'MVP';
    const baseScale = this.config.scaleMultiplier || (isMvp ? 1.85 : isElite ? 1.35 : 1.0);
    this.config.scaleMultiplier = baseScale;

    // Тень
    this.shadow.clear();
    this.shadow.beginFill(0x000000, 0.28);
    const shadowR = (type === 'hero' ? 18 : 16) * baseScale;
    this.shadow.drawEllipse(0, 0, shadowR, shadowR * 0.45);
    this.shadow.endFill();

    // Аура под ногами (серебряно-фиолетовая для Вожаков, золотая для MVP)
    this.auraRing.clear();
    if (isElite) {
      const r = 24 * baseScale;
      this.auraRing.lineStyle(2.5, 0xd8b4fe, 0.85);
      this.auraRing.beginFill(0xa855f7, 0.16);
      this.auraRing.drawEllipse(0, 0, r, r * 0.55);
      this.auraRing.endFill();
      // Звёздочки / руны по кругу
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2;
        this.auraRing.beginFill(0xf3e8ff, 0.95);
        this.auraRing.drawCircle(Math.cos(ang) * r, Math.sin(ang) * (r * 0.55), 2.5);
        this.auraRing.endFill();
      }
    } else if (isMvp) {
      const r = 32 * baseScale;
      this.auraRing.lineStyle(3, 0xfbbf24, 0.95);
      this.auraRing.beginFill(0xf59e0b, 0.25);
      this.auraRing.drawEllipse(0, 0, r, r * 0.55);
      this.auraRing.endFill();
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        this.auraRing.beginFill(0xfef08a, 1.0);
        this.auraRing.drawCircle(Math.cos(ang) * r, Math.sin(ang) * (r * 0.55), 3);
        this.auraRing.endFill();
      }
    }

    // HP Bar
    const { barW, barH } = this.getBarDimensions();

    // Высота HP-бара над спрайтом с учетом шляп и размеров
    let barY = -56;
    if (type === 'hero') {
      this.headgearSocket.position.set(0, -50);
      barY = -80; // Над прической и любыми головными уборами (ушки кролика, шлем, яблоко)
    } else if (isMvp) {
      this.headgearSocket.position.set(0, -60);
      barY = -92; // Над короной и крупным силуэтом босса
    } else if (isElite) {
      barY = -72; // Вожак с увеличенным масштабом 1.35x
    } else if (type === 'poring' || type === 'fabre') {
      barY = -42; // Низкие слаймы и гусеницы
    } else {
      barY = -54; // Стандартные мобы
    }
    this.hpBarContainer.y = barY;

    this.hpBarBg.clear();
    this.hpBarBg.lineStyle(1, 0x020617, 0.9);
    this.hpBarBg.beginFill(0x0f172a, 0.9);
    this.hpBarBg.drawRoundedRect(-barW / 2, -barH / 2, barW, barH, 2);
    this.hpBarBg.endFill();

    this.updateHpBar(1, 1);

    // Если это MVP, рисуем золотую корону
    if (isMvp) {
      this.headgearSocket.position.set(0, -60);
      this.headgearGraphics.clear();
      this.headgearGraphics.beginFill(0xf59e0b);
      this.headgearGraphics.drawPolygon([
        new PIXI.Point(-14, 2),
        new PIXI.Point(14, 2),
        new PIXI.Point(14, -12),
        new PIXI.Point(7, -5),
        new PIXI.Point(0, -16),
        new PIXI.Point(-7, -5),
        new PIXI.Point(-14, -12),
      ]);
      this.headgearGraphics.endFill();

      this.headgearGraphics.beginFill(0xef4444);
      this.headgearGraphics.drawCircle(0, -12, 2.5);
      this.headgearGraphics.drawCircle(-10, -8, 2);
      this.headgearGraphics.drawCircle(10, -8, 2);
      this.headgearGraphics.endFill();
    }

    // Тело
    this.bodyGraphics.clear();

    if (type === 'hero') {
      // Ножки
      this.bodyGraphics.beginFill(0x334155);
      this.bodyGraphics.drawRoundedRect(-12, -8, 8, 8, 2);
      this.bodyGraphics.drawRoundedRect(4, -8, 8, 8, 2);
      this.bodyGraphics.endFill();

      // Туловище (синяя туника/броня)
      this.bodyGraphics.beginFill(0x2563eb);
      this.bodyGraphics.drawRoundedRect(-14, -30, 28, 24, 6);
      this.bodyGraphics.endFill();

      // Пояс
      this.bodyGraphics.beginFill(0xb45309);
      this.bodyGraphics.drawRect(-14, -18, 28, 4);
      this.bodyGraphics.endFill();

      // Голова чибика (персиковая кожа)
      this.bodyGraphics.beginFill(0xfde047, 0.3); // воротник
      this.bodyGraphics.drawCircle(0, -31, 6);
      this.bodyGraphics.endFill();

      this.bodyGraphics.beginFill(0xfed7aa);
      this.bodyGraphics.drawCircle(0, -42, 16);
      this.bodyGraphics.endFill();

      // Причёска (каштановые волосы)
      this.bodyGraphics.beginFill(0x78350f);
      this.bodyGraphics.drawEllipse(0, -51, 17, 10);
      this.bodyGraphics.drawRoundedRect(-17, -49, 6, 12, 3);
      this.bodyGraphics.drawRoundedRect(11, -49, 6, 12, 3);
      this.bodyGraphics.endFill();

      // Глазки (аниме-чиби точки)
      this.bodyGraphics.beginFill(0x1e293b);
      this.bodyGraphics.drawCircle(6, -42, 2.5);
      this.bodyGraphics.drawCircle(12, -42, 2.5);
      this.bodyGraphics.endFill();

      // Блики в глазах
      this.bodyGraphics.beginFill(0xffffff);
      this.bodyGraphics.drawCircle(7, -43, 1);
      this.bodyGraphics.drawCircle(13, -43, 1);
      this.bodyGraphics.endFill();

      // Рендер стартового меча
      this.renderWeapon('short_sword');
    } else if (type === 'poring') {
      // Розовый каплевидный слайм
      this.bodyGraphics.beginFill(colorHex);
      this.bodyGraphics.drawEllipse(0, -18, 22, 18);
      // Верхняя макушка капли
      this.bodyGraphics.drawCircle(0, -25, 9);
      this.bodyGraphics.endFill();

      // Глаза
      this.bodyGraphics.beginFill(0x1f2937);
      this.bodyGraphics.drawCircle(5, -20, 3);
      this.bodyGraphics.drawCircle(13, -20, 3);
      this.bodyGraphics.endFill();

      // Блики
      this.bodyGraphics.beginFill(0xffffff);
      this.bodyGraphics.drawCircle(6, -21, 1.2);
      this.bodyGraphics.drawCircle(14, -21, 1.2);
      // Блик на теле
      this.bodyGraphics.drawEllipse(-8, -26, 4, 2);
      this.bodyGraphics.endFill();
    } else if (type === 'fabre') {
      // Зелёная гусеница
      this.bodyGraphics.beginFill(0x16a34a);
      this.bodyGraphics.drawCircle(-10, -12, 10);
      this.bodyGraphics.drawCircle(0, -14, 11);
      this.bodyGraphics.drawCircle(11, -16, 12); // Голова
      this.bodyGraphics.endFill();

      // Глаза
      this.bodyGraphics.beginFill(0x111827);
      this.bodyGraphics.drawCircle(14, -18, 2.8);
      this.bodyGraphics.endFill();

      this.bodyGraphics.beginFill(0xffffff);
      this.bodyGraphics.drawCircle(15, -19, 1);
      this.bodyGraphics.endFill();

      // Усики
      this.bodyGraphics.lineStyle(2, 0x15803d);
      this.bodyGraphics.moveTo(14, -26);
      this.bodyGraphics.lineTo(18, -33);
      this.bodyGraphics.lineStyle(0);
    } else if (type === 'spore' || type === 'poison_spore') {
      // Гриб-спора
      const capColor = type === 'poison_spore' ? 0xa855f7 : 0xf59e0b;
      // Ножка
      this.bodyGraphics.beginFill(0xf1f5f9);
      this.bodyGraphics.drawRoundedRect(-7, -14, 14, 16, 4);
      this.bodyGraphics.endFill();
      // Шляпка
      this.bodyGraphics.beginFill(capColor);
      this.bodyGraphics.drawEllipse(0, -18, 18, 14);
      this.bodyGraphics.endFill();
      // Точки на шляпке
      this.bodyGraphics.beginFill(0xffffff, 0.7);
      this.bodyGraphics.drawCircle(-6, -22, 2.5);
      this.bodyGraphics.drawCircle(5, -20, 2);
      this.bodyGraphics.drawCircle(0, -26, 2);
      this.bodyGraphics.endFill();
      // Глазки
      this.bodyGraphics.beginFill(0x1e293b);
      this.bodyGraphics.drawCircle(-3, -8, 1.8);
      this.bodyGraphics.drawCircle(3, -8, 1.8);
      this.bodyGraphics.endFill();
    } else if (type === 'skeleton') {
      // Скелет
      this.bodyGraphics.beginFill(0xe2e8f0);
      // Череп
      this.bodyGraphics.drawRoundedRect(-9, -32, 18, 16, 4);
      // Рёбра и туловище
      this.bodyGraphics.drawRect(-2, -16, 4, 14);
      this.bodyGraphics.drawRect(-8, -14, 16, 2);
      this.bodyGraphics.drawRect(-7, -10, 14, 2);
      this.bodyGraphics.endFill();
      // Глазницы
      this.bodyGraphics.beginFill(0x0f172a);
      this.bodyGraphics.drawCircle(-4, -26, 2.5);
      this.bodyGraphics.drawCircle(4, -26, 2.5);
      this.bodyGraphics.endFill();
    } else if (type === 'zombie') {
      // Зомби
      this.bodyGraphics.beginFill(0x475569);
      this.bodyGraphics.drawRoundedRect(-11, -30, 22, 26, 6);
      this.bodyGraphics.endFill();
      // Руки вперёд
      this.bodyGraphics.beginFill(0x334155);
      this.bodyGraphics.drawRect(8, -20, 10, 5);
      this.bodyGraphics.endFill();
      // Глаза
      this.bodyGraphics.beginFill(0xf87171);
      this.bodyGraphics.drawCircle(4, -22, 2);
      this.bodyGraphics.drawCircle(9, -22, 2);
      this.bodyGraphics.endFill();
    } else if (type === 'dragon_fly') {
      // Огненная стрекоза
      this.bodyGraphics.beginFill(0xef4444);
      this.bodyGraphics.drawEllipse(0, -16, 14, 8);
      this.bodyGraphics.endFill();
      // Крылья
      this.bodyGraphics.beginFill(0xfca5a5, 0.6);
      this.bodyGraphics.drawEllipse(-8, -24, 12, 5);
      this.bodyGraphics.drawEllipse(8, -24, 12, 5);
      this.bodyGraphics.endFill();
      // Глаза
      this.bodyGraphics.beginFill(0xfacc15);
      this.bodyGraphics.drawCircle(8, -16, 3);
      this.bodyGraphics.endFill();
    } else if (type === 'mvp_drake') {
      // Золотой Дракон-Босс
      this.bodyGraphics.beginFill(0xb45309);
      this.bodyGraphics.drawPolygon([
        new PIXI.Point(-18, -4),
        new PIXI.Point(18, -4),
        new PIXI.Point(14, -36),
        new PIXI.Point(0, -42),
        new PIXI.Point(-14, -36),
      ]);
      this.bodyGraphics.endFill();

      // Золотая броня/чешуя
      this.bodyGraphics.beginFill(0xf59e0b);
      this.bodyGraphics.drawRoundedRect(-12, -32, 24, 22, 4);
      this.bodyGraphics.endFill();

      // Драконьи рога
      this.bodyGraphics.beginFill(0x78350f);
      this.bodyGraphics.drawPolygon([
        new PIXI.Point(-12, -36),
        new PIXI.Point(-22, -50),
        new PIXI.Point(-8, -42),
      ]);
      this.bodyGraphics.drawPolygon([
        new PIXI.Point(12, -36),
        new PIXI.Point(22, -50),
        new PIXI.Point(8, -42),
      ]);
      this.bodyGraphics.endFill();

      // Пылающие глаза
      this.bodyGraphics.beginFill(0xfef08a);
      this.bodyGraphics.drawCircle(6, -28, 3);
      this.bodyGraphics.drawCircle(12, -28, 3);
      this.bodyGraphics.endFill();
    } else if (type === 'wolf') {
      // Серый/бурый хищный волк
      this.bodyGraphics.beginFill(colorHex || 0x475569);
      this.bodyGraphics.drawEllipse(0, -14, 18, 12);
      this.bodyGraphics.drawCircle(10, -20, 9);
      this.bodyGraphics.endFill();

      // Морда и уши
      this.bodyGraphics.beginFill(colorHex || 0x334155);
      this.bodyGraphics.drawPolygon([
        new PIXI.Point(14, -22),
        new PIXI.Point(23, -17),
        new PIXI.Point(14, -15),
      ]);
      // Острое ухо
      this.bodyGraphics.drawPolygon([
        new PIXI.Point(5, -26),
        new PIXI.Point(8, -34),
        new PIXI.Point(12, -26),
      ]);
      // Пушистый хвост
      this.bodyGraphics.drawPolygon([
        new PIXI.Point(-16, -14),
        new PIXI.Point(-25, -22),
        new PIXI.Point(-18, -10),
      ]);
      this.bodyGraphics.endFill();

      // Свирепый сверкающий глаз
      this.bodyGraphics.beginFill(0xfacc15);
      this.bodyGraphics.drawCircle(13, -22, 2.2);
      this.bodyGraphics.endFill();
    } else if (type === 'orc') {
      // Мускулистый орк-воин
      this.bodyGraphics.beginFill(colorHex || 0x15803d);
      this.bodyGraphics.drawRoundedRect(-14, -30, 28, 26, 6);
      this.bodyGraphics.endFill();

      // Стальной наплечник
      this.bodyGraphics.beginFill(0x64748b);
      this.bodyGraphics.drawCircle(-12, -26, 6);
      this.bodyGraphics.endFill();

      // Клыки снизу
      this.bodyGraphics.beginFill(0xffffff);
      this.bodyGraphics.drawPolygon([
        new PIXI.Point(3, -18),
        new PIXI.Point(5, -23),
        new PIXI.Point(7, -18),
      ]);
      this.bodyGraphics.drawPolygon([
        new PIXI.Point(9, -18),
        new PIXI.Point(11, -23),
        new PIXI.Point(13, -18),
      ]);
      this.bodyGraphics.endFill();

      // Грозные красные глаза
      this.bodyGraphics.beginFill(0xef4444);
      this.bodyGraphics.drawCircle(4, -25, 2.5);
      this.bodyGraphics.drawCircle(11, -25, 2.5);
      this.bodyGraphics.endFill();
    } else if (type === 'spirit') {
      // Парящий эфирный призрак (Шепчущий / Батори)
      this.bodyGraphics.beginFill(colorHex || 0x818cf8, 0.85);
      this.bodyGraphics.drawCircle(0, -24, 13);
      this.bodyGraphics.drawPolygon([
        new PIXI.Point(-12, -22),
        new PIXI.Point(12, -22),
        new PIXI.Point(6, -6),
        new PIXI.Point(-2, -10),
        new PIXI.Point(-8, -4),
      ]);
      this.bodyGraphics.endFill();

      // Призрачные пустые сияющие глаза
      this.bodyGraphics.beginFill(0xffffff);
      this.bodyGraphics.drawCircle(-3, -24, 3);
      this.bodyGraphics.drawCircle(5, -24, 3);
      this.bodyGraphics.beginFill(0x0f172a);
      this.bodyGraphics.drawCircle(-3, -24, 1.5);
      this.bodyGraphics.drawCircle(5, -24, 1.5);
      this.bodyGraphics.endFill();
    } else if (type === 'golem') {
      // Массивный механизм / Мимик / Голем
      this.bodyGraphics.beginFill(colorHex || 0x78716c);
      this.bodyGraphics.drawRoundedRect(-14, -28, 28, 24, 4);
      this.bodyGraphics.endFill();

      // Металлическая окантовка и заклёпки
      this.bodyGraphics.lineStyle(2, 0xd97706, 0.9);
      this.bodyGraphics.drawRect(-12, -26, 24, 20);
      this.bodyGraphics.lineStyle(0);

      // Светящееся ядро / визор
      this.bodyGraphics.beginFill(0xfbbf24);
      this.bodyGraphics.drawRoundedRect(-8, -20, 16, 5, 2);
      this.bodyGraphics.endFill();
    }
  }

  public renderHeadgear(headgearId?: string | null): void {
    this.headgearGraphics.clear();
    if (!headgearId) return;

    if (headgearId === 'apple_archer') {
      // Зелёное яблоко лучника: аккуратно сидит на макушке головы персонажа
      this.headgearGraphics.beginFill(0x84cc16);
      this.headgearGraphics.drawCircle(0, -18, 7.5);
      this.headgearGraphics.endFill();

      // Световой блик на яблоке
      this.headgearGraphics.beginFill(0xffffff, 0.65);
      this.headgearGraphics.drawCircle(-2.5, -20.5, 2);
      this.headgearGraphics.endFill();

      // Черенок и листик
      this.headgearGraphics.lineStyle(2, 0x78350f);
      this.headgearGraphics.moveTo(0, -25.5);
      this.headgearGraphics.lineTo(2, -31);
      this.headgearGraphics.lineStyle(0);

      this.headgearGraphics.beginFill(0x22c55e);
      this.headgearGraphics.drawEllipse(4, -29.5, 3.5, 2);
      this.headgearGraphics.endFill();
    } else if (headgearId === 'bunny_band') {
      // Ободок с ушками кролика: ободок облегает макушку, ушки торчат вверх над головой
      this.headgearGraphics.beginFill(0x1e293b);
      this.headgearGraphics.drawRoundedRect(-15, -7, 30, 3.5, 1.5);
      this.headgearGraphics.endFill();

      // Левое ухо
      this.headgearGraphics.beginFill(0xffffff);
      this.headgearGraphics.drawRoundedRect(-11, -29, 6.5, 23, 3);
      this.headgearGraphics.beginFill(0xf472b6);
      this.headgearGraphics.drawRoundedRect(-9.5, -26, 3.5, 18, 1.5);
      this.headgearGraphics.endFill();

      // Правое ухо
      this.headgearGraphics.beginFill(0xffffff);
      this.headgearGraphics.drawRoundedRect(4.5, -29, 6.5, 23, 3);
      this.headgearGraphics.beginFill(0xf472b6);
      this.headgearGraphics.drawRoundedRect(6, -26, 3.5, 18, 1.5);
      this.headgearGraphics.endFill();
    } else if (headgearId === 'head_t1') {
      // T1: Медная шапочка: полукруглый купол из меди с ободом и золотыми заклёпками
      this.headgearGraphics.beginFill(0xb45309);
      this.headgearGraphics.drawRoundedRect(-16, -11, 32, 14, 6);
      this.headgearGraphics.endFill();

      // Полированный медный козырек/обод
      this.headgearGraphics.beginFill(0xd97706);
      this.headgearGraphics.drawRoundedRect(-17, 0, 34, 4, 1.5);
      this.headgearGraphics.endFill();

      // Золотые заклепки
      this.headgearGraphics.beginFill(0xfde047);
      this.headgearGraphics.drawCircle(0, 2, 2);
      this.headgearGraphics.drawCircle(-9, 2, 1.5);
      this.headgearGraphics.drawCircle(9, 2, 1.5);
      this.headgearGraphics.endFill();
    } else if (headgearId === 'head_t2' || headgearId === 'iron_helm') {
      // T2: Железный шлем: стальной шлем с гребнем и защитной лобной пластиной
      this.headgearGraphics.beginFill(0x64748b);
      this.headgearGraphics.drawPolygon([
        new PIXI.Point(-16, 2),
        new PIXI.Point(16, 2),
        new PIXI.Point(14, -12),
        new PIXI.Point(0, -16),
        new PIXI.Point(-14, -12),
      ]);
      this.headgearGraphics.endFill();

      // Стальной обод надо лбом
      this.headgearGraphics.beginFill(0x94a3b8);
      this.headgearGraphics.drawRoundedRect(-17, 0, 34, 3.5, 1.5);
      this.headgearGraphics.endFill();

      // Гребень шлема
      this.headgearGraphics.beginFill(0x475569);
      this.headgearGraphics.drawRoundedRect(-2.5, -19, 5, 8, 2);
      this.headgearGraphics.endFill();
    } else if (headgearId === 'head_t3') {
      // T3: Мифриловый рыцарский шлем: закрытое забрало с прорезью точно на уровне глаз
      this.headgearGraphics.beginFill(0x475569);
      this.headgearGraphics.drawPolygon([
        new PIXI.Point(-16, 12),
        new PIXI.Point(16, 12),
        new PIXI.Point(14, -13),
        new PIXI.Point(0, -18),
        new PIXI.Point(-14, -13),
      ]);
      this.headgearGraphics.endFill();

      // Прорезь забрала точно напротив глаз героя (y = 8 в сокете)
      this.headgearGraphics.beginFill(0x0f172a);
      this.headgearGraphics.drawRoundedRect(-13, 6.5, 26, 4, 1.5);
      this.headgearGraphics.endFill();

      // Лазурный отблеск глаз сквозь забрало
      this.headgearGraphics.beginFill(0x38bdf8);
      this.headgearGraphics.drawCircle(6, 8.5, 1.5);
      this.headgearGraphics.drawCircle(11, 8.5, 1.5);
      this.headgearGraphics.endFill();

      // Мифриловый налобный обод
      this.headgearGraphics.beginFill(0x94a3b8);
      this.headgearGraphics.drawRoundedRect(-17, 3, 34, 2.5, 1);
      this.headgearGraphics.endFill();
    } else if (headgearId === 'head_t4') {
      // T4: Тевтонский шлем с золотым крестом
      this.headgearGraphics.beginFill(0x334155);
      this.headgearGraphics.drawPolygon([
        new PIXI.Point(-16, 11),
        new PIXI.Point(16, 11),
        new PIXI.Point(14, -13),
        new PIXI.Point(0, -17),
        new PIXI.Point(-14, -13),
      ]);
      this.headgearGraphics.endFill();

      // Золотой крест на забрале
      this.headgearGraphics.beginFill(0xf59e0b);
      this.headgearGraphics.drawRoundedRect(-15, 5, 30, 3, 1);
      this.headgearGraphics.drawRoundedRect(-2, -5, 4, 16, 1);
      this.headgearGraphics.endFill();

      // Прорези забрала
      this.headgearGraphics.beginFill(0x0f172a);
      this.headgearGraphics.drawRect(4, 8, 8, 2);
      this.headgearGraphics.drawRect(-12, 8, 8, 2);
      this.headgearGraphics.endFill();

      // Сапфир в центре креста
      this.headgearGraphics.beginFill(0x38bdf8);
      this.headgearGraphics.drawCircle(0, 6.5, 2);
      this.headgearGraphics.endFill();
    } else if (headgearId === 'head_t5') {
      // T5: Багровая драконья корона с рогами
      this.headgearGraphics.beginFill(0x991b1b);
      // Левый драконий рог
      this.headgearGraphics.drawPolygon([
        new PIXI.Point(-12, 0),
        new PIXI.Point(-22, -18),
        new PIXI.Point(-18, -20),
        new PIXI.Point(-8, -4),
      ]);
      // Правый драконий рог
      this.headgearGraphics.drawPolygon([
        new PIXI.Point(12, 0),
        new PIXI.Point(22, -18),
        new PIXI.Point(18, -20),
        new PIXI.Point(8, -4),
      ]);
      this.headgearGraphics.endFill();

      // Пылающие кончики рогов
      this.headgearGraphics.beginFill(0xef4444);
      this.headgearGraphics.drawCircle(-20, -19, 2.5);
      this.headgearGraphics.drawCircle(20, -19, 2.5);
      this.headgearGraphics.endFill();

      // Золотой венец короны
      this.headgearGraphics.beginFill(0xf59e0b);
      this.headgearGraphics.drawRoundedRect(-15, -1, 30, 4, 1.5);
      this.headgearGraphics.drawPolygon([
        new PIXI.Point(-4, -1),
        new PIXI.Point(0, -9),
        new PIXI.Point(4, -1),
      ]);
      this.headgearGraphics.endFill();

      // Рубин в центре
      this.headgearGraphics.beginFill(0xef4444);
      this.headgearGraphics.drawCircle(0, -3.5, 2.5);
      this.headgearGraphics.endFill();
    } else if (headgearId === 'reinforced_helm') {
      // Укрепленный шлем с алым плюмажем
      this.headgearGraphics.beginFill(0x475569);
      this.headgearGraphics.drawPolygon([
        new PIXI.Point(-16, 2),
        new PIXI.Point(16, 2),
        new PIXI.Point(14, -12),
        new PIXI.Point(0, -16),
        new PIXI.Point(-14, -12),
      ]);
      this.headgearGraphics.endFill();

      this.headgearGraphics.beginFill(0x64748b);
      this.headgearGraphics.drawRoundedRect(-17, 0, 34, 3.5, 1.5);
      this.headgearGraphics.endFill();

      // Золотое крепление плюмажа
      this.headgearGraphics.beginFill(0xf59e0b);
      this.headgearGraphics.drawCircle(0, -15, 3.5);
      this.headgearGraphics.endFill();

      // Алый плюмаж
      this.headgearGraphics.beginFill(0xef4444);
      this.headgearGraphics.drawPolygon([
        new PIXI.Point(-2, -15),
        new PIXI.Point(-4, -27),
        new PIXI.Point(4, -27),
        new PIXI.Point(10, -20),
        new PIXI.Point(2, -15),
      ]);
      this.headgearGraphics.endFill();
    }
  }

  public setupMasterAura(): void {
    if (this.hasMasterAura) {
      this.auraRing.clear();
      const r = 24;
      this.auraRing.lineStyle(2.5, 0x38bdf8, 0.95);
      this.auraRing.beginFill(0x0284c7, 0.25);
      this.auraRing.drawEllipse(0, 0, r, r * 0.55);
      this.auraRing.endFill();

      this.auraRing.lineStyle(1.5, 0xfde047, 0.85);
      this.auraRing.drawEllipse(0, 0, r * 0.7, r * 0.38);

      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        this.auraRing.beginFill(0xfef08a, 0.95);
        this.auraRing.drawCircle(Math.cos(ang) * r, Math.sin(ang) * (r * 0.55), 2.2);
        this.auraRing.endFill();
      }
    } else if (!this.config.isElite && !this.config.isMvp && this.config.rank !== 'ELITE' && this.config.rank !== 'MVP') {
      this.auraRing.clear();
    }
  }

  public renderWeapon(weaponId?: string | null, refineLevel: number = 0): void {
    this.weaponGraphics.clear();
    this.weaponGlow.clear();

    this.hasMasterAura = refineLevel >= 10;
    this.setupMasterAura();

    if (!weaponId) return;

    const hasGlow = refineLevel >= 7;
    const glowColor =
      refineLevel >= 10
        ? 0x38bdf8 // +10: Божественный лазурный
        : refineLevel >= 9
        ? 0xf43f5e // +9: Багровый пламенный
        : refineLevel >= 8
        ? 0xa855f7 // +8: Мистический фиолетовый
        : 0xf59e0b; // +7: Сияющий янтарно-золотой

    const id = weaponId;
    const isBow = id.includes('bow');
    const isMace = id.includes('mace');
    const isStaff = id.includes('staff') || id.includes('rod');

    // Определение цветовой гаммы тира
    let primaryColor = 0xe2e8f0; // T1 сталь
    let accentColor = 0xf59e0b;  // золото
    let slashColor = 0xffffff;

    if (id.includes('_t5') || id.includes('dragon')) {
      primaryColor = 0xef4444; // T5 багровый драконит
      accentColor = 0xfbbf24;
      slashColor = 0xf87171;
    } else if (id.includes('_t4') || id.includes('clock') || id.includes('ancient')) {
      primaryColor = 0xf59e0b; // T4 золотой/заводной
      accentColor = 0x38bdf8;
      slashColor = 0xfde047;
    } else if (id.includes('_t3') || id.includes('abbey') || id.includes('orc')) {
      primaryColor = 0xa855f7; // T3 мистический фиолетовый
      accentColor = 0x334155;
      slashColor = 0xc084fc;
    } else if (id.includes('_t2') || id === 'blade_2') {
      primaryColor = 0x38bdf8; // T2 лазурная сталь
      accentColor = 0xf59e0b;
      slashColor = 0x38bdf8;
    }

    if (isBow) {
      // Подсветка заточки лука (+7..+10): огибает дугу лука, подсвечивает рога, тетиву и заряженную стрелу
      if (hasGlow) {
        // 1. Широкий внешний сияющий ореол по дуге лука
        this.weaponGlow.lineStyle(7, glowColor, 0.65);
        this.weaponGlow.arc(0, -10, 16, -Math.PI * 0.48, Math.PI * 0.48);

        // 2. Яркая внутренняя световая сердцевина дуги
        this.weaponGlow.lineStyle(2.5, 0xffffff, 0.95);
        this.weaponGlow.arc(0, -10, 16, -Math.PI * 0.45, Math.PI * 0.45);

        // Координаты верхнего и нижнего рогов лука
        const topTipX = Math.cos(-Math.PI * 0.45) * 16;
        const topTipY = -10 + Math.sin(-Math.PI * 0.45) * 16;
        const botTipX = Math.cos(Math.PI * 0.45) * 16;
        const botTipY = -10 + Math.sin(Math.PI * 0.45) * 16;

        // 3. Сияющая магическая тетива
        this.weaponGlow.lineStyle(3, glowColor, 0.7);
        this.weaponGlow.moveTo(topTipX, topTipY);
        this.weaponGlow.lineTo(botTipX, botTipY);
        this.weaponGlow.lineStyle(1.2, 0xffffff, 1.0);
        this.weaponGlow.moveTo(topTipX, topTipY);
        this.weaponGlow.lineTo(botTipX, botTipY);

        // 4. Сгустки энергии на рогах лука (концентраторы)
        this.weaponGlow.lineStyle(0);
        this.weaponGlow.beginFill(glowColor, 0.85);
        this.weaponGlow.drawCircle(topTipX, topTipY, 3.8);
        this.weaponGlow.drawCircle(botTipX, botTipY, 3.8);
        this.weaponGlow.endFill();

        this.weaponGlow.beginFill(0xffffff, 0.95);
        this.weaponGlow.drawCircle(topTipX, topTipY, 2.0);
        this.weaponGlow.drawCircle(botTipX, botTipY, 2.0);
        this.weaponGlow.endFill();

        // 5. Заряженная эфирная световая стрела на тетиве
        this.weaponGlow.lineStyle(2.5, glowColor, 0.85);
        this.weaponGlow.moveTo(-3, -10);
        this.weaponGlow.lineTo(16, -10);

        this.weaponGlow.lineStyle(1, 0xffffff, 1.0);
        this.weaponGlow.moveTo(-3, -10);
        this.weaponGlow.lineTo(16, -10);

        // Светящийся наконечник стрелы
        this.weaponGlow.lineStyle(0);
        this.weaponGlow.beginFill(0xffffff, 0.95);
        this.weaponGlow.drawPolygon([
          new PIXI.Point(18, -10),
          new PIXI.Point(13, -13),
          new PIXI.Point(14, -10),
          new PIXI.Point(13, -7),
        ]);
        this.weaponGlow.endFill();
      }

      // Изогнутый лук
      const bowWood = id.includes('_t5') ? 0x991b1b : id.includes('_t4') ? 0xd97706 : 0xb45309;
      this.weaponGraphics.lineStyle(3, bowWood, 1);
      this.weaponGraphics.arc(0, -10, 16, -Math.PI * 0.45, Math.PI * 0.45);
      // Тетива
      this.weaponGraphics.lineStyle(1, 0xffffff, 0.85);
      this.weaponGraphics.moveTo(Math.cos(-Math.PI * 0.45) * 16, -10 + Math.sin(-Math.PI * 0.45) * 16);
      this.weaponGraphics.lineTo(Math.cos(Math.PI * 0.45) * 16, -10 + Math.sin(Math.PI * 0.45) * 16);

      this.slashArc.clear();
      this.slashArc.lineStyle(2, slashColor, 0.7);
      this.slashArc.arc(0, -10, 24, -Math.PI * 0.3, Math.PI * 0.3);
    } else if (isMace) {
      if (hasGlow) {
        // Свечение рукояти булавы
        this.weaponGlow.lineStyle(5, glowColor, 0.75);
        this.weaponGlow.drawRoundedRect(-4, -1, 8, 28, 3);
        // Свечение шипастого навершия
        this.weaponGlow.lineStyle(6, glowColor, 0.85);
        this.weaponGlow.drawCircle(0, -22, 13);
        this.weaponGlow.lineStyle(2, 0xffffff, 0.95);
        this.weaponGlow.drawCircle(0, -22, 9);
      }

      // Массивная булава
      this.weaponGraphics.beginFill(0x78350f);
      this.weaponGraphics.drawRoundedRect(-2.5, 0, 5, 26, 2);
      this.weaponGraphics.endFill();

      // Навершие
      this.weaponGraphics.beginFill(primaryColor);
      this.weaponGraphics.drawCircle(0, -22, 9);
      this.weaponGraphics.endFill();

      // Шипы / заклепки
      this.weaponGraphics.beginFill(accentColor);
      this.weaponGraphics.drawCircle(0, -22, 4);
      this.weaponGraphics.drawCircle(-8, -22, 2.5);
      this.weaponGraphics.drawCircle(8, -22, 2.5);
      this.weaponGraphics.drawCircle(0, -30, 2.5);
      this.weaponGraphics.endFill();

      this.slashArc.clear();
      this.slashArc.lineStyle(5, slashColor, 0.85);
      this.slashArc.arc(0, -10, 26, -Math.PI * 0.4, Math.PI * 0.3);
    } else if (isStaff) {
      if (hasGlow) {
        // Свечение древка посоха
        this.weaponGlow.lineStyle(5, glowColor, 0.7);
        this.weaponGlow.drawRoundedRect(-3, -3, 6, 34, 2);
        // Свечение кристалла на вершине
        this.weaponGlow.lineStyle(6, glowColor, 0.9);
        this.weaponGlow.drawPolygon([
          new PIXI.Point(0, -35),
          new PIXI.Point(9, -24),
          new PIXI.Point(0, -13),
          new PIXI.Point(-9, -24),
        ]);
        this.weaponGlow.lineStyle(2, 0xffffff, 0.95);
        this.weaponGlow.drawPolygon([
          new PIXI.Point(0, -32),
          new PIXI.Point(6, -24),
          new PIXI.Point(0, -16),
          new PIXI.Point(-6, -24),
        ]);
      }

      // Посох с кристаллом
      this.weaponGraphics.beginFill(0x78350f);
      this.weaponGraphics.drawRoundedRect(-2, -2, 4, 32, 1.5);
      this.weaponGraphics.endFill();

      // Кристалл
      this.weaponGraphics.beginFill(primaryColor);
      this.weaponGraphics.drawPolygon([
        new PIXI.Point(0, -32),
        new PIXI.Point(6, -24),
        new PIXI.Point(0, -16),
        new PIXI.Point(-6, -24),
      ]);
      this.weaponGraphics.endFill();

      this.slashArc.clear();
      this.slashArc.lineStyle(4, slashColor, 0.75);
      this.slashArc.arc(0, -10, 26, -Math.PI * 0.4, Math.PI * 0.3);
    } else {
      if (hasGlow) {
        // Свечение меча / клинка
        this.weaponGlow.lineStyle(6, glowColor, 0.8);
        this.weaponGlow.drawRoundedRect(-6, -36, 12, 42, 4);
        this.weaponGlow.lineStyle(2, 0xffffff, 0.95);
        this.weaponGlow.drawRoundedRect(-4, -34, 8, 38, 2);
      }

      // Меч / клинок
      this.weaponGraphics.beginFill(0x334155);
      this.weaponGraphics.drawRect(-2, 0, 4, 9);
      this.weaponGraphics.endFill();

      // Гарда
      this.weaponGraphics.beginFill(accentColor);
      this.weaponGraphics.drawRoundedRect(-8, -4, 16, 5, 2);
      this.weaponGraphics.endFill();

      // Лезвие
      this.weaponGraphics.beginFill(primaryColor);
      this.weaponGraphics.drawPolygon([
        new PIXI.Point(-4, -4),
        new PIXI.Point(4, -4),
        new PIXI.Point(3, -30),
        new PIXI.Point(0, -36),
        new PIXI.Point(-3, -30),
      ]);
      this.weaponGraphics.endFill();

      this.slashArc.clear();
      this.slashArc.lineStyle(4, slashColor, 0.8);
      this.slashArc.arc(0, -10, 28, -Math.PI * 0.4, Math.PI * 0.3);
    }
  }

  private getBarDimensions(): { barW: number; innerW: number; barH: number; innerH: number } {
    const isMvp = !!this.config.isMvp || this.config.rank === 'MVP';
    const isElite = !!this.config.isElite || this.config.rank === 'ELITE';
    const barW = isMvp ? 68 : isElite ? 54 : 44;
    const barH = isMvp ? 7 : 6;
    const innerW = barW - 4; // 2px отступ слева и справа
    const innerH = barH - 2; // 1px отступ сверху и снизу
    return { barW, innerW, barH, innerH };
  }

  public updateHpBar(current: number, max: number, forceVisible: boolean = false): void {
    if (this.root.destroyed || this.hpBarFill.destroyed || this.hpBarContainer.destroyed) return;
    const ratio = Math.max(0, Math.min(1, max > 0 ? current / max : 0));
    this.hpBarFill.clear();

    const { innerW, innerH } = this.getBarDimensions();
    const width = Math.round(innerW * ratio);
    const color = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xf59e0b : 0xef4444;

    if (width > 0) {
      this.hpBarFill.beginFill(color);
      const startX = -innerW / 2;
      const startY = -innerH / 2;
      if (width < 3) {
        this.hpBarFill.drawRect(startX, startY, width, innerH);
      } else {
        this.hpBarFill.drawRoundedRect(startX, startY, width, innerH, 1.5);
      }
      this.hpBarFill.endFill();
    }

    const isElite = !!this.config.isElite || this.config.rank === 'ELITE';
    const isMvp = !!this.config.isMvp || this.config.rank === 'MVP';
    this.hpBarContainer.visible = forceVisible || ratio < 1.0 || this.config.type === 'hero' || isMvp || isElite;
  }

  public triggerAttack(aspd: number): void {
    if (this.isSkillCasting) return;
    this.aspd = aspd;
    this.isAttacking = true;
    this.swingProgress = 0;
  }

  public triggerSkillAnimation(
    type: SkillAnimType,
    duration: number = 0.35,
    customColor: number = 0xffffff
  ): void {
    this.isSkillCasting = true;
    this.skillAnimType = type;
    this.skillAnimProgress = 0;
    this.skillAnimDuration = Math.max(0.15, duration);
    this.skillCustomColor = customColor;
    this.isAttacking = false;

    // Обновляем цвет и толщину дуги оружия под эффект способности
    this.slashArc.clear();
    const arcWidth = type === 'slash' ? 6 : type === 'thrust' ? 4 : 3;
    this.slashArc.lineStyle(arcWidth, customColor, 0.95);
    if (type === 'spin') {
      this.slashArc.arc(0, -10, 32, -Math.PI, Math.PI);
    } else if (type === 'thrust') {
      this.slashArc.arc(0, -10, 30, -Math.PI * 0.15, Math.PI * 0.15);
    } else {
      this.slashArc.arc(0, -10, 28, -Math.PI * 0.45, Math.PI * 0.45);
    }
    this.slashArc.visible = false;
  }

  public triggerHitFlash(): void {
    if (this.root.destroyed || this.bodyNode.destroyed) return;
    this.hitFlashTimer = 0.12;
    this.hitFilter.brightness(3.0, false);
    this.bodyNode.filters = [this.hitFilter];
  }

  public setEnraged(enraged: boolean): void {
    if (this.root.destroyed || this.bodyNode.destroyed) return;
    if (enraged) {
      this.hitFilter.tint(0xef4444, false);
      this.bodyNode.filters = [this.hitFilter];
    } else if (this.hitFlashTimer <= 0) {
      this.bodyNode.filters = [];
    }
  }

  public updateAnimation(dt: number, speedMult: number = 1.0): void {
    if (this.root.destroyed) return;
    const isElite = !!this.config.isElite || this.config.rank === 'ELITE';
    const isMvp = !!this.config.isMvp || this.config.rank === 'MVP';
    const s = this.config.scaleMultiplier || (isMvp ? 1.85 : isElite ? 1.35 : 1.0);

    // Пульсация и вращение ауры под ногами
    if (isElite || isMvp || this.hasMasterAura) {
      this.glowPhase += dt * 3.5;
      this.auraRing.alpha = 0.65 + Math.sin(this.glowPhase) * 0.35;
      this.auraRing.scale.set(1.0 + Math.sin(this.glowPhase * 0.7) * 0.08);
      if (this.hasMasterAura) {
        this.auraRing.rotation += dt * 0.8;
      }
    }

    // 1. Анимация попадания (вспышка)
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      this.pivot.scale.x = this.facingDir * s * 1.25;
      this.pivot.scale.y = s * 0.75;
      if (this.hitFlashTimer <= 0) {
        this.bodyNode.filters = [];
      }
      return;
    }

    // 2. Анимация исполнения навыка (высший приоритет)
    if (this.isSkillCasting) {
      this.skillAnimProgress += dt;
      const p = Math.min(1, this.skillAnimProgress / this.skillAnimDuration);

      if (p >= 1) {
        this.isSkillCasting = false;
        this.slashArc.visible = false;
        this.pivot.x = 0;
        this.pivot.y = 0;
        this.pivot.rotation = 0;
        this.pivot.scale.set(this.facingDir * s, s);
        if (this.config.hasWeapon) {
          this.weaponSocket.rotation = 0.2;
          this.weaponSocket.y = -20;
        }
      } else {
        switch (this.skillAnimType) {
          case 'slash': {
            if (p < 0.25) {
              const windup = p / 0.25;
              this.weaponSocket.rotation = -0.5 - windup * 1.8;
              this.pivot.x = -8 * this.facingDir * windup;
              this.pivot.scale.y = s * (1 - windup * 0.1);
              this.slashArc.visible = false;
            } else {
              const strike = (p - 0.25) / 0.75;
              const swingAngle = -2.3 + Math.sin(strike * Math.PI * 0.5) * 4.2;
              this.weaponSocket.rotation = swingAngle;
              this.pivot.x = this.facingDir * (20 * Math.sin(strike * Math.PI));
              this.slashArc.visible = strike < 0.7;
            }
            break;
          }
          case 'spin': {
            this.pivot.rotation = p * Math.PI * 2 * this.facingDir;
            this.pivot.y = -Math.sin(p * Math.PI) * 14;
            this.weaponSocket.rotation = 0.8;
            this.slashArc.visible = p > 0.08 && p < 0.92;
            break;
          }
          case 'thrust': {
            if (p < 0.2) {
              this.pivot.x = -6 * this.facingDir;
              this.weaponSocket.rotation = 1.2;
            } else {
              const thrustT = (p - 0.2) / 0.8;
              this.pivot.x = this.facingDir * (26 * Math.sin(thrustT * Math.PI));
              this.weaponSocket.rotation = 1.57;
              this.slashArc.visible = thrustT < 0.6;
            }
            break;
          }
          case 'magic': {
            this.weaponSocket.rotation = -1.9;
            this.weaponSocket.y = -28;
            this.pivot.y = -10 * Math.sin(p * Math.PI);
            this.pivot.scale.y = s * (1.0 + Math.sin(p * Math.PI * 8) * 0.05);
            break;
          }
          case 'pray': {
            this.weaponSocket.rotation = -0.8;
            this.pivot.y = -8 * Math.sin(p * Math.PI);
            this.pivot.scale.y = s * (1.05 + Math.sin(p * Math.PI * 4) * 0.04);
            break;
          }
          case 'shot': {
            if (p < 0.3) {
              const draw = p / 0.3;
              this.pivot.x = -8 * this.facingDir * draw;
              this.weaponSocket.rotation = -0.4;
            } else {
              const recoil = (p - 0.3) / 0.7;
              this.pivot.x = this.facingDir * (12 * Math.sin(recoil * Math.PI));
              this.weaponSocket.rotation = 0.4;
            }
            break;
          }
          case 'shout': {
            if (p < 0.25) {
              this.pivot.scale.y = s * 0.8;
              this.pivot.y = 3;
            } else {
              const burst = (p - 0.25) / 0.75;
              this.pivot.scale.y = s * (1.0 + 0.3 * Math.sin(burst * Math.PI));
              this.pivot.y = -10 * Math.sin(burst * Math.PI);
              this.weaponSocket.rotation = 1.2;
            }
            break;
          }
          case 'flurry': {
            this.pivot.x = Math.sin(p * Math.PI * 12) * 10 * this.facingDir;
            this.weaponSocket.rotation = Math.sin(p * Math.PI * 8) * 0.8;
            this.slashArc.visible = Math.sin(p * Math.PI * 8) > 0;
            break;
          }
        }
      }
      return;
    }

    // 3. Анимация удара оружием и мерцание свечения заточки
    if (this.config.hasWeapon) {
      this.glowPhase += dt * 4.5;
      this.weaponGlow.alpha = 0.72 + Math.sin(this.glowPhase) * 0.28;
    }

    if (this.isAttacking && this.config.hasWeapon) {
      this.swingProgress += dt * this.aspd * 3.0;
      if (this.swingProgress >= 1) {
        this.swingProgress = 1;
        this.isAttacking = false;
        this.slashArc.visible = false;
      } else {
        // Угол взмаха: от -1.2 до +1.4 радиан
        const swingAngle = -1.2 + Math.sin(this.swingProgress * Math.PI * 0.5) * 2.6;
        this.weaponSocket.rotation = swingAngle;

        // Выпад тела вперёд к врагу
        this.pivot.x = this.facingDir * Math.sin(this.swingProgress * Math.PI) * 12;
        this.slashArc.visible = this.swingProgress > 0.15 && this.swingProgress < 0.75;
      }
    } else if (this.config.hasWeapon) {
      // Оружие в покое
      this.weaponSocket.rotation = 0.2;
      this.pivot.x = 0;
    }

    // 3. Анимация бега, прыжков или дыхания
    if (this.config.type === 'poring') {
      // Специализированная плавная физика прыжков (RO Slime Hopping) для порингов
      if (this.isMoving) {
        // Частота прыжков: ~1.25 прыжка/сек при базовой скорости
        const hopFrequency = 8.0 * speedMult;
        this.walkPhase += dt * hopFrequency;
        const cycle = (this.walkPhase % (Math.PI * 2)) / (Math.PI * 2);
        const p = cycle < 0 ? cycle + 1 : cycle;

        if (p < 0.18) {
          // Фаза 1: Сжатие перед прыжком (Windup / Squish down)
          const w = p / 0.18;
          const squash = Math.sin(w * Math.PI);
          this.pivot.scale.y = s * (1.0 - squash * 0.22);
          this.pivot.scale.x = this.facingDir * s * (1.0 + squash * 0.18);
          this.pivot.y = 0;
          this.pivot.rotation = this.facingDir * (0.04 * squash);
          this.shadow.scale.set(1.0 + squash * 0.15);
          this.shadow.alpha = 0.28;
        } else if (p < 0.72) {
          // Фаза 2: Параболический прыжок в воздухе (Airborne Arc)
          const flight = (p - 0.18) / 0.54;
          const arc = Math.sin(flight * Math.PI);
          const jumpH = isMvp ? 18 : isElite ? 15 : 12;
          this.pivot.y = -arc * jumpH;
          // В полете вытягивается вертикально
          this.pivot.scale.y = s * (1.0 + arc * 0.16);
          this.pivot.scale.x = this.facingDir * s * (1.0 - arc * 0.10);
          this.pivot.rotation = this.facingDir * (0.07 * arc);
          // Тень под порингом сжимается на высоте
          const shadowScale = Math.max(0.65, 1.0 - arc * 0.35);
          this.shadow.scale.set(shadowScale);
          this.shadow.alpha = 0.28 * (1.0 - arc * 0.3);
        } else if (p < 0.90) {
          // Фаза 3: Приземление и упругое растекание (Impact Squash)
          const land = (p - 0.72) / 0.18;
          const impact = Math.sin(land * Math.PI);
          this.pivot.y = 0;
          this.pivot.scale.y = s * (1.0 - impact * 0.24);
          this.pivot.scale.x = this.facingDir * s * (1.0 + impact * 0.20);
          this.pivot.rotation = 0;
          this.shadow.scale.set(1.0 + impact * 0.18);
          this.shadow.alpha = 0.28;
        } else {
          // Фаза 4: Возврат в исходную форму перед следующим прыжком (Settle)
          const settle = (p - 0.90) / 0.10;
          const elastic = Math.sin(settle * Math.PI);
          this.pivot.y = 0;
          this.pivot.scale.y = s * (1.0 + elastic * 0.05);
          this.pivot.scale.x = this.facingDir * s * (1.0 - elastic * 0.04);
          this.pivot.rotation = 0;
          this.shadow.scale.set(1.0);
          this.shadow.alpha = 0.28;
        }
      } else {
        // Покой поринга: мягкое желеобразное дыхание
        this.idlePhase += dt * 3.2;
        const breath = Math.sin(this.idlePhase);
        const targetScaleY = s * (1.0 + breath * 0.04);
        const targetScaleX = this.facingDir * s * (1.0 - breath * 0.03);

        // Плавное мягкое затухание высоты и наклона при остановке (исключает 1-кадровый рывок)
        this.pivot.y += (0 - this.pivot.y) * Math.min(1, dt * 14);
        this.pivot.rotation += (0 - this.pivot.rotation) * Math.min(1, dt * 14);
        this.pivot.scale.y = targetScaleY;
        this.pivot.scale.x = targetScaleX;
        this.shadow.scale.set(1.0 + breath * 0.03);
        this.shadow.alpha = 0.28;
      }
    } else {
      // Стандартная гуманоидная и монструозная походка
      if (this.isMoving) {
        this.walkPhase += dt * 12 * speedMult;
        // Наклон корпуса в такт шагам (1 цикл = 2 шага)
        this.pivot.rotation = Math.sin(this.walkPhase) * 0.05;
        // Вертикальное колебание корпуса при каждом шаге (симметрично для обеих ног)
        const stepBounce = (1 - Math.cos(this.walkPhase * 2)) * 0.5;
        this.pivot.y = -stepBounce * 5;
        this.pivot.scale.y = s * (1.0 + (stepBounce - 0.5) * 0.06);
        this.pivot.scale.x = this.facingDir * s * (1.0 - (stepBounce - 0.5) * 0.04);
        this.shadow.scale.set(1.0 - stepBounce * 0.1);
      } else {
        this.idlePhase += dt * 3;
        const breath = Math.sin(this.idlePhase);
        // Плавное затухание при переходе от бега к покою
        this.pivot.y += (0 - this.pivot.y) * Math.min(1, dt * 14);
        this.pivot.rotation += (0 - this.pivot.rotation) * Math.min(1, dt * 14);
        this.pivot.scale.y = s * (1.0 + breath * 0.025);
        this.pivot.scale.x = this.facingDir * s;
        this.shadow.scale.set(1.0);
        this.shadow.alpha = 0.28;
      }
    }
  }

  public setFacing(dir: number): void {
    // Мертвая зона > 0.5px для исключения микрофлипов спрайта при вертикальном движении
    if (Math.abs(dir) > 0.5) {
      this.facingDir = dir > 0 ? 1 : -1;
    }
  }
}
