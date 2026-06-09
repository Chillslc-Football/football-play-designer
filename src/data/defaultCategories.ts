/** Built-in play categories available to every team. */
export const DEFAULT_CATEGORIES = [
  'Run',
  'Pass',
  'RPO',
  'Screen',
  'Play Action',
  'Goal Line',
  'Red Zone',
  'Short Yardage',
  'Two Minute',
  'Special Teams',
] as const

export type DefaultCategory = (typeof DEFAULT_CATEGORIES)[number]
