import { useEffect, useRef, useState } from 'react'
import type { PlayType } from '../../types/playType'
import { CategorySelector } from '../CategorySelector/CategorySelector'
import '../ConfirmDialog/ConfirmDialog.css'
import './CategoryReminderDialog.css'

type CategoryReminderDialogProps = {
  open: boolean
  playType: PlayType
  availableCategories: string[]
  onSaveWithoutCategory: () => void
  onSaveWithCategory: (categories: string[]) => void
  onCancel: () => void
}

type DialogMode = 'prompt' | 'select'

export function CategoryReminderDialog({
  open,
  playType,
  availableCategories,
  onSaveWithoutCategory,
  onSaveWithCategory,
  onCancel,
}: CategoryReminderDialogProps) {
  const [mode, setMode] = useState<DialogMode>('prompt')
  const [draftCategories, setDraftCategories] = useState<string[]>([])
  const primaryActionRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    setMode('prompt')
    setDraftCategories([])
    primaryActionRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  useEffect(() => {
    if (!open || mode !== 'select') return
    primaryActionRef.current?.focus()
  }, [open, mode])

  if (!open) return null

  return (
    <div
      className="confirm-dialog-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
    >
      <div
        className={`confirm-dialog category-reminder-dialog ${
          mode === 'select' ? 'category-reminder-dialog-select' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-reminder-title"
        aria-describedby="category-reminder-message"
      >
        <h2 id="category-reminder-title" className="category-reminder-dialog-title">
          No category selected
        </h2>

        <p id="category-reminder-message" className="category-reminder-dialog-message">
          Do you want to add a category before saving this play?
        </p>

        {mode === 'select' && (
          <div className="category-reminder-dialog-selector">
            <CategorySelector
              playType={playType}
              canEdit
              selectedCategories={draftCategories}
              availableCategories={availableCategories}
              onChange={setDraftCategories}
              displayMode="inline"
              triggerId="category-reminder-multiselect-trigger"
              hideLabel
            />
          </div>
        )}

        <div className="category-reminder-dialog-actions">
          {mode === 'prompt' ? (
            <>
              <button
                ref={primaryActionRef}
                type="button"
                className="btn btn-primary"
                onClick={() => setMode('select')}
              >
                Add Category
              </button>
              <button type="button" className="btn" onClick={onSaveWithoutCategory}>
                Save Without Category
              </button>
              <button type="button" className="btn" onClick={onCancel}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                ref={primaryActionRef}
                type="button"
                className="btn btn-primary"
                onClick={() => onSaveWithCategory(draftCategories)}
                disabled={draftCategories.length === 0}
              >
                Save With Category
              </button>
              <button type="button" className="btn" onClick={onSaveWithoutCategory}>
                Save Without Category
              </button>
              <button type="button" className="btn" onClick={onCancel}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
