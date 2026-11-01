import * as PIXI from 'pixi.js';
import { PixiStage } from './PixiStage';
import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
import { FloatingTextManager } from '../entities/FloatingText';
import { MONSTERS_DATABASE } from '../data/monsters.data';
import { CombatSystem } from '../systems/CombatSystem';
import { SoundFX } from './SoundFX';
import { EventBus } from './EventBus';
import { SaveManager } from './SaveManager';
import { VfxSystem } from '../systems/VfxSystem';
import { LootDrop } from '../entities/LootDrop';
import { CARDS_DATABASE } from '../data/cards.data';
import { ITEMS_DATABASE } from '../data/items.data';
import { EquipSlot, MonsterDef, WeaponArchetype, InventoryItem, BossTelegraph } from '../types/game.types';
import { ItemGeneratorSystem } from '../systems/ItemGeneratorSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { SkillSystem } from '../systems/SkillSystem';
import { Portal } from '../entities/Portal';
import { ZONES_DATABASE } from '../data/zones.data';
import { MarketStallSystem } from '../systems/MarketStallSystem';
import { AlchemySystem } from '../systems/AlchemySystem';
import { Companion } from '../entities/Companion';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { WorldMapSystem } from '../systems/WorldMapSystem';
import { QuestSystem } from '../systems/QuestSystem';
import { FieldNpc } from '../entities/FieldNpc';
import { PointOfInterest } from '../entities/PointOfInterest';
import { ResourceNode } from '../entities/ResourceNode';
import { EconomySystem } from '../systems/EconomySystem';
import { CraftingSystem } from '../systems/CraftingSystem';

export class GameWorld {
  public stage: PixiStage;
  public player: Player;
  public monsters: Monster[] = [];
  public floatingTexts: FloatingTextManager;
  public vfx: VfxSystem;
  public projectileSystem: ProjectileSystem;
  public lootDrops: LootDrop[] = [];
  public portals: Portal[] = [];
  public spawnSystem: SpawnSystem;
  public skillSystem: SkillSystem = new SkillSystem();
  public marketStall = new MarketStallSystem();
  public alchemy = new AlchemySystem();
  public companion: Companion;
  public worldMapSystem = new WorldMapSystem();
  public questSystem = new QuestSystem();
  public economySystem = new EconomySystem();
  public craftingSystem = new CraftingSystem();
  public fieldNpcs: FieldNpc[] = [];
  public pointsOfInterest: PointOfInterest[] = [];
  public resourceNodes: ResourceNode[] = [];
  public interactedPois: Set<string> = new Set();
  public pendingInteractNpc: FieldNpc | null = null;
  public pendingInteractPoi: PointOfInterest | null = null;
  public pendingInteractResourceNode: ResourceNode | null = null;
  public channelingPoi: PointOfInterest | null = null;
  public channelingResourceNode: ResourceNode | null = null;
  public channelTimeRemaining: number = 0;
  public channelResourceTimeRemaining: number = 0;

  public activeTelegraphs: BossTelegraph[] = [];
  public telegraphGraphics: PIXI.Graphics = new PIXI.Graphics();
  private ifritAuraTimer: number = 0;

  private isRunning: boolean = false;
  private respawnQueue: Array<{ monsterId: string; timer: number }> = [];
  private portalCooldown: number = 0;

  constructor(mountNode: HTMLElement) {
    this.stage = new PixiStage(mountNode);
    this.stage.groundLayer.addChild(this.telegraphGraphics);
    this.floatingTexts = new FloatingTextManager(this.stage.floatingTextLayer);
    this.vfx = new VfxSystem(this.stage.vfxLayer);
    this.projectileSystem = new ProjectileSystem(this.stage.vfxLayer);

    // Создаём игрока в центре площади деревни (перед фонтаном)
    this.player = new Player(0, 100);
    this.player.worldMapSystem = this.worldMapSystem;
    this.stage.groundLayer.addChild(this.player.campRadiusCircle);
    this.stage.ySortLayer.addChild(this.player.campGraphics);
    this.stage.ySortLayer.addChild(this.player.puppet.root);

    // Создаём напарника
    this.companion = new Companion(this.player.x, this.player.y);
    this.stage.ySortLayer.addChild(this.companion.puppet.root);

    // Загрузка сохранённого прогресса
    const savedData = SaveManager.load();
    if (savedData) {
      SaveManager.applyToPlayer(this.player, savedData);
      if (savedData.stallSlots) {
        this.marketStall = new MarketStallSystem(savedData.stallSlots);
      }
      if (savedData.campLevel) {
        this.marketStall.campLevel = savedData.campLevel;
      }
      if (savedData.hasCompanion !== undefined) {
        this.companion.isHired = savedData.hasCompanion;
      }
      if (savedData.activeBuffs) {
        this.alchemy = new AlchemySystem(savedData.activeBuffs);
        this.player.activeBuffs = [...savedData.activeBuffs];
      }
      if (savedData.questsProgress) {
        this.questSystem = new QuestSystem(savedData.questsProgress);
      }
      if (savedData.interactedPois) {
        this.interactedPois = new Set(savedData.interactedPois);
      }
      if (savedData.tradeVolume !== undefined || savedData.bountyContracts) {
        this.economySystem = new EconomySystem(
          savedData.tradeVolume || 0,
          savedData.bountyContracts
        );
      }
      if (savedData.blacksmithLevel !== undefined) {
        this.craftingSystem = new CraftingSystem(
          savedData.blacksmithLevel,
          savedData.blacksmithExp || 0
        );
      }
    }

    // Регистрация мира в менеджере сохранений
    SaveManager.registerWorld(this);

    // Инициализация системы спавна для текущей зоны
    this.spawnSystem = new SpawnSystem(this.player.currentZoneId || 'zone_village');
    this.player.isSafeZone = !!this.spawnSystem.currentZone.isSafeZone;
    this.applyZoneVisuals();
    this.worldMapSystem.setZone(this.spawnSystem.currentZone, this.stage.groundLayer);
    this.rebuildPortals();
    this.rebuildNpcsAndPois();

    // Запуск фонового автосохранения каждые 5 секунд
    SaveManager.startAutoSave(this.player, 5000);

    this.initZoneMonsters();
    this.setupInteractions();
    this.startTicker();
  }

  private applyZoneVisuals(): void {
    if (this.stage.app.renderer) {
      this.stage.app.renderer.background.color = this.spawnSystem.currentZone.bgColor;
    }
  }

  public rebuildPortals(): void {
    // Очистка старых порталов
    for (const p of this.portals) {
      this.stage.groundLayer.removeChild(p.root);
      p.destroy();
    }
    this.portals = [];

    // Создание новых порталов зоны
    for (const pDef of this.spawnSystem.currentZone.portals) {
      const portal = new Portal(pDef);
      this.portals.push(portal);
      this.stage.groundLayer.addChild(portal.root);
    }
  }

  public rebuildNpcsAndPois(): void {
    // Очистка старых NPC
    for (const npc of this.fieldNpcs) {
      this.stage.ySortLayer.removeChild(npc.root);
      npc.destroy();
    }
    this.fieldNpcs = [];

    // Очистка старых POI
    for (const poi of this.pointsOfInterest) {
      this.stage.ySortLayer.removeChild(poi.root);
      poi.destroy();
    }
    this.pointsOfInterest = [];

    // Очистка старых рудных жил и кустов трав
    for (const node of this.resourceNodes) {
      this.stage.ySortLayer.removeChild(node.root);
      node.destroy();
    }
    this.resourceNodes = [];

    const zone = this.spawnSystem.currentZone;

    // Создание NPC зоны
    if (zone.npcs) {
      for (const def of zone.npcs) {
        const npc = new FieldNpc(def, (n) => {
          this.triggerNpcInteraction(n);
        });
        this.fieldNpcs.push(npc);
        this.stage.ySortLayer.addChild(npc.root);
      }
    }

    // Создание POI зоны (Статуи Богини, Сундуки)
    if (zone.pois) {
      for (const def of zone.pois) {
        const isInteracted = this.interactedPois.has(def.id);
        const poi = new PointOfInterest(def, isInteracted, (p) => {
          this.triggerPoiInteraction(p);
        });
        if (def.type === 'FIELD_CHEST' && isInteracted) {
          poi.isOpened = true;
          poi.renderVisual();
        }
        this.pointsOfInterest.push(poi);
        this.stage.ySortLayer.addChild(poi.root);
      }
    }

    // Создание рудных жил и кустов трав зоны
    if (zone.resources) {
      for (const def of zone.resources) {
        const node = new ResourceNode(def, (n) => {
          this.triggerResourceInteraction(n);
        });
        this.resourceNodes.push(node);
        this.stage.ySortLayer.addChild(node.root);
      }
    }
  }

  public initZoneMonsters(): void {
    // Очистка существующих мобов и активных телеграфов
    for (const m of this.monsters) {
      this.stage.ySortLayer.removeChild(m.puppet.root);
      m.destroy();
    }
    this.monsters = [];
    this.respawnQueue = [];
    this.activeTelegraphs = [];
    this.telegraphGraphics.clear();

    // В безопасных зонах (Деревня Новичков) монстры не спавнятся
    if (this.spawnSystem.currentZone.isSafeZone) {
      this.spawnSystem.broadcastMvpStatus();
      return;
    }

    // 1. Обычные монстры (18-20 мобов)
    const normalCount = this.spawnSystem.normalTargetCount;
    for (let i = 0; i < normalCount; i++) {
      const def = this.spawnSystem.pickRandomMonsterDef();
      this.spawnMonster(def);
    }

    // 2. Элитные вожаки со свитой (2 вожака со свитой из 2 миньонов каждый)
    const eliteCount = this.spawnSystem.eliteTargetCount;
    for (let i = 0; i < eliteCount; i++) {
      const eliteDef = this.spawnSystem.pickEliteMonsterDef();
      this.spawnElitePack(eliteDef);
    }

    this.spawnSystem.broadcastMvpStatus();
  }

  public changeZone(targetZoneId: string, targetX: number, targetY: number): void {
    if (this.portalCooldown > 0) return;
    this.portalCooldown = 2.0; // Кулдаун перехода, чтобы не отскакивать назад

    // Очищаем выпавший лут
    for (const l of this.lootDrops) {
      this.stage.ySortLayer.removeChild(l.root);
      l.destroy();
    }
    this.lootDrops = [];

    this.player.currentZoneId = targetZoneId;
    this.spawnSystem.setZone(targetZoneId);
    this.player.isSafeZone = !!this.spawnSystem.currentZone.isSafeZone;
    this.worldMapSystem.setZone(this.spawnSystem.currentZone, this.stage.groundLayer);
    this.applyZoneVisuals();
    this.rebuildPortals();
    this.rebuildNpcsAndPois();

    // Сброс целевых взаимодействий
    this.pendingInteractNpc = null;
    this.pendingInteractPoi = null;
    this.pendingInteractResourceNode = null;
    this.channelingPoi = null;
    if (this.channelingResourceNode) {
      this.channelingResourceNode.isChanneling = false;
      this.channelingResourceNode.channelProgress = 0;
      this.channelingResourceNode = null;
    }

    // Перемещаем героя
    this.player.x = targetX;
    this.player.y = targetY;
    this.player.moveTo(targetX, targetY);

    this.initZoneMonsters();
    SoundFX.playLevelUp();

    EventBus.emit('ZONE_CHANGED', {
      zoneId: targetZoneId,
      zoneName: this.spawnSystem.currentZone.name,
    });
    EventBus.emit('COMBAT_LOG', {
      message: `🚪 Вы вошли в локацию: [${this.spawnSystem.currentZone.name}]`,
      color: '#38bdf8',
    });
  }

  /**
   * Быстрое перемещение (Крыло Бабочки) в центр Деревни Новичков
   */
  public teleportToVillage(): void {
    if (this.channelingPoi) {
      this.channelingPoi.isChanneling = false;
      this.channelingPoi = null;
    }
    if (this.channelingResourceNode) {
      this.channelingResourceNode.isChanneling = false;
      this.channelingResourceNode.channelProgress = 0;
      this.channelingResourceNode = null;
    }
    this.pendingInteractNpc = null;
    this.pendingInteractPoi = null;
    this.pendingInteractResourceNode = null;

    this.changeZone('zone_village', 0, 100);
    SoundFX.playLevelUp();
    this.floatingTexts.spawn(0, -35, '🦋 Крыло Бабочки!', {
      color: 0x38bdf8,
      isCrit: true,
    });
  }

  public spawnMvp(bossDef: MonsterDef): Monster {
    const angle = Math.random() * Math.PI * 2;
    const dist = 100 + Math.random() * 200;
    const rawX = Math.cos(angle) * dist;
    const rawY = Math.max(-800, Math.sin(angle) * dist);
    const pos = this.worldMapSystem ? this.worldMapSystem.resolveMovement(0, 0, rawX, rawY, 24) : { x: rawX, y: rawY };

    const boss = new Monster(bossDef, pos.x, pos.y, 'MVP');
    boss.onTriggerTelegraph = (b, targetX, targetY) => {
      this.triggerBossTelegraph(b, targetX, targetY);
    };

    this.monsters.push(boss);
    this.stage.ySortLayer.addChild(boss.puppet.root);
    return boss;
  }

  public spawnElitePack(leaderDef: MonsterDef): Monster {
    const angle = Math.random() * Math.PI * 2;
    const dist = 140 + Math.random() * 450;
    const rawX = Math.cos(angle) * dist;
    const rawY = Math.max(-800, Math.sin(angle) * dist);
    const pos = this.worldMapSystem ? this.worldMapSystem.resolveMovement(0, 0, rawX, rawY, 18) : { x: rawX, y: rawY };

    // Патч 3.5: Статный одиночный мини-босс Вожак без свиты миньонов
    const leader = new Monster(leaderDef, pos.x, pos.y, 'ELITE');
    this.monsters.push(leader);
    this.stage.ySortLayer.addChild(leader.puppet.root);

    return leader;
  }

  public triggerBossTelegraph(boss: Monster, _targetX: number, _targetY: number): void {
    // Патч 3.5: Фирменный прямой сокрушающий удар раз в 12 сек без спама красных кругов
    const cries = ['СОКРУШАЮЩИЙ УДАР!', 'ГНЕВ БЕЗДНЫ!', 'ПОГИБЕЛЬ СМЕРТНЫХ!', 'ЯРОСТЬ ВЛАДЫКИ!'];
    const cry = cries[Math.floor(Math.random() * cries.length)];

    this.floatingTexts.spawn(boss.x, boss.y - 35, `💥 [${cry}]`, {
      color: 0xf59e0b,
      isCrit: true,
    });
    EventBus.emit('COMBAT_LOG', {
      message: `👑 ${boss.getDisplayName()} произносит: "${cry}" и наносит сокрушающий удар (160% ATK)!`,
      color: '#f59e0b',
    });
    SoundFX.playSkillCast();
    this.handleMonsterAttack(boss, 1.6);
  }

  public castSkill(skillId: string, silent: boolean = false): boolean {
    return this.skillSystem.castSkill(
      skillId,
      this.player,
      this.player.currentTargetMonster,
      this.monsters,
      this.floatingTexts,
      this.vfx,
      this.projectileSystem,
      (deadMonster: Monster) => this.handleMonsterDeath(deadMonster),
      silent,
      (intensity?: number, duration?: number) => this.stage.triggerScreenShake(intensity, duration)
    );
  }

  private spawnMonster(def = MONSTERS_DATABASE.poring): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 450;
    const rawX = Math.cos(angle) * dist;
    const rawY = Math.max(-800, Math.sin(angle) * dist);
    const pos = this.worldMapSystem ? this.worldMapSystem.resolveMovement(0, 0, rawX, rawY, 14) : { x: rawX, y: rawY };

    const monster = new Monster(def, pos.x, pos.y, 'NORMAL');
    this.monsters.push(monster);
    this.stage.ySortLayer.addChild(monster.puppet.root);
  }

  public spawnLoot(
    x: number,
    y: number,
    lootId: string,
    isCard: boolean = false,
    equipmentInstance?: InventoryItem
  ): void {
    const drop = new LootDrop(x, y, lootId, isCard, this.vfx, equipmentInstance);
    this.lootDrops.push(drop);
    this.stage.ySortLayer.addChild(drop.root);
  }

  private setupInteractions(): void {
    // Слушатель системных всплывающих текстов (восстановление SP/HP, ковка, сбор)
    EventBus.on('FLOATING_TEXT', (data) => {
      this.floatingTexts.spawn(
        data.x !== undefined ? data.x : this.player.x,
        data.y !== undefined ? data.y : this.player.y - 28,
        data.text,
        {
          color: data.color,
          isCrit: data.isCrit,
          isMiss: data.isMiss,
        }
      );
    });

    const view = this.stage.app.view as HTMLCanvasElement;

    view.addEventListener('pointerdown', (e: MouseEvent) => {
      // Игнорируем клики, если они попали по интерфейсу
      const target = e.target as HTMLElement;
      if (target !== view) return;

      const rect = view.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = this.stage.screenToWorld(screenX, screenY);

      // 1. Проверяем клик по NPC
      let clickedNpc: FieldNpc | null = null;
      for (const npc of this.fieldNpcs) {
        const dist = Math.hypot(npc.x - worldPos.x, npc.y - worldPos.y);
        if (dist <= 35) {
          clickedNpc = npc;
          break;
        }
      }
      if (clickedNpc) {
        this.triggerNpcInteraction(clickedNpc);
        return;
      }

      // 2. Проверяем клик по POI (Статуя, Сундук)
      let clickedPoi: PointOfInterest | null = null;
      for (const poi of this.pointsOfInterest) {
        const dist = Math.hypot(poi.x - worldPos.x, poi.y - worldPos.y);
        if (dist <= 35) {
          clickedPoi = poi;
          break;
        }
      }
      if (clickedPoi) {
        this.triggerPoiInteraction(clickedPoi);
        return;
      }

      // 2.1 Проверяем клик по рудной жиле / кусту трав
      let clickedResource: ResourceNode | null = null;
      for (const node of this.resourceNodes) {
        const dist = Math.hypot(node.x - worldPos.x, node.y - worldPos.y);
        if (dist <= 30) {
          clickedResource = node;
          break;
        }
      }
      if (clickedResource) {
        this.triggerResourceInteraction(clickedResource);
        return;
      }

      // Сброс очередей взаимодействий при клике в другое место
      this.pendingInteractNpc = null;
      this.pendingInteractPoi = null;
      this.pendingInteractResourceNode = null;
      if (this.channelingPoi) {
        this.channelingPoi.isChanneling = false;
        this.channelingPoi.channelProgress = 0;
        this.channelingPoi = null;
      }
      if (this.channelingResourceNode) {
        this.channelingResourceNode.isChanneling = false;
        this.channelingResourceNode.channelProgress = 0;
        this.channelingResourceNode = null;
      }

      // 3. Проверяем клик по мобу
      let clickedMonster: Monster | null = null;
      for (const m of this.monsters) {
        if (m.isDead()) continue;
        const dist = Math.hypot(m.x - worldPos.x, m.y - worldPos.y);
        if (dist <= m.def.radius + 18) {
          clickedMonster = m;
          break;
        }
      }

      if (clickedMonster) {
        this.player.targetMonster(clickedMonster);
      } else {
        this.player.moveTo(worldPos.x, worldPos.y);
      }
    });
  }

  public triggerNpcInteraction(npc: FieldNpc): void {
    this.pendingInteractPoi = null;
    this.player.clearTargetMonster();
    const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
    if (dist <= 75) {
      this.handleNpcInteract(npc);
    } else {
      this.pendingInteractNpc = npc;
      this.player.moveTo(npc.x, npc.y);
    }
  }

  public handleNpcInteract(npc: FieldNpc): void {
    SoundFX.playCampToggle();
    EventBus.emit('OPEN_NPC_DIALOG', {
      npcName: npc.def.name,
      greeting: npc.def.dialogGreeting,
      role: npc.def.role,
    });
    EventBus.emit('COMBAT_LOG', {
      message: `${npc.def.icon} [${npc.def.name}]: «${npc.def.dialogGreeting}»`,
      color: '#38bdf8',
    });

    switch (npc.def.role) {
      case 'VILLAGE_SHOP':
        EventBus.emit('OPEN_SHOP_MODAL', true);
        break;
      case 'VILLAGE_BLACKSMITH':
        EventBus.emit('OPEN_CAMP_TAB', { tab: 'blacksmith' });
        break;
      case 'MASTER_BLACKSMITH':
        EventBus.emit('OPEN_CAMP_TAB', { tab: 'blacksmith', subTab: 'card_extract' });
        break;
      case 'JOB_MENTOR':
        EventBus.emit('OPEN_SKILLS_WINDOW', true);
        break;
      case 'HIGH_JOB_MENTOR':
        EventBus.emit('OPEN_SKILLS_WINDOW', { initialTab: 'jobs' });
        break;
      case 'BOUNTY_BOARD':
      case 'FIELD_QUEST_GIVER':
        EventBus.emit('OPEN_QUESTS_WINDOW', true);
        break;
      case 'ELITE_BOUNTY_BOARD':
        EventBus.emit('OPEN_ELITE_BOUNTY_MODAL', true);
        break;
      case 'BESTIARY_SCHOLAR':
        EventBus.emit('OPEN_CARD_EXCHANGE_MODAL', true);
        break;
      case 'VILLAGE_ALCHEMIST':
        EventBus.emit('OPEN_CAMP_TAB', { tab: 'alchemy' });
        break;
      case 'COMPANION_RECRUITER':
        EventBus.emit('OPEN_CAMP_TAB', { tab: 'companion' });
        break;
    }
  }

  public triggerPoiInteraction(poi: PointOfInterest): void {
    this.pendingInteractNpc = null;
    this.player.clearTargetMonster();
    const dist = Math.hypot(this.player.x - poi.x, this.player.y - poi.y);
    if (dist <= 65) {
      this.startPoiInteract(poi);
    } else {
      this.pendingInteractPoi = poi;
      this.player.moveTo(poi.x, poi.y);
    }
  }

  public startPoiInteract(poi: PointOfInterest): void {
    if (poi.def.type === 'GODDESS_STATUE') {
      this.handlePoiGoddessStatue(poi);
    } else if (poi.def.type === 'FIELD_CHEST') {
      if (poi.isOpened) {
        EventBus.emit('COMBAT_LOG', { message: 'Сундук уже открыт и пуст.', color: '#94a3b8' });
        return;
      }
      this.channelingPoi = poi;
      this.channelTimeRemaining = 1.5;
      poi.isChanneling = true;
      poi.channelProgress = 0;
      this.player.moveTo(this.player.x, this.player.y);
      EventBus.emit('COMBAT_LOG', { message: '⏳ Открытие замка древнего сундука (1.5 сек)...', color: '#facc15' });
    }
  }

  private handlePoiGoddessStatue(poi: PointOfInterest): void {
    const isFirstTime = !this.interactedPois.has(poi.def.id);
    if (isFirstTime) {
      this.interactedPois.add(poi.def.id);
      poi.isInteracted = true;
      const statPts = poi.def.rewardStatPoints || 3;
      const skillPts = poi.def.rewardSkillPoints || 1;
      this.player.statPoints += statPts;
      this.player.jobSystem.getActiveJob().skillPoints += skillPts;
      SoundFX.playLevelUp();
      this.floatingTexts.spawn(poi.x, poi.y - 35, `🌟 +${skillPts} Skill, +${statPts} Stats!`, {
        color: 0xfde047,
        isCrit: true,
      });
      EventBus.emit('COMBAT_LOG', {
        message: `🌟 Вы впервые преклонили колени перед [${poi.def.name}]! Получено: +${skillPts} Очко навыков, +${statPts} Очка характеристик!`,
        color: '#facc15',
      });
      this.player.emitAllStats();
    }

    // Наложение баффа "Благословение Богини" на 5 минут (+150 MaxHP)
    this.player.addBuff({
      id: 'goddess_blessing',
      name: 'Благословение Богини',
      icon: '🌟',
      statKey: 'maxHp',
      value: 150,
      duration: poi.def.buffDurationSec || 300,
      maxDuration: poi.def.buffDurationSec || 300,
    });
    SoundFX.playHeal();
    EventBus.emit('COMBAT_LOG', {
      message: `✨ [${poi.def.name}] дарует вам священное благословение (+150 Max HP на 5 мин)!`,
      color: '#a7f3d0',
    });
  }

  private finishPoiChest(poi: PointOfInterest): void {
    poi.isOpened = true;
    poi.isChanneling = false;
    poi.channelProgress = 0;
    poi.renderVisual();
    this.interactedPois.add(poi.def.id);

    // Награда за сундук
    const zenyReward = 500 + Math.floor(Math.random() * 800);
    this.player.addZeny(zenyReward);
    this.spawnLoot(poi.x - 12, poi.y, 'red_potion');
    this.spawnLoot(poi.x + 12, poi.y, 'red_potion');
    this.spawnLoot(poi.x, poi.y + 10, 'green_herb');

    SoundFX.playLevelUp();
    this.floatingTexts.spawn(poi.x, poi.y - 30, `+${zenyReward} Zeny!`, {
      color: 0xfacc15,
      isCrit: true,
    });
    EventBus.emit('COMBAT_LOG', {
      message: `📦 Вы открыли [${poi.def.name}]! Найдено: ${zenyReward} Zeny, Зелья здоровья и целебные травы!`,
      color: '#38bdf8',
    });
  }

  public triggerResourceInteraction(node: ResourceNode): void {
    if (node.isDepleted) {
      EventBus.emit('COMBAT_LOG', {
        message: 'Эта жила/куст истощены. Подождите восстановления ресурсов!',
        color: '#94a3b8',
      });
      return;
    }
    this.pendingInteractNpc = null;
    this.pendingInteractPoi = null;
    this.player.clearTargetMonster();
    const dist = Math.hypot(this.player.x - node.x, this.player.y - node.y);
    if (dist <= 55) {
      this.startHarvestResource(node);
    } else {
      this.pendingInteractResourceNode = node;
      this.player.moveTo(node.x, node.y);
    }
  }

  public startHarvestResource(node: ResourceNode): void {
    if (node.isDepleted || node.isChanneling) return;
    this.channelingResourceNode = node;
    this.channelResourceTimeRemaining = 1.2;
    node.isChanneling = true;
    node.channelProgress = 0;
    this.player.moveTo(this.player.x, this.player.y);
    const isVein = node.def.type.includes('VEIN');
    EventBus.emit('COMBAT_LOG', {
      message: `${isVein ? '⛏️' : '🌿'} Добыча [${node.def.name}] (1.2 сек)...`,
      color: isVein ? '#f59e0b' : '#10b981',
    });
  }

  public finishHarvestResource(node: ResourceNode): void {
    const loot = node.harvestLoot();
    this.player.addItem(loot.itemId, loot.count);
    node.deplete();

    const isVein = node.def.type.includes('VEIN');
    if (isVein) {
      SoundFX.playMining();
    } else {
      SoundFX.playHarvest();
    }

    const color = isVein ? 0xf59e0b : 0x10b981;
    this.floatingTexts.spawn(node.x, node.y - 25, `+${loot.count} ${loot.name}!`, {
      color,
      isCrit: true,
    });

    EventBus.emit('COMBAT_LOG', {
      message: `✨ Собрано: ${loot.count}x [${loot.name}]! (+15 Base EXP, +25 Job EXP)`,
      color: isVein ? '#f59e0b' : '#34d399',
    });

    this.player.gainBaseExp(15);
    this.player.gainJobExp(25);

    // Дополнительный шанс на редкие руды заточки при добыче рудных жил
    if (isVein) {
      const zoneTier = this.spawnSystem.currentZone.tier || Math.min(5, Math.max(1, Math.ceil(this.spawnSystem.currentZone.minLevel / 15)));
      if (zoneTier >= 3 && Math.random() < 0.35) {
        const bonusOre = Math.random() < 0.5 ? 'oridecon' : 'elunium';
        this.player.addItem(bonusOre, 1);
        EventBus.emit('COMBAT_LOG', {
          message: `⛏️ [Бонус рудокопа]: Найдена редкая руда [${ITEMS_DATABASE[bonusOre]?.name || bonusOre}]!`,
          color: '#a855f7',
        });
      } else if (zoneTier === 2 && Math.random() < 0.35) {
        this.player.addItem('phracon', 1);
        EventBus.emit('COMBAT_LOG', {
          message: `⛏️ [Бонус рудокопа]: Найдена руда [Фракон]!`,
          color: '#38bdf8',
        });
      }
    }

    EventBus.emit('RESOURCE_HARVESTED', {
      nodeType: node.def.type,
      itemId: loot.itemId,
      count: loot.count,
    });

    if (this.player.campActive && this.player.campState === 'HARVEST_RESOURCE') {
      this.player.targetResourceNode = null;
      this.player.campState = 'FIND_TARGET';
    }
  }

  private startTicker(): void {
    this.isRunning = true;
    this.stage.app.ticker.add((delta) => {
      if (!this.isRunning) return;
      try {
        // delta в PixiJS — множитель кадров (1.0 при 60fps), переводим в секунды
        const dt = Math.min(0.1, delta / 60);
        this.update(dt);
      } catch (err) {
        console.error('GameWorld update loop error caught by ticker safety guard:', err);
      }
    });
  }

  public update(dt: number): void {
    // 0. Обновление кулдаунов скиллов и порталов
    this.skillSystem.update(dt);
    if (this.portalCooldown > 0) {
      this.portalCooldown -= dt;
    }

    // Проверка порталов зоны
    for (const p of this.portals) {
      p.update(dt);
      if (this.portalCooldown <= 0 && p.isPlayerNear(this.player.x, this.player.y)) {
        const targetZone = ZONES_DATABASE[p.def.targetZoneId];
        const reqLevel = p.def.minLevel ?? (targetZone ? targetZone.minLevel : 1);
        if (this.player.level < reqLevel) {
          this.portalCooldown = 1.5;
          this.floatingTexts.spawn(this.player.x, this.player.y - 30, `🔒 Нужен Ур. ${reqLevel}!`, {
            color: 0xef4444,
            isCrit: true,
          });
          EventBus.emit('COMBAT_LOG', {
            message: `🚫 Вход заблокирован! Локация [${targetZone?.name || p.def.targetZoneId}] требует ${reqLevel} уровень.`,
            color: '#f87171',
          });
          break;
        }
        this.changeZone(p.def.targetZoneId, p.def.targetX, p.def.targetY);
        break;
      }
    }

    // Обновление NPC и POI зоны
    for (const npc of this.fieldNpcs) {
      npc.update(dt);
    }
    for (const poi of this.pointsOfInterest) {
      poi.update(dt);
    }
    for (const node of this.resourceNodes) {
      node.update(dt);
    }

    // Проверка прибытия к NPC
    if (this.pendingInteractNpc) {
      const d = Math.hypot(this.player.x - this.pendingInteractNpc.x, this.player.y - this.pendingInteractNpc.y);
      if (d <= 75) {
        this.handleNpcInteract(this.pendingInteractNpc);
        this.pendingInteractNpc = null;
      }
    }

    // Проверка прибытия к POI (Статуя, Сундук)
    if (this.pendingInteractPoi) {
      const d = Math.hypot(this.player.x - this.pendingInteractPoi.x, this.player.y - this.pendingInteractPoi.y);
      if (d <= 65) {
        this.startPoiInteract(this.pendingInteractPoi);
        this.pendingInteractPoi = null;
      }
    }

    // Проверка прибытия к рудной жиле / кусту трав
    if (this.pendingInteractResourceNode) {
      const d = Math.hypot(
        this.player.x - this.pendingInteractResourceNode.x,
        this.player.y - this.pendingInteractResourceNode.y
      );
      if (d <= 55) {
        const node = this.pendingInteractResourceNode;
        this.pendingInteractResourceNode = null;
        this.startHarvestResource(node);
      }
    }

    // Открытие сундука (канал 1.5 сек)
    if (this.channelingPoi) {
      const d = Math.hypot(this.player.x - this.channelingPoi.x, this.player.y - this.channelingPoi.y);
      if (d > 75) {
        this.channelingPoi.isChanneling = false;
        this.channelingPoi.channelProgress = 0;
        this.channelingPoi = null;
        EventBus.emit('COMBAT_LOG', { message: 'Открытие сундука прервано.', color: '#ef4444' });
      } else {
        this.channelTimeRemaining -= dt;
        this.channelingPoi.channelProgress = Math.max(0, Math.min(1, 1 - this.channelTimeRemaining / 1.5));
        if (this.channelTimeRemaining <= 0) {
          this.finishPoiChest(this.channelingPoi);
          this.channelingPoi = null;
        }
      }
    }

    // Сбор руды или трав (канал 1.2 сек)
    if (this.channelingResourceNode) {
      const d = Math.hypot(
        this.player.x - this.channelingResourceNode.x,
        this.player.y - this.channelingResourceNode.y
      );
      if (d > 75) {
        this.channelingResourceNode.isChanneling = false;
        this.channelingResourceNode.channelProgress = 0;
        this.channelingResourceNode = null;
        EventBus.emit('COMBAT_LOG', { message: 'Сбор ресурсов прерван.', color: '#ef4444' });
      } else {
        this.channelResourceTimeRemaining -= dt;
        this.channelingResourceNode.channelProgress = Math.max(
          0,
          Math.min(1, 1 - this.channelResourceTimeRemaining / 1.2)
        );
        if (this.channelResourceTimeRemaining <= 0) {
          this.finishHarvestResource(this.channelingResourceNode);
          this.channelingResourceNode = null;
        }
      }
    }

    // Спавн и таймер MVP-босса
    this.spawnSystem.updateMvpTimer(dt, (bossDef) => this.spawnMvp(bossDef));

    // Спавн и таймер элитных вожаков
    const currentEliteCount = this.monsters.filter((m) => m.rank === 'ELITE' && !m.isDead()).length;
    this.spawnSystem.updateEliteTimer(dt, currentEliteCount, (eliteDef) => this.spawnElitePack(eliteDef));

    // Отрисовка и обработка телеграфируемых АОЕ-атак MVP-боссов
    this.telegraphGraphics.clear();
    for (let i = this.activeTelegraphs.length - 1; i >= 0; i--) {
      const t = this.activeTelegraphs[i];
      t.timer -= dt;
      const progress = Math.min(1, Math.max(0, 1 - t.timer / t.maxDuration));

      // 1. Внешний предупреждающий круг опасности
      this.telegraphGraphics.lineStyle(2.5, 0xef4444, 0.85);
      this.telegraphGraphics.beginFill(0xef4444, 0.16);
      this.telegraphGraphics.drawCircle(t.x, t.y, t.radius);
      this.telegraphGraphics.endFill();

      // 2. Растущий из центра диск взрыва (радиальное заполнение)
      this.telegraphGraphics.beginFill(0xdc2626, 0.35 + progress * 0.3);
      this.telegraphGraphics.drawCircle(t.x, t.y, t.radius * progress);
      this.telegraphGraphics.endFill();

      // 3. Фаза детонации при истечении 1.2 сек
      if (t.timer <= 0) {
        SoundFX.playCrit();
        this.vfx.castFirePillar(t.x, t.y);

        const distToPlayer = Math.hypot(this.player.x - t.x, this.player.y - t.y);
        if (distToPlayer <= t.radius) {
          // Игрок не успел выбежать — получает 220% урона от босса!
          let finalDmg = t.damage;

          // Учет снижения урона от боссов (Крестоносец Job Lv.50)
          const reduction = this.player.crossJobBonuses.bossDmgReductionPct || 0;
          if (reduction > 0) {
            finalDmg = Math.max(1, Math.floor(finalDmg * (1 - reduction / 100)));
          }

          // Поглощение барьером Кирие Элейсон
          if (this.player.shieldBarrierHp > 0) {
            if (this.player.shieldBarrierHp >= finalDmg) {
              this.player.shieldBarrierHp -= finalDmg;
              this.floatingTexts.spawn(this.player.x, this.player.y - 32, `🛡️ -${finalDmg} (BARRIER)`, {
                color: 0x38bdf8,
              });
              finalDmg = 0;
            } else {
              finalDmg -= this.player.shieldBarrierHp;
              this.player.shieldBarrierHp = 0;
            }
          }

          if (finalDmg > 0) {
            this.player.takeDamage(finalDmg);
            this.floatingTexts.spawn(this.player.x, this.player.y - 20, `${finalDmg}💥`, {
              color: 0xef4444,
              isCrit: true,
            });
            EventBus.emit('COMBAT_LOG', {
              message: `💥 Вы попали под сокрушительное АОЕ [${t.bossName}]! Получено ${finalDmg} урона.`,
              color: '#ef4444',
            });
          }
        } else {
          // Игрок успел выбежать из круга — урон 0!
          this.floatingTexts.spawn(this.player.x, this.player.y - 20, '💨 УКЛОНЕНИЕ!', {
            color: 0x38bdf8,
          });
          EventBus.emit('COMBAT_LOG', {
            message: `✨ Вы вовремя выбежали из зоны АОЕ атаки [${t.bossName}]!`,
            color: '#38bdf8',
          });
        }

        this.activeTelegraphs.splice(i, 1);
      }
    }

    // 1. Обновление игрока
    this.player.update(
      dt,
      this.monsters,
      (targetMonster) => {
        this.handlePlayerAttack(targetMonster);
      },
      this.resourceNodes,
      (node) => {
        this.startHarvestResource(node);
      },
      (skillId, silent) => {
        return this.castSkill(skillId, silent);
      }
    );

    // 2. Обновление мобов
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const monster = this.monsters[i];
      if (!monster || monster.isDead() || monster.isDestroyed) {
        if (monster) this.handleMonsterDeath(monster);
        continue;
      }

      monster.update(
        dt,
        this.player.x,
        this.player.y,
        (attackerMonster) => {
          this.handleMonsterAttack(attackerMonster);
        },
        this.worldMapSystem
      );
    }

    // 3. Респавн мобов (только вне безопасных зон)
    if (!this.spawnSystem.currentZone.isSafeZone) {
      for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
        const item = this.respawnQueue[i];
        item.timer -= dt;
        if (item.timer <= 0) {
          const def = this.spawnSystem.pickRandomMonsterDef();
          this.spawnMonster(def);
          this.respawnQueue.splice(i, 1);
        }
      }
    }

    // Постоянная аура огненного вихря от Карты Ифрита (100% ATK+MATK / сек)
    if (this.player.hasIfritAura) {
      this.ifritAuraTimer -= dt;
      if (this.ifritAuraTimer <= 0) {
        this.ifritAuraTimer = 1.0;
        const auraDmg = Math.max(1, Math.floor(this.player.derivedStats.atk + this.player.derivedStats.matk));
        for (const m of this.monsters) {
          if (!m.isDead()) {
            const d = Math.hypot(m.x - this.player.x, m.y - this.player.y);
            if (d <= 95) {
              m.takeDamage(auraDmg, this.player.x, this.player.y);
              this.floatingTexts.spawn(m.x, m.y - 14, `${auraDmg}🔥`, { color: 0xef4444, isCrit: true });
              if (m.isDead()) this.handleMonsterDeath(m);
            }
          }
        }
      }
    }

    // 4. Обновление спецэффектов, снарядов и лута
    this.vfx.update(dt);
    this.projectileSystem.update(dt);
    this.floatingTexts.update(dt);
    this.marketStall.update(dt, this.player);
    this.alchemy.update(dt, this.player);
    this.companion.update(dt, this.player, this.floatingTexts);

    // Синхронизация слоя сокола Охотника
    if (this.player.falcon && !this.player.falcon.root.parent) {
      this.stage.ySortLayer.addChild(this.player.falcon.root);
    }

    const inCampRange = this.player.campActive;

    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const loot = this.lootDrops[i];
      loot.update(dt, this.player.x, this.player.y, inCampRange);

      // Сбор при приближении
      const dist = Math.hypot(this.player.x - loot.x, this.player.y - loot.y);
      if (loot.isLanded && dist <= 24) {
        loot.isCollected = true;
        this.stage.ySortLayer.removeChild(loot.root);

        if (loot.equipmentInstance) {
          this.player.addInventoryItem(loot.equipmentInstance);
          SoundFX.playLootPickup();
          const r = loot.equipmentInstance.rarity || 'COMMON';
          const rarityName =
            r === 'LEGENDARY'
              ? '🌟 РЕЛИКВИЯ'
              : r === 'EPIC'
              ? '💜 ЭПИЧЕСКИЙ'
              : r === 'RARE'
              ? '💠 РЕДКИЙ'
              : r === 'UNCOMMON'
              ? '☘️ ДОБРОТНЫЙ'
              : 'ОБЫЧНЫЙ';
          const color =
            r === 'LEGENDARY'
              ? '#fbbf24'
              : r === 'EPIC'
              ? '#c084fc'
              : r === 'RARE'
              ? '#38bdf8'
              : r === 'UNCOMMON'
              ? '#22c55e'
              : '#9ca3af';

          EventBus.emit('COMBAT_LOG', {
            message: `[${rarityName}] Получена экипировка: ${loot.itemDef?.icon || '🛡️'} ${loot.itemDef?.name || loot.equipmentInstance.itemId} (${r})!`,
            color,
          });
        } else if (loot.isCard && loot.cardDef) {
          this.player.addItem(loot.cardDef.id, 1);
          SoundFX.playCardDrop();
          EventBus.emit('COMBAT_LOG', {
            message: `🌟 Выбита редкая Карта: [${loot.cardDef.name}]!`,
            color: '#fbbf24',
          });
        } else if (loot.itemDef) {
          this.player.addItem(loot.itemDef.id, 1);
          SoundFX.playLootPickup();
          EventBus.emit('COMBAT_LOG', {
            message: `Подобран предмет: ${loot.itemDef.icon} ${loot.itemDef.name}`,
            color: '#e2e8f0',
          });
        }

        loot.destroy();
        this.lootDrops.splice(i, 1);
      }
    }

    this.stage.updateCamera(this.player.x, this.player.y, dt);
    this.stage.updateYSorting();
  }

  private handlePlayerAttack(target: Monster): void {
    if (target.isDead()) return;

    const archetype = this.player.getEquippedWeaponArchetype();

    if (archetype === 'RANGED_BOW') {
      // Дальний бой: запуск стрелы со скоростью 580px/s
      this.projectileSystem.spawnArrow(this.player.x, this.player.y - 12, target, (hitTarget) => {
        if (hitTarget && !hitTarget.isDead()) {
          this.executePlayerAttackDamage(hitTarget, archetype);
        }
      });
    } else if (archetype === 'MAGIC_STAFF') {
      // Дальний бой: запуск самонаводящейся сферы маны со 100% точностью
      this.projectileSystem.spawnManaOrb(this.player.x, this.player.y - 14, target, (hitTarget) => {
        if (hitTarget && !hitTarget.isDead()) {
          this.executePlayerAttackDamage(hitTarget, archetype, { isMagic: true });
        }
      });
    } else {
      // Ближний бой (Меч или Булава)
      this.executePlayerAttackDamage(target, archetype);
    }
  }

  private executePlayerAttackDamage(
    target: Monster,
    archetype: WeaponArchetype,
    options?: { isMagic?: boolean }
  ): void {
    if (target.isDead()) return;

    let ignoreDef = this.player.cardIgnoreDefPct || 0;
    let damageMultiplier = 1.0;

    // Механика Булавы: игнор 30% брони и +50% по нежити
    if (archetype === 'HOLY_MACE') {
      ignoreDef = Math.max(ignoreDef, 30);
      if (target.def.id === 'skeleton' || target.def.id === 'zombie' || target.def.id === 'skeleton_knight') {
        damageMultiplier = 1.5;
      }
    }

    // Бонус урона по Боссам и Элите от Карт (Гидра +12%, Пламенный Драконид +15%)
    if (
      (target.rank === 'ELITE' || target.rank === 'MVP' || target.def.isElite || target.def.isMvp) &&
      this.player.cardBossDmgBonusPct > 0
    ) {
      damageMultiplier *= 1 + this.player.cardBossDmgBonusPct / 100;
    }

    // Бонус Мастерства Наследия (Монах Job Lv.50: +12% урона по Элите и MVP)
    if (
      (target.rank === 'ELITE' || target.rank === 'MVP' || target.def.isElite || target.def.isMvp) &&
      this.player.crossJobBonuses.bossDmgIncreasePct > 0
    ) {
      damageMultiplier *= 1 + this.player.crossJobBonuses.bossDmgIncreasePct / 100;
    }

    // Бонус Мастерства Наследия (Охотник Job Lv.50: +10% урона по зверям и насекомым)
    if (
      ['fabre', 'spore', 'poison_spore', 'dragon_fly'].includes(target.def.id) &&
      this.player.crossJobBonuses.beastDmgIncreasePct > 0
    ) {
      damageMultiplier *= 1 + this.player.crossJobBonuses.beastDmgIncreasePct / 100;
    }

    const result = CombatSystem.resolveAttack(
      {
        atk: options?.isMagic ? this.player.derivedStats.matk : this.player.derivedStats.atk,
        hit: this.player.derivedStats.hit,
        critChance: this.player.derivedStats.critChance,
      },
      {
        def: target.defValue,
        flee: target.def.flee,
        vit: target.defValue > 10 ? 5 : 0,
      },
      {
        isMagic: options?.isMagic,
        ignoreDefPercent: ignoreDef,
        damageMultiplier,
      }
    );

    if (result.isHit) {
      if (result.isCrit) {
        SoundFX.playCrit();
        this.floatingTexts.spawn(target.x, target.y - 20, `${result.damage}★`, {
          color: 0xfef08a,
          isCrit: true,
        });
      } else {
        SoundFX.playHit();
        const hitColor = options?.isMagic ? 0x38bdf8 : archetype === 'HOLY_MACE' ? 0xfacc15 : 0xffffff;
        this.floatingTexts.spawn(target.x, target.y - 10, `${result.damage}`, {
          color: hitColor,
        });
      }

      target.takeDamage(result.damage, this.player.x, this.player.y);

      // Вампиризм (Lifesteal)
      if (this.player.lifestealPercent > 0 && result.damage > 0) {
        const healAmt = Math.max(
          1,
          Math.floor(result.damage * (this.player.lifestealPercent / 100))
        );
        this.player.heal(healAmt);
        this.floatingTexts.spawn(this.player.x, this.player.y - 18, `+${healAmt}🩸`, {
          color: 0xf43f5e,
          isHeal: true,
        });
      }

      // Механика Меча: фронтальный клив 25% урона соседним мобам в радиусе 45px
      if (archetype === 'MELEE_SWORD') {
        const nearby = [...this.monsters];
        for (const m of nearby) {
          if (m !== target && !m.isDead() && !m.isDestroyed) {
            const d = Math.hypot(m.x - target.x, m.y - target.y);
            if (d <= 45) {
              const cleaveDmg = Math.max(1, Math.floor(result.damage * 0.25));
              m.takeDamage(cleaveDmg, target.x, target.y);
              this.floatingTexts.spawn(m.x, m.y - 12, `${cleaveDmg}🗡️`, { color: 0xf59e0b });
              if (m.isDead() && !m.isDestroyed) this.handleMonsterDeath(m);
            }
          }
        }
      }

      // Легендарный меч: Солнечный Разрез (поджигает врагов в 90px на 80% ATK)
      if (this.player.activeLegendaryMod === 'LEG_SWORD_SOLAR') {
        const burnDmg = Math.max(1, Math.floor(this.player.derivedStats.atk * 0.8));
        const nearby = [...this.monsters];
        for (const m of nearby) {
          if (!m.isDead() && !m.isDestroyed) {
            const d = Math.hypot(m.x - target.x, m.y - target.y);
            if (d <= 90) {
              m.takeDamage(burnDmg, target.x, target.y);
              this.floatingTexts.spawn(m.x, m.y - 20, `${burnDmg}☀️`, { color: 0xf97316 });
              if (m.isDead() && !m.isDestroyed) this.handleMonsterDeath(m);
            }
          }
        }
      }

      // Легендарный лук: Гнев Бури (цепная молния по 3 целям на 60% урона)
      if (this.player.activeLegendaryMod === 'LEG_BOW_STORM') {
        const chainDmg = Math.max(1, Math.floor(result.damage * 0.6));
        let chainCount = 0;
        const nearby = [...this.monsters];
        for (const m of nearby) {
          if (m !== target && !m.isDead() && !m.isDestroyed && chainCount < 3) {
            const d = Math.hypot(m.x - target.x, m.y - target.y);
            if (d <= 140) {
              m.takeDamage(chainDmg, target.x, target.y);
              this.floatingTexts.spawn(m.x, m.y - 20, `${chainDmg}⚡`, { color: 0x38bdf8 });
              if (m.isDead() && !m.isDestroyed) this.handleMonsterDeath(m);
              chainCount++;
            }
          }
        }
      }

      // Легендарный посох: Астральная Пульсация (восстановление 2% MaxSP)
      if (this.player.activeLegendaryMod === 'LEG_STAFF_ASTRAL') {
        const spGain = Math.max(2, Math.floor(this.player.derivedStats.maxSp * 0.02));
        this.player.restoreSp(spGain);
      }

      // Легендарная булава: Карающий Крест (каждый 3-й удар обрушивает Крест на 220% урона)
      if (this.player.activeLegendaryMod === 'LEG_MACE_JUDGMENT') {
        this.player.windwalkerAttackCounter = (this.player.windwalkerAttackCounter || 0) + 1;
        if (this.player.windwalkerAttackCounter >= 3) {
          this.player.windwalkerAttackCounter = 0;
          const crossDmg = Math.floor(
            (this.player.derivedStats.atk + this.player.derivedStats.matk) * 2.2
          );
          const nearby = [...this.monsters];
          for (const m of nearby) {
            if (!m.isDead() && !m.isDestroyed) {
              const d = Math.hypot(m.x - target.x, m.y - target.y);
              if (d <= 80) {
                m.takeDamage(crossDmg, target.x, target.y);
                this.floatingTexts.spawn(m.x, m.y - 28, `${crossDmg}✝️`, {
                  color: 0xfacc15,
                  isCrit: true,
                });
                if (m.isDead() && !m.isDestroyed) this.handleMonsterDeath(m);
              }
            }
          }
        }
      }

      // 4-piece Ветрокрыл (SET_WINDWALKER): каждая 4-я автоатака наносит +50% доп. урона
      if (this.player.activeSets.SET_WINDWALKER >= 4 && !target.isDead() && !target.isDestroyed) {
        this.player.windwalkerAttackCounter = (this.player.windwalkerAttackCounter || 0) + 1;
        if (this.player.windwalkerAttackCounter >= 4) {
          this.player.windwalkerAttackCounter = 0;
          const extraCritDmg = Math.floor(result.damage * 0.5);
          target.takeDamage(extraCritDmg, this.player.x, this.player.y);
          this.floatingTexts.spawn(target.x, target.y - 25, `+${extraCritDmg}💨`, {
            color: 0x38bdf8,
            isCrit: true,
          });
        }
      }

      // Механика Булавы: Святой Резонанс (25% базовая или 50% при 4-piece SET_SERAPHIM)
      const resonanceChance = this.player.activeSets.SET_SERAPHIM >= 4 ? 0.5 : 0.25;
      if (archetype === 'HOLY_MACE' && Math.random() <= resonanceChance) {
        SoundFX.playCrit();
        const holyDmg = Math.max(1, Math.floor(this.player.derivedStats.matk * 0.5));
        const healAmt =
          this.player.activeSets.SET_SERAPHIM >= 4
            ? Math.max(1, Math.floor(this.player.derivedStats.maxHp * 0.1))
            : Math.max(1, Math.floor(this.player.derivedStats.maxHp * 0.04));
        this.player.heal(healAmt);
        this.floatingTexts.spawn(this.player.x, this.player.y - 22, `+${healAmt}💚`, {
          color: 0x4ade80,
          isHeal: true,
        });

        const nearby = [...this.monsters];
        for (const m of nearby) {
          if (!m.isDead() && !m.isDestroyed) {
            const d = Math.hypot(m.x - target.x, m.y - target.y);
            if (d <= 80) {
              m.takeDamage(holyDmg, target.x, target.y);
              this.floatingTexts.spawn(m.x, m.y - 24, `${holyDmg}✨`, {
                color: 0xfde047,
                isCrit: true,
              });
              if (m.isDead() && !m.isDestroyed) this.handleMonsterDeath(m);
            }
          }
        }
      }

      // Механика Монаха: Тройной Удар (Triple Blow) при атаке Мечом или Булавой
      if (
        (archetype === 'MELEE_SWORD' || archetype === 'HOLY_MACE') &&
        !target.isDead() &&
        !target.isDestroyed
      ) {
        const ironFistLvl = this.player.jobSystem.getSkillLevel('mo_iron_fist');
        if (ironFistLvl > 0) {
          const tripleBlowChance = (18 + 4 * ironFistLvl) / 100;
          if (Math.random() <= tripleBlowChance) {
            SoundFX.playCrit();
            const comboDmg = Math.max(
              1,
              Math.floor((this.player.derivedStats.atk + this.player.baseStats.int) * 3.0)
            );
            target.takeDamage(comboDmg, this.player.x, this.player.y);
            this.player.addSpiritSpheres(1);
            this.floatingTexts.spawn(target.x, target.y - 28, `${comboDmg}👊 TRIPLE!`, {
              color: 0xf59e0b,
              isCrit: true,
            });
            if (target.isDead() && !target.isDestroyed) this.handleMonsterDeath(target);
          }
        }
      }

      // Механика Охотника: Соколиная Атака (Blitz Beat) при атаке из лука
      if (archetype === 'RANGED_BOW') {
        const falconMasteryLvl = this.player.jobSystem.getSkillLevel('hu_falcon_mastery');
        if (falconMasteryLvl > 0) {
          const blitzChance =
            Math.min(100, 12 + 3 * falconMasteryLvl + Math.floor(this.player.baseStats.luk / 3)) / 100;
          if (Math.random() <= blitzChance) {
            SoundFX.playCrit();
            if (this.player.falcon) {
              this.player.falcon.triggerDive(target.x, target.y);
            }
            const blitzDmg = Math.max(
              1,
              Math.floor(
                (this.player.derivedStats.atk + this.player.baseStats.dex * 2) *
                  (1.1 + 0.25 * falconMasteryLvl)
              )
            );
            const nearby = [...this.monsters];
            for (const m of nearby) {
              if (!m.isDead() && !m.isDestroyed) {
                const d = Math.hypot(m.x - target.x, m.y - target.y);
                if (d <= 70) {
                  m.takeDamage(blitzDmg, target.x, target.y);
                  this.floatingTexts.spawn(m.x, m.y - 32, `${blitzDmg}🦅 BLITZ!`, {
                    color: 0x38bdf8,
                    isCrit: true,
                  });
                  if (m.isDead() && !m.isDestroyed) this.handleMonsterDeath(m);
                }
              }
            }
          }
        }
      }

      // Механика Мудреца: Авто-заклинание (Hindsight) при атаке посохом
      if (this.player.isHindsightActive && archetype === 'MAGIC_STAFF') {
        const hindsightLvl = this.player.jobSystem.getSkillLevel('sg_hindsight') || 1;
        const setBonus = this.player.activeSets.SET_ARCHMAGE >= 4 ? 26 : 0;
        const hindsightChance = Math.min(100, 22 + 6 * hindsightLvl + setBonus) / 100;
        if (Math.random() <= hindsightChance) {
          SoundFX.playCrit();
          const spellDmg = Math.max(
            1,
            Math.floor(this.player.derivedStats.matk * (1.3 + 0.25 * hindsightLvl))
          );
          const spells: Array<'FIRE' | 'LIGHTNING' | 'FROST'> = ['FIRE', 'LIGHTNING', 'FROST'];
          const pickedSpell = spells[Math.floor(Math.random() * spells.length)];
          if (pickedSpell === 'FIRE') {
            this.vfx.castFirePillar(target.x, target.y);
          } else if (pickedSpell === 'LIGHTNING') {
            this.vfx.castLightningBolt(target.x, target.y);
          } else {
            this.vfx.castFrostNova(target.x, target.y);
          }
          const nearby = [...this.monsters];
          for (const m of nearby) {
            if (!m.isDead() && !m.isDestroyed) {
              const d = Math.hypot(m.x - target.x, m.y - target.y);
              if (d <= 75) {
                m.takeDamage(spellDmg, target.x, target.y);
                this.floatingTexts.spawn(m.x, m.y - 25, `${spellDmg}✨ AUTO`, {
                  color: 0xa855f7,
                  isCrit: true,
                });
                if (m.isDead() && !m.isDestroyed) this.handleMonsterDeath(m);
              }
            }
          }
        }
      }

      // Механика Мудреца: сплеш-урон Зачарования Стихий (Elemental Endow)
      if (
        archetype === 'MAGIC_STAFF' &&
        this.player.activeBuffs.some((b) => b.id === 'buff_sg_endow')
      ) {
        const splashDmg = Math.max(1, Math.floor(result.damage * 0.5));
        const nearby = [...this.monsters];
        for (const m of nearby) {
          if (m !== target && !m.isDead() && !m.isDestroyed) {
            const d = Math.hypot(m.x - target.x, m.y - target.y);
            if (d <= 75) {
              m.takeDamage(splashDmg, target.x, target.y);
              this.floatingTexts.spawn(m.x, m.y - 15, `${splashDmg}🌊`, { color: 0x38bdf8 });
              if (m.isDead() && !m.isDestroyed) this.handleMonsterDeath(m);
            }
          }
        }
      }

      // Проверка авто-кастов Карт (Буран, Метеорит, Кольцо льда, Огненный столб, Шипы, Молния)
      for (const slot of Object.keys(this.player.equipped) as EquipSlot[]) {
        const item = this.player.equipped[slot];
        if (item?.insertedCards) {
          for (const cardId of item.insertedCards) {
            const cardDef = CARDS_DATABASE[cardId];
            if (!cardDef) continue;

            if (cardDef.effect.type === 'ON_HIT_SPELL') {
              if (Math.random() <= (cardDef.effect.chance || 0.1)) {
                const spell = cardDef.effect.skillId;
                if (spell === 'STORM_GUST') {
                  this.vfx.castStormGust(target.x, target.y, 160, () => {
                    if (!target.isDead() && !target.isDestroyed) {
                      const sgDmg = Math.max(1, Math.floor(this.player.derivedStats.matk * 1.8));
                      target.takeDamage(sgDmg, this.player.x, this.player.y);
                      this.floatingTexts.spawn(target.x, target.y - 25, `${sgDmg}❄️ STORM`, {
                        color: 0x38bdf8,
                        isCrit: true,
                      });
                      if (target.isDead() && !target.isDestroyed) this.handleMonsterDeath(target);
                    }
                  });
                } else if (spell === 'METEOR_STORM') {
                  this.vfx.castMeteorStorm(target.x, target.y, 170, 4, () => {
                    if (!target.isDead() && !target.isDestroyed) {
                      const msDmg = Math.max(1, Math.floor(this.player.derivedStats.matk * 2.2));
                      target.takeDamage(msDmg, this.player.x, this.player.y);
                      this.floatingTexts.spawn(target.x, target.y - 25, `${msDmg}☄️ METEOR`, {
                        color: 0xef4444,
                        isCrit: true,
                      });
                      if (target.isDead() && !target.isDestroyed) this.handleMonsterDeath(target);
                    }
                  });
                } else if (spell === 'FROST_NOVA') {
                  this.vfx.castFrostNova(target.x, target.y, () => {
                    if (!target.isDead() && !target.isDestroyed) {
                      const fnDmg = Math.max(1, Math.floor(this.player.derivedStats.matk * 1.4));
                      target.takeDamage(fnDmg, this.player.x, this.player.y);
                      this.floatingTexts.spawn(target.x, target.y - 25, `${fnDmg}❄️ FROST`, {
                        color: 0x38bdf8,
                      });
                      if (target.isDead() && !target.isDestroyed) this.handleMonsterDeath(target);
                    }
                  });
                } else if (spell === 'FIRE_PILLAR' || spell === 'EARTH_SPIKE') {
                  this.vfx.castFirePillar(target.x, target.y, () => {
                    if (!target.isDead() && !target.isDestroyed) {
                      const fpDmg = Math.max(1, Math.floor(this.player.derivedStats.matk * 1.5));
                      target.takeDamage(fpDmg, this.player.x, this.player.y);
                      this.floatingTexts.spawn(target.x, target.y - 25, `${fpDmg}💥`, {
                        color: 0xf59e0b,
                        isCrit: true,
                      });
                      if (target.isDead() && !target.isDestroyed) this.handleMonsterDeath(target);
                    }
                  });
                } else {
                  this.vfx.castLightningBolt(target.x, target.y, () => {
                    if (!target.isDead() && !target.isDestroyed) {
                      const lbDmg = cardDef.effect.value || 65;
                      target.takeDamage(lbDmg, this.player.x, this.player.y);
                      this.floatingTexts.spawn(target.x, target.y - 25, `${lbDmg}⚡`, {
                        color: 0x38bdf8,
                        isCrit: true,
                      });
                      if (target.isDead() && !target.isDestroyed) this.handleMonsterDeath(target);
                    }
                  });
                }
              }
            }

            // Карта Короля Порингов: 10% шанс выбить Зелье при ударе
            if (cardId === 'poring_king_card' && Math.random() <= 0.1) {
              this.spawnLoot(target.x, target.y, 'red_potion', false);
              this.floatingTexts.spawn(this.player.x, this.player.y - 20, '🧪 ЗЕЛЬЕ!', { color: 0xf43f5e });
            }

            // Карта Орочьего Воеводы: вампиризм 2% от урона
            if (cardId === 'orc_warlord_card') {
              const cardVamp = Math.max(1, Math.floor(result.damage * 0.02));
              this.player.heal(cardVamp);
              this.floatingTexts.spawn(this.player.x, this.player.y - 18, `+${cardVamp}🩸`, { color: 0x4ade80, isHeal: true });
            }

            // Карта Скелета-Рыцаря: 10% шанс оглушить цель
            if (cardId === 'skeleton_knight_card' && Math.random() <= 0.1 && !target.isDead() && !target.isDestroyed) {
              target.stunTimer = 1.5;
              this.floatingTexts.spawn(target.x, target.y - 30, '💫 СТАН!', { color: 0xfacc15, isCrit: true });
            }
          }
        }
      }

      if (target.isDead() && !target.isDestroyed) {
        this.handleMonsterDeath(target);
      }
    } else {
      SoundFX.playMiss();
      this.floatingTexts.spawn(target.x, target.y - 10, 'MISS', {
        color: 0x38bdf8,
        isMiss: true,
      });
    }
  }

  private handleMonsterAttack(attacker: Monster, damageMultiplier: number = 1.0): void {
    const result = CombatSystem.resolveAttack(
      {
        atk: Math.round(attacker.atk * damageMultiplier),
        hit: attacker.def.hit,
      },
      {
        def: this.player.derivedStats.def,
        flee: this.player.derivedStats.flee,
        vit: this.player.baseStats.vit,
      }
    );

    if (result.isHit) {
      let finalDamage = result.damage;

      // 0. Священный барьер Кирие Элейсон (поглощает урон перед снижением HP)
      if (this.player.shieldBarrierHp > 0) {
        if (this.player.shieldBarrierHp >= finalDamage) {
          this.player.shieldBarrierHp -= finalDamage;
          this.floatingTexts.spawn(this.player.x, this.player.y - 32, `🛡️ -${finalDamage} (BARRIER)`, {
            color: 0x38bdf8,
          });
          finalDamage = 0;
        } else {
          finalDamage -= this.player.shieldBarrierHp;
          this.floatingTexts.spawn(
            this.player.x,
            this.player.y - 32,
            `🛡️ -${this.player.shieldBarrierHp} (BROKEN!)`,
            {
              color: 0x38bdf8,
            }
          );
          this.player.shieldBarrierHp = 0;
        }
      }

      // 1. Блокирование щитом (снижает 80% физического урона, всплывает плашка BLOCK!)
      const blockChance = this.player.derivedStats.blockChance || 0;
      if (finalDamage > 0 && blockChance > 0 && Math.random() * 100 <= blockChance) {
        finalDamage = Math.max(1, Math.floor(finalDamage * 0.2));
        this.floatingTexts.spawn(this.player.x, this.player.y - 28, '🛡️ BLOCK!', {
          color: 0x94a3b8,
          isCrit: true,
        });
      }

      // 2. Снижение урона от Боссов и Элиты (Крестоносец Job Lv.50: -8%)
      if (finalDamage > 0 && (attacker.rank === 'ELITE' || attacker.rank === 'MVP' || attacker.def.isElite || attacker.def.isMvp)) {
        const reduction = this.player.crossJobBonuses.bossDmgReductionPct || 0;
        if (reduction > 0) {
          finalDamage = Math.max(1, Math.floor(finalDamage * (1 - reduction / 100)));
        }
      }

      // 3. Снижение входящего физ. урона от Карты Орка-Воина (12%)
      if (finalDamage > 0 && this.player.cardDmgReductionPct > 0) {
        finalDamage = Math.max(1, Math.floor(finalDamage * (1 - this.player.cardDmgReductionPct / 100)));
      }

      // 4. Снижение урона от Нежити и Демонов (Божественная Защита Послушника: -6% за уровень)
      if (finalDamage > 0 && this.player.jobSystem && this.player.jobSystem.isSkillUsable('ac_divine_protection')) {
        const acProtLvl = this.player.jobSystem.getSkillLevel('ac_divine_protection');
        const isUndeadOrDemon =
          attacker.def.sprite === 'skeleton.png' ||
          attacker.def.sprite === 'zombie.png' ||
          attacker.def.id.includes('skeleton') ||
          attacker.def.id.includes('zombie') ||
          attacker.def.id.includes('baphomet') ||
          attacker.def.id.includes('ghostring') ||
          attacker.def.id.includes('deviruchi');
        if (acProtLvl > 0 && isUndeadOrDemon) {
          finalDamage = Math.max(1, Math.floor(finalDamage * (1 - (0.06 * acProtLvl))));
        }
      }

      if (finalDamage > 0) {
        SoundFX.playHit();
        this.floatingTexts.spawn(this.player.x, this.player.y - 12, `${finalDamage}`, {
          color: 0xef4444,
        });
        this.player.takeDamage(finalDamage);

        // Карта Заводного Стража: 12% шанс наложить ускорение (+15% ASPD на 5 сек)
        if (this.player.cardOnHitBuffAspdChance > 0 && Math.random() <= this.player.cardOnHitBuffAspdChance) {
          this.floatingTexts.spawn(this.player.x, this.player.y - 25, '⚡ УСКОРЕНИЕ!', { color: 0xfacc15, isCrit: true });
        }

        // Аффикс [Вампирский]: восстанавливает 20% от нанесённого урона
        if (attacker.eliteAffix === 'VAMPIRIC') {
          const vampHeal = Math.max(1, Math.floor(finalDamage * 0.2));
          attacker.heal(vampHeal);
          this.floatingTexts.spawn(attacker.x, attacker.y - 18, `+${vampHeal}🩸`, {
            color: 0x4ade80,
            isHeal: true,
          });
        }
      }

      // Отражение урона Картами Майи и Повелителя Орков (30%)
      if (this.player.cardReflectPct > 0 && !attacker.isDead() && result.damage > 0) {
        const cardReflectDmg = Math.max(1, Math.floor(result.damage * (this.player.cardReflectPct / 100)));
        attacker.takeDamage(cardReflectDmg, this.player.x, this.player.y);
        this.floatingTexts.spawn(attacker.x, attacker.y - 20, `${cardReflectDmg}👑`, {
          color: 0xf59e0b,
          isCrit: true,
        });
        if (attacker.isDead()) {
          this.handleMonsterDeath(attacker);
        }
      }

      // Отражение урона Зеркальным Щитом Крестоносца (Reflect Shield)
      if (this.player.isReflectShieldActive && !attacker.isDead()) {
        const reflectLvl = this.player.jobSystem.getSkillLevel('cr_reflect_shield') || 1;
        const reflectPct = 0.25 + 0.1 * reflectLvl;
        const reflectDmg = Math.max(
          1,
          Math.floor(result.damage * reflectPct + this.player.derivedStats.def)
        );
        attacker.takeDamage(reflectDmg, this.player.x, this.player.y);
        this.floatingTexts.spawn(attacker.x, attacker.y - 20, `${reflectDmg}🪞`, {
          color: 0xfacc15,
          isCrit: true,
        });
        if (attacker.isDead()) {
          this.handleMonsterDeath(attacker);
        }
      }

      // 4-piece Воевода (SET_WARLORD): 25% шанс при получении удара вызвать волну на 150% ATK
      if (this.player.activeSets.SET_WARLORD >= 4 && Math.random() <= 0.25) {
        SoundFX.playCrit();
        const waveDmg = Math.max(1, Math.floor(this.player.derivedStats.atk * 1.5));
        this.floatingTexts.spawn(this.player.x, this.player.y - 24, `Ударная волна!`, {
          color: 0xf59e0b,
          isCrit: true,
        });

        const nearby = [...this.monsters];
        for (const m of nearby) {
          if (!m.isDead() && !m.isDestroyed) {
            const d = Math.hypot(m.x - this.player.x, m.y - this.player.y);
            if (d <= 70) {
              m.takeDamage(waveDmg, this.player.x, this.player.y);
              this.floatingTexts.spawn(m.x, m.y - 16, `${waveDmg}💥`, {
                color: 0xf59e0b,
                isCrit: true,
              });
              if (m.isDead() && !m.isDestroyed) this.handleMonsterDeath(m);
            }
          }
        }
      }
    } else {
      SoundFX.playMiss();
      this.floatingTexts.spawn(this.player.x, this.player.y - 12, 'MISS', {
        color: 0x38bdf8,
        isMiss: true,
      });
    }
  }

  private handleMonsterDeath(monster: Monster): void {
    if (monster.isDestroyed || this.monsters.indexOf(monster) === -1) {
      return; // Уже обработан
    }

    const idx = this.monsters.indexOf(monster);
    if (idx !== -1) {
      this.monsters.splice(idx, 1);
    }

    if (this.player.currentTargetMonster === monster) {
      this.player.clearTargetMonster();
    }

    // Если убит вожак, освобождаем миньонов
    if (monster.minions && monster.minions.length > 0) {
      for (const m of monster.minions) {
        m.leader = null;
      }
    }

    const displayName = monster.getDisplayName();
    const expMult = CombatSystem.getExpLevelPenalty(
      this.player.level,
      monster.def.level,
      monster.rank
    );
    const gainedBase = Math.floor(monster.baseExp * expMult);
    const gainedJob = Math.floor(monster.jobExp * expMult);

    if (expMult <= 0) {
      EventBus.emit('COMBAT_LOG', {
        message: `Побежден ${displayName}! Опыт не получен (уровень моба слишком низок: -${this.player.level - monster.def.level} ур.).`,
        color: '#94a3b8',
      });
    } else if (expMult < 1.0) {
      const penaltyPct = Math.round((1 - expMult) * 100);
      EventBus.emit('COMBAT_LOG', {
        message: `Побежден ${displayName}! Получено +${gainedBase} Base EXP / +${gainedJob} Job EXP (Штраф за разницу уровней: -${penaltyPct}%).`,
        color: '#4ade80',
      });
    } else {
      EventBus.emit('COMBAT_LOG', {
        message: `Побежден ${displayName}! Получено +${gainedBase} Base EXP / +${gainedJob} Job EXP.`,
        color: '#4ade80',
      });
    }

    if (gainedBase > 0 || gainedJob > 0) {
      this.player.addExp(gainedBase, gainedJob);
    }
    this.player.recordMonsterKill(monster.def.id);
    this.questSystem.recordKill(monster.def.id);

    // Награда золотом за убийство монстра (с учетом бонуса Карты Золотого Жука)
    const baseZeny = Math.max(1, Math.round((monster.def.level * 6 + (monster.rank === 'MVP' ? 800 : monster.rank === 'ELITE' ? 180 : 12)) * (0.85 + Math.random() * 0.3)));
    const goldBonus = this.player.cardGoldBonusPct || 0;
    const finalZeny = Math.round(baseZeny * (1 + goldBonus / 100));
    this.player.addZeny(finalZeny);

    // Восстановление HP и SP за убийство от Карт (Вожак Волков +15 HP, Палач Аббатства +8 SP)
    if (this.player.cardKillRestoreHp > 0) {
      this.player.heal(this.player.cardKillRestoreHp);
      this.floatingTexts.spawn(this.player.x, this.player.y - 18, `+${this.player.cardKillRestoreHp}💚`, {
        color: 0x4ade80,
        isHeal: true,
      });
    }
    if (this.player.cardKillRestoreSp > 0) {
      this.player.restoreSp(this.player.cardKillRestoreSp);
      this.floatingTexts.spawn(this.player.x, this.player.y - 24, `+${this.player.cardKillRestoreSp}💙`, {
        color: 0x38bdf8,
      });
    }

    // =========================================================================
    // ПАТЧ 3.5 (КЛАССИЧЕСКИЙ RO): ЧИСТЫЙ ДРОП БЕЗ ЭКИПИРОВКИ
    // Мобы НИКОГДА не роняют готовую экипировку! Инвентарь чистый.
    // =========================================================================
    const tier = monster.tier || 1;

    // 1. Обычные мобы (NORMAL):
    if (monster.rank === 'NORMAL') {
      // 1.1 Трофеи монстра (55% шанс, 1-2 шт.)
      if (monster.def.drops && monster.def.drops.length > 0) {
        for (const drop of monster.def.drops) {
          if (Math.random() <= 0.55) {
            const count = Math.random() < 0.35 ? 2 : 1;
            for (let c = 0; c < count; c++) {
              this.spawnLoot(
                monster.x + (Math.random() * 20 - 10),
                monster.y + (Math.random() * 20 - 10),
                drop.itemId,
                false
              );
            }
          }
        }
      }

      // 1.2 Расходники / Травы зоны (10% шанс)
      if (Math.random() <= 0.10) {
        const herbDropId =
          tier === 1
            ? (Math.random() < 0.5 ? 'green_herb' : 'red_potion')
            : tier === 2
            ? (Math.random() < 0.5 ? 'blue_herb' : 'red_potion')
            : tier === 3
            ? (Math.random() < 0.5 ? 'amber_herb' : 'orange_potion')
            : tier === 4
            ? (Math.random() < 0.5 ? 'white_herb' : 'white_potion')
            : (Math.random() < 0.5 ? 'red_herb' : 'white_potion');
        this.spawnLoot(monster.x, monster.y, herbDropId, false);
      }

      // 1.3 Руды заточки/крафта с обычных монстров (12% шанс)
      if (Math.random() <= 0.12) {
        let oreDropId = 'copper_ore';
        if (tier === 1) {
          oreDropId = 'copper_ore';
        } else if (tier === 2) {
          oreDropId = 'phracon';
        } else {
          oreDropId = Math.random() < 0.5 ? 'oridecon' : 'elunium';
        }
        this.spawnLoot(monster.x, monster.y, oreDropId, false);
      }

      // 1.4 Уникальная Карта монстра: 0.35% (0.0035)
      if (monster.def.cardId && Math.random() <= 0.0035) {
        this.spawnLoot(monster.x, monster.y, monster.def.cardId, true);
      }
    }

    // 2. Элитные Вожаки (ELITE):
    else if (monster.rank === 'ELITE') {
      // 2.1 Большой стак трофеев монстра (100%, 5-8 шт.)
      if (monster.def.drops && monster.def.drops.length > 0) {
        const trophyId = monster.def.drops[0].itemId;
        const trophyCount = 5 + Math.floor(Math.random() * 4); // 5..8
        for (let i = 0; i < trophyCount; i++) {
          this.spawnLoot(
            monster.x + (Math.random() * 24 - 12),
            monster.y + (Math.random() * 24 - 12),
            trophyId,
            false
          );
        }
      }

      // 2.2 Эссенция Вожака Тира T (100%, 1-2 шт.)
      const essenceId = `elite_essence_t${tier}`;
      const essenceCount = Math.random() < 0.35 ? 2 : 1;
      for (let i = 0; i < essenceCount; i++) {
        this.spawnLoot(
          monster.x + (Math.random() * 16 - 8),
          monster.y + (Math.random() * 16 - 8),
          essenceId,
          false
        );
      }
      EventBus.emit('COMBAT_LOG', {
        message: `🔮 Получен трофей вожака: [Эссенция Вожака (Тир ${tier})]!`,
        color: '#c084fc',
      });

      // 2.3 Чистая Руда Заточки/Крафта Тира T (75%, 2-3 шт.)
      if (Math.random() <= 0.75) {
        let oreId = 'copper_ore';
        if (tier === 1) {
          oreId = 'copper_ore';
        } else if (tier === 2) {
          oreId = 'phracon';
        } else {
          oreId = Math.random() < 0.5 ? 'oridecon' : 'elunium';
        }
        const oreCount = 2 + Math.floor(Math.random() * 2); // 2..3
        for (let i = 0; i < oreCount; i++) {
          this.spawnLoot(
            monster.x + (Math.random() * 20 - 10),
            monster.y + (Math.random() * 20 - 10),
            oreId,
            false
          );
        }
      }

      // 2.4 Элитная Карта Вожака: 2.0% (0.02)
      if (monster.def.cardId && Math.random() <= 0.02) {
        this.spawnLoot(monster.x, monster.y, monster.def.cardId, true);
      }
    }

    // 3. MVP-Боссы:
    else if (monster.rank === 'MVP') {
      // 3.1 Душа MVP-Босса Тира T (100%, 1 шт.)
      const soulId = `mvp_soul_t${tier}`;
      this.spawnLoot(monster.x, monster.y, soulId, false);
      EventBus.emit('COMBAT_LOG', {
        message: `👑 ВЫБИТА ДУША MVP-БОССА: [Душа Босса (Тир ${tier})]!`,
        color: '#fbbf24',
      });
      SoundFX.playLevelUp();

      // 3.2 Эссенция Вожака Тира T (100%, 3-5 шт.)
      const essenceId = `elite_essence_t${tier}`;
      const essenceCount = 3 + Math.floor(Math.random() * 3); // 3..5
      for (let i = 0; i < essenceCount; i++) {
        this.spawnLoot(
          monster.x + (Math.random() * 24 - 12),
          monster.y + (Math.random() * 24 - 12),
          essenceId,
          false
        );
      }

      // 3.3 Чистые Руды Заточки/Крафта (100%, 3-4 шт.)
      const mvpOreId = tier === 1 ? 'copper_ore' : tier === 2 ? 'phracon' : (Math.random() < 0.5 ? 'oridecon' : 'elunium');
      const mvpOreCount = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < mvpOreCount; i++) {
        this.spawnLoot(
          monster.x + (Math.random() * 20 - 10),
          monster.y + (Math.random() * 20 - 10),
          mvpOreId,
          false
        );
      }

      // 3.4 Благословенный Камень Заточки (50%, 1-2 шт.)
      if (Math.random() <= 0.50) {
        const stoneCount = Math.random() < 0.35 ? 2 : 1;
        for (let i = 0; i < stoneCount; i++) {
          this.spawnLoot(
            monster.x + (Math.random() * 16 - 8),
            monster.y + (Math.random() * 16 - 8),
            'blessed_refine_stone',
            false
          );
        }
        EventBus.emit('COMBAT_LOG', {
          message: `💎 Редкий трофей: [Благословенный Камень Заточки] выпал с MVP-Босса!`,
          color: '#38bdf8',
        });
      }

      // 3.4 Легендарная MVP-Карта: 4.0% (0.04)
      if (monster.def.cardId && Math.random() <= 0.04) {
        this.spawnLoot(monster.x, monster.y, monster.def.cardId, true);
      }
    }

    // Удаляем визуал из мира
    if (this.stage.ySortLayer && monster.puppet?.root) {
      this.stage.ySortLayer.removeChild(monster.puppet.root);
    }
    monster.destroy();

    // Запускаем респавн только для обычных монстров (не миньонов и не боссов)
    if (monster.rank === 'NORMAL' && !monster.leader) {
      this.respawnQueue.push({
        monsterId: monster.def.id,
        timer: 2.5,
      });
    }
  }

  public destroy(): void {
    this.isRunning = false;
    this.projectileSystem.clear();
    SaveManager.registerWorld(null);
    SaveManager.stopAutoSave();
    this.stage.destroy();
  }
}
