import { useEffect, useRef, useState } from 'react'
import type { PlayType } from '../../types/playType'
import type { CustomFormation } from '../../utils/formationStorage'
import { getResolvedFormationTemplates, getResolvedFrontTemplates } from '../../utils/schemeTemplateStore'
import type { NewPlaySetupDefaults, NewPlaySetupInput } from '../../utils/newPlaySetup'
import { handleModalBackdropMouseDown } from '../../utils/modalBackdrop'
import { CategorySelector } from '../CategorySelector/CategorySelector'
import '../ConfirmDialog/ConfirmDialog.css'
import './NewPlaySetupDialog.css'

export type PlaySetupDialogMode = 'create' | 'edit'

type NewPlaySetupDialogProps = {
  open: boolean
  mode: PlaySetupDialogMode
  playType: PlayType
  customFormations: CustomFormation[]
  availableCategories: string[]
  defaults: NewPlaySetupDefaults
  onSubmit: (setup: NewPlaySetupInput) => void
  onCancel: () => void
}

export function NewPlaySetupDialog({
  open,
  mode,
  playType,
  customFormations,
  availableCategories,
  defaults,
  onSubmit,
  onCancel,
}: NewPlaySetupDialogProps) {
  const [name, setName] = useState(defaults.name)
  const [formationId, setFormationId] = useState(defaults.formationId)
  const [frontId, setFrontId] = useState(defaults.frontId)
  const [categories, setCategories] = useState<string[]>(defaults.categories)
  const [notes, setNotes] = useState(defaults.notes)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    setName(defaults.name)
    setFormationId(defaults.formationId)
    setFrontId(defaults.frontId)
    setCategories(defaults.categories)
    setNotes(defaults.notes)
    nameInputRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, defaults, onCancel])

  if (!open) return null

  const isDefensive = playType === 'defensive'
  const isEditMode = mode === 'edit'

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    onSubmit({
      name,
      formationId,
      frontId: frontId.trim() === '' ? null : frontId,
      categories,
      notes,
    })
  }

  return (
    <div
      className="confirm-dialog-overlay"
      role="presentation"
      onMouseDown={(event) => handleModalBackdropMouseDown(event, onCancel)}
    >
      <div
        className="confirm-dialog new-play-setup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-play-setup-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="new-play-setup-title" className="new-play-setup-dialog-title">
          {isEditMode ? 'Edit Play Setup' : 'Create New Play'}
        </h2>

        <form className="new-play-setup-dialog-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="new-play-setup-name" className="field-label">
              Play Name
            </label>
            <input
              ref={nameInputRef}
              id="new-play-setup-name"
              type="text"
              className="input-field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="new-play-setup-formation" className="field-label">
              {isDefensive ? 'Offensive Formation (optional)' : 'Offensive Formation'}
            </label>
            <select
              id="new-play-setup-formation"
              className="select-field"
              value={formationId}
              onChange={(event) => setFormationId(event.target.value)}
            >
              {isDefensive && <option value="">None</option>}
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
          </div>

          <div className="form-group">
            <label htmlFor="new-play-setup-front" className="field-label">
              {isDefensive ? 'Defensive Front' : 'Defensive Front (optional)'}
            </label>
            <select
              id="new-play-setup-front"
              className="select-field"
              value={frontId}
              onChange={(event) => setFrontId(event.target.value)}
            >
              {!isDefensive && <option value="">None</option>}
              <optgroup label="Built-in Fronts">
                {getResolvedFrontTemplates().map((front) => (
                  <option key={front.id} value={front.id}>
                    {front.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="form-group new-play-setup-dialog-category">
            <CategorySelector
              playType={playType}
              canEdit
              selectedCategories={categories}
              availableCategories={availableCategories}
              onChange={setCategories}
              displayMode="inline"
              triggerId="new-play-setup-category-trigger"
            />
          </div>

          <div className="form-group">
            <label htmlFor="new-play-setup-notes" className="field-label">
              Notes (optional)
            </label>
            <textarea
              id="new-play-setup-notes"
              className="input-field new-play-setup-dialog-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>

          <div className="new-play-setup-dialog-actions">
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditMode ? 'Save Setup' : 'Create Play'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
