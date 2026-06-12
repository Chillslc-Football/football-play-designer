import { FormationSelector } from '../FormationSelector/FormationSelector'
import { Notes } from '../Notes/Notes'
import { PlayControls } from '../PlayControls/PlayControls'
import { PlayerAssignmentPanel } from '../PlayerAssignmentPanel/PlayerAssignmentPanel'
import { Toolbar } from '../Toolbar/Toolbar'
import { DrawingModeSelector, type DrawingMode } from '../DrawingModeSelector/DrawingModeSelector'
import type { MotionType } from '../../types/motion'
import type { Player, PlayerLabel } from '../../types/player'
import type { PlayerNotes } from '../../types/playerNotes'
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
  frontId: string
  frontName: string
  driveStartYardLine: DriveStartYardLine
  customFormations: CustomFormation[]
  onFormationChange: (formationId: string) => void
  onFrontChange: (frontId: string) => void
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
  motionType: MotionType
  onMotionTypeChange: (motionType: MotionType) => void
  onDrawingModeChange: (mode: DrawingMode) => void
  onNewPlay: () => void
  onSaveChanges: () => void
  onSaveAsNew: () => void
  onMirrorPlay: () => void
  isMirrored: boolean
  isSaving?: boolean
  selectedPlayerId: PlayerLabel | null
  selectedPlayerLabel: string
  players: Player[]
  onSelectPlayer: (playerId: PlayerLabel) => void
  playerNotes: PlayerNotes
  onPlayerNotesChange: (playerId: PlayerLabel, notes: string) => void
  onPlayerLabelChange: (playerId: PlayerLabel, label: string) => void
  playNotes: string
  onPlayNotesChange: (notes: string) => void
}

export function PlaySetupPanel({
  canEdit,
  isOpen,
  onToggle,
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
  motionType,
  onMotionTypeChange,
  onDrawingModeChange,
  onNewPlay,
  onSaveChanges,
  onSaveAsNew,
  onMirrorPlay,
  isMirrored,
  isSaving = false,
  selectedPlayerId,
  selectedPlayerLabel,
  players,
  onSelectPlayer,
  playerNotes,
  onPlayerNotesChange,
  onPlayerLabelChange,
  playNotes,
  onPlayNotesChange,
}: PlaySetupPanelProps) {
  const schemeSectionTitle = playType === 'defensive' ? 'Front' : 'Formation'

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
          <h3 className="sidebar-section-title">{schemeSectionTitle}</h3>
          <FormationSelector
            playType={playType}
            canEdit={canEdit}
            formationId={formationId}
            formationName={formationName}
            frontId={frontId}
            frontName={frontName}
            driveStartYardLine={driveStartYardLine}
            customFormations={customFormations}
            onFormationChange={onFormationChange}
            onFrontChange={onFrontChange}
            onDriveStartChange={onDriveStartChange}
            onSaveCurrentFormation={onSaveCurrentFormation}
            onDeleteCustomFormation={onDeleteCustomFormation}
          />
        </section>

        <section className="sidebar-section">
          <h3 className="sidebar-section-title">Play</h3>
          <PlayControls
            playType={playType}
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
            isSaving={isSaving}
          />
        </section>

        <section className="sidebar-section">
          <h3 className="sidebar-section-title">Drawing Mode</h3>
          <DrawingModeSelector
            mode={drawingMode}
            playType={playType}
            canEdit={canEdit}
            motionType={motionType}
            onMotionTypeChange={onMotionTypeChange}
            onChange={onDrawingModeChange}
          />
        </section>

        <section className="sidebar-section sidebar-section-accordion">
          <PlayerAssignmentPanel
            selectedPlayerId={selectedPlayerId}
            selectedPlayerLabel={selectedPlayerLabel}
            players={players}
            onSelectPlayer={onSelectPlayer}
            playerNotes={playerNotes}
            canEdit={canEdit}
            onPlayerNotesChange={onPlayerNotesChange}
            onPlayerLabelChange={onPlayerLabelChange}
          />
        </section>

        <section className="sidebar-section sidebar-section-accordion sidebar-section-last">
          <Notes value={playNotes} canEdit={canEdit} onChange={onPlayNotesChange} />
        </section>
      </div>
    </aside>
  )
}
