import type { PlayType } from '../../types/playType'
import './PlayTypeSelector.css'

type PlayTypeSelectorProps = {
  playType: PlayType
  canEdit?: boolean
  onChange: (playType: PlayType) => void
}

export function PlayTypeSelector({
  playType,
  canEdit = true,
  onChange,
}: PlayTypeSelectorProps) {
  return (
    <div className="play-type-selector btn-row" role="group" aria-label="Play type">
      <button
        type="button"
        className={`btn ${playType === 'offensive' ? 'btn-toggle-active' : ''}`}
        onClick={() => onChange('offensive')}
        disabled={!canEdit}
      >
        Offensive Play
      </button>
      <button
        type="button"
        className={`btn ${playType === 'defensive' ? 'btn-toggle-active' : ''}`}
        onClick={() => onChange('defensive')}
        disabled={!canEdit}
      >
        Defensive Play
      </button>
    </div>
  )
}
