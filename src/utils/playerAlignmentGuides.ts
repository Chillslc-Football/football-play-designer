import type { Player, PlayerLabel } from '../types/player'

export const PLAYER_ALIGNMENT_TOLERANCE_YARDS = 0.25

export type PlayerAlignmentGuide =
  | { axis: 'horizontal'; y: number }
  | { axis: 'vertical'; x: number }

export function getPlayerAlignmentGuides(
  activePlayerId: PlayerLabel,
  players: Player[],
  tolerance = PLAYER_ALIGNMENT_TOLERANCE_YARDS,
): PlayerAlignmentGuide[] {
  const activePlayer = players.find((player) => player.id === activePlayerId)
  if (!activePlayer) return []

  let showHorizontal = false
  let showVertical = false

  for (const player of players) {
    if (player.id === activePlayerId) continue

    if (Math.abs(player.position.y - activePlayer.position.y) <= tolerance) {
      showHorizontal = true
    }

    if (Math.abs(player.position.x - activePlayer.position.x) <= tolerance) {
      showVertical = true
    }
  }

  const guides: PlayerAlignmentGuide[] = []

  if (showHorizontal) {
    guides.push({ axis: 'horizontal', y: activePlayer.position.y })
  }

  if (showVertical) {
    guides.push({ axis: 'vertical', x: activePlayer.position.x })
  }

  return guides
}
