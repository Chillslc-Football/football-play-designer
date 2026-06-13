import {
  FIELD_WIDTH,
  LOS_VIEW_Y,
} from '../constants/field'
import {
  ALL_DEFENDER_LABELS,
  DEFENDER_DISPLAY_LABEL,
  type Defender,
  type DefenderLabel,
} from '../types/defender'
import type { Position } from '../types/player'

/**
 * Built-in defensive front positions live here in `src/data/builtinFronts.ts`.
 * Custom fronts are stored separately in localStorage / Supabase.
 *
 * Coordinates use the 50-yard portrait view (1 unit = 1 yard).
 * x = lateral, y = depth (defense aligns north of the LOS toward y = 0).
 * The line of scrimmage is at LOS_VIEW_Y.
 *
 * Alignments reference a standard offensive line (65% inside-hash span) so DL
 * line up in realistic gaps relative to LT–LG–C–RG–RT.
 */

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

/** Offensive landmarks used to anchor defensive alignments. */
const TEMPLATE = {
  LOS: LOS_VIEW_Y,
  CENTER_X: FIELD_WIDTH / 2,
  OL_GAP: ((FIELD_WIDTH - 17 - 17) * 0.65) / 4,
  DL_DEPTH: 1,
  LB_DEPTH: 5,
  CB_DEPTH: 10.5,
  SS_DEPTH: 13,
  FS_DEPTH: 14.5,
} as const

const OL = {
  LT: TEMPLATE.CENTER_X - TEMPLATE.OL_GAP * 2,
  LG: TEMPLATE.CENTER_X - TEMPLATE.OL_GAP,
  C: TEMPLATE.CENTER_X,
  RG: TEMPLATE.CENTER_X + TEMPLATE.OL_GAP,
  RT: TEMPLATE.CENTER_X + TEMPLATE.OL_GAP * 2,
} as const

const { LOS, DL_DEPTH, LB_DEPTH, CB_DEPTH, SS_DEPTH, FS_DEPTH } = TEMPLATE
const dlY = LOS - DL_DEPTH
const lbY = LOS - LB_DEPTH
const cbY = LOS - CB_DEPTH
const ssY = LOS - SS_DEPTH
const fsY = LOS - FS_DEPTH

type FrontTemplate = Record<DefenderLabel, Position>

/**
 * 4-3 — even front: 4 DL, 3 LB, 2 CB, 2 S.
 * LE/RE 5-tech outside tackles; DTs in 3-tech and 1-tech shades.
 */
function fourThreeFront(): FrontTemplate {
  return {
    LE: { x: OL.LT - 1.85, y: dlY },
    DT1: { x: (OL.LT + OL.LG) / 2, y: dlY },
    DT2: { x: OL.C + 0.9, y: dlY },
    RE: { x: OL.RT + 1.85, y: dlY },
    LOLB: { x: OL.LT - 3.75, y: lbY },
    MLB: { x: OL.C, y: lbY - 0.5 },
    ROLB: { x: OL.RT + 0.5, y: lbY },
    CB1: { x: 4.5, y: cbY },
    CB2: { x: FIELD_WIDTH - 4.5, y: cbY },
    FS: { x: OL.C - 6, y: fsY },
    SS: { x: OL.RT + 0.25, y: ssY },
  }
}

/**
 * 3-4 — base 3-down front: NT + 2 DEs on LOS, 2 OLBs on the edge, 2 ILBs stacked, 2-high safeties.
 * LE/RE = 5-tech DEs outside tackles; DT1 = 0-tech nose on center.
 * LOLB/DT2 = wide OLBs in 2-point edge leverage (shallow, outside the DEs).
 * MLB/ROLB = ILBs in the left/right A-gaps, 5 yd deep.
 */
function threeFourFront(): FrontTemplate {
  const olbY = LOS - 3
  const ilbLeftX = (OL.LG + OL.C) / 2
  const ilbRightX = (OL.C + OL.RG) / 2
  const safetyY = LOS - 12.5

  return {
    LE: { x: OL.LT - 1.85, y: dlY },
    DT1: { x: OL.C, y: dlY },
    RE: { x: OL.RT + 1.85, y: dlY },
    LOLB: { x: OL.LT - 6, y: olbY },
    DT2: { x: OL.RT + 6, y: olbY },
    MLB: { x: ilbLeftX, y: lbY },
    ROLB: { x: ilbRightX, y: lbY },
    CB1: { x: 4.5, y: cbY },
    CB2: { x: FIELD_WIDTH - 4.5, y: cbY },
    FS: { x: OL.C - 5, y: safetyY },
    SS: { x: OL.C + 5, y: safetyY },
  }
}

/**
 * 5-2 — five down linemen, two stacked LBs, 2 CB, 2 S.
 * LOLB slot = fifth DL (strong-side end); MLB/ROLB = two linebackers.
 */
function fiveTwoFront(): FrontTemplate {
  return {
    LE: { x: OL.LT - 2.5, y: dlY },
    DT1: { x: (OL.LT + OL.LG) / 2, y: dlY },
    DT2: { x: OL.C, y: dlY },
    RE: { x: (OL.RG + OL.RT) / 2, y: dlY },
    LOLB: { x: OL.RT + 3.75, y: dlY },
    MLB: { x: OL.LG + 0.25, y: lbY },
    ROLB: { x: OL.RG - 0.25, y: lbY },
    CB1: { x: 4.5, y: LOS - 10 },
    CB2: { x: FIELD_WIDTH - 4.5, y: LOS - 10 },
    FS: { x: OL.C - 5, y: LOS - 13.5 },
    SS: { x: OL.C + 5, y: LOS - 13.5 },
  }
}

/**
 * 4-4 — four DL, four linebackers (SS as strong LB), one deep safety, 2 CB.
 */
function fourFourFront(): FrontTemplate {
  return {
    LE: { x: OL.LT - 1.85, y: dlY },
    DT1: { x: (OL.LG + OL.C) / 2, y: dlY },
    DT2: { x: (OL.C + OL.RG) / 2 + 1.1, y: dlY },
    RE: { x: OL.RT + 2.5, y: dlY },
    LOLB: { x: OL.LT - 3.5, y: LOS - 4.5 },
    MLB: { x: OL.C, y: lbY - 0.5 },
    ROLB: { x: OL.RT + 2, y: LOS - 4.5 },
    SS: { x: OL.RG + 0.5, y: LOS - 4.5 },
    CB1: { x: 4.5, y: LOS - 10 },
    CB2: { x: FIELD_WIDTH - 4.5, y: LOS - 10 },
    FS: { x: OL.C, y: LOS - 13 },
  }
}

/**
 * Nickel (4-2-5) — four rushers, two LBs, five DBs.
 * ROLB aligned as slot nickel; safeties wider and shallower than base.
 */
function nickelFront(): FrontTemplate {
  return {
    LE: { x: OL.LT - 1.5, y: dlY },
    DT1: { x: (OL.LG + OL.C) / 2, y: dlY },
    DT2: { x: (OL.C + OL.RG) / 2, y: dlY },
    RE: { x: OL.RT + 2.25, y: dlY },
    LOLB: { x: OL.LG - 0.5, y: LOS - 4.25 },
    MLB: { x: OL.C, y: LOS - 5 },
    ROLB: { x: OL.RT + 7.25, y: LOS - 8.5 },
    CB1: { x: 3, y: LOS - 9 },
    CB2: { x: FIELD_WIDTH - 3, y: LOS - 9 },
    FS: { x: OL.C - 8, y: LOS - 11.5 },
    SS: { x: OL.C + 8, y: LOS - 11.5 },
  }
}

/**
 * Dime (4-1-6) — four rushers, one MLB, six DBs.
 * LOLB/ROLB play as extra DBs; lighter box, more depth in secondary.
 */
function dimeFront(): FrontTemplate {
  return {
    LE: { x: OL.LT - 1.25, y: dlY },
    DT1: { x: OL.LG + 0.5, y: dlY },
    DT2: { x: OL.RG - 0.5, y: dlY },
    RE: { x: OL.RT + 2, y: dlY },
    MLB: { x: OL.C, y: LOS - 5 },
    LOLB: { x: OL.LT - 6, y: LOS - 8.5 },
    ROLB: { x: OL.RT + 9, y: LOS - 8.5 },
    CB1: { x: 2.5, y: LOS - 8.5 },
    CB2: { x: FIELD_WIDTH - 2.5, y: LOS - 8.5 },
    FS: { x: OL.C - 7.5, y: LOS - 11 },
    SS: { x: OL.C + 7.5, y: LOS - 11 },
  }
}

/**
 * Goal Line — heavy run front; tight box, pressed corners, shallow safeties.
 * Spacing kept above minimum so markers never touch.
 */
function goalLineFront(): FrontTemplate {
  return {
    LE: { x: OL.LT - 0.75, y: LOS - 0.75 },
    DT1: { x: (OL.LT + OL.LG) / 2 + 0.5, y: LOS - 0.75 },
    DT2: { x: OL.C + 1.1, y: LOS - 0.75 },
    RE: { x: OL.RT + 0.75, y: LOS - 0.75 },
    LOLB: { x: OL.LT - 2.25, y: LOS - 2.75 },
    MLB: { x: OL.C, y: LOS - 3 },
    ROLB: { x: OL.RG + 0.25, y: LOS - 2.75 },
    CB1: { x: 6, y: LOS - 3.5 },
    CB2: { x: FIELD_WIDTH - 6, y: LOS - 3.5 },
    FS: { x: OL.LG + 0.5, y: LOS - 5.5 },
    SS: { x: OL.RG - 0.5, y: LOS - 5.5 },
  }
}

/** Built-in defensive fronts — never stored in localStorage. */
export const BUILTIN_FRONTS: FrontDefinition[] = [
  { id: '4-3', label: '4-3', isBuiltin: true, positions: fourThreeFront() },
  { id: '3-4', label: '3-4', isBuiltin: true, positions: threeFourFront() },
  { id: '5-2', label: '5-2', isBuiltin: true, positions: fiveTwoFront() },
  { id: '4-4', label: '4-4', isBuiltin: true, positions: fourFourFront() },
  { id: 'nickel', label: 'Nickel', isBuiltin: true, positions: nickelFront() },
  { id: 'dime', label: 'Dime', isBuiltin: true, positions: dimeFront() },
  { id: 'goal-line', label: 'Goal Line', isBuiltin: true, positions: goalLineFront() },
]

export const DEFAULT_FRONT_ID: BuiltInFrontId = '4-3'

export function defendersFromFront(front: FrontDefinition): Defender[] {
  return ALL_DEFENDER_LABELS.map((id) => ({
    id,
    label: DEFENDER_DISPLAY_LABEL[id],
    position: front.positions[id],
  }))
}
