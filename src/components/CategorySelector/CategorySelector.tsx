import { useEffect, useMemo, useRef, useState } from 'react'
import { isDefaultCategory } from '../../utils/categoryUtils'
import './CategorySelector.css'

type CategorySelectorProps = {
  canEdit: boolean
  selectedCategories: string[]
  availableCategories: string[]
  onChange: (categories: string[]) => void
}

export function CategorySelector({
  canEdit,
  selectedCategories,
  availableCategories,
  onChange,
}: CategorySelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const defaultOptions = useMemo(
    () => availableCategories.filter((category) => isDefaultCategory(category)),
    [availableCategories],
  )

  const customOptions = useMemo(
    () => availableCategories.filter((category) => !isDefaultCategory(category)),
    [availableCategories],
  )

  useEffect(() => {
    if (!dropdownOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [dropdownOpen])

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

  return (
    <div className="category-selector" ref={containerRef}>
      <label htmlFor="category-multiselect-trigger" className="field-label sidebar-field-label">
        Play Categories
      </label>

      <div className="category-multiselect">
        <button
          type="button"
          id="category-multiselect-trigger"
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

        {dropdownOpen && (
          <div className="category-multiselect-panel" role="listbox" aria-multiselectable="true">
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
        )}
      </div>

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
