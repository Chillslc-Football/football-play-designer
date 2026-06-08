import './Toolbar.css'

type ToolbarProps = {
  onNewPlay: () => void
  onSavePlay: () => void
  onMirrorPlay: () => void
  isMirrored: boolean
}

/**
 * Action buttons that sit above the field.
 * Each button calls a handler passed down from App.tsx (the parent).
 */
export function Toolbar({ onNewPlay, onSavePlay, onMirrorPlay, isMirrored }: ToolbarProps) {
  return (
    <div className="toolbar">
      <button type="button" className="toolbar-btn" onClick={onNewPlay}>
        New Play
      </button>
      <button type="button" className="toolbar-btn toolbar-btn-primary" onClick={onSavePlay}>
        Save Play
      </button>
      <button
        type="button"
        className={`toolbar-btn ${isMirrored ? 'toolbar-btn-active' : ''}`}
        onClick={onMirrorPlay}
        title="Flip all players and routes horizontally across midfield"
      >
        Mirror Play
      </button>
    </div>
  )
}
