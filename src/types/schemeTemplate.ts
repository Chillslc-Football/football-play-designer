import type { DefenderLabel } from './defender'
import type { PlayerLabel, Position } from './player'

export type FormationTemplateRecord = {
  id: string
  slug: string
  label: string
  positions: Record<PlayerLabel, Position>
  positionLabels?: Partial<Record<PlayerLabel, string>>
  isDefault: boolean
  isManaged: boolean
}

export type DefensiveFrontTemplateRecord = {
  id: string
  slug: string
  label: string
  positions: Record<DefenderLabel, Position>
  isDefault: boolean
  isManaged: boolean
}

export type FormationTemplateInput = {
  slug: string
  label: string
  positions: Record<PlayerLabel, Position>
  positionLabels?: Partial<Record<PlayerLabel, string>>
}

export type DefensiveFrontTemplateInput = {
  slug: string
  label: string
  positions: Record<DefenderLabel, Position>
}
