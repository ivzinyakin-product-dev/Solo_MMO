export type StatKey = 'str' | 'agi' | 'vit' | 'int' | 'dex' | 'luk';

export type BaseStats = Record<StatKey, number>;

export interface DerivedStats {
  maxHp: number;
  maxSp: number;
  atk: number;         // Физическая атака
  matk: number;        // Магическая атака
  def: number;         // Процентное снижение урона от брони
  softDef: number;     // Плоское снижение урона от VIT
  aspd: number;        // Атак в секунду (от 1.0 до 5.0)
  hit: number;         // Точность
  flee: number;        // Уворот
  critChance: number;  // Шанс крита в % (0..100)
  moveSpeed: number;   // Скорость бега в пикселях/сек
  blockChance?: number;// Шанс блока щитом в %
}

export interface ActivePassiveInfo {
  id: string;
  name: string;
  icon: string;
  level: number;
  description: string;
  bonuses: Array<{ label: string; value: string }>;
}

export interface StatBreakdown {
  level: number;
  jobClass: JobClass;
  statPoints: number;
  baseStats: {
    invested: BaseStats;
    fromGear: BaseStats;
    fromCards: BaseStats;
    fromAlbum: BaseStats;
    fromBuffs: BaseStats;
    fromPassives: BaseStats;
    total: BaseStats;
  };
  combat: {
    atk: {
      fromStats: number;
      weaponBase: number;
      refine: number;
      enchant: number;
      passiveMult: number;
      buffsMult: number;
      passivePct?: number;
      crossJobPct?: number;
      total: number;
    };
    matk: {
      fromStats: number;
      weaponBase: number;
      refine: number;
      enchant: number;
      passiveMult: number;
      meditationBonusPct?: number;
      mysticalAmplifyPct?: number;
      maceFaithPct?: number;
      freeCastBonusMatk?: number;
      crossJobPct?: number;
      buffsFlat: number;
      total: number;
    };
    def: {
      armorBase: number;
      refine: number;
      crossJobHardDef?: number;
      softDef: number;
      totalPercent: number;
      totalSoft: number;
    };
    maxHp: {
      baseLevel: number;
      vitBonus: number;
      gearCards: number;
      passiveMult: number;
      cavalryBonusPct?: number;
      autoGuardBonusPct?: number;
      crossJobPct?: number;
      buffsFlat: number;
      buffsMult: number;
      total: number;
    };
    maxSp: {
      baseLevel: number;
      intBonus: number;
      meditationRegenRate?: number;
      musicLessonsRegenRate?: number;
      crossJobPct?: number;
      total: number;
    };
    aspd: {
      baseAgiDex: number;
      enchantBonus: number;
      buffsMult: number;
      cavalryBonusPct?: number;
      musicLessonsBonusPct?: number;
      freeCastBonusPct?: number;
      crossJobPct?: number;
      total: number;
    };
    critChance: {
      fromLuk: number;
      cardsEnchant: number;
      crossJobBonus?: number;
      total: number;
    };
    hit: {
      baseLevel: number;
      dexBonus: number;
      lukBonus: number;
      swordMasteryBonus?: number;
      crossJobBonus?: number;
      total: number;
    };
    flee: {
      baseLevel: number;
      agiBonus: number;
      lukBonus: number;
      passiveBonus: number;
      crossJobBonus?: number;
      total: number;
    };
    moveSpeed: {
      base: number;
      agiBonus: number;
      cavalryBonusSpeed?: number;
      crossJobPct?: number;
      buffsMult: number;
      total: number;
    };
    blockChance?: {
      shieldBase: number;
      autoGuardBonus: number;
      crossJobBonus: number;
      total: number;
    };
  };
  classPassive: {
    name: string;
    description: string;
    icon: string;
  };
  activePassives: ActivePassiveInfo[];
  activeBuffs: ActiveBuff[];
  albumBonuses: Array<{ cardId: string; cardName: string; stat: StatKey; value: number }>;
}

export type EquipSlot =
  | 'weapon'
  | 'offhand'
  | 'head'
  | 'armor'
  | 'garment'
  | 'footgear'
  | 'accessory1'
  | 'accessory2';

export type CardTargetSlot = EquipSlot | 'accessory';

export type ItemTier = 1 | 2 | 3 | 4 | 5;

export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export type OffhandType = 'shield' | 'quiver' | 'grimoire';

export type AffixType =
  | 'AFFIX_STR'
  | 'AFFIX_AGI'
  | 'AFFIX_VIT'
  | 'AFFIX_INT'
  | 'AFFIX_DEX'
  | 'AFFIX_LUK'
  | 'AFFIX_ATK_PCT'
  | 'AFFIX_MATK_PCT'
  | 'AFFIX_ASPD_PCT'
  | 'AFFIX_CRIT'
  | 'AFFIX_MAX_HP'
  | 'AFFIX_FLEE'
  | 'AFFIX_LIFESTEAL';

export interface ItemAffixRoll {
  type: AffixType;
  label: string;
  value: number;
  isPercent?: boolean;
}

export type EquipmentSetId = 'SET_WARLORD' | 'SET_WINDWALKER' | 'SET_ARCHMAGE' | 'SET_SERAPHIM';

export type LegendaryModifierId =
  | 'LEG_SWORD_SOLAR'
  | 'LEG_BOW_STORM'
  | 'LEG_STAFF_ASTRAL'
  | 'LEG_MACE_JUDGMENT';

export type WeaponArchetype = 'MELEE_SWORD' | 'RANGED_BOW' | 'MAGIC_STAFF' | 'HOLY_MACE';

export type CardTriggerType =
  | 'STAT_FLAT'        // Пассивная прибавка к статам
  | 'STAT_PERCENT'     // Процентная прибавка к характеристикам
  | 'ON_HIT_SPELL'     // Шанс авто-каста заклинания при ударе
  | 'ON_KILL_RESTORE'  // Восстановление HP/SP при убийстве моба
  | 'REFLECT_DAMAGE'   // Отражение входящего урона обратно во врага
  | 'IGNORE_DEF'       // Игнорирование TotalDEF цели
  | 'DAMAGE_REDUCTION' // Снижение входящего физического урона
  | 'AURA_DAMAGE'      // Постоянная аура урона вокруг героя (Ифрит)
  | 'SPECIAL_EFFECT';  // Особые боевые триггеры (стан, вампиризм, ускорение)

export interface CardEffect {
  type: CardTriggerType;
  chance?: number;     // Шанс срабатывания (0.15 = 15%)
  skillId?:
    | 'LIGHTNING_BOLT'
    | 'FIRE_PILLAR'
    | 'FROST_NOVA'
    | 'STORM_GUST'
    | 'METEOR_STORM'
    | 'EARTH_SPIKE';
  statKey?: string;
  value: number;
  bonusStats?: Partial<Record<StatKey, number>>;
  secondStatKey?: string;
  secondValue?: number;
  description?: string;
}

export interface CardAlbumBonus {
  stat: StatKey | 'allStats';
  value: number;
  secondaryStat?: StatKey | 'maxHp' | 'maxSp' | 'atk' | 'matk' | 'def' | 'flee' | 'crit' | 'hit';
  secondaryValue?: number;
}

export interface CardDef {
  id: string;
  name: string;
  monsterId: string;
  targetSlot: CardTargetSlot;
  description: string;
  effect: CardEffect;
  albumBonus: CardAlbumBonus; // Бонус за вклейку в Альбом Бестиария
}

export interface ItemDef {
  id: string;
  name: string;
  type: 'equip' | 'consumable' | 'material' | 'card';
  slot?: EquipSlot;
  tier?: ItemTier;
  archetype?: WeaponArchetype;
  offhandType?: OffhandType;
  icon: string;
  visualColor: number; // Hex-цвет для PIXI.Graphics (например, 0x38bdf8)
  price: number;
  requiredLevel?: number;
  baseAtk?: number;
  baseMatk?: number;
  baseDef?: number;
  bonusMaxHp?: number;
  bonusMaxSp?: number;
  bonusFlee?: number;
  bonusMoveSpeed?: number;
  bonusAtk?: number;
  bonusMatk?: number;
  bonusCrit?: number;
  spRegen?: number;
  blockChance?: number;
  primaryStatBonus?: { stat: StatKey; value: number };
  maxSlots?: number;   // Количество слотов под карты [0..4]
  healAmount?: number;
  spAmount?: number;
}

export interface ItemEnchantment {
  stat: 'str' | 'agi' | 'vit' | 'int' | 'dex' | 'luk' | 'atk' | 'matk' | 'aspd' | 'crit';
  value: number;
}

export type CraftGrade = 'STANDARD' | 'SLOTTED' | 'RELIC';

export interface InventoryItem {
  uid: string;         // Уникальный ID экземпляра предмета
  itemId: string;
  count: number;
  tier?: ItemTier;
  craftGrade?: CraftGrade; // Ступень ковки RO: STANDARD [1], SLOTTED [2], RELIC [4]
  rarity?: ItemRarity;
  refineLevel: number; // Заточка от 0 до +10
  maxSlots?: number;   // Сгенерированное число слотов под карты
  insertedCards: string[]; // Массив ID вставленных карт
  bonusSlots?: number;         // Дополнительные сокеты от ковки мастера-кузнеца
  enchantment?: ItemEnchantment; // Бонусное зачарование кузнеца
  affixes?: ItemAffixRoll[];   // 0..3 случайных аффикса
  setId?: EquipmentSetId;      // Сет для EPIC и LEGENDARY
  legendaryMod?: LegendaryModifierId; // Модификатор для LEGENDARY оружия
  isLocked?: boolean;          // Защита от случайной продажи/разборки
}

export type MonsterRank = 'NORMAL' | 'ELITE' | 'MVP';

export type EliteAffix = 'BERSERK' | 'ARMORED' | 'PACK_LEADER' | 'VAMPIRIC';

export interface BossTelegraph {
  id: string;
  x: number;
  y: number;
  radius: number;
  timer: number;
  maxDuration: number;
  damage: number;
  bossId: string;
  bossName: string;
  isMagic?: boolean;
}

export interface MonsterDrop {
  itemId: string;
  chance: number;
}

export interface MonsterDef {
  id: string;
  name: string;
  level: number;
  rank?: MonsterRank;
  tier?: ItemTier; // Тир зоны 1..5
  isMvp?: boolean;
  isElite?: boolean;
  eliteAffix?: EliteAffix;
  minionMonsterId?: string;
  minionCount?: number;
  telegraphCooldown?: number;
  telegraphRadius?: number;
  telegraphDamageFactor?: number;
  isAggressive: boolean;
  hp: number;
  atk: number;
  def: number;
  flee: number;
  hit: number;
  moveSpeed: number;
  attackRange: number;
  baseExp: number;
  jobExp: number;
  sprite: string;
  radius: number;
  colorHex: number;    // Цвет слайма/моба для PIXI.Graphics
  drops: MonsterDrop[];
  cardId: string;
  cardDropChance: number;
}

export type CampState = 'INACTIVE' | 'IDLE' | 'FIND_TARGET' | 'CHASE_AND_ATTACK' | 'RETURN_TO_CAMP' | 'HARVEST_RESOURCE';

export type JobId =
  | 'novice'
  | 'swordsman' | 'archer' | 'mage' | 'acolyte'
  | 'knight' | 'crusader'
  | 'hunter' | 'bard'
  | 'wizard' | 'sage'
  | 'priest' | 'monk';

export type JobClass =
  | 'Novice'
  | 'Swordsman' | 'Archer' | 'Mage' | 'Acolyte'
  | 'Knight' | 'Crusader'
  | 'Hunter' | 'Bard'
  | 'Wizard' | 'Sage'
  | 'Priest' | 'Monk';

export interface CrossJobMasteryBonus {
  str: number;
  agi: number;
  vit: number;
  int: number;
  dex: number;
  luk: number;
  atkPct: number;
  matkPct: number;
  aspdPct: number;
  maxHpPct: number;
  maxSpPct: number;
  hardDef: number;
  flee: number;
  hit: number;
  critChance: number;
  moveSpeedPct: number;
  blockChance: number;
  bossDmgReductionPct: number;
  bossDmgIncreasePct: number;
  beastDmgIncreasePct: number;
  cdReductionPct: number;
  spRegenPct: number;
  autocastBonusPct: number;
  healPowerPct: number;
  bonusExpPct: number;
  critDmgPct: number;
  elementalSkillDmgPct: number;
}

export interface JobProgress {
  jobId: JobId;
  jobLevel: number;                  // 1..10 для Novice, 1..50 для 1st/2nd Class
  jobExp: number;
  jobExpToNext: number;
  skillPoints: number;
  unlockedSkillBooks: string[];      // Купленные у Наставника книги навыков
  learnedSkills: Record<string, number>; // skillId -> текущий уровень (1..5)
}

export interface PortalDef {
  id: string;
  targetZoneId: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  label: string;
  minLevel?: number;
}

export type MapObstacleType =
  | 'ROCK'
  | 'TREE_CLUSTER'
  | 'WATER_RIVER'
  | 'RUIN_WALL'
  | 'VILLAGE_HOUSE'
  | 'VILLAGE_FOUNTAIN'
  | 'CANYON_ROCK'
  | 'ORC_BARRICADE'
  | 'GRAVE_TOMB'
  | 'CLOCK_GEAR'
  | 'LAVA_CRATER'
  | 'CITADEL_TOWER';

export interface MapObstacle {
  id: string;
  type: MapObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  colliderType: 'RECT' | 'CIRCLE';
  radius?: number;
}

export interface PointOfInterestDef {
  id: string;
  type: 'GODDESS_STATUE' | 'FIELD_CHEST' | 'SIGNPOST';
  name: string;
  x: number;
  y: number;
  rewardSkillPoints?: number;
  rewardStatPoints?: number;
  buffDurationSec?: number;
}

export type FieldNpcRole =
  | 'VILLAGE_SHOP'
  | 'VILLAGE_BLACKSMITH'
  | 'VILLAGE_ALCHEMIST'
  | 'JOB_MENTOR'
  | 'BOUNTY_BOARD'
  | 'FIELD_QUEST_GIVER'
  | 'COMPANION_RECRUITER'
  | 'HIGH_JOB_MENTOR'
  | 'MASTER_BLACKSMITH'
  | 'ELITE_BOUNTY_BOARD'
  | 'BESTIARY_SCHOLAR';

export interface FieldNpcDef {
  id: string;
  name: string;
  role: FieldNpcRole;
  x: number;
  y: number;
  dialogGreeting: string;
  questIds?: string[];
  icon: string;
}

export interface SimpleQuestDef {
  id: string;
  title: string;
  description: string;
  zoneId: string;
  objectiveType: 'KILL_MONSTER' | 'COLLECT_ITEM';
  targetId: string;
  requiredCount: number;
  rewardGold: number;
  rewardBaseExp: number;
  rewardJobExp: number;
  rewardItemId?: string;
  isEliteBounty?: boolean;
  rewardItems?: Array<{ itemId: string; count: number }>;
}

export type ResourceNodeType =
  | 'COPPER_VEIN'
  | 'IRON_VEIN'
  | 'MITHRIL_VEIN'
  | 'ORIDECON_VEIN'
  | 'DRAGONITE_VEIN'
  | 'RED_HERB_BUSH'
  | 'BLUE_HERB_BUSH'
  | 'AMBER_HERB_BUSH'
  | 'WHITE_HERB_BUSH'
  | 'STAR_FLOWER_BUSH';

export interface ResourceNodeDef {
  id: string;
  type: ResourceNodeType;
  name: string;
  x: number;
  y: number;
  yieldItemId: string;
  minYield: number;
  maxYield: number;
  respawnTimeSec: number;
}

export interface ZoneDef {
  id: string;
  name: string;
  bgColor: number;
  minLevel: number;
  maxLevel?: number;
  tier?: ItemTier;
  spawnPool: Array<{ monsterId: string; weight: number }>;
  normalMaxCount?: number;
  eliteMonsterId?: string;
  eliteMaxCount?: number;
  eliteRespawnTime?: number; // в секундах
  mvpBossId?: string;
  mvpRespawnTime?: number; // в секундах
  portals: PortalDef[];
  width: number;
  height: number;
  isSafeZone?: boolean;
  obstacles?: MapObstacle[];
  pois?: PointOfInterestDef[];
  npcs?: FieldNpcDef[];
  resources?: ResourceNodeDef[];
}

export interface SkillDef {
  id: string;
  name: string;
  jobId: JobId;                      // 'novice' навыки доступны на любом классе!
  job?: JobClass;                    // Для обратной совместимости
  icon: string;
  isPassive?: boolean;
  requiredWeapon?: WeaponArchetype;  // Опциональное требование к типу оружия
  bookPrice: number;                 // Цена покупки книги у Наставника (0 для стартовых)
  maxLevel: number;                  // Обычно 5
  spCostBase: number;
  cooldownSec: number;
  range: number;
  description: string;
  type: 'ACTIVE_AOE' | 'ACTIVE_TARGET' | 'PASSIVE' | 'BUFF';
  // Множитель эффекта за уровень: totalFactor = baseFactor + level * perLevelFactor
  baseFactor: number;
  perLevelFactor: number;
  aoeRadius?: number;
  knockbackDist?: number;
  // Поля для обратной совместимости
  spCost?: number;
  cooldown?: number;
  damageMultiplier?: number;
}

export interface FloatingTextDef {
  text: string;
  x: number;
  y: number;
  color: number;
  isCrit?: boolean;
  isMiss?: boolean;
}

export type PriceMarkup = 'DISCOUNT' | 'NORMAL' | 'EXPENSIVE';

export interface MarketStallSlot {
  index: number;
  item: InventoryItem | null;
  markup: PriceMarkup;
  listedPrice: number;
}

export interface BountyContractRequirement {
  itemId: string;
  count: number;
}

export interface BountyContract {
  id: string;
  title: string;
  clientName: string;
  clientIcon: string;
  description: string;
  requirements: BountyContractRequirement[];
  rewardGold: number;
  rewardJobExp: number;
}

export interface ActiveBuff {
  id: string;
  name: string;
  icon: string;
  statKey: keyof DerivedStats | StatKey | 'allStats';
  value: number;
  duration: number; // секунд осталось
  maxDuration: number;
}

export interface AlchemyRecipe {
  id: string;
  name: string;
  icon: string;
  description: string;
  ingredients: Array<{ itemId: string; count: number }>;
  buffEffect?: {
    id: string;
    name: string;
    icon: string;
    statKey: keyof DerivedStats | StatKey;
    value: number;
    duration: number;
  };
  resultItemId?: string;
  resultCount?: number;
}

export interface PlayerSaveData {
  version: number;
  level: number;
  jobLevel: number;
  jobClass: JobClass;
  baseExp: number;
  jobExp: number;
  statPoints: number;
  skillPoints: number;
  zeny: number;
  stats: BaseStats;
  autoPotionPercent: number;
  equipped: Partial<Record<EquipSlot, InventoryItem | null>>;
  inventory: InventoryItem[];
  unlockedCards: string[];
  bestiaryKills: Record<string, number>;
  currentZoneId?: string;
  campLevel?: number;
  stallSlots?: MarketStallSlot[];
  hasCompanion?: boolean;
  activeBuffs?: ActiveBuff[];
  jobs?: Partial<Record<JobId, JobProgress>>;
  activeJobId?: JobId;
  chosenFirstJobId?: JobId;
  chosenSecondJobId?: JobId;
  questsProgress?: Record<string, { currentCount: number; isClaimed: boolean }>;
  interactedPois?: string[];
  tradeVolume?: number;
  bountyContracts?: BountyContract[];
  blacksmithLevel?: number;
  blacksmithExp?: number;
  autoSkillsEnabled?: boolean;
  hotbarSlots?: (string | null)[];
  jobHotbars?: Partial<Record<JobId, (string | null)[]>>;
}
