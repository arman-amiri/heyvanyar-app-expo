import { useCallback, useEffect, useRef, useState } from 'react';

export function useResendTimer(initialSeconds = 60) {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const deadlineRef = useRef(Date.now() + initialSeconds * 1000);

  const start = useCallback((seconds = initialSeconds) => {
    deadlineRef.current = Date.now() + seconds * 1000;
    setRemainingSeconds(seconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const timerId = setInterval(() => {
      const next = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemainingSeconds(next);
    }, 1000);

    return () => clearInterval(timerId);
  }, [remainingSeconds]);

  return { remainingSeconds, start };
}
