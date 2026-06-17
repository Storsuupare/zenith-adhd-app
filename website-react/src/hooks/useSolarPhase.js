export function useSolarPhase() {
  const hour = new Date().getHours()
  if (hour >= 6  && hour < 9)  return 'morning'
  if (hour >= 9  && hour < 12) return 'day'
  if (hour >= 12 && hour < 17) return 'noon'
  if (hour >= 17 && hour < 20) return 'evening'
  if (hour >= 20 && hour < 22) return 'sunset'
  return 'night'
}
