import { PlayerSaveData, JobId, EquipSlot, InventoryItem } from '../types/game.types';
import { Player } from '../entities/Player';
import { JobSystem } from '../systems/JobSystem';
import { ITEMS_DATABASE } from '../data/items.data';
import { ZONES_DATABASE } from '../data/zones.data';
import { getSlotsForGrade } from '../systems/CraftingSystem';
import { EventBus } from './EventBus';
import type { GameWorld } from './GameWorld';

const SAVE_KEY = 'midgard_camp_save_v7';
const CURRENT_VERSION = 7;

export class SaveManager {
  private static autoSaveInterval: number | null = null;
  private static beforeUnloadHandler: (() => void) | null = null;
  private static isSavingDisabled: boolean = false;
  private static worldRef: GameWorld | null = null;

  public static registerWorld(world: GameWorld | null): void {
    this.worldRef = world;
  }

  public static getSaveData(player: Player): PlayerSaveData {
    const world = this.worldRef;
    return {
      version: CURRENT_VERSION,
      level: player.level,
      jobLevel: player.jobLevel,
      jobClass: player.jobClass,
      baseExp: player.baseExp,
      jobExp: player.jobExp,
      statPoints: player.statPoints,
      skillPoints: 0,
      zeny: player.zeny,
      stats: { ...player.baseStats },
      autoPotionPercent: player.autoPotionPercent,
      equipped: { ...player.equipped },
      inventory: [...player.inventory],
      unlockedCards: [...player.unlockedCards],
      bestiaryKills: { ...player.bestiaryKills },
      currentZoneId: player.currentZoneId,
      campLevel: world ? world.marketStall.campLevel : 1,
      stallSlots: world ? [...world.marketStall.slots] : undefined,
      hasCompanion: world ? world.companion.isHired : undefined,
      activeBuffs: [...player.activeBuffs],
      jobs: { ...player.jobSystem.jobs },
      activeJobId: player.jobSystem.activeJobId,
      chosenFirstJobId: player.jobSystem.chosenFirstJobId,
      chosenSecondJobId: player.jobSystem.chosenSecondJobId,
      questsProgress: world ? world.questSystem.serialize() : undefined,
      interactedPois: world ? Array.from(world.interactedPois) : undefined,
      tradeVolume: world ? world.economySystem.tradeVolume : 0,
      bountyContracts: world ? [...world.economySystem.bountyContracts] : undefined,
      blacksmithLevel: world ? world.craftingSystem.blacksmithLevel : 1,
      blacksmithExp: world ? world.craftingSystem.blacksmithExp : 0,
      autoSkillsEnabled: player.autoSkillsEnabled,
      hotbarSlots: [...player.hotbarSlots],
      jobHotbars: { ...player.jobHotbars },
    };
  }

  public static save(player: Player, notify: boolean = false): boolean {
    if (this.isSavingDisabled) {
      return false;
    }
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }

    try {
      const data = this.getSaveData(player);
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      if (notify) {
        EventBus.emit('COMBAT_LOG', {
          message: '💾 Игра успешно сохранена!',
          color: '#38bdf8',
        });
      }
      return true;
    } catch (e) {
      console.error('Ошибка при сохранении игры:', e);
      return false;
    }
  }

  public static load(): PlayerSaveData | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    try {
      // Принудительно очищаем все старые версии сохранений (v1 - v6 и любые другие)
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('midgard_camp_save_') || key.startsWith('midgard_') || key.toLowerCase().includes('save')) && key !== SAVE_KEY) {
          localStorage.removeItem(key);
        }
      }

      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;

      const data = JSON.parse(raw) as PlayerSaveData;
      if (data && data.version === CURRENT_VERSION) {
        return data;
      }
      return null;
    } catch (e) {
      console.error('Ошибка при загрузке сохранения:', e);
      return null;
    }
  }

  public static applyToPlayer(player: Player, data: PlayerSaveData): void {
    player.level = Math.max(1, data.level || 1);
    player.baseExp = data.baseExp || 0;
    player.statPoints = data.statPoints ?? 0;
    if (data.zeny !== undefined) {
      player.zeny = data.zeny;
    }

    // Восстановление прогрессии классов или плавная миграция v1 -> v2
    if (data.jobs && data.activeJobId) {
      player.jobSystem = new JobSystem(data.jobs, data.activeJobId, data.chosenFirstJobId, data.chosenSecondJobId);
    } else {
      const activeJobId = (data.jobClass ? data.jobClass.toLowerCase() : 'novice') as JobId;
      const initialJobs: Partial<Record<JobId, any>> = {};
      if (activeJobId !== 'novice') {
        initialJobs.novice = { jobLevel: 10, jobExp: 0, skillPoints: 0 };
        initialJobs[activeJobId] = {
          jobLevel: Math.max(1, data.jobLevel || 1),
          jobExp: data.jobExp || 0,
          skillPoints: 2,
        };
      } else {
        initialJobs.novice = {
          jobLevel: Math.max(1, data.jobLevel || 1),
          jobExp: data.jobExp || 0,
          skillPoints: 2,
        };
      }
      player.jobSystem = new JobSystem(initialJobs, activeJobId, data.chosenFirstJobId, data.chosenSecondJobId);
    }

    if (data.stats) {
      player.baseStats = {
        str: data.stats.str ?? 5,
        agi: data.stats.agi ?? 5,
        vit: data.stats.vit ?? 5,
        int: data.stats.int ?? 5,
        dex: data.stats.dex ?? 5,
        luk: data.stats.luk ?? 5,
      };
    }

    if (data.inventory && Array.isArray(data.inventory)) {
      player.inventory = [...data.inventory];
    }
    if (data.equipped && typeof data.equipped === 'object') {
      const rawEquipped = data.equipped as any;
      if (rawEquipped.accessory && !rawEquipped.accessory1) {
        rawEquipped.accessory1 = rawEquipped.accessory;
        delete rawEquipped.accessory;
      }
      player.equipped = {
        weapon: rawEquipped.weapon || null,
        offhand: rawEquipped.offhand || null,
        head: rawEquipped.head || null,
        armor: rawEquipped.armor || null,
        garment: rawEquipped.garment || null,
        footgear: rawEquipped.footgear || null,
        accessory1: rawEquipped.accessory1 || null,
        accessory2: rawEquipped.accessory2 || null,
      };
    }

    // Нормализация предметов для RO Ребаланса Патч 3.5
    const normalizeItem = (item: InventoryItem | null) => {
      if (!item) return;
      if (item.itemId.startsWith('craft_')) {
        item.itemId = item.itemId.replace('craft_', '');
      }
      const def = ITEMS_DATABASE[item.itemId];
      if (item.tier === undefined || (def?.tier && item.tier < def.tier)) item.tier = def?.tier || 1;

      // Миграция ступеней ковки CraftGrade
      if (!item.craftGrade) {
        if (item.rarity === 'LEGENDARY' || item.rarity === 'EPIC') {
          item.craftGrade = 'RELIC';
          item.rarity = 'LEGENDARY';
        } else if (item.rarity === 'RARE' || item.rarity === 'UNCOMMON') {
          item.craftGrade = 'SLOTTED';
          item.rarity = 'RARE';
        } else {
          item.craftGrade = 'STANDARD';
          item.rarity = 'COMMON';
        }
      } else {
        // Синхронизация rarity для совместимости со старыми цветовыми темами
        item.rarity = item.craftGrade === 'RELIC' ? 'LEGENDARY' : item.craftGrade === 'SLOTTED' ? 'RARE' : 'COMMON';
      }

      // Фиксированное число сокетов под карты по ступени ковки
      if (def?.type === 'equip' && def.slot) {
        item.maxSlots = getSlotsForGrade(def.slot, item.craftGrade);
      } else {
        item.maxSlots = Math.max(item.maxSlots ?? 0, def?.maxSlots || 0);
      }

      // Чистый классический баланс RO: удаление случайных ARPG-аффиксов
      item.affixes = [];

      // Безопасный диапазон заточки 0..10
      item.refineLevel = Math.max(0, Math.min(10, item.refineLevel || 0));

      if (item.isLocked === undefined) item.isLocked = false;
      if (!Array.isArray(item.insertedCards)) item.insertedCards = [];

      // Миграция устаревших карт
      const legacyCardMap: Record<string, string> = {
        spore_card: 'poison_spore_card',
        skeleton_card: 'skeleton_knight_card',
        zombie_card: 'abbey_executioner_card',
        hornet_card: 'andre_card',
        dragon_fly_card: 'petit_card',
      };
      item.insertedCards = item.insertedCards.map((c) => legacyCardMap[c] || c);
      if (legacyCardMap[item.itemId]) {
        item.itemId = legacyCardMap[item.itemId];
      }
    };

    player.inventory.forEach(normalizeItem);
    (Object.keys(player.equipped) as EquipSlot[]).forEach((slot) => normalizeItem(player.equipped[slot]));
    if (data.autoPotionPercent !== undefined) {
      player.autoPotionPercent = data.autoPotionPercent;
    }

    if (data.jobClass) {
      player.jobClass = data.jobClass;
    }
    if (data.currentZoneId) {
      const legacyZoneMap: Record<string, string> = {
        poring_meadow: 'zone_meadow',
        ant_hell: 'zone_ant_canyon',
        payon_forest: 'zone_forest',
        orc_dungeon: 'zone_orc_fortress',
        geffen_dungeon: 'zone_cursed_abbey',
        glast_heim: 'zone_cursed_abbey',
        volcano: 'zone_dragon_volcano',
      };
      const resolvedZone = legacyZoneMap[data.currentZoneId] || data.currentZoneId;
      player.currentZoneId = ZONES_DATABASE[resolvedZone] ? resolvedZone : 'zone_village';
    }
    // Защита от спавна внутри фонтана
    if (player.currentZoneId === 'zone_village' && Math.hypot(player.x, player.y) < 65) {
      player.x = 0;
      player.y = 100;
      player.moveTo(0, 100);
    }
    if (data.unlockedCards && Array.isArray(data.unlockedCards)) {
      const legacyCardMap: Record<string, string> = {
        spore_card: 'poison_spore_card',
        skeleton_card: 'skeleton_knight_card',
        zombie_card: 'abbey_executioner_card',
        hornet_card: 'andre_card',
        dragon_fly_card: 'petit_card',
      };
      player.unlockedCards = Array.from(new Set(data.unlockedCards.map((c) => legacyCardMap[c] || c)));
    }
    if (data.bestiaryKills && typeof data.bestiaryKills === 'object') {
      const legacyMobMap: Record<string, string> = {
        spore: 'poison_spore',
        skeleton: 'skeleton_knight',
        zombie: 'abbey_executioner',
        dragon_fly: 'petit',
      };
      player.bestiaryKills = {};
      for (const [k, v] of Object.entries(data.bestiaryKills)) {
        const resolvedId = legacyMobMap[k] || k;
        player.bestiaryKills[resolvedId] = (player.bestiaryKills[resolvedId] || 0) + (v as number);
      }
    }
    if (data.activeBuffs && Array.isArray(data.activeBuffs)) {
      player.activeBuffs = [...data.activeBuffs];
    }
    if (data.autoSkillsEnabled !== undefined) {
      player.autoSkillsEnabled = data.autoSkillsEnabled;
    }
    if (data.jobHotbars && typeof data.jobHotbars === 'object') {
      player.jobHotbars = { ...data.jobHotbars };
    }
    if (data.hotbarSlots && Array.isArray(data.hotbarSlots)) {
      player.hotbarSlots = [...data.hotbarSlots];
    } else if (player.jobHotbars[player.jobSystem.activeJobId]) {
      player.hotbarSlots = [...player.jobHotbars[player.jobSystem.activeJobId]!];
    } else {
      player.autoFillHotbarDefaults(player.jobSystem.activeJobId);
    }
    player.validateHotbar();

    player.recalculateStats();
    player.currentHp = player.derivedStats.maxHp;
    player.currentSp = player.derivedStats.maxSp;
    player.puppet.updateHpBar(player.currentHp, player.derivedStats.maxHp);
    player.emitAllStats();

    EventBus.emit('COMBAT_LOG', {
      message: `💾 Загружен прогресс персонажа (Lv. ${player.level} ${player.jobClass}).`,
      color: '#fbbf24',
    });
  }

  public static clearSave(): void {
    if (typeof window === 'undefined') return;

    // 1. Немедленно и навсегда блокируем сохранение в этой сессии
    this.isSavingDisabled = true;
    this.stopAutoSave();

    // 2. Полностью удаляем все ключи сохранений игры из localStorage
    if (window.localStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('midgard') || key.toLowerCase().includes('save'))) {
            keysToRemove.push(key);
          }
        }
        for (const k of keysToRemove) {
          localStorage.removeItem(k);
        }
      } catch (e) {
        console.error('Ошибка при очистке localStorage:', e);
      }
    }

    // 3. Очищаем sessionStorage
    if (window.sessionStorage) {
      try {
        window.sessionStorage.clear();
      } catch (e) {
        // ignore
      }
    }

    // 4. Перезагружаем страницу с чистым состоянием
    window.location.reload();
  }

  public static startAutoSave(player: Player, intervalMs: number = 5000): void {
    this.stopAutoSave();

    if (this.isSavingDisabled) return;

    this.autoSaveInterval = window.setInterval(() => {
      if (!this.isSavingDisabled) {
        this.save(player, false);
      }
    }, intervalMs);

    // Сохранение перед закрытием вкладки
    this.beforeUnloadHandler = () => {
      if (!this.isSavingDisabled) {
        this.save(player, false);
      }
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  public static stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    if (this.beforeUnloadHandler && typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
  }
}
