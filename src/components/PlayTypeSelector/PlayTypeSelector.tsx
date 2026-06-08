import type { PlayType } from '../../types/playType'
import './PlayTypeSelector.css'

type PlayTypeSelectorProps = {
  playType: PlayType
  onChange: (playType: PlayType) => void
}

export function PlayTypeSelector({ playType, onChange }: PlayTypeSelectorProps) {
  return (
    <div className="play-type-selector btn-row" role="group" aria-label="Play type">
      <button
        type="button"
        className={`btn ${playType === 'offensive' ? 'btn-toggle-active' : ''}`}
        onClick={() => onChange('offensive')}
      >
        Offensive Play
      </button>
      <button
        type="button"
        className={`btn ${playType === 'defensive' ? 'btn-toggle-active' : ''}`}
        onClick={() => onChange('defensive')}
      >
        Defensive Play
      </button>
    </div>
  )
}
