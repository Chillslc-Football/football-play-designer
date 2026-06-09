import { useState } from 'react'
import { isCategoryNameTaken } from '../../utils/categoryUtils'
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog'
import '../ConfirmDialog/ConfirmDialog.css'
import './ManageCategoriesDialog.css'

type ManageCategoriesDialogProps = {
  open: boolean
  customCategories: string[]
  deleting?: boolean
  onAddCustomCategory: (name: string) => boolean
  onDeleteCategory: (category: string) => void
  onClose: () => void
}

export function ManageCategoriesDialog({
  open,
  customCategories,
  deleting = false,
  onAddCustomCategory,
  onDeleteCategory,
  onClose,
}: ManageCategoriesDialogProps) {
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addError, setAddError] = useState('')

  if (!open) return null

  function handleClose() {
    if (deleting) return
    setCategoryToDelete(null)
    setNewCategoryName('')
    setAddError('')
    onClose()
  }

  function handleAddCategory() {
    const trimmed = newCategoryName.trim()
    if (!trimmed) {
      setAddError('Enter a category name.')
      return
    }

    if (isCategoryNameTaken(trimmed, customCategories)) {
      setAddError('That category already exists.')
      return
    }

    const added = onAddCustomCategory(trimmed)
    if (!added) {
      setAddError('Could not add category.')
      return
    }

    setNewCategoryName('')
    setAddError('')
  }

  return (
    <>
      <div
        className="confirm-dialog-overlay"
        role="presentation"
        onClick={(event) => {
          if (!deleting && event.target === event.currentTarget) {
            handleClose()
          }
        }}
      >
        <div
          className="confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-categories-title"
        >
          <p id="manage-categories-title" className="confirm-dialog-message">
            Manage custom categories. Default categories cannot be deleted.
          </p>

          {customCategories.length === 0 ? (
            <p className="manage-categories-empty">No custom categories yet.</p>
          ) : (
            <ul className="manage-categories-list">
              {customCategories.map((category) => (
                <li key={category} className="manage-categories-item">
                  <span className="manage-categories-name">{category}</span>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setCategoryToDelete(category)}
                    disabled={deleting}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="manage-categories-add">
            <input
              type="text"
              className="input-field"
              value={newCategoryName}
              onChange={(event) => {
                setNewCategoryName(event.target.value)
                setAddError('')
              }}
              placeholder="New custom category..."
              disabled={deleting}
            />
            <button
              type="button"
              className="btn"
              onClick={handleAddCategory}
              disabled={deleting}
            >
              Add
            </button>
          </div>

          {addError && <p className="manage-categories-error">{addError}</p>}

          <div className="confirm-dialog-actions">
            <button type="button" className="btn" onClick={handleClose} disabled={deleting}>
              Close
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={categoryToDelete !== null}
        message="Delete this category? It will be removed from all plays."
        variant="delete"
        confirmLabel="Delete Category"
        onConfirm={() => {
          if (categoryToDelete) {
            onDeleteCategory(categoryToDelete)
            setCategoryToDelete(null)
          }
        }}
        onCancel={() => {
          if (!deleting) {
            setCategoryToDelete(null)
          }
        }}
      />
    </>
  )
}
