import { useState, useEffect } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * True when the user has iOS "Reduce Motion" switched on
 * (Settings → Accessibility → Motion → Reduce Motion).
 *
 * Reads the value once on mount and then stays subscribed, because the setting
 * can be toggled while the app is running — and someone turning it on mid-session
 * is likely doing so because an animation just made them feel unwell. Reading it
 * only once would keep animating at exactly the person who asked us to stop.
 */
export function useReducedMotion() {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    let subscribed = true;

    // Initial read. Guarded because the promise can resolve after unmount,
    // and setting state on an unmounted component is a leak.
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => { if (subscribed) setReduceMotionEnabled(enabled); })
      .catch(() => { /* platform can't report it — leave animation on */ });

    // addEventListener returns a subscription object; removal is subscription.remove(),
    // not removeEventListener with the handler.
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotionEnabled,
    );

    return () => {
      subscribed = false;
      subscription?.remove();
    };
  }, []);

  return reduceMotionEnabled;
}
