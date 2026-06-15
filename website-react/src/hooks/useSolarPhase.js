export function useSolarPhase() {
  const hour = new Date().getHours()
  if (hour >= 5  && hour < 8)  return 'morning'
  if (hour >= 8  && hour < 11) return 'day'
  if (hour >= 11 && hour < 16) return 'noon'
  if (hour >= 16 && hour < 22) return 'evening'
  if (hour >= 22)              return 'sunset'
  return 'night'
}
