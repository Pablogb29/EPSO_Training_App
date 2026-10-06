import { useEffect, useState } from 'react';

interface UseTimerOptions {
  autoStart?: boolean;
}

export function useTimer(options: UseTimerOptions = {}) {
  const { autoStart = true } = options;
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(autoStart);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setElapsedMs((t) => t + 100), 100);
    return () => clearInterval(interval);
  }, [running]);

  const reset = () => {
    setElapsedMs(0);
    setRunning(autoStart);
  };

  const pause = () => setRunning(false);
  const start = () => setRunning(true);

  return { elapsedMs, running, reset, pause, start, setElapsedMs };
}
