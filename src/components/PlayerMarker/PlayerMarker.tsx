import {
  PLAYBOOK_HIT_SIZE,
  PLAYBOOK_LABEL_OFFSET,
  PLAYBOOK_SYMBOL_SIZE,
} from '../../constants/field'
import type { Player } from '../../types/player'

type PlayerMarkerProps = {
  player: Player
  isSelected: boolean
  hasNotes: boolean
  isLocked?: boolean
  onPointerDown: (playerId: Player['id'], event: React.MouseEvent) => void
}

/** Coaching-board offensive marker — black O; label shown on hover or selection only. */
export function PlayerMarker({
  player,
  isSelected,
  isLocked = false,
  onPointerDown,
}: PlayerMarkerProps) {
  const { x, y } = player.position

  return (
    <g
      className={`player-marker ${isSelected ? 'player-marker-selected' : ''} ${isLocked ? 'player-marker-locked' : ''}`}
      transform={`translate(${x}, ${y})`}
      aria-label={`Offense ${player.label}${isLocked ? ' (locked)' : ''}`}
      onMouseDown={isLocked ? undefined : (event) => onPointerDown(player.id, event)}
    >
      <rect
        x={-PLAYBOOK_HIT_SIZE}
        y={-PLAYBOOK_HIT_SIZE}
        width={PLAYBOOK_HIT_SIZE * 2}
        height={PLAYBOOK_HIT_SIZE * 2}
        className="player-hit-area"
      />
      <text className="player-symbol" fontSize={PLAYBOOK_SYMBOL_SIZE}>
        O
      </text>
      <text className="player-label" y={PLAYBOOK_LABEL_OFFSET}>
        {player.label}
      </text>
    </g>
  )
}
