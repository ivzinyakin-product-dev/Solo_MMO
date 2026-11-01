import { JobClass } from '../types/game.types';
import { Player } from '../entities/Player';

interface JobChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
}

interface ClassOption {
  job: JobClass;
  title: string;
  icon: string;
  desc: string;
  skills: string;
  bonus: string;
  color: string;
}

const CLASSES: ClassOption[] = [
  {
    job: 'Swordsman',
    title: 'Мечник (Swordsman)',
    icon: '⚔️',
    desc: 'Мастер ближнего боя с высоким запасом здоровья и разрушительными круговыми ударами.',
    skills: 'Активный скилл: «Взрыв Магнума» (AOE урон вокруг героя)',
    bonus: 'Пассивно: +15% к физической атаке (ATK)',
    color: 'border-red-500/60 bg-red-950/20 hover:border-red-400',
  },
  {
    job: 'Mage',
    title: 'Маг (Mage)',
    icon: '🧙‍♂️',
    desc: 'Повелитель стихий, уничтожающий врагов огнём и молниями на дистанции.',
    skills: 'Активный скилл: «Огненный шар» (высокий точечный урон)',
    bonus: 'Пассивно: +20% к магической атаке (MATK)',
    color: 'border-purple-500/60 bg-purple-950/20 hover:border-purple-400',
  },
  {
    job: 'Archer',
    title: 'Рейнджер (Archer)',
    icon: '🏹',
    desc: 'Меткий стрелок дальнего боя, осыпающий противника градом стрел.',
    skills: 'Активный скилл: «Двойной выстрел» (два быстрых выстрела)',
    bonus: 'Пассивно: +15 к увороту (FLEE) и скорости',
    color: 'border-amber-500/60 bg-amber-950/20 hover:border-amber-400',
  },
  {
    job: 'Acolyte',
    title: 'Аколит (Acolyte)',
    icon: '✝️',
    desc: 'Служитель света, карающий тьму священной магией и защищающий союзников.',
    skills: 'Активный скилл: «Святой свет» (священный урон)',
    bonus: 'Пассивно: +12% к максимальному запасу HP',
    color: 'border-sky-500/60 bg-sky-950/20 hover:border-sky-400',
  },
];

export function JobChangeModal({ isOpen, onClose, player }: JobChangeModalProps) {
  if (!isOpen) return null;

  const handleSelectJob = (job: JobClass) => {
    player.changeJob(job);
    onClose();
  };

  return (
    <div className="fixed inset-0 pointer-events-auto flex items-center justify-center bg-black/70 z-50 p-4">
      <div className="w-full max-w-xl bg-slate-900/95 border-2 border-amber-500 rounded-2xl shadow-2xl p-6 text-slate-100 backdrop-blur-md">
        <div className="text-center pb-3 border-b border-slate-700/80">
          <span className="text-3xl">👑</span>
          <h2 className="text-xl font-bold text-amber-400 mt-1">Смена профессии</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Вы достигли достаточного уровня опыта! Выберите свой путь развития:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {CLASSES.map((c) => (
            <div
              key={c.job}
              onClick={() => handleSelectJob(c.job)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 hover:scale-[1.02] shadow-lg flex flex-col justify-between ${c.color}`}
            >
              <div>
                <div className="flex items-center space-x-2.5 mb-1.5">
                  <span className="text-2xl">{c.icon}</span>
                  <span className="font-bold text-sm text-slate-100">{c.title}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-tight mb-2.5">{c.desc}</p>
                <div className="text-[10px] text-amber-300 font-semibold mb-1">{c.skills}</div>
                <div className="text-[10px] text-emerald-400 font-semibold">{c.bonus}</div>
              </div>

              <button className="mt-3 w-full py-1.5 rounded-lg bg-amber-500/80 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow">
                Выбрать профессию
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 text-xs font-semibold transition"
        >
          Позже
        </button>
      </div>
    </div>
  );
}
