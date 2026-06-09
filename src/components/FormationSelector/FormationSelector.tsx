import { BUILTIN_FORMATIONS } from '../../data/builtinFormations'
import type { DriveStartYardLine } from '../../types/driveStart'
import type { CustomFormation } from '../../utils/formationStorage'
import {
  getFormationById,
  resolveFormationDisplayName,
} from '../../utils/formationUtils'
import { DriveStartSelector } from '../DriveStartSelector/DriveStartSelector'
import './FormationSelector.css'

type FormationSelectorProps = {
  canEdit: boolean
  value: string
  formationName: string
  driveStartYardLine: DriveStartYardLine
  customFormations: CustomFormation[]
  onChange: (formationId: string) => void
  onDriveStartChange: (driveStart: DriveStartYardLine) => void
  onSaveCurrentFormation: () => void
  onDeleteCustomFormation: () => void
}

export function FormationSelector({
  canEdit,
  value,
  formationName,
  driveStartYardLine,
  customFormations,
  onChange,
  onDriveStartChange,
  onSaveCurrentFormation,
  onDeleteCustomFormation,
}: FormationSelectorProps) {
  const formationExists = getFormationById(value, customFormations) !== null
  const isCustomSelected =
    formationExists && customFormations.some((formation) => formation.id === value)

  const deletedLabel = !formationExists
    ? resolveFormationDisplayName(value, formationName, customFormations)
    : null

  return (
    <div className="formation-selector">
      <div className="form-group">
        <label htmlFor="formation-select" className="field-label sidebar-field-label">
          Formation
        </label>
        <select
          id="formation-select"
          className="select-field sidebar-control"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!canEdit}
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

          {deletedLabel && <option value={value}>{deletedLabel}</option>}
        </select>
      </div>

      <DriveStartSelector
        value={driveStartYardLine}
        onChange={onDriveStartChange}
        disabled={!canEdit}
        compact
      />

      <div className="formation-selector-actions btn-row">
        <button
          type="button"
          className="btn sidebar-btn"
          onClick={onSaveCurrentFormation}
          disabled={!canEdit}
        >
          Save Formation
        </button>

        {isCustomSelected && (
          <button
            type="button"
            className="btn btn-danger sidebar-btn"
            onClick={onDeleteCustomFormation}
            disabled={!canEdit}
          >
            Delete Formation
          </button>
        )}
      </div>
    </div>
  )
}
