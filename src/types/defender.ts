import type { Position } from './player'

/** Unique ids for the 11 defenders in a 4-3 alignment. */
export type DefenderLabel =
  | 'LE'
  | 'DT1'
  | 'DT2'
  | 'RE'
  | 'LOLB'
  | 'MLB'
  | 'ROLB'
  | 'CB1'
  | 'CB2'
  | 'FS'
  | 'SS'

export type Defender = {
  id: DefenderLabel
  label: string
  position: Position
}

/** Short label shown on the playbook diagram. */
export const DEFENDER_DISPLAY_LABEL: Record<DefenderLabel, string> = {
  LE: 'LE',
  DT1: 'DT',
  DT2: 'DT',
  RE: 'RE',
  LOLB: 'LOLB',
  MLB: 'MLB',
  ROLB: 'ROLB',
  CB1: 'CB',
  CB2: 'CB',
  FS: 'FS',
  SS: 'SS',
}

export const ALL_DEFENDER_LABELS: DefenderLabel[] = [
  'LE',
  'DT1',
  'DT2',
  'RE',
  'LOLB',
  'MLB',
  'ROLB',
  'CB1',
  'CB2',
  'FS',
  'SS',
]
