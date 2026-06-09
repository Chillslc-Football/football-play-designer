import { BUILTIN_FORMATIONS } from '../../data/builtinFormations'
import { BUILTIN_FRONTS } from '../../data/builtinFronts'
import type { DriveStartYardLine } from '../../types/driveStart'
import type { PlayType } from '../../types/playType'
import type { CustomFormation } from '../../utils/formationStorage'
import {
  getFormationById,
  resolveFormationDisplayName,
} from '../../utils/formationUtils'
import { getFrontById, resolveFrontDisplayName } from '../../utils/frontUtils'
import { DriveStartSelector } from '../DriveStartSelector/DriveStartSelector'
import './FormationSelector.css'

type FormationSelectorProps = {
  playType: PlayType
  canEdit: boolean
  formationId: string
  formationName: string
  frontId: string
  frontName: string
  driveStartYardLine: DriveStartYardLine
  customFormations: CustomFormation[]
  onFormationChange: (formationId: string) => void
  onFrontChange: (frontId: string) => void
  onDriveStartChange: (driveStart: DriveStartYardLine) => void
  onSaveCurrentFormation: () => void
  onDeleteCustomFormation: () => void
}

export function FormationSelector({
  playType,
  canEdit,
  formationId,
  formationName,
  frontId,
  frontName,
  driveStartYardLine,
  customFormations,
  onFormationChange,
  onFrontChange,
  onDriveStartChange,
  onSaveCurrentFormation,
  onDeleteCustomFormation,
}: FormationSelectorProps) {
  const isDefensive = playType === 'defensive'
  const schemeLabel = isDefensive ? 'Front' : 'Formation'
  const selectId = isDefensive ? 'front-select' : 'formation-select'

  const formationExists = getFormationById(formationId, customFormations) !== null
  const frontExists = getFrontById(frontId) !== null
  const isCustomSelected =
    !isDefensive &&
    formationExists &&
    customFormations.some((formation) => formation.id === formationId)

  const deletedFormationLabel =
    !isDefensive && !formationExists
      ? resolveFormationDisplayName(formationId, formationName, customFormations)
      : null

  const deletedFrontLabel =
    isDefensive && !frontExists ? resolveFrontDisplayName(frontId, frontName) : null

  return (
    <div className="formation-selector">
      <div className="form-group">
        <label htmlFor={selectId} className="field-label sidebar-field-label">
          {schemeLabel}
        </label>
        {isDefensive ? (
          <select
            id={selectId}
            className="select-field sidebar-control"
            value={frontId}
            onChange={(e) => onFrontChange(e.target.value)}
            disabled={!canEdit}
          >
            <optgroup label="Built-in Fronts">
              {BUILTIN_FRONTS.map((front) => (
                <option key={front.id} value={front.id}>
                  {front.label}
                </option>
              ))}
            </optgroup>
            {deletedFrontLabel && <option value={frontId}>{deletedFrontLabel}</option>}
          </select>
        ) : (
          <select
            id={selectId}
            className="select-field sidebar-control"
            value={formationId}
            onChange={(e) => onFormationChange(e.target.value)}
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

            {deletedFormationLabel && <option value={formationId}>{deletedFormationLabel}</option>}
          </select>
        )}
      </div>

      <DriveStartSelector
        value={driveStartYardLine}
        onChange={onDriveStartChange}
        disabled={!canEdit}
        compact
      />

      {!isDefensive && (
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
      )}
    </div>
  )
}
