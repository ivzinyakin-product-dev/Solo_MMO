import { MonsterDef, MonsterRank, EliteAffix, ItemTier } from '../types/game.types';
import { ChibiPuppet, PuppetType } from './ChibiPuppet';
import type { WorldMapSystem } from '../systems/WorldMapSystem';

export type MonsterState = 'IDLE' | 'PATROL' | 'CHASE' | 'ATTACK';

const ELITE_AFFIXES: EliteAffix[] = ['BERSERK', 'ARMORED', 'PACK_LEADER', 'VAMPIRIC'];

export class Monster {
  public id: string;
  public def: MonsterDef;
  public puppet: ChibiPuppet;

  public x: number = 0;
  public y: number = 0;
  public currentHp: number;
  public maxHp: number;

  // Контроль толпы (Stun / Freeze)
  public stunTimer: number = 0;

  // Иерархия и боевые характеристики 3.0
  public rank: MonsterRank;
  public eliteAffix?: EliteAffix;
  public tier: ItemTier;
  public atk: number;
  public defValue: number;
  public baseExp: number;
  public jobExp: number;
  public moveSpeed: number;

  // Механики Вожаков и Боссов
  public isEnraged: boolean = false;
  public packLeaderTimer: number = 0;
  public telegraphTimer: number = 0;
  public minions: Monster[] = [];
  public leader: Monster | null = null;

  public onTriggerTelegraph?: (boss: Monster, targetX: number, targetY: number) => void;
  public onBuffMinions?: (leader: Monster, minions: Monster[]) => void;
  public onHpChanged?: (monster: Monster) => void;
  public isTargeted: boolean = false;
  public isDestroyed: boolean = false;

  private state: MonsterState = 'IDLE';
  private stateTimer: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private attackCooldown: number = 0;

  private knockbackVx: number = 0;
  private knockbackVy: number = 0;

  constructor(
    def: MonsterDef,
    spawnX: number,
    spawnY: number,
    rankOverride?: MonsterRank,
    affixOverride?: EliteAffix
  ) {
    this.id = `${def.id}_${Math.random().toString(36).substring(2, 9)}`;
    this.def = def;
    this.x = spawnX;
    this.y = spawnY;

    // Определение ранга и тира
    const defRank = def.rank || (def.isMvp ? 'MVP' : def.isElite ? 'ELITE' : 'NORMAL');
    this.rank = rankOverride || defRank;
    this.tier =
      def.tier ||
      (def.level <= 11 ? 1 : def.level <= 25 ? 2 : def.level <= 39 ? 3 : def.level <= 54 ? 4 : 5);

    // Статы моба: def.* уже содержат точные расчетные статы для своего ранга (NORMAL, ELITE, MVP).
    // Если произошел динамический апгрейд ранга через rankOverride (отличный от ранга дефиниции):
    let hpMult = 1.0;
    let atkMult = 1.0;
    let defBonus = 0;
    let expMult = 1.0;

    if (this.rank !== defRank) {
      if (this.rank === 'MVP') {
        hpMult = 5.0;
        atkMult = 1.4;
        defBonus = 15;
        expMult = 10;
      } else if (this.rank === 'ELITE') {
        hpMult = 2.5;
        atkMult = 1.2;
        defBonus = 8;
        expMult = 4;
      }
    }

    this.maxHp = Math.round(def.hp * hpMult);
    this.atk = Math.round(def.atk * atkMult);
    this.defValue = def.def + defBonus;
    this.baseExp = Math.round(def.baseExp * expMult);
    this.jobExp = Math.round(def.jobExp * expMult);
    this.moveSpeed = def.moveSpeed;

    if (this.rank === 'MVP') {
      this.telegraphTimer = 12.0; // Кулдаун сокрушающего прямого удара раз в 12 сек
    } else if (this.rank === 'ELITE') {
      this.eliteAffix = undefined; // Спокойный одиночный мини-босс без ARPG-мутаторов
    }

    this.currentHp = this.maxHp;

    let puppetType: PuppetType = 'poring';
    const mid = def.id;

    if (mid === 'fabre' || mid === 'hydra' || mid === 'vadon' || mid === 'andre' || mid === 'ant_centurion') {
      puppetType = 'fabre';
    } else if (mid === 'poison_spore' || mid === 'spore' || mid === 'willow' || mid === 'elder_willow') {
      puppetType = 'poison_spore';
    } else if (mid === 'wolf' || mid === 'wolf_leader') {
      puppetType = 'wolf';
    } else if (mid === 'orc_warrior' || mid === 'orc_archer' || mid === 'orc_shaman' || mid === 'orc_warlord' || mid === 'ferus') {
      puppetType = 'orc';
    } else if (mid === 'skeleton_knight' || mid === 'skeleton' || mid === 'sluice_guardian' || mid === 'time_keeper') {
      puppetType = 'skeleton';
    } else if (mid === 'abbey_executioner' || mid === 'zombie') {
      puppetType = 'zombie';
    } else if (mid === 'whisper' || mid === 'bathory') {
      puppetType = 'spirit';
    } else if (mid === 'sand_golem' || mid === 'mimic' || mid === 'alarm') {
      puppetType = 'golem';
    } else if (mid === 'golden_bug' || mid === 'scorpion' || mid === 'petit' || mid === 'dragon_fly') {
      puppetType = 'dragon_fly';
    } else if (mid === 'mvp_drake' || mid === 'maya_queen' || mid === 'orc_lord' || mid === 'dark_lord' || mid === 'stormy_knight' || mid === 'fire_dragonid' || mid === 'ifrit' || mid.startsWith('mvp_')) {
      puppetType = 'mvp_drake';
    } else {
      puppetType = 'poring';
    }

    this.puppet = new ChibiPuppet({
      type: puppetType,
      colorHex: def.colorHex,
      radius: def.radius,
      hasWeapon: false,
      isMvp: this.rank === 'MVP',
      isElite: this.rank === 'ELITE',
      rank: this.rank,
      scaleMultiplier: this.rank === 'MVP' ? 1.85 : this.rank === 'ELITE' ? 1.35 : 1.0,
    });

    this.puppet.root.position.set(this.x, this.y);
    this.puppet.updateHpBar(this.currentHp, this.maxHp);
    this.pickNewPatrolPoint();
  }

  public getDisplayName(): string {
    if (this.rank === 'MVP') {
      return `👑 [MVP] ${this.def.name}`;
    }
    if (this.rank === 'ELITE') {
      return `[Вожак] ${this.def.name}`;
    }
    return this.def.name;
  }

  public setTargeted(targeted: boolean): void {
    this.isTargeted = targeted;
    if (!this.isDestroyed && this.puppet && this.puppet.hpBarContainer && !this.puppet.root.destroyed) {
      if (targeted) {
        this.puppet.hpBarContainer.visible = true;
      } else {
        const ratio = this.maxHp > 0 ? this.currentHp / this.maxHp : 0;
        this.puppet.hpBarContainer.visible = ratio < 1.0 || this.rank === 'MVP' || this.rank === 'ELITE';
      }
    }
  }

  public heal(amount: number): void {
    if (this.isDestroyed || this.currentHp <= 0) return;
    this.currentHp = Math.min(this.maxHp, Math.round(this.currentHp + amount));
    if (!this.isDestroyed && this.puppet && !this.puppet.root.destroyed) {
      this.puppet.updateHpBar(this.currentHp, this.maxHp, this.isTargeted);
    }
    if (this.onHpChanged) {
      try {
        this.onHpChanged(this);
      } catch (e) {
        console.error('Error in Monster onHpChanged:', e);
      }
    }
  }

  public takeDamage(damage: number, attackerX: number, attackerY: number): void {
    if (this.isDestroyed || this.currentHp <= 0) return;
    const finalDamage = Math.round(damage);
    this.currentHp = Math.max(0, this.currentHp - finalDamage);
    if (!this.isDestroyed && this.puppet && !this.puppet.root.destroyed) {
      this.puppet.updateHpBar(this.currentHp, this.maxHp, this.isTargeted);
      this.puppet.triggerHitFlash();
    }
    if (this.onHpChanged) {
      try {
        this.onHpChanged(this);
      } catch (e) {
        console.error('Error in Monster onHpChanged:', e);
      }
    }

    // Вектор отталкивания (knockback). Боссы и вожаки менее подвержены отталкиванию
    const knockbackResistance = this.rank === 'MVP' ? 0.15 : this.rank === 'ELITE' ? 0.45 : 1.0;
    const dx = this.x - attackerX;
    const dy = this.y - attackerY;
    const dist = Math.hypot(dx, dy) || 1;
    this.knockbackVx = (dx / dist) * (160 * knockbackResistance);
    this.knockbackVy = (dy / dist) * (160 * knockbackResistance);

    // Моб агрится на обидчика в ответ на удар
    this.state = 'CHASE';
  }

  public isDead(): boolean {
    return this.isDestroyed || this.currentHp <= 0;
  }

  private pickNewPatrolPoint(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 80;
    this.targetX = this.x + Math.cos(angle) * dist;
    this.targetY = this.y + Math.sin(angle) * dist;
    this.state = 'PATROL';
  }

  public update(
    dt: number,
    playerX: number,
    playerY: number,
    onAttackPlayer: (m: Monster) => void,
    worldMapSystem?: WorldMapSystem
  ): void {
    if (this.isDestroyed || this.currentHp <= 0) return;

    // 0. Контроль толпы: Стан / Заморозка
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.puppet.isMoving = false;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      if (!this.isDestroyed && this.puppet && this.puppet.root && !this.puppet.root.destroyed) {
        this.puppet.root.position.set(this.x, this.y);
        this.puppet.updateAnimation(dt);
      }
      return;
    }

    // Демпфирование отталкивания с учетом коллизий
    if (Math.abs(this.knockbackVx) > 1 || Math.abs(this.knockbackVy) > 1) {
      const nextX = this.x + this.knockbackVx * dt;
      const nextY = this.y + this.knockbackVy * dt;
      if (worldMapSystem) {
        const resolved = worldMapSystem.resolveMovement(this.x, this.y, nextX, nextY, 12);
        this.x = resolved.x;
        this.y = resolved.y;
      } else {
        this.x = nextX;
        this.y = nextY;
      }
      this.knockbackVx *= Math.max(0, 1 - dt * 10);
      this.knockbackVy *= Math.max(0, 1 - dt * 10);
    }

    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }

    // Логика свиты: миньоны следуют за своим вожаком
    if (this.leader && !this.leader.isDead()) {
      if (this.leader.state === 'CHASE' || this.leader.state === 'ATTACK') {
        if (this.state !== 'CHASE' && this.state !== 'ATTACK') {
          this.state = 'CHASE';
        }
      } else {
        const distToLeader = Math.hypot(this.leader.x - this.x, this.leader.y - this.y);
        if (distToLeader > 110 && this.state !== 'CHASE' && this.state !== 'ATTACK') {
          const ldx = this.leader.x - this.x;
          const ldy = this.leader.y - this.y;
          const moveStep = this.moveSpeed * dt;
          const nextX = this.x + (ldx / distToLeader) * moveStep;
          const nextY = this.y + (ldy / distToLeader) * moveStep;
          if (worldMapSystem) {
            const resolved = worldMapSystem.resolveMovement(this.x, this.y, nextX, nextY, 12);
            this.x = resolved.x;
            this.y = resolved.y;
          } else {
            this.x = nextX;
            this.y = nextY;
          }
          this.puppet.setFacing(ldx);
          this.puppet.isMoving = true;
          this.puppet.root.position.set(this.x, this.y);
          this.puppet.updateAnimation(dt);
          return;
        }
      }
    }

    const distToPlayer = Math.hypot(playerX - this.x, playerY - this.y);

    // Периодический сокрушающий удар MVP-босса раз в 12 секунд
    if (
      this.rank === 'MVP' &&
      (this.state === 'CHASE' || this.state === 'ATTACK') &&
      distToPlayer < 400
    ) {
      this.telegraphTimer -= dt;
      if (this.telegraphTimer <= 0) {
        this.telegraphTimer = 12.0;
        if (this.onTriggerTelegraph) {
          this.onTriggerTelegraph(this, playerX, playerY);
        }
      }
    }

    // Логика состояний FSM: умеренный радиус агра 110px (вместо 240px)
    if (
      (this.def.isAggressive || this.rank === 'MVP') &&
      distToPlayer < 110 &&
      this.state !== 'CHASE' &&
      this.state !== 'ATTACK'
    ) {
      this.state = 'CHASE';
    }

    switch (this.state) {
      case 'IDLE': {
        this.puppet.isMoving = false;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.pickNewPatrolPoint();
        }
        break;
      }

      case 'PATROL': {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 6) {
          this.state = 'IDLE';
          this.stateTimer = 1.5 + Math.random() * 2.0;
          this.puppet.isMoving = false;
        } else {
          const moveDist = this.moveSpeed * 0.5 * dt;
          const nextX = this.x + (dx / dist) * moveDist;
          const nextY = this.y + (dy / dist) * moveDist;
          if (worldMapSystem) {
            const resolved = worldMapSystem.resolveMovement(this.x, this.y, nextX, nextY, 12);
            if (Math.hypot(resolved.x - this.x, resolved.y - this.y) < 0.1) {
              // Препятствие на пути патруля — переходим в IDLE вместо зацикленного реролла каждый кадр
              this.state = 'IDLE';
              this.stateTimer = 1.0 + Math.random() * 1.5;
              this.puppet.isMoving = false;
            } else {
              this.x = resolved.x;
              this.y = resolved.y;
              this.puppet.setFacing(dx);
              this.puppet.isMoving = true;
            }
          } else {
            this.x = nextX;
            this.y = nextY;
            this.puppet.setFacing(dx);
            this.puppet.isMoving = true;
          }
        }
        break;
      }

      case 'CHASE': {
        if (distToPlayer <= this.def.attackRange) {
          this.state = 'ATTACK';
          this.puppet.isMoving = false;
        } else {
          const dx = playerX - this.x;
          const dy = playerY - this.y;
          const moveDist = this.moveSpeed * dt;
          const nextX = this.x + (dx / distToPlayer) * moveDist;
          const nextY = this.y + (dy / distToPlayer) * moveDist;
          if (worldMapSystem) {
            const resolved = worldMapSystem.resolveMovement(this.x, this.y, nextX, nextY, 12);
            this.x = resolved.x;
            this.y = resolved.y;
          } else {
            this.x = nextX;
            this.y = nextY;
          }
          this.puppet.setFacing(dx);
          this.puppet.isMoving = true;
        }
        break;
      }

      case 'ATTACK': {
        this.puppet.isMoving = false;
        if (distToPlayer > this.def.attackRange * 1.4) {
          this.state = 'CHASE';
        } else if (this.attackCooldown <= 0) {
          this.attackCooldown = 1.2; // Кулдаун удара моба
          this.puppet.triggerAttack(1.0);
          onAttackPlayer(this);
        }
        break;
      }
    }

    // Синхронизация визуального контейнера
    if (!this.isDestroyed && this.puppet && this.puppet.root && !this.puppet.root.destroyed) {
      this.puppet.root.position.set(this.x, this.y);
      const speedMult = this.state === 'PATROL' ? 0.65 : 1.0;
      this.puppet.updateAnimation(dt, speedMult);
    }
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.onHpChanged = undefined;
    this.onTriggerTelegraph = undefined;
    this.onBuffMinions = undefined;
    if (this.puppet && this.puppet.root && !this.puppet.root.destroyed) {
      try {
        this.puppet.root.destroy({ children: true });
      } catch (e) {
        console.warn('Error destroying monster puppet:', e);
      }
    }
  }
}
