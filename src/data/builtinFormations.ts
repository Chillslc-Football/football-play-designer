import { FIELD_WIDTH, LOS_VIEW_Y } from '../constants/field'
import type { PlayerLabel, Position } from '../types/player'

/**
 * Built-in formation positions live here in `src/data/builtinFormations.ts`.
 * Custom formations are stored separately in localStorage.
 *
 * Coordinates use the 50-yard portrait view (1 unit = 1 yard).
 * x = lateral, y = depth (offense at bottom attacks upward toward y = 0).
 * The line of scrimmage is at LOS_VIEW_Y.
 *
 * Slot ids (QB, RB, FB, X, Y, Z, OL) are fixed app keys.
 * positionLabels show realistic personnel (TE, HB, WR, SL, etc.) on the field.
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
  positionLabels?: Partial<Record<PlayerLabel, string>>
  isBuiltin: boolean
}

type FormationTemplate = {
  positions: Record<PlayerLabel, Position>
  positionLabels: Partial<Record<PlayerLabel, string>>
}

/** Shared template spacing — OL spans ~65% of inside-hash width; skill players clear 1.85 yd minimum. */
const TEMPLATE = {
  LOS: LOS_VIEW_Y,
  CENTER_X: FIELD_WIDTH / 2,
  OL_GAP: ((FIELD_WIDTH - 17 - 17) * 0.65) / 4,
  TE_OUTSIDE_RT: 2.1,
  WR_SPLIT: 7,
  UNDER_CENTER_QB: 2.75,
  SHOTGUN_QB: 4.5,
  GUN_RB_SPLIT: 3.25,
  TRIPS_INNER: 35.5,
  TRIPS_MID: 40.5,
  TRIPS_WIDE: FIELD_WIDTH - 7,
  HBACK_SPLIT: 3.25,
} as const

type OffensiveLine = Record<'LT' | 'LG' | 'C' | 'RG' | 'RT', Position>

function standardOffensiveLine(): OffensiveLine {
  const { LOS, CENTER_X, OL_GAP } = TEMPLATE
  return {
    C: { x: CENTER_X, y: LOS },
    LG: { x: CENTER_X - OL_GAP, y: LOS },
    RG: { x: CENTER_X + OL_GAP, y: LOS },
    LT: { x: CENTER_X - OL_GAP * 2, y: LOS },
    RT: { x: CENTER_X + OL_GAP * 2, y: LOS },
  }
}

/**
 * I Formation — 21 personnel look: QB, FB, HB, TE, 2 WR, 5 OL.
 * Stacked FB/HB behind QB; TE attached right; split X/Z.
 */
function iFormationTemplate(): FormationTemplate {
  const { LOS, CENTER_X, TE_OUTSIDE_RT, WR_SPLIT, UNDER_CENTER_QB } = TEMPLATE
  const ol = standardOffensiveLine()

  return {
    positions: {
      ...ol,
      Y: { x: ol.RT.x + TE_OUTSIDE_RT, y: LOS },
      X: { x: WR_SPLIT, y: LOS },
      Z: { x: FIELD_WIDTH - WR_SPLIT, y: LOS },
      QB: { x: CENTER_X, y: LOS + UNDER_CENTER_QB },
      FB: { x: CENTER_X, y: LOS + 5 },
      RB: { x: CENTER_X, y: LOS + 7.25 },
    },
    positionLabels: {
      Y: 'TE',
      X: 'WR',
      Z: 'WR',
      FB: 'FB',
      RB: 'HB',
    },
  }
}

/**
 * Pro Set — 21 personnel: QB, FB, HB, TE, 2 WR, 5 OL.
 * Offset FB/HB; TE attached right; wide splits.
 */
function proSetTemplate(): FormationTemplate {
  const { LOS, CENTER_X, TE_OUTSIDE_RT, WR_SPLIT, UNDER_CENTER_QB, GUN_RB_SPLIT } = TEMPLATE
  const ol = standardOffensiveLine()

  return {
    positions: {
      ...ol,
      Y: { x: ol.RT.x + TE_OUTSIDE_RT, y: LOS },
      X: { x: WR_SPLIT, y: LOS },
      Z: { x: FIELD_WIDTH - WR_SPLIT, y: LOS },
      QB: { x: CENTER_X, y: LOS + UNDER_CENTER_QB },
      FB: { x: CENTER_X, y: LOS + 5.5 },
      RB: { x: CENTER_X + GUN_RB_SPLIT, y: LOS + 4.25 },
    },
    positionLabels: {
      Y: 'TE',
      X: 'WR',
      Z: 'WR',
      FB: 'FB',
      RB: 'HB',
    },
  }
}

/**
 * Shotgun Trips Right — 11 personnel: QB, RB, 4 WR, 5 OL (no TE/FB).
 * X isolated left; FB/Y/Z are the three trips receivers (slot, mid, wide).
 */
function shotgunTripsRightTemplate(): FormationTemplate {
  const {
    LOS,
    CENTER_X,
    WR_SPLIT,
    SHOTGUN_QB,
    GUN_RB_SPLIT,
    TRIPS_INNER,
    TRIPS_MID,
    TRIPS_WIDE,
  } = TEMPLATE
  const ol = standardOffensiveLine()
  const gunY = LOS + SHOTGUN_QB

  return {
    positions: {
      ...ol,
      X: { x: WR_SPLIT, y: LOS },
      FB: { x: TRIPS_INNER, y: LOS },
      Y: { x: TRIPS_MID, y: LOS },
      Z: { x: TRIPS_WIDE, y: LOS },
      QB: { x: CENTER_X, y: gunY },
      RB: { x: CENTER_X - GUN_RB_SPLIT, y: gunY },
    },
    positionLabels: {
      X: 'WR',
      FB: 'SL',
      Y: 'WR',
      Z: 'WR',
      RB: 'RB',
    },
  }
}

/**
 * Singleback Ace — 12 personnel look: QB, RB, TE, H-back, 2 WR, 5 OL.
 * One deep back; TE attached right; H-back flex left.
 */
function singlebackAceTemplate(): FormationTemplate {
  const { LOS, CENTER_X, TE_OUTSIDE_RT, WR_SPLIT, UNDER_CENTER_QB, HBACK_SPLIT } = TEMPLATE
  const ol = standardOffensiveLine()

  return {
    positions: {
      ...ol,
      Y: { x: ol.RT.x + TE_OUTSIDE_RT, y: LOS },
      X: { x: WR_SPLIT, y: LOS },
      Z: { x: FIELD_WIDTH - WR_SPLIT, y: LOS },
      QB: { x: CENTER_X, y: LOS + UNDER_CENTER_QB },
      RB: { x: CENTER_X, y: LOS + 5.25 },
      FB: { x: CENTER_X - HBACK_SPLIT, y: LOS + UNDER_CENTER_QB },
    },
    positionLabels: {
      Y: 'TE',
      X: 'WR',
      Z: 'WR',
      RB: 'RB',
      FB: 'H',
    },
  }
}

/** Built-in formations — never stored in localStorage. */
export const BUILTIN_FORMATIONS: FormationDefinition[] = [
  {
    id: 'i-formation',
    label: 'I Formation',
    isBuiltin: true,
    ...iFormationTemplate(),
  },
  {
    id: 'pro-set',
    label: 'Pro Set',
    isBuiltin: true,
    ...proSetTemplate(),
  },
  {
    id: 'shotgun-trips-right',
    label: 'Shotgun Trips Right',
    isBuiltin: true,
    ...shotgunTripsRightTemplate(),
  },
  {
    id: 'singleback-ace',
    label: 'Singleback Ace',
    isBuiltin: true,
    ...singlebackAceTemplate(),
  },
]

export const DEFAULT_FORMATION_ID: BuiltInFormationId = 'i-formation'
