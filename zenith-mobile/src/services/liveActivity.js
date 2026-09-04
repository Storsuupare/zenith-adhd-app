import { Platform } from "react-native";

// react-native-widget-extension's default export calls requireNativeModule()
// at import time, which throws immediately on any platform where the native
// module isn't registered — Android, and anywhere the module failed to link.
// A static top-level import would crash the whole bundle there, so it's loaded
// lazily behind a platform check and a try/catch instead.
let widgetModule = null;
if (Platform.OS === "ios") {
  try {
    widgetModule = require("react-native-widget-extension");
  } catch (err) {
    console.warn("[liveActivity] widget module unavailable:", err?.message);
  }
}

// Only one Live Activity is ever shown at a time, mirroring the Dashboard's own
// convention of treating contracts[0] as the featured session even when several
// are running — the native module has no concept of multiple concurrent
// activities, so this keeps the JS side from asking it to do something it can't.
export function beginSessionActivity({ title, skillName, durationMinutes }) {
  if (!widgetModule) return;
  try {
    widgetModule.startActivity(title, skillName, Math.round(durationMinutes * 60));
  } catch (err) {
    console.warn("[liveActivity] startActivity failed:", err?.message);
  }
}

export function endSessionActivity() {
  if (!widgetModule) return;
  try {
    widgetModule.endActivity();
  } catch (err) {
    console.warn("[liveActivity] endActivity failed:", err?.message);
  }
}

// Pushes the current streak into the App Group UserDefaults the home-screen
// widget reads from, and asks WidgetKit to redraw it immediately — without this,
// the widget only ever shows its zero-value fallback, since nothing else in the
// app ever writes to that shared storage.
export function updateStreakWidget(streak) {
  if (!widgetModule) return;
  try {
    widgetModule.updateStreak(streak);
  } catch (err) {
    console.warn("[liveActivity] updateStreak failed:", err?.message);
  }
}
