export const PHASE_ACCENT = {
  morning: "#ff9a9e",
  day:     "#22d3ee",
  noon:    "#fbbf24",
  evening: "#c084fc",
  sunset:  "#f97316",
  night:   "#22d3ee",
};

export function getSolarPhase() {
  const h = new Date().getHours();
  if (h >= 5  && h < 8)  return "morning";
  if (h >= 8  && h < 12) return "day";
  if (h >= 12 && h < 14) return "noon";
  if (h >= 14 && h < 18) return "evening";
  if (h >= 18 && h < 21) return "sunset";
  return "night";
}
