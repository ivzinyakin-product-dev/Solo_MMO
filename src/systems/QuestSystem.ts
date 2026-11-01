import { SimpleQuestDef } from '../types/game.types';
import { Player } from '../entities/Player';
import { EventBus } from '../core/EventBus';
import { SoundFX } from '../core/SoundFX';

export interface QuestState {
  def: SimpleQuestDef;
  isAccepted: boolean;
  currentCount: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export const QUESTS_DATABASE: SimpleQuestDef[] = [
  // ==========================================
  // Зона 1: Изумрудная Поляна (Тир 1, Ур. 1–6)
  // ==========================================
  {
    id: 'quest_porings',
    title: 'Очистка полей: Поринги',
    description: 'Победите 10 розовых Порингов в окрестностях лагеря.',
    zoneId: 'zone_meadow',
    objectiveType: 'KILL_MONSTER',
    targetId: 'poring',
    requiredCount: 10,
    rewardGold: 500,
    rewardBaseExp: 150,
    rewardJobExp: 80,
    rewardItems: [{ itemId: 'red_potion', count: 3 }],
  },
  {
    id: 'quest_fabre',
    title: 'Сбор шёлка: Фабре',
    description: 'Уничтожьте 8 шелкопрядов Фабре для деревенских ткачей.',
    zoneId: 'zone_meadow',
    objectiveType: 'KILL_MONSTER',
    targetId: 'fabre',
    requiredCount: 8,
    rewardGold: 600,
    rewardBaseExp: 200,
    rewardJobExp: 100,
    rewardItems: [{ itemId: 'red_potion', count: 3 }],
  },
  {
    id: 'quest_lunatic',
    title: 'Озорные кролики: Лунатики',
    description: 'Поймайте и усмирите 8 пушистых Лунатиков на полянке.',
    zoneId: 'zone_meadow',
    objectiveType: 'KILL_MONSTER',
    targetId: 'lunatic',
    requiredCount: 8,
    rewardGold: 750,
    rewardBaseExp: 250,
    rewardJobExp: 120,
    rewardItems: [{ itemId: 'red_potion', count: 3 }],
  },
  {
    id: 'bounty_golden_bug',
    title: 'Контракт: Золотой Жук',
    description: 'Уничтожьте 2 Элитных Золотых Жуков на Изумрудной Поляне.',
    zoneId: 'zone_meadow',
    objectiveType: 'KILL_MONSTER',
    targetId: 'golden_bug',
    requiredCount: 2,
    rewardGold: 3500,
    rewardBaseExp: 1500,
    rewardJobExp: 800,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'copper_ore', count: 5 },
      { itemId: 'elite_essence_t1', count: 1 },
    ],
  },
  {
    id: 'bounty_poring_king',
    title: 'Королевский заказ: Король Порингов (MVP 👑)',
    description: 'Сразите гигантского Короля Порингов на Изумрудной Поляне!',
    zoneId: 'zone_meadow',
    objectiveType: 'KILL_MONSTER',
    targetId: 'poring_king',
    requiredCount: 1,
    rewardGold: 7500,
    rewardBaseExp: 3500,
    rewardJobExp: 1800,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'phracon', count: 3 },
      { itemId: 'mvp_soul_t1', count: 1 },
    ],
  },

  // ==========================================
  // Зона 2: Шепчущий Грибной Лес (Тир 1, Ур. 7–12)
  // ==========================================
  {
    id: 'quest_poison_spores',
    title: 'Опасные токсины: Спорогрибы',
    description: 'Добудьте ядовитые железы, уничтожив 10 Ядовитых Спорогрибов.',
    zoneId: 'zone_forest',
    objectiveType: 'KILL_MONSTER',
    targetId: 'poison_spore',
    requiredCount: 10,
    rewardGold: 1200,
    rewardBaseExp: 600,
    rewardJobExp: 300,
    rewardItems: [{ itemId: 'orange_potion', count: 3 }],
  },
  {
    id: 'quest_willow',
    title: 'Древесные духи: Ивовые Энты',
    description: 'Успокойте 8 оживших Ивовых Энтов в чаще леса.',
    zoneId: 'zone_forest',
    objectiveType: 'KILL_MONSTER',
    targetId: 'willow',
    requiredCount: 8,
    rewardGold: 1500,
    rewardBaseExp: 800,
    rewardJobExp: 400,
    rewardItems: [{ itemId: 'orange_potion', count: 3 }],
  },
  {
    id: 'quest_wolf',
    title: 'Лесная угроза: Волки',
    description: 'Защитите торговый тракт, истребив 10 свирепых Волков.',
    zoneId: 'zone_forest',
    objectiveType: 'KILL_MONSTER',
    targetId: 'wolf',
    requiredCount: 10,
    rewardGold: 2000,
    rewardBaseExp: 1100,
    rewardJobExp: 550,
    rewardItems: [{ itemId: 'copper_ore', count: 4 }],
  },
  {
    id: 'bounty_wolf_leader',
    title: 'Контракт: Вожак Стаи',
    description: 'Устраните 2 Элитных Вожаков волчьей стаи в Шепчущем Лесу.',
    zoneId: 'zone_forest',
    objectiveType: 'KILL_MONSTER',
    targetId: 'wolf_leader',
    requiredCount: 2,
    rewardGold: 5500,
    rewardBaseExp: 2800,
    rewardJobExp: 1400,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'phracon', count: 2 },
      { itemId: 'elite_essence_t1', count: 1 },
    ],
  },
  {
    id: 'bounty_elder_willow',
    title: 'Королевский заказ: Древний Энт (MVP 👑)',
    description: 'Сокрушите Древнего Энта, пробудившегося в глубине леса!',
    zoneId: 'zone_forest',
    objectiveType: 'KILL_MONSTER',
    targetId: 'elder_willow',
    requiredCount: 1,
    rewardGold: 11000,
    rewardBaseExp: 5500,
    rewardJobExp: 2800,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'phracon', count: 4 },
      { itemId: 'mvp_soul_t1', count: 1 },
    ],
  },

  // ==========================================
  // Зона 3: Затопленный Храм и Топи (Тир 2, Ур. 13–19)
  // ==========================================
  {
    id: 'quest_roda_frog',
    title: 'Болотная охота: Жабы Рода',
    description: 'Очистите берега храма от 10 ядовитых Жаб Рода.',
    zoneId: 'zone_sunken_ruins',
    objectiveType: 'KILL_MONSTER',
    targetId: 'roda_frog',
    requiredCount: 10,
    rewardGold: 2800,
    rewardBaseExp: 1600,
    rewardJobExp: 800,
    rewardItems: [{ itemId: 'orange_potion', count: 4 }],
  },
  {
    id: 'quest_hydra',
    title: 'Глубинные щупальца: Гидры',
    description: 'Истребите 8 ядовитых Гидр в затопленных залах.',
    zoneId: 'zone_sunken_ruins',
    objectiveType: 'KILL_MONSTER',
    targetId: 'hydra',
    requiredCount: 8,
    rewardGold: 3400,
    rewardBaseExp: 2000,
    rewardJobExp: 1000,
    rewardItems: [{ itemId: 'orange_potion', count: 4 }],
  },
  {
    id: 'quest_vadon',
    title: 'Твёрдый панцирь: Крабы Вадон',
    description: 'Соберите прочные панцири, победив 10 Крабов Вадон.',
    zoneId: 'zone_sunken_ruins',
    objectiveType: 'KILL_MONSTER',
    targetId: 'vadon',
    requiredCount: 10,
    rewardGold: 4000,
    rewardBaseExp: 2500,
    rewardJobExp: 1200,
    rewardItems: [{ itemId: 'iron_ore', count: 3 }],
  },
  {
    id: 'bounty_sluice_guardian',
    title: 'Контракт: Страж Шлюза',
    description: 'Уничтожьте 2 Элитных Стражей Шлюза в затопленных коридорах.',
    zoneId: 'zone_sunken_ruins',
    objectiveType: 'KILL_MONSTER',
    targetId: 'sluice_guardian',
    requiredCount: 2,
    rewardGold: 8000,
    rewardBaseExp: 4500,
    rewardJobExp: 2400,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'phracon', count: 4 },
      { itemId: 'elite_essence_t2', count: 1 },
    ],
  },
  {
    id: 'bounty_mvp_drake',
    title: 'Королевский заказ: Капитан Дрейк (MVP 👑)',
    description: 'Сразите проклятого пиратского капитана Дрейка в сердце Затопленного Храма!',
    zoneId: 'zone_sunken_ruins',
    objectiveType: 'KILL_MONSTER',
    targetId: 'mvp_drake',
    requiredCount: 1,
    rewardGold: 16000,
    rewardBaseExp: 8000,
    rewardJobExp: 4500,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'oridecon', count: 2 },
      { itemId: 'elite_essence_t2', count: 1 },
      { itemId: 'mvp_soul_t2', count: 1 },
    ],
  },

  // ==========================================
  // Зона 4: Песчаный Каньон и Муравьиный Улей (Тир 2, Ур. 20–26)
  // ==========================================
  {
    id: 'quest_scorpion',
    title: 'Песчаные жала: Скорпионы',
    description: 'Уничтожьте 10 ядовитых Скорпионов в песчаных расщелинах.',
    zoneId: 'zone_ant_canyon',
    objectiveType: 'KILL_MONSTER',
    targetId: 'scorpion',
    requiredCount: 10,
    rewardGold: 5000,
    rewardBaseExp: 3200,
    rewardJobExp: 1600,
    rewardItems: [{ itemId: 'orange_potion', count: 5 }],
  },
  {
    id: 'quest_andre',
    title: 'Угроза караванам: Муравьи Андре',
    description: 'Отразите набег 10 Муравьёв-Солдат Андре на торговый путь.',
    zoneId: 'zone_ant_canyon',
    objectiveType: 'KILL_MONSTER',
    targetId: 'andre',
    requiredCount: 10,
    rewardGold: 6000,
    rewardBaseExp: 3800,
    rewardJobExp: 1900,
    rewardItems: [{ itemId: 'iron_ore', count: 4 }],
  },
  {
    id: 'quest_sand_golem',
    title: 'Оживший камень: Песчаные Големы',
    description: 'Сокрушите 8 монолитных Песчаных Големов в глубине каньона.',
    zoneId: 'zone_ant_canyon',
    objectiveType: 'KILL_MONSTER',
    targetId: 'sand_golem',
    requiredCount: 8,
    rewardGold: 7500,
    rewardBaseExp: 4500,
    rewardJobExp: 2200,
    rewardItems: [{ itemId: 'iron_ore', count: 5 }],
  },
  {
    id: 'bounty_ant_centurion',
    title: 'Контракт: Центурион Муравьёв',
    description: 'Уничтожьте 2 Элитных Центурионов Улья в Песчаном Каньоне.',
    zoneId: 'zone_ant_canyon',
    objectiveType: 'KILL_MONSTER',
    targetId: 'ant_centurion',
    requiredCount: 2,
    rewardGold: 12000,
    rewardBaseExp: 6000,
    rewardJobExp: 3500,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'oridecon', count: 2 },
      { itemId: 'magic_dust', count: 5 },
      { itemId: 'elite_essence_t2', count: 1 },
    ],
  },
  {
    id: 'bounty_maya_queen',
    title: 'Королевский заказ: Королева Майя (MVP 👑)',
    description: 'Сокрушите Королеву Муравьёв Майю в тронном зале Улья!',
    zoneId: 'zone_ant_canyon',
    objectiveType: 'KILL_MONSTER',
    targetId: 'maya_queen',
    requiredCount: 1,
    rewardGold: 25000,
    rewardBaseExp: 12000,
    rewardJobExp: 7000,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'oridecon', count: 3 },
      { itemId: 'magic_dust', count: 8 },
      { itemId: 'mvp_soul_t2', count: 1 },
    ],
  },

  // ==========================================
  // Зона 5: Крепость Орков и Шахты (Тир 3, Ур. 27–34)
  // ==========================================
  {
    id: 'quest_orc_warrior',
    title: 'Орочья осада: Орки-Воины',
    description: 'Сразите 10 бронированных Орков-Воинов у ворот крепости.',
    zoneId: 'zone_orc_fortress',
    objectiveType: 'KILL_MONSTER',
    targetId: 'orc_warrior',
    requiredCount: 10,
    rewardGold: 8500,
    rewardBaseExp: 5500,
    rewardJobExp: 2800,
    rewardItems: [{ itemId: 'white_potion', count: 3 }],
  },
  {
    id: 'quest_orc_archer',
    title: 'Огонь со стен: Орки-Лучники',
    description: 'Подавите стрелковую позицию, уничтожив 10 Орков-Лучников.',
    zoneId: 'zone_orc_fortress',
    objectiveType: 'KILL_MONSTER',
    targetId: 'orc_archer',
    requiredCount: 10,
    rewardGold: 9500,
    rewardBaseExp: 6500,
    rewardJobExp: 3200,
    rewardItems: [{ itemId: 'white_potion', count: 3 }],
  },
  {
    id: 'quest_orc_shaman',
    title: 'Тёмные ритуалы: Орки-Шаманы',
    description: 'Прервите проклятые обряды, уничтожив 8 Орков-Шаманов.',
    zoneId: 'zone_orc_fortress',
    objectiveType: 'KILL_MONSTER',
    targetId: 'orc_shaman',
    requiredCount: 8,
    rewardGold: 11000,
    rewardBaseExp: 7500,
    rewardJobExp: 3800,
    rewardItems: [{ itemId: 'oridecon', count: 3 }],
  },
  {
    id: 'bounty_orc_warlord',
    title: 'Контракт: Орочий Воевода',
    description: 'Устраните 2 Элитных Орочьих Воевод в Крепости Орков.',
    zoneId: 'zone_orc_fortress',
    objectiveType: 'KILL_MONSTER',
    targetId: 'orc_warlord',
    requiredCount: 2,
    rewardGold: 18000,
    rewardBaseExp: 10000,
    rewardJobExp: 6000,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'oridecon', count: 3 },
      { itemId: 'scrap_metal', count: 8 },
      { itemId: 'elite_essence_t3', count: 1 },
    ],
  },
  {
    id: 'bounty_orc_lord',
    title: 'Королевский заказ: Повелитель Орков (MVP 👑)',
    description: 'Сразите свирепого Повелителя Орков в глубине шахт!',
    zoneId: 'zone_orc_fortress',
    objectiveType: 'KILL_MONSTER',
    targetId: 'orc_lord',
    requiredCount: 1,
    rewardGold: 35000,
    rewardBaseExp: 18000,
    rewardJobExp: 10000,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'oridecon', count: 4 },
      { itemId: 'mvp_soul_t3', count: 1 },
    ],
  },

  // ==========================================
  // Зона 6: Проклятый Монастырь Гластхейм (Тир 3, Ур. 35–41)
  // ==========================================
  {
    id: 'quest_skeleton_knight',
    title: 'Вечный дозор: Скелеты-Рыцари',
    description: 'Упокойте 10 Скелетов-Рыцарей, охраняющих руины монастыря.',
    zoneId: 'zone_cursed_abbey',
    objectiveType: 'KILL_MONSTER',
    targetId: 'skeleton_knight',
    requiredCount: 10,
    rewardGold: 12000,
    rewardBaseExp: 9000,
    rewardJobExp: 4500,
    rewardItems: [{ itemId: 'white_potion', count: 4 }],
  },
  {
    id: 'quest_whisper',
    title: 'Бестелесный шёпот: Уисперы',
    description: 'Развейте 10 блуждающих призраков Уиспер в катакомбах.',
    zoneId: 'zone_cursed_abbey',
    objectiveType: 'KILL_MONSTER',
    targetId: 'whisper',
    requiredCount: 10,
    rewardGold: 13000,
    rewardBaseExp: 10500,
    rewardJobExp: 5200,
    rewardItems: [{ itemId: 'white_potion', count: 4 }],
  },
  {
    id: 'quest_mimic',
    title: 'Обманчивая добыча: Мимики',
    description: 'Обезвредьте 8 хищных Мимиков, притворяющихся ларцами.',
    zoneId: 'zone_cursed_abbey',
    objectiveType: 'KILL_MONSTER',
    targetId: 'mimic',
    requiredCount: 8,
    rewardGold: 15000,
    rewardBaseExp: 12000,
    rewardJobExp: 6000,
    rewardItems: [{ itemId: 'elunium', count: 3 }],
  },
  {
    id: 'bounty_abbey_executioner',
    title: 'Контракт: Палач Аббатства',
    description: 'Уничтожьте 2 Элитных Палачей в катакомбах Гластхейма.',
    zoneId: 'zone_cursed_abbey',
    objectiveType: 'KILL_MONSTER',
    targetId: 'abbey_executioner',
    requiredCount: 2,
    rewardGold: 22000,
    rewardBaseExp: 14000,
    rewardJobExp: 8000,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'elunium', count: 3 },
      { itemId: 'magic_dust', count: 10 },
      { itemId: 'elite_essence_t3', count: 1 },
    ],
  },
  {
    id: 'bounty_dark_lord',
    title: 'Королевский заказ: Тёмный Лорд (MVP 👑)',
    description: 'Изгоните Тёмного Лорда Иллюзий из Монастыря Гластхейм!',
    zoneId: 'zone_cursed_abbey',
    objectiveType: 'KILL_MONSTER',
    targetId: 'dark_lord',
    requiredCount: 1,
    rewardGold: 40000,
    rewardBaseExp: 25000,
    rewardJobExp: 15000,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'elunium', count: 5 },
      { itemId: 'mvp_soul_t3', count: 1 },
    ],
  },

  // ==========================================
  // Зона 7: Заводная Башня Древних (Тир 4, Ур. 42–53)
  // ==========================================
  {
    id: 'quest_punk',
    title: 'Бунт механизмов: Панки',
    description: 'Остановите 10 взбесившихся Заводных Стражей Панк.',
    zoneId: 'zone_clock_tower',
    objectiveType: 'KILL_MONSTER',
    targetId: 'punk',
    requiredCount: 10,
    rewardGold: 16000,
    rewardBaseExp: 14000,
    rewardJobExp: 7000,
    rewardItems: [{ itemId: 'white_potion', count: 5 }],
  },
  {
    id: 'quest_alarm',
    title: 'Звон времени: Алармы',
    description: 'Обезвредьте 10 заводных механизмов Аларм.',
    zoneId: 'zone_clock_tower',
    objectiveType: 'KILL_MONSTER',
    targetId: 'alarm',
    requiredCount: 10,
    rewardGold: 18000,
    rewardBaseExp: 16500,
    rewardJobExp: 8200,
    rewardItems: [{ itemId: 'white_potion', count: 5 }],
  },
  {
    id: 'quest_bathory',
    title: 'Ведьмин шабаш: Батори',
    description: 'Пресеките колдовство 8 Архимагов Теней Батори.',
    zoneId: 'zone_clock_tower',
    objectiveType: 'KILL_MONSTER',
    targetId: 'bathory',
    requiredCount: 8,
    rewardGold: 20000,
    rewardBaseExp: 19000,
    rewardJobExp: 9500,
    rewardItems: [{ itemId: 'oridecon', count: 4 }],
  },
  {
    id: 'bounty_time_keeper',
    title: 'Контракт: Хранитель Времени',
    description: 'Устраните 2 Элитных Хранителей Времени в Заводной Башне.',
    zoneId: 'zone_clock_tower',
    objectiveType: 'KILL_MONSTER',
    targetId: 'time_keeper',
    requiredCount: 2,
    rewardGold: 28000,
    rewardBaseExp: 20000,
    rewardJobExp: 12000,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'oridecon', count: 4 },
      { itemId: 'star_core', count: 1 },
      { itemId: 'elite_essence_t4', count: 1 },
    ],
  },
  {
    id: 'bounty_stormy_knight',
    title: 'Королевский заказ: Рыцарь Бури (MVP 👑)',
    description: 'Победите грозного Рыцаря Бури на вершине Заводной Башни!',
    zoneId: 'zone_clock_tower',
    objectiveType: 'KILL_MONSTER',
    targetId: 'stormy_knight',
    requiredCount: 1,
    rewardGold: 45000,
    rewardBaseExp: 32000,
    rewardJobExp: 20000,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'oridecon', count: 6 },
      { itemId: 'star_core', count: 2 },
      { itemId: 'mvp_soul_t4', count: 1 },
    ],
  },

  // ==========================================
  // Зона 8: Вулкан Ифрита и Храм Драконов (Тир 5, Ур. 54–70)
  // ==========================================
  {
    id: 'quest_kaho',
    title: 'Ярость магмы: Кахо',
    description: 'Укротите 10 Лавовых Импов Кахо у кратера вулкана.',
    zoneId: 'zone_dragon_volcano',
    objectiveType: 'KILL_MONSTER',
    targetId: 'kaho',
    requiredCount: 10,
    rewardGold: 22000,
    rewardBaseExp: 22000,
    rewardJobExp: 11000,
    rewardItems: [{ itemId: 'white_potion', count: 6 }],
  },
  {
    id: 'quest_petit',
    title: 'Огненные крылья: Виверны Петит',
    description: 'Истребите 10 свирепых Огненных Виверн Петит.',
    zoneId: 'zone_dragon_volcano',
    objectiveType: 'KILL_MONSTER',
    targetId: 'petit',
    requiredCount: 10,
    rewardGold: 25000,
    rewardBaseExp: 26000,
    rewardJobExp: 13000,
    rewardItems: [{ itemId: 'white_potion', count: 6 }],
  },
  {
    id: 'quest_ferus',
    title: 'Драконья гвардия: Ферусы',
    description: 'Сразите 8 закалённых Драконидов-Гвардейцев Ферус.',
    zoneId: 'zone_dragon_volcano',
    objectiveType: 'KILL_MONSTER',
    targetId: 'ferus',
    requiredCount: 8,
    rewardGold: 28000,
    rewardBaseExp: 30000,
    rewardJobExp: 15000,
    rewardItems: [{ itemId: 'dragonite_ore', count: 4 }],
  },
  {
    id: 'bounty_fire_dragonid',
    title: 'Контракт: Пламенный Драконид',
    description: 'Устраните 2 Элитных Пламенных Драконидов на огненных уступах.',
    zoneId: 'zone_dragon_volcano',
    objectiveType: 'KILL_MONSTER',
    targetId: 'fire_dragonid',
    requiredCount: 2,
    rewardGold: 35000,
    rewardBaseExp: 38000,
    rewardJobExp: 22000,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'star_core', count: 2 },
      { itemId: 'elite_essence_t5', count: 1 },
    ],
  },
  {
    id: 'bounty_ifrit',
    title: 'Величайший Триумф: Дракон Ифрит (MVP 👑)',
    description: 'Сразите Первородного Дракона Ифрита в сердце Вулкана!',
    zoneId: 'zone_dragon_volcano',
    objectiveType: 'KILL_MONSTER',
    targetId: 'ifrit',
    requiredCount: 1,
    rewardGold: 55000,
    rewardBaseExp: 50000,
    rewardJobExp: 35000,
    isEliteBounty: true,
    rewardItems: [
      { itemId: 'oridecon', count: 8 },
      { itemId: 'elunium', count: 8 },
      { itemId: 'star_core', count: 4 },
      { itemId: 'mvp_soul_t5', count: 1 },
    ],
  },
];

export class QuestSystem {
  public quests: Record<string, QuestState> = {};

  constructor(
    savedProgress?: Record<string, { isAccepted?: boolean; currentCount: number; isClaimed: boolean }>
  ) {
    // Миграция старых ID заданий из предыдущих версий
    if (savedProgress) {
      if (savedProgress['quest_spores'] && !savedProgress['quest_willow']) {
        savedProgress['quest_willow'] = savedProgress['quest_spores'];
      }
      if (savedProgress['quest_skeletons'] && !savedProgress['quest_skeleton_knight']) {
        savedProgress['quest_skeleton_knight'] = savedProgress['quest_skeletons'];
      }
      if (savedProgress['quest_mvp_drake'] && !savedProgress['bounty_mvp_drake']) {
        savedProgress['bounty_mvp_drake'] = savedProgress['quest_mvp_drake'];
      }
    }

    for (const qDef of QUESTS_DATABASE) {
      const saved = savedProgress?.[qDef.id];
      const isAccepted = saved?.isAccepted || false;
      const count = saved?.currentCount || 0;
      const claimed = saved?.isClaimed || false;
      this.quests[qDef.id] = {
        def: qDef,
        isAccepted,
        currentCount: count,
        isCompleted: count >= qDef.requiredCount,
        isClaimed: claimed,
      };
    }
  }

  public acceptQuest(questId: string): boolean {
    const q = this.quests[questId];
    if (!q || q.isAccepted) return false;

    q.isAccepted = true;
    SoundFX.playCampToggle();
    EventBus.emit('COMBAT_LOG', {
      message: `📜 Вы взяли заказ: [${q.def.title}]! Цель: ${q.def.description}`,
      color: '#facc15',
    });
    this.emitUpdate();
    return true;
  }

  public recordKill(monsterId: string): void {
    let changed = false;

    for (const qId of Object.keys(this.quests)) {
      const q = this.quests[qId];
      // Засчитываем прогресс ТОЛЬКО для принятых игроком и еще не сданных заданий!
      if (!q.isAccepted || q.isClaimed) continue;
      if (q.def.objectiveType === 'KILL_MONSTER' && q.def.targetId === monsterId) {
        if (q.currentCount < q.def.requiredCount) {
          q.currentCount++;
          changed = true;
          if (q.currentCount >= q.def.requiredCount) {
            q.isCompleted = true;
            SoundFX.playLevelUp();
            EventBus.emit('COMBAT_LOG', {
              message: `📜 Заказ выполнен: [${q.def.title}]! Заберите награду на Доске Заказов!`,
              color: '#4ade80',
            });
          }
        }
      }
    }

    if (changed) {
      this.emitUpdate();
    }
  }

  public claimReward(questId: string, player: Player): boolean {
    const q = this.quests[questId];
    if (!q || !q.isCompleted || q.isClaimed) {
      return false;
    }

    q.isClaimed = true;
    player.addZeny(q.def.rewardGold);
    player.gainBaseExp(q.def.rewardBaseExp);
    player.gainJobExp(q.def.rewardJobExp);

    if (q.def.rewardItemId) {
      player.addItem(q.def.rewardItemId, 2);
    }
    if (q.def.rewardItems) {
      for (const item of q.def.rewardItems) {
        player.addItem(item.itemId, item.count);
      }
    }

    SoundFX.playLevelUp();
    EventBus.emit('COMBAT_LOG', {
      message: `✨ Награда за [${q.def.title}]: +${q.def.rewardGold} Zeny, +${q.def.rewardBaseExp} Base EXP, +${q.def.rewardJobExp} Job EXP!`,
      color: '#38bdf8',
    });

    this.emitUpdate();
    return true;
  }

  public resetEliteBounty(questId: string): boolean {
    const q = this.quests[questId];
    if (!q || !q.def.isEliteBounty || !q.isClaimed) {
      return false;
    }

    q.isAccepted = true;
    q.isCompleted = false;
    q.isClaimed = false;
    q.currentCount = 0;

    SoundFX.playCampToggle();
    EventBus.emit('COMBAT_LOG', {
      message: `🔄 Вы повторно взяли Королевский контракт: [${q.def.title}]!`,
      color: '#fbbf24',
    });
    this.emitUpdate();
    return true;
  }

  public emitUpdate(): void {
    EventBus.emit('QUESTS_UPDATED', {
      quests: Object.values(this.quests),
    });
  }

  public serialize(): Record<string, { isAccepted: boolean; currentCount: number; isClaimed: boolean }> {
    const result: Record<string, { isAccepted: boolean; currentCount: number; isClaimed: boolean }> = {};
    for (const [id, q] of Object.entries(this.quests)) {
      result[id] = {
        isAccepted: q.isAccepted,
        currentCount: q.currentCount,
        isClaimed: q.isClaimed,
      };
    }
    return result;
  }
}
