import './Toolbar.css'

type ToolbarProps = {
  canEdit: boolean
  onNewPlay: () => void
  onSaveChanges: () => void
  onSaveAsNew: () => void
  onMirrorPlay: () => void
  isMirrored: boolean
}

export function Toolbar({
  canEdit,
  onNewPlay,
  onSaveChanges,
  onSaveAsNew,
  onMirrorPlay,
  isMirrored,
}: ToolbarProps) {
  return (
    <div className="toolbar btn-row">
      <button type="button" className="btn" onClick={onNewPlay} disabled={!canEdit}>
        New Play
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onSaveChanges}
        disabled={!canEdit}
      >
        Save Changes
      </button>
      <button type="button" className="btn" onClick={onSaveAsNew} disabled={!canEdit}>
        Save As New Play
      </button>
      <button
        type="button"
        className={`btn ${isMirrored ? 'btn-active' : ''}`}
        onClick={onMirrorPlay}
        disabled={!canEdit}
        title="Mirror play side across Center (C) — offense still attacks left-to-right"
      >
        Mirror Play
      </button>
    </div>
  )
}
