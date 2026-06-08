import { BUILTIN_FORMATIONS } from '../../data/builtinFormations'
import type { CustomFormation } from '../../utils/formationStorage'
import {
  getFormationById,
  isCustomFormationId,
  resolveFormationDisplayName,
} from '../../utils/formationUtils'
import './FormationSelector.css'

type FormationSelectorProps = {
  value: string
  formationName: string
  customFormations: CustomFormation[]
  onChange: (formationId: string) => void
  onSaveCurrentFormation: () => void
  onDeleteCustomFormation: () => void
}

/**
 * Formation dropdown with built-in and custom formations.
 * Coaches can save the current player alignment as a custom formation.
 */
export function FormationSelector({
  value,
  formationName,
  customFormations,
  onChange,
  onSaveCurrentFormation,
  onDeleteCustomFormation,
}: FormationSelectorProps) {
  const formationExists = getFormationById(value, customFormations) !== null
  const isCustomSelected = isCustomFormationId(value) && formationExists

  const deletedLabel = !formationExists
    ? resolveFormationDisplayName(value, formationName, customFormations)
    : null

  return (
    <div className="formation-selector">
      <div className="formation-selector-row">
        <label htmlFor="formation-select" className="formation-label">
          Formation
        </label>
        <select
          id="formation-select"
          className="formation-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <optgroup label="Built-in Formations">
            {BUILTIN_FORMATIONS.map((formation) => (
              <option key={formation.id} value={formation.id}>
                {formation.label}
              </option>
            ))}
          </optgroup>

          {customFormations.length > 0 && (
            <optgroup label="Custom Formations">
              {customFormations.map((formation) => (
                <option key={formation.id} value={formation.id}>
                  {formation.label}
                </option>
              ))}
            </optgroup>
          )}

          {deletedLabel && (
            <option value={value}>{deletedLabel}</option>
          )}
        </select>
      </div>

      <div className="formation-actions">
        <button
          type="button"
          className="formation-action-btn"
          onClick={onSaveCurrentFormation}
        >
          Save Current Formation
        </button>

        {isCustomSelected && (
          <button
            type="button"
            className="formation-action-btn formation-action-btn-delete"
            onClick={onDeleteCustomFormation}
          >
            Delete Custom Formation
          </button>
        )}
      </div>
    </div>
  )
}
