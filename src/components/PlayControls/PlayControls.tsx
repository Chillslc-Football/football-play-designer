import { useState } from 'react'
import { CategorySelector } from '../CategorySelector/CategorySelector'
import { ManageCategoriesDialog } from '../ManageCategoriesDialog/ManageCategoriesDialog'
import { PlayLibraryModal } from '../PlayLibraryModal/PlayLibraryModal'
import type { Play } from '../../types/play'
import type { PlayType } from '../../types/playType'
import type { CategoryFilterId } from '../../utils/categoryUtils'
import type { PlayFilterId } from '../../utils/formationUtils'
import './PlayControls.css'

type FormationFilterOption = {
  id: PlayFilterId
  label: string
}

type CategoryFilterOption = {
  id: CategoryFilterId
  label: string
  group: 'all' | 'default' | 'custom'
}

type PlayControlsProps = {
  playType: PlayType
  canEdit: boolean
  playName: string
  onPlayNameChange: (name: string) => void
  playCategories: string[]
  availableCategories: string[]
  customCategories: string[]
  onPlayCategoriesChange: (categories: string[]) => void
  onAddCustomCategory: (name: string) => boolean
  onDeleteCustomCategory: (category: string) => void
  deletingCategory?: boolean
  playFilterId: PlayFilterId
  formationFilterOptions: FormationFilterOption[]
  onPlayFilterChange: (filterId: PlayFilterId) => void
  categoryFilterId: CategoryFilterId
  categoryFilterOptions: CategoryFilterOption[]
  onCategoryFilterChange: (filterId: CategoryFilterId) => void
  filteredPlays: Play[]
  libraryPlays: Play[]
  selectedLoadId: string
  onLoadPlay: (playId: string) => void
}

export function PlayControls({
  playType,
  canEdit,
  playName,
  onPlayNameChange,
  playCategories,
  availableCategories,
  customCategories,
  onPlayCategoriesChange,
  onAddCustomCategory,
  onDeleteCustomCategory,
  deletingCategory = false,
  playFilterId,
  formationFilterOptions,
  onPlayFilterChange,
  categoryFilterId,
  categoryFilterOptions,
  onCategoryFilterChange,
  filteredPlays,
  libraryPlays,
  selectedLoadId,
  onLoadPlay,
}: PlayControlsProps) {
  const [manageOpen, setManageOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const sortedPlays = [...filteredPlays].sort((a, b) => a.name.localeCompare(b.name))

  const defaultCategoryOptions = categoryFilterOptions.filter(
    (option) => option.group === 'default',
  )
  const customCategoryOptions = categoryFilterOptions.filter(
    (option) => option.group === 'custom',
  )

  return (
    <div className="play-controls">
      <div className="form-group">
        <label htmlFor="play-name" className="field-label sidebar-field-label">
          Play Name
        </label>
        <input
          id="play-name"
          type="text"
          className="input-field sidebar-control"
          value={playName}
          onChange={(e) => onPlayNameChange(e.target.value)}
          placeholder="Enter play name..."
          disabled={!canEdit}
        />
      </div>

      <div className="form-group">
        <label htmlFor="load-play" className="field-label sidebar-field-label">
          Load Play
        </label>
        <select
          id="load-play"
          className="select-field sidebar-control"
          value={selectedLoadId}
          onChange={(e) => onLoadPlay(e.target.value)}
        >
          <option value="">Select a saved play...</option>
          {sortedPlays.map((saved) => (
            <option key={saved.id} value={saved.id}>
              {saved.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="btn sidebar-btn play-controls-library-btn"
        onClick={() => setLibraryOpen(true)}
      >
        Play Library
      </button>

      <CategorySelector
        playType={playType}
        canEdit={canEdit}
        selectedCategories={playCategories}
        availableCategories={availableCategories}
        onChange={onPlayCategoriesChange}
      />

      <button
        type="button"
        className="btn sidebar-btn play-controls-manage-btn"
        onClick={() => setManageOpen(true)}
        disabled={!canEdit}
      >
        Manage Categories
      </button>

      <ManageCategoriesDialog
        playType={playType}
        open={manageOpen}
        customCategories={customCategories}
        deleting={deletingCategory}
        onAddCustomCategory={onAddCustomCategory}
        onDeleteCategory={onDeleteCustomCategory}
        onClose={() => setManageOpen(false)}
      />

      <PlayLibraryModal
        open={libraryOpen}
        plays={libraryPlays}
        canSharePdf={canEdit}
        onLoadPlay={onLoadPlay}
        onClose={() => setLibraryOpen(false)}
      />

      <div className="play-controls-filters">
        <p className="play-controls-filters-label">Filters</p>
        <div className="play-controls-filters-row">
          <div className="form-group">
            <label htmlFor="formation-filter" className="field-label sidebar-field-label">
              {playType === 'defensive' ? 'Front Filter' : 'Formation Filter'}
            </label>
            <select
              id="formation-filter"
              className="select-field sidebar-control"
              value={playFilterId}
              onChange={(e) => onPlayFilterChange(e.target.value)}
            >
              {formationFilterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="category-filter" className="field-label sidebar-field-label">
              Category Filter
            </label>
            <select
              id="category-filter"
              className="select-field sidebar-control"
              value={categoryFilterId}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
            >
              <option value="all">All Categories</option>
              {defaultCategoryOptions.length > 0 && (
                <optgroup label="Default Categories">
                  {defaultCategoryOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              )}
              {customCategoryOptions.length > 0 && (
                <optgroup label="Custom Categories">
                  {customCategoryOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
