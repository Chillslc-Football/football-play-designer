import { FIELD_WIDTH } from '../constants/field'
import type { Player, PlayerLabel, Position } from '../types/player'

/**
 * Formation positions are defined here in `src/data/formations.ts`.
 *
 * Coordinate system (bird's-eye view, offense facing right):
 *   x = depth downfield toward the right end zone (line of scrimmage = LOS)
 *   y = across the field, 0 = top sideline, FIELD_WIDTH = bottom sideline
 *
 * All spacing uses the `SPACING` constants below so every formation
 * shares the same OL, backfield, and receiver landmarks. Adjust one value
 * here to shift the whole playbook consistently.
 */

/** Unique id for each formation — stored in play state and used by the dropdown. */
export type FormationId =
  | 'i-formation'
  | 'pro-set'
  | 'shotgun-trips-right'
  | 'singleback-ace'

/** One formation preset: a display name plus where each player stands. */
export type FormationDefinition = {
  id: FormationId
  label: string
  positions: Record<PlayerLabel, Position>
}

/**
 * Shared spacing constants (1 unit = 1 yard on the field SVG).
 * PLAYER_RADIUS is 2, so adjacent players need ≥ 4.5 units between centers.
 */
const SPACING = {
  /** Line of scrimmage — shared x for OL and on-line receivers. */
  LOS: 48,

  /** Horizontal midfield across the field width. */
  CENTER_Y: FIELD_WIDTH / 2,

  /** Distance between adjacent OL (C–G and G–T); 4.5 prevents overlap with r=2. */
  OL_GAP: 4.5,

  /** QB depth directly behind center. */
  QB_DEPTH: 2,

  /** FB depth behind QB (I Formation stack). */
  FB_DEPTH: 5.5,

  /** RB depth behind FB (I Formation tailback). */
  RB_DEPTH: 9.5,

  /** Shotgun snap depth behind center. */
  SHOTGUN_DEPTH: 5,

  /** Pro Set — FB/RB offset left/right of center at this depth. */
  PRO_SET_DEPTH: 4,
  PRO_SET_SPLIT: 4.5,

  /** Singleback RB depth straight behind QB. */
  SINGLEBACK_DEPTH: 7,

  /** H-back / offset back offset from center (Singleback Ace). */
  HBACK_SPLIT: 4.5,

  /** Shotgun RB offset beside QB. */
  GUN_RB_SPLIT: 4.5,

  /** Yards inside the sideline for split wide receivers (X, Z). */
  WR_SIDELINE: 4,

  /** Y outside RT — minimum center distance from RT (≥ 2 × PLAYER_RADIUS). */
  TE_OUTSIDE_TACKLE: 4.5,

  /** Horizontal gap between trips receivers (Shotgun Trips Right). */
  TRIPS_GAP: 4.5,
} as const

/** Standard offensive line — LT, LG, C, RG, RT spread evenly on the LOS. */
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

/** Split wide receivers near both sidelines on the LOS. */
function wideReceivers(): Pick<Record<PlayerLabel, Position>, 'X' | 'Z'> {
  const { LOS, WR_SIDELINE } = SPACING

  return {
    X: { x: LOS, y: WR_SIDELINE },
    Z: { x: LOS, y: FIELD_WIDTH - WR_SIDELINE },
  }
}

/** Tight end aligned just outside the right tackle on the LOS. */
function tightEndOutsideTackle(): Pick<Record<PlayerLabel, Position>, 'Y'> {
  const ol = offensiveLine()
  const { LOS, TE_OUTSIDE_TACKLE } = SPACING

  return {
    Y: { x: LOS, y: ol.RT.y + TE_OUTSIDE_TACKLE },
  }
}

/**
 * All available formations.
 * Add new entries to this array to support more presets in the dropdown.
 */
export const FORMATIONS: FormationDefinition[] = [
  {
    id: 'i-formation',
    label: 'I Formation',
    positions: {
      ...offensiveLine(),
      ...wideReceivers(),
      ...tightEndOutsideTackle(),
      // QB directly behind center
      QB: { x: SPACING.LOS - SPACING.QB_DEPTH, y: SPACING.CENTER_Y },
      // FB stacked behind QB
      FB: { x: SPACING.LOS - SPACING.FB_DEPTH, y: SPACING.CENTER_Y },
      // RB stacked behind FB
      RB: { x: SPACING.LOS - SPACING.RB_DEPTH, y: SPACING.CENTER_Y },
    },
  },
  {
    id: 'pro-set',
    label: 'Pro Set',
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
    positions: {
      ...offensiveLine(),
      QB: { x: SPACING.LOS - SPACING.SHOTGUN_DEPTH, y: SPACING.CENTER_Y },
      RB: {
        x: SPACING.LOS - SPACING.SHOTGUN_DEPTH,
        y: SPACING.CENTER_Y - SPACING.GUN_RB_SPLIT,
      },
      // X isolated wide on the left sideline
      X: { x: SPACING.LOS, y: SPACING.WR_SIDELINE },
      // Trips right: FB (slot), Y, Z — spaced horizontally outside the RT
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
    positions: {
      ...offensiveLine(),
      ...wideReceivers(),
      ...tightEndOutsideTackle(),
      QB: { x: SPACING.LOS - SPACING.QB_DEPTH, y: SPACING.CENTER_Y },
      RB: { x: SPACING.LOS - SPACING.SINGLEBACK_DEPTH, y: SPACING.CENTER_Y },
      // FB as weak-side H-back in Ace
      FB: {
        x: SPACING.LOS - SPACING.QB_DEPTH,
        y: SPACING.CENTER_Y - SPACING.HBACK_SPLIT,
      },
    },
  },
]

/** Default formation used when creating a new play. */
export const DEFAULT_FORMATION_ID: FormationId = 'i-formation'

/** Look up a formation definition by its id. */
export function getFormationById(id: FormationId): FormationDefinition {
  const formation = FORMATIONS.find((f) => f.id === id)
  if (!formation) {
    return FORMATIONS[0]
  }
  return formation
}

/** Builds the 11 Player objects from a formation's position map. */
export function playersFromFormation(formation: FormationDefinition): Player[] {
  const labels = Object.keys(formation.positions) as PlayerLabel[]
  return labels.map((label) => ({
    id: label,
    label,
    position: formation.positions[label],
  }))
}

/** Convenience helper — create players directly from a formation id. */
export function createPlayersForFormation(formationId: FormationId): Player[] {
  return playersFromFormation(getFormationById(formationId))
}
