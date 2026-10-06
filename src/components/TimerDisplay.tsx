import { formatDuration } from '@/utils/stats';

interface TimerDisplayProps {
  elapsedMs: number;
  label?: string;
  variant?: 'elapsed' | 'countdown';
  remainingMs?: number;
  warning?: boolean;
}

export function TimerDisplay({
  elapsedMs,
  label = 'Time',
  variant = 'elapsed',
  remainingMs,
  warning = false,
}: TimerDisplayProps) {
  const displayMs = variant === 'countdown' && remainingMs !== undefined ? remainingMs : elapsedMs;
  const color = warning && displayMs < 60000 ? 'text-red-400' : 'text-slate-300';

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
      <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={`font-mono text-sm font-medium ${color}`}>{formatDuration(displayMs)}</span>
    </div>
  );
}
