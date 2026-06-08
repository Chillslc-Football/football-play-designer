import {
  PLAYBOOK_HIT_SIZE,
  PLAYBOOK_LABEL_OFFSET,
  PLAYBOOK_SYMBOL_SIZE,
} from '../../constants/field'
import type { Defender } from '../../types/defender'
import './DefenderMarker.css'

type DefenderMarkerProps = {
  defender: Defender
  onPointerDown: (defenderId: Defender['id'], event: React.MouseEvent) => void
}

/** Coaching-board defensive marker — large X, label on hover only. */
export function DefenderMarker({ defender, onPointerDown }: DefenderMarkerProps) {
  const { x, y } = defender.position

  return (
    <g
      className="defender-marker"
      transform={`translate(${x}, ${y})`}
      aria-label={`Defense ${defender.label}`}
      onMouseDown={(event) => onPointerDown(defender.id, event)}
    >
      <rect
        x={-PLAYBOOK_HIT_SIZE}
        y={-PLAYBOOK_HIT_SIZE}
        width={PLAYBOOK_HIT_SIZE * 2}
        height={PLAYBOOK_HIT_SIZE * 2 + PLAYBOOK_LABEL_OFFSET}
        className="defender-hit-area"
      />
      <text className="defender-symbol" fontSize={PLAYBOOK_SYMBOL_SIZE}>
        X
      </text>
      <text className="defender-label" y={PLAYBOOK_LABEL_OFFSET}>
        {defender.label}
      </text>
    </g>
  )
}
