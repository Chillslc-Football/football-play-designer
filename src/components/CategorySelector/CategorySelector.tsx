import { useEffect, useMemo, useRef, useState } from 'react'
import type { PlayType } from '../../types/playType'
import { isDefaultCategory } from '../../utils/categoryUtils'
import './CategorySelector.css'

type CategorySelectorProps = {
  playType: PlayType
  canEdit: boolean
  selectedCategories: string[]
  availableCategories: string[]
  onChange: (categories: string[]) => void
  displayMode?: 'dropdown' | 'inline'
  triggerId?: string
  hideLabel?: boolean
}

export function CategorySelector({
  playType,
  canEdit,
  selectedCategories,
  availableCategories,
  onChange,
  displayMode = 'dropdown',
  triggerId = 'category-multiselect-trigger',
  hideLabel = false,
}: CategorySelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(displayMode === 'inline')
  const containerRef = useRef<HTMLDivElement>(null)

  const defaultOptions = useMemo(
    () => availableCategories.filter((category) => isDefaultCategory(category, playType)),
    [availableCategories, playType],
  )

  const customOptions = useMemo(
    () => availableCategories.filter((category) => !isDefaultCategory(category, playType)),
    [availableCategories, playType],
  )

  useEffect(() => {
    if (displayMode === 'inline' || !dropdownOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [displayMode, dropdownOpen])

  function toggleCategory(category: string) {
    if (!canEdit) return

    if (selectedCategories.includes(category)) {
      onChange(selectedCategories.filter((entry) => entry !== category))
      return
    }

    onChange([...selectedCategories, category])
  }

  function removeCategory(category: string) {
    if (!canEdit) return
    onChange(selectedCategories.filter((entry) => entry !== category))
  }

  const triggerLabel =
    selectedCategories.length === 0
      ? 'Select categories...'
      : selectedCategories.join(', ')

  const optionsPanel = (
    <div
      className={
        displayMode === 'inline'
          ? 'category-multiselect-panel category-multiselect-panel-inline'
          : 'category-multiselect-panel'
      }
      role="listbox"
      aria-multiselectable="true"
    >
      {defaultOptions.length > 0 && (
        <div className="category-multiselect-group">
          <span className="category-multiselect-group-label">Default Categories</span>
          {defaultOptions.map((category) => (
            <label key={category} className="category-multiselect-option">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category)}
                onChange={() => toggleCategory(category)}
              />
              <span>{category}</span>
            </label>
          ))}
        </div>
      )}

      {customOptions.length > 0 && (
        <div className="category-multiselect-group">
          <span className="category-multiselect-group-label">Custom Categories</span>
          {customOptions.map((category) => (
            <label key={category} className="category-multiselect-option">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category)}
                onChange={() => toggleCategory(category)}
              />
              <span>{category}</span>
            </label>
          ))}
        </div>
      )}

      {availableCategories.length === 0 && (
        <p className="category-selector-empty">No categories available yet.</p>
      )}
    </div>
  )

  return (
    <div className="category-selector" ref={containerRef}>
      {!hideLabel && (
        <label htmlFor={triggerId} className="field-label sidebar-field-label">
          Play Categories
        </label>
      )}

      {displayMode === 'inline' ? (
        optionsPanel
      ) : (
        <div className="category-multiselect">
          <button
            type="button"
            id={triggerId}
            className="select-field sidebar-control category-multiselect-trigger"
            onClick={() => canEdit && setDropdownOpen((open) => !open)}
            disabled={!canEdit}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            title={triggerLabel}
          >
            <span
              className={`category-multiselect-trigger-text ${
                selectedCategories.length === 0 ? 'category-multiselect-trigger-placeholder' : ''
              }`}
            >
              {triggerLabel}
            </span>
          </button>

          {dropdownOpen && optionsPanel}
        </div>
      )}

      {selectedCategories.length > 0 && (
        <div className="category-tags" aria-label="Selected categories">
          {selectedCategories.map((category) => (
            <span key={category} className="category-tag">
              {category}
              {canEdit && (
                <button
                  type="button"
                  className="category-tag-remove"
                  onClick={() => removeCategory(category)}
                  aria-label={`Remove ${category}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
