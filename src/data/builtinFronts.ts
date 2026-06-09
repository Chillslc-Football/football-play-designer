import { FIELD_WIDTH, LOS_VIEW_Y } from '../constants/field'
import {
  ALL_DEFENDER_LABELS,
  DEFENDER_DISPLAY_LABEL,
  type Defender,
  type DefenderLabel,
} from '../types/defender'
import type { Position } from '../types/player'

export type BuiltInFrontId =
  | '4-3'
  | '3-4'
  | '5-2'
  | '4-4'
  | 'nickel'
  | 'dime'
  | 'goal-line'

export type FrontDefinition = {
  id: BuiltInFrontId
  label: string
  positions: Record<DefenderLabel, Position>
  isBuiltin: true
}

const centerX = FIELD_WIDTH / 2
const los = LOS_VIEW_Y

function frontPositions(
  positions: Record<DefenderLabel, Position>,
): Record<DefenderLabel, Position> {
  return positions
}

/** Built-in defensive fronts — never stored in localStorage. */
export const BUILTIN_FRONTS: FrontDefinition[] = [
  {
    id: '4-3',
    label: '4-3',
    isBuiltin: true,
    positions: frontPositions({
      LE: { x: centerX - 8, y: los - 1 },
      DT1: { x: centerX - 2.75, y: los - 1 },
      DT2: { x: centerX + 2.75, y: los - 1 },
      RE: { x: centerX + 8, y: los - 1 },
      LOLB: { x: centerX - 5.5, y: los - 5 },
      MLB: { x: centerX, y: los - 5 },
      ROLB: { x: centerX + 5.5, y: los - 5 },
      CB1: { x: 3.5, y: los - 11 },
      CB2: { x: FIELD_WIDTH - 3.5, y: los - 11 },
      FS: { x: centerX - 5, y: los - 14 },
      SS: { x: centerX + 2.5, y: los - 13 },
    }),
  },
  {
    id: '3-4',
    label: '3-4',
    isBuiltin: true,
    positions: frontPositions({
      LE: { x: centerX - 6.5, y: los - 1 },
      DT1: { x: centerX, y: los - 1 },
      DT2: { x: centerX + 6.5, y: los - 1 },
      RE: { x: centerX + 9.5, y: los - 2.5 },
      LOLB: { x: centerX - 8, y: los - 4.5 },
      MLB: { x: centerX - 2.5, y: los - 5 },
      ROLB: { x: centerX + 2.5, y: los - 5 },
      CB1: { x: 3.5, y: los - 11 },
      CB2: { x: FIELD_WIDTH - 3.5, y: los - 11 },
      FS: { x: centerX - 4, y: los - 14 },
      SS: { x: centerX + 5, y: los - 13 },
    }),
  },
  {
    id: '5-2',
    label: '5-2',
    isBuiltin: true,
    positions: frontPositions({
      LE: { x: centerX - 9.5, y: los - 1 },
      DT1: { x: centerX - 4.5, y: los - 1 },
      DT2: { x: centerX, y: los - 1 },
      RE: { x: centerX + 4.5, y: los - 1 },
      LOLB: { x: centerX + 9.5, y: los - 1 },
      MLB: { x: centerX - 3, y: los - 5 },
      ROLB: { x: centerX + 3, y: los - 5 },
      CB1: { x: 3.5, y: los - 10 },
      CB2: { x: FIELD_WIDTH - 3.5, y: los - 10 },
      FS: { x: centerX - 5, y: los - 13 },
      SS: { x: centerX + 5, y: los - 13 },
    }),
  },
  {
    id: '4-4',
    label: '4-4',
    isBuiltin: true,
    positions: frontPositions({
      LE: { x: centerX - 8, y: los - 1 },
      DT1: { x: centerX - 2.75, y: los - 1 },
      DT2: { x: centerX + 2.75, y: los - 1 },
      RE: { x: centerX + 8, y: los - 1 },
      LOLB: { x: centerX - 7, y: los - 4.5 },
      MLB: { x: centerX - 2.5, y: los - 5 },
      ROLB: { x: centerX + 2.5, y: los - 5 },
      CB1: { x: 3.5, y: los - 10 },
      CB2: { x: FIELD_WIDTH - 3.5, y: los - 10 },
      FS: { x: centerX - 6, y: los - 12 },
      SS: { x: centerX + 6, y: los - 12 },
    }),
  },
  {
    id: 'nickel',
    label: 'Nickel',
    isBuiltin: true,
    positions: frontPositions({
      LE: { x: centerX - 7.5, y: los - 1 },
      DT1: { x: centerX - 2.25, y: los - 1 },
      DT2: { x: centerX + 2.25, y: los - 1 },
      RE: { x: centerX + 7.5, y: los - 1 },
      LOLB: { x: centerX - 5, y: los - 4 },
      MLB: { x: centerX, y: los - 5 },
      ROLB: { x: centerX + 5, y: los - 4 },
      CB1: { x: 2.75, y: los - 9 },
      CB2: { x: FIELD_WIDTH - 2.75, y: los - 9 },
      FS: { x: centerX - 8, y: los - 11 },
      SS: { x: centerX + 8, y: los - 11 },
    }),
  },
  {
    id: 'dime',
    label: 'Dime',
    isBuiltin: true,
    positions: frontPositions({
      LE: { x: centerX - 6, y: los - 1 },
      DT1: { x: centerX - 1.5, y: los - 1 },
      DT2: { x: centerX + 1.5, y: los - 1 },
      RE: { x: centerX + 6, y: los - 1 },
      LOLB: { x: centerX - 10, y: los - 8 },
      MLB: { x: centerX, y: los - 5 },
      ROLB: { x: centerX + 10, y: los - 8 },
      CB1: { x: 2.25, y: los - 8 },
      CB2: { x: FIELD_WIDTH - 2.25, y: los - 8 },
      FS: { x: centerX - 6, y: los - 11 },
      SS: { x: centerX + 6, y: los - 11 },
    }),
  },
  {
    id: 'goal-line',
    label: 'Goal Line',
    isBuiltin: true,
    positions: frontPositions({
      LE: { x: centerX - 7, y: los - 0.5 },
      DT1: { x: centerX - 2.25, y: los - 0.5 },
      DT2: { x: centerX + 2.25, y: los - 0.5 },
      RE: { x: centerX + 7, y: los - 0.5 },
      LOLB: { x: centerX - 5, y: los - 2.5 },
      MLB: { x: centerX, y: los - 3 },
      ROLB: { x: centerX + 5, y: los - 2.5 },
      CB1: { x: 4, y: los - 5 },
      CB2: { x: FIELD_WIDTH - 4, y: los - 5 },
      FS: { x: centerX - 3, y: los - 6 },
      SS: { x: centerX + 3, y: los - 6 },
    }),
  },
]

export const DEFAULT_FRONT_ID: BuiltInFrontId = '4-3'

export function defendersFromFront(front: FrontDefinition): Defender[] {
  return ALL_DEFENDER_LABELS.map((id) => ({
    id,
    label: DEFENDER_DISPLAY_LABEL[id],
    position: front.positions[id],
  }))
}
