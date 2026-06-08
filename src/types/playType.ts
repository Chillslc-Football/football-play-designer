/** Whether the coach is designing offense or defense for this play. */
export type PlayType = 'offensive' | 'defensive'

export const DEFAULT_PLAY_TYPE: PlayType = 'offensive'

export function resolvePlayType(value: unknown): PlayType {
  return value === 'defensive' ? 'defensive' : 'offensive'
}
