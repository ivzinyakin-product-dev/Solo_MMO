import { AlchemyRecipe, ActiveBuff } from '../types/game.types';
import { Player } from '../entities/Player';
import { EventBus } from '../core/EventBus';
import { SoundFX } from '../core/SoundFX';

export const ALCHEMY_RECIPES: AlchemyRecipe[] = [
  {
    id: 'concentration_potion',
    name: 'Зелье концентрации',
    icon: '⚡',
    description: 'Ускоряет реакцию и скорость ударов (+15% ASPD на 5 минут).',
    ingredients: [
      { itemId: 'jellopy', count: 3 },
      { itemId: 'apple', count: 1 },
    ],
    buffEffect: {
      id: 'buff_concentration',
      name: 'Концентрация',
      icon: '⚡',
      statKey: 'aspd',
      value: 0.15,
      duration: 300,
    },
  },
  {
    id: 'awakening_potion',
    name: 'Зелье берсерка',
    icon: '🔥',
    description: 'Пробуждает ярость, повышая физическую мощь (+20% ATK на 5 минут).',
    ingredients: [
      { itemId: 'fluff', count: 5 },
      { itemId: 'green_herb', count: 2 },
    ],
    buffEffect: {
      id: 'buff_awakening',
      name: 'Берсерк',
      icon: '🔥',
      statKey: 'atk',
      value: 0.2,
      duration: 300,
    },
  },
  {
    id: 'vitality_draught',
    name: 'Эликсир живучести',
    icon: '❤️',
    description: 'Укрепляет тело и приумножает жизненные силы (+15% MaxHP на 5 минут).',
    ingredients: [
      { itemId: 'orange_potion', count: 2 },
      { itemId: 'green_herb', count: 4 },
    ],
    buffEffect: {
      id: 'buff_vitality',
      name: 'Живучесть',
      icon: '❤️',
      statKey: 'maxHp',
      value: 0.15,
      duration: 300,
    },
  },
  {
    id: 'craft_orange_potion',
    name: 'Варка Оранжевого зелья',
    icon: '🧪',
    description: 'Алхимическое объединение трав и эссенции в мощный целебный отвар (+120 HP).',
    ingredients: [
      { itemId: 'red_potion', count: 2 },
      { itemId: 'jellopy', count: 2 },
    ],
    resultItemId: 'orange_potion',
    resultCount: 1,
  },
  {
    id: 'mana_draught',
    name: 'Эликсир синей маны',
    icon: '🪻',
    description: 'Концентрированная настойка синей травы (+20 MATK на 15 минут).',
    ingredients: [
      { itemId: 'blue_herb', count: 2 },
      { itemId: 'jellopy', count: 2 },
    ],
    buffEffect: {
      id: 'buff_mana_draught',
      name: 'Сияние маны',
      icon: '🪻',
      statKey: 'matk',
      value: 20,
      duration: 900,
    },
  },
  {
    id: 'greater_healing_brew',
    name: 'Целебный отвар красной травы',
    icon: '🌺',
    description: 'Варка двух порций концентрированного оранжевого зелья из свежей красной травы.',
    ingredients: [
      { itemId: 'red_herb', count: 3 },
      { itemId: 'apple', count: 1 },
    ],
    resultItemId: 'orange_potion',
    resultCount: 2,
  },
  {
    id: 'adventurer_feast',
    name: 'Сытный походный обед',
    icon: '🍲',
    description: 'Питательное блюдо для дальних странствий (+250 MaxHP на 15 минут).',
    ingredients: [
      { itemId: 'apple', count: 2 },
      { itemId: 'green_herb', count: 2 },
      { itemId: 'solid_shell', count: 1 },
    ],
    buffEffect: {
      id: 'buff_adventurer_feast',
      name: 'Сытный обед',
      icon: '🍲',
      statKey: 'maxHp',
      value: 0.2,
      duration: 900,
    },
  },
  {
    id: 'craft_red_potion',
    name: 'Варка Красного зелья (Т1)',
    icon: '🌺',
    description: 'Приготовление двух порций целебного красного зелья из свежей красной травы (+50 HP).',
    ingredients: [
      { itemId: 'red_herb', count: 2 },
      { itemId: 'jellopy', count: 1 },
    ],
    resultItemId: 'red_potion',
    resultCount: 2,
  },
  {
    id: 'craft_aspd_potion',
    name: 'Варка Концентрата скорости (Т3)',
    icon: '⚡',
    description: 'Дистилляция янтарной травы в концентрат боевой ярости (+20% к скорости атаки ASPD на 5 мин).',
    ingredients: [
      { itemId: 'amber_herb', count: 2 },
      { itemId: 'scrap_metal', count: 1 },
    ],
    resultItemId: 'aspd_potion',
    resultCount: 1,
  },
  {
    id: 'craft_white_potion',
    name: 'Варка Большого белого зелья (Т4)',
    icon: '🌼',
    description: 'Мощный восстанавливающий отвар из белой травы, восстанавливающий 350 единиц здоровья.',
    ingredients: [
      { itemId: 'white_herb', count: 2 },
      { itemId: 'blue_herb', count: 1 },
    ],
    resultItemId: 'white_potion',
    resultCount: 1,
  },
  {
    id: 'craft_yggdrasil_elixir',
    name: 'Синтез Эликсира Иггдрасиля (Т5)',
    icon: '🌟',
    description: 'Легендарная ампула из Звёздного цветка. Мгновенно восполняет 100% максимального запаса здоровья и маны!',
    ingredients: [
      { itemId: 'star_flower', count: 2 },
      { itemId: 'white_potion', count: 1 },
      { itemId: 'magic_dust', count: 2 },
    ],
    resultItemId: 'yggdrasil_elixir',
    resultCount: 1,
  },
];

export class AlchemySystem {
  public activeBuffs: ActiveBuff[] = [];
  public autoCraftEnabled: boolean = false;
  private autoCraftTimer: number = 5;
  private buffSyncTimer: number = 0;

  constructor(initialBuffs?: ActiveBuff[]) {
    if (initialBuffs) {
      this.activeBuffs = [...initialBuffs];
    }
  }

  public canCraft(recipe: AlchemyRecipe, player: Player): boolean {
    for (const ing of recipe.ingredients) {
      const item = player.inventory.find((i) => i.itemId === ing.itemId);
      if (!item || item.count < ing.count) return false;
    }
    return true;
  }

  public craft(recipe: AlchemyRecipe, player: Player): boolean {
    if (!this.canCraft(recipe, player)) return false;

    // Списание ингредиентов
    for (const ing of recipe.ingredients) {
      const item = player.inventory.find((i) => i.itemId === ing.itemId);
      if (item) {
        player.removeItem(item.uid, ing.count);
      }
    }

    SoundFX.playLevelUp();

    // Результат: предмет
    if (recipe.resultItemId) {
      player.addItem(recipe.resultItemId, recipe.resultCount || 1);
      EventBus.emit('COMBAT_LOG', {
        message: `⚗️ Алхимия: Создано [${recipe.name}] x${recipe.resultCount || 1}!`,
        color: '#38bdf8',
      });
    }

    // Результат: бафф
    if (recipe.buffEffect) {
      this.activeBuffs = player.activeBuffs;
      const effect = recipe.buffEffect;
      const existingIdx = this.activeBuffs.findIndex((b) => b.id === effect.id);
      if (existingIdx !== -1) {
        this.activeBuffs[existingIdx].duration = effect.duration;
      } else {
        this.activeBuffs.push({
          id: effect.id,
          name: effect.name,
          icon: effect.icon,
          statKey: effect.statKey,
          value: effect.value,
          duration: effect.duration,
          maxDuration: effect.duration,
        });
      }

      player.recalculateStats();
      EventBus.emit('BUFFS_UPDATED', { buffs: [...this.activeBuffs] });
      EventBus.emit('COMBAT_LOG', {
        message: `✨ Активирован бафф: [${effect.name}] (${effect.duration} сек)!`,
        color: '#fbbf24',
      });
    }

    return true;
  }

  public update(dt: number, player: Player): void {
    this.activeBuffs = player.activeBuffs;

    // Обновление таймеров баффов
    let hasExpired = false;
    for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
      const b = this.activeBuffs[i];
      b.duration -= dt;
      if (b.duration <= 0) {
        this.activeBuffs.splice(i, 1);
        hasExpired = true;
      }
    }

    if (hasExpired) {
      player.recalculateStats();
      EventBus.emit('BUFFS_UPDATED', { buffs: [...this.activeBuffs] });
    } else if (this.activeBuffs.length > 0) {
      this.buffSyncTimer += dt;
      if (this.buffSyncTimer >= 1.0) {
        this.buffSyncTimer = 0;
        EventBus.emit('BUFFS_UPDATED', { buffs: [...this.activeBuffs] });
      }
    }

    // Авто-крафт
    if (this.autoCraftEnabled) {
      this.autoCraftTimer -= dt;
      if (this.autoCraftTimer <= 0) {
        this.autoCraftTimer = 4;
        for (const recipe of ALCHEMY_RECIPES) {
          if (this.canCraft(recipe, player)) {
            this.craft(recipe, player);
            break;
          }
        }
      }
    }
  }
}
