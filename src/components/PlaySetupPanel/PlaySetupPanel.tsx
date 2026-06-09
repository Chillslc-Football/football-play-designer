import { FormationSelector } from '../FormationSelector/FormationSelector'
import { PlayControls } from '../PlayControls/PlayControls'
import { Toolbar } from '../Toolbar/Toolbar'
import { DrawingModeSelector, type DrawingMode } from '../DrawingModeSelector/DrawingModeSelector'
import type { DriveStartYardLine } from '../../types/driveStart'
import type { Play } from '../../types/play'
import type { PlayType } from '../../types/playType'
import type { CustomFormation } from '../../utils/formationStorage'
import type { CategoryFilterId } from '../../utils/categoryUtils'
import type { PlayFilterId } from '../../utils/formationUtils'
import './PlaySetupPanel.css'

type FormationFilterOption = {
  id: PlayFilterId
  label: string
}

type CategoryFilterOption = {
  id: CategoryFilterId
  label: string
  group: 'all' | 'default' | 'custom'
}

type PlaySetupPanelProps = {
  canEdit: boolean
  isOpen: boolean
  onToggle: () => void
  formationId: string
  formationName: string
  driveStartYardLine: DriveStartYardLine
  customFormations: CustomFormation[]
  onFormationChange: (formationId: string) => void
  onDriveStartChange: (driveStart: DriveStartYardLine) => void
  onSaveCurrentFormation: () => void
  onDeleteCustomFormation: () => void
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
  selectedLoadId: string
  onLoadPlay: (playId: string) => void
  onDeletePlay: () => void
  playType: PlayType
  drawingMode: DrawingMode
  onDrawingModeChange: (mode: DrawingMode) => void
  onNewPlay: () => void
  onSaveChanges: () => void
  onSaveAsNew: () => void
  onMirrorPlay: () => void
  isMirrored: boolean
}

export function PlaySetupPanel({
  canEdit,
  isOpen,
  onToggle,
  formationId,
  formationName,
  driveStartYardLine,
  customFormations,
  onFormationChange,
  onDriveStartChange,
  onSaveCurrentFormation,
  onDeleteCustomFormation,
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
  selectedLoadId,
  onLoadPlay,
  onDeletePlay,
  playType,
  drawingMode,
  onDrawingModeChange,
  onNewPlay,
  onSaveChanges,
  onSaveAsNew,
  onMirrorPlay,
  isMirrored,
}: PlaySetupPanelProps) {
  if (!isOpen) {
    return (
      <button
        type="button"
        className="play-setup-reopen"
        onClick={onToggle}
        title="Open Play Setup"
      >
        ▶ Play Setup
      </button>
    )
  }

  return (
    <aside className="play-setup-panel">
      <div className="play-setup-header">
        <h2 className="play-setup-title">Play Setup</h2>
        <button
          type="button"
          className="play-setup-collapse btn"
          onClick={onToggle}
          title="Collapse Play Setup"
        >
          ◀
        </button>
      </div>

      <div className="play-setup-sections">
        <section className="sidebar-section">
          <h3 className="sidebar-section-title">Formation</h3>
          <FormationSelector
            canEdit={canEdit}
            value={formationId}
            formationName={formationName}
            driveStartYardLine={driveStartYardLine}
            customFormations={customFormations}
            onChange={onFormationChange}
            onDriveStartChange={onDriveStartChange}
            onSaveCurrentFormation={onSaveCurrentFormation}
            onDeleteCustomFormation={onDeleteCustomFormation}
          />
        </section>

        <section className="sidebar-section">
          <h3 className="sidebar-section-title">Play</h3>
          <PlayControls
            canEdit={canEdit}
            playName={playName}
            onPlayNameChange={onPlayNameChange}
            playCategories={playCategories}
            availableCategories={availableCategories}
            customCategories={customCategories}
            onPlayCategoriesChange={onPlayCategoriesChange}
            onAddCustomCategory={onAddCustomCategory}
            onDeleteCustomCategory={onDeleteCustomCategory}
            deletingCategory={deletingCategory}
            playFilterId={playFilterId}
            formationFilterOptions={formationFilterOptions}
            onPlayFilterChange={onPlayFilterChange}
            categoryFilterId={categoryFilterId}
            categoryFilterOptions={categoryFilterOptions}
            onCategoryFilterChange={onCategoryFilterChange}
            filteredPlays={filteredPlays}
            selectedLoadId={selectedLoadId}
            onLoadPlay={onLoadPlay}
          />
        </section>

        <section className="sidebar-section">
          <h3 className="sidebar-section-title">Play Actions</h3>
          <Toolbar
            canEdit={canEdit}
            selectedLoadId={selectedLoadId}
            onNewPlay={onNewPlay}
            onSaveChanges={onSaveChanges}
            onSaveAsNew={onSaveAsNew}
            onDeletePlay={onDeletePlay}
            onMirrorPlay={onMirrorPlay}
            isMirrored={isMirrored}
          />
        </section>

        <section className="sidebar-section sidebar-section-last">
          <h3 className="sidebar-section-title">Drawing Mode</h3>
          <DrawingModeSelector
            mode={drawingMode}
            playType={playType}
            canEdit={canEdit}
            onChange={onDrawingModeChange}
          />
        </section>
      </div>
    </aside>
  )
}
