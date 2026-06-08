import { FIELD_WIDTH, LOS_VIEW_Y } from '../constants/field'
import {
  ALL_DEFENDER_LABELS,
  DEFENDER_DISPLAY_LABEL,
  type Defender,
  type DefenderLabel,
} from '../types/defender'
import type { Position } from '../types/player'

/** Default 4-3 defense aligned across from the offense (north of the LOS). */
export function createDefault43Defense(): Defender[] {
  const centerX = FIELD_WIDTH / 2
  const los = LOS_VIEW_Y
  const dlY = los - 1
  const lbY = los - 5
  const cbY = los - 11
  const safetyY = los - 14

  const positions: Record<DefenderLabel, Position> = {
    LE: { x: centerX - 8, y: dlY },
    DT1: { x: centerX - 2.75, y: dlY },
    DT2: { x: centerX + 2.75, y: dlY },
    RE: { x: centerX + 8, y: dlY },
    LOLB: { x: centerX - 5.5, y: lbY },
    MLB: { x: centerX, y: lbY },
    ROLB: { x: centerX + 5.5, y: lbY },
    CB1: { x: 3.5, y: cbY },
    CB2: { x: FIELD_WIDTH - 3.5, y: cbY },
    FS: { x: centerX - 5, y: safetyY },
    SS: { x: centerX + 2.5, y: los - 13 },
  }

  return ALL_DEFENDER_LABELS.map((id) => ({
    id,
    label: DEFENDER_DISPLAY_LABEL[id],
    position: positions[id],
  }))
}
