import { useState, type ReactNode } from 'react'
import { FormationSelector } from '../FormationSelector/FormationSelector'
import { Notes } from '../Notes/Notes'
import {
  PlayControlsInformationSection,
  PlayControlsLibrarySection,
  PlayControlsRoot,
  type PlayControlsProps,
} from '../PlayControls/PlayControls'
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
  hasDefendersOnField: boolean
  hasOffenseOnField: boolean
  onOpponentFrontChange: (frontId: string) => void
  onOpponentFormationChange: (formationId: string) => void
  onLoadDefensiveFront: () => void
  onLoadOffensiveFormation: () => void
  onRemoveDefensiveFront: () => void
  onRemoveOffensiveFormation: () => void
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

function SidebarCollapsibleSection({
  title,
  defaultExpanded = false,
  className = '',
  titleClassName = '',
  children,
  isLast = false,
}: {
  title: string
  defaultExpanded?: boolean
  className?: string
  titleClassName?: string
  children: ReactNode
  isLast?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultExpanded)

  return (
    <section
      className={`sidebar-section sidebar-section-collapsible ${isOpen ? 'is-open' : 'is-collapsed'} ${className} ${isLast ? 'sidebar-section-last' : ''}`}
    >
      <button
        type="button"
        className="sidebar-section-toggle"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <h3 className={`sidebar-section-title sidebar-section-toggle-title ${titleClassName}`}>
          {title}
        </h3>
        <span className="sidebar-section-chevron" aria-hidden="true">
          {isOpen ? '▾' : '▸'}
        </span>
      </button>
      {isOpen && <div className="sidebar-section-body">{children}</div>}
    </section>
  )
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
  hasDefendersOnField,
  hasOffenseOnField,
  onOpponentFrontChange,
  onOpponentFormationChange,
  onLoadDefensiveFront,
  onLoadOffensiveFormation,
  onRemoveDefensiveFront,
  onRemoveOffensiveFormation,
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
  const playControlsProps: PlayControlsProps = {
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
    deletingCategory,
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
  }

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
        <h2 className="play-setup-title">Controls</h2>
        <button
          type="button"
          className="play-setup-collapse btn"
          onClick={onToggle}
          title="Collapse sidebar"
        >
          ◀
        </button>
      </div>

      <div className="play-setup-body">
        <PlayControlsRoot {...playControlsProps}>
          <div className="play-setup-sections">
            <SidebarCollapsibleSection title="Play Library" className="sidebar-section-library">
              <PlayControlsLibrarySection />
            </SidebarCollapsibleSection>

            <SidebarCollapsibleSection title={schemeSectionTitle}>
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
                hasDefendersOnField={hasDefendersOnField}
                hasOffenseOnField={hasOffenseOnField}
                onOpponentFrontChange={onOpponentFrontChange}
                onOpponentFormationChange={onOpponentFormationChange}
                onLoadDefensiveFront={onLoadDefensiveFront}
                onLoadOffensiveFormation={onLoadOffensiveFormation}
                onRemoveDefensiveFront={onRemoveDefensiveFront}
                onRemoveOffensiveFormation={onRemoveOffensiveFormation}
              />
            </SidebarCollapsibleSection>

            <SidebarCollapsibleSection title="Play">
              <PlayControlsInformationSection />
            </SidebarCollapsibleSection>

            <SidebarCollapsibleSection
              title="Drawing Mode"
              defaultExpanded
              className="sidebar-section-drawing-tools"
              titleClassName="sidebar-section-title-prominent"
            >
              <DrawingModeSelector
                mode={drawingMode}
                playType={playType}
                canEdit={canEdit}
                motionType={motionType}
                onMotionTypeChange={onMotionTypeChange}
                onChange={onDrawingModeChange}
              />
            </SidebarCollapsibleSection>

            <SidebarCollapsibleSection title="Play Actions" defaultExpanded>
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
            </SidebarCollapsibleSection>

            <SidebarCollapsibleSection title="Player Assignment" defaultExpanded>
              <PlayerAssignmentPanel
                embedded
                selectedPlayerId={selectedPlayerId}
                selectedPlayerLabel={selectedPlayerLabel}
                players={players}
                onSelectPlayer={onSelectPlayer}
                playerNotes={playerNotes}
                canEdit={canEdit}
                onPlayerNotesChange={onPlayerNotesChange}
                onPlayerLabelChange={onPlayerLabelChange}
              />
            </SidebarCollapsibleSection>

            <SidebarCollapsibleSection title="Play Notes" defaultExpanded isLast>
              <Notes embedded value={playNotes} canEdit={canEdit} onChange={onPlayNotesChange} />
            </SidebarCollapsibleSection>
          </div>
      </PlayControlsRoot>
      </div>
    </aside>
  )
}
