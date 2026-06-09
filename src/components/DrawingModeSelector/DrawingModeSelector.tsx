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
    <div className="drawing-mode-selector btn-row">
      <button
        type="button"
        className={`btn ${mode === 'route' ? 'btn-toggle-active' : ''}`}
        onClick={() => onChange('route')}
        disabled={!canEdit}
      >
        {routeLabel}
      </button>
      {playType === 'offensive' && (
        <button
          type="button"
          className={`btn btn-toggle-blocking ${mode === 'block' ? 'btn-toggle-active' : ''}`}
          onClick={() => onChange('block')}
          disabled={!canEdit}
        >
          Blocking
        </button>
      )}
    </div>
  )
}
