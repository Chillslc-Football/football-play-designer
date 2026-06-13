import './AdminTemplateEditBar.css'

type AdminTemplateEditBarProps = {
  kind: 'formation' | 'front'
  mode: 'create' | 'edit'
  label: string
  createLabel: string
  saving: boolean
  onCreateLabelChange: (label: string) => void
  onSave: () => void
  onCancel: () => void
}

export function AdminTemplateEditBar({
  kind,
  mode,
  label,
  createLabel,
  saving,
  onCreateLabelChange,
  onSave,
  onCancel,
}: AdminTemplateEditBarProps) {
  const templateType = kind === 'formation' ? 'Formation' : 'Defensive Front'

  return (
    <div className="admin-template-edit-bar no-print">
      <div className="admin-template-edit-bar-main">
        <p className="admin-template-edit-bar-title">
          {mode === 'create' ? `New ${templateType} Template` : `Edit ${templateType} Template`}
        </p>
        {mode === 'create' ? (
          <label className="admin-template-edit-bar-label-field">
            <span>Template name</span>
            <input
              className="input-field"
              value={createLabel}
              onChange={(event) => onCreateLabelChange(event.target.value)}
              placeholder={`e.g. ${kind === 'formation' ? 'Trips Right' : 'Nickel Wide'}`}
            />
          </label>
        ) : (
          <p className="admin-template-edit-bar-subtitle">{label}</p>
        )}
        <p className="admin-template-edit-bar-hint">
          Drag players on the field to adjust positions. Save updates the global template only.
        </p>
      </div>
      <div className="admin-template-edit-bar-actions">
        <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Template'}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          Back to Admin Templates
        </button>
      </div>
    </div>
  )
}
