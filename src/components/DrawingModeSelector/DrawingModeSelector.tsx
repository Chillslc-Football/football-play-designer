import './DrawingModeSelector.css'

export type DrawingMode = 'route' | 'block'

type DrawingModeSelectorProps = {
  mode: DrawingMode
  onChange: (mode: DrawingMode) => void
}

/**
 * Toggle between Route drawing and Blocking Assignment drawing.
 * Select a player, then click and drag on the field to draw in the active mode.
 */
export function DrawingModeSelector({ mode, onChange }: DrawingModeSelectorProps) {
  return (
    <div className="drawing-mode-selector">
      <span className="drawing-mode-label">Draw Mode</span>
      <button
        type="button"
        className={`drawing-mode-btn ${mode === 'route' ? 'drawing-mode-btn-active' : ''}`}
        onClick={() => onChange('route')}
      >
        Route
      </button>
      <button
        type="button"
        className={`drawing-mode-btn ${mode === 'block' ? 'drawing-mode-btn-active' : ''}`}
        onClick={() => onChange('block')}
      >
        Blocking
      </button>
    </div>
  )
}
