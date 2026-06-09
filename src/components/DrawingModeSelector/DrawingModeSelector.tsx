import type { PlayType } from '../../types/playType'
import './DrawingModeSelector.css'

export type DrawingMode = 'route' | 'block'

type DrawingModeSelectorProps = {
  mode: DrawingMode
  playType?: PlayType
  canEdit?: boolean
  onChange: (mode: DrawingMode) => void
}

export function DrawingModeSelector({
  mode,
  playType = 'offensive',
  canEdit = true,
  onChange,
}: DrawingModeSelectorProps) {
  const routeLabel = playType === 'defensive' ? 'Movement' : 'Route'

  return (
    <div
      className="drawing-mode-toggle"
      role="radiogroup"
      aria-label="Drawing mode"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'route'}
        className={`drawing-mode-toggle-btn ${mode === 'route' ? 'drawing-mode-toggle-btn-active' : ''}`}
        onClick={() => onChange('route')}
        disabled={!canEdit}
      >
        {routeLabel}
      </button>
      {playType === 'offensive' && (
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'block'}
          className={`drawing-mode-toggle-btn drawing-mode-toggle-btn-block ${
            mode === 'block' ? 'drawing-mode-toggle-btn-active' : ''
          }`}
          onClick={() => onChange('block')}
          disabled={!canEdit}
        >
          Blocking
        </button>
      )}
    </div>
  )
}
