import './Toolbar.css'

type ToolbarProps = {
  canEdit: boolean
  selectedLoadId: string
  onNewPlay: () => void
  onSaveChanges: () => void
  onSaveAsNew: () => void
  onDeletePlay: () => void
  onMirrorPlay: () => void
  isMirrored: boolean
  isSaving?: boolean
}

export function Toolbar({
  canEdit,
  selectedLoadId,
  onNewPlay,
  onSaveChanges,
  onSaveAsNew,
  onDeletePlay,
  onMirrorPlay,
  isMirrored,
  isSaving = false,
}: ToolbarProps) {
  const saveDisabled = !canEdit || isSaving
  const canDelete = selectedLoadId !== ''

  return (
    <div className="toolbar play-actions-grid">
      <button type="button" className="btn sidebar-btn" onClick={onNewPlay} disabled={!canEdit}>
        New Play
      </button>
      <button
        type="button"
        className="btn btn-primary sidebar-btn"
        onClick={onSaveChanges}
        disabled={saveDisabled}
      >
        {isSaving ? 'Saving…' : 'Save Changes'}
      </button>
      <button
        type="button"
        className="btn sidebar-btn"
        onClick={onSaveAsNew}
        disabled={saveDisabled}
      >
        {isSaving ? 'Saving…' : 'Save As New Play'}
      </button>
      <button
        type="button"
        className="btn btn-danger sidebar-btn"
        onClick={onDeletePlay}
        disabled={!canDelete || !canEdit}
      >
        Delete Saved Play
      </button>
      <button
        type="button"
        className={`btn sidebar-btn toolbar-mirror-btn ${isMirrored ? 'btn-active' : ''}`}
        onClick={onMirrorPlay}
        disabled={!canEdit}
        title="Mirror play side across Center (C) — offense still attacks left-to-right"
      >
        Mirror Play
      </button>
    </div>
  )
}
