import { BaseStats, DerivedStats, CampState, FloatingTextDef, InventoryItem, EquipSlot, JobClass, JobId, JobProgress, MarketStallSlot, ActiveBuff, FieldNpcRole, BountyContract, ResourceNodeType, MonsterRank } from '../types/game.types';
import type { QuestState } from '../systems/QuestSystem';

export type EventMap = {
  HP_CHANGED: { current: number; max: number };
  SP_CHANGED: { current: number; max: number };
  EXP_CHANGED: { baseExp: number; maxExp: number; jobExp: number; maxJobExp: number; level: number; jobLevel: number };
  LEVEL_UP: { level: number; statPointsGained: number };
  STAT_POINTS_CHANGED: { statPoints: number };
  STATS_UPDATED: { baseStats: BaseStats; derivedStats: DerivedStats };
  CAMP_TOGGLED: { active: boolean; x?: number; y?: number };
  CAMP_STATE_CHANGED: { state: CampState };
  COMBAT_LOG: { message: string; color?: string };
  FLOATING_TEXT: FloatingTextDef;
  ZENY_CHANGED: { zeny: number };
  INVENTORY_UPDATED: { items: InventoryItem[] };
  EQUIPMENT_UPDATED: { equipped: Partial<Record<EquipSlot, InventoryItem | null>> };
  ZONE_CHANGED: { zoneId: string; zoneName: string };
  JOB_CHANGED: { jobClass: JobClass };
  JOB_PROGRESS_UPDATED: { activeJobId: JobId; jobProgress: JobProgress; allJobs: Record<JobId, JobProgress> };
  SKILL_LEARNED: { skillId: string; level: number };
  OPEN_JOB_SELECT: boolean;
  OPEN_SKILLS_WINDOW: boolean | { initialTab?: 'skills' | 'jobs' | 'mastery' };
  SKILL_COOLDOWNS_UPDATED: { cooldowns: Record<string, number> };
  BESTIARY_UPDATED: { kills: Record<string, number>; unlockedCards: string[] };
  MVP_SPAWNED: { bossName: string; zoneName: string };
  MVP_TIMER_UPDATED: {
    zoneId: string;
    bossName: string;
    remainingSec: number;
    totalSec: number;
    isAlive: boolean;
    hasMvp: boolean;
  };
  MARKET_UPDATED: { slots: MarketStallSlot[] };
  BUFFS_UPDATED: { buffs: ActiveBuff[] };
  COMPANION_STATE_CHANGED: { hired: boolean };
  QUESTS_UPDATED: { quests: QuestState[] };
  BOUNTY_CONTRACTS_UPDATED: { contracts: BountyContract[] };
  OVERCHARGE_UPDATED: { level: number; bonusPercent: number; tradeVolume: number };
  RESOURCE_HARVESTED: { nodeType: ResourceNodeType; itemId: string; count: number };
  BLACKSMITH_PROGRESS_UPDATED: { level: number; exp: number; nextExp: number };
  OPEN_QUESTS_WINDOW: boolean;
  OPEN_SHOP_MODAL: boolean;
  OPEN_WORLD_MAP: boolean;
  OPEN_CAMP_TAB: { tab: 'blacksmith' | 'market' | 'alchemy' | 'companion'; subTab?: 'forge' | 'refine' | 'card_extract' | 'salvage' | 'reforge' };
  OPEN_ELITE_BOUNTY_MODAL: boolean;
  OPEN_CARD_EXCHANGE_MODAL: boolean;
  OPEN_NPC_DIALOG: { npcName: string; greeting: string; role: FieldNpcRole };
  HOTBAR_UPDATED: { slots: (string | null)[]; autoSkillsEnabled: boolean; activeJobId?: JobId };
  TARGET_MONSTER_CHANGED: {
    monster: {
      id: string;
      name: string;
      rank: MonsterRank;
      level: number;
      currentHp: number;
      maxHp: number;
      isMvp?: boolean;
      isElite?: boolean;
    } | null;
  };
};

type EventCallback<T> = (data: T) => void;

class TypedEventBus {
  private listeners: Map<keyof EventMap, Set<EventCallback<any>>> = new Map();

  public on<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(callback);

    return () => {
      set.delete(callback);
    };
  }

  public emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in event listener for ${String(event)}:`, err);
        }
      });
    }
  }

  public off<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }
}

export const EventBus = new TypedEventBus();
