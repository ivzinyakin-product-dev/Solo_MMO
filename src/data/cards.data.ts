import { CardDef } from '../types/game.types';

export const CARDS_DATABASE: Record<string, CardDef> = {
  // ==========================================
  // ЗОНА 1: Изумрудная Поляна (Tier 1, Ур. 1–6)
  // ==========================================
  poring_card: {
    id: 'poring_card',
    name: 'Карта Поринга',
    monsterId: 'poring',
    targetSlot: 'armor',
    description: '+40 MaxHP, +2 LUK, +5 FLEE.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'maxHp',
      value: 40,
      bonusStats: { luk: 2 },
      secondStatKey: 'flee',
      secondValue: 5,
    },
    albumBonus: { stat: 'luk', value: 1, secondaryStat: 'maxHp', secondaryValue: 10 },
  },

  fabre_card: {
    id: 'fabre_card',
    name: 'Карта Фабре',
    monsterId: 'fabre',
    targetSlot: 'weapon',
    description: '+6 ATK, +2 VIT, +25 MaxHP.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'atk',
      value: 6,
      bonusStats: { vit: 2 },
      secondStatKey: 'maxHp',
      secondValue: 25,
    },
    albumBonus: { stat: 'vit', value: 1, secondaryStat: 'atk', secondaryValue: 2 },
  },

  lunatic_card: {
    id: 'lunatic_card',
    name: 'Карта Лунатика',
    monsterId: 'lunatic',
    targetSlot: 'accessory',
    description: '+3 LUK, +3% CRIT.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'luk',
      value: 3,
      secondStatKey: 'critChance',
      secondValue: 3,
    },
    albumBonus: { stat: 'luk', value: 1, secondaryStat: 'crit', secondaryValue: 1 },
  },

  golden_bug_card: {
    id: 'golden_bug_card',
    name: 'Карта Золотого Жука',
    monsterId: 'golden_bug',
    targetSlot: 'offhand',
    description: '+10 TotalDEF, +15% золота с мобов.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'def',
      value: 10,
      secondStatKey: 'goldBonusPct',
      secondValue: 15,
    },
    albumBonus: { stat: 'vit', value: 2, secondaryStat: 'def', secondaryValue: 3 },
  },

  poring_king_card: {
    id: 'poring_king_card',
    name: 'Карта Короля Порингов',
    monsterId: 'poring_king',
    targetSlot: 'armor',
    description: '+120 MaxHP, +4 ко всем характеристикам, 10% шанс выбить Зелье при ударе.',
    effect: {
      type: 'SPECIAL_EFFECT',
      statKey: 'allStats',
      value: 4,
      secondStatKey: 'maxHp',
      secondValue: 120,
      chance: 0.1,
    },
    albumBonus: { stat: 'luk', value: 2, secondaryStat: 'maxHp', secondaryValue: 35 },
  },

  // ==========================================
  // ЗОНА 2: Шепчущий Грибной Лес (Tier 1, Ур. 7–12)
  // ==========================================
  poison_spore_card: {
    id: 'poison_spore_card',
    name: 'Карта Ядовитого Спорогриба',
    monsterId: 'poison_spore',
    targetSlot: 'head',
    description: '+3 INT, +30 MaxSP, +2 SP/сек.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'int',
      value: 3,
      bonusStats: { int: 3 },
      secondStatKey: 'maxSp',
      secondValue: 30,
    },
    albumBonus: { stat: 'int', value: 1, secondaryStat: 'maxSp', secondaryValue: 10 },
  },

  willow_card: {
    id: 'willow_card',
    name: 'Карта Ивового Энта',
    monsterId: 'willow',
    targetSlot: 'garment',
    description: '+8 FLEE, +3 AGI.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'flee',
      value: 8,
      bonusStats: { agi: 3 },
    },
    albumBonus: { stat: 'agi', value: 1, secondaryStat: 'flee', secondaryValue: 3 },
  },

  wolf_card: {
    id: 'wolf_card',
    name: 'Карта Лесного Волка',
    monsterId: 'wolf',
    targetSlot: 'footgear',
    description: '+8% MoveSpeed, +4% ASPD, +3 STR.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'moveSpeed',
      value: 8,
      bonusStats: { str: 3 },
      secondStatKey: 'aspd',
      secondValue: 4,
    },
    albumBonus: { stat: 'str', value: 1, secondaryStat: 'flee', secondaryValue: 2 },
  },

  wolf_leader_card: {
    id: 'wolf_leader_card',
    name: 'Карта Вожака Стаи Волков',
    monsterId: 'wolf_leader',
    targetSlot: 'weapon',
    description: '+12 ATK, +6% ASPD, при убийстве моба восстанавливает 15 HP.',
    effect: {
      type: 'ON_KILL_RESTORE',
      statKey: 'atk',
      value: 12,
      secondStatKey: 'killHp',
      secondValue: 15,
    },
    albumBonus: { stat: 'str', value: 2 },
  },

  elder_willow_card: {
    id: 'elder_willow_card',
    name: 'Карта Древнего Энта-Хранителя',
    monsterId: 'elder_willow',
    targetSlot: 'head',
    description: '+15% MATK, +80 MaxSP, 12% шанс вызвать Шипы Земли (Earth Spike).',
    effect: {
      type: 'ON_HIT_SPELL',
      skillId: 'EARTH_SPIKE',
      chance: 0.12,
      statKey: 'matkPct',
      value: 15,
      secondStatKey: 'maxSp',
      secondValue: 80,
    },
    albumBonus: { stat: 'int', value: 3, secondaryStat: 'def', secondaryValue: 2 },
  },

  // ==========================================
  // ЗОНА 3: Затопленный Храм и Топи (Tier 2, Ур. 13–19)
  // ==========================================
  roda_frog_card: {
    id: 'roda_frog_card',
    name: 'Карта Жабы Рода',
    monsterId: 'roda_frog',
    targetSlot: 'armor',
    description: '+120 MaxHP, +5 VIT, +15% эффективность зелий лечения.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'maxHp',
      value: 120,
      bonusStats: { vit: 5 },
      secondStatKey: 'potionBonusPct',
      secondValue: 15,
    },
    albumBonus: { stat: 'vit', value: 2, secondaryStat: 'maxHp', secondaryValue: 25 },
  },

  hydra_card: {
    id: 'hydra_card',
    name: 'Карта Водяной Гидры',
    monsterId: 'hydra',
    targetSlot: 'weapon',
    description: '+12% урона (ATK и MATK) по Элитным Вожакам и MVP-Боссам.',
    effect: {
      type: 'STAT_PERCENT',
      statKey: 'bossDmg',
      value: 12,
    },
    albumBonus: { stat: 'dex', value: 2, secondaryStat: 'atk', secondaryValue: 3 },
  },

  vadon_card: {
    id: 'vadon_card',
    name: 'Карта Панцирного Краба',
    monsterId: 'vadon',
    targetSlot: 'offhand',
    description: '+15 TotalDEF, +5% шанс блока щитом, +10 ATK с колчаном.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'def',
      value: 15,
      secondStatKey: 'blockChance',
      secondValue: 5,
    },
    albumBonus: { stat: 'vit', value: 2, secondaryStat: 'def', secondaryValue: 4 },
  },

  sluice_guardian_card: {
    id: 'sluice_guardian_card',
    name: 'Карта Стража Водного Шлюза',
    monsterId: 'sluice_guardian',
    targetSlot: 'footgear',
    description: '+90 MaxHP, +12 FLEE, 10% шанс вызвать Кольцо Льда (Frost Nova).',
    effect: {
      type: 'ON_HIT_SPELL',
      skillId: 'FROST_NOVA',
      chance: 0.1,
      statKey: 'maxHp',
      value: 90,
      secondStatKey: 'flee',
      secondValue: 12,
    },
    albumBonus: { stat: 'agi', value: 2, secondaryStat: 'matk', secondaryValue: 3 },
  },

  mvp_drake_card: {
    id: 'mvp_drake_card',
    name: 'Карта Капитана-Призрака Дрейка (MVP 👑)',
    monsterId: 'mvp_drake',
    targetSlot: 'weapon',
    description: '+12% ATK и MATK, игнорирует 35% TotalDEF любых целей.',
    effect: {
      type: 'IGNORE_DEF',
      statKey: 'atkPct',
      value: 12,
      secondStatKey: 'ignoreDef',
      secondValue: 35,
    },
    albumBonus: { stat: 'str', value: 3, secondaryStat: 'atk', secondaryValue: 5 },
  },

  // ==========================================
  // ЗОНА 4: Песчаный Каньон и Муравьиный Улей (Tier 2, Ур. 20–26)
  // ==========================================
  scorpion_card: {
    id: 'scorpion_card',
    name: 'Карта Пустынного Скорпиона',
    monsterId: 'scorpion',
    targetSlot: 'weapon',
    description: '+7% CRIT, +15% критического урона.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'critChance',
      value: 7,
      secondStatKey: 'critDmgPct',
      secondValue: 15,
    },
    albumBonus: { stat: 'luk', value: 2, secondaryStat: 'crit', secondaryValue: 2 },
  },

  andre_card: {
    id: 'andre_card',
    name: 'Карта Муравья-Солдата',
    monsterId: 'andre',
    targetSlot: 'accessory',
    description: '+18 ATK, +4 STR, +4 DEX.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'atk',
      value: 18,
      bonusStats: { str: 4, dex: 4 },
    },
    albumBonus: { stat: 'str', value: 2, secondaryStat: 'atk', secondaryValue: 5 },
  },

  sand_golem_card: {
    id: 'sand_golem_card',
    name: 'Карта Песчаного Голема',
    monsterId: 'sand_golem',
    targetSlot: 'offhand',
    description: '+25 TotalDEF, -10% урона от дальних атак.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'def',
      value: 25,
      secondStatKey: 'rangedReductPct',
      secondValue: 10,
    },
    albumBonus: { stat: 'vit', value: 3, secondaryStat: 'def', secondaryValue: 5 },
  },

  ant_centurion_card: {
    id: 'ant_centurion_card',
    name: 'Карта Центуриона Муравьёв',
    monsterId: 'ant_centurion',
    targetSlot: 'garment',
    description: '+8% ASPD, +15 FLEE, +5 STR.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'flee',
      value: 15,
      bonusStats: { str: 5 },
      secondStatKey: 'aspd',
      secondValue: 8,
    },
    albumBonus: { stat: 'agi', value: 2 },
  },

  maya_queen_card: {
    id: 'maya_queen_card',
    name: 'Карта Королевы Муравьёв Майи (MVP 👑)',
    monsterId: 'maya_queen',
    targetSlot: 'offhand',
    description: '+30 TotalDEF, отражает 30% входящего урона обратно во врага.',
    effect: {
      type: 'REFLECT_DAMAGE',
      statKey: 'def',
      value: 30,
      secondStatKey: 'reflectPct',
      secondValue: 30,
    },
    albumBonus: { stat: 'vit', value: 4, secondaryStat: 'maxHp', secondaryValue: 50 },
  },

  // ==========================================
  // ЗОНА 5: Крепость Орков и Шахты (Tier 3, Ур. 27–34)
  // ==========================================
  orc_warrior_card: {
    id: 'orc_warrior_card',
    name: 'Карта Орка-Воина',
    monsterId: 'orc_warrior',
    targetSlot: 'armor',
    description: '+180 MaxHP, снижает входящий физ. урон на 12%.',
    effect: {
      type: 'DAMAGE_REDUCTION',
      statKey: 'maxHp',
      value: 180,
      secondStatKey: 'dmgReductionPct',
      secondValue: 12,
    },
    albumBonus: { stat: 'vit', value: 3, secondaryStat: 'maxHp', secondaryValue: 40 },
  },

  orc_archer_card: {
    id: 'orc_archer_card',
    name: 'Карта Орка-Лучника',
    monsterId: 'orc_archer',
    targetSlot: 'weapon',
    description: '+8% ASPD, +8 DEX, +10% урона стрелковыми умениями.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'dex',
      value: 8,
      bonusStats: { dex: 8 },
      secondStatKey: 'rangedDmgPct',
      secondValue: 10,
    },
    albumBonus: { stat: 'dex', value: 3, secondaryStat: 'hit', secondaryValue: 4 },
  },

  orc_shaman_card: {
    id: 'orc_shaman_card',
    name: 'Карта Орка-Шамана',
    monsterId: 'orc_shaman',
    targetSlot: 'head',
    description: '+28 MATK, +6 INT, 12% шанс бесплатно скастовать Огненный Столб.',
    effect: {
      type: 'ON_HIT_SPELL',
      skillId: 'FIRE_PILLAR',
      chance: 0.12,
      statKey: 'matk',
      value: 28,
      bonusStats: { int: 6 },
    },
    albumBonus: { stat: 'int', value: 3, secondaryStat: 'matk', secondaryValue: 6 },
  },

  orc_warlord_card: {
    id: 'orc_warlord_card',
    name: 'Карта Орочьего Воеводы',
    monsterId: 'orc_warlord',
    targetSlot: 'accessory',
    description: '+8% ATK, +6 STR, вампиризм: восстанавливает 2% от физ. урона в HP.',
    effect: {
      type: 'SPECIAL_EFFECT',
      statKey: 'atkPct',
      value: 8,
      bonusStats: { str: 6 },
      secondStatKey: 'lifesteal',
      secondValue: 2,
    },
    albumBonus: { stat: 'str', value: 3, secondaryStat: 'atk', secondaryValue: 8 },
  },

  orc_lord_card: {
    id: 'orc_lord_card',
    name: 'Карта Повелителя Орков (MVP 👑)',
    monsterId: 'orc_lord',
    targetSlot: 'armor',
    description: '+25% MaxHP, +35 TotalDEF, 30% возврат ближнего урона атакующим.',
    effect: {
      type: 'REFLECT_DAMAGE',
      statKey: 'maxHpPct',
      value: 25,
      secondStatKey: 'def',
      secondValue: 35,
    },
    albumBonus: { stat: 'str', value: 5, secondaryStat: 'def', secondaryValue: 8 },
  },

  // ==========================================
  // ЗОНА 6: Проклятый Монастырь Гластхейм (Tier 3, Ур. 35–41)
  // ==========================================
  skeleton_knight_card: {
    id: 'skeleton_knight_card',
    name: 'Карта Скелета-Рыцаря',
    monsterId: 'skeleton_knight',
    targetSlot: 'weapon',
    description: '+25 ATK, +8% CRIT, 10% шанс оглушить цель на 1.2 сек.',
    effect: {
      type: 'SPECIAL_EFFECT',
      statKey: 'atk',
      value: 25,
      secondStatKey: 'critChance',
      secondValue: 8,
      chance: 0.1,
    },
    albumBonus: { stat: 'str', value: 3, secondaryStat: 'crit', secondaryValue: 1 },
  },

  whisper_card: {
    id: 'whisper_card',
    name: 'Карта Призрака Уиспер',
    monsterId: 'whisper',
    targetSlot: 'garment',
    description: '+25 FLEE, +6% ASPD, +10% урона святым оружием.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'flee',
      value: 25,
      secondStatKey: 'aspd',
      secondValue: 6,
    },
    albumBonus: { stat: 'agi', value: 3, secondaryStat: 'flee', secondaryValue: 6 },
  },

  mimic_card: {
    id: 'mimic_card',
    name: 'Карта Древнего Мимика',
    monsterId: 'mimic',
    targetSlot: 'accessory',
    description: '+6 LUK, +25% к шансу выпадения сундуков, руды и трофеев.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'luk',
      value: 6,
      secondStatKey: 'dropBonusPct',
      secondValue: 25,
    },
    albumBonus: { stat: 'luk', value: 4 },
  },

  abbey_executioner_card: {
    id: 'abbey_executioner_card',
    name: 'Карта Палача Аббатства',
    monsterId: 'abbey_executioner',
    targetSlot: 'head',
    description: '+10% урона всеми умениями, -10% расход SP, +8 SP за убийство.',
    effect: {
      type: 'ON_KILL_RESTORE',
      statKey: 'skillDmgPct',
      value: 10,
      secondStatKey: 'killSp',
      secondValue: 8,
    },
    albumBonus: { stat: 'str', value: 3, secondaryStat: 'maxSp', secondaryValue: 20 },
  },

  dark_lord_card: {
    id: 'dark_lord_card',
    name: 'Карта Тёмного Лорда Иллюзий (MVP 👑)',
    monsterId: 'dark_lord',
    targetSlot: 'footgear',
    description: '+15% MaxHP и MaxSP, 15% шанс вызвать Метеоритный Дождь (Meteor Storm).',
    effect: {
      type: 'ON_HIT_SPELL',
      skillId: 'METEOR_STORM',
      chance: 0.15,
      statKey: 'maxHpPct',
      value: 15,
      secondStatKey: 'maxSpPct',
      secondValue: 15,
    },
    albumBonus: { stat: 'int', value: 5, secondaryStat: 'matk', secondaryValue: 10 },
  },

  // ==========================================
  // ЗОНА 7: Заводная Башня Древних (Tier 4, Ур. 42–53)
  // ==========================================
  punk_card: {
    id: 'punk_card',
    name: 'Карта Заводного Стража',
    monsterId: 'punk',
    targetSlot: 'garment',
    description: '+20 TotalDEF, +20 FLEE, при получении удара 12% шанс наложить ускорение (+15% ASPD).',
    effect: {
      type: 'SPECIAL_EFFECT',
      statKey: 'def',
      value: 20,
      secondStatKey: 'flee',
      secondValue: 20,
      chance: 0.12,
    },
    albumBonus: { stat: 'agi', value: 3, secondaryStat: 'def', secondaryValue: 3 },
  },

  alarm_card: {
    id: 'alarm_card',
    name: 'Карта Хроно-Стрелки',
    monsterId: 'alarm',
    targetSlot: 'footgear',
    description: '+200 MaxHP, +15% MoveSpeed, +8% ASPD.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'maxHp',
      value: 200,
      secondStatKey: 'moveSpeed',
      secondValue: 15,
    },
    albumBonus: { stat: 'agi', value: 4, secondaryStat: 'maxHp', secondaryValue: 40 },
  },

  bathory_card: {
    id: 'bathory_card',
    name: 'Карта Архимага Теней',
    monsterId: 'bathory',
    targetSlot: 'head',
    description: '+12% MATK и -12% время отката всех активных умений.',
    effect: {
      type: 'STAT_PERCENT',
      statKey: 'matkPct',
      value: 12,
      secondStatKey: 'cooldownReductionPct',
      secondValue: 12,
    },
    albumBonus: { stat: 'int', value: 4, secondaryStat: 'matk', secondaryValue: 10 },
  },

  time_keeper_card: {
    id: 'time_keeper_card',
    name: 'Карта Хранителя Времени',
    monsterId: 'time_keeper',
    targetSlot: 'accessory',
    description: '+10% ASPD, -10% откат умений, +6 DEX, +6 AGI.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'dex',
      value: 6,
      bonusStats: { dex: 6, agi: 6 },
      secondStatKey: 'aspd',
      secondValue: 10,
    },
    albumBonus: { stat: 'dex', value: 4, secondaryStat: 'flee', secondaryValue: 4 },
  },

  stormy_knight_card: {
    id: 'stormy_knight_card',
    name: 'Карта Рыцаря Бури (MVP 👑)',
    monsterId: 'stormy_knight',
    targetSlot: 'weapon',
    description: '+18% ATK и MATK, 20% шанс вызвать Ледяной Буран (Storm Gust) с заморозкой врагов.',
    effect: {
      type: 'ON_HIT_SPELL',
      skillId: 'STORM_GUST',
      chance: 0.2,
      statKey: 'atkPct',
      value: 18,
    },
    albumBonus: { stat: 'str', value: 5, secondaryStat: 'matk', secondaryValue: 12 },
  },

  // ==========================================
  // ЗОНА 8: Вулкан Ифрита и Храм Драконов (Tier 5, Ур. 54–70)
  // ==========================================
  kaho_card: {
    id: 'kaho_card',
    name: 'Карта Лавового Импа',
    monsterId: 'kaho',
    targetSlot: 'offhand',
    description: '+35 ATK, +35 MATK, +8% CRIT.',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'atk',
      value: 35,
      secondStatKey: 'matk',
      secondValue: 35,
    },
    albumBonus: { stat: 'int', value: 4, secondaryStat: 'crit', secondaryValue: 2 },
  },

  petit_card: {
    id: 'petit_card',
    name: 'Карта Огненной Виверны',
    monsterId: 'petit',
    targetSlot: 'garment',
    description: '+12% ко всем видам урона (ATK и MATK), +25 FLEE.',
    effect: {
      type: 'STAT_PERCENT',
      statKey: 'allDmgPct',
      value: 12,
      secondStatKey: 'flee',
      secondValue: 25,
    },
    albumBonus: { stat: 'str', value: 4, secondaryStat: 'dex', secondaryValue: 4 },
  },

  ferus_card: {
    id: 'ferus_card',
    name: 'Карта Драконида-Гвардейца',
    monsterId: 'ferus',
    targetSlot: 'armor',
    description: '+400 MaxHP, +8 ко всем 6 характеристикам (STR..LUK).',
    effect: {
      type: 'STAT_FLAT',
      statKey: 'maxHp',
      value: 400,
      secondStatKey: 'allStats',
      secondValue: 8,
    },
    albumBonus: { stat: 'vit', value: 5, secondaryStat: 'maxHp', secondaryValue: 80 },
  },

  fire_dragonid_card: {
    id: 'fire_dragonid_card',
    name: 'Карта Пламенного Драконида',
    monsterId: 'fire_dragonid',
    targetSlot: 'head',
    description: '+15% урона по Боссам и Элите, восстанавливает 3% MaxHP и 2% MaxSP от урона скиллами.',
    effect: {
      type: 'SPECIAL_EFFECT',
      statKey: 'bossDmg',
      value: 15,
    },
    albumBonus: { stat: 'str', value: 5, secondaryStat: 'def', secondaryValue: 10 },
  },

  ifrit_card: {
    id: 'ifrit_card',
    name: 'Карта Первородного Дракона Ифрита (MVP 👑)',
    monsterId: 'ifrit',
    targetSlot: 'accessory',
    description: '+15% ATK, +15% MATK, +15% CRIT и постоянная аура огненного вихря (100% ATK+MATK / сек).',
    effect: {
      type: 'AURA_DAMAGE',
      statKey: 'atkPct',
      value: 15,
      secondStatKey: 'critChance',
      secondValue: 15,
    },
    albumBonus: { stat: 'allStats', value: 6 },
  },
};
