import './FieldGridControl.css'

type FieldGridControlProps = {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export function FieldGridControl({ enabled, onChange }: FieldGridControlProps) {
  return (
    <button
      type="button"
      className={`field-grid-control ${enabled ? 'is-active' : ''}`}
      onClick={() => onChange(!enabled)}
      aria-pressed={enabled}
      aria-label={enabled ? 'Hide alignment grid' : 'Show alignment grid'}
    >
      Grid
    </button>
  )
}
