import { FIELD_WIDTH } from '../constants/field'
import {
  ALL_DEFENDER_LABELS,
  DEFENDER_DISPLAY_LABEL,
  type Defender,
  type DefenderLabel,
} from '../types/defender'
import type { Player, PlayerLabel, Position } from '../types/player'
import type { Play } from '../types/play'
import {
  getTeamPlayerCount,
  type TeamFormat,
} from '../types/teamFormat'
import type { CustomFormation } from './formationStorage'
import { createPlayersForFormation } from './formationUtils'
import { createDefendersForFront } from './frontUtils'
import { DEFENSE_MIN_Y, OFFENSE_MAX_Y } from './losClamp'

/** Offensive slot priority when reducing to 7v7 or 8v8. */
const OFFENSE_SLOT_ORDER: PlayerLabel[] = [
  'LT',
  'LG',
  'C',
  'RG',
  'RT',
  'QB',
  'RB',
  'FB',
  'X',
  'Y',
  'Z',
]

export function isReducedTeamFormat(format: TeamFormat): boolean {
  return format === '8v8' || format === '7v7'
}

export function offenseSlotsForFormat(format: TeamFormat): PlayerLabel[] {
  return OFFENSE_SLOT_ORDER.slice(0, getTeamPlayerCount(format))
}

export function defenseSlotsForFormat(format: TeamFormat): DefenderLabel[] {
  return ALL_DEFENDER_LABELS.slice(0, getTeamPlayerCount(format))
}

/** Evenly space `playerCount` markers along the line of scrimmage for one side. */
export function createLineOfScrimmagePositions(
  playerCount: number,
  side: 'offense' | 'defense',
): Position[] {
  const y = side === 'offense' ? OFFENSE_MAX_Y : DEFENSE_MIN_Y
  const margin = 4
  const span = FIELD_WIDTH - 2 * margin

  if (playerCount <= 0) {
    return []
  }

  if (playerCount === 1) {
    return [{ x: FIELD_WIDTH / 2, y }]
  }

  return Array.from({ length: playerCount }, (_, index) => ({
    x: margin + (span * index) / (playerCount - 1),
    y,
  }))
}

/** @deprecated Use createLineOfScrimmagePositions */
export function createLosAlignedPositions(
  count: number,
  side: 'offense' | 'defense',
): Position[] {
  return createLineOfScrimmagePositions(count, side)
}

function offenseDisplayLabel(format: TeamFormat, index: number, id: PlayerLabel): string {
  if (format === '11v11') {
    return id
  }

  return `O${index + 1}`
}

function defenseDisplayLabel(format: TeamFormat, index: number, id: DefenderLabel): string {
  if (format === '11v11') {
    return DEFENDER_DISPLAY_LABEL[id]
  }

  return `D${index + 1}`
}

export function createLineOfScrimmagePlayers(
  playerCount: number,
  side: 'offense' | 'defense',
  format: TeamFormat,
): Player[] | Defender[] {
  if (side === 'defense') {
    const slots = ALL_DEFENDER_LABELS.slice(0, playerCount)
    const positions = createLineOfScrimmagePositions(playerCount, 'defense')
    return slots.map((id, index) => ({
      id,
      label: defenseDisplayLabel(format, index, id),
      position: positions[index],
    }))
  }

  const slots = OFFENSE_SLOT_ORDER.slice(0, playerCount)
  const positions = createLineOfScrimmagePositions(playerCount, 'offense')
  return slots.map((id, index) => ({
    id,
    label: offenseDisplayLabel(format, index, id),
    position: positions[index],
  }))
}

export function createPlayersOnLos(format: TeamFormat): Player[] {
  return createLineOfScrimmagePlayers(getTeamPlayerCount(format), 'offense', format) as Player[]
}

export function createDefendersOnLos(format: TeamFormat): Defender[] {
  return createLineOfScrimmagePlayers(getTeamPlayerCount(format), 'defense', format) as Defender[]
}

export function createPlayersForTeamFormat(
  format: TeamFormat,
  formationId: string,
  customFormations: CustomFormation[],
): Player[] {
  if (format === '11v11') {
    return createPlayersForFormation(formationId, customFormations)
  }

  return createPlayersOnLos(format)
}

export function createDefendersForTeamFormat(
  format: TeamFormat,
  frontId: string,
): Defender[] {
  if (format === '11v11') {
    return createDefendersForFront(frontId)
  }

  return createDefendersOnLos(format)
}

function defaultOffensePlayer(
  id: PlayerLabel,
  format: TeamFormat,
  index: number,
  position: Position,
): Player {
  return {
    id,
    label: offenseDisplayLabel(format, index, id),
    position,
  }
}

function defaultDefender(
  id: DefenderLabel,
  format: TeamFormat,
  index: number,
  position: Position,
): Defender {
  return {
    id,
    label: defenseDisplayLabel(format, index, id),
    position,
  }
}

function playerHasSavedActions(play: Play | undefined, playerId: PlayerLabel): boolean {
  if (!play) {
    return false
  }

  const chains = play.playerActions?.[playerId] ?? []
  if (chains.some((action) => action.points.length > 0)) {
    return true
  }

  if (play.routes.some((route) => route.playerId === playerId && route.points.length > 0)) {
    return true
  }

  if (play.blocks.some((block) => block.playerId === playerId && block.points.length > 0)) {
    return true
  }

  if (
    (play.motions ?? []).some(
      (motion) => motion.playerId === playerId && motion.points.length > 0,
    )
  ) {
    return true
  }

  return (play.playerNotes?.[playerId]?.trim().length ?? 0) > 0
}

function pickPlayersToKeep(
  players: Player[],
  slots: PlayerLabel[],
  play: Play | undefined,
): Player[] {
  const byId = new Map(players.map((player) => [player.id, player]))
  const kept: Player[] = []
  const keptIds = new Set<PlayerLabel>()

  for (const player of players) {
    if (!playerHasSavedActions(play, player.id)) {
      continue
    }

    if (kept.length >= slots.length) {
      break
    }

    kept.push(player)
    keptIds.add(player.id)
  }

  for (const slotId of slots) {
    if (kept.length >= slots.length) {
      break
    }

    if (keptIds.has(slotId)) {
      continue
    }

    const existing = byId.get(slotId)
    if (existing) {
      kept.push(existing)
      keptIds.add(slotId)
    }
  }

  return kept.slice(0, slots.length)
}

export function limitPlayersToFormat(
  players: Player[],
  format: TeamFormat,
  play?: Play,
): Player[] {
  const slots = offenseSlotsForFormat(format)
  const positions = createLineOfScrimmagePositions(slots.length, 'offense')

  if (format === '11v11') {
    const byId = new Map(players.map((player) => [player.id, player]))
    return slots.map(
      (id, index) =>
        byId.get(id) ??
        defaultOffensePlayer(
          id,
          format,
          index,
          positions[index] ?? { x: FIELD_WIDTH / 2, y: OFFENSE_MAX_Y },
        ),
    )
  }

  if (players.length === 0) {
    return createPlayersOnLos(format)
  }

  const sourcePlayers =
    players.length > slots.length ? pickPlayersToKeep(players, slots, play) : players
  const byId = new Map(sourcePlayers.map((player) => [player.id, player]))

  return slots.map((id, index) => {
    const existing = byId.get(id)
    if (existing) {
      return { ...existing, position: positions[index] }
    }

    return defaultOffensePlayer(id, format, index, positions[index])
  })
}

export function limitDefendersToFormat(defenders: Defender[], format: TeamFormat): Defender[] {
  const slots = defenseSlotsForFormat(format)
  const positions = createLineOfScrimmagePositions(slots.length, 'defense')

  if (format === '11v11') {
    const byId = new Map(defenders.map((defender) => [defender.id, defender]))
    return slots.map(
      (id, index) =>
        byId.get(id) ??
        defaultDefender(
          id,
          format,
          index,
          positions[index] ?? { x: FIELD_WIDTH / 2, y: DEFENSE_MIN_Y },
        ),
    )
  }

  if (defenders.length === 0) {
    return []
  }

  const byId = new Map(defenders.map((defender) => [defender.id, defender]))

  return slots.map((id, index) => {
    const existing = byId.get(id)
    if (existing) {
      return { ...existing, position: positions[index] }
    }

    return defaultDefender(id, format, index, positions[index])
  })
}

export function applyTeamFormatToPlay(play: Play, format: TeamFormat): Play {
  let players = play.players
  let defenders = play.defenders

  if (isReducedTeamFormat(format)) {
    players = limitPlayersToFormat(players, format, play)
    defenders =
      defenders.length > 0 ? limitDefendersToFormat(defenders, format) : defenders
  } else {
    if (players.length > 0) {
      players = limitPlayersToFormat(players, format, play)
    }
    if (defenders.length > 0) {
      defenders = limitDefendersToFormat(defenders, format)
    }
  }

  return {
    ...play,
    players,
    defenders,
  }
}

export function playMatchesTeamFormat(play: Play, format: TeamFormat): boolean {
  const targetCount = getTeamPlayerCount(format)

  if (format === '11v11') {
    return (
      (play.players.length === 0 || play.players.length === targetCount) &&
      (play.defenders.length === 0 || play.defenders.length === targetCount)
    )
  }

  return play.players.length === targetCount || play.players.length === 0
    ? play.defenders.length === 0 || play.defenders.length === targetCount
    : false
}
