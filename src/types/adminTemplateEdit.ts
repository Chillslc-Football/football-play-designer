import type { DefenderLabel } from './defender'
import type { PlayerLabel, Position } from './player'

export type AdminTemplateEditSession = {
  kind: 'formation' | 'front'
  mode: 'create' | 'edit'
  recordId?: string
  slug: string
  label: string
  positions: Record<PlayerLabel, Position> | Record<DefenderLabel, Position>
  positionLabels?: Partial<Record<PlayerLabel, string>>
}
