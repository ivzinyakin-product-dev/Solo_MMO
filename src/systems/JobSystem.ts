import { JobId, JobClass, JobProgress, SkillDef, CrossJobMasteryBonus } from '../types/game.types';
import { Player } from '../entities/Player';
import { SoundFX } from '../core/SoundFX';
import { EventBus } from '../core/EventBus';
import { CombatSystem } from './CombatSystem';
import { SKILLS_DATABASE } from './SkillSystem';

export interface JobMeta {
  id: JobId;
  name: string;
  className: JobClass;
  icon: string;
  tier: 1 | 2 | 0;
  maxLevel: number;
  requiredParentJob?: JobId;
  requiredParentLevel?: number;
  description: string;
}

export const JOBS_METADATA: Record<JobId, JobMeta> = {
  novice: {
    id: 'novice',
    name: 'Новичок',
    className: 'Novice',
    icon: '⚔️',
    tier: 0,
    maxLevel: 10,
    description: 'Универсальный искатель приключений. Владеет базовыми навыками выживания и любым оружием.',
  },
  swordsman: {
    id: 'swordsman',
    name: 'Мечник',
    className: 'Swordsman',
    icon: '🗡️',
    tier: 1,
    maxLevel: 50,
    requiredParentJob: 'novice',
    requiredParentLevel: 10,
    description: 'Мастер клинка и ближнего боя. Высокая физическая защита и сокрушительные рубящие удары.',
  },
  archer: {
    id: 'archer',
    name: 'Лучник',
    className: 'Archer',
    icon: '🏹',
    tier: 1,
    maxLevel: 50,
    requiredParentJob: 'novice',
    requiredParentLevel: 10,
    description: 'Стрелок дальнего боя от DEX. Расстреливает врагов издали быстрыми сериями стрел.',
  },
  mage: {
    id: 'mage',
    name: 'Маг',
    className: 'Mage',
    icon: '🧙‍♂️',
    tier: 1,
    maxLevel: 50,
    requiredParentJob: 'novice',
    requiredParentLevel: 10,
    description: 'Властитель стихий и магии от INT. Уничтожает противников разрушительными заклинаниями.',
  },
  acolyte: {
    id: 'acolyte',
    name: 'Аколит',
    className: 'Acolyte',
    icon: '✝️',
    tier: 1,
    maxLevel: 50,
    requiredParentJob: 'novice',
    requiredParentLevel: 10,
    description: 'Священный воин и целитель. Владеет булавой, святым светом, благословениями и отхилом.',
  },
  knight: {
    id: 'knight',
    name: 'Рыцарь',
    className: 'Knight',
    icon: '🛡️',
    tier: 2,
    maxLevel: 50,
    requiredParentJob: 'swordsman',
    requiredParentLevel: 30,
    description: 'Элитный кавалерист и мастер АОЕ-ударов. Высокая скорость бега, размашистый Bowling Bash и Spiral Pierce.',
  },
  crusader: {
    id: 'crusader',
    name: 'Крестоносец',
    className: 'Crusader',
    icon: '⛨',
    tier: 2,
    maxLevel: 50,
    requiredParentJob: 'swordsman',
    requiredParentLevel: 30,
    description: 'Несокрушимый защитник веры со щитом. Возвращает урон врагам через Зеркальный Щит и обрушивает Великий Крест.',
  },
  hunter: {
    id: 'hunter',
    name: 'Охотник',
    className: 'Hunter',
    icon: '🦅',
    tier: 2,
    maxLevel: 50,
    requiredParentJob: 'archer',
    requiredParentLevel: 30,
    description: 'Повелитель верного боевого Сокола и капканов. Стремительный Blitz Beat и сокрушительный Falcon Assault.',
  },
  bard: {
    id: 'bard',
    name: 'Бард',
    className: 'Bard',
    icon: '🎵',
    tier: 2,
    maxLevel: 50,
    requiredParentJob: 'archer',
    requiredParentLevel: 30,
    description: 'Менестрель и снайпер. Окружает отряд непрерывными песнями-аурами (Поэма Браги), ускоряя откат умений и реген.',
  },
  wizard: {
    id: 'wizard',
    name: 'Волшебник',
    className: 'Wizard',
    icon: '🔮',
    tier: 2,
    maxLevel: 50,
    requiredParentJob: 'mage',
    requiredParentLevel: 30,
    description: 'Архимаг великих тайн. Вызывает метеоритные дожди, ледяные бураны с заморозкой и стихийные вихри.',
  },
  sage: {
    id: 'sage',
    name: 'Мудрец',
    className: 'Sage',
    icon: '📖',
    tier: 2,
    maxLevel: 50,
    requiredParentJob: 'mage',
    requiredParentLevel: 30,
    description: 'Боевой авто-кастер от ASPD. Автоатаки посохом и гримуаром бесплатно обрушивают шквал стихий стойкой Hindsight.',
  },
  priest: {
    id: 'priest',
    name: 'Прист',
    className: 'Priest',
    icon: '🕊️',
    tier: 2,
    maxLevel: 50,
    requiredParentJob: 'acolyte',
    requiredParentLevel: 30,
    description: 'Верховный жрец света. Несокрушимый барьер Кирие, святилище жизни Sanctuary и карающий Экзорцизм.',
  },
  monk: {
    id: 'monk',
    name: 'Монах',
    className: 'Monk',
    icon: '👊',
    tier: 2,
    maxLevel: 50,
    requiredParentJob: 'acolyte',
    requiredParentLevel: 30,
    description: 'Мастер комбо-ударов и Духовных Сфер. Накапливает до 5 сфер и разряжает сокрушительный Удар Азуры с удвоением урона.',
  },
};

export class JobSystem {
  public activeJobId: JobId = 'novice';
  public chosenFirstJobId?: JobId;
  public chosenSecondJobId?: JobId;
  public jobs: Record<JobId, JobProgress>;

  constructor(
    initialJobs?: Partial<Record<JobId, JobProgress>>,
    initialActiveJobId: JobId = 'novice',
    chosenFirstJobId?: JobId,
    chosenSecondJobId?: JobId
  ) {
    this.jobs = {
      novice: this.createDefaultJobProgress('novice', 1),
      swordsman: this.createDefaultJobProgress('swordsman', 1),
      archer: this.createDefaultJobProgress('archer', 1),
      mage: this.createDefaultJobProgress('mage', 1),
      acolyte: this.createDefaultJobProgress('acolyte', 1),
      knight: this.createDefaultJobProgress('knight', 1),
      crusader: this.createDefaultJobProgress('crusader', 1),
      hunter: this.createDefaultJobProgress('hunter', 1),
      bard: this.createDefaultJobProgress('bard', 1),
      wizard: this.createDefaultJobProgress('wizard', 1),
      sage: this.createDefaultJobProgress('sage', 1),
      priest: this.createDefaultJobProgress('priest', 1),
      monk: this.createDefaultJobProgress('monk', 1),
    };

    if (initialJobs) {
      for (const [key, val] of Object.entries(initialJobs)) {
        if (val) {
          const jId = key as JobId;
          if (this.jobs[jId]) {
            this.jobs[jId] = {
              ...this.createDefaultJobProgress(jId, val.jobLevel || 1),
              ...val,
              jobExpToNext: CombatSystem.getRequiredJobExp(val.jobLevel || 1),
            };
          }
        }
      }
    }

    this.activeJobId = initialActiveJobId;

    // Восстановление выбранных веток (или автоматический вывод для существующих сохранений)
    if (chosenFirstJobId) {
      this.chosenFirstJobId = chosenFirstJobId;
      this.chosenSecondJobId = chosenSecondJobId;
    } else {
      const meta = JOBS_METADATA[this.activeJobId];
      if (meta) {
        if (meta.tier === 2) {
          this.chosenFirstJobId = meta.requiredParentJob;
          this.chosenSecondJobId = this.activeJobId;
        } else if (meta.tier === 1) {
          this.chosenFirstJobId = this.activeJobId;
        }
      }
    }
  }

  /**
   * Возвращает список классов, входящих в строгую линию развития персонажа:
   * Новичок -> Выбранный 1-й тир -> Выбранный 2-й тир
   */
  public getLineageJobs(): JobId[] {
    const list: JobId[] = ['novice'];
    if (this.chosenFirstJobId) {
      list.push(this.chosenFirstJobId);
    }
    if (this.chosenSecondJobId) {
      list.push(this.chosenSecondJobId);
    }
    return list;
  }

  public getCrossJobMasteryBonuses(): CrossJobMasteryBonus {
    const bonus: CrossJobMasteryBonus = {
      str: 0,
      agi: 0,
      vit: 0,
      int: 0,
      dex: 0,
      luk: 0,
      atkPct: 0,
      matkPct: 0,
      aspdPct: 0,
      maxHpPct: 0,
      maxSpPct: 0,
      hardDef: 0,
      flee: 0,
      hit: 0,
      critChance: 0,
      moveSpeedPct: 0,
      blockChance: 0,
      bossDmgReductionPct: 0,
      bossDmgIncreasePct: 0,
      beastDmgIncreasePct: 0,
      cdReductionPct: 0,
      spRegenPct: 0,
      autocastBonusPct: 0,
      healPowerPct: 0,
      bonusExpPct: 0,
      critDmgPct: 0,
      elementalSkillDmgPct: 0,
    };

    // Бонусы Мастерства рассчитываются исключительно для текущей выбранной профессии (мультикласс отключен)
    const activeLvl = this.jobs[this.activeJobId]?.jobLevel || 0;

    if (this.activeJobId === 'knight') {
      if (activeLvl >= 25) {
        bonus.str += 4;
        bonus.atkPct += 5;
      }
      if (activeLvl >= 50) {
        bonus.maxHpPct += 8;
        bonus.aspdPct += 5;
      }
    } else if (this.activeJobId === 'crusader') {
      if (activeLvl >= 25) {
        bonus.vit += 4;
        bonus.hardDef += 15;
      }
      if (activeLvl >= 50) {
        bonus.blockChance += 5;
        bonus.bossDmgReductionPct += 8;
      }
    } else if (this.activeJobId === 'hunter') {
      if (activeLvl >= 25) {
        bonus.dex += 4;
        bonus.hit += 12;
      }
      if (activeLvl >= 50) {
        bonus.critChance += 6;
        bonus.beastDmgIncreasePct += 10;
      }
    } else if (this.activeJobId === 'bard') {
      if (activeLvl >= 25) {
        bonus.agi += 4;
        bonus.moveSpeedPct += 8;
      }
      if (activeLvl >= 50) {
        bonus.cdReductionPct += 10;
        bonus.spRegenPct += 15;
      }
    } else if (this.activeJobId === 'wizard') {
      if (activeLvl >= 25) {
        bonus.int += 4;
        bonus.matkPct += 6;
      }
      if (activeLvl >= 50) {
        bonus.maxSpPct += 10;
        bonus.elementalSkillDmgPct += 10;
      }
    } else if (this.activeJobId === 'sage') {
      if (activeLvl >= 25) {
        bonus.int += 3;
        bonus.agi += 3;
        bonus.flee += 10;
      }
      if (activeLvl >= 50) {
        bonus.autocastBonusPct += 8;
      }
    } else if (this.activeJobId === 'priest') {
      if (activeLvl >= 25) {
        bonus.vit += 4;
        bonus.int += 3;
        bonus.healPowerPct += 15;
      }
      if (activeLvl >= 50) {
        bonus.bonusExpPct += 10;
      }
    } else if (this.activeJobId === 'monk') {
      if (activeLvl >= 25) {
        bonus.str += 3;
        bonus.luk += 3;
        bonus.critDmgPct += 10;
      }
      if (activeLvl >= 50) {
        bonus.bossDmgIncreasePct += 12;
      }
    }

    return bonus;
  }

  private createDefaultJobProgress(jobId: JobId, level: number = 1): JobProgress {
    // Стартовые разблокированные умения Новичка
    const defaultBooks = jobId === 'novice'
      ? ['novice_bash', 'novice_power_shot', 'novice_arcane_bolt', 'novice_adventurer_grit', 'novice_first_aid']
      : [];

    const learned: Record<string, number> = {};
    if (jobId === 'novice') {
      defaultBooks.forEach((id) => (learned[id] = 1));
    }

    return {
      jobId,
      jobLevel: Math.max(1, level),
      jobExp: 0,
      jobExpToNext: CombatSystem.getRequiredJobExp(level),
      skillPoints: jobId === 'novice' ? 3 : 1,
      unlockedSkillBooks: defaultBooks,
      learnedSkills: learned,
    };
  }

  public getActiveJob(): JobProgress {
    return this.jobs[this.activeJobId];
  }

  public getActiveMeta(): JobMeta {
    return JOBS_METADATA[this.activeJobId];
  }

  public isJobUnlocked(jobId: JobId): boolean {
    if (jobId === 'novice') return true;
    if (this.chosenFirstJobId === jobId) return true;
    if (this.chosenSecondJobId === jobId) return true;

    // Класс доступен для выбора (разблокирован для продвижения), если выполнены требования
    const meta = JOBS_METADATA[jobId];
    if (!meta) return false;

    if (this.activeJobId === 'novice' && meta.tier === 1) {
      return this.jobs.novice.jobLevel >= 10;
    }

    if (
      this.chosenFirstJobId &&
      meta.tier === 2 &&
      meta.requiredParentJob === this.chosenFirstJobId &&
      !this.chosenSecondJobId
    ) {
      return (this.jobs[this.chosenFirstJobId]?.jobLevel || 0) >= (meta.requiredParentLevel || 30);
    }

    return false;
  }

  public canSwitchToJob(jobId: JobId, playerLevel: number = 1): { ok: boolean; reason?: string } {
    if (this.activeJobId === jobId) {
      return { ok: false, reason: 'Вы уже находитесь на этом классе!' };
    }

    const targetMeta = JOBS_METADATA[jobId];
    if (!targetMeta) return { ok: false, reason: 'Неизвестный класс' };

    const currentMeta = this.getActiveMeta();

    // 1. Попытка переключения на Новичка
    if (jobId === 'novice') {
      return { ok: false, reason: 'Возврат к базовому классу Новичка невозможен.' };
    }

    // 2. Если персонаж сейчас Новичок (Tier 0)
    if (currentMeta.tier === 0) {
      if (targetMeta.tier !== 1) {
        return { ok: false, reason: 'Новичок может выбрать только профессию 1-го тира!' };
      }
      const noviceLevel = this.jobs.novice.jobLevel;
      if (noviceLevel < 10 && playerLevel < 10) {
        return {
          ok: false,
          reason: 'Для выбора первой профессии требуется 10 Job Level Новичка (или 10 Base Level)!',
        };
      }
      return { ok: true };
    }

    // 3. Если персонаж сейчас на 1-м тире (Мечник, Лучник, Маг, Аколит)
    if (currentMeta.tier === 1) {
      if (targetMeta.tier === 1) {
        return {
          ok: false,
          reason: `Вы уже выбрали путь [${currentMeta.name}]! Мультикласс отключён, смена ветки невозможна.`,
        };
      }
      if (targetMeta.tier === 2) {
        if (targetMeta.requiredParentJob !== this.activeJobId) {
          const parentMeta = targetMeta.requiredParentJob ? JOBS_METADATA[targetMeta.requiredParentJob] : null;
          return {
            ok: false,
            reason: `Класс [${targetMeta.name}] доступен только для ветки [${parentMeta?.name || 'другой'}]!`,
          };
        }
        const currentJobLvl = this.jobs[this.activeJobId].jobLevel;
        const reqLvl = targetMeta.requiredParentLevel || 30;
        if (currentJobLvl < reqLvl) {
          return {
            ok: false,
            reason: `Для продвижения на [${targetMeta.name}] требуется достичь ${reqLvl} Job Level на классе [${currentMeta.name}]!`,
          };
        }
        return { ok: true };
      }
    }

    // 4. Если персонаж уже на 2-м тире (Рыцарь, Крестоносец и т.д.)
    if (currentMeta.tier === 2) {
      return {
        ok: false,
        reason: `Вы уже достигли высшей профессии [${currentMeta.name}]. Смена класса невозможна.`,
      };
    }

    return { ok: false, reason: 'Смена класса недоступна.' };
  }

  public switchJob(jobId: JobId, player: Player): boolean {
    const check = this.canSwitchToJob(jobId, player.level);
    if (!check.ok) {
      EventBus.emit('COMBAT_LOG', { message: check.reason || 'Ошибка смены класса', color: '#ef4444' });
      return false;
    }

    const oldJobId = this.activeJobId;
    const targetMeta = JOBS_METADATA[jobId];

    // Фиксация выбранной постоянной ветки развития
    if (targetMeta.tier === 1) {
      this.chosenFirstJobId = jobId;
    } else if (targetMeta.tier === 2) {
      this.chosenSecondJobId = jobId;
    }

    this.activeJobId = jobId;
    player.jobClass = targetMeta.className;
    player.syncJobHotbar(jobId, oldJobId);
    player.validateHotbar();

    SoundFX.playLevelUp();
    player.recalculateStats();
    player.emitAllStats();

    this.emitJobProgress();
    EventBus.emit('JOB_CHANGED', { jobClass: targetMeta.className });
    EventBus.emit('COMBAT_LOG', {
      message: `✨ Вы выбрали постоянный путь профессии [${targetMeta.name}]! (Job Lv. ${this.jobs[jobId].jobLevel})`,
      color: '#f59e0b',
    });

    return true;
  }

  public addJobExp(amount: number, player: Player): boolean {
    const active = this.getActiveJob();
    const meta = JOBS_METADATA[this.activeJobId];
    if (active.jobLevel >= meta.maxLevel) {
      active.jobExp = 0;
      return false;
    }

    active.jobExp += amount;
    let leveledUp = false;
    let loopCount = 0;

    while (
      active.jobExp >= active.jobExpToNext &&
      active.jobExpToNext > 0 &&
      active.jobLevel < meta.maxLevel &&
      loopCount < 100
    ) {
      loopCount++;
      active.jobExp -= active.jobExpToNext;
      active.jobLevel += 1;
      active.skillPoints += 1;
      active.jobExpToNext = CombatSystem.getRequiredJobExp(active.jobLevel);
      leveledUp = true;

      SoundFX.playLevelUp();
      EventBus.emit('COMBAT_LOG', {
        message: `🎉 Job Level Up! Класс [${meta.name}] достиг ${active.jobLevel} ур.! Получено +1 Skill Point.`,
        color: '#fbbf24',
      });

      // Автоматическое открытие окна смены профессии при достижении порогов
      if (this.activeJobId === 'novice' && active.jobLevel >= 10 && !this.chosenFirstJobId) {
        EventBus.emit('OPEN_JOB_SELECT', true);
      } else if (meta.tier === 1 && active.jobLevel >= 30 && !this.chosenSecondJobId) {
        EventBus.emit('OPEN_JOB_SELECT', true);
      }
    }

    if (active.jobLevel >= meta.maxLevel) {
      active.jobExp = 0;
    }

    if (leveledUp) {
      player.recalculateStats();
      player.emitAllStats();
      this.emitJobProgress();
    }

    return leveledUp;
  }

  public buySkillBook(skillId: string, player: Player): boolean {
    const skill = SKILLS_DATABASE[skillId];
    if (!skill) return false;

    const price = skill.bookPrice || 0;
    if (price > 0 && player.zeny < price) {
      EventBus.emit('COMBAT_LOG', {
        message: `❌ Недостаточно золота для покупки книги [${skill.name}]! Требуется: ${price.toLocaleString()} z.`,
        color: '#ef4444',
      });
      return false;
    }

    const upgraded = this.upgradeSkill(skillId, player);
    if (upgraded && price > 0) {
      player.removeZeny(price);
    }
    return upgraded;
  }

  public upgradeSkill(skillId: string, player: Player): boolean {
    const skill = SKILLS_DATABASE[skillId];
    if (!skill) return false;

    const activeMeta = this.getActiveMeta();
    const isLineageSkill =
      skill.jobId === this.activeJobId ||
      skill.jobId === 'novice' ||
      (activeMeta.tier === 2 && activeMeta.requiredParentJob === skill.jobId);

    // Запрет прокачки навыков чужих профессий (мультикласс отключён)
    if (!isLineageSkill) {
      const targetMeta = JOBS_METADATA[skill.jobId];
      EventBus.emit('COMBAT_LOG', {
        message: `❌ Навыки класса [${targetMeta?.name || skill.jobId}] недоступны для вашей профессии!`,
        color: '#ef4444',
      });
      return false;
    }

    const targetJob = this.jobs[skill.jobId];
    if (!targetJob) return false;

    const currentLvl = targetJob.learnedSkills[skillId] || 0;
    if (currentLvl >= skill.maxLevel) {
      EventBus.emit('COMBAT_LOG', { message: 'Умение уже прокачано до максимального уровня!', color: '#94a3b8' });
      return false;
    }

    if (targetJob.skillPoints < 1) {
      const jobName = JOBS_METADATA[skill.jobId]?.name || skill.jobId;
      EventBus.emit('COMBAT_LOG', {
        message: `Недостаточно очков умений [${jobName}] (требуется 1 SP)!`,
        color: '#ef4444',
      });
      return false;
    }

    targetJob.skillPoints -= 1;
    targetJob.learnedSkills[skillId] = currentLvl + 1;
    if (!targetJob.unlockedSkillBooks.includes(skillId)) {
      targetJob.unlockedSkillBooks.push(skillId);
    }

    SoundFX.playLevelUp();
    EventBus.emit('SKILL_LEARNED', { skillId, level: targetJob.learnedSkills[skillId] });
    EventBus.emit('COMBAT_LOG', {
      message:
        currentLvl === 0
          ? `✨ Изучено умение: [${skill.name}] (Ур. 1 / ${skill.maxLevel})!`
          : `⭐ Умение [${skill.name}] прокачано до уровня ${targetJob.learnedSkills[skillId]} / ${skill.maxLevel}!`,
      color: '#fbbf24',
    });

    player.recalculateStats();
    this.emitJobProgress();
    return true;
  }

  public getSkillLevel(skillId: string): number {
    const skill = SKILLS_DATABASE[skillId];
    if (!skill) return 0;
    const targetJob = this.jobs[skill.jobId];
    return targetJob?.learnedSkills[skillId] || 0;
  }

  public isSkillUsable(skillId: string): boolean {
    const skill = SKILLS_DATABASE[skillId];
    if (!skill) return false;

    // Навыки Новичка доступны ВСЕГДА на любом классе (полное наследование)
    if (skill.jobId === 'novice') {
      return (this.jobs.novice?.learnedSkills[skillId] || 0) > 0;
    }

    // Классовые умения текущей профессии
    if (this.activeJobId === skill.jobId) {
      return (this.jobs[this.activeJobId]?.learnedSkills[skillId] || 0) > 0;
    }

    // Если игрок на 2-м тире, умения родительского класса 1-го тира также доступны
    const activeMeta = this.getActiveMeta();
    if (activeMeta && activeMeta.tier === 2 && activeMeta.requiredParentJob === skill.jobId) {
      return (this.jobs[skill.jobId]?.learnedSkills[skillId] || 0) > 0;
    }

    // Любые другие профессии строго заблокированы (мультикласс отключен)
    return false;
  }

  public emitJobProgress(): void {
    EventBus.emit('JOB_PROGRESS_UPDATED', {
      activeJobId: this.activeJobId,
      jobProgress: { ...this.getActiveJob() },
      allJobs: { ...this.jobs },
    });
  }
}
