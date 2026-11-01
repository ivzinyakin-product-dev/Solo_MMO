import { useState, useEffect, useRef } from 'preact/hooks';
import { EventBus } from '../core/EventBus';

interface LogEntry {
  id: string;
  message: string;
  color?: string;
}

export function ToastLog() {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init_1',
      message: 'Добро пожаловать в Midgard Camp! Управляйте персонажем кликом мыши.',
      color: '#38bdf8',
    },
  ]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = EventBus.on('COMBAT_LOG', (entry) => {
      setLogs((prev) => {
        const next = [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            message: entry.message,
            color: entry.color,
          },
        ];
        return next.slice(-25); // Хранить до 25 последних сообщений
      });
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="fixed bottom-12 left-4 pointer-events-auto z-20 w-80 max-h-36 bg-slate-950/80 border border-slate-800/90 rounded-xl p-2.5 backdrop-blur-md shadow-xl flex flex-col justify-end overflow-hidden">
      <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 border-b border-slate-800 pb-1">
        Журнал боя
      </div>
      <div
        ref={logContainerRef}
        className="overflow-y-auto space-y-1 text-xs pr-1 scroll-smooth max-h-24"
      >
        {logs.map((log) => (
          <div
            key={log.id}
            className="leading-tight text-[11px]"
            style={{ color: log.color || '#cbd5e1' }}
          >
            {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}
