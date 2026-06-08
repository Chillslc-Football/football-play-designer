import { FORMATIONS, type FormationId } from '../../data/formations'
import './FormationSelector.css'

type FormationSelectorProps = {
  value: FormationId
  onChange: (formationId: FormationId) => void
}

/**
 * Dropdown that lets the coach pick a standard offensive formation.
 * Sits above the field; changing the selection resets player positions.
 */
export function FormationSelector({ value, onChange }: FormationSelectorProps) {
  return (
    <div className="formation-selector">
      <label htmlFor="formation-select" className="formation-label">
        Formation
      </label>
      <select
        id="formation-select"
        className="formation-select"
        value={value}
        onChange={(e) => onChange(e.target.value as FormationId)}
      >
        {FORMATIONS.map((formation) => (
          <option key={formation.id} value={formation.id}>
            {formation.label}
          </option>
        ))}
      </select>
    </div>
  )
}
