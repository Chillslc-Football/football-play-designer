/** Built-in defensive play categories available to every team. */
export const DEFAULT_DEFENSIVE_CATEGORIES = [
  'Base',
  'Blitz',
  'Zone',
  'Man',
  'Goal Line',
  'Red Zone',
  'Short Yardage',
  'Third Down',
] as const

export type DefaultDefensiveCategory = (typeof DEFAULT_DEFENSIVE_CATEGORIES)[number]
