import { FormationSelector } from '../FormationSelector/FormationSelector'
import { PlayControls } from '../PlayControls/PlayControls'
import { Toolbar } from '../Toolbar/Toolbar'
import { DrawingModeSelector, type DrawingMode } from '../DrawingModeSelector/DrawingModeSelector'
import { CollapsibleSection } from '../CollapsibleSection/CollapsibleSection'
import type { DriveStartYardLine } from '../../types/driveStart'
import type { Play } from '../../types/play'
import type { PlayType } from '../../types/playType'
import type { CustomFormation } from '../../utils/formationStorage'
import type { PlayFilterId } from '../../utils/formationUtils'
import './PlaySetupPanel.css'

type FilterOption = {
  id: PlayFilterId
  label: string
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
  playFilterId: PlayFilterId
  filterOptions: FilterOption[]
  onPlayFilterChange: (filterId: PlayFilterId) => void
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
  playFilterId,
  filterOptions,
  onPlayFilterChange,
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
        <CollapsibleSection step="1" title="Formation" defaultOpen>
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
        </CollapsibleSection>

        <CollapsibleSection step="2" title="Plays" defaultOpen>
          <PlayControls
            canEdit={canEdit}
            playName={playName}
            onPlayNameChange={onPlayNameChange}
            playFilterId={playFilterId}
            filterOptions={filterOptions}
            onPlayFilterChange={onPlayFilterChange}
            filteredPlays={filteredPlays}
            selectedLoadId={selectedLoadId}
            onLoadPlay={onLoadPlay}
            onDeletePlay={onDeletePlay}
          />
        </CollapsibleSection>

        <CollapsibleSection step="3" title="Drawing Tools" defaultOpen>
          <DrawingModeSelector
            mode={drawingMode}
            playType={playType}
            canEdit={canEdit}
            onChange={onDrawingModeChange}
          />
        </CollapsibleSection>

        <CollapsibleSection step="4" title="Actions" defaultOpen>
          <Toolbar
            canEdit={canEdit}
            onNewPlay={onNewPlay}
            onSaveChanges={onSaveChanges}
            onSaveAsNew={onSaveAsNew}
            onMirrorPlay={onMirrorPlay}
            isMirrored={isMirrored}
          />
        </CollapsibleSection>
      </div>
    </aside>
  )
}
