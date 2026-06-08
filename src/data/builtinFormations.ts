import { FIELD_WIDTH } from '../constants/field'
import type { PlayerLabel, Position } from '../types/player'

/**
 * Built-in formation positions live here in `src/data/builtinFormations.ts`.
 * Custom formations are stored separately in localStorage.
 */

export type BuiltInFormationId =
  | 'i-formation'
  | 'pro-set'
  | 'shotgun-trips-right'
  | 'singleback-ace'

export type FormationDefinition = {
  id: string
  label: string
  positions: Record<PlayerLabel, Position>
  isBuiltin: boolean
}

const SPACING = {
  LOS: 48,
  CENTER_Y: FIELD_WIDTH / 2,
  OL_GAP: 4.5,
  QB_DEPTH: 2,
  FB_DEPTH: 5.5,
  RB_DEPTH: 9.5,
  SHOTGUN_DEPTH: 5,
  PRO_SET_DEPTH: 4,
  PRO_SET_SPLIT: 4.5,
  SINGLEBACK_DEPTH: 7,
  HBACK_SPLIT: 4.5,
  GUN_RB_SPLIT: 4.5,
  WR_SIDELINE: 4,
  TE_OUTSIDE_TACKLE: 4.5,
  TRIPS_GAP: 4.5,
} as const

function offensiveLine(): Record<'LT' | 'LG' | 'C' | 'RG' | 'RT', Position> {
  const { LOS, CENTER_Y, OL_GAP } = SPACING
  return {
    C: { x: LOS, y: CENTER_Y },
    LG: { x: LOS, y: CENTER_Y - OL_GAP },
    RG: { x: LOS, y: CENTER_Y + OL_GAP },
    LT: { x: LOS, y: CENTER_Y - OL_GAP * 2 },
    RT: { x: LOS, y: CENTER_Y + OL_GAP * 2 },
  }
}

function wideReceivers(): Pick<Record<PlayerLabel, Position>, 'X' | 'Z'> {
  const { LOS, WR_SIDELINE } = SPACING
  return {
    X: { x: LOS, y: WR_SIDELINE },
    Z: { x: LOS, y: FIELD_WIDTH - WR_SIDELINE },
  }
}

function tightEndOutsideTackle(): Pick<Record<PlayerLabel, Position>, 'Y'> {
  const ol = offensiveLine()
  const { LOS, TE_OUTSIDE_TACKLE } = SPACING
  return {
    Y: { x: LOS, y: ol.RT.y + TE_OUTSIDE_TACKLE },
  }
}

/** Built-in formations — never stored in localStorage. */
export const BUILTIN_FORMATIONS: FormationDefinition[] = [
  {
    id: 'i-formation',
    label: 'I Formation',
    isBuiltin: true,
    positions: {
      ...offensiveLine(),
      ...wideReceivers(),
      ...tightEndOutsideTackle(),
      QB: { x: SPACING.LOS - SPACING.QB_DEPTH, y: SPACING.CENTER_Y },
      FB: { x: SPACING.LOS - SPACING.FB_DEPTH, y: SPACING.CENTER_Y },
      RB: { x: SPACING.LOS - SPACING.RB_DEPTH, y: SPACING.CENTER_Y },
    },
  },
  {
    id: 'pro-set',
    label: 'Pro Set',
    isBuiltin: true,
    positions: {
      ...offensiveLine(),
      ...wideReceivers(),
      ...tightEndOutsideTackle(),
      QB: { x: SPACING.LOS - SPACING.QB_DEPTH, y: SPACING.CENTER_Y },
      FB: {
        x: SPACING.LOS - SPACING.PRO_SET_DEPTH,
        y: SPACING.CENTER_Y - SPACING.PRO_SET_SPLIT,
      },
      RB: {
        x: SPACING.LOS - SPACING.PRO_SET_DEPTH,
        y: SPACING.CENTER_Y + SPACING.PRO_SET_SPLIT,
      },
    },
  },
  {
    id: 'shotgun-trips-right',
    label: 'Shotgun Trips Right',
    isBuiltin: true,
    positions: {
      ...offensiveLine(),
      QB: { x: SPACING.LOS - SPACING.SHOTGUN_DEPTH, y: SPACING.CENTER_Y },
      RB: {
        x: SPACING.LOS - SPACING.SHOTGUN_DEPTH,
        y: SPACING.CENTER_Y - SPACING.GUN_RB_SPLIT,
      },
      X: { x: SPACING.LOS, y: SPACING.WR_SIDELINE },
      FB: {
        x: SPACING.LOS,
        y: offensiveLine().RT.y + SPACING.TE_OUTSIDE_TACKLE,
      },
      Y: {
        x: SPACING.LOS,
        y: offensiveLine().RT.y + SPACING.TE_OUTSIDE_TACKLE + SPACING.TRIPS_GAP,
      },
      Z: { x: SPACING.LOS, y: FIELD_WIDTH - SPACING.WR_SIDELINE },
    },
  },
  {
    id: 'singleback-ace',
    label: 'Singleback Ace',
    isBuiltin: true,
    positions: {
      ...offensiveLine(),
      ...wideReceivers(),
      ...tightEndOutsideTackle(),
      QB: { x: SPACING.LOS - SPACING.QB_DEPTH, y: SPACING.CENTER_Y },
      RB: { x: SPACING.LOS - SPACING.SINGLEBACK_DEPTH, y: SPACING.CENTER_Y },
      FB: {
        x: SPACING.LOS - SPACING.QB_DEPTH,
        y: SPACING.CENTER_Y - SPACING.HBACK_SPLIT,
      },
    },
  },
]

export const DEFAULT_FORMATION_ID: BuiltInFormationId = 'i-formation'
