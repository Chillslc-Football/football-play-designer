import { PLAYER_RADIUS } from '../../constants/field'
import type { Player } from '../../types/player'
import './PlayerMarker.css'

type PlayerMarkerProps = {
  player: Player
  isSelected: boolean
  hasNotes: boolean
  onPointerDown: (playerId: Player['id'], event: React.MouseEvent) => void
}

/**
 * A single offensive player drawn as a draggable circle with a label.
 * A white ring appears when selected; a small dot appears when the player has notes.
 */
export function PlayerMarker({ player, isSelected, hasNotes, onPointerDown }: PlayerMarkerProps) {
  const { x, y } = player.position

  return (
    <g
      className={`player-marker ${isSelected ? 'player-marker-selected' : ''} ${hasNotes ? 'player-marker-has-notes' : ''}`}
      transform={`translate(${x}, ${y})`}
      onMouseDown={(event) => onPointerDown(player.id, event)}
    >
      {isSelected && (
        <circle r={PLAYER_RADIUS + 0.6} className="player-selection-ring" />
      )}
      <circle r={PLAYER_RADIUS} className="player-circle" />
      <text className="player-label">{player.label}</text>
      {hasNotes && (
        <circle cx={PLAYER_RADIUS * 0.55} cy={-PLAYER_RADIUS * 0.55} r={0.55} className="player-note-dot" />
      )}
    </g>
  )
}
