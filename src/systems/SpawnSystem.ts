import { ZoneDef, MonsterDef } from '../types/game.types';
import { ZONES_DATABASE } from '../data/zones.data';
import { MONSTERS_DATABASE } from '../data/monsters.data';
import { Monster } from '../entities/Monster';
import { EventBus } from '../core/EventBus';
import { SoundFX } from '../core/SoundFX';

export class SpawnSystem {
  public currentZone: ZoneDef;
  public mvpTimer: number = 0;
  public eliteTimer: number = 0;
  public activeMvp: Monster | null = null;
  private lastBroadcastSec: number = -1;

  constructor(initialZoneId: string = 'zone_village') {
    this.currentZone = ZONES_DATABASE[initialZoneId] || ZONES_DATABASE.zone_village;
    this.resetTimers();
  }

  public get normalTargetCount(): number {
    if (this.currentZone.isSafeZone) return 0;
    return this.currentZone.normalMaxCount || 18;
  }

  public get eliteTargetCount(): number {
    if (this.currentZone.isSafeZone) return 0;
    return this.currentZone.eliteMaxCount ?? 2;
  }

  private resetTimers(): void {
    this.activeMvp = null;
    this.eliteTimer = 10; // Первые вожаки появятся через 10 сек после входа в зону
    if (this.currentZone.mvpBossId) {
      this.mvpTimer = 15; // Первый MVP появится через 15 секунд
    } else {
      this.mvpTimer = 0;
    }
    this.lastBroadcastSec = -1;
    this.broadcastMvpStatus();
  }

  public setZone(zoneId: string): void {
    if (ZONES_DATABASE[zoneId]) {
      this.currentZone = ZONES_DATABASE[zoneId];
      this.resetTimers();
    }
  }

  public pickRandomMonsterDef(): MonsterDef {
    const pool = this.currentZone.spawnPool;
    if (!pool || pool.length === 0) {
      return MONSTERS_DATABASE.poring;
    }
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const item of pool) {
      if (rand <= item.weight) {
        return MONSTERS_DATABASE[item.monsterId] || MONSTERS_DATABASE.poring;
      }
      rand -= item.weight;
    }

    return MONSTERS_DATABASE.poring;
  }

  /**
   * Выбирает базу для элитного вожака (самый сильный моб локации или указанный в зоне)
   */
  public pickEliteMonsterDef(): MonsterDef {
    if (this.currentZone.eliteMonsterId && MONSTERS_DATABASE[this.currentZone.eliteMonsterId]) {
      return MONSTERS_DATABASE[this.currentZone.eliteMonsterId];
    }

    const pool = this.currentZone.spawnPool;
    if (!pool || pool.length === 0) return MONSTERS_DATABASE.poring;

    // Сортируем по уровню мобов из пула и берем сильнейшего
    const sorted = [...pool]
      .map((p) => MONSTERS_DATABASE[p.monsterId])
      .filter((m): m is MonsterDef => !!m)
      .sort((a, b) => b.level - a.level);

    return sorted[0] || MONSTERS_DATABASE.poring;
  }

  /**
   * Обновление таймера и статуса MVP-босса
   */
  public updateMvpTimer(dt: number, onSpawnMvp: (def: MonsterDef) => Monster): void {
    if (!this.currentZone.mvpBossId) {
      if (this.lastBroadcastSec !== 0) {
        this.broadcastMvpStatus();
      }
      return;
    }

    // Если активный MVP умер
    if (this.activeMvp && this.activeMvp.isDead()) {
      this.activeMvp = null;
      this.mvpTimer = this.currentZone.mvpRespawnTime || 180;
      this.broadcastMvpStatus();
    }

    if (!this.activeMvp) {
      this.mvpTimer -= dt;
      if (this.mvpTimer <= 0) {
        const bossDef = MONSTERS_DATABASE[this.currentZone.mvpBossId];
        if (bossDef) {
          this.activeMvp = onSpawnMvp(bossDef);
          SoundFX.playLevelUp();
          EventBus.emit('MVP_SPAWNED', {
            bossName: bossDef.name,
            zoneName: this.currentZone.name,
          });
          EventBus.emit('COMBAT_LOG', {
            message: `👑 ПРЕДУПРЕЖДЕНИЕ: Возродился MVP-босс [${bossDef.name}]!`,
            color: '#f59e0b',
          });
        }
      }
    }

    // Регулярное оповещение HUD об изменении оставшегося времени (раз в секунду)
    const currentSec = Math.ceil(Math.max(0, this.mvpTimer));
    if (currentSec !== this.lastBroadcastSec) {
      this.lastBroadcastSec = currentSec;
      this.broadcastMvpStatus();
    }
  }

  /**
   * Обновление таймера респавна элитных вожаков
   */
  public updateEliteTimer(
    dt: number,
    currentEliteCount: number,
    onSpawnElite: (leaderDef: MonsterDef) => void
  ): void {
    if (this.currentZone.isSafeZone) return;

    if (currentEliteCount < this.eliteTargetCount) {
      this.eliteTimer -= dt;
      if (this.eliteTimer <= 0) {
        this.eliteTimer = this.currentZone.eliteRespawnTime || 45;
        const eliteDef = this.pickEliteMonsterDef();
        onSpawnElite(eliteDef);
      }
    }
  }

  public broadcastMvpStatus(): void {
    const bossDef = this.currentZone.mvpBossId ? MONSTERS_DATABASE[this.currentZone.mvpBossId] : null;
    EventBus.emit('MVP_TIMER_UPDATED', {
      zoneId: this.currentZone.id,
      bossName: bossDef ? bossDef.name : '',
      remainingSec: Math.ceil(Math.max(0, this.mvpTimer)),
      totalSec: this.currentZone.mvpRespawnTime || 180,
      isAlive: !!this.activeMvp && !this.activeMvp.isDead(),
      hasMvp: !!this.currentZone.mvpBossId,
    });
  }
}
