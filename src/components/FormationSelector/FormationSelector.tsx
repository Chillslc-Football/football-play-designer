import type { DriveStartYardLine } from '../../types/driveStart'
import type { PlayType } from '../../types/playType'
import type { CustomFormation } from '../../utils/formationStorage'
import {
  getFormationById,
  resolveFormationDisplayName,
} from '../../utils/formationUtils'
import { getFrontById, resolveFrontDisplayName } from '../../utils/frontUtils'
import {
  getResolvedFormationTemplates,
  getResolvedFrontTemplates,
} from '../../utils/schemeTemplateStore'
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
  hasDefendersOnField: boolean
  hasOffenseOnField: boolean
  onOpponentFrontChange: (frontId: string) => void
  onOpponentFormationChange: (formationId: string) => void
  onLoadDefensiveFront: () => void
  onLoadOffensiveFormation: () => void
  onRemoveDefensiveFront: () => void
  onRemoveOffensiveFormation: () => void
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
  hasDefendersOnField,
  hasOffenseOnField,
  onOpponentFrontChange,
  onOpponentFormationChange,
  onLoadDefensiveFront,
  onLoadOffensiveFormation,
  onRemoveDefensiveFront,
  onRemoveOffensiveFormation,
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
              {getResolvedFrontTemplates().map((front) => (
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
              {getResolvedFormationTemplates().map((formation) => (
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
        <div className="formation-selector-opponent">
          <p className="formation-selector-opponent-label field-label sidebar-field-label">
            Opposing Defense
          </p>
          {!hasDefendersOnField && (
            <select
              id="opponent-front-select"
              className="select-field sidebar-control"
              value={frontId}
              onChange={(e) => onOpponentFrontChange(e.target.value)}
              disabled={!canEdit}
            >
              <optgroup label="Built-in Fronts">
                {getResolvedFrontTemplates().map((front) => (
                  <option key={front.id} value={front.id}>
                    {front.label}
                  </option>
                ))}
              </optgroup>
            </select>
          )}
          <button
            type="button"
            className="btn btn-secondary sidebar-btn"
            onClick={hasDefendersOnField ? onRemoveDefensiveFront : onLoadDefensiveFront}
            disabled={!canEdit}
          >
            {hasDefendersOnField ? 'Remove Defense' : 'Load Defense'}
          </button>
        </div>
      )}

      {isDefensive && (
        <div className="formation-selector-opponent">
          <p className="formation-selector-opponent-label field-label sidebar-field-label">
            Opposing Offense
          </p>
          {!hasOffenseOnField && (
            <select
              id="opponent-formation-select"
              className="select-field sidebar-control"
              value={formationId}
              onChange={(e) => onOpponentFormationChange(e.target.value)}
              disabled={!canEdit}
            >
              <optgroup label="Built-in Formations">
                {getResolvedFormationTemplates().map((formation) => (
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
            </select>
          )}
          <button
            type="button"
            className="btn btn-secondary sidebar-btn"
            onClick={hasOffenseOnField ? onRemoveOffensiveFormation : onLoadOffensiveFormation}
            disabled={!canEdit}
          >
            {hasOffenseOnField ? 'Remove Offense' : 'Load Offense'}
          </button>
        </div>
      )}

      {!isDefensive && (
        <>
          <div className="formation-selector-actions btn-row">
            <button
              type="button"
              className="btn btn-primary sidebar-btn"
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
          <p className="formation-selector-hint">
            Position players on the field, then save as a custom formation.
          </p>
        </>
      )}
    </div>
  )
}
