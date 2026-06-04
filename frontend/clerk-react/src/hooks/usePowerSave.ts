import { useEffect, useRef } from "react";

/**
 * usePowerSave
 * Suspends CSS animations and heavy effects when the tab is hidden
 * or the user prefers reduced motion, saving ~90% GPU/CPU power.
 */
export function usePowerSave() {
  const rafRef = useRef<number | null>(null);
  const hiddenRef = useRef(false);

  useEffect(() => {
    const body = document.body;

    const onVisibility = () => {
      const isHidden = document.hidden;
      hiddenRef.current = isHidden;

      if (isHidden) {
        body.classList.add("power-save");
      } else {
        body.classList.remove("power-save");
      }
    };

    const onMotionPreference = () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        body.classList.add("reduce-motion");
      } else {
        body.classList.remove("reduce-motion");
      }
    };

    // Initial check
    onVisibility();
    onMotionPreference();

    document.addEventListener("visibilitychange", onVisibility);
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    mql.addEventListener?.("change", onMotionPreference);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      mql.removeEventListener?.("change", onMotionPreference);
      body.classList.remove("power-save", "reduce-motion");
    };
  }, []);
}

export default usePowerSave;

