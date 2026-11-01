import * as PIXI from 'pixi.js';
import {
  BaseStats,
  DerivedStats,
  CampState,
  StatKey,
  InventoryItem,
  EquipSlot,
  JobClass,
  JobId,
  WeaponArchetype,
  ActiveBuff,
  StatBreakdown,
  ActivePassiveInfo,
  EquipmentSetId,
  LegendaryModifierId,
  CrossJobMasteryBonus,
  SkillDef,
  CraftGrade,
} from '../types/game.types';
import { CombatSystem } from '../systems/CombatSystem';
import { JobSystem, JOBS_METADATA } from '../systems/JobSystem';
import { SKILLS_DATABASE } from '../systems/SkillSystem';
import { RARITY_MULTIPLIERS } from '../systems/ItemGeneratorSystem';

export const GRADE_MULTIPLIERS: Record<CraftGrade, number> = {
  STANDARD: 1.0,
  SLOTTED: 1.2,
  RELIC: 1.45,
};

export function getItemGradeMultiplier(item: InventoryItem | null | undefined): number {
  if (!item) return 1.0;
  if (item.craftGrade) {
    return GRADE_MULTIPLIERS[item.craftGrade] || 1.0;
  }
  return RARITY_MULTIPLIERS[item.rarity || 'COMMON'] || 1.0;
}
import type { WorldMapSystem } from '../systems/WorldMapSystem';
import { ChibiPuppet } from './ChibiPuppet';
import { FalconCompanion } from './FalconCompanion';
import { Monster } from './Monster';
import type { ResourceNode } from './ResourceNode';
import { EventBus } from '../core/EventBus';
import { SoundFX } from '../core/SoundFX';
import { ITEMS_DATABASE } from '../data/items.data';
import { CARDS_DATABASE } from '../data/cards.data';

export class Player {
  public puppet: ChibiPuppet;
  public x: number = 0;
  public y: number = 100;
  public worldMapSystem: WorldMapSystem | null = null;
  public isSafeZone: boolean = false;

  public level: number = 1;
  public jobClass: JobClass = 'Novice';
  public baseExp: number = 0;
  public statPoints: number = 15;
  public zeny: number = 850;
  public currentZoneId: string = 'zone_village';
  public bestiaryKills: Record<string, number> = {};
  public unlockedCards: string[] = [];
  public activeBuffs: ActiveBuff[] = [];

  // Система Прогрессии Классов
  public jobSystem: JobSystem = new JobSystem();

  public get jobLevel(): number {
    return this.jobSystem.getActiveJob().jobLevel;
  }
  public set jobLevel(val: number) {
    this.jobSystem.getActiveJob().jobLevel = val;
  }
  public get jobExp(): number {
    return this.jobSystem.getActiveJob().jobExp;
  }
  public set jobExp(val: number) {
    this.jobSystem.getActiveJob().jobExp = val;
  }

  public baseStats: BaseStats = {
    str: 5,
    agi: 5,
    vit: 5,
    int: 5,
    dex: 5,
    luk: 5,
  };
  public effectiveStats: BaseStats = {
    str: 5,
    agi: 5,
    vit: 5,
    int: 5,
    dex: 5,
    luk: 5,
  };

  public derivedStats: DerivedStats;
  public currentHp: number;
  public currentSp: number;

  // Инвентарь и Экипировка (Paper-Doll: 8 слотов)
  public inventory: InventoryItem[] = [];
  public equipped: Record<EquipSlot, InventoryItem | null> = {
    weapon: {
      uid: 'init_training_sword',
      itemId: 'training_sword',
      count: 1,
      refineLevel: 0,
      insertedCards: [],
      tier: 1,
      rarity: 'COMMON',
    },
    offhand: null,
    head: null,
    armor: null,
    garment: null,
    footgear: null,
    accessory1: null,
    accessory2: null,
  };
  public autoPotionPercent: number = 50;
  private autoPotionCooldown: number = 0;

  // Сетовые бонусы и легендарные модификаторы экипировки v3
  public activeSets: Record<EquipmentSetId, number> = {
    SET_WARLORD: 0,
    SET_WINDWALKER: 0,
    SET_ARCHMAGE: 0,
    SET_SERAPHIM: 0,
  };
  public activeLegendaryMod: LegendaryModifierId | null = null;
  public lifestealPercent: number = 0;
  public windwalkerAttackCounter: number = 0;

  // Боевые триггеры и эффекты Карт Монстров v3
  public cardReflectPct: number = 0;
  public cardIgnoreDefPct: number = 0;
  public cardDmgReductionPct: number = 0;
  public cardBossDmgBonusPct: number = 0;
  public hasIfritAura: boolean = false;
  public cardKillRestoreHp: number = 0;
  public cardKillRestoreSp: number = 0;
  public cardOnHitStunChance: number = 0;
  public cardOnHitBuffAspdChance: number = 0;
  public cardCooldownReductionPct: number = 0;
  public cardPotionBonusPct: number = 0;
  public cardGoldBonusPct: number = 0;

  // Мастерство Наследия (Cross-Job Mastery)
  public crossJobBonuses: CrossJobMasteryBonus = {
    str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0,
    atkPct: 0, matkPct: 0, aspdPct: 0, maxHpPct: 0, maxSpPct: 0,
    hardDef: 0, flee: 0, hit: 0, critChance: 0, moveSpeedPct: 0,
    blockChance: 0, bossDmgReductionPct: 0, bossDmgIncreasePct: 0,
    beastDmgIncreasePct: 0, cdReductionPct: 0, spRegenPct: 0,
    autocastBonusPct: 0, healPowerPct: 0, bonusExpPct: 0,
    critDmgPct: 0, elementalSkillDmgPct: 0,
  };

  // Классовые стойки и боевые механики v3
  public spiritSpheres: number = 0;
  public readonly maxSpiritSpheres: number = 5;
  public isPoemOfBragiActive: boolean = false;
  public isHindsightActive: boolean = false;
  public isReflectShieldActive: boolean = false;
  public shieldBarrierHp: number = 0;
  public shieldBarrierMaxHp: number = 0;
  public falcon: FalconCompanion | null = null;
  public classVisualsGfx = new PIXI.Graphics();
  private classVisualsTimer: number = 0;

  // Авто-скиллы и хотбар
  public autoSkillsEnabled: boolean = true;
  public hotbarSlots: (string | null)[] = [null, null, null, null, null, null];
  public jobHotbars: Partial<Record<JobId, (string | null)[]>> = {};
  private autoSkillTimer: number = 0;
  private spMeditationTimer: number = 0;

  // Таймеры классической регенерации HP и SP (RO Патч 3.5)
  private safeZoneRegenTimer: number = 0;
  private campRegenTimer: number = 0;
  private naturalHpRegenTimer: number = 0;
  private naturalSpRegenTimer: number = 0;
  public gearSpRegen: number = 0;

  // Клик и перемещение
  private targetX: number = 0;
  private targetY: number = 0;
  private isMovingToTarget: boolean = false;
  public currentTargetMonster: Monster | null = null;
  public targetResourceNode: ResourceNode | null = null;
  private attackCooldown: number = 0;

  // Режим авто-охоты (бывший костёр)
  public campActive: boolean = false;
  public campX: number = 0;
  public campY: number = 0;
  public campState: CampState = 'INACTIVE';
  public readonly CAMP_RADIUS = 320;

  public campGraphics = new PIXI.Graphics();
  public campRadiusCircle = new PIXI.Graphics();
  private campFlameTimer: number = 0;

  // Плавное патрулирование поляны
  private patrolTimer: number = 0;
  private patrolTargetX: number | null = null;
  private patrolTargetY: number | null = null;

  // Навигация и поиск пути (Pathfinding)
  public currentPath: Array<{ x: number; y: number }> = [];
  private pathTargetX: number = 0;
  private pathTargetY: number = 0;
  private pathRecalcTimer: number = 0;

  // Сторожевой таймер застревания (Unstuck Watchdog)
  private stuckCheckTimer: number = 0;
  private stuckDuration: number = 0;
  private lastStuckX: number = 0;
  private lastStuckY: number = 0;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.targetX = startX;
    this.targetY = startY;

    this.puppet = new ChibiPuppet({
      type: 'hero',
      hasWeapon: true,
    });
    this.puppet.root.position.set(this.x, this.y);
    this.puppet.root.addChild(this.classVisualsGfx);

    this.derivedStats = CombatSystem.calculateDerivedStats(
      this.baseStats,
      this.level,
      0,
      0,
      0,
      0,
      this.getEquippedWeaponArchetype()
    );
    this.currentHp = this.derivedStats.maxHp;
    this.currentSp = this.derivedStats.maxSp;
    this.puppet.updateHpBar(this.currentHp, this.derivedStats.maxHp);

    this.initCampVisuals();
    this.addItem('short_bow', 1);
    this.addItem('apprentice_rod', 1);
    this.addItem('wooden_mace', 1);
    this.addItem('red_potion', 8);
    this.addItem('apple', 3);
    this.recalculateStats();
    this.emitAllStats();
  }

  public getEquippedWeaponArchetype(): WeaponArchetype {
    if (!this.equipped.weapon) return 'MELEE_SWORD';
    const def = ITEMS_DATABASE[this.equipped.weapon.itemId];
    return def?.archetype || 'MELEE_SWORD';
  }

  public getAttackRange(): number {
    let range = CombatSystem.getWeaponAttackRange(this.getEquippedWeaponArchetype());
    const archetype = this.getEquippedWeaponArchetype();
    if (archetype === 'RANGED_BOW' && this.jobSystem && this.jobSystem.isSkillUsable('ar_owl_eye')) {
      const arOwlLvl = this.jobSystem.getSkillLevel('ar_owl_eye');
      range += 10 * arOwlLvl;
    }
    return range;
  }

  private initCampVisuals(): void {
    this.campGraphics.visible = false;
    this.campRadiusCircle.visible = false;
  }

  public emitAllStats(): void {
    const activeJob = this.jobSystem.getActiveJob();
    if (this.puppet) {
      this.puppet.updateHpBar(this.currentHp, this.derivedStats.maxHp);
    }
    EventBus.emit('HP_CHANGED', { current: this.currentHp, max: this.derivedStats.maxHp });
    EventBus.emit('SP_CHANGED', { current: this.currentSp, max: this.derivedStats.maxSp });
    EventBus.emit('EXP_CHANGED', {
      baseExp: this.baseExp,
      maxExp: CombatSystem.getRequiredExp(this.level),
      jobExp: activeJob.jobExp,
      maxJobExp: activeJob.jobExpToNext,
      level: this.level,
      jobLevel: activeJob.jobLevel,
    });
    EventBus.emit('STAT_POINTS_CHANGED', { statPoints: this.statPoints });
    EventBus.emit('STATS_UPDATED', {
      baseStats: this.baseStats,
      derivedStats: this.derivedStats,
    });
    EventBus.emit('INVENTORY_UPDATED', { items: [...this.inventory] });
    EventBus.emit('EQUIPMENT_UPDATED', { equipped: { ...this.equipped } });
    EventBus.emit('JOB_CHANGED', { jobClass: this.jobClass });
    EventBus.emit('BESTIARY_UPDATED', {
      kills: { ...this.bestiaryKills },
      unlockedCards: [...this.unlockedCards],
    });
    EventBus.emit('ZENY_CHANGED', { zeny: this.zeny });
    EventBus.emit('BUFFS_UPDATED', { buffs: [...this.activeBuffs] });
    this.jobSystem.emitJobProgress();
  }

  public moveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    this.isMovingToTarget = true;
    this.currentPath = [];
    this.clearTargetMonster();
  }

  public targetMonster(monster: Monster): void {
    if (this.currentTargetMonster && this.currentTargetMonster !== monster) {
      this.currentTargetMonster.setTargeted(false);
      this.currentTargetMonster.onHpChanged = undefined;
    }
    this.currentTargetMonster = monster;
    this.currentTargetMonster.setTargeted(true);
    this.currentTargetMonster.onHpChanged = () => this.emitTargetMonster();
    this.isMovingToTarget = false;
    this.emitTargetMonster();
  }

  public clearTargetMonster(): void {
    if (this.currentTargetMonster) {
      this.currentTargetMonster.setTargeted(false);
      this.currentTargetMonster.onHpChanged = undefined;
      this.currentTargetMonster = null;
      this.currentPath = [];
      this.emitTargetMonster();
    }
  }

  public emitTargetMonster(): void {
    if (!this.currentTargetMonster || this.currentTargetMonster.isDead()) {
      if (this.currentTargetMonster) {
        this.currentTargetMonster.setTargeted(false);
        this.currentTargetMonster.onHpChanged = undefined;
        this.currentTargetMonster = null;
      }
      EventBus.emit('TARGET_MONSTER_CHANGED', { monster: null });
    } else {
      const m = this.currentTargetMonster;
      EventBus.emit('TARGET_MONSTER_CHANGED', {
        monster: {
          id: m.id,
          name: m.getDisplayName(),
          rank: m.rank,
          level: m.def.level,
          currentHp: m.currentHp,
          maxHp: m.maxHp,
          isMvp: m.rank === 'MVP',
          isElite: m.rank === 'ELITE',
        },
      });
    }
  }

  public toggleCamp(): void {
    this.campActive = !this.campActive;
    if (this.campActive) {
      this.campX = this.x;
      this.campY = this.y;
      this.campState = 'FIND_TARGET';
      this.patrolTargetX = null;
      this.patrolTargetY = null;
      this.patrolTimer = 0;
      SoundFX.playCampToggle();
    } else {
      this.campState = 'INACTIVE';
      this.targetResourceNode = null;
      this.clearTargetMonster();
      this.patrolTargetX = null;
      this.patrolTargetY = null;
      this.puppet.isMoving = false;
    }

    // В новой механике костёр и пунктирный круг не отображаются
    this.campGraphics.visible = false;
    this.campRadiusCircle.visible = false;

    EventBus.emit('CAMP_TOGGLED', {
      active: this.campActive,
      x: this.x,
      y: this.y,
    });
    EventBus.emit('CAMP_STATE_CHANGED', { state: this.campState });
    EventBus.emit('COMBAT_LOG', {
      message: this.campActive
        ? '⚔️ Режим авто-охоты включён: герой плавно перемещается по поляне от моба к мобу и собирает ресурсы.'
        : '⚔️ Режим авто-охоты выключен.',
      color: this.campActive ? '#f59e0b' : '#94a3b8',
    });
  }

  private drawCampRadiusCircle(): void {
    this.campRadiusCircle.clear();
  }

  private updateCampFireAnimation(_dt: number): void {
    this.campGraphics.clear();
    this.campRadiusCircle.clear();
  }

  public increaseStat(stat: StatKey): boolean {
    const cost = CombatSystem.getStatPointCost(this.baseStats[stat]);
    if (this.statPoints < cost) {
      return false;
    }

    this.statPoints -= cost;
    this.baseStats[stat] += 1;
    this.recalculateStats();
    return true;
  }

  public recalculateStats(): void {
    const oldMaxHp = this.derivedStats ? this.derivedStats.maxHp : 100;

    // Расчёт Мастерства Наследия (Cross-Job Mastery)
    this.crossJobBonuses = this.jobSystem ? this.jobSystem.getCrossJobMasteryBonuses() : this.crossJobBonuses;

    let weaponAtk = 0;
    let weaponMatk = 0;
    let armorDef = this.crossJobBonuses.hardDef;
    let refineBonus = 0;
    let bonusMaxHp = 0;
    let bonusMaxSp = 0;
    let gearSpRegen = 0;
    let bonusFlee = this.crossJobBonuses.flee;
    let bonusMoveSpeed = 0;
    let bonusVit = this.crossJobBonuses.vit;
    let bonusLuk = this.crossJobBonuses.luk;
    let bonusDex = this.crossJobBonuses.dex;
    let bonusAgi = this.crossJobBonuses.agi;
    let bonusStr = this.crossJobBonuses.str;
    let bonusInt = this.crossJobBonuses.int;
    let bonusAspd = 0;
    let bonusCrit = this.crossJobBonuses.critChance;

    let bonusAtkPct = this.crossJobBonuses.atkPct;
    let bonusMatkPct = this.crossJobBonuses.matkPct;
    let bonusAspdPct = this.crossJobBonuses.aspdPct;
    let bonusMaxHpPct = this.crossJobBonuses.maxHpPct;
    let bonusMaxSpPct = this.crossJobBonuses.maxSpPct;
    let shieldBlock = 0;
    this.lifestealPercent = 0;

    const setCounts: Record<EquipmentSetId, number> = {
      SET_WARLORD: 0,
      SET_WINDWALKER: 0,
      SET_ARCHMAGE: 0,
      SET_SERAPHIM: 0,
    };

    const slots: EquipSlot[] = [
      'weapon',
      'offhand',
      'head',
      'armor',
      'garment',
      'footgear',
      'accessory1',
      'accessory2',
    ];

    const archetype = this.getEquippedWeaponArchetype();

    // Сброс боевых эффектов карт перед пересчетом
    this.cardReflectPct = 0;
    this.cardIgnoreDefPct = 0;
    this.cardDmgReductionPct = 0;
    this.cardBossDmgBonusPct = 0;
    this.hasIfritAura = false;
    this.cardKillRestoreHp = 0;
    this.cardKillRestoreSp = 0;
    this.cardOnHitStunChance = 0;
    this.cardOnHitBuffAspdChance = 0;
    this.cardCooldownReductionPct = 0;
    this.cardPotionBonusPct = 0;
    this.cardGoldBonusPct = 0;

    for (const slot of slots) {
      const item = this.equipped[slot];
      if (!item) continue;
      const def = ITEMS_DATABASE[item.itemId];
      if (!def) continue;

      const itemTier = item.tier || def.tier || 1;
      const refineLvl = item.refineLevel || 0;
      const rarityMult = getItemGradeMultiplier(item);

      const baseAtk = Math.round((def.baseAtk || 0) * rarityMult);
      const baseMatk = Math.round((def.baseMatk || 0) * rarityMult);
      const baseDef = Math.round((def.baseDef || 0) * rarityMult);
      const bonusAtkVal = Math.round((def.bonusAtk || 0) * rarityMult);
      const bonusMatkVal = Math.round((def.bonusMatk || 0) * rarityMult);

      // 1. Оружие
      if (slot === 'weapon') {
        if (baseAtk) weaponAtk += baseAtk;
        if (baseMatk) weaponMatk += baseMatk;
        const refAtk = CombatSystem.getRefineAtkBonus(itemTier, refineLvl);
        refineBonus += refAtk;
        if (archetype === 'MAGIC_STAFF') {
          weaponMatk += refAtk;
        }
      }
      // 2. Вторая рука (Offhand)
      else if (slot === 'offhand') {
        if (def.offhandType === 'quiver') {
          // Колчан дает бонусы только при надетом луке
          if (archetype === 'RANGED_BOW') {
            const a = bonusAtkVal || baseAtk;
            if (a) weaponAtk += a;
            if (def.bonusCrit) bonusCrit += def.bonusCrit;
          }
        } else if (def.offhandType === 'grimoire') {
          const m = bonusMatkVal || baseMatk;
          if (m) weaponMatk += m;
        } else {
          // Щит и защитные слоты второй руки
          if (baseDef) {
            armorDef += baseDef + CombatSystem.getRefineDefBonus(itemTier, refineLvl);
          }
          if (refineLvl > 4) {
            bonusMaxHpPct += (refineLvl - 4) * 2;
          }
        }
      }
      // 3. Защитные слоты (шлем, доспех, накидка, сапоги)
      else if (slot === 'head' || slot === 'armor' || slot === 'garment' || slot === 'footgear') {
        if (baseDef) {
          armorDef += baseDef + CombatSystem.getRefineDefBonus(itemTier, refineLvl);
        }
        // Бонус RO: +2% MaxHP за каждый уровень заточки выше +4
        if (refineLvl > 4) {
          bonusMaxHpPct += (refineLvl - 4) * 2;
        }
      }
      // 4. Аксессуары
      else if (slot === 'accessory1' || slot === 'accessory2') {
        if (baseDef) armorDef += baseDef;
      }

      // Фиксированные бонусы ступени Реликвий (RELIC)
      if (item.craftGrade === 'RELIC') {
        if (slot === 'weapon') {
          if (archetype === 'MELEE_SWORD') {
            bonusAspdPct += 15;
          } else if (archetype === 'RANGED_BOW') {
            bonusCrit += 10;
          } else if (archetype === 'MAGIC_STAFF') {
            bonusMatkPct += 18;
          } else if (archetype === 'HOLY_MACE') {
            bonusAtkPct += 12;
            bonusMatkPct += 12;
          }
        } else {
          // +3 ко всем характеристикам и +5% MaxHP/MaxSP за каждую не-оружейную Реликвию
          bonusStr += 3;
          bonusAgi += 3;
          bonusVit += 3;
          bonusInt += 3;
          bonusDex += 3;
          bonusLuk += 3;
          bonusMaxHpPct += 5;
          bonusMaxSpPct += 5;
        }
      }

      // Дополнительные параметры предмета (масштабируются от грейда качества)
      if (def.bonusMaxHp) bonusMaxHp += Math.round(def.bonusMaxHp * rarityMult);
      if (def.bonusMaxSp) bonusMaxSp += Math.round(def.bonusMaxSp * rarityMult);
      if (def.spRegen) gearSpRegen += def.spRegen;
      if (def.bonusFlee) bonusFlee += Math.round(def.bonusFlee * rarityMult);
      if (def.bonusMoveSpeed) bonusMoveSpeed += Math.round(def.bonusMoveSpeed * rarityMult);
      if (def.bonusCrit) bonusCrit += def.bonusCrit;
      if (def.primaryStatBonus) {
        const { stat, value } = def.primaryStatBonus;
        const scaledVal = Math.round(value * rarityMult);
        if (stat === 'str') bonusStr += scaledVal;
        if (stat === 'agi') bonusAgi += scaledVal;
        if (stat === 'vit') bonusVit += scaledVal;
        if (stat === 'int') bonusInt += scaledVal;
        if (stat === 'dex') bonusDex += scaledVal;
        if (stat === 'luk') bonusLuk += scaledVal;
      }

      // Аффиксы предмета
      if (item.affixes) {
        for (const aff of item.affixes) {
          switch (aff.type) {
            case 'AFFIX_STR':
              bonusStr += aff.value;
              break;
            case 'AFFIX_AGI':
              bonusAgi += aff.value;
              break;
            case 'AFFIX_VIT':
              bonusVit += aff.value;
              break;
            case 'AFFIX_INT':
              bonusInt += aff.value;
              break;
            case 'AFFIX_DEX':
              bonusDex += aff.value;
              break;
            case 'AFFIX_LUK':
              bonusLuk += aff.value;
              break;
            case 'AFFIX_ATK_PCT':
              bonusAtkPct += aff.value;
              break;
            case 'AFFIX_MATK_PCT':
              bonusMatkPct += aff.value;
              break;
            case 'AFFIX_ASPD_PCT':
              bonusAspdPct += aff.value;
              break;
            case 'AFFIX_CRIT':
              bonusCrit += aff.value;
              break;
            case 'AFFIX_MAX_HP':
              bonusMaxHp += aff.value;
              break;
            case 'AFFIX_FLEE':
              bonusFlee += aff.value;
              break;
            case 'AFFIX_LIFESTEAL':
              this.lifestealPercent += aff.value;
              break;
          }
        }
      }

      // Подсчет сетовых предметов
      if (item.setId && item.setId in setCounts) {
        setCounts[item.setId]++;
      }

      // Бонусные зачарования от ковки кузнеца
      if (item.enchantment) {
        const { stat, value } = item.enchantment;
        if (stat === 'dex') bonusDex += value;
        if (stat === 'agi') bonusAgi += value;
        if (stat === 'vit') bonusVit += value;
        if (stat === 'luk') bonusLuk += value;
        if (stat === 'str') bonusStr += value;
        if (stat === 'int') bonusInt += value;
        if (stat === 'atk') weaponAtk += value;
        if (stat === 'matk') weaponMatk += value;
        if (stat === 'aspd') bonusAspd += value / 100;
        if (stat === 'crit') bonusCrit += value;
      }

      // Вставленные карты
      if (item.insertedCards) {
        for (const cardId of item.insertedCards) {
          const cardDef = CARDS_DATABASE[cardId];
          if (!cardDef) continue;

          // Дополнительные базовые статы
          if (cardDef.effect.bonusStats) {
            if (cardDef.effect.bonusStats.str) bonusStr += cardDef.effect.bonusStats.str;
            if (cardDef.effect.bonusStats.agi) bonusAgi += cardDef.effect.bonusStats.agi;
            if (cardDef.effect.bonusStats.vit) bonusVit += cardDef.effect.bonusStats.vit;
            if (cardDef.effect.bonusStats.int) bonusInt += cardDef.effect.bonusStats.int;
            if (cardDef.effect.bonusStats.dex) bonusDex += cardDef.effect.bonusStats.dex;
            if (cardDef.effect.bonusStats.luk) bonusLuk += cardDef.effect.bonusStats.luk;
          }

          // Первичный стат карты
          const k = cardDef.effect.statKey;
          const v = cardDef.effect.value;
          if (k === 'luk') bonusLuk += v;
          else if (k === 'vit') bonusVit += v;
          else if (k === 'dex') bonusDex += v;
          else if (k === 'agi') bonusAgi += v;
          else if (k === 'str') bonusStr += v;
          else if (k === 'int') bonusInt += v;
          else if (k === 'maxHp') bonusMaxHp += v;
          else if (k === 'maxSp') bonusMaxSp += v;
          else if (k === 'atk') weaponAtk += v;
          else if (k === 'matk') weaponMatk += v;
          else if (k === 'critChance') bonusCrit += v;
          else if (k === 'def') armorDef += v;
          else if (k === 'flee') bonusFlee += v;
          else if (k === 'moveSpeed') bonusMoveSpeed += v;
          else if (k === 'atkPct') bonusAtkPct += v;
          else if (k === 'matkPct') bonusMatkPct += v;
          else if (k === 'maxHpPct') bonusMaxHpPct += v;
          else if (k === 'maxSpPct') bonusMaxSpPct += v;
          else if (k === 'allDmgPct') {
            bonusAtkPct += v;
            bonusMatkPct += v;
          } else if (k === 'bossDmg') {
            this.cardBossDmgBonusPct += v;
          } else if (k === 'allStats') {
            bonusStr += v;
            bonusAgi += v;
            bonusVit += v;
            bonusInt += v;
            bonusDex += v;
            bonusLuk += v;
          }

          // Вторичный стат карты
          const sk = cardDef.effect.secondStatKey;
          const sv = cardDef.effect.secondValue || 0;
          if (sk === 'flee') bonusFlee += sv;
          else if (sk === 'maxHp') bonusMaxHp += sv;
          else if (sk === 'maxSp') bonusMaxSp += sv;
          else if (sk === 'critChance') bonusCrit += sv;
          else if (sk === 'aspd') bonusAspd += sv / 100;
          else if (sk === 'blockChance') shieldBlock += sv;
          else if (sk === 'def') armorDef += sv;
          else if (sk === 'cooldownReductionPct') this.cardCooldownReductionPct += sv;
          else if (sk === 'potionBonusPct') this.cardPotionBonusPct += sv;
          else if (sk === 'goldBonusPct') this.cardGoldBonusPct += sv;
          else if (sk === 'allStats') {
            bonusStr += sv;
            bonusAgi += sv;
            bonusVit += sv;
            bonusInt += sv;
            bonusDex += sv;
            bonusLuk += sv;
          }

          // Специфические вторичные эффекты карт
          if (cardId === 'bathory_card') {
            this.cardCooldownReductionPct += 12;
          }
          if (cardId === 'time_keeper_card') {
            this.cardCooldownReductionPct += 10;
          }
          if (cardId === 'roda_frog_card') {
            this.cardPotionBonusPct += 15;
          }
          if (cardId === 'golden_bug_card') {
            this.cardGoldBonusPct += 15;
          }
          if (cardId === 'stormy_knight_card') {
            bonusMatkPct += 18;
          }
          if (cardId === 'ifrit_card') {
            bonusMatkPct += 15;
          }

          // Боевые триггеры
          if (cardDef.effect.type === 'REFLECT_DAMAGE') {
            this.cardReflectPct += sv || 30;
          }
          if (cardDef.effect.type === 'IGNORE_DEF') {
            this.cardIgnoreDefPct = Math.max(this.cardIgnoreDefPct, sv || 35);
          }
          if (cardDef.effect.type === 'DAMAGE_REDUCTION') {
            this.cardDmgReductionPct += sv || 12;
          }
          if (cardDef.effect.type === 'AURA_DAMAGE') {
            this.hasIfritAura = true;
          }
          if (cardDef.effect.type === 'ON_KILL_RESTORE') {
            if (sk === 'killHp') this.cardKillRestoreHp += sv;
            if (sk === 'killSp') this.cardKillRestoreSp += sv;
          }
          if (cardId === 'skeleton_knight_card') {
            this.cardOnHitStunChance = 0.1;
          }
          if (cardId === 'punk_card') {
            this.cardOnHitBuffAspdChance = 0.12;
          }
        }
      }
    }

    this.activeSets = setCounts;
    this.activeLegendaryMod = this.equipped.weapon?.legendaryMod || null;

    // Бонусы комплектов экипировки (2-piece set bonuses)
    if (this.activeSets.SET_WARLORD >= 2) {
      bonusMaxHpPct += 12;
      bonusAtkPct += 10;
    }
    if (this.activeSets.SET_WINDWALKER >= 2) {
      bonusAspdPct += 12;
      bonusFlee += 15;
      bonusCrit += 5;
    }
    if (this.activeSets.SET_ARCHMAGE >= 2) {
      bonusMatkPct += 15;
      bonusMaxSp += 50;
    }
    if (this.activeSets.SET_SERAPHIM >= 2) {
      bonusAtkPct += 12;
      bonusMatkPct += 12;
    }

    // -----------------------------------------------------------
    // Классовые пассивные способности (Lv.1..5)
    // -----------------------------------------------------------
    const offItem = this.equipped.offhand;
    if (offItem) {
      const offDef = ITEMS_DATABASE[offItem.itemId];
      if (offDef && (offDef.offhandType === 'shield' || (!offDef.offhandType && (offDef.baseDef || 0) > 0))) {
        shieldBlock += offDef.blockChance || (5 + (offItem.tier || 1) * 2);
      }
    }

    const isSkillActive = (id: string) => (this.jobSystem && this.jobSystem.isSkillUsable(id) ? this.jobSystem.getSkillLevel(id) : 0);

    // 1. Мечник: Мастерство Клинка
    const swSwordLvl = isSkillActive('sw_sword_mastery');
    if (swSwordLvl > 0 && archetype === 'MELEE_SWORD') {
      bonusAtkPct += 4 * swSwordLvl;
    }

    // 2. Рыцарь: Кавалерийский Натиск
    const knCavLvl = isSkillActive('kn_cavalry_mastery');
    if (knCavLvl > 0) {
      bonusMoveSpeed += Math.floor(160 * 0.05 * knCavLvl);
      bonusAspdPct += 3 * knCavLvl;
      bonusMaxHpPct += 4 * knCavLvl;
    }

    // 3. Крестоносец: Священный Заслон
    const crGuardLvl = isSkillActive('cr_auto_guard');
    if (crGuardLvl > 0) {
      shieldBlock += 3 * crGuardLvl;
      bonusMaxHpPct += 5 * crGuardLvl;
    }

    // 4. Лучник: Глаз Совы и Орла
    const arOwlLvl = isSkillActive('ar_owl_eye');
    if (arOwlLvl > 0) {
      bonusDex += 2 * arOwlLvl;
    }

    // 5. Бард: Уроки Гармонии
    const baMusicLvl = isSkillActive('ba_music_lessons');
    if (baMusicLvl > 0) {
      if (archetype === 'RANGED_BOW') {
        bonusAspdPct += 3 * baMusicLvl;
      }
      gearSpRegen += 2 * baMusicLvl;
    }

    // 6. Маг: Медитация Маны
    const mgSpLvl = isSkillActive('mg_sp_recovery');
    if (mgSpLvl > 0) {
      bonusMatkPct += 4 * mgSpLvl;
    }

    // 7. Волшебник: Усиление Магии
    const wzAmpLvl = isSkillActive('wz_mystical_amplify');
    if (wzAmpLvl > 0) {
      bonusMatkPct += 6 * wzAmpLvl;
      this.lifestealPercent += 2 * wzAmpLvl;
    }

    // 8. Мудрец: Свободный Каст
    const sgCastLvl = isSkillActive('sg_free_cast');
    if (sgCastLvl > 0 && archetype === 'MAGIC_STAFF') {
      bonusAspdPct += 5 * sgCastLvl;
    }

    // 9. Аколит: Божественная Защита
    const acProtLvl = isSkillActive('ac_divine_protection');
    if (acProtLvl > 0) {
      bonusVit += 2 * acProtLvl;
      bonusInt += 2 * acProtLvl;
    }

    // 10. Прист: Вера и Мастерство Булавы
    const prMaceLvl = isSkillActive('pr_mace_faith');
    if (prMaceLvl > 0 && (archetype === 'HOLY_MACE' || archetype === 'MAGIC_STAFF')) {
      bonusAtkPct += 5 * prMaceLvl;
      bonusMatkPct += 5 * prMaceLvl;
    }

    // 11. Монах: Духовные Сферы (бонус за каждую активную сферу)
    if (this.spiritSpheres > 0) {
      const moSphereLvl = isSkillActive('mo_spirit_spheres') || 1;
      bonusAtkPct += this.spiritSpheres * (3 * moSphereLvl);
      bonusAspdPct += this.spiritSpheres * 3;
    }

    // Бонусы базовых характеристик от активных зелий и баффов
    for (const b of this.activeBuffs) {
      if (b.statKey === 'str') bonusStr += b.value;
      else if (b.statKey === 'agi') bonusAgi += b.value;
      else if (b.statKey === 'vit') bonusVit += b.value;
      else if (b.statKey === 'int') bonusInt += b.value;
      else if (b.statKey === 'dex') bonusDex += b.value;
      else if (b.statKey === 'luk') bonusLuk += b.value;
      else if (b.statKey === 'allStats') {
        bonusStr += b.value;
        bonusAgi += b.value;
        bonusVit += b.value;
        bonusInt += b.value;
        bonusDex += b.value;
        bonusLuk += b.value;
      }
    }

    const effectiveBase: BaseStats = {
      str: this.baseStats.str + bonusStr,
      agi: this.baseStats.agi + bonusAgi,
      vit: this.baseStats.vit + bonusVit,
      int: this.baseStats.int + bonusInt,
      dex: this.baseStats.dex + bonusDex,
      luk: this.baseStats.luk + bonusLuk,
    };

    // Вечные бонусы от вклеенных в Альбом Карт
    for (const cardId of this.unlockedCards) {
      const cardDef = CARDS_DATABASE[cardId];
      if (cardDef?.albumBonus) {
        if (cardDef.albumBonus.stat === 'allStats') {
          effectiveBase.str += cardDef.albumBonus.value;
          effectiveBase.agi += cardDef.albumBonus.value;
          effectiveBase.vit += cardDef.albumBonus.value;
          effectiveBase.int += cardDef.albumBonus.value;
          effectiveBase.dex += cardDef.albumBonus.value;
          effectiveBase.luk += cardDef.albumBonus.value;
        } else if (effectiveBase[cardDef.albumBonus.stat] !== undefined) {
          effectiveBase[cardDef.albumBonus.stat] += cardDef.albumBonus.value;
        }

        if (cardDef.albumBonus.secondaryStat === 'maxHp') bonusMaxHp += cardDef.albumBonus.secondaryValue || 0;
        else if (cardDef.albumBonus.secondaryStat === 'maxSp') bonusMaxSp += cardDef.albumBonus.secondaryValue || 0;
        else if (cardDef.albumBonus.secondaryStat === 'atk') weaponAtk += cardDef.albumBonus.secondaryValue || 0;
        else if (cardDef.albumBonus.secondaryStat === 'matk') weaponMatk += cardDef.albumBonus.secondaryValue || 0;
        else if (cardDef.albumBonus.secondaryStat === 'def') armorDef += cardDef.albumBonus.secondaryValue || 0;
        else if (cardDef.albumBonus.secondaryStat === 'flee') bonusFlee += cardDef.albumBonus.secondaryValue || 0;
        else if (cardDef.albumBonus.secondaryStat === 'crit') bonusCrit += cardDef.albumBonus.secondaryValue || 0;
      }
    }

    this.effectiveStats = { ...effectiveBase };

    this.derivedStats = CombatSystem.calculateDerivedStats(
      effectiveBase,
      this.level,
      weaponAtk,
      weaponMatk,
      armorDef,
      refineBonus,
      archetype
    );
    this.derivedStats.maxHp += bonusMaxHp;
    this.derivedStats.maxSp += bonusMaxSp;
    this.derivedStats.flee += bonusFlee;
    this.derivedStats.moveSpeed += bonusMoveSpeed;
    this.derivedStats.aspd = Number((this.derivedStats.aspd + bonusAspd).toFixed(2));
    this.derivedStats.critChance += bonusCrit;

    // Применение процентных бонусов от аффиксов и сетов
    if (bonusAtkPct > 0) {
      this.derivedStats.atk = Math.floor(this.derivedStats.atk * (1 + bonusAtkPct / 100));
    }
    if (bonusMatkPct > 0) {
      this.derivedStats.matk = Math.floor(this.derivedStats.matk * (1 + bonusMatkPct / 100));
    }
    if (bonusAspdPct > 0) {
      this.derivedStats.aspd = Number((this.derivedStats.aspd * (1 + bonusAspdPct / 100)).toFixed(2));
    }
    if (bonusMaxHpPct > 0) {
      this.derivedStats.maxHp = Math.floor(this.derivedStats.maxHp * (1 + bonusMaxHpPct / 100));
    }

    // Шанс блока щитом (базовый от щита + Мастерство Наследия Крестоносца + Священный Заслон)
    this.derivedStats.blockChance = Math.min(80, shieldBlock + this.crossJobBonuses.blockChance);
    this.derivedStats.hit += this.crossJobBonuses.hit + (3 * swSwordLvl);
    if (sgCastLvl > 0 && archetype === 'MAGIC_STAFF') {
      this.derivedStats.matk += Math.floor(effectiveBase.agi * 0.5 * sgCastLvl);
    }
    if (this.crossJobBonuses.moveSpeedPct > 0) {
      this.derivedStats.moveSpeed = Math.floor(
        this.derivedStats.moveSpeed * (1 + this.crossJobBonuses.moveSpeedPct / 100)
      );
    }

    // Пассивные классовые бонусы (наследуются продвинутыми ветками)
    if (this.jobClass === 'Swordsman' || this.jobClass === 'Knight' || this.jobClass === 'Crusader') {
      this.derivedStats.atk = Math.floor(this.derivedStats.atk * 1.15); // Sword Mastery
    } else if (this.jobClass === 'Mage' || this.jobClass === 'Wizard' || this.jobClass === 'Sage') {
      this.derivedStats.matk = Math.floor(this.derivedStats.matk * 1.2); // Energy Boost
    } else if (this.jobClass === 'Archer' || this.jobClass === 'Hunter' || this.jobClass === 'Bard') {
      this.derivedStats.flee += 15; // Nimble Ranger
    } else if (this.jobClass === 'Acolyte' || this.jobClass === 'Priest' || this.jobClass === 'Monk') {
      this.derivedStats.maxHp = Math.floor(this.derivedStats.maxHp * 1.12); // Angel Aura
    }

    // Активные алхимические эликсиры и баффы
    for (const b of this.activeBuffs) {
      if (b.statKey === 'aspd') {
        this.derivedStats.aspd = Number((this.derivedStats.aspd * (1 + b.value)).toFixed(2));
      } else if (b.statKey === 'atk') {
        if (b.value < 1) {
          this.derivedStats.atk = Math.floor(this.derivedStats.atk * (1 + b.value));
        } else {
          this.derivedStats.atk += b.value;
        }
      } else if (b.statKey === 'matk') {
        if (b.value < 1) {
          this.derivedStats.matk = Math.floor(this.derivedStats.matk * (1 + b.value));
        } else {
          this.derivedStats.matk += b.value;
        }
      } else if (b.statKey === 'maxHp') {
        if (b.value < 1) {
          this.derivedStats.maxHp = Math.floor(this.derivedStats.maxHp * (1 + b.value));
        } else {
          this.derivedStats.maxHp += b.value;
        }
      } else if (b.statKey === 'moveSpeed') {
        this.derivedStats.moveSpeed = Math.floor(this.derivedStats.moveSpeed * (1 + b.value));
      } else if (b.statKey === 'def') {
        if (b.value < 1) {
          this.derivedStats.def = Math.floor(this.derivedStats.def * (1 + b.value));
        } else {
          this.derivedStats.def += b.value;
        }
      } else if (b.statKey === 'critChance') {
        this.derivedStats.critChance += b.value;
      }
    }

    // Синхронизация состояний баффов Зеркального Щита и Барьера Кирие
    this.isReflectShieldActive = this.activeBuffs.some((b) => b.id === 'buff_cr_reflect_shield');
    if (!this.activeBuffs.some((b) => b.id === 'buff_pr_kyrie')) {
      this.shieldBarrierHp = 0;
      this.shieldBarrierMaxHp = 0;
    }
    if (this.jobClass !== 'Bard') {
      this.isPoemOfBragiActive = false;
    }
    if (this.jobClass !== 'Sage') {
      this.isHindsightActive = false;
    }
    if (this.jobClass !== 'Monk') {
      this.spiritSpheres = 0;
    }

    if (isNaN(this.derivedStats.aspd) || this.derivedStats.aspd <= 0.2) {
      this.derivedStats.aspd = 1.0;
    }

    // Сохранение относительного HP
    const hpRatio = oldMaxHp > 0 ? this.currentHp / oldMaxHp : 1;
    this.currentHp = Math.min(this.derivedStats.maxHp, Math.round(this.derivedStats.maxHp * hpRatio));

    // Синхронизация визуальных сокетов на чибике (Paper-Doll)
    this.puppet.renderWeapon(
      this.equipped.weapon ? this.equipped.weapon.itemId : null,
      this.equipped.weapon?.refineLevel || 0
    );
    this.puppet.renderHeadgear(this.equipped.head ? this.equipped.head.itemId : null);

    this.gearSpRegen = gearSpRegen;
    this.emitAllStats();
  }

  public getStatBreakdown(): StatBreakdown {
    const fromGear: BaseStats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };
    const fromCards: BaseStats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };
    const fromAlbum: BaseStats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };
    const fromBuffs: BaseStats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };

    for (const b of this.activeBuffs) {
      if (b.statKey === 'str') fromBuffs.str += b.value;
      else if (b.statKey === 'agi') fromBuffs.agi += b.value;
      else if (b.statKey === 'vit') fromBuffs.vit += b.value;
      else if (b.statKey === 'int') fromBuffs.int += b.value;
      else if (b.statKey === 'dex') fromBuffs.dex += b.value;
      else if (b.statKey === 'luk') fromBuffs.luk += b.value;
      else if (b.statKey === 'allStats') {
        fromBuffs.str += b.value;
        fromBuffs.agi += b.value;
        fromBuffs.vit += b.value;
        fromBuffs.int += b.value;
        fromBuffs.dex += b.value;
        fromBuffs.luk += b.value;
      }
    }

    let weaponAtk = 0;
    let weaponMatk = 0;
    let armorDef = 0;
    let armorRefineDef = 0;
    let bonusMaxHp = 0;
    let bonusAspd = 0;
    let bonusCrit = 0;
    let bonusFlee = 0;
    let bonusMoveSpeed = 0;

    const archetype = this.getEquippedWeaponArchetype();
    const slots: EquipSlot[] = [
      'weapon',
      'offhand',
      'head',
      'armor',
      'garment',
      'footgear',
      'accessory1',
      'accessory2',
    ];

    for (const slot of slots) {
      const item = this.equipped[slot];
      if (!item) continue;
      const def = ITEMS_DATABASE[item.itemId];
      if (def) {
        const itemTier = item.tier || def.tier || 1;
        const refineLvl = item.refineLevel || 0;
        const rarityMult = getItemGradeMultiplier(item);

        const baseAtk = Math.round((def.baseAtk || 0) * rarityMult);
        const baseMatk = Math.round((def.baseMatk || 0) * rarityMult);
        const baseDef = Math.round((def.baseDef || 0) * rarityMult);
        const bonusAtkVal = Math.round((def.bonusAtk || 0) * rarityMult);
        const bonusMatkVal = Math.round((def.bonusMatk || 0) * rarityMult);

        if (slot === 'weapon') {
          if (baseAtk) weaponAtk += baseAtk;
          if (baseMatk) weaponMatk += baseMatk;
        } else if (slot === 'offhand') {
          if (def.offhandType === 'quiver') {
            if (archetype === 'RANGED_BOW') {
              const a = bonusAtkVal || baseAtk;
              if (a) weaponAtk += a;
              if (def.bonusCrit) bonusCrit += def.bonusCrit;
            }
          } else if (def.offhandType === 'grimoire') {
            const m = bonusMatkVal || baseMatk;
            if (m) weaponMatk += m;
          } else {
            if (baseDef) armorDef += baseDef;
            armorRefineDef += CombatSystem.getRefineDefBonus(itemTier, refineLvl);
          }
        } else if (slot === 'head' || slot === 'armor' || slot === 'garment' || slot === 'footgear') {
          if (baseDef) armorDef += baseDef;
          armorRefineDef += CombatSystem.getRefineDefBonus(itemTier, refineLvl);
        } else if (slot === 'accessory1' || slot === 'accessory2') {
          if (baseDef) armorDef += baseDef;
        }

        if (def.bonusMaxHp) bonusMaxHp += Math.round(def.bonusMaxHp * rarityMult);
        if (def.bonusCrit) bonusCrit += def.bonusCrit;
        if (def.bonusFlee) bonusFlee += Math.round(def.bonusFlee * rarityMult);
        if (def.bonusMoveSpeed) bonusMoveSpeed += Math.round(def.bonusMoveSpeed * rarityMult);
        if (def.primaryStatBonus) {
          const { stat, value } = def.primaryStatBonus;
          if (stat in fromGear) {
            fromGear[stat as StatKey] += Math.round(value * rarityMult);
          }
        }

        if (item.craftGrade === 'RELIC' && slot !== 'weapon') {
          fromGear.str += 3;
          fromGear.agi += 3;
          fromGear.vit += 3;
          fromGear.int += 3;
          fromGear.dex += 3;
          fromGear.luk += 3;
        }
      }

      if (item.affixes) {
        for (const aff of item.affixes) {
          switch (aff.type) {
            case 'AFFIX_STR':
              fromGear.str += aff.value;
              break;
            case 'AFFIX_AGI':
              fromGear.agi += aff.value;
              break;
            case 'AFFIX_VIT':
              fromGear.vit += aff.value;
              break;
            case 'AFFIX_INT':
              fromGear.int += aff.value;
              break;
            case 'AFFIX_DEX':
              fromGear.dex += aff.value;
              break;
            case 'AFFIX_LUK':
              fromGear.luk += aff.value;
              break;
            case 'AFFIX_CRIT':
              bonusCrit += aff.value;
              break;
            case 'AFFIX_MAX_HP':
              bonusMaxHp += aff.value;
              break;
            case 'AFFIX_FLEE':
              bonusFlee += aff.value;
              break;
          }
        }
      }

      if (item.enchantment) {
        const { stat, value } = item.enchantment;
        if (stat in fromGear) {
          fromGear[stat as StatKey] += value;
        }
        if (stat === 'atk') weaponAtk += value;
        if (stat === 'matk') weaponMatk += value;
        if (stat === 'aspd') bonusAspd += value / 100;
        if (stat === 'crit') bonusCrit += value;
      }
      if (item.insertedCards) {
        for (const cardId of item.insertedCards) {
          const cardDef = CARDS_DATABASE[cardId];
          if (!cardDef) continue;
          if (cardDef.effect.bonusStats) {
            if (cardDef.effect.bonusStats.str) fromCards.str += cardDef.effect.bonusStats.str;
            if (cardDef.effect.bonusStats.agi) fromCards.agi += cardDef.effect.bonusStats.agi;
            if (cardDef.effect.bonusStats.vit) fromCards.vit += cardDef.effect.bonusStats.vit;
            if (cardDef.effect.bonusStats.int) fromCards.int += cardDef.effect.bonusStats.int;
            if (cardDef.effect.bonusStats.dex) fromCards.dex += cardDef.effect.bonusStats.dex;
            if (cardDef.effect.bonusStats.luk) fromCards.luk += cardDef.effect.bonusStats.luk;
          }
          const k = cardDef.effect.statKey;
          const v = cardDef.effect.value;
          if (k && k in fromCards) {
            fromCards[k as StatKey] += v;
          }
          if (k === 'allStats') {
            fromCards.str += v;
            fromCards.agi += v;
            fromCards.vit += v;
            fromCards.int += v;
            fromCards.dex += v;
            fromCards.luk += v;
          }
          if (k === 'maxHp') bonusMaxHp += v;
          if (k === 'atk') weaponAtk += v;
          if (k === 'matk') weaponMatk += v;
          if (k === 'critChance') bonusCrit += v;
          if (k === 'flee') bonusFlee += v;
          if (k === 'def') armorDef += v;

          const sk = cardDef.effect.secondStatKey;
          const sv = cardDef.effect.secondValue || 0;
          if (sk === 'allStats') {
            fromCards.str += sv;
            fromCards.agi += sv;
            fromCards.vit += sv;
            fromCards.int += sv;
            fromCards.dex += sv;
            fromCards.luk += sv;
          }
          if (sk === 'flee') bonusFlee += sv;
          if (sk === 'maxHp') bonusMaxHp += sv;
          if (sk === 'critChance') bonusCrit += sv;
          if (sk === 'def') armorDef += sv;
        }
      }
    }

    const albumBonusesList: Array<{ cardId: string; cardName: string; stat: StatKey; value: number }> = [];
    for (const cardId of this.unlockedCards) {
      const cardDef = CARDS_DATABASE[cardId];
      if (cardDef?.albumBonus) {
        if (cardDef.albumBonus.stat === 'allStats') {
          fromAlbum.str += cardDef.albumBonus.value;
          fromAlbum.agi += cardDef.albumBonus.value;
          fromAlbum.vit += cardDef.albumBonus.value;
          fromAlbum.int += cardDef.albumBonus.value;
          fromAlbum.dex += cardDef.albumBonus.value;
          fromAlbum.luk += cardDef.albumBonus.value;
          albumBonusesList.push({
            cardId,
            cardName: cardDef.name,
            stat: 'str',
            value: cardDef.albumBonus.value,
          });
        } else if (fromAlbum[cardDef.albumBonus.stat] !== undefined) {
          fromAlbum[cardDef.albumBonus.stat] += cardDef.albumBonus.value;
          albumBonusesList.push({
            cardId,
            cardName: cardDef.name,
            stat: cardDef.albumBonus.stat,
            value: cardDef.albumBonus.value,
          });
        }
      }
    }

    // Расчет активных пассивок и наследия
    const isUsable = (id: string) => (this.jobSystem && this.jobSystem.isSkillUsable(id) ? this.jobSystem.getSkillLevel(id) : 0);

    const arOwlLvl = isUsable('ar_owl_eye');
    const acProtLvl = isUsable('ac_divine_protection');
    const swSwordLvl = isUsable('sw_sword_mastery');
    const knCavLvl = isUsable('kn_cavalry_mastery');
    const crGuardLvl = isUsable('cr_auto_guard');
    const baMusicLvl = isUsable('ba_music_lessons');
    const mgSpLvl = isUsable('mg_sp_recovery');
    const wzAmpLvl = isUsable('wz_mystical_amplify');
    const sgCastLvl = isUsable('sg_free_cast');
    const prMaceLvl = isUsable('pr_mace_faith');
    const htFalLvl = isUsable('hu_falcon_mastery');
    const moFistLvl = isUsable('mo_iron_fist');

    const fromPassives: BaseStats = {
      str: this.crossJobBonuses.str,
      agi: this.crossJobBonuses.agi,
      vit: this.crossJobBonuses.vit + (acProtLvl > 0 ? 2 * acProtLvl : 0),
      int: this.crossJobBonuses.int + (acProtLvl > 0 ? 2 * acProtLvl : 0),
      dex: this.crossJobBonuses.dex + (arOwlLvl > 0 ? 2 * arOwlLvl : 0),
      luk: this.crossJobBonuses.luk,
    };

    const totalBase: BaseStats = {
      str: this.baseStats.str + fromGear.str + fromCards.str + fromAlbum.str + fromBuffs.str + fromPassives.str,
      agi: this.baseStats.agi + fromGear.agi + fromCards.agi + fromAlbum.agi + fromBuffs.agi + fromPassives.agi,
      vit: this.baseStats.vit + fromGear.vit + fromCards.vit + fromAlbum.vit + fromBuffs.vit + fromPassives.vit,
      int: this.baseStats.int + fromGear.int + fromCards.int + fromAlbum.int + fromBuffs.int + fromPassives.int,
      dex: this.baseStats.dex + fromGear.dex + fromCards.dex + fromAlbum.dex + fromBuffs.dex + fromPassives.dex,
      luk: this.baseStats.luk + fromGear.luk + fromCards.luk + fromAlbum.luk + fromBuffs.luk + fromPassives.luk,
    };

    let atkFromStats = 0;
    let matkFromStats = 0;

    switch (archetype) {
      case 'RANGED_BOW':
        atkFromStats =
          totalBase.dex +
          Math.floor(totalBase.dex / 10) ** 2 +
          Math.floor(totalBase.str / 5) +
          Math.floor(totalBase.luk / 5);
        matkFromStats = totalBase.int + Math.floor(totalBase.int / 7) ** 2;
        break;
      case 'MAGIC_STAFF':
        atkFromStats = Math.floor(totalBase.str / 2);
        matkFromStats =
          totalBase.int +
          Math.floor(totalBase.int / 7) ** 2 +
          Math.floor(totalBase.dex / 5);
        break;
      case 'HOLY_MACE':
        atkFromStats =
          totalBase.str +
          Math.floor(totalBase.str / 10) ** 2 +
          Math.floor(totalBase.int * 0.85) +
          Math.floor(totalBase.int / 10) ** 2;
        matkFromStats = totalBase.int + Math.floor(totalBase.int / 8) ** 2;
        break;
      case 'MELEE_SWORD':
      default:
        atkFromStats =
          totalBase.str +
          Math.floor(totalBase.str / 10) ** 2 +
          Math.floor(totalBase.dex / 5) +
          Math.floor(totalBase.luk / 5);
        matkFromStats = totalBase.int + Math.floor(totalBase.int / 7) ** 2;
        break;
    }

    const weaponItem = this.equipped.weapon;
    const weaponDef = weaponItem ? ITEMS_DATABASE[weaponItem.itemId] : null;
    const weaponTier = weaponItem?.tier || weaponDef?.tier || 1;
    const weaponRefineLevel = weaponItem?.refineLevel || 0;
    const weaponRarityMult = getItemGradeMultiplier(weaponItem);
    const weaponBaseAtk = weaponDef ? Math.round((weaponDef.baseAtk || 0) * weaponRarityMult) : 0;
    const weaponRefineAtk = weaponItem ? CombatSystem.getRefineAtkBonus(weaponTier, weaponRefineLevel) : 0;
    const weaponEnchantAtk = weaponItem?.enchantment?.stat === 'atk' ? weaponItem.enchantment.value : 0;

    const weaponBaseMatk = weaponDef ? Math.round((weaponDef.baseMatk || 0) * weaponRarityMult) : 0;
    const weaponRefineMatk = (archetype === 'MAGIC_STAFF' && weaponItem) ? CombatSystem.getRefineAtkBonus(weaponTier, weaponRefineLevel) : 0;
    const weaponEnchantMatk = weaponItem?.enchantment?.stat === 'matk' ? weaponItem.enchantment.value : 0;

    let passiveAtkMult = 1.0;
    if (this.jobClass === 'Swordsman' || this.jobClass === 'Knight' || this.jobClass === 'Crusader') {
      passiveAtkMult = 1.15;
    }

    let passiveMatkMult = 1.0;
    if (this.jobClass === 'Mage' || this.jobClass === 'Wizard' || this.jobClass === 'Sage') {
      passiveMatkMult = 1.20;
    }

    let passiveHpMult = 1.0;
    if (this.jobClass === 'Acolyte' || this.jobClass === 'Priest' || this.jobClass === 'Monk') {
      passiveHpMult = 1.12;
    }

    let passiveFleeBonus = 0;
    if (this.jobClass === 'Archer' || this.jobClass === 'Hunter' || this.jobClass === 'Bard') {
      passiveFleeBonus = 15;
    }

    let buffsAtkMult = 1.0;
    let buffsMatkFlat = 0;
    let buffsHpFlat = 0;
    let buffsHpMult = 1.0;
    let buffsAspdMult = 1.0;
    let buffsSpeedMult = 1.0;

    for (const b of this.activeBuffs) {
      if (b.statKey === 'atk') {
        if (b.value < 1) buffsAtkMult *= (1 + b.value);
        else buffsAtkMult += b.value;
      } else if (b.statKey === 'matk') {
        if (b.value >= 1) buffsMatkFlat += b.value;
      } else if (b.statKey === 'maxHp') {
        if (b.value < 1) buffsHpMult *= (1 + b.value);
        else buffsHpFlat += b.value;
      } else if (b.statKey === 'aspd') {
        buffsAspdMult *= (1 + b.value);
      } else if (b.statKey === 'moveSpeed') {
        buffsSpeedMult *= (1 + b.value);
      }
    }

    const hpBaseLevel = 40 + this.level * 18;
    const hpVitBonus = Math.floor(hpBaseLevel * (totalBase.vit * 0.02));
    const spBaseLevel = 20 + this.level * 8;
    const spIntBonus = Math.floor(spBaseLevel * (totalBase.int * 0.02));

    const getClassPassiveInfo = () => {
      switch (this.jobClass) {
        case 'Swordsman':
          return {
            name: 'Мастерство меча',
            description: '+15% к физической атаке (ATK) в ближнем бою',
            icon: '⚔️',
          };
        case 'Knight':
          return {
            name: 'Рыцарская закалка',
            description: '+15% к физической атаке (ATK) и стойкость мечника',
            icon: '🐎',
          };
        case 'Crusader':
          return {
            name: 'Священный обет',
            description: '+15% к физической атаке (ATK) и вера мечника',
            icon: '🛡️',
          };
        case 'Mage':
          return {
            name: 'Прилив первородной маны',
            description: '+20% к магической атаке заклинаний (MATK)',
            icon: '🔮',
          };
        case 'Wizard':
          return {
            name: 'Владыка стихий',
            description: '+20% к магической атаке заклинаний (MATK) и чародейство',
            icon: '🧙‍♂️',
          };
        case 'Sage':
          return {
            name: 'Тайное знание',
            description: '+20% к магической атаке заклинаний (MATK) и мудрость',
            icon: '📖',
          };
        case 'Archer':
          return {
            name: 'Чуткий следопыт',
            description: '+15 к увороту (FLEE) и скорости реакции',
            icon: '🏹',
          };
        case 'Hunter':
          return {
            name: 'Инстинкт охотника',
            description: '+15 к увороту (FLEE) и выслеживание добычи',
            icon: '🦅',
          };
        case 'Bard':
          return {
            name: 'Ритм ветра',
            description: '+15 к увороту (FLEE) и песнь странника',
            icon: '🎵',
          };
        case 'Acolyte':
          return {
            name: 'Аура ангела',
            description: '+12% к максимальному запасу здоровья (MaxHP)',
            icon: '😇',
          };
        case 'Priest':
          return {
            name: 'Благодать небес',
            description: '+12% к максимальному запасу здоровья (MaxHP) и святость',
            icon: '🕊️',
          };
        case 'Monk':
          return {
            name: 'Железное тело',
            description: '+12% к максимальному запасу здоровья (MaxHP) и сила духа',
            icon: '👊',
          };
        case 'Novice':
        default:
          return {
            name: 'Дух новичка-странника',
            description: 'Универсальное владение всеми типами экипировки',
            icon: '🐣',
          };
      }
    };

    // Формирование списка активных изученных пассивных навыков
    const activePassivesList: ActivePassiveInfo[] = [];

    if (swSwordLvl > 0) {
      activePassivesList.push({
        id: 'sw_sword_mastery',
        name: 'Мастерство Клинка',
        icon: '⚔️',
        level: swSwordLvl,
        description: SKILLS_DATABASE.sw_sword_mastery.description,
        bonuses: [
          { label: 'Физ. атака (ATK):', value: `+${4 * swSwordLvl}%` + (archetype === 'MELEE_SWORD' ? ' (активно)' : ' (нужен Меч)') },
          { label: 'Меткость (HIT):', value: `+${3 * swSwordLvl}` },
        ],
      });
    }

    if (knCavLvl > 0) {
      activePassivesList.push({
        id: 'kn_cavalry_mastery',
        name: 'Кавалерийский Натиск',
        icon: '🐎',
        level: knCavLvl,
        description: SKILLS_DATABASE.kn_cavalry_mastery.description,
        bonuses: [
          { label: 'Скорость бега:', value: `+${5 * knCavLvl}%` },
          { label: 'Скорость атаки (ASPD):', value: `+${3 * knCavLvl}%` },
          { label: 'Макс. HP:', value: `+${4 * knCavLvl}%` },
        ],
      });
    }

    if (crGuardLvl > 0) {
      activePassivesList.push({
        id: 'cr_auto_guard',
        name: 'Священный Заслон',
        icon: '🛡️',
        level: crGuardLvl,
        description: SKILLS_DATABASE.cr_auto_guard.description,
        bonuses: [
          { label: 'Блок щитом:', value: `+${3 * crGuardLvl}%` },
          { label: 'Макс. HP:', value: `+${5 * crGuardLvl}%` },
        ],
      });
    }

    if (arOwlLvl > 0) {
      activePassivesList.push({
        id: 'ar_owl_eye',
        name: 'Глаз Совы и Орла',
        icon: '👁️',
        level: arOwlLvl,
        description: SKILLS_DATABASE.ar_owl_eye.description,
        bonuses: [
          { label: 'Сноровка (DEX):', value: `+${2 * arOwlLvl}` },
          { label: 'Дальность лука:', value: `+${10 * arOwlLvl}px` },
        ],
      });
    }

    if (htFalLvl > 0) {
      const procRate = 12 + 3 * htFalLvl + Math.floor(totalBase.luk / 3);
      activePassivesList.push({
        id: 'hu_falcon_mastery',
        name: 'Мастерство Сокола',
        icon: '🦅',
        level: htFalLvl,
        description: SKILLS_DATABASE.hu_falcon_mastery.description,
        bonuses: [
          { label: 'Шанс атаки сокола:', value: `${procRate}%` },
          { label: 'Урон сокола:', value: `${110 + 25 * htFalLvl}% (ATK+DEX*2)` },
        ],
      });
    }

    if (baMusicLvl > 0) {
      activePassivesList.push({
        id: 'ba_music_lessons',
        name: 'Уроки Гармонии',
        icon: '🎵',
        level: baMusicLvl,
        description: SKILLS_DATABASE.ba_music_lessons.description,
        bonuses: [
          { label: 'Скорость атаки лука (ASPD):', value: `+${3 * baMusicLvl}%` + (archetype === 'RANGED_BOW' ? ' (активно)' : ' (нужен Лук)') },
          { label: 'Регенерация маны:', value: `+${2 * baMusicLvl} SP/сек` },
        ],
      });
    }

    if (mgSpLvl > 0) {
      activePassivesList.push({
        id: 'mg_sp_recovery',
        name: 'Медитация Маны',
        icon: '🔮',
        level: mgSpLvl,
        description: SKILLS_DATABASE.mg_sp_recovery.description,
        bonuses: [
          { label: 'Маг. атака (MATK):', value: `+${4 * mgSpLvl}%` },
          { label: 'Регенерация маны:', value: `+${3 * mgSpLvl} SP / 3 сек` },
        ],
      });
    }

    if (wzAmpLvl > 0) {
      activePassivesList.push({
        id: 'wz_mystical_amplify',
        name: 'Усиление Магии',
        icon: '✨',
        level: wzAmpLvl,
        description: SKILLS_DATABASE.wz_mystical_amplify.description,
        bonuses: [
          { label: 'Маг. урон заклинаний:', value: `+${6 * wzAmpLvl}%` },
          { label: 'Вампиризм магии:', value: `+${2 * wzAmpLvl}%` },
        ],
      });
    }

    if (sgCastLvl > 0) {
      activePassivesList.push({
        id: 'sg_free_cast',
        name: 'Свободный Каст',
        icon: '📖',
        level: sgCastLvl,
        description: SKILLS_DATABASE.sg_free_cast.description,
        bonuses: [
          { label: 'Скорость атаки с посохом:', value: `+${5 * sgCastLvl}%` + (archetype === 'MAGIC_STAFF' ? ' (активно)' : ' (нужен Посох)') },
          { label: 'Бонус MATK от AGI:', value: `+${Math.floor(totalBase.agi * 0.5 * sgCastLvl)} MATK` },
        ],
      });
    }

    if (acProtLvl > 0) {
      activePassivesList.push({
        id: 'ac_divine_protection',
        name: 'Божественная Защита',
        icon: '😇',
        level: acProtLvl,
        description: SKILLS_DATABASE.ac_divine_protection.description,
        bonuses: [
          { label: 'Живучесть (VIT):', value: `+${2 * acProtLvl}` },
          { label: 'Интеллект (INT):', value: `+${2 * acProtLvl}` },
          { label: 'Защита от Нежити/Демонов:', value: `-${6 * acProtLvl}% урона` },
        ],
      });
    }

    if (prMaceLvl > 0) {
      const isMaceOrStaff = archetype === 'HOLY_MACE' || archetype === 'MAGIC_STAFF';
      activePassivesList.push({
        id: 'pr_mace_faith',
        name: 'Вера и Мастерство Булавы',
        icon: '🔨',
        level: prMaceLvl,
        description: SKILLS_DATABASE.pr_mace_faith.description,
        bonuses: [
          { label: 'ATK и MATK с булавой/посохом:', value: `+${5 * prMaceLvl}%` + (isMaceOrStaff ? ' (активно)' : ' (нужна Булава/Посох)') },
          { label: 'Шанс пассивного исцеления:', value: `${25 + 4 * prMaceLvl}%` },
        ],
      });
    }

    if (moFistLvl > 0) {
      activePassivesList.push({
        id: 'mo_iron_fist',
        name: 'Кулак Дракона и Тройной Удар',
        icon: '👊',
        level: moFistLvl,
        description: SKILLS_DATABASE.mo_iron_fist.description,
        bonuses: [
          { label: 'Шанс Тройного Удара:', value: `${18 + 4 * moFistLvl}%` },
          { label: 'Урон Тройного Удара:', value: '300% (ATK+INT)' },
        ],
      });
    }

    const offItem = this.equipped.offhand;
    const offDef = offItem ? ITEMS_DATABASE[offItem.itemId] : null;
    const shieldDef = offItem && offDef && (offDef.offhandType === 'shield' || (!offDef.offhandType && (offDef.baseDef || 0) > 0))
      ? (offDef.blockChance || (5 + (offItem.tier || 1) * 2))
      : 0;

    const skillAtkPct = (swSwordLvl > 0 && archetype === 'MELEE_SWORD' ? 4 * swSwordLvl : 0) +
      (prMaceLvl > 0 && (archetype === 'HOLY_MACE' || archetype === 'MAGIC_STAFF') ? 5 * prMaceLvl : 0);

    return {
      level: this.level,
      jobClass: this.jobClass,
      statPoints: this.statPoints,
      baseStats: {
        invested: { ...this.baseStats },
        fromGear,
        fromCards,
        fromAlbum,
        fromBuffs,
        fromPassives,
        total: totalBase,
      },
      combat: {
        atk: {
          fromStats: atkFromStats,
          weaponBase: weaponBaseAtk,
          refine: weaponRefineAtk,
          enchant: weaponEnchantAtk,
          passiveMult: passiveAtkMult,
          buffsMult: buffsAtkMult,
          passivePct: skillAtkPct,
          crossJobPct: this.crossJobBonuses.atkPct,
          total: this.derivedStats.atk,
        },
        matk: {
          fromStats: matkFromStats,
          weaponBase: weaponBaseMatk,
          refine: weaponRefineMatk,
          enchant: weaponEnchantMatk,
          passiveMult: passiveMatkMult,
          meditationBonusPct: mgSpLvl * 4,
          mysticalAmplifyPct: wzAmpLvl * 6,
          maceFaithPct: (archetype === 'HOLY_MACE' || archetype === 'MAGIC_STAFF') ? prMaceLvl * 5 : 0,
          freeCastBonusMatk: (archetype === 'MAGIC_STAFF') ? Math.floor(totalBase.agi * 0.5 * sgCastLvl) : 0,
          crossJobPct: this.crossJobBonuses.matkPct,
          buffsFlat: buffsMatkFlat,
          total: this.derivedStats.matk,
        },
        def: {
          armorBase: armorDef,
          refine: armorRefineDef,
          crossJobHardDef: this.crossJobBonuses.hardDef,
          softDef: CombatSystem.calculateSoftDef(totalBase.vit),
          totalPercent: this.derivedStats.def,
          totalSoft: this.derivedStats.softDef,
        },
        maxHp: {
          baseLevel: hpBaseLevel,
          vitBonus: hpVitBonus,
          gearCards: bonusMaxHp,
          passiveMult: passiveHpMult,
          cavalryBonusPct: knCavLvl * 4,
          autoGuardBonusPct: crGuardLvl * 5,
          crossJobPct: this.crossJobBonuses.maxHpPct,
          buffsFlat: buffsHpFlat,
          buffsMult: buffsHpMult,
          total: this.derivedStats.maxHp,
        },
        maxSp: {
          baseLevel: spBaseLevel,
          intBonus: spIntBonus,
          meditationRegenRate: mgSpLvl * 3,
          musicLessonsRegenRate: baMusicLvl * 2,
          crossJobPct: this.crossJobBonuses.maxSpPct,
          total: this.derivedStats.maxSp,
        },
        aspd: {
          baseAgiDex: Number((1.1 + totalBase.agi * 0.038 + totalBase.dex * 0.008).toFixed(2)),
          enchantBonus: bonusAspd,
          buffsMult: buffsAspdMult,
          cavalryBonusPct: knCavLvl * 3,
          musicLessonsBonusPct: (archetype === 'RANGED_BOW') ? baMusicLvl * 3 : 0,
          freeCastBonusPct: (archetype === 'MAGIC_STAFF') ? sgCastLvl * 5 : 0,
          crossJobPct: this.crossJobBonuses.aspdPct,
          total: this.derivedStats.aspd,
        },
        critChance: {
          fromLuk: Number((1 + totalBase.luk * 0.35).toFixed(1)),
          cardsEnchant: bonusCrit,
          crossJobBonus: this.crossJobBonuses.critChance,
          total: this.derivedStats.critChance,
        },
        hit: {
          baseLevel: 175 + this.level,
          dexBonus: totalBase.dex,
          lukBonus: Math.floor(totalBase.luk / 3),
          swordMasteryBonus: swSwordLvl * 3,
          crossJobBonus: this.crossJobBonuses.hit,
          total: this.derivedStats.hit,
        },
        flee: {
          baseLevel: 100 + this.level,
          agiBonus: totalBase.agi,
          lukBonus: Math.floor(totalBase.luk / 5),
          passiveBonus: passiveFleeBonus,
          crossJobBonus: this.crossJobBonuses.flee,
          total: this.derivedStats.flee,
        },
        moveSpeed: {
          base: 160,
          agiBonus: Math.floor(totalBase.agi * 0.8),
          cavalryBonusSpeed: Math.floor(160 * 0.05 * knCavLvl),
          crossJobPct: this.crossJobBonuses.moveSpeedPct,
          buffsMult: buffsSpeedMult,
          total: this.derivedStats.moveSpeed,
        },
        blockChance: {
          shieldBase: shieldDef,
          autoGuardBonus: crGuardLvl * 3,
          crossJobBonus: this.crossJobBonuses.blockChance,
          total: this.derivedStats.blockChance || 0,
        },
      },
      classPassive: getClassPassiveInfo(),
      activePassives: activePassivesList,
      activeBuffs: [...this.activeBuffs],
      albumBonuses: albumBonusesList,
    };
  }

  public addItem(itemId: string, count = 1): void {
    const itemDef = ITEMS_DATABASE[itemId];
    const isStackable = itemDef && (itemDef.type === 'consumable' || itemDef.type === 'material');

    if (isStackable) {
      const existing = this.inventory.find((i) => i.itemId === itemId);
      if (existing) {
        existing.count += count;
      } else {
        this.inventory.push({
          uid: `${itemId}_${Math.random().toString(36).substring(2, 9)}`,
          itemId,
          count,
          tier: itemDef?.tier || 1,
          rarity: 'COMMON',
          maxSlots: itemDef?.maxSlots || 0,
          affixes: [],
          isLocked: false,
          refineLevel: 0,
          insertedCards: [],
        });
      }
    } else {
      // Экипировка и карты хранятся отдельными экземплярами
      for (let i = 0; i < count; i++) {
        this.inventory.push({
          uid: `${itemId}_${Math.random().toString(36).substring(2, 9)}`,
          itemId,
          count: 1,
          tier: itemDef?.tier || 1,
          rarity: 'COMMON',
          maxSlots: itemDef?.maxSlots || 0,
          affixes: [],
          isLocked: false,
          refineLevel: 0,
          insertedCards: [],
        });
      }
    }

    EventBus.emit('INVENTORY_UPDATED', { items: [...this.inventory] });
  }

  public addInventoryItem(item: InventoryItem): void {
    this.inventory.push(item);
    EventBus.emit('INVENTORY_UPDATED', { items: [...this.inventory] });
  }

  public removeItem(uid: string, count = 1): boolean {
    const idx = this.inventory.findIndex((i) => i.uid === uid);
    if (idx === -1) return false;

    const item = this.inventory[idx];
    if (item.count > count) {
      item.count -= count;
    } else {
      this.inventory.splice(idx, 1);
    }

    EventBus.emit('INVENTORY_UPDATED', { items: [...this.inventory] });
    return true;
  }

  public getItemCount(itemId: string): number {
    return this.inventory
      .filter((i) => i.itemId === itemId)
      .reduce((sum, i) => sum + (i.count || 1), 0);
  }

  public removeItemByItemId(itemId: string, count = 1): boolean {
    if (this.getItemCount(itemId) < count) return false;

    let remaining = count;
    for (let i = this.inventory.length - 1; i >= 0 && remaining > 0; i--) {
      if (this.inventory[i].itemId === itemId) {
        if (this.inventory[i].count > remaining) {
          this.inventory[i].count -= remaining;
          remaining = 0;
        } else {
          remaining -= this.inventory[i].count;
          this.inventory.splice(i, 1);
        }
      }
    }

    EventBus.emit('INVENTORY_UPDATED', { items: [...this.inventory] });
    return true;
  }

  public equipItem(uid: string, targetSlot?: EquipSlot): boolean {
    const idx = this.inventory.findIndex((i) => i.uid === uid);
    if (idx === -1) return false;

    const item = this.inventory[idx];
    const def = ITEMS_DATABASE[item.itemId];
    if (!def || def.type !== 'equip' || !def.slot) return false;

    // Требования по уровню
    if (def.requiredLevel && this.level < def.requiredLevel) {
      EventBus.emit('COMBAT_LOG', {
        message: `Требуется ${def.requiredLevel} уровень персонажа!`,
        color: '#ef4444',
      });
      return false;
    }

    // Определяем слот для надевания
    let slotToUse: EquipSlot = def.slot;
    if (def.slot === 'accessory1' || def.slot === 'accessory2') {
      if (targetSlot === 'accessory1' || targetSlot === 'accessory2') {
        slotToUse = targetSlot;
      } else {
        if (!this.equipped.accessory1) {
          slotToUse = 'accessory1';
        } else if (!this.equipped.accessory2) {
          slotToUse = 'accessory2';
        } else {
          slotToUse = 'accessory1';
        }
      }
    }

    // Если в сокете уже что-то надето, снимаем в инвентарь
    const currentEquipped = this.equipped[slotToUse];
    if (currentEquipped) {
      this.inventory.push(currentEquipped);
    }

    this.inventory.splice(idx, 1);
    this.equipped[slotToUse] = item;
    this.recalculateStats();

    SoundFX.playCampToggle();
    EventBus.emit('COMBAT_LOG', {
      message: `Экипировано: ${def.name}`,
      color: '#38bdf8',
    });
    return true;
  }

  public unequipItem(slot: EquipSlot): boolean {
    const item = this.equipped[slot];
    if (!item) return false;

    this.equipped[slot] = null;
    this.inventory.push(item);
    this.recalculateStats();

    const def = ITEMS_DATABASE[item.itemId];
    EventBus.emit('COMBAT_LOG', {
      message: `Снято: ${def?.name || item.itemId}`,
      color: '#94a3b8',
    });
    return true;
  }

  public toggleItemLock(uid: string): boolean {
    let item = this.inventory.find((i) => i.uid === uid);
    if (!item) {
      for (const slot of Object.keys(this.equipped) as EquipSlot[]) {
        if (this.equipped[slot]?.uid === uid) {
          item = this.equipped[slot]!;
          break;
        }
      }
    }
    if (!item) return false;

    item.isLocked = !item.isLocked;
    SoundFX.playCampToggle();
    EventBus.emit('INVENTORY_UPDATED', { items: [...this.inventory] });
    EventBus.emit('COMBAT_LOG', {
      message: item.isLocked
        ? `🔒 Предмет защищен от продажи и разборки`
        : `🔓 Защита с предмета снята`,
      color: item.isLocked ? '#fbbf24' : '#94a3b8',
    });
    return true;
  }

  public insertCard(itemUid: string, cardId: string): boolean {
    // Поиск предмета в экипировке или инвентаре
    let targetItem: InventoryItem | undefined;
    for (const slot of Object.keys(this.equipped) as EquipSlot[]) {
      if (this.equipped[slot]?.uid === itemUid) {
        targetItem = this.equipped[slot]!;
        break;
      }
    }
    if (!targetItem) {
      targetItem = this.inventory.find((i) => i.uid === itemUid);
    }
    if (!targetItem) return false;

    const itemDef = ITEMS_DATABASE[targetItem.itemId];
    const cardDef = CARDS_DATABASE[cardId];
    if (!itemDef || !cardDef) return false;

    // Синхронизация и расчет свободных сокетов
    const baseSlots = Math.max(targetItem.maxSlots ?? 0, itemDef.maxSlots ?? 0);
    if ((targetItem.maxSlots ?? 0) < baseSlots) {
      targetItem.maxSlots = baseSlots;
    }
    const totalSlots = baseSlots + (targetItem.bonusSlots || 0);

    if (!targetItem.insertedCards) {
      targetItem.insertedCards = [];
    }

    if (totalSlots === 0 || targetItem.insertedCards.length >= totalSlots) {
      EventBus.emit('COMBAT_LOG', { message: 'В предмете нет свободных слотов для карт!', color: '#ef4444' });
      EventBus.emit('FLOATING_TEXT', {
        x: this.x,
        y: this.y - 28,
        text: '❌ Нет свободных слотов!',
        color: 0xef4444,
      });
      return false;
    }

    const isAccMatch =
      cardDef.targetSlot === 'accessory' &&
      (itemDef.slot === 'accessory1' || itemDef.slot === 'accessory2');

    if (itemDef.slot !== cardDef.targetSlot && !isAccMatch) {
      EventBus.emit('COMBAT_LOG', { message: `Эта карта предназначена только для слота [${cardDef.targetSlot}]!`, color: '#ef4444' });
      EventBus.emit('FLOATING_TEXT', {
        x: this.x,
        y: this.y - 28,
        text: `❌ Только для [${cardDef.targetSlot}]`,
        color: 0xef4444,
      });
      return false;
    }

    // Тратим 1 карту из инвентаря
    const cardIdx = this.inventory.findIndex((i) => i.itemId === cardId);
    if (cardIdx === -1) {
      EventBus.emit('COMBAT_LOG', { message: 'Карта не найдена в рюкзаке!', color: '#ef4444' });
      return false;
    }
    this.removeItem(this.inventory[cardIdx].uid, 1);

    targetItem.insertedCards.push(cardId);
    this.recalculateStats();
    SoundFX.playLevelUp();

    EventBus.emit('COMBAT_LOG', {
      message: `✨ В предмет [${itemDef.name}] успешно вставлена карта [${cardDef.name}]!`,
      color: '#fbbf24',
    });
    EventBus.emit('FLOATING_TEXT', {
      x: this.x,
      y: this.y - 28,
      text: `🃏 Карта вставлена!`,
      color: 0xfbbf24,
      isCrit: true,
    });

    // Оповещаем все компоненты интерфейса об обновлении инвентаря и экипировки
    EventBus.emit('INVENTORY_UPDATED', { items: [...this.inventory] });
    EventBus.emit('EQUIPMENT_UPDATED', { equipped: { ...this.equipped } });

    return true;
  }

  public useConsumable(itemUid: string): boolean {
    const item = this.inventory.find((i) => i.uid === itemUid);
    if (!item) return false;

    const def = ITEMS_DATABASE[item.itemId];
    if (!def || def.type !== 'consumable') return false;

    if (item.itemId === 'yggdrasil_elixir') {
      this.heal(this.derivedStats.maxHp);
      this.currentSp = this.derivedStats.maxSp;
      SoundFX.playLevelUp();
      EventBus.emit('COMBAT_LOG', {
        message: `🌟 [${def.name}] полностью исцелил всё здоровье и восстановил запас маны!`,
        color: '#fbbf24',
      });
    } else if (item.itemId === 'aspd_potion' || item.itemId === 'awakening_potion' || item.itemId === 'berserk_potion') {
      const aspdBonus = item.itemId === 'berserk_potion' ? 0.35 : item.itemId === 'awakening_potion' ? 0.25 : 0.2;
      const existing = this.activeBuffs.find((b) => b.id === 'buff_aspd_potion');
      if (existing) {
        existing.duration = 300;
        existing.value = Math.max(existing.value, aspdBonus);
      } else {
        this.activeBuffs.push({
          id: 'buff_aspd_potion',
          name: def.name,
          icon: '⚡',
          statKey: 'aspd',
          value: aspdBonus,
          duration: 300,
          maxDuration: 300,
        });
      }
      this.recalculateStats();
      SoundFX.playHeal();
      EventBus.emit('BUFFS_UPDATED', { buffs: [...this.activeBuffs] });
      EventBus.emit('COMBAT_LOG', {
        message: `⚡ [${def.name}]: +${Math.round(aspdBonus * 100)}% к скорости атаки (ASPD) на 5 минут!`,
        color: '#f59e0b',
      });
    } else if (def.healAmount || def.spAmount) {
      const potMult = 1 + (this.cardPotionBonusPct || 0) / 100;
      let text = `Использовано: ${def.name}`;
      if (def.healAmount) {
        const finalHeal = Math.round(def.healAmount * potMult);
        this.heal(finalHeal);
        text += ` (+${finalHeal} HP)`;
      }
      if (def.spAmount) {
        const finalSp = Math.round(def.spAmount * potMult);
        this.restoreSp(finalSp);
        text += ` (+${finalSp} SP)`;
      }
      SoundFX.playHeal();
      EventBus.emit('COMBAT_LOG', {
        message: text,
        color: '#4ade80',
      });
    }

    this.removeItem(itemUid, 1);
    return true;
  }

  public tryAutoPotion(): boolean {
    // Приоритет в зависимости от здоровья:
    // Если здоровье критическое (<25%), ищем Эликсир Иггдрасиля
    if (this.currentHp < this.derivedStats.maxHp * 0.25) {
      const ygg = this.inventory.find((i) => i.itemId === 'yggdrasil_elixir');
      if (ygg) {
        this.autoPotionCooldown = 0.9;
        this.useConsumable(ygg.uid);
        return true;
      }
    }

    // Приоритет зелий: Greater White Potion -> White Potion -> Yellow Potion -> Orange Potion -> Red Potion -> Apple
    const potionOrder = ['greater_white_potion', 'white_potion', 'yellow_potion', 'orange_potion', 'red_potion', 'apple'];
    for (const pId of potionOrder) {
      const potionItem = this.inventory.find((i) => i.itemId === pId);
      if (potionItem) {
        this.autoPotionCooldown = 0.9;
        this.useConsumable(potionItem.uid);
        return true;
      }
    }

    return false;
  }

  public addExp(base: number, job: number): void {
    // Бонус к получаемому Base и Job EXP (Прист Job Lv.50: +10%)
    const expMult = 1 + (this.crossJobBonuses.bonusExpPct || 0) / 100;
    const finalBase = Math.floor(base * expMult);
    const finalJob = Math.floor(job * expMult);

    this.baseExp += finalBase;
    this.jobSystem.addJobExp(finalJob, this);

    if (this.level >= 99) {
      this.level = 99;
      this.baseExp = 0;
    } else {
      let reqBase = CombatSystem.getRequiredExp(this.level);
      let levelUps = 0;
      while (this.baseExp >= reqBase && reqBase > 0 && this.level < 99 && levelUps < 100) {
        this.baseExp -= reqBase;
        this.level += 1;
        levelUps++;
        const pts = CombatSystem.getStatPointsPerLevel(this.level);
        this.statPoints += pts;
        this.currentHp = this.derivedStats.maxHp;
        this.currentSp = this.derivedStats.maxSp;
        SoundFX.playLevelUp();
        EventBus.emit('LEVEL_UP', { level: this.level, statPointsGained: pts });
        EventBus.emit('COMBAT_LOG', {
          message: `Поздравляем! Достигнут Base Level ${this.level}! Получено +${pts} очков статов.`,
          color: '#fbbf24',
        });

        // Открытие выбора профессии на 10 уровне
        if (this.level >= 10 && this.jobClass === 'Novice') {
          EventBus.emit('OPEN_JOB_SELECT', true);
        }

        reqBase = CombatSystem.getRequiredExp(this.level);
      }
      if (this.level >= 99) {
        this.level = 99;
        this.baseExp = 0;
      }
    }

    this.recalculateStats();
  }

  public gainBaseExp(base: number): void {
    this.addExp(base, 0);
  }

  public gainJobExp(job: number): void {
    this.addExp(0, job);
  }

  public addZeny(amount: number): void {
    this.zeny += amount;
    EventBus.emit('ZENY_CHANGED', { zeny: this.zeny });
  }

  public removeZeny(amount: number): boolean {
    if (this.zeny < amount) return false;
    this.zeny -= amount;
    EventBus.emit('ZENY_CHANGED', { zeny: this.zeny });
    return true;
  }

  public addBuff(buff: ActiveBuff): void {
    const existingIdx = this.activeBuffs.findIndex((b) => b.id === buff.id);
    if (existingIdx !== -1) {
      this.activeBuffs[existingIdx].duration = buff.duration;
    } else {
      this.activeBuffs.push({ ...buff });
    }
    this.recalculateStats();
    EventBus.emit('BUFFS_UPDATED', { buffs: [...this.activeBuffs] });
  }

  public changeJob(newJob: JobClass): void {
    const metaEntry = Object.values(JOBS_METADATA).find((m) => m.className === newJob);
    if (metaEntry) {
      this.jobSystem.switchJob(metaEntry.id, this);
    } else {
      this.jobClass = newJob;
      SoundFX.playLevelUp();
      this.recalculateStats();
      EventBus.emit('JOB_CHANGED', { jobClass: newJob });
    }
  }

  public recordMonsterKill(monsterId: string): void {
    this.bestiaryKills[monsterId] = (this.bestiaryKills[monsterId] || 0) + 1;
    EventBus.emit('BESTIARY_UPDATED', {
      kills: { ...this.bestiaryKills },
      unlockedCards: [...this.unlockedCards],
    });
    EventBus.emit('ZENY_CHANGED', { zeny: this.zeny });
    EventBus.emit('BUFFS_UPDATED', { buffs: [...this.activeBuffs] });
  }

  public pasteCardIntoAlbum(cardId: string): boolean {
    if (this.unlockedCards.includes(cardId)) {
      EventBus.emit('COMBAT_LOG', { message: 'Эта карта уже вклеена в ваш Альбом!', color: '#94a3b8' });
      return false;
    }

    const cardItem = this.inventory.find((i) => i.itemId === cardId);
    if (!cardItem) {
      EventBus.emit('COMBAT_LOG', { message: 'У вас нет этой карты в инвентаре для вклейки!', color: '#ef4444' });
      return false;
    }

    this.removeItem(cardItem.uid, 1);
    this.unlockedCards.push(cardId);
    this.recalculateStats();
    SoundFX.playLevelUp();

    const cardDef = CARDS_DATABASE[cardId];
    EventBus.emit('COMBAT_LOG', {
      message: `📖 Карта [${cardDef?.name || cardId}] вклеена в Альбом! Получен вечный бонус: +${cardDef?.albumBonus?.value} к ${cardDef?.albumBonus?.stat.toUpperCase()}!`,
      color: '#fbbf24',
    });

    EventBus.emit('BESTIARY_UPDATED', {
      kills: { ...this.bestiaryKills },
      unlockedCards: [...this.unlockedCards],
    });

    return true;
  }

  public takeDamage(damage: number): void {
    const finalDamage = Math.round(damage);
    this.currentHp = Math.max(0, this.currentHp - finalDamage);
    this.puppet.updateHpBar(this.currentHp, this.derivedStats.maxHp);
    this.puppet.triggerHitFlash();
    EventBus.emit('HP_CHANGED', { current: this.currentHp, max: this.derivedStats.maxHp });

    // Карта Заводного Стража (Punk): при получении удара 12% шанс наложить ускорение (+25% ASPD)
    if (this.cardOnHitBuffAspdChance > 0 && Math.random() <= this.cardOnHitBuffAspdChance) {
      this.addBuff({
        id: 'buff_punk_aspd',
        name: 'Заводное Ускорение',
        icon: '⚡',
        statKey: 'aspd',
        value: 0.25,
        duration: 5,
        maxDuration: 5,
      });
      EventBus.emit('COMBAT_LOG', {
        message: '⚡ [Карта Заводного Стража]: Сработало Заводное Ускорение (+25% к ASPD на 5 сек)!',
        color: '#38bdf8',
      });
    }

    if (this.currentHp <= 0) {
      this.handleDeath();
    }
  }

  public handleDeath(): void {
    EventBus.emit('COMBAT_LOG', {
      message: '💀 Ваше здоровье опустилось до 0! Вы отступили для восстановления сил...',
      color: '#ef4444',
    });
    this.x = 0;
    this.y = 0;
    this.currentHp = Math.max(1, Math.floor(this.derivedStats.maxHp * 0.5));
    this.puppet.root.position.set(this.x, this.y);
    this.puppet.updateHpBar(this.currentHp, this.derivedStats.maxHp);
    EventBus.emit('HP_CHANGED', { current: this.currentHp, max: this.derivedStats.maxHp });
    this.clearTargetMonster();
    this.targetResourceNode = null;
    this.patrolTargetX = null;
    this.patrolTargetY = null;
  }

  public heal(amount: number): void {
    if (this.currentHp >= this.derivedStats.maxHp) return;
    this.currentHp = Math.min(this.derivedStats.maxHp, Math.round(this.currentHp + amount));
    this.puppet.updateHpBar(this.currentHp, this.derivedStats.maxHp);
    EventBus.emit('HP_CHANGED', { current: this.currentHp, max: this.derivedStats.maxHp });
  }

  public restoreSp(amount: number): void {
    if (this.currentSp >= this.derivedStats.maxSp) return;
    this.currentSp = Math.min(this.derivedStats.maxSp, Math.round(this.currentSp + amount));
    EventBus.emit('SP_CHANGED', { current: this.currentSp, max: this.derivedStats.maxSp });
  }

  public moveTowards(destX: number, destY: number, dt: number): void {
    const directDx = destX - this.x;
    const directDy = destY - this.y;
    const directDist = Math.hypot(directDx, directDy);

    if (directDist < 4) {
      this.isMovingToTarget = false;
      this.puppet.isMoving = false;
      this.currentPath = [];
      return;
    }

    let nextX = destX;
    let nextY = destY;

    if (this.worldMapSystem) {
      this.pathRecalcTimer -= dt;
      const hasLos = this.worldMapSystem.hasLineOfSight(this.x, this.y, destX, destY, 14);

      if (hasLos) {
        // Прямой путь к цели чист — не требуются промежуточные точки
        this.currentPath = [];
      } else {
        // Прямой путь заблокирован препятствием — строим или обновляем маршрут обхода
        const targetMoved = Math.hypot(this.pathTargetX - destX, this.pathTargetY - destY) > 30;
        if (this.currentPath.length === 0 || targetMoved || this.pathRecalcTimer <= 0) {
          this.currentPath = this.worldMapSystem.findPath(this.x, this.y, destX, destY, 14);
          this.pathTargetX = destX;
          this.pathTargetY = destY;
          this.pathRecalcTimer = 0.5; // пересчет не чаще раза в 0.5с
        }
      }

      // Если есть путевые точки обхода, движемся к ближайшей
      while (this.currentPath.length > 0) {
        const wp = this.currentPath[0];
        const distToWp = Math.hypot(wp.x - this.x, wp.y - this.y);
        if (distToWp <= 18) {
          this.currentPath.shift();
        } else {
          nextX = wp.x;
          nextY = wp.y;
          break;
        }
      }
    }

    const dx = nextX - this.x;
    const dy = nextY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 2) {
      this.puppet.isMoving = false;
      return;
    }

    const moveDist = this.derivedStats.moveSpeed * dt;
    const step = Math.min(dist, moveDist);
    const targetStepX = this.x + (dx / dist) * step;
    const targetStepY = this.y + (dy / dist) * step;

    let finalX = targetStepX;
    let finalY = targetStepY;

    if (this.worldMapSystem) {
      const resolved = this.worldMapSystem.resolveMovement(this.x, this.y, targetStepX, targetStepY, 14);
      finalX = resolved.x;
      finalY = resolved.y;
    }

    const actualDx = finalX - this.x;
    if (Math.abs(actualDx) > 0.05) {
      this.puppet.setFacing(actualDx);
    } else if (Math.abs(dx) > 0.05) {
      this.puppet.setFacing(dx);
    }

    this.x = finalX;
    this.y = finalY;
    this.puppet.isMoving = true;
  }

  public update(
    dt: number,
    monsters: Monster[],
    onAttackMonster: (m: Monster) => void,
    resourceNodes?: ResourceNode[],
    onHarvestNode?: (node: ResourceNode) => void,
    onCastSkill?: (skillId: string, silent?: boolean) => boolean
  ): void {
    this.updateCampFireAnimation(dt);

    // Автоматическая ротация способностей (баффы, стойки, АОЕ по толпе и бурст по боссам)
    if (this.autoSkillsEnabled && onCastSkill) {
      this.updateAutoSkillRotation(dt, monsters, onCastSkill);
    }

    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }

    if (this.autoPotionCooldown > 0) {
      this.autoPotionCooldown -= dt;
    }

    // Авто-зелья при снижении здоровья ниже установленного порога
    if (
      this.derivedStats.maxHp > 0 &&
      (this.currentHp / this.derivedStats.maxHp) * 100 <= this.autoPotionPercent &&
      this.autoPotionCooldown <= 0
    ) {
      this.tryAutoPotion();
    }

    // =========================================================================
    // СИСТЕМА РЕГЕНЕРАЦИИ HP И SP (ПАТЧ 3.5 / КЛАССИЧЕСКИЙ RO)
    // =========================================================================

    // 1. Безопасная зона (Деревня Новичков / Пронтера)
    // Снижена скорость: размеренные 2.0% MaxHP и 2.0% MaxSP в секунду
    if (this.isSafeZone) {
      this.safeZoneRegenTimer += dt;
      if (this.safeZoneRegenTimer >= 1.0) {
        this.safeZoneRegenTimer -= 1.0;
        if (this.currentHp < this.derivedStats.maxHp) {
          const hpGain = Math.max(2, Math.floor(this.derivedStats.maxHp * 0.02));
          this.heal(hpGain);
        }
        if (this.currentSp < this.derivedStats.maxSp) {
          const spGain = Math.max(2, Math.floor(this.derivedStats.maxSp * 0.02));
          this.restoreSp(spGain);
        }
      }
      this.campRegenTimer = 0;
      this.naturalHpRegenTimer = 0;
      this.naturalSpRegenTimer = 0;
    } else {
      this.safeZoneRegenTimer = 0;

      // 2. Регенерация в режиме авто-охоты (ранее у костра)
      // Восстановление сил на ходу: 1.5% MaxHP и 1.0% MaxSP в секунду
      if (this.campActive) {
        this.campRegenTimer += dt;
        if (this.campRegenTimer >= 1.0) {
          this.campRegenTimer -= 1.0;
          if (this.currentHp < this.derivedStats.maxHp) {
            const hpGain = Math.max(1, Math.floor(this.derivedStats.maxHp * 0.015));
            this.heal(hpGain);
          }
          if (this.currentSp < this.derivedStats.maxSp) {
            const spGain = Math.max(1, Math.floor(this.derivedStats.maxSp * 0.01) + Math.floor(this.gearSpRegen * 0.5));
            this.restoreSp(spGain);
          }
        }
        this.naturalHpRegenTimer = 0;
        this.naturalSpRegenTimer = 0;
      } else {
        this.campRegenTimer = 0;

        // 3. Естественная регенерация в боевых зонах (Natural RO Regen)
        const hasMagnificat = this.activeBuffs.some((b) => b.id === 'buff_pr_kyrie');

        // Тик HP каждые 6.0 секунд от VIT и MaxHP
        if (this.currentHp < this.derivedStats.maxHp) {
          this.naturalHpRegenTimer += dt;
          if (this.naturalHpRegenTimer >= 6.0) {
            this.naturalHpRegenTimer -= 6.0;
            const vitBonus = Math.floor(this.baseStats.vit / 5);
            const maxHpBonus = Math.floor(this.derivedStats.maxHp / 250);
            let hpGain = Math.max(1, vitBonus + maxHpBonus);
            if (hasMagnificat) hpGain *= 2;
            this.heal(hpGain);
          }
        } else {
          this.naturalHpRegenTimer = 0;
        }

        // Тик SP каждые 8.0 секунд от INT, MaxSP, Гримуара и бонусов SP-регена
        if (this.currentSp < this.derivedStats.maxSp) {
          this.naturalSpRegenTimer += dt;
          if (this.naturalSpRegenTimer >= 8.0) {
            this.naturalSpRegenTimer -= 8.0;
            const intBonus = Math.floor(this.baseStats.int / 6);
            const maxSpBonus = Math.floor(this.derivedStats.maxSp / 120);
            const baseSpGain = Math.max(1, intBonus + maxSpBonus + this.gearSpRegen);
            const spPctMult = 1 + (this.crossJobBonuses.spRegenPct || 0) / 100;
            let finalSpGain = Math.max(1, Math.floor(baseSpGain * spPctMult));
            if (hasMagnificat) finalSpGain *= 2;
            this.restoreSp(finalSpGain);
          }
        } else {
          this.naturalSpRegenTimer = 0;
        }
      }
    }

    // Пассивный навык Мага «Медитация Маны» (mg_sp_recovery):
    // Восстанавливает +(3*Lv) SP каждые 3 секунды в поле
    const mgSpLvl = this.jobSystem && this.jobSystem.isSkillUsable('mg_sp_recovery')
      ? this.jobSystem.getSkillLevel('mg_sp_recovery')
      : 0;

    if (mgSpLvl > 0 && !this.isSafeZone) {
      if (this.currentSp < this.derivedStats.maxSp) {
        this.spMeditationTimer += dt;
        if (this.spMeditationTimer >= 3.0) {
          this.spMeditationTimer -= 3.0;
          const spGain = 3 * mgSpLvl;
          this.restoreSp(spGain);
          EventBus.emit('FLOATING_TEXT', {
            text: `+${spGain} SP`,
            x: this.x,
            y: this.y - 28,
            color: 0x38bdf8,
          });
        }
      } else {
        this.spMeditationTimer = 0;
      }
    } else {
      this.spMeditationTimer = 0;
    }

    // 1. Приоритет ручного перемещения кликом
    if (this.isMovingToTarget) {
      this.moveTowards(this.targetX, this.targetY, dt);
    }
    // 2. Атака выбранной цели
    else if (this.currentTargetMonster && !this.currentTargetMonster.isDead()) {
      const dx = this.currentTargetMonster.x - this.x;
      const dy = this.currentTargetMonster.y - this.y;
      const dist = Math.hypot(dx, dy);
      const attackRange = this.getAttackRange();

      // Для атаки требуется не только дистанция, но и прямая видимость (не атаковать сквозь сплошные препятствия)
      const hasLos = this.worldMapSystem
        ? this.worldMapSystem.hasLineOfSight(this.x, this.y, this.currentTargetMonster.x, this.currentTargetMonster.y, 10)
        : true;

      if (dist <= attackRange && hasLos) {
        this.puppet.isMoving = false;
        this.puppet.setFacing(dx);

        if (this.attackCooldown <= 0) {
          const safeAspd = Math.max(0.2, this.derivedStats.aspd || 1.0);
          this.attackCooldown = 1 / safeAspd;
          this.puppet.triggerAttack(safeAspd);
          onAttackMonster(this.currentTargetMonster);
        }
      } else {
        this.moveTowards(this.currentTargetMonster.x, this.currentTargetMonster.y, dt);
      }
    }
    // 3. Автономный режим костра (Camp FSM)
    else if (this.campActive) {
      this.updateCampFsm(dt, monsters, onAttackMonster, resourceNodes, onHarvestNode);
    } else {
      this.puppet.isMoving = false;
    }

    // Сторожевой таймер застревания (Unstuck Watchdog)
    if (this.puppet.isMoving) {
      this.stuckCheckTimer += dt;
      if (this.stuckCheckTimer >= 0.25) {
        const movedDist = Math.hypot(this.x - this.lastStuckX, this.y - this.lastStuckY);
        if (movedDist < 3) {
          this.stuckDuration += this.stuckCheckTimer;
        } else {
          this.stuckDuration = 0;
        }
        this.lastStuckX = this.x;
        this.lastStuckY = this.y;
        this.stuckCheckTimer = 0;

        if (this.stuckDuration > 0.8) {
          // Если персонаж уперся и не может сдвинуться 0.8с — форсируем пересчет пути обхода
          this.currentPath = [];
          this.pathRecalcTimer = 0;
        }
        if (this.stuckDuration > 2.0) {
          // Если персонаж застрял на 2 секунды — сбрасываем цель в автобое и освобождаем движение
          if (this.campActive) {
            this.clearTargetMonster();
            this.targetResourceNode = null;
            this.campState = 'FIND_TARGET';
          }
          this.currentPath = [];
          this.stuckDuration = 0;
        }
      }
    } else {
      this.stuckDuration = 0;
      this.stuckCheckTimer = 0;
      this.lastStuckX = this.x;
      this.lastStuckY = this.y;
    }

    // Синхронизация рендера
    this.puppet.root.position.set(this.x, this.y);
    this.puppet.updateAnimation(dt);
    this.updateClassVisuals(dt);
  }

  public addSpiritSpheres(count: number = 1): void {
    this.spiritSpheres = Math.min(this.maxSpiritSpheres, this.spiritSpheres + count);
    this.recalculateStats();
  }

  /**
   * Возвращает список всех доступных активных способностей (исключая пассивки),
   * отсортированных по приоритету: текущий продвинутый класс -> родительский класс -> Новичок.
   */
  public getUsableActiveSkills(): SkillDef[] {
    const activeJobId = this.jobSystem.activeJobId;
    const parentJobId = this.jobSystem.getActiveMeta().requiredParentJob;
    const usable: SkillDef[] = [];
    const all = Object.values(SKILLS_DATABASE);

    // 1. Активные навыки текущего класса
    for (const s of all) {
      if (s.jobId === activeJobId && s.type !== 'PASSIVE' && this.jobSystem.isSkillUsable(s.id)) {
        usable.push(s);
      }
    }

    // 2. Активные навыки родительского класса 1-го тира
    if (parentJobId) {
      for (const s of all) {
        if (s.jobId === parentJobId && s.type !== 'PASSIVE' && this.jobSystem.isSkillUsable(s.id)) {
          usable.push(s);
        }
      }
    }

    // 3. Активные навыки Новичка (первая помощь для выживания, затем атакующие)
    const noviceFirstAid = all.find(
      (s) => s.id === 'novice_first_aid' && this.jobSystem.isSkillUsable(s.id)
    );
    if (noviceFirstAid && !usable.some((u) => u.id === noviceFirstAid.id)) {
      usable.push(noviceFirstAid);
    }

    for (const s of all) {
      if (
        s.jobId === 'novice' &&
        s.type !== 'PASSIVE' &&
        s.id !== 'novice_first_aid' &&
        this.jobSystem.isSkillUsable(s.id)
      ) {
        if (!usable.some((u) => u.id === s.id)) {
          usable.push(s);
        }
      }
    }

    return usable;
  }

  /**
   * Возвращает ровно 6 слотов хотбара (1..6) со строго назначенными умениями или null для пустых слотов.
   * Исключает принудительное авто-подмешивание, сохраняя полный ручной контроль игрока.
   */
  public getEffectiveHotbarSkills(): (SkillDef | null)[] {
    const result: (SkillDef | null)[] = [];

    // Заполнение 6 слотов
    for (let i = 0; i < 6; i++) {
      const assignedId = this.hotbarSlots[i];
      if (
        assignedId &&
        SKILLS_DATABASE[assignedId] &&
        this.jobSystem.isSkillUsable(assignedId) &&
        SKILLS_DATABASE[assignedId].type !== 'PASSIVE'
      ) {
        result.push(SKILLS_DATABASE[assignedId]);
      } else {
        result.push(null);
      }
    }

    return result;
  }

  /**
   * Заполняет хотбар рекомендованным набором активных способностей текущего класса
   */
  public autoFillHotbarDefaults(targetJobId?: JobId): void {
    const usable = this.getUsableActiveSkills();
    this.hotbarSlots = [null, null, null, null, null, null];
    for (let i = 0; i < Math.min(6, usable.length); i++) {
      this.hotbarSlots[i] = usable[i].id;
    }
    const currentJob = targetJobId || this.jobSystem.activeJobId;
    this.jobHotbars[currentJob] = [...this.hotbarSlots];

    EventBus.emit('HOTBAR_UPDATED', {
      slots: [...this.hotbarSlots],
      autoSkillsEnabled: this.autoSkillsEnabled,
      activeJobId: currentJob,
    });
  }

  /**
   * Синхронизация раскладок хотбара при переключении класса
   */
  public syncJobHotbar(newJobId: JobId, oldJobId?: JobId): void {
    if (oldJobId) {
      this.jobHotbars[oldJobId] = [...this.hotbarSlots];
    }

    if (this.jobHotbars[newJobId]) {
      this.hotbarSlots = [...this.jobHotbars[newJobId]!];
    } else {
      // Первый переход за этот класс: генерируем рекомендованный набор умений
      this.autoFillHotbarDefaults(newJobId);
      return;
    }

    EventBus.emit('HOTBAR_UPDATED', {
      slots: [...this.hotbarSlots],
      autoSkillsEnabled: this.autoSkillsEnabled,
      activeJobId: newJobId,
    });
  }

  /**
   * Проверка и очистка невалидных навыков из хотбара (например, при строгом отключении мультикласса)
   */
  public validateHotbar(): void {
    let changed = false;
    for (let i = 0; i < this.hotbarSlots.length; i++) {
      const sId = this.hotbarSlots[i];
      if (sId && !this.jobSystem.isSkillUsable(sId)) {
        this.hotbarSlots[i] = null;
        changed = true;
      }
    }
    if (changed) {
      this.jobHotbars[this.jobSystem.activeJobId] = [...this.hotbarSlots];
      EventBus.emit('HOTBAR_UPDATED', {
        slots: [...this.hotbarSlots],
        autoSkillsEnabled: this.autoSkillsEnabled,
        activeJobId: this.jobSystem.activeJobId,
      });
    }
  }

  public assignSkillToHotbar(slotIndex: number, skillId: string | null): void {
    if (slotIndex < 0 || slotIndex >= 6) return;
    if (skillId && !this.jobSystem.isSkillUsable(skillId)) {
      EventBus.emit('COMBAT_LOG', {
        message: '❌ Этот навык недоступен для вашей профессии!',
        color: '#ef4444',
      });
      return;
    }
    this.hotbarSlots[slotIndex] = skillId;
    this.jobHotbars[this.jobSystem.activeJobId] = [...this.hotbarSlots];
    EventBus.emit('HOTBAR_UPDATED', {
      slots: [...this.hotbarSlots],
      autoSkillsEnabled: this.autoSkillsEnabled,
      activeJobId: this.jobSystem.activeJobId,
    });
  }

  public swapHotbarSlots(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= 6 || toIndex < 0 || toIndex >= 6) return;
    if (fromIndex === toIndex) return;
    const temp = this.hotbarSlots[fromIndex];
    this.hotbarSlots[fromIndex] = this.hotbarSlots[toIndex];
    this.hotbarSlots[toIndex] = temp;
    this.jobHotbars[this.jobSystem.activeJobId] = [...this.hotbarSlots];
    EventBus.emit('HOTBAR_UPDATED', {
      slots: [...this.hotbarSlots],
      autoSkillsEnabled: this.autoSkillsEnabled,
      activeJobId: this.jobSystem.activeJobId,
    });
  }

  public clearHotbarSlot(slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= 6) return;
    this.hotbarSlots[slotIndex] = null;
    this.jobHotbars[this.jobSystem.activeJobId] = [...this.hotbarSlots];
    EventBus.emit('HOTBAR_UPDATED', {
      slots: [...this.hotbarSlots],
      autoSkillsEnabled: this.autoSkillsEnabled,
      activeJobId: this.jobSystem.activeJobId,
    });
  }

  public resetHotbarSlots(): void {
    this.hotbarSlots = [null, null, null, null, null, null];
    this.jobHotbars[this.jobSystem.activeJobId] = [...this.hotbarSlots];
    EventBus.emit('HOTBAR_UPDATED', {
      slots: [...this.hotbarSlots],
      autoSkillsEnabled: this.autoSkillsEnabled,
      activeJobId: this.jobSystem.activeJobId,
    });
  }

  public toggleAutoSkills(): boolean {
    this.autoSkillsEnabled = !this.autoSkillsEnabled;
    SoundFX.playCampToggle();
    EventBus.emit('HOTBAR_UPDATED', {
      slots: [...this.hotbarSlots],
      autoSkillsEnabled: this.autoSkillsEnabled,
    });
    EventBus.emit('COMBAT_LOG', {
      message: this.autoSkillsEnabled
        ? '🔄 Режим [Авто-скиллы] ВКЛЮЧЁН (авто-поддержание баффов, АОЕ по толпе и ульт по боссам).'
        : '⏹️ Режим [Авто-скиллы] ВЫКЛЮЧЕН (только ручное использование способностей).',
      color: this.autoSkillsEnabled ? '#facc15' : '#94a3b8',
    });
    return this.autoSkillsEnabled;
  }

  /**
   * Умный планировщик авто-ротации умений в бою и режиме Походного костра.
   */
  public updateAutoSkillRotation(
    dt: number,
    monsters: Monster[],
    onCastSkill: (skillId: string, silent?: boolean) => boolean
  ): void {
    if (!this.autoSkillsEnabled) return;
    if (this.isSafeZone) return;

    this.autoSkillTimer += dt;
    if (this.autoSkillTimer < 0.35) return;
    this.autoSkillTimer = 0;

    const hpPct =
      this.derivedStats.maxHp > 0 ? (this.currentHp / this.derivedStats.maxHp) * 100 : 100;
    const spPct =
      this.derivedStats.maxSp > 0 ? (this.currentSp / this.derivedStats.maxSp) * 100 : 100;

    // 1. Приоритет спасения жизни (HP <= 40%)
    if (hpPct <= 40) {
      if (this.jobSystem.isSkillUsable('pr_sanctuary') && onCastSkill('pr_sanctuary', true)) return;
      if (this.jobSystem.isSkillUsable('ac_holy_light') && onCastSkill('ac_holy_light', true)) return;
      if (this.jobSystem.isSkillUsable('novice_first_aid') && onCastSkill('novice_first_aid', true))
        return;
    }

    // 2. Поддержание классовых стоек
    // Бард: Поэма Браги
    if (
      this.jobClass === 'Bard' &&
      this.jobSystem.isSkillUsable('ba_poem_of_bragi') &&
      !this.isPoemOfBragiActive
    ) {
      if (onCastSkill('ba_poem_of_bragi', true)) return;
    }

    // Мудрец: Hindsight (Авто-заклинание)
    if (
      this.jobClass === 'Sage' &&
      this.jobSystem.isSkillUsable('sg_hindsight') &&
      !this.isHindsightActive
    ) {
      if (onCastSkill('sg_hindsight', true)) return;
    }

    // Монах: поддержание Духовных Сфер (< 5 сфер)
    if (
      this.jobClass === 'Monk' &&
      this.jobSystem.isSkillUsable('mo_spirit_spheres') &&
      this.spiritSpheres < 5
    ) {
      if (onCastSkill('mo_spirit_spheres', true)) return;
    }

    // Крестоносец: Зеркальный Щит
    if (
      this.jobClass === 'Crusader' &&
      this.jobSystem.isSkillUsable('cr_reflect_shield') &&
      !this.isReflectShieldActive
    ) {
      if (onCastSkill('cr_reflect_shield', true)) return;
    }

    // 3. Поддержание 90-секундных защитных и боевых баффов (при SP > 35%)
    if (spPct > 35) {
      if (
        this.jobSystem.isSkillUsable('pr_kyrie_magnific') &&
        this.shieldBarrierHp <= 0 &&
        !this.activeBuffs.some((b) => b.id === 'buff_pr_kyrie')
      ) {
        if (onCastSkill('pr_kyrie_magnific', true)) return;
      }

      if (
        this.jobSystem.isSkillUsable('wz_energy_coat') &&
        !this.activeBuffs.some((b) => b.id === 'buff_wz_energy_coat')
      ) {
        if (onCastSkill('wz_energy_coat', true)) return;
      }

      if (
        this.jobSystem.isSkillUsable('hu_true_sight') &&
        !this.activeBuffs.some((b) => b.id === 'buff_hu_true_sight')
      ) {
        if (onCastSkill('hu_true_sight', true)) return;
      }

      if (
        this.jobSystem.isSkillUsable('ba_assassin_cross_sunset') &&
        !this.activeBuffs.some((b) => b.id === 'buff_ba_sunset')
      ) {
        if (onCastSkill('ba_assassin_cross_sunset', true)) return;
      }

      if (
        this.jobSystem.isSkillUsable('kn_two_hand_quicken') &&
        !this.activeBuffs.some((b) => b.id === 'buff_kn_two_hand_quicken')
      ) {
        if (onCastSkill('kn_two_hand_quicken', true)) return;
      }

      if (
        this.jobSystem.isSkillUsable('sg_elemental_endow') &&
        !this.activeBuffs.some((b) => b.id === 'buff_sg_endow')
      ) {
        if (onCastSkill('sg_elemental_endow', true)) return;
      }

      if (
        this.jobSystem.isSkillUsable('ac_blessing_agi') &&
        !this.activeBuffs.some((b) => b.id === 'buff_ac_blessing')
      ) {
        if (onCastSkill('ac_blessing_agi', true)) return;
      }

      if (
        this.jobSystem.isSkillUsable('sw_endure') &&
        !this.activeBuffs.some((b) => b.id === 'buff_sw_endure')
      ) {
        if (onCastSkill('sw_endure', true)) return;
      }

      if (
        this.jobSystem.isSkillUsable('novice_adventurer_grit') &&
        !this.activeBuffs.some((b) => b.id === 'buff_adventurer_grit')
      ) {
        if (onCastSkill('novice_adventurer_grit', true)) return;
      }
    }

    // Оценка скопления врагов вокруг героя в радиусе 160px
    let aliveNearMonsters = 0;
    for (const m of monsters) {
      if (!m.isDead() && Math.hypot(m.x - this.x, m.y - this.y) <= 160) {
        aliveNearMonsters++;
      }
    }

    // 4. Приоритет Соло-Бурста по сильным целям (Элита / MVP-боссы)
    if (
      this.currentTargetMonster &&
      !this.currentTargetMonster.isDead() &&
      (this.currentTargetMonster.def.isElite || this.currentTargetMonster.def.isMvp)
    ) {
      // Монах: Удар Азуры (при 3+ сферах)
      if (this.jobSystem.isSkillUsable('mo_asura_strike') && this.spiritSpheres >= 3) {
        if (onCastSkill('mo_asura_strike', true)) return;
      }

      // Охотник: Соколиный Штурм
      if (this.jobSystem.isSkillUsable('hu_falcon_assault')) {
        if (onCastSkill('hu_falcon_assault', true)) return;
      }

      // Рыцарь: Спиральный Пробой (+40% урона по элите/MVP)
      if (this.jobSystem.isSkillUsable('kn_spiral_pierce')) {
        if (onCastSkill('kn_spiral_pierce', true)) return;
      }

      // Крестоносец: Цепной Удар Щитом
      if (this.jobSystem.isSkillUsable('cr_shield_chain')) {
        if (onCastSkill('cr_shield_chain', true)) return;
      }

      // Бард: Вулкан Мелодий
      if (this.jobSystem.isSkillUsable('ba_arrow_vulcan')) {
        if (onCastSkill('ba_arrow_vulcan', true)) return;
      }

      // Мудрец: Копье Геи
      if (this.jobSystem.isSkillUsable('sg_earth_spike')) {
        if (onCastSkill('sg_earth_spike', true)) return;
      }

      // Волшебник: Метеоритный Дождь
      if (this.jobSystem.isSkillUsable('wz_meteor_storm')) {
        if (onCastSkill('wz_meteor_storm', true)) return;
      }
    }

    // 5. Приоритет АОЕ-прокаста (при наличии >= 2 врагов в радиусе 160px)
    if (aliveNearMonsters >= 2) {
      // Волшебник: Ледяной Буран -> Метеоритный Дождь -> Огненный Столб
      if (this.jobSystem.isSkillUsable('wz_storm_gust') && onCastSkill('wz_storm_gust', true))
        return;
      if (this.jobSystem.isSkillUsable('wz_meteor_storm') && onCastSkill('wz_meteor_storm', true))
        return;
      if (this.jobSystem.isSkillUsable('mg_fire_pillar') && onCastSkill('mg_fire_pillar', true))
        return;

      // Крестоносец: Великий Крест
      if (this.jobSystem.isSkillUsable('cr_grand_cross') && onCastSkill('cr_grand_cross', true))
        return;

      // Охотник / Лучник: Разрывная Мина -> Ливень Стрел
      if (this.jobSystem.isSkillUsable('hu_blast_mine') && onCastSkill('hu_blast_mine', true))
        return;
      if (this.jobSystem.isSkillUsable('ar_arrow_shower') && onCastSkill('ar_arrow_shower', true))
        return;

      // Прист: Святилище -> Великий Экзорцизм
      if (this.jobSystem.isSkillUsable('pr_sanctuary') && onCastSkill('pr_sanctuary', true))
        return;
      if (
        this.jobSystem.isSkillUsable('pr_magnus_exorcismus') &&
        onCastSkill('pr_magnus_exorcismus', true)
      )
        return;

      // Рыцарь / Мечник: Bowling Bash -> Magnum Break
      if (this.jobSystem.isSkillUsable('kn_bowling_bash') && onCastSkill('kn_bowling_bash', true))
        return;
      if (this.jobSystem.isSkillUsable('sw_magnum_break') && onCastSkill('sw_magnum_break', true))
        return;

      // Монах: Цепное Сокрушение
      if (this.jobSystem.isSkillUsable('mo_chain_crush') && onCastSkill('mo_chain_crush', true))
        return;

      // Мудрец: Копье Геи
      if (this.jobSystem.isSkillUsable('sg_earth_spike') && onCastSkill('sg_earth_spike', true))
        return;
    }

    // 6. Обычные атакующие способности по текущей цели (при SP > 20%)
    if (this.currentTargetMonster && !this.currentTargetMonster.isDead() && spPct > 20) {
      // Монах
      if (this.jobSystem.isSkillUsable('mo_chain_crush') && onCastSkill('mo_chain_crush', true))
        return;
      if (
        this.jobSystem.isSkillUsable('mo_asura_strike') &&
        this.spiritSpheres >= 4 &&
        onCastSkill('mo_asura_strike', true)
      )
        return;

      // Охотник / Лучник
      if (this.jobSystem.isSkillUsable('hu_falcon_assault') && onCastSkill('hu_falcon_assault', true))
        return;
      if (this.jobSystem.isSkillUsable('ar_double_strafe') && onCastSkill('ar_double_strafe', true))
        return;

      // Рыцарь / Мечник
      if (this.jobSystem.isSkillUsable('kn_spiral_pierce') && onCastSkill('kn_spiral_pierce', true))
        return;
      if (this.jobSystem.isSkillUsable('sw_magnum_break') && onCastSkill('sw_magnum_break', true))
        return;

      // Крестоносец
      if (this.jobSystem.isSkillUsable('cr_shield_chain') && onCastSkill('cr_shield_chain', true))
        return;

      // Бард
      if (this.jobSystem.isSkillUsable('ba_arrow_vulcan') && onCastSkill('ba_arrow_vulcan', true))
        return;

      // Волшебник / Маг
      if (this.jobSystem.isSkillUsable('mg_lightning_bolt') && onCastSkill('mg_lightning_bolt', true))
        return;
      if (this.jobSystem.isSkillUsable('mg_fire_pillar') && onCastSkill('mg_fire_pillar', true))
        return;

      // Мудрец
      if (this.jobSystem.isSkillUsable('sg_earth_spike') && onCastSkill('sg_earth_spike', true))
        return;

      // Прист / Аколит
      if (this.jobSystem.isSkillUsable('ac_holy_light') && onCastSkill('ac_holy_light', true))
        return;

      // Новичок
      if (this.jobSystem.isSkillUsable('novice_bash') && onCastSkill('novice_bash', true)) return;
      if (this.jobSystem.isSkillUsable('novice_power_shot') && onCastSkill('novice_power_shot', true))
        return;
      if (this.jobSystem.isSkillUsable('novice_arcane_bolt') && onCastSkill('novice_arcane_bolt', true))
        return;
    }
  }

  private updateClassVisuals(dt: number): void {
    this.classVisualsTimer += dt * 3.5;
    this.classVisualsGfx.clear();

    // 1. Охотник: парящий Боевой Сокол
    const hasFalconMastery = this.jobSystem ? this.jobSystem.getSkillLevel('hu_falcon_mastery') > 0 : false;
    if (this.jobClass === 'Hunter' && hasFalconMastery) {
      if (!this.falcon) {
        this.falcon = new FalconCompanion(this.x, this.y - 32);
      }
      this.falcon.update(dt, this.x, this.y, this.puppet.facingDir);
    } else if (this.falcon) {
      this.falcon.destroy();
      this.falcon = null;
    }

    // 2. Монах: золотые светящиеся Духовные Сферы по орбите вокруг героя
    if (this.spiritSpheres > 0) {
      const radius = 26;
      for (let i = 0; i < this.spiritSpheres; i++) {
        const angle = this.classVisualsTimer + (i * Math.PI * 2) / this.spiritSpheres;
        const sx = Math.cos(angle) * radius;
        const sy = -14 + Math.sin(angle) * 10;

        // Внешнее свечение сферы
        this.classVisualsGfx.beginFill(0xf59e0b, 0.45);
        this.classVisualsGfx.drawCircle(sx, sy, 5.5);
        this.classVisualsGfx.endFill();

        // Яркая золотая сердцевина
        this.classVisualsGfx.beginFill(0xfef08a, 0.95);
        this.classVisualsGfx.drawCircle(sx, sy, 3.5);
        this.classVisualsGfx.endFill();
      }
    }

    // 3. Бард: музыкальное кольцо-аура с нотами (Поэма Браги)
    if (this.isPoemOfBragiActive) {
      const auraR = 55;
      this.classVisualsGfx.lineStyle(1.5, 0xf59e0b, 0.5 + Math.sin(this.classVisualsTimer) * 0.2);
      this.classVisualsGfx.drawCircle(0, 0, auraR);

      // 4 парящие золотые ноты
      for (let i = 0; i < 4; i++) {
        const noteAngle = -this.classVisualsTimer * 0.7 + (i * Math.PI * 2) / 4;
        const nx = Math.cos(noteAngle) * auraR;
        const ny = Math.sin(noteAngle) * auraR;

        this.classVisualsGfx.beginFill(0xfef08a, 0.85);
        this.classVisualsGfx.drawCircle(nx, ny, 2.5);
        this.classVisualsGfx.endFill();
      }
    }

    // 4. Крестоносец: Зеркальный Щит (шипастый барьер вокруг героя)
    if (this.isReflectShieldActive) {
      const pulse = 1 + Math.sin(this.classVisualsTimer * 1.5) * 0.08;
      this.classVisualsGfx.lineStyle(2, 0xfacc15, 0.7);
      this.classVisualsGfx.drawCircle(0, -12, 22 * pulse);

      for (let i = 0; i < 6; i++) {
        const spikeAngle = this.classVisualsTimer * 0.5 + (i * Math.PI * 2) / 6;
        const sx1 = Math.cos(spikeAngle) * 20;
        const sy1 = -12 + Math.sin(spikeAngle) * 20;
        const sx2 = Math.cos(spikeAngle) * 26 * pulse;
        const sy2 = -12 + Math.sin(spikeAngle) * 26 * pulse;

        this.classVisualsGfx.lineStyle(1.5, 0xfef08a, 0.85);
        this.classVisualsGfx.moveTo(sx1, sy1);
        this.classVisualsGfx.lineTo(sx2, sy2);
      }
    }
  }

  private updateCampFsm(
    dt: number,
    monsters: Monster[],
    _onAttackMonster: (m: Monster) => void,
    resourceNodes?: ResourceNode[],
    onHarvestNode?: (node: ResourceNode) => void
  ): void {
    switch (this.campState) {
      case 'FIND_TARGET':
      case 'RETURN_TO_CAMP':
      case 'IDLE': {
        // Приоритет 1: Агрессивные монстры поблизости, атакующие героя
        let aggressiveMonster: Monster | null = null;
        let aggroDist = 450;
        for (const m of monsters) {
          if (m.isDead() || m.isDestroyed) continue;
          if (m.def.isAggressive) {
            const dFromPlayer = Math.hypot(m.x - this.x, m.y - this.y);
            const hasLos = this.worldMapSystem ? this.worldMapSystem.hasLineOfSight(this.x, this.y, m.x, m.y, 14) : true;
            const score = dFromPlayer + (hasLos ? 0 : 250);
            if (score < aggroDist) {
              aggroDist = score;
              aggressiveMonster = m;
            }
          }
        }

        if (aggressiveMonster) {
          this.patrolTargetX = null;
          this.patrolTargetY = null;
          this.targetMonster(aggressiveMonster);
          this.targetResourceNode = null;
          this.campState = 'CHASE_AND_ATTACK';
          const attackRange = this.getAttackRange();
          const d = Math.hypot(aggressiveMonster.x - this.x, aggressiveMonster.y - this.y);
          if (d > attackRange) {
            this.moveTowards(aggressiveMonster.x, aggressiveMonster.y, dt);
          } else {
            this.puppet.isMoving = false;
            this.puppet.setFacing(aggressiveMonster.x - this.x);
          }
          break;
        }

        // Приоритет 2: Созревшие рудные жилы и кусты трав в пределах 240px
        let bestNode: ResourceNode | null = null;
        let bestNodeDist = 240;
        if (resourceNodes && onHarvestNode) {
          for (const node of resourceNodes) {
            if (node.isDepleted) continue;
            const dFromPlayer = Math.hypot(node.x - this.x, node.y - this.y);
            const hasLos = this.worldMapSystem ? this.worldMapSystem.hasLineOfSight(this.x, this.y, node.x, node.y, 14) : true;
            const score = dFromPlayer + (hasLos ? 0 : 200);
            if (score < bestNodeDist) {
              bestNodeDist = score;
              bestNode = node;
            }
          }
        }

        if (bestNode) {
          this.patrolTargetX = null;
          this.patrolTargetY = null;
          this.targetResourceNode = bestNode;
          this.clearTargetMonster();
          this.campState = 'HARVEST_RESOURCE';
          this.moveTowards(bestNode.x, bestNode.y, dt);
          break;
        }

        // Приоритет 3: Ближайший живой моб на поляне (с приоритетом прямой видимости)
        let bestMonster: Monster | null = null;
        let bestDist = Infinity;

        for (const m of monsters) {
          if (m.isDead() || m.isDestroyed) continue;
          const dFromPlayer = Math.hypot(m.x - this.x, m.y - this.y);
          const hasLos = this.worldMapSystem ? this.worldMapSystem.hasLineOfSight(this.x, this.y, m.x, m.y, 14) : true;
          const score = dFromPlayer + (hasLos ? 0 : 250);
          if (score < bestDist) {
            bestDist = score;
            bestMonster = m;
          }
        }

        if (bestMonster) {
          this.patrolTargetX = null;
          this.patrolTargetY = null;
          this.targetMonster(bestMonster);
          this.targetResourceNode = null;
          this.campState = 'CHASE_AND_ATTACK';
          const attackRange = this.getAttackRange();
          const d = Math.hypot(bestMonster.x - this.x, bestMonster.y - this.y);
          if (d > attackRange) {
            this.moveTowards(bestMonster.x, bestMonster.y, dt);
          } else {
            this.puppet.isMoving = false;
            this.puppet.setFacing(bestMonster.x - this.x);
          }
        } else {
          // Если мобов на поляне в данный миг нет (ждут спавна), плавно патрулируем поляну
          this.campState = 'IDLE';
          this.clearTargetMonster();
          this.targetResourceNode = null;

          this.patrolTimer -= dt;
          if (this.patrolTimer <= 0 || (this.patrolTargetX === null && this.patrolTargetY === null)) {
            this.patrolTimer = 2.5 + Math.random() * 2.0;
            const angle = Math.random() * Math.PI * 2;
            const dist = 60 + Math.random() * 110;
            let destX = this.x + Math.cos(angle) * dist;
            let destY = this.y + Math.sin(angle) * dist;
            if (this.worldMapSystem) {
              const resolved = this.worldMapSystem.resolveMovement(this.x, this.y, destX, destY, 14);
              destX = resolved.x;
              destY = resolved.y;
            }
            this.patrolTargetX = destX;
            this.patrolTargetY = destY;
          }

          if (this.patrolTargetX !== null && this.patrolTargetY !== null) {
            const dist = Math.hypot(this.patrolTargetX - this.x, this.patrolTargetY - this.y);
            if (dist <= 10) {
              this.patrolTargetX = null;
              this.patrolTargetY = null;
              this.puppet.isMoving = false;
            } else {
              this.moveTowards(this.patrolTargetX, this.patrolTargetY, dt);
            }
          } else {
            this.puppet.isMoving = false;
          }
        }
        break;
      }

      case 'HARVEST_RESOURCE': {
        if (!this.targetResourceNode || this.targetResourceNode.isDepleted) {
          this.targetResourceNode = null;
          this.campState = 'FIND_TARGET';
          break;
        }

        const d = Math.hypot(this.x - this.targetResourceNode.x, this.y - this.targetResourceNode.y);
        if (d <= 50) {
          this.puppet.isMoving = false;
          if (onHarvestNode) {
            onHarvestNode(this.targetResourceNode);
          }
        } else {
          this.moveTowards(this.targetResourceNode.x, this.targetResourceNode.y, dt);
        }
        break;
      }

      case 'CHASE_AND_ATTACK': {
        if (!this.currentTargetMonster || this.currentTargetMonster.isDead()) {
          this.clearTargetMonster();
          this.campState = 'FIND_TARGET';
        }
        break;
      }
    }
  }
}
