import { useEffect, useRef, useState, useCallback } from "react";

const CELEBRATION_MS = 1500;

/**
 * useLevelUpCelebration
 * Triggers a visual celebration for exactly 1.5s, then auto-kills
 * the animation process to save battery.
 */
export function useLevelUpCelebration() {
  const [celebrating, setCelebrating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    setCelebrating(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCelebrating(false);
    }, CELEBRATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { celebrating, trigger };
}

export default useLevelUpCelebration;

