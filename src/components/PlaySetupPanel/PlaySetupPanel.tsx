import { useState, type ReactNode } from 'react'
import { PHONE_VIEWPORT_MEDIA } from '../../constants/viewportBreakpoints'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { FormationSelector } from '../FormationSelector/FormationSelector'
import { Notes } from '../Notes/Notes'
import {
  PlayControlsInformationSection,
  PlayControlsLibrarySection,
  PlayControlsRoot,
  type PlayControlsProps,
} from '../PlayControls/PlayControls'
import { PlayerAssignmentPanel } from '../PlayerAssignmentPanel/PlayerAssignmentPanel'
import { SectionHelpTooltip } from '../SectionHelpTooltip/SectionHelpTooltip'
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
  onOpenLoadPlay: () => void
  onOpenPlayLibrary: () => void
  onEditPlaySetup: () => void
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

const SECTION_HELP = {
  savedPlays:
    'Open saved plays, filter your play list, and print or share playbooks.',
  formation:
    'Choose offensive formations, defensive fronts, and field position setup.',
  play: 'Name the play and assign play categories.',
  drawingMode: 'Choose what you are placing or drawing on the field.',
  playActions: 'Create, save, delete, or mirror the current play.',
  playerAssignment:
    'Select a player and edit their position label or assignment notes.',
  playNotes:
    'Add coaching notes, reads, reminders, or install details for this play.',
} as const

function SidebarCollapsibleSection({
  title,
  helpContent,
  defaultExpanded = false,
  className = '',
  titleClassName = '',
  children,
  isLast = false,
}: {
  title: string
  helpContent?: string
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
      <div className="sidebar-section-toggle">
        <div className="sidebar-section-title-row">
          <button
            type="button"
            className="sidebar-section-toggle-btn"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
          >
            <h3 className={`sidebar-section-title sidebar-section-toggle-title ${titleClassName}`}>
              {title}
            </h3>
          </button>
          {helpContent && <SectionHelpTooltip content={helpContent} />}
        </div>
        <button
          type="button"
          className="sidebar-section-chevron-btn"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
        >
          <span className="sidebar-section-chevron" aria-hidden="true">
            {isOpen ? '▾' : '▸'}
          </span>
        </button>
      </div>
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
  onOpenLoadPlay,
  onOpenPlayLibrary,
  onEditPlaySetup,
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
  const isPhoneViewport = useMediaQuery(PHONE_VIEWPORT_MEDIA)

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
    onOpenPlayLibrary,
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
            <SidebarCollapsibleSection
              title="Saved Plays & Playbooks"
              helpContent={SECTION_HELP.savedPlays}
              className="sidebar-section-library"
              defaultExpanded={isPhoneViewport}
            >
              <PlayControlsLibrarySection />
            </SidebarCollapsibleSection>

            <SidebarCollapsibleSection
              title={schemeSectionTitle}
              helpContent={SECTION_HELP.formation}
            >
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

            <SidebarCollapsibleSection
              title="Play Name & Categories"
              helpContent={SECTION_HELP.play}
            >
              <PlayControlsInformationSection />
            </SidebarCollapsibleSection>

            <SidebarCollapsibleSection
              title="Drawing Mode"
              helpContent={SECTION_HELP.drawingMode}
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

            <SidebarCollapsibleSection
              title="Play Actions"
              helpContent={SECTION_HELP.playActions}
              defaultExpanded
            >
              <Toolbar
                canEdit={canEdit}
                selectedLoadId={selectedLoadId}
                onNewPlay={onNewPlay}
                onOpenLoadPlay={onOpenLoadPlay}
                onEditPlaySetup={onEditPlaySetup}
                onSaveChanges={onSaveChanges}
                onSaveAsNew={onSaveAsNew}
                onDeletePlay={onDeletePlay}
                onMirrorPlay={onMirrorPlay}
                isMirrored={isMirrored}
                isSaving={isSaving}
              />
            </SidebarCollapsibleSection>

            <SidebarCollapsibleSection
              title="Player Assignment"
              helpContent={SECTION_HELP.playerAssignment}
            >
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

            <SidebarCollapsibleSection
              title="Play Notes"
              helpContent={SECTION_HELP.playNotes}
              isLast
            >
              <Notes embedded value={playNotes} canEdit={canEdit} onChange={onPlayNotesChange} />
            </SidebarCollapsibleSection>
          </div>
      </PlayControlsRoot>
      </div>
    </aside>
  )
}
