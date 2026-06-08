import { BUILTIN_FORMATIONS } from '../../data/builtinFormations'
import type { DriveStartYardLine } from '../../types/driveStart'
import type { CustomFormation } from '../../utils/formationStorage'
import {
  getFormationById,
  isCustomFormationId,
  resolveFormationDisplayName,
} from '../../utils/formationUtils'
import { DriveStartSelector } from '../DriveStartSelector/DriveStartSelector'
import './FormationSelector.css'

type FormationSelectorProps = {
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
  const isCustomSelected = isCustomFormationId(value) && formationExists

  const deletedLabel = !formationExists
    ? resolveFormationDisplayName(value, formationName, customFormations)
    : null

  return (
    <div className="formation-selector">
      <DriveStartSelector value={driveStartYardLine} onChange={onDriveStartChange} />

      <div className="form-group form-group-grow">
        <label htmlFor="formation-select" className="field-label">
          Select Formation
        </label>
        <select
          id="formation-select"
          className="select-field"
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

          {deletedLabel && <option value={value}>{deletedLabel}</option>}
        </select>
      </div>

      <div className="formation-selector-actions btn-row">
        <button type="button" className="btn" onClick={onSaveCurrentFormation}>
          Save Current Formation
        </button>

        {isCustomSelected && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={onDeleteCustomFormation}
          >
            Delete Custom Formation
          </button>
        )}
      </div>
    </div>
  )
}
