import './Toolbar.css'

type ToolbarProps = {
  onNewPlay: () => void
  onSaveChanges: () => void
  onSaveAsNew: () => void
  onMirrorPlay: () => void
  isMirrored: boolean
}

/**
 * Action buttons above the field.
 * Save Changes updates the active/linked saved play.
 * Save As New Play always creates a separate saved entry.
 */
export function Toolbar({
  onNewPlay,
  onSaveChanges,
  onSaveAsNew,
  onMirrorPlay,
  isMirrored,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <button type="button" className="toolbar-btn" onClick={onNewPlay}>
        New Play
      </button>
      <button type="button" className="toolbar-btn toolbar-btn-primary" onClick={onSaveChanges}>
        Save Changes
      </button>
      <button type="button" className="toolbar-btn" onClick={onSaveAsNew}>
        Save As New Play
      </button>
      <button
        type="button"
        className={`toolbar-btn ${isMirrored ? 'toolbar-btn-active' : ''}`}
        onClick={onMirrorPlay}
        title="Mirror play side across Center (C) — offense still attacks left-to-right"
      >
        Mirror Play
      </button>
    </div>
  )
}
