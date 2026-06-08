import './Toolbar.css'

type ToolbarProps = {
  onNewPlay: () => void
  onSaveChanges: () => void
  onSaveAsNew: () => void
  onMirrorPlay: () => void
  isMirrored: boolean
}

export function Toolbar({
  onNewPlay,
  onSaveChanges,
  onSaveAsNew,
  onMirrorPlay,
  isMirrored,
}: ToolbarProps) {
  return (
    <div className="toolbar btn-row">
      <button type="button" className="btn" onClick={onNewPlay}>
        New Play
      </button>
      <button type="button" className="btn btn-primary" onClick={onSaveChanges}>
        Save Changes
      </button>
      <button type="button" className="btn" onClick={onSaveAsNew}>
        Save As New Play
      </button>
      <button
        type="button"
        className={`btn ${isMirrored ? 'btn-active' : ''}`}
        onClick={onMirrorPlay}
        title="Mirror play side across Center (C) — offense still attacks left-to-right"
      >
        Mirror Play
      </button>
    </div>
  )
}
