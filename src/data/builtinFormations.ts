import { FIELD_WIDTH, LOS_VIEW_Y } from '../constants/field'
import type { PlayerLabel, Position } from '../types/player'

/**
 * Built-in formation positions live here in `src/data/builtinFormations.ts`.
 * Custom formations are stored separately in localStorage.
 *
 * Coordinates use the 50-yard portrait view (1 unit = 1 yard).
 * x = lateral, y = depth (offense at bottom attacks upward toward y = 0).
 * The line of scrimmage is at LOS_VIEW_Y.
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
  LOS: LOS_VIEW_Y,
  CENTER_X: FIELD_WIDTH / 2,
  /** Even splits between adjacent offensive linemen (yards). */
  OL_GAP: 1.85,
  QB_DEPTH: 2,
  FB_DEPTH: 4.5,
  RB_DEPTH: 7.5,
  SHOTGUN_DEPTH: 4,
  PRO_SET_DEPTH: 3,
  PRO_SET_SPLIT: 2,
  SINGLEBACK_DEPTH: 5,
  HBACK_SPLIT: 2.25,
  GUN_RB_SPLIT: 2.25,
  WR_SIDELINE: 2.75,
  TE_OUTSIDE_TACKLE: 1.5,
  TRIPS_GAP: 1.85,
} as const

function offensiveLine(): Record<'LT' | 'LG' | 'C' | 'RG' | 'RT', Position> {
  const { LOS, CENTER_X, OL_GAP } = SPACING
  return {
    C: { x: CENTER_X, y: LOS },
    LG: { x: CENTER_X - OL_GAP, y: LOS },
    RG: { x: CENTER_X + OL_GAP, y: LOS },
    LT: { x: CENTER_X - OL_GAP * 2, y: LOS },
    RT: { x: CENTER_X + OL_GAP * 2, y: LOS },
  }
}

function wideReceivers(): Pick<Record<PlayerLabel, Position>, 'X' | 'Z'> {
  const { LOS, WR_SIDELINE } = SPACING
  return {
    X: { x: WR_SIDELINE, y: LOS },
    Z: { x: FIELD_WIDTH - WR_SIDELINE, y: LOS },
  }
}

function tightEndOutsideTackle(): Pick<Record<PlayerLabel, Position>, 'Y'> {
  const ol = offensiveLine()
  const { LOS, TE_OUTSIDE_TACKLE } = SPACING
  return {
    Y: { x: ol.RT.x + TE_OUTSIDE_TACKLE, y: LOS },
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
      QB: { x: SPACING.CENTER_X, y: SPACING.LOS + SPACING.QB_DEPTH },
      FB: { x: SPACING.CENTER_X, y: SPACING.LOS + SPACING.FB_DEPTH },
      RB: { x: SPACING.CENTER_X, y: SPACING.LOS + SPACING.RB_DEPTH },
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
      QB: { x: SPACING.CENTER_X, y: SPACING.LOS + SPACING.QB_DEPTH },
      FB: {
        x: SPACING.CENTER_X - SPACING.PRO_SET_SPLIT,
        y: SPACING.LOS + SPACING.PRO_SET_DEPTH,
      },
      RB: {
        x: SPACING.CENTER_X + SPACING.PRO_SET_SPLIT,
        y: SPACING.LOS + SPACING.PRO_SET_DEPTH,
      },
    },
  },
  {
    id: 'shotgun-trips-right',
    label: 'Shotgun Trips Right',
    isBuiltin: true,
    positions: {
      ...offensiveLine(),
      QB: { x: SPACING.CENTER_X, y: SPACING.LOS + SPACING.SHOTGUN_DEPTH },
      RB: {
        x: SPACING.CENTER_X - SPACING.GUN_RB_SPLIT,
        y: SPACING.LOS + SPACING.SHOTGUN_DEPTH,
      },
      X: { x: SPACING.WR_SIDELINE, y: LOS_VIEW_Y },
      FB: {
        x: offensiveLine().RT.x + SPACING.TE_OUTSIDE_TACKLE,
        y: LOS_VIEW_Y,
      },
      Y: {
        x: offensiveLine().RT.x + SPACING.TE_OUTSIDE_TACKLE + SPACING.TRIPS_GAP,
        y: LOS_VIEW_Y,
      },
      Z: { x: FIELD_WIDTH - SPACING.WR_SIDELINE, y: LOS_VIEW_Y },
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
      QB: { x: SPACING.CENTER_X, y: SPACING.LOS + SPACING.QB_DEPTH },
      RB: { x: SPACING.CENTER_X, y: SPACING.LOS + SPACING.SINGLEBACK_DEPTH },
      FB: {
        x: SPACING.CENTER_X - SPACING.HBACK_SPLIT,
        y: SPACING.LOS + SPACING.QB_DEPTH,
      },
    },
  },
]

export const DEFAULT_FORMATION_ID: BuiltInFormationId = 'i-formation'
