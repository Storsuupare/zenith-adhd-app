export function useSolarPhase() {
  const h = new Date().getHours()
  if (h >= 5  && h < 8)  return 'morning'
  if (h >= 8  && h < 12) return 'day'
  if (h >= 12 && h < 14) return 'noon'
  if (h >= 14 && h < 18) return 'evening'
  if (h >= 18 && h < 21) return 'sunset'
  return 'night'
}
