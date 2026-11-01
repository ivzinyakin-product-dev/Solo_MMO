import { BaseStats, DerivedStats, WeaponArchetype, ItemTier, MonsterRank } from '../types/game.types';

export interface CombatTarget {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  vit?: number;
  flee: number;
  hit: number;
  critChance?: number;
}

export interface AttackResult {
  isHit: boolean;
  isCrit: boolean;
  damage: number;
}

export class CombatSystem {
  /**
   * Стоимость прокачки стата на +1: floor((S - 1) / 10) + 2
   */
  public static getStatPointCost(currentValue: number): number {
    return Math.floor((Math.max(1, currentValue) - 1) / 10) + 2;
  }

  /**
   * Очки характеристик за уровень: floor(Level / 5) + 3
   */
  public static getStatPointsPerLevel(level: number): number {
    return Math.floor(level / 5) + 3;
  }

  /**
   * Необходимый опыт для достижения следующего Base Level (Классический RO Патч 3.5):
   * BaseExpToNext(L) = floor(95 * L^1.68 + 40 * L)
   */
  public static getRequiredExp(level: number): number {
    return Math.floor(95 * Math.pow(Math.max(1, level), 1.68) + 40 * Math.max(1, level));
  }

  /**
   * Опыт до следующего Job Level (Классический RO Патч 3.5):
   * JobExpToNext(J) = floor(70 * J^1.62 + 30 * J)
   */
  public static getRequiredJobExp(jobLevel: number): number {
    const j = Math.max(1, jobLevel);
    return Math.floor(70 * Math.pow(j, 1.62) + 30 * j);
  }

  /**
   * Коэффициент опыта в зависимости от разницы уровней персонажа и моба:
   * Предотвращает прокачку на низкоуровневых мобах при сильном превышении уровня.
   *
   * Штраф для обычных мобов (NORMAL):
   * - diff <= 5: 100% опыта (1.0)
   * - diff 6..10: 80% опыта (0.80)
   * - diff 11..15: 50% опыта (0.50)
   * - diff 16..20: 25% опыта (0.25)
   * - diff 21..25: 10% опыта (0.10)
   * - diff >= 26: 0% опыта (0.0) — моб серый, опыт не начисляется
   *
   * Для Вожаков (ELITE):
   * - Сохраняется прогрессивный штраф, но минимум 5% даже при сильной разнице уровней.
   *
   * Для Боссов (MVP):
   * - Сохраняется минимум 35% опыта за победу над мировым боссом.
   */
  public static getExpLevelPenalty(
    playerLevel: number,
    monsterLevel: number,
    rank: MonsterRank = 'NORMAL'
  ): number {
    const diff = playerLevel - monsterLevel;
    if (diff <= 5) return 1.0;

    if (rank === 'MVP') {
      if (diff <= 10) return 0.85;
      if (diff <= 20) return 0.60;
      return 0.35;
    }

    if (rank === 'ELITE') {
      if (diff <= 10) return 0.85;
      if (diff <= 15) return 0.60;
      if (diff <= 20) return 0.35;
      if (diff <= 25) return 0.15;
      return 0.05;
    }

    if (diff <= 10) return 0.80;
    if (diff <= 15) return 0.50;
    if (diff <= 20) return 0.25;
    if (diff <= 25) return 0.10;
    return 0.0;
  }

  /**
   * Плоский Soft DEF от живучести (VIT):
   * SoftDEF = floor(VIT * 0.9) + floor(VIT^2 / 150)
   */
  public static calculateSoftDef(vit: number = 0): number {
    const v = Math.max(0, vit);
    return Math.floor(v * 0.9) + Math.floor((v * v) / 150);
  }

  /**
   * Бонус к атаке от заточки оружия по формуле RO Патча 3.5:
   * RefineATK(T, R) = R * (5 + T * 4) + max(0, R - 4)^2 * (T + 1)
   */
  public static getRefineAtkBonus(tier: ItemTier = 1, refine: number = 0): number {
    if (refine <= 0) return 0;
    const t = Math.max(1, Math.min(5, tier));
    const r = Math.max(0, Math.min(10, refine));
    const base = r * (5 + t * 4);
    const overRefine = Math.max(0, r - 4);
    return base + overRefine * overRefine * (t + 1);
  }

  /**
   * Бонус к защите от заточки брони и защитных слотов по формуле RO Патча 3.5:
   * RefineDEF(T, R) = R * (2 + floor(T / 2)) + max(0, R - 4) * 2
   */
  public static getRefineDefBonus(tier: ItemTier = 1, refine: number = 0): number {
    if (refine <= 0) return 0;
    const t = Math.max(1, Math.min(5, tier));
    const r = Math.max(0, Math.min(10, refine));
    const base = r * (2 + Math.floor(t / 2));
    const overRefine = Math.max(0, r - 4) * 2;
    return base + overRefine;
  }

  /**
   * Дальность базовой атаки по архетипу оружия
   */
  public static getWeaponAttackRange(archetype?: WeaponArchetype): number {
    switch (archetype) {
      case 'MELEE_SWORD':
        return 58;
      case 'RANGED_BOW':
        return 270;
      case 'MAGIC_STAFF':
        return 230;
      case 'HOLY_MACE':
        return 62;
      default:
        return 42;
    }
  }

  /**
   * Расчёт производных боевых параметров персонажа с учетом 4-х архетипов
   */
  public static calculateDerivedStats(
    base: BaseStats,
    level: number,
    weaponAtk: number = 0,
    weaponMatk: number = 0,
    armorDef: number = 0,
    refineBonus: number = 0,
    archetype?: WeaponArchetype
  ): DerivedStats {
    const { str, agi, vit, int, dex, luk } = base;

    const maxHp = Math.floor((40 + level * 18) * (1 + vit * 0.02));
    const maxSp = Math.floor((20 + level * 8) * (1 + int * 0.02));

    let atk = 0;
    let matk = 0;

    switch (archetype) {
      case 'RANGED_BOW':
        // Урон лука скейлится от DEX
        atk =
          dex +
          Math.floor(dex / 10) ** 2 +
          Math.floor(str / 5) +
          Math.floor(luk / 5) +
          weaponAtk +
          refineBonus;
        matk = int + Math.floor(int / 7) ** 2 + weaponMatk;
        break;

      case 'MAGIC_STAFF':
        // Посох скейлит MATK от INT + DEX
        atk = Math.floor(str / 2) + weaponAtk + refineBonus;
        matk =
          int +
          Math.floor(int / 7) ** 2 +
          Math.floor(dex / 5) +
          weaponMatk +
          refineBonus;
        break;

      case 'HOLY_MACE':
        // Булава — гибридный урон от STR + INT
        atk =
          str +
          Math.floor(str / 10) ** 2 +
          Math.floor(int * 0.85) +
          Math.floor(int / 10) ** 2 +
          weaponAtk +
          refineBonus;
        matk = int + Math.floor(int / 8) ** 2 + weaponMatk;
        break;

      case 'MELEE_SWORD':
      default:
        // Меч — классический ближний бой от STR
        atk =
          str +
          Math.floor(str / 10) ** 2 +
          Math.floor(dex / 5) +
          Math.floor(luk / 5) +
          weaponAtk +
          refineBonus;
        matk = int + Math.floor(int / 7) ** 2 + weaponMatk;
        break;
    }

    const aspd = Number(
      Math.min(5.0, 1.1 + agi * 0.038 + dex * 0.008).toFixed(2)
    );

    const hit = 175 + level + dex + Math.floor(luk / 3);
    const flee = 100 + level + agi + Math.floor(luk / 5);
    const critChance = Number((1 + luk * 0.35).toFixed(1));
    const moveSpeed = 160 + Math.floor(agi * 0.8);

    return {
      maxHp,
      maxSp,
      atk,
      matk,
      def: armorDef,
      softDef: this.calculateSoftDef(vit),
      aspd,
      hit,
      flee,
      critChance,
      moveSpeed,
    };
  }

  /**
   * Разрешение удара (Hit Resolution):
   * 1. Крит (игнорирует DEF и FLEE)
   * 2. Проверка точности (HIT/FLEE или 100% для магии)
   * 3. Снижение урона бронёй (с учетом ignoreDefPercent) и VIT
   */
  public static resolveAttack(
    attacker: { atk: number; hit: number; critChance?: number },
    defender: { def: number; flee: number; vit?: number },
    options?: {
      isMagic?: boolean;
      ignoreDefPercent?: number;
      damageMultiplier?: number;
    }
  ): AttackResult {
    const crit = attacker.critChance ?? 1;
    const isCrit = Math.random() * 100 <= crit;
    const multiplier = options?.damageMultiplier ?? 1.0;

    // Шаг 1: Критический удар
    if (isCrit) {
      const critDamage = Math.max(1, Math.floor(attacker.atk * 1.4 * multiplier));
      return {
        isHit: true,
        isCrit: true,
        damage: critDamage,
      };
    }

    // Шаг 2: Проверка HIT / FLEE (магия всегда 100% попадает)
    if (!options?.isMagic) {
      const rawHitChance = 80 + (attacker.hit - defender.flee);
      const clampedHitChance = Math.min(95, Math.max(5, rawHitChance));
      const isHit = Math.random() * 100 <= clampedHitChance;

      if (!isHit) {
        return {
          isHit: false,
          isCrit: false,
          damage: 0,
        };
      }
    }

    // Шаг 3: Гиперболическое снижение урона броней 100/(100 + DEF) и Soft DEF (VIT)
    let defenderDef = defender.def || 0;
    if (options?.ignoreDefPercent) {
      defenderDef = Math.max(0, defenderDef * (1 - options.ignoreDefPercent / 100));
    }
    const defenderVit = defender.vit || 0;

    // Магический урон (Посох и заклинания) полностью игнорирует физический DEF и VIT
    const effectiveDef = options?.isMagic ? 0 : defenderDef;
    const softDef = options?.isMagic ? 0 : this.calculateSoftDef(defenderVit);

    // Гиперболическая формула: RawDamage * (100 / (100 + effectiveDef)) - SoftDEF
    const defMultiplier = 100 / (100 + effectiveDef);
    const rawDamage = attacker.atk * multiplier;
    const damageAfterDef = Math.floor(rawDamage * defMultiplier) - softDef;
    const finalDamage = Math.max(1, damageAfterDef);

    return {
      isHit: true,
      isCrit: false,
      damage: finalDamage,
    };
  }
}
