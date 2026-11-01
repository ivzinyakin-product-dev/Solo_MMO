import { SkillDef, JobClass, JobId, WeaponArchetype } from '../types/game.types';
import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
import { SoundFX } from '../core/SoundFX';
import { EventBus } from '../core/EventBus';

export const SKILLS_DATABASE: Record<string, SkillDef> = {
  // ==========================================
  // 5 УНИВЕРСАЛЬНЫХ НАВЫКОВ НОВИЧКА (Lv.1 - 10)
  // ==========================================
  novice_bash: {
    id: 'novice_bash',
    name: 'Мощный выпад',
    jobId: 'novice',
    job: 'Novice',
    icon: '🗡️',
    requiredWeapon: 'MELEE_SWORD',
    bookPrice: 0,
    maxLevel: 5,
    spCostBase: 12,
    cooldownSec: 5.0,
    range: 65,
    description: 'Наносит (150 + Lv*25)% ATK урона. При Булаве оглушает цель на 1с и лечит 5% MaxHP.',
    type: 'ACTIVE_TARGET',
    baseFactor: 1.25,
    perLevelFactor: 0.25,
  },
  novice_power_shot: {
    id: 'novice_power_shot',
    name: 'Отбрасывающий выстрел',
    jobId: 'novice',
    job: 'Novice',
    icon: '🏹',
    requiredWeapon: 'RANGED_BOW',
    bookPrice: 0,
    maxLevel: 5,
    spCostBase: 15,
    cooldownSec: 5.0,
    range: 280,
    knockbackDist: 90,
    description: 'Тяжелая стрела на (140 + Lv*20)% ATK, отбрасывающая цель на 90px.',
    type: 'ACTIVE_TARGET',
    baseFactor: 1.2,
    perLevelFactor: 0.2,
  },
  novice_arcane_bolt: {
    id: 'novice_arcane_bolt',
    name: 'Магический импульс',
    jobId: 'novice',
    job: 'Novice',
    icon: '🔮',
    requiredWeapon: 'MAGIC_STAFF',
    bookPrice: 0,
    maxLevel: 5,
    spCostBase: 18,
    cooldownSec: 4.5,
    range: 260,
    description: 'Выпускает 1 (Lv.1-2), 2 (Lv.3-4) или 3 (Lv.5) самонаводящихся сгустка магии по 90% MATK.',
    type: 'ACTIVE_TARGET',
    baseFactor: 0.9,
    perLevelFactor: 0.0,
  },
  novice_adventurer_grit: {
    id: 'novice_adventurer_grit',
    name: 'Воля Путника',
    jobId: 'novice',
    job: 'Novice',
    icon: '👟',
    bookPrice: 0,
    maxLevel: 5,
    spCostBase: 15,
    cooldownSec: 30.0,
    range: 0,
    description: 'Бафф на 180с: +15% бег, +(2*Lv) ко всем 6 характеристикам и +15% к регенерации.',
    type: 'BUFF',
    baseFactor: 1.0,
    perLevelFactor: 0.1,
  },
  novice_first_aid: {
    id: 'novice_first_aid',
    name: 'Первая помощь',
    jobId: 'novice',
    job: 'Novice',
    icon: '🩹',
    bookPrice: 0,
    maxLevel: 5,
    spCostBase: 15,
    cooldownSec: 18.0,
    range: 0,
    description: 'Мгновенно восстанавливает (20 + Lv*5)% от максимального запаса здоровья.',
    type: 'ACTIVE_TARGET',
    baseFactor: 0.2,
    perLevelFactor: 0.05,
  },

  // ==========================================
  // ВЕТКА МЕЧНИКА: SWORDSMAN
  // ==========================================
  sw_sword_mastery: {
    id: 'sw_sword_mastery',
    name: 'Мастерство Клинка',
    jobId: 'swordsman',
    job: 'Swordsman',
    icon: '⚔️',
    requiredWeapon: 'MELEE_SWORD',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 0,
    cooldownSec: 0,
    range: 0,
    description: 'Пассивный: Повышает ATK при надетом Мече на +(4*Lv)% и даёт +(3*Lv) HIT.',
    type: 'PASSIVE',
    baseFactor: 0,
    perLevelFactor: 0.04,
  },
  sw_magnum_break: {
    id: 'sw_magnum_break',
    name: 'Взрыв Магмы',
    jobId: 'swordsman',
    job: 'Swordsman',
    icon: '💥',
    requiredWeapon: 'MELEE_SWORD',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 22,
    cooldownSec: 9.0,
    range: 0,
    aoeRadius: 130,
    description: 'Огненный взрыв вокруг героя (180 + 35*Lv)% ATK. На 12с наделяет оружие огнем (+20% ATK урона автоатакам).',
    type: 'ACTIVE_AOE',
    baseFactor: 1.45,
    perLevelFactor: 0.35,
  },
  sw_endure: {
    id: 'sw_endure',
    name: 'Несокрушимость',
    jobId: 'swordsman',
    job: 'Swordsman',
    icon: '🛡️',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 20,
    cooldownSec: 25.0,
    range: 0,
    description: 'На 60 секунд даёт +(10*Lv) TotalDEF, +(3*Lv) SoftDEF и иммунитет к отбрасыванию.',
    type: 'BUFF',
    baseFactor: 1.0,
    perLevelFactor: 0.2,
  },

  // ==========================================
  // ВЕТКА РЫЦАРЯ: KNIGHT [2-1]
  // ==========================================
  kn_cavalry_mastery: {
    id: 'kn_cavalry_mastery',
    name: 'Кавалерийский Натиск',
    jobId: 'knight',
    job: 'Knight',
    icon: '🐎',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 0,
    cooldownSec: 0,
    range: 0,
    description: 'Пассивный: Кавалерийская стойка постоянно повышает бег на +(5*Lv)%, ASPD на +(3*Lv)% и MaxHP на +(4*Lv)%.',
    type: 'PASSIVE',
    baseFactor: 0,
    perLevelFactor: 0.05,
  },
  kn_bowling_bash: {
    id: 'kn_bowling_bash',
    name: 'Сокрушительный Боулинг',
    jobId: 'knight',
    job: 'Knight',
    icon: '🎳',
    requiredWeapon: 'MELEE_SWORD',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 27,
    cooldownSec: 7.0,
    range: 110,
    aoeRadius: 110,
    description: 'Двойной размашистый удар по конусу: 2 x (130 + 25*Lv)% ATK всем целям + 100% ATK урона от столкновения.',
    type: 'ACTIVE_TARGET',
    baseFactor: 1.05,
    perLevelFactor: 0.25,
  },
  kn_two_hand_quicken: {
    id: 'kn_two_hand_quicken',
    name: 'Ускорение Клинка',
    jobId: 'knight',
    job: 'Knight',
    icon: '⚡',
    requiredWeapon: 'MELEE_SWORD',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 25,
    cooldownSec: 30.0,
    range: 0,
    description: 'На 90 секунд увеличивает скорость атаки ASPD на +(6*Lv)% и шанс крита CRIT на +(2*Lv)%.',
    type: 'BUFF',
    baseFactor: 1.0,
    perLevelFactor: 0.06,
  },
  kn_spiral_pierce: {
    id: 'kn_spiral_pierce',
    name: 'Спиральный Пробой',
    jobId: 'knight',
    job: 'Knight',
    icon: '🌀',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 42,
    cooldownSec: 12.0,
    range: 220,
    description: 'Бурав режущих волн по прямой: 5 x (75 + 15*Lv)% ATK (+40% урона по Элите и MVP-боссам).',
    type: 'ACTIVE_TARGET',
    baseFactor: 0.6,
    perLevelFactor: 0.15,
  },

  // ==========================================
  // ВЕТКА КРЕСТОНОСЦА: CRUSADER [2-2]
  // ==========================================
  cr_auto_guard: {
    id: 'cr_auto_guard',
    name: 'Священный Заслон',
    jobId: 'crusader',
    job: 'Crusader',
    icon: '⛨',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 0,
    cooldownSec: 0,
    range: 0,
    description: 'Пассивный: Повышает шанс блока щитом на +(3*Lv)% и увеличивает MaxHP на +(5*Lv)%.',
    type: 'PASSIVE',
    baseFactor: 0,
    perLevelFactor: 0.03,
  },
  cr_reflect_shield: {
    id: 'cr_reflect_shield',
    name: 'Зеркальный Щит',
    jobId: 'crusader',
    job: 'Crusader',
    icon: '🪞',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 22,
    cooldownSec: 20.0,
    range: 0,
    description: 'На 90с окружает золотым барьером: атакующие монстры получают обратно (25 + 10*Lv)% урона + 100% TotalDEF героя.',
    type: 'BUFF',
    baseFactor: 0.25,
    perLevelFactor: 0.1,
  },
  cr_shield_chain: {
    id: 'cr_shield_chain',
    name: 'Цепной Удар Щитом',
    jobId: 'crusader',
    job: 'Crusader',
    icon: '🔗',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 30,
    cooldownSec: 7.5,
    range: 200,
    description: 'Проекция щита: 3 x (110 + 20*Lv)% (ATK + TotalDEF) урона и оглушение цели на 1.5 сек.',
    type: 'ACTIVE_TARGET',
    baseFactor: 0.9,
    perLevelFactor: 0.2,
  },
  cr_grand_cross: {
    id: 'cr_grand_cross',
    name: 'Великий Крест',
    jobId: 'crusader',
    job: 'Crusader',
    icon: '✝️',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 50,
    cooldownSec: 15.0,
    range: 0,
    aoeRadius: 160,
    description: 'Гигантский золотой крест: 3 волны по (140 + 30*Lv)% (ATK + MATK) святого урона + отхил 3% MaxHP за каждого врага.',
    type: 'ACTIVE_AOE',
    baseFactor: 1.1,
    perLevelFactor: 0.3,
  },

  // ==========================================
  // ВЕТКА ЛУЧНИКА: ARCHER
  // ==========================================
  ar_owl_eye: {
    id: 'ar_owl_eye',
    name: 'Глаз Совы и Орла',
    jobId: 'archer',
    job: 'Archer',
    icon: '👁️',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 0,
    cooldownSec: 0,
    range: 0,
    description: 'Пассивный: Повышает DEX на +(2*Lv) и увеличивает дальность стрельбы из лука на +(10*Lv)px.',
    type: 'PASSIVE',
    baseFactor: 0,
    perLevelFactor: 2,
  },
  ar_double_strafe: {
    id: 'ar_double_strafe',
    name: 'Двойной Выстрел',
    jobId: 'archer',
    job: 'Archer',
    icon: '🎯',
    requiredWeapon: 'RANGED_BOW',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 18,
    cooldownSec: 4.5,
    range: 320,
    description: 'Мгновенно выпускает 2 пробивные стрелы в цель по (120 + 20*Lv)% ATK каждая.',
    type: 'ACTIVE_TARGET',
    baseFactor: 1.0,
    perLevelFactor: 0.2,
  },
  ar_arrow_shower: {
    id: 'ar_arrow_shower',
    name: 'Ливень Стрел',
    jobId: 'archer',
    job: 'Archer',
    icon: '🌧️',
    requiredWeapon: 'RANGED_BOW',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 27,
    cooldownSec: 8.0,
    range: 280,
    aoeRadius: 120,
    description: 'Град стрел по области радиусом 120px: наносит (160 + 30*Lv)% ATK урона всем врагам.',
    type: 'ACTIVE_AOE',
    baseFactor: 1.3,
    perLevelFactor: 0.3,
  },

  // ==========================================
  // ВЕТКА ОХОТНИКА: HUNTER [2-1]
  // ==========================================
  hu_falcon_mastery: {
    id: 'hu_falcon_mastery',
    name: 'Приручённый Сокол',
    jobId: 'hunter',
    job: 'Hunter',
    icon: '🦅',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 0,
    cooldownSec: 0,
    range: 0,
    description: 'Пассивный: Сокол парит над плечом; при автоатаках с шансом (12 + 3*Lv + LUK/3)% пикирует на (110 + 25*Lv)% (ATK + DEX*2) чистого урона (игнорирует DEF).',
    type: 'PASSIVE',
    baseFactor: 0.85,
    perLevelFactor: 0.25,
  },
  hu_blast_mine: {
    id: 'hu_blast_mine',
    name: 'Разрывной Капкан',
    jobId: 'hunter',
    job: 'Hunter',
    icon: '💣',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 30,
    cooldownSec: 9.0,
    range: 220,
    aoeRadius: 110,
    description: 'Охотничья мина: детонирует через 0.6с на (220 + 40*Lv)% ATK в радиусе 110px и замедляет мобов на 40%.',
    type: 'ACTIVE_AOE',
    baseFactor: 1.8,
    perLevelFactor: 0.4,
  },
  hu_true_sight: {
    id: 'hu_true_sight',
    name: 'Истинное Зрение',
    jobId: 'hunter',
    job: 'Hunter',
    icon: '✨',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 25,
    cooldownSec: 30.0,
    range: 0,
    description: 'На 90с повышает все 6 характеристик на +5, шанс крита CRIT на +(3*Lv)% и урон критов на +(5*Lv)%.',
    type: 'BUFF',
    baseFactor: 1.0,
    perLevelFactor: 0.05,
  },
  hu_falcon_assault: {
    id: 'hu_falcon_assault',
    name: 'Соколиный Штурм',
    jobId: 'hunter',
    job: 'Hunter',
    icon: '🦅',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 45,
    cooldownSec: 13.5,
    range: 340,
    description: 'Сокол пикирует по сильнейшей цели: 5 x (90 + 20*Lv)% ATK со 100% пробитием брони.',
    type: 'ACTIVE_TARGET',
    baseFactor: 0.7,
    perLevelFactor: 0.2,
  },

  // ==========================================
  // ВЕТКА БАРДА: BARD [2-2]
  // ==========================================
  ba_music_lessons: {
    id: 'ba_music_lessons',
    name: 'Уроки Гармонии',
    jobId: 'bard',
    job: 'Bard',
    icon: '🎼',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 0,
    cooldownSec: 0,
    range: 0,
    description: 'Пассивный: Увеличивает радиус песен до 280px, повышает ASPD с луком на +(3*Lv)% и даёт +(2*Lv) SP/сек.',
    type: 'PASSIVE',
    baseFactor: 0,
    perLevelFactor: 0.03,
  },
  ba_poem_of_bragi: {
    id: 'ba_poem_of_bragi',
    name: 'Поэма Браги и Яблоко Идун',
    jobId: 'bard',
    job: 'Bard',
    icon: '🎵',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 0,
    cooldownSec: 1.0,
    range: 0,
    description: 'Стойка-Аура (переключатель): -(5*Lv)% откат способностей, +(4*Lv)% MaxHP и реген +(1 + 0.4*Lv)% MaxHP каждые 2с герою и напарнику.',
    type: 'BUFF',
    baseFactor: 1.0,
    perLevelFactor: 0.05,
  },
  ba_assassin_cross_sunset: {
    id: 'ba_assassin_cross_sunset',
    name: 'Ритм Заката',
    jobId: 'bard',
    job: 'Bard',
    icon: '🌅',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 20,
    cooldownSec: 25.0,
    range: 0,
    description: 'На 90с ускоряет ASPD героя и напарника на +(4*Lv)% и повышает уворот FLEE на +(5*Lv).',
    type: 'BUFF',
    baseFactor: 1.0,
    perLevelFactor: 0.04,
  },
  ba_arrow_vulcan: {
    id: 'ba_arrow_vulcan',
    name: 'Вулкан Мелодий',
    jobId: 'bard',
    job: 'Bard',
    icon: '🎶',
    requiredWeapon: 'RANGED_BOW',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 39,
    cooldownSec: 10.0,
    range: 300,
    description: 'Очередь из 4 резонирующих звуковых стрел подряд по (95 + 18*Lv)% ATK каждая.',
    type: 'ACTIVE_TARGET',
    baseFactor: 0.77,
    perLevelFactor: 0.18,
  },

  // ==========================================
  // ВЕТКА МАГА: MAGE
  // ==========================================
  mg_sp_recovery: {
    id: 'mg_sp_recovery',
    name: 'Медитация Маны',
    jobId: 'mage',
    job: 'Mage',
    icon: '🧘',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 0,
    cooldownSec: 0,
    range: 0,
    description: 'Пассивный: Повышает MATK на +(4*Lv)% и восстанавливает +(3*Lv) SP каждые 3 секунды.',
    type: 'PASSIVE',
    baseFactor: 0,
    perLevelFactor: 0.04,
  },
  mg_fire_pillar: {
    id: 'mg_fire_pillar',
    name: 'Огненный Столб',
    jobId: 'mage',
    job: 'Mage',
    icon: '🔥',
    requiredWeapon: 'MAGIC_STAFF',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 24,
    cooldownSec: 7.0,
    range: 300,
    aoeRadius: 95,
    description: 'Столб пламени под целью и в радиусе 95px на (170 + 35*Lv)% MATK урона.',
    type: 'ACTIVE_AOE',
    baseFactor: 1.35,
    perLevelFactor: 0.35,
  },
  mg_lightning_bolt: {
    id: 'mg_lightning_bolt',
    name: 'Грозовой Разряд',
    jobId: 'mage',
    job: 'Mage',
    icon: '⚡',
    requiredWeapon: 'MAGIC_STAFF',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 21,
    cooldownSec: 5.5,
    range: 300,
    description: 'Бьёт цель и до 2 соседей цепной молнией на (145 + 25*Lv)% MATK.',
    type: 'ACTIVE_TARGET',
    baseFactor: 1.2,
    perLevelFactor: 0.25,
  },

  // ==========================================
  // ВЕТКА ВОЛШЕБНИКА: WIZARD [2-1]
  // ==========================================
  wz_mystical_amplify: {
    id: 'wz_mystical_amplify',
    name: 'Усиление Магии',
    jobId: 'wizard',
    job: 'Wizard',
    icon: '🔮',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 0,
    cooldownSec: 0,
    range: 0,
    description: 'Пассивный: Увеличивает урон всех заклинаний на +(6*Lv)% и даёт +(2*Lv)% магического вампиризма.',
    type: 'PASSIVE',
    baseFactor: 0,
    perLevelFactor: 0.06,
  },
  wz_storm_gust: {
    id: 'wz_storm_gust',
    name: 'Ледяной Буран',
    jobId: 'wizard',
    job: 'Wizard',
    icon: '❄️',
    requiredWeapon: 'MAGIC_STAFF',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 48,
    cooldownSec: 12.0,
    range: 320,
    aoeRadius: 170,
    description: 'Ледяной шторм на 3с: каждую секунду (120 + 25*Lv)% MATK, отталкивание и 35% шанс заморозки на 1.5с.',
    type: 'ACTIVE_AOE',
    baseFactor: 0.95,
    perLevelFactor: 0.25,
  },
  wz_meteor_storm: {
    id: 'wz_meteor_storm',
    name: 'Метеоритный Дождь',
    jobId: 'wizard',
    job: 'Wizard',
    icon: '☄️',
    requiredWeapon: 'MAGIC_STAFF',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 52,
    cooldownSec: 13.5,
    range: 320,
    aoeRadius: 180,
    description: '3..5 пылающих метеоритов по площади 180px, каждый взрывается на (150 + 30*Lv)% MATK и оглушает врагов.',
    type: 'ACTIVE_AOE',
    baseFactor: 1.2,
    perLevelFactor: 0.3,
  },
  wz_energy_coat: {
    id: 'wz_energy_coat',
    name: 'Энергетический Барьер',
    jobId: 'wizard',
    job: 'Wizard',
    icon: '🛡️',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 20,
    cooldownSec: 30.0,
    range: 0,
    description: 'На 90 секунд окружает сферой маны, снижающей весь входящий физический урон на (12 + 4*Lv)%.',
    type: 'BUFF',
    baseFactor: 0.12,
    perLevelFactor: 0.04,
  },

  // ==========================================
  // ВЕТКА МУДРЕЦА: SAGE [2-2]
  // ==========================================
  sg_free_cast: {
    id: 'sg_free_cast',
    name: 'Свободный Каст и Книжный Бой',
    jobId: 'sage',
    job: 'Sage',
    icon: '📖',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 0,
    cooldownSec: 0,
    range: 0,
    description: 'Пассивный: ASPD с посохом и гримуаром +(5*Lv)%, а каждое очко AGI дополнительно даёт +0.5 MATK.',
    type: 'PASSIVE',
    baseFactor: 0,
    perLevelFactor: 0.05,
  },
  sg_hindsight: {
    id: 'sg_hindsight',
    name: 'Авто-Заклинание',
    jobId: 'sage',
    job: 'Sage',
    icon: '✨',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 0,
    cooldownSec: 1.0,
    range: 0,
    description: 'Стойка: автоатаки посохом с шансом (22 + 6*Lv)% бесплатно кастуют стихийное заклинание на (130 + 25*Lv)% MATK!',
    type: 'BUFF',
    baseFactor: 0.22,
    perLevelFactor: 0.06,
  },
  sg_elemental_endow: {
    id: 'sg_elemental_endow',
    name: 'Зачарование Стихий',
    jobId: 'sage',
    job: 'Sage',
    icon: '🔥',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 22,
    cooldownSec: 25.0,
    range: 0,
    description: 'На 90с усиливает урон автоатак посоха на +(8*Lv)% MATK и добавляет сплеш-урон по радиусу 75px.',
    type: 'BUFF',
    baseFactor: 1.0,
    perLevelFactor: 0.08,
  },
  sg_earth_spike: {
    id: 'sg_earth_spike',
    name: 'Копьё Геи',
    jobId: 'sage',
    job: 'Sage',
    icon: '⛰️',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 30,
    cooldownSec: 7.5,
    range: 260,
    aoeRadius: 110,
    description: 'Шипы из земли под врагами: (200 + 35*Lv)% MATK и снижение защиты целей на 20%.',
    type: 'ACTIVE_AOE',
    baseFactor: 1.65,
    perLevelFactor: 0.35,
  },

  // ==========================================
  // ВЕТКА АКОЛИТА: ACOLYTE
  // ==========================================
  ac_divine_protection: {
    id: 'ac_divine_protection',
    name: 'Божественная Защита',
    jobId: 'acolyte',
    job: 'Acolyte',
    icon: '🛡️',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 0,
    cooldownSec: 0,
    range: 0,
    description: 'Пассивный: Повышает VIT и INT на +(2*Lv), а урон по Нежити и Демонам на +(6*Lv)%.',
    type: 'PASSIVE',
    baseFactor: 0,
    perLevelFactor: 2,
  },
  ac_blessing_agi: {
    id: 'ac_blessing_agi',
    name: 'Святое Благословение',
    jobId: 'acolyte',
    job: 'Acolyte',
    icon: '🕊️',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 20,
    cooldownSec: 25.0,
    range: 0,
    description: 'На 120с повышает STR, INT, DEX, AGI героя и напарника на +(2 + 2*Lv) и ASPD на +(3*Lv)%.',
    type: 'BUFF',
    baseFactor: 1.0,
    perLevelFactor: 2,
  },
  ac_holy_light: {
    id: 'ac_holy_light',
    name: 'Святой Свет',
    jobId: 'acolyte',
    job: 'Acolyte',
    icon: '✨',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 22,
    cooldownSec: 6.0,
    range: 280,
    description: 'Луч света на (160 + 30*Lv)% (MATK + ATK*0.5) и отхил героя и напарника на (12 + 3*Lv)% MaxHP.',
    type: 'ACTIVE_TARGET',
    baseFactor: 1.3,
    perLevelFactor: 0.3,
  },

  // ==========================================
  // ВЕТКА ПРИСТА: PRIEST [2-1]
  // ==========================================
  pr_mace_faith: {
    id: 'pr_mace_faith',
    name: 'Вера и Мастерство Булавы',
    jobId: 'priest',
    job: 'Priest',
    icon: '🔨',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 0,
    cooldownSec: 0,
    range: 0,
    description: 'Пассивный: Повышает ATK и MATK с Булавой на +(5*Lv)% и шанс пассивной золотой вспышки до (25 + 4*Lv)%.',
    type: 'PASSIVE',
    baseFactor: 0,
    perLevelFactor: 0.05,
  },
  pr_kyrie_magnific: {
    id: 'pr_kyrie_magnific',
    name: 'Барьер Кирие и Магнификат',
    jobId: 'priest',
    job: 'Priest',
    icon: '🛡️',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 28,
    cooldownSec: 20.0,
    range: 0,
    description: 'Святой щит прочностью (15 + 4*Lv)% MaxHP и удвоение регенерации HP/SP на 60 секунд.',
    type: 'BUFF',
    baseFactor: 0.15,
    perLevelFactor: 0.04,
  },
  pr_sanctuary: {
    id: 'pr_sanctuary',
    name: 'Освящённое Святилище',
    jobId: 'priest',
    job: 'Priest',
    icon: '⛪',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 38,
    cooldownSec: 10.5,
    range: 0,
    aoeRadius: 140,
    description: 'Круг на 5с: каждую секунду лечит на (6 + 1.5*Lv)% MaxHP и бьет врагов на (110 + 22*Lv)% (MATK + ATK*0.5).',
    type: 'ACTIVE_AOE',
    baseFactor: 0.88,
    perLevelFactor: 0.22,
  },
  pr_magnus_exorcismus: {
    id: 'pr_magnus_exorcismus',
    name: 'Великий Экзорцизм',
    jobId: 'priest',
    job: 'Priest',
    icon: '☀️',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 52,
    cooldownSec: 13.5,
    range: 0,
    aoeRadius: 180,
    description: 'Выжигает область 4 тиками по (130 + 25*Lv)% (MATK + ATK*0.6) святого урона.',
    type: 'ACTIVE_AOE',
    baseFactor: 1.05,
    perLevelFactor: 0.25,
  },

  // ==========================================
  // ВЕТКА МОНАХА: MONK [2-2]
  // ==========================================
  mo_iron_fist: {
    id: 'mo_iron_fist',
    name: 'Кулак Дракона и Тройной Удар',
    jobId: 'monk',
    job: 'Monk',
    icon: '👊',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 0,
    cooldownSec: 0,
    range: 0,
    description: 'Пассивный: Автоатаки с шансом (18 + 4*Lv)% вызывают Тройной Удар (300% ATK+INT) и призывают 1 Духовную Сферу.',
    type: 'PASSIVE',
    baseFactor: 0,
    perLevelFactor: 0.04,
  },
  mo_spirit_spheres: {
    id: 'mo_spirit_spheres',
    name: 'Призыв Духовных Сфер',
    jobId: 'monk',
    job: 'Monk',
    icon: '🔮',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 15,
    cooldownSec: 5.0,
    range: 0,
    description: 'Призывает орбитальные Духовные Сферы (до 5 шт). Каждая сфера: +(3*Lv)% ATK, +3% ASPD и +10 игнора брони.',
    type: 'BUFF',
    baseFactor: 1.0,
    perLevelFactor: 0.03,
  },
  mo_chain_crush: {
    id: 'mo_chain_crush',
    name: 'Цепное Сокрушение',
    jobId: 'monk',
    job: 'Monk',
    icon: '💥',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 27,
    cooldownSec: 7.0,
    range: 85,
    description: 'Серия из 4 сокрушительных ударов по цели и соседям с общим уроном (240 + 45*Lv)% (ATK + INT).',
    type: 'ACTIVE_TARGET',
    baseFactor: 1.95,
    perLevelFactor: 0.45,
  },
  mo_asura_strike: {
    id: 'mo_asura_strike',
    name: 'Удар Азуры',
    jobId: 'monk',
    job: 'Monk',
    icon: '⚡',
    bookPrice: 1500,
    maxLevel: 5,
    spCostBase: 60,
    cooldownSec: 18.0,
    range: 65,
    description: 'Поглощает все накопленные Сферы (N=1..5). Урон: ((350 + 70*Lv)% * (ATK + MATK)) * (1 + 0.20 * N). Экранная вспышка!',
    type: 'ACTIVE_TARGET',
    baseFactor: 2.8,
    perLevelFactor: 0.7,
  },

  // Алиасы для обратной совместимости сохранений
  magnum_break: {
    id: 'magnum_break',
    name: 'Взрыв Магмы',
    jobId: 'swordsman',
    job: 'Swordsman',
    icon: '💥',
    requiredWeapon: 'MELEE_SWORD',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 22,
    cooldownSec: 9.0,
    range: 0,
    aoeRadius: 130,
    description: 'Огненный взрыв вокруг героя (180 + 35*Lv)% ATK.',
    type: 'ACTIVE_AOE',
    baseFactor: 1.45,
    perLevelFactor: 0.35,
  },
  double_strafe: {
    id: 'double_strafe',
    name: 'Двойной Выстрел',
    jobId: 'archer',
    job: 'Archer',
    icon: '🎯',
    requiredWeapon: 'RANGED_BOW',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 18,
    cooldownSec: 4.5,
    range: 320,
    description: 'Две быстрые стрелы по цели.',
    type: 'ACTIVE_TARGET',
    baseFactor: 1.0,
    perLevelFactor: 0.2,
  },
  fire_bolt: {
    id: 'fire_bolt',
    name: 'Огненный Столб',
    jobId: 'mage',
    job: 'Mage',
    icon: '🔥',
    requiredWeapon: 'MAGIC_STAFF',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 24,
    cooldownSec: 7.0,
    range: 300,
    aoeRadius: 95,
    description: 'Столб пламени под целью.',
    type: 'ACTIVE_AOE',
    baseFactor: 1.35,
    perLevelFactor: 0.35,
  },
  holy_light: {
    id: 'holy_light',
    name: 'Святой Свет',
    jobId: 'acolyte',
    job: 'Acolyte',
    icon: '✨',
    bookPrice: 400,
    maxLevel: 5,
    spCostBase: 22,
    cooldownSec: 6.0,
    range: 280,
    description: 'Луч света на врага и отхил союзников.',
    type: 'ACTIVE_TARGET',
    baseFactor: 1.3,
    perLevelFactor: 0.3,
  },
};

export class SkillSystem {
  public cooldowns: Record<string, number> = {};

  public update(dt: number): void {
    let hasChanged = false;
    for (const key of Object.keys(this.cooldowns)) {
      if (this.cooldowns[key] > 0) {
        this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
        hasChanged = true;
      }
    }
    if (hasChanged) {
      EventBus.emit('SKILL_COOLDOWNS_UPDATED', { cooldowns: { ...this.cooldowns } });
    }
  }

  public canCast(
    skillId: string,
    player: Player
  ): { ok: boolean; reason?: string } {
    const skill = SKILLS_DATABASE[skillId];
    if (!skill) return { ok: false, reason: 'Неизвестный навык' };

    // Пассивные навыки не применяются вручную
    if (skill.type === 'PASSIVE') {
      return { ok: false, reason: 'Это пассивное умение' };
    }

    // Проверка разблокировки в JobSystem
    if (!player.jobSystem.isSkillUsable(skillId)) {
      return { ok: false, reason: 'Умение не изучено или недоступно для текущей профессии!' };
    }

    if ((this.cooldowns[skillId] || 0) > 0) {
      return { ok: false, reason: `Перезарядка: ${(this.cooldowns[skillId]).toFixed(1)} сек` };
    }

    // Сокращение отката умений от Поэмы Браги Барда (-5% * L)
    const currentSp = player.currentSp;
    const spCost = skill.spCostBase;
    if (currentSp < spCost) {
      return { ok: false, reason: `Недостаточно SP (требуется ${spCost})!` };
    }

    // Проверка требуемого оружия
    if (skill.requiredWeapon) {
      const equippedArchetype = player.getEquippedWeaponArchetype();
      if (skillId === 'novice_bash') {
        if (equippedArchetype !== 'MELEE_SWORD' && equippedArchetype !== 'HOLY_MACE') {
          return { ok: false, reason: 'Для использования требуется Меч или Булава!' };
        }
      } else if (equippedArchetype !== skill.requiredWeapon) {
        const weaponNames: Record<WeaponArchetype, string> = {
          MELEE_SWORD: 'Меч',
          RANGED_BOW: 'Лук',
          MAGIC_STAFF: 'Посох',
          HOLY_MACE: 'Булава',
        };
        return { ok: false, reason: `Требуется экипировать [${weaponNames[skill.requiredWeapon]}]!` };
      }
    }

    // Проверка наличия сфер для Удар Азуры
    if (skillId === 'mo_asura_strike' && player.spiritSpheres < 1) {
      return { ok: false, reason: 'Требуется хотя бы 1 активная Духовная Сфера!' };
    }

    return { ok: true };
  }

  public castSkill(
    skillId: string,
    player: Player,
    target: Monster | null,
    monsters: Monster[],
    floatingTexts: any,
    vfx: any,
    projectiles: any,
    onMonsterDeath?: (deadMonster: Monster) => void,
    silent: boolean = false,
    screenShake?: (intensity?: number, duration?: number) => void
  ): boolean {
    const skill = SKILLS_DATABASE[skillId];
    if (!skill) return false;

    const check = this.canCast(skillId, player);
    if (!check.ok) {
      if (!silent) {
        EventBus.emit('COMBAT_LOG', { message: check.reason || 'Невозможно использовать', color: '#ef4444' });
      }
      return false;
    }

    const level = player.jobSystem.getSkillLevel(skillId) || 1;

    // Расчёт кулдауна с учетом бонусов (Бард, Наследие, Сет Архимага, Карты)
    let cdReduction = (player.crossJobBonuses.cdReductionPct || 0) + (player.cardCooldownReductionPct || 0);
    if (player.isPoemOfBragiActive) {
      const bragiLvl = player.jobSystem.getSkillLevel('ba_poem_of_bragi') || 1;
      cdReduction += bragiLvl * 5; // до -25%
    }
    if (player.activeSets.SET_ARCHMAGE >= 4) {
      cdReduction += 25; // 4-piece Архимаг: -25% КД
    }
    const finalCd = Math.max(0.5, skill.cooldownSec * (1 - Math.min(60, cdReduction) / 100));

    // Списание SP и запуск кулдауна
    player.currentSp -= skill.spCostBase;
    player.emitAllStats();
    this.cooldowns[skillId] = finalCd;

    // -----------------------------------------------------------------
    // 1. БАФФЫ И СТОЙКИ
    // -----------------------------------------------------------------

    // Стойка Барда: Поэма Браги
    if (skillId === 'ba_poem_of_bragi') {
      player.isPoemOfBragiActive = !player.isPoemOfBragiActive;
      player.puppet.triggerSkillAnimation('shout', 0.35, 0xf59e0b);
      vfx.castBuffAura(player.x, player.y, 'speed_wind');
      SoundFX.playLevelUp();
      EventBus.emit('COMBAT_LOG', {
        message: player.isPoemOfBragiActive
          ? `🎵 «Поэма Браги» (Lv.${level}) активирована! Кольцо гармонии сокращает кулдауны и лечит отряд.`
          : '🎵 «Поэма Браги» отключена.',
        color: '#f59e0b',
      });
      return true;
    }

    // Стойка Мудреца: Hindsight
    if (skillId === 'sg_hindsight') {
      player.isHindsightActive = !player.isHindsightActive;
      player.puppet.triggerSkillAnimation('shout', 0.35, 0x38bdf8);
      vfx.castBuffAura(player.x, player.y, 'hindsight');
      SoundFX.playLevelUp();
      EventBus.emit('COMBAT_LOG', {
        message: player.isHindsightActive
          ? `✨ Стойка «Hindsight» (Lv.${level}) активна! Автоатаки посохом будут вызывать стихийные заклинания.`
          : '✨ Стойка «Hindsight» отключена.',
        color: '#38bdf8',
      });
      return true;
    }

    // Призыв Духовных Сфер Монаха
    if (skillId === 'mo_spirit_spheres') {
      player.addSpiritSpheres(1);
      player.puppet.triggerSkillAnimation('shout', 0.3, 0xfbbf24);
      vfx.castBuffAura(player.x, player.y, 'grit');
      SoundFX.playLevelUp();
      floatingTexts.spawn(player.x, player.y - 20, `+1 Сфера (${player.spiritSpheres}/5)`, { color: 0xfbbf24 });
      EventBus.emit('COMBAT_LOG', {
        message: `🔮 Монах призвал Духовную Сферу (Всего: ${player.spiritSpheres} / 5)!`,
        color: '#fbbf24',
      });
      return true;
    }

    // Воля Путника
    if (skillId === 'novice_adventurer_grit') {
      player.puppet.triggerSkillAnimation('shout', 0.35, 0x38bdf8);
      vfx.castBuffAura(player.x, player.y, 'grit');
      SoundFX.playLevelUp();
      player.activeBuffs = player.activeBuffs.filter((b) => b.id !== 'buff_adventurer_grit');
      player.activeBuffs.push({
        id: 'buff_adventurer_grit',
        name: `Воля Путника (Lv.${level})`,
        icon: '👟',
        statKey: 'moveSpeed',
        value: 0.15,
        duration: 180,
        maxDuration: 180,
      });
      player.recalculateStats();
      EventBus.emit('BUFFS_UPDATED', { buffs: [...player.activeBuffs] });
      EventBus.emit('COMBAT_LOG', {
        message: `👟 Активирована «Воля Путника» (Lv.${level}): +15% бег на 180с!`,
        color: '#38bdf8',
      });
      return true;
    }

    // Несокрушимость Мечника
    if (skillId === 'sw_endure') {
      player.puppet.triggerSkillAnimation('shout', 0.38, 0xf59e0b);
      vfx.castBuffAura(player.x, player.y, 'iron_shield');
      SoundFX.playLevelUp();
      player.activeBuffs = player.activeBuffs.filter((b) => b.id !== 'buff_sw_endure');
      player.activeBuffs.push({
        id: 'buff_sw_endure',
        name: `Несокрушимость (Lv.${level})`,
        icon: '🛡️',
        statKey: 'def',
        value: 10 * level,
        duration: 60,
        maxDuration: 60,
      });
      player.recalculateStats();
      EventBus.emit('BUFFS_UPDATED', { buffs: [...player.activeBuffs] });
      EventBus.emit('COMBAT_LOG', {
        message: `🛡️ «Несокрушимость» (Lv.${level}): +${10 * level} DEF на 60с!`,
        color: '#f59e0b',
      });
      return true;
    }

    // Ускорение Клинка Рыцаря
    if (skillId === 'kn_two_hand_quicken') {
      player.puppet.triggerSkillAnimation('shout', 0.35, 0xfbbf24);
      vfx.castBuffAura(player.x, player.y, 'speed_wind');
      SoundFX.playLevelUp();
      player.activeBuffs = player.activeBuffs.filter((b) => b.id !== 'buff_kn_two_hand_quicken');
      player.activeBuffs.push({
        id: 'buff_kn_two_hand_quicken',
        name: `Ускорение Клинка (Lv.${level})`,
        icon: '⚡',
        statKey: 'aspd',
        value: 0.06 * level,
        duration: 90,
        maxDuration: 90,
      });
      player.recalculateStats();
      EventBus.emit('BUFFS_UPDATED', { buffs: [...player.activeBuffs] });
      EventBus.emit('COMBAT_LOG', {
        message: `⚡ «Ускорение Клинка» (Lv.${level}): +${6 * level}% ASPD на 90с!`,
        color: '#fbbf24',
      });
      return true;
    }

    // Зеркальный Щит Крестоносца
    if (skillId === 'cr_reflect_shield') {
      player.puppet.triggerSkillAnimation('shout', 0.35, 0xfbbf24);
      vfx.castBuffAura(player.x, player.y, 'mirror_shield');
      SoundFX.playLevelUp();
      player.activeBuffs = player.activeBuffs.filter((b) => b.id !== 'buff_cr_reflect_shield');
      player.activeBuffs.push({
        id: 'buff_cr_reflect_shield',
        name: `Зеркальный Щит (Lv.${level})`,
        icon: '🪞',
        statKey: 'def',
        value: 0,
        duration: 90,
        maxDuration: 90,
      });
      player.isReflectShieldActive = true;
      EventBus.emit('BUFFS_UPDATED', { buffs: [...player.activeBuffs] });
      EventBus.emit('COMBAT_LOG', {
        message: `🪞 «Зеркальный Щит» (Lv.${level}) активен на 90с! Мобы получают урон от ударов по щиту.`,
        color: '#fbbf24',
      });
      return true;
    }

    // Истинное Зрение Охотника
    if (skillId === 'hu_true_sight') {
      player.puppet.triggerSkillAnimation('shout', 0.35, 0x38bdf8);
      vfx.castBuffAura(player.x, player.y, 'true_sight');
      SoundFX.playLevelUp();
      player.activeBuffs = player.activeBuffs.filter((b) => b.id !== 'buff_hu_true_sight');
      player.activeBuffs.push({
        id: 'buff_hu_true_sight',
        name: `Истинное Зрение (Lv.${level})`,
        icon: '✨',
        statKey: 'critChance',
        value: 3 * level,
        duration: 90,
        maxDuration: 90,
      });
      player.recalculateStats();
      EventBus.emit('BUFFS_UPDATED', { buffs: [...player.activeBuffs] });
      EventBus.emit('COMBAT_LOG', {
        message: `✨ «Истинное Зрение» (Lv.${level}): +5 ко всем характеристикам и +${3 * level}% CRIT на 90с!`,
        color: '#38bdf8',
      });
      return true;
    }

    // Ритм Заката Барда
    if (skillId === 'ba_assassin_cross_sunset') {
      player.puppet.triggerSkillAnimation('shout', 0.35, 0xf97316);
      vfx.castBuffAura(player.x, player.y, 'speed_wind');
      SoundFX.playLevelUp();
      player.activeBuffs = player.activeBuffs.filter((b) => b.id !== 'buff_ba_sunset');
      player.activeBuffs.push({
        id: 'buff_ba_sunset',
        name: `Ритм Заката (Lv.${level})`,
        icon: '🌅',
        statKey: 'aspd',
        value: 0.04 * level,
        duration: 90,
        maxDuration: 90,
      });
      player.recalculateStats();
      EventBus.emit('BUFFS_UPDATED', { buffs: [...player.activeBuffs] });
      EventBus.emit('COMBAT_LOG', {
        message: `🌅 «Ритм Заката» (Lv.${level}): +${4 * level}% ASPD и +${5 * level} FLEE на 90с!`,
        color: '#f97316',
      });
      return true;
    }

    // Энергетический Барьер Волшебника
    if (skillId === 'wz_energy_coat') {
      player.puppet.triggerSkillAnimation('shout', 0.35, 0xc084fc);
      vfx.castBuffAura(player.x, player.y, 'energy_coat');
      SoundFX.playLevelUp();
      player.activeBuffs = player.activeBuffs.filter((b) => b.id !== 'buff_wz_energy_coat');
      player.activeBuffs.push({
        id: 'buff_wz_energy_coat',
        name: `Энерго-Барьер (Lv.${level})`,
        icon: '🛡️',
        statKey: 'def',
        value: 12 + 4 * level,
        duration: 90,
        maxDuration: 90,
      });
      player.recalculateStats();
      EventBus.emit('BUFFS_UPDATED', { buffs: [...player.activeBuffs] });
      EventBus.emit('COMBAT_LOG', {
        message: `🔮 «Энергетический Барьер» (Lv.${level}): -${12 + 4 * level}% входящего физ. урона на 90с!`,
        color: '#c084fc',
      });
      return true;
    }

    // Зачарование Стихий Мудреца
    if (skillId === 'sg_elemental_endow') {
      player.puppet.triggerSkillAnimation('shout', 0.35, 0xf97316);
      vfx.castBuffAura(player.x, player.y, 'elemental_endow');
      SoundFX.playLevelUp();
      player.activeBuffs = player.activeBuffs.filter((b) => b.id !== 'buff_sg_endow');
      player.activeBuffs.push({
        id: 'buff_sg_endow',
        name: `Зачарование Стихий (Lv.${level})`,
        icon: '🔥',
        statKey: 'matk',
        value: 0.08 * level,
        duration: 90,
        maxDuration: 90,
      });
      player.recalculateStats();
      EventBus.emit('BUFFS_UPDATED', { buffs: [...player.activeBuffs] });
      EventBus.emit('COMBAT_LOG', {
        message: `🔥 «Зачарование Стихий» (Lv.${level}): +${8 * level}% MATK и сплеш-урон автоатакам на 90с!`,
        color: '#f97316',
      });
      return true;
    }

    // Святое Благословение Аколита
    if (skillId === 'ac_blessing_agi') {
      player.puppet.triggerSkillAnimation('pray', 0.38, 0x38bdf8);
      vfx.castBuffAura(player.x, player.y, 'blessing');
      SoundFX.playLevelUp();
      player.activeBuffs = player.activeBuffs.filter((b) => b.id !== 'buff_ac_blessing');
      player.activeBuffs.push({
        id: 'buff_ac_blessing',
        name: `Благословение (Lv.${level})`,
        icon: '🕊️',
        statKey: 'aspd',
        value: 0.03 * level,
        duration: 120,
        maxDuration: 120,
      });
      player.recalculateStats();
      EventBus.emit('BUFFS_UPDATED', { buffs: [...player.activeBuffs] });
      EventBus.emit('COMBAT_LOG', {
        message: `🕊️ «Благословение» (Lv.${level}): +${2 + 2 * level} STR/INT/DEX/AGI на 120с!`,
        color: '#38bdf8',
      });
      return true;
    }

    // Барьер Кирие и Магнификат Приста
    if (skillId === 'pr_kyrie_magnific') {
      player.puppet.triggerSkillAnimation('pray', 0.4, 0xfef08a);
      vfx.castBuffAura(player.x, player.y, 'kyrie');
      SoundFX.playHeal();
      const shieldHp = Math.floor(player.derivedStats.maxHp * (0.15 + 0.04 * level));
      player.activeBuffs = player.activeBuffs.filter((b) => b.id !== 'buff_pr_kyrie');
      player.activeBuffs.push({
        id: 'buff_pr_kyrie',
        name: `Кирие Элейсон (Lv.${level})`,
        icon: '🛡️',
        statKey: 'maxHp',
        value: 0,
        duration: 60,
        maxDuration: 60,
      });
      player.shieldBarrierHp = shieldHp;
      player.shieldBarrierMaxHp = shieldHp;
      floatingTexts.spawn(player.x, player.y - 24, `Барьер +${shieldHp}🛡️`, { color: 0xfef08a });
      EventBus.emit('COMBAT_LOG', {
        message: `🛡️ «Кирие Элейсон» наложило святой щит на ${shieldHp} HP и удвоило регенерацию на 60с!`,
        color: '#fef08a',
      });
      return true;
    }

    // Первая помощь
    if (skillId === 'novice_first_aid') {
      player.puppet.triggerSkillAnimation('pray', 0.35, 0x4ade80);
      vfx.castHealSparkles(player.x, player.y);
      const healPercent = 0.20 + level * 0.05;
      const healAmount = Math.floor(player.derivedStats.maxHp * healPercent);
      player.heal(healAmount);
      SoundFX.playHeal();
      floatingTexts.spawn(player.x, player.y - 20, `+${healAmount}💚`, { isHeal: true, color: 0x4ade80 });
      EventBus.emit('COMBAT_LOG', {
        message: `🩹 Первая помощь (Lv.${level}) восстановила +${healAmount} HP!`,
        color: '#4ade80',
      });
      return true;
    }

    // -----------------------------------------------------------------
    // 2. АОЕ-СПОСОБНОСТИ
    // -----------------------------------------------------------------

    // Взрыв Магмы / Magnum Break
    if (skillId === 'sw_magnum_break' || skillId === 'magnum_break') {
      const radius = 130;
      player.puppet.triggerSkillAnimation('spin', 0.45, 0xef4444);
      SoundFX.playCrit();
      screenShake?.(8, 0.25);
      vfx.castMagnumBreak(player.x, player.y, radius);
      let hits = 0;
      const dmg = Math.floor(player.derivedStats.atk * (1.8 + 0.35 * level));
      const nearby = [...monsters];
      for (const m of nearby) {
        if (!m.isDead() && !m.isDestroyed && Math.hypot(m.x - player.x, m.y - player.y) <= radius) {
          hits++;
          m.takeDamage(dmg, player.x, player.y);
          floatingTexts.spawn(m.x, m.y - 25, `${dmg}🔥`, { isCrit: true, color: 0xf97316 });
          if (m.isDead() && !m.isDestroyed && onMonsterDeath) onMonsterDeath(m);
        }
      }
      EventBus.emit('COMBAT_LOG', { message: `🔥 «Взрыв Магмы» (Lv.${level}) поразил ${hits} врагов!`, color: '#f97316' });
      return true;
    }

    // Великий Крест / Grand Cross
    if (skillId === 'cr_grand_cross') {
      player.puppet.triggerSkillAnimation('pray', 0.55, 0xfef08a);
      SoundFX.playCrit();
      screenShake?.(7, 0.3);
      const waveDmg = Math.floor((player.derivedStats.atk + player.derivedStats.matk) * (1.4 + 0.30 * level));
      vfx.castGrandCross(player.x, player.y, 160, () => {
        let hitCount = 0;
        const nearby = [...monsters];
        for (const m of nearby) {
          if (!m.isDead() && !m.isDestroyed && Math.hypot(m.x - player.x, m.y - player.y) <= 160) {
            hitCount++;
            m.takeDamage(waveDmg, player.x, player.y);
            floatingTexts.spawn(m.x, m.y - 25, `${waveDmg}✝️`, { isCrit: true, color: 0xfef08a });
            if (m.isDead() && !m.isDestroyed && onMonsterDeath) onMonsterDeath(m);
          }
        }
        if (hitCount > 0) {
          const heal = Math.floor(player.derivedStats.maxHp * 0.03 * hitCount);
          player.heal(heal);
          floatingTexts.spawn(player.x, player.y - 18, `+${heal}💚`, { isHeal: true, color: 0x4ade80 });
        }
      });
      EventBus.emit('COMBAT_LOG', { message: `✝️ «Великий Крест» (Lv.${level}) обрушил волны святого света!`, color: '#fef08a' });
      return true;
    }

    // Ливень Стрел / Arrow Shower
    if (skillId === 'ar_arrow_shower') {
      SoundFX.playHit();
      const radius = 120;
      const targetX = target ? target.x : player.x + (player.puppet.facingDir || 1) * 120;
      const targetY = target ? target.y : player.y;
      player.puppet.facingDir = targetX >= player.x ? 1 : -1;
      player.puppet.triggerSkillAnimation('shot', 0.45, 0x38bdf8);
      screenShake?.(4, 0.15);
      const dmg = Math.floor(player.derivedStats.atk * (1.6 + 0.30 * level));

      vfx.castArrowShower(targetX, targetY, radius, () => {
        let hits = 0;
        const nearby = [...monsters];
        for (const m of nearby) {
          if (!m.isDead() && !m.isDestroyed && Math.hypot(m.x - targetX, m.y - targetY) <= radius) {
            hits++;
            m.takeDamage(dmg, player.x, player.y);
            floatingTexts.spawn(m.x, m.y - 22, `${dmg}🌧️`, { color: 0x38bdf8 });
            if (m.isDead() && !m.isDestroyed && onMonsterDeath) onMonsterDeath(m);
          }
        }
        EventBus.emit('COMBAT_LOG', { message: `🌧️ «Ливень Стрел» (Lv.${level}) накрыл ${hits} врагов!`, color: '#38bdf8' });
      });
      return true;
    }

    // Разрывной Капкан / Blast Mine
    if (skillId === 'hu_blast_mine') {
      SoundFX.playHit();
      const trapX = target ? target.x : player.x;
      const trapY = target ? target.y : player.y;
      player.puppet.triggerSkillAnimation('shout', 0.3, 0xf97316);
      floatingTexts.spawn(trapX, trapY - 10, `💣 МИНА`, { color: 0xf97316 });

      vfx.castBlastMine(trapX, trapY, () => {
        SoundFX.playCrit();
        screenShake?.(9, 0.25);
        const dmg = Math.floor(player.derivedStats.atk * (2.2 + 0.40 * level));
        let hits = 0;
        const nearby = [...monsters];
        for (const m of nearby) {
          if (!m.isDead() && !m.isDestroyed && Math.hypot(m.x - trapX, m.y - trapY) <= 110) {
            hits++;
            m.takeDamage(dmg, trapX, trapY);
            floatingTexts.spawn(m.x, m.y - 25, `${dmg}💥`, { isCrit: true, color: 0xf97316 });
            if (m.isDead() && !m.isDestroyed && onMonsterDeath) onMonsterDeath(m);
          }
        }
        EventBus.emit('COMBAT_LOG', { message: `💥 «Разрывной Капкан» сдетонировал по ${hits} целям!`, color: '#f97316' });
      });
      return true;
    }

    // Огненный Столб / Fire Pillar
    if (skillId === 'mg_fire_pillar' || skillId === 'fire_bolt') {
      SoundFX.playCrit();
      const centerTargetX = target ? target.x : player.x;
      const centerTargetY = target ? target.y : player.y;
      player.puppet.facingDir = centerTargetX >= player.x ? 1 : -1;
      player.puppet.triggerSkillAnimation('magic', 0.4, 0xef4444);
      screenShake?.(6, 0.2);
      vfx.castFirePillar(centerTargetX, centerTargetY, () => {
        const dmg = Math.floor(player.derivedStats.matk * (1.7 + 0.35 * level));
        let hits = 0;
        const nearby = [...monsters];
        for (const m of nearby) {
          if (!m.isDead() && !m.isDestroyed && Math.hypot(m.x - centerTargetX, m.y - centerTargetY) <= 95) {
            hits++;
            m.takeDamage(dmg, player.x, player.y);
            floatingTexts.spawn(m.x, m.y - 24, `${dmg}🔥`, { isCrit: true, color: 0xef4444 });
            if (m.isDead() && !m.isDestroyed && onMonsterDeath) onMonsterDeath(m);
          }
        }
        EventBus.emit('COMBAT_LOG', { message: `🔥 «Огненный Столб» (Lv.${level}) испепелил ${hits} мобов!`, color: '#ef4444' });
      });
      return true;
    }

    // Ледяной Буран / Storm Gust
    if (skillId === 'wz_storm_gust') {
      SoundFX.playCrit();
      const cx = target ? target.x : player.x;
      const cy = target ? target.y : player.y;
      player.puppet.facingDir = cx >= player.x ? 1 : -1;
      player.puppet.triggerSkillAnimation('magic', 0.5, 0x38bdf8);
      screenShake?.(5, 0.25);
      const tickDmg = Math.floor(player.derivedStats.matk * (1.2 + 0.25 * level));

      vfx.castStormGust(cx, cy, 170, () => {
        const nearby = [...monsters];
        for (const m of nearby) {
          if (!m.isDead() && !m.isDestroyed && Math.hypot(m.x - cx, m.y - cy) <= 170) {
            m.takeDamage(tickDmg, cx, cy);
            floatingTexts.spawn(m.x, m.y - 22, `${tickDmg}❄️`, { color: 0x38bdf8 });
            if (Math.random() <= 0.35) {
              m.stunTimer = 1.5;
              floatingTexts.spawn(m.x, m.y - 36, 'ЗАМОРОЗКА!', { color: 0xa5f3fc });
            }
            if (m.isDead() && !m.isDestroyed && onMonsterDeath) onMonsterDeath(m);
          }
        }
      });
      EventBus.emit('COMBAT_LOG', { message: `❄️ «Ледяной Буран» (Lv.${level}) обрушился на врагов!`, color: '#38bdf8' });
      return true;
    }

    // Метеоритный Дождь / Meteor Storm
    if (skillId === 'wz_meteor_storm') {
      SoundFX.playCrit();
      const cx = target ? target.x : player.x;
      const cy = target ? target.y : player.y;
      player.puppet.facingDir = cx >= player.x ? 1 : -1;
      player.puppet.triggerSkillAnimation('magic', 0.55, 0xf97316);
      screenShake?.(10, 0.3);
      const meteorDmg = Math.floor(player.derivedStats.matk * (1.5 + 0.30 * level));
      const meteorCount = 3 + Math.floor(level / 2);

      vfx.castMeteorStorm(cx, cy, 180, meteorCount, () => {
        screenShake?.(7, 0.2);
        const nearby = [...monsters];
        for (const m of nearby) {
          if (!m.isDead() && !m.isDestroyed && Math.hypot(m.x - cx, m.y - cy) <= 180) {
            m.takeDamage(meteorDmg, cx, cy);
            floatingTexts.spawn(m.x, m.y - 25, `${meteorDmg}☄️`, { isCrit: true, color: 0xf97316 });
            if (m.isDead() && !m.isDestroyed && onMonsterDeath) onMonsterDeath(m);
          }
        }
      });
      EventBus.emit('COMBAT_LOG', { message: `☄️ «Метеоритный Дождь» (Lv.${level}): выпущено ${meteorCount} метеоров!`, color: '#f97316' });
      return true;
    }

    // Копьё Геи / Earth Spike
    if (skillId === 'sg_earth_spike') {
      SoundFX.playHit();
      const cx = target ? target.x : player.x;
      const cy = target ? target.y : player.y;
      player.puppet.facingDir = cx >= player.x ? 1 : -1;
      player.puppet.triggerSkillAnimation('magic', 0.4, 0xa16207);
      screenShake?.(7, 0.22);
      const dmg = Math.floor(player.derivedStats.matk * (2.0 + 0.35 * level));

      vfx.castEarthSpike(cx, cy, () => {
        let hits = 0;
        const nearby = [...monsters];
        for (const m of nearby) {
          if (!m.isDead() && !m.isDestroyed && Math.hypot(m.x - cx, m.y - cy) <= 110) {
            hits++;
            m.takeDamage(dmg, cx, cy);
            floatingTexts.spawn(m.x, m.y - 22, `${dmg}⛰️`, { color: 0xa16207 });
            if (m.isDead() && !m.isDestroyed && onMonsterDeath) onMonsterDeath(m);
          }
        }
        EventBus.emit('COMBAT_LOG', { message: `⛰️ «Копьё Геи» (Lv.${level}) пробило защиту ${hits} врагов!`, color: '#a16207' });
      });
      return true;
    }

    // Освящённое Святилище / Sanctuary
    if (skillId === 'pr_sanctuary') {
      player.puppet.triggerSkillAnimation('pray', 0.5, 0x4ade80);
      SoundFX.playHeal();
      const healTick = Math.floor(player.derivedStats.maxHp * (0.06 + 0.015 * level));
      const holyDmg = Math.floor((player.derivedStats.matk + player.derivedStats.atk * 0.5) * (1.1 + 0.22 * level));

      vfx.castSanctuary(player.x, player.y, 140, () => {
        player.heal(healTick);
        floatingTexts.spawn(player.x, player.y - 20, `+${healTick}💚`, { isHeal: true, color: 0x4ade80 });

        const nearby = [...monsters];
        for (const m of nearby) {
          if (!m.isDead() && !m.isDestroyed && Math.hypot(m.x - player.x, m.y - player.y) <= 140) {
            m.takeDamage(holyDmg, player.x, player.y);
            floatingTexts.spawn(m.x, m.y - 22, `${holyDmg}✨`, { color: 0xfef08a });
            if (m.isDead() && !m.isDestroyed && onMonsterDeath) onMonsterDeath(m);
          }
        }
      });
      EventBus.emit('COMBAT_LOG', { message: `⛪ «Освящённое Святилище» (Lv.${level}) создало святую зону на 5с!`, color: '#4ade80' });
      return true;
    }

    // Великий Экзорцизм / Magnus Exorcismus
    if (skillId === 'pr_magnus_exorcismus') {
      player.puppet.triggerSkillAnimation('pray', 0.55, 0xfef08a);
      SoundFX.playCrit();
      screenShake?.(5, 0.2);
      const tickDmg = Math.floor((player.derivedStats.matk + player.derivedStats.atk * 0.6) * (1.3 + 0.25 * level));

      vfx.castMagnusExorcismus(player.x, player.y, 180, () => {
        screenShake?.(4, 0.15);
        const nearby = [...monsters];
        for (const m of nearby) {
          if (!m.isDead() && !m.isDestroyed && Math.hypot(m.x - player.x, m.y - player.y) <= 180) {
            m.takeDamage(tickDmg, player.x, player.y);
            floatingTexts.spawn(m.x, m.y - 24, `${tickDmg}☀️`, { isCrit: true, color: 0xfef08a });
            if (m.isDead() && !m.isDestroyed && onMonsterDeath) onMonsterDeath(m);
          }
        }
      });
      EventBus.emit('COMBAT_LOG', { message: `☀️ «Великий Экзорцизм» (Lv.${level}) выжигает нечисть 4 волнами!`, color: '#fef08a' });
      return true;
    }

    // -----------------------------------------------------------------
    // 3. ЦЕЛЕВЫЕ НАВЫКИ (ТРЕБУЮТ ЖИВОГО ВРАГА)
    // -----------------------------------------------------------------
    if (!target || target.isDead()) {
      EventBus.emit('COMBAT_LOG', { message: 'Выберите цель для атаки!', color: '#94a3b8' });
      return false;
    }

    // Поворачиваем персонажа лицом к цели
    player.puppet.facingDir = target.x >= player.x ? 1 : -1;

    // Мощный выпад Новичка
    if (skillId === 'novice_bash') {
      player.puppet.triggerSkillAnimation('slash', 0.28, 0xf59e0b);
      vfx.castBashSlash(target.x, target.y, 0xf59e0b, 1.0);
      screenShake?.(4, 0.15);
      SoundFX.playCrit();
      const dmg = Math.floor(player.derivedStats.atk * (1.5 + 0.25 * level));
      target.takeDamage(dmg, player.x, player.y);
      floatingTexts.spawn(target.x, target.y - 22, `${dmg}⚔️`, { isCrit: true, color: 0xf59e0b });
      if (target.isDead() && onMonsterDeath) onMonsterDeath(target);
      return true;
    }

    // Отбрасывающий выстрел Новичка
    if (skillId === 'novice_power_shot') {
      player.puppet.triggerSkillAnimation('shot', 0.35, 0xf59e0b);
      SoundFX.playHit();
      const dmg = Math.floor(player.derivedStats.atk * (1.4 + 0.20 * level));
      projectiles.spawnArrow(player.x, player.y - 15, target, (hitTarget: Monster | null) => {
        if (hitTarget && !hitTarget.isDead()) {
          hitTarget.takeDamage(dmg, player.x, player.y);
          floatingTexts.spawn(hitTarget.x, hitTarget.y - 20, `${dmg}🏹`, { color: 0xf59e0b });
          const dx = hitTarget.x - player.x;
          const dy = hitTarget.y - player.y;
          const dist = Math.hypot(dx, dy) || 1;
          hitTarget.x += (dx / dist) * 90;
          hitTarget.y += (dy / dist) * 90;
          if (hitTarget.isDead() && onMonsterDeath) onMonsterDeath(hitTarget);
        }
      });
      return true;
    }

    // Магический импульс Новичка
    if (skillId === 'novice_arcane_bolt') {
      player.puppet.triggerSkillAnimation('magic', 0.35, 0xa855f7);
      SoundFX.playHit();
      const boltCount = level >= 5 ? 3 : level >= 3 ? 2 : 1;
      const dmg = Math.floor(player.derivedStats.matk * 0.9);
      for (let i = 0; i < boltCount; i++) {
        projectiles.spawnArcaneBolt(player.x, player.y - 15, target, (hitTarget: Monster | null) => {
          if (hitTarget && !hitTarget.isDead()) {
            hitTarget.takeDamage(dmg, player.x, player.y);
            floatingTexts.spawn(hitTarget.x, hitTarget.y - 20, `${dmg}🔮`, { color: 0xa855f7 });
            if (hitTarget.isDead() && onMonsterDeath) onMonsterDeath(hitTarget);
          }
        }, i * 140);
      }
      return true;
    }

    // Сокрушительный Боулинг Рыцаря (Bowling Bash)
    if (skillId === 'kn_bowling_bash') {
      player.puppet.triggerSkillAnimation('slash', 0.38, 0xf59e0b);
      vfx.castBowlingBash(player.x, player.y, target.x, target.y);
      screenShake?.(8, 0.22);
      SoundFX.playCrit();
      const hitDmg = Math.floor(player.derivedStats.atk * (1.3 + 0.25 * level));
      const collisionDmg = Math.floor(player.derivedStats.atk * 1.0);

      // Двойной удар + урон столкновения
      target.takeDamage(hitDmg * 2 + collisionDmg, player.x, player.y);
      floatingTexts.spawn(target.x, target.y - 24, `${hitDmg * 2 + collisionDmg}🎳`, { isCrit: true, color: 0xf59e0b });

      // Сталкивание соседних врагов в кучу
      const nearby = [...monsters];
      for (const m of nearby) {
        if (m !== target && !m.isDead() && !m.isDestroyed && Math.hypot(m.x - target.x, m.y - target.y) <= 85) {
          m.takeDamage(hitDmg + collisionDmg, target.x, target.y);
          m.x = target.x + (Math.random() - 0.5) * 20;
          m.y = target.y + (Math.random() - 0.5) * 20;
          floatingTexts.spawn(m.x, m.y - 20, `${hitDmg + collisionDmg}💥`, { color: 0xf97316 });
          if (m.isDead() && !m.isDestroyed && onMonsterDeath) onMonsterDeath(m);
        }
      }
      if (target.isDead() && !target.isDestroyed && onMonsterDeath) onMonsterDeath(target);
      return true;
    }

    // Спиральный Пробой Рыцаря (Spiral Pierce)
    if (skillId === 'kn_spiral_pierce') {
      player.puppet.triggerSkillAnimation('thrust', 0.42, 0xf59e0b);
      SoundFX.playCrit();
      screenShake?.(5, 0.18);
      vfx.castSpiralPierce(player.x, player.y - 10, target.x, target.y);
      const isBoss = target.def.isElite || target.def.isMvp;
      const singleHitDmg = Math.floor(player.derivedStats.atk * (0.75 + 0.15 * level) * (isBoss ? 1.4 : 1.0));

      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          if (!target.isDead()) {
            target.takeDamage(singleHitDmg, player.x, player.y);
            floatingTexts.spawn(target.x, target.y - 20, `${singleHitDmg}🌀`, { color: 0xf59e0b });
            if (target.isDead() && onMonsterDeath) onMonsterDeath(target);
          }
        }, i * 65);
      }
      EventBus.emit('COMBAT_LOG', { message: `🌀 «Спиральный Пробой» (Lv.${level}) пронзил [${target.def.name}] 5 ударами!`, color: '#f59e0b' });
      return true;
    }

    // Цепной Удар Щитом Крестоносца (Shield Chain)
    if (skillId === 'cr_shield_chain') {
      player.puppet.triggerSkillAnimation('thrust', 0.35, 0xfacc15);
      SoundFX.playHit();
      screenShake?.(5, 0.15);
      const totalDef = player.derivedStats.def || 0;
      const hitDmg = Math.floor((player.derivedStats.atk + totalDef) * (1.1 + 0.20 * level));

      vfx.castShieldChain(player.x, player.y - 12, target.x, target.y, () => {
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            if (!target.isDead()) {
              target.takeDamage(hitDmg, player.x, player.y);
              floatingTexts.spawn(target.x, target.y - 20, `${hitDmg}🔗`, { color: 0xfef08a });
              if (target.isDead() && onMonsterDeath) onMonsterDeath(target);
            }
          }, i * 80);
        }
        target.stunTimer = 1.5;
        floatingTexts.spawn(target.x, target.y - 34, 'ОГЛУШЕНИЕ!', { color: 0xfacc15 });
      });
      return true;
    }

    // Двойной выстрел Лучника
    if (skillId === 'ar_double_strafe' || skillId === 'double_strafe') {
      player.puppet.triggerSkillAnimation('shot', 0.35, 0xfacc15);
      SoundFX.playHit();
      const dmg = Math.floor(player.derivedStats.atk * (1.2 + 0.20 * level));
      projectiles.spawnArrow(player.x, player.y - 15, target, (hitTarget: Monster | null) => {
        if (hitTarget && !hitTarget.isDead()) {
          hitTarget.takeDamage(dmg, player.x, player.y);
          floatingTexts.spawn(hitTarget.x, hitTarget.y - 15, `${dmg}🎯`, { color: 0xfacc15 });
          if (hitTarget.isDead() && onMonsterDeath) onMonsterDeath(hitTarget);
        }
      });
      setTimeout(() => {
        if (!target.isDead()) {
          projectiles.spawnArrow(player.x, player.y - 15, target, (hitTarget: Monster | null) => {
            if (hitTarget && !hitTarget.isDead()) {
              hitTarget.takeDamage(dmg, player.x, player.y);
              floatingTexts.spawn(hitTarget.x, hitTarget.y - 25, `${dmg}🎯`, { color: 0xfacc15 });
              if (hitTarget.isDead() && onMonsterDeath) onMonsterDeath(hitTarget);
            }
          });
        }
      }, 140);
      return true;
    }

    // Соколиный Штурм Охотника (Falcon Assault)
    if (skillId === 'hu_falcon_assault') {
      player.puppet.triggerSkillAnimation('shot', 0.38, 0xf59e0b);
      SoundFX.playCrit();
      screenShake?.(5, 0.18);
      const hitDmg = Math.floor(player.derivedStats.atk * (0.9 + 0.20 * level));

      // Если есть Сокол, запускаем его пике
      if (player.falcon) {
        player.falcon.triggerDive(target.x, target.y, () => {
          for (let i = 0; i < 5; i++) {
            if (!target.isDead()) {
              target.takeDamage(hitDmg, target.x, target.y);
              floatingTexts.spawn(target.x, target.y - 20 - i * 4, `${hitDmg}🦅`, { isCrit: true, color: 0xf59e0b });
              if (target.isDead() && onMonsterDeath) onMonsterDeath(target);
            }
          }
        });
      } else {
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            if (!target.isDead()) {
              target.takeDamage(hitDmg, target.x, target.y);
              floatingTexts.spawn(target.x, target.y - 20, `${hitDmg}🦅`, { isCrit: true, color: 0xf59e0b });
              if (target.isDead() && onMonsterDeath) onMonsterDeath(target);
            }
          }, i * 60);
        }
      }
      EventBus.emit('COMBAT_LOG', { message: `🦅 «Соколиный Штурм» (Lv.${level}) нанес 5 сокрушительных ударов!`, color: '#f59e0b' });
      return true;
    }

    // Вулкан Мелодий Барда (Arrow Vulcan)
    if (skillId === 'ba_arrow_vulcan') {
      player.puppet.triggerSkillAnimation('shot', 0.48, 0xf43f5e);
      SoundFX.playHit();
      vfx.castArrowVulcan(player.x, player.y, target.x, target.y, () => {
        screenShake?.(4, 0.12);
      });
      const dmg = Math.floor(player.derivedStats.atk * (0.95 + 0.18 * level));
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (!target.isDead()) {
            projectiles.spawnArrow(player.x, player.y - 15, target, (hitTarget: Monster | null) => {
              if (hitTarget && !hitTarget.isDead()) {
                hitTarget.takeDamage(dmg, player.x, player.y);
                floatingTexts.spawn(hitTarget.x, hitTarget.y - 20, `${dmg}🎶`, { color: 0xf43f5e });
                if (hitTarget.isDead() && onMonsterDeath) onMonsterDeath(hitTarget);
              }
            });
          }
        }, i * 110);
      }
      return true;
    }

    // Грозовой Разряд Мага (Lightning Bolt)
    if (skillId === 'mg_lightning_bolt') {
      player.puppet.triggerSkillAnimation('magic', 0.35, 0x38bdf8);
      SoundFX.playCrit();
      screenShake?.(5, 0.18);
      const dmg = Math.floor(player.derivedStats.matk * (1.45 + 0.25 * level));
      vfx.castLightningBolt(target.x, target.y, () => {
        if (!target.isDead()) {
          target.takeDamage(dmg, player.x, player.y);
          floatingTexts.spawn(target.x, target.y - 25, `${dmg}⚡`, { isCrit: true, color: 0x38bdf8 });
          if (target.isDead() && onMonsterDeath) onMonsterDeath(target);
        }
      });
      // Цепной удар до 2 соседей
      let chainCount = 0;
      const nearby = [...monsters];
      for (const m of nearby) {
        if (m !== target && !m.isDead() && !m.isDestroyed && Math.hypot(m.x - target.x, m.y - target.y) <= 120 && chainCount < 2) {
          chainCount++;
          setTimeout(() => {
            if (!m.isDead() && !m.isDestroyed) {
              vfx.castLightningBolt(m.x, m.y);
              m.takeDamage(dmg, target.x, target.y);
              floatingTexts.spawn(m.x, m.y - 20, `${dmg}⚡`, { color: 0x38bdf8 });
              if (m.isDead() && !m.isDestroyed && onMonsterDeath) onMonsterDeath(m);
            }
          }, 150 * chainCount);
        }
      }
      return true;
    }

    // Святой Свет Аколита
    if (skillId === 'ac_holy_light' || skillId === 'holy_light') {
      player.puppet.triggerSkillAnimation('pray', 0.38, 0x38bdf8);
      SoundFX.playHit();
      screenShake?.(4, 0.15);
      vfx.castHolyLight(target.x, target.y);
      const dmg = Math.floor((player.derivedStats.matk + player.derivedStats.atk * 0.5) * (1.6 + 0.30 * level));
      target.takeDamage(dmg, player.x, player.y);
      floatingTexts.spawn(target.x, target.y - 22, `${dmg}✨`, { color: 0x38bdf8 });
      if (target.isDead() && onMonsterDeath) onMonsterDeath(target);

      const healAmt = Math.floor(player.derivedStats.maxHp * (0.12 + 0.03 * level));
      player.heal(healAmt);
      floatingTexts.spawn(player.x, player.y - 18, `+${healAmt}💚`, { isHeal: true, color: 0x4ade80 });
      return true;
    }

    // Цепное Сокрушение Монаха (Chain Crush)
    if (skillId === 'mo_chain_crush') {
      player.puppet.triggerSkillAnimation('flurry', 0.45, 0xf59e0b);
      SoundFX.playCrit();
      screenShake?.(5, 0.18);
      vfx.castChainCrush(player.x, player.y, target.x, target.y);
      const totalDmg = Math.floor((player.derivedStats.atk + player.derivedStats.matk) * (2.4 + 0.45 * level));
      const hitDmg = Math.floor(totalDmg / 4);

      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (!target.isDead()) {
            target.takeDamage(hitDmg, player.x, player.y);
            floatingTexts.spawn(target.x, target.y - 20, `${hitDmg}👊`, { isCrit: true, color: 0xf59e0b });
            if (target.isDead() && onMonsterDeath) onMonsterDeath(target);
          }
        }, i * 75);
      }
      return true;
    }

    // Удар Азуры Монаха (Asura Strike)
    if (skillId === 'mo_asura_strike') {
      player.puppet.triggerSkillAnimation('flurry', 0.55, 0xfef08a);
      SoundFX.playCrit();
      screenShake?.(14, 0.45);
      const spheres = Math.max(1, player.spiritSpheres);
      player.spiritSpheres = 0; // Поглощает все сферы!
      player.emitAllStats();

      const baseMultiplier = 3.5 + 0.70 * level;
      const sphereMultiplier = 1 + 0.20 * spheres; // при 5 сферах +100% урона (удвоение!)
      const asuraDamage = Math.floor(
        (player.derivedStats.atk + player.derivedStats.matk) * baseMultiplier * sphereMultiplier
      );

      vfx.triggerAsuraStrike(target.x, target.y, () => {
        if (!target.isDead()) {
          target.takeDamage(asuraDamage, player.x, player.y);
          floatingTexts.spawn(target.x, target.y - 32, `${asuraDamage}💥 АЗУРА!`, {
            isCrit: true,
            color: 0xfef08a,
          });
          if (target.isDead() && onMonsterDeath) onMonsterDeath(target);
        }
      });
      EventBus.emit('COMBAT_LOG', {
        message: `⚡ «УДАР АЗУРЫ» (Lv.${level}) поглотил ${spheres} сфер и нанёс ${asuraDamage.toLocaleString()} урона!`,
        color: '#fef08a',
      });
      return true;
    }

    return false;
  }
}
