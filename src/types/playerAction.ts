import type { MotionType } from './motion'
import type { PlayerLabel, Position } from './player'

export type PlayerActionType = 'route' | 'motion' | 'block'

export type EndpointMarker = 'arrow' | 'filled-circle' | 'blocking-line'

export type PlayerAction = {
  id: string
  type: PlayerActionType
  points: Position[]
  endpointMarker: EndpointMarker
  order: number
  motionType?: MotionType
}

export type PlayerActionChains = Partial<Record<PlayerLabel, PlayerAction[]>>

export function createEmptyPlayerActionChains(): PlayerActionChains {
  return {}
}
