import type { Play } from '../../types/play'
import type { PlayFilterId } from '../../utils/formationUtils'
import './PlayControls.css'

type FilterOption = {
  id: PlayFilterId
  label: string
}

type PlayControlsProps = {
  canEdit: boolean
  playName: string
  onPlayNameChange: (name: string) => void
  playFilterId: PlayFilterId
  filterOptions: FilterOption[]
  onPlayFilterChange: (filterId: PlayFilterId) => void
  filteredPlays: Play[]
  selectedLoadId: string
  onLoadPlay: (playId: string) => void
  onDeletePlay: () => void
}

export function PlayControls({
  canEdit,
  playName,
  onPlayNameChange,
  playFilterId,
  filterOptions,
  onPlayFilterChange,
  filteredPlays,
  selectedLoadId,
  onLoadPlay,
  onDeletePlay,
}: PlayControlsProps) {
  const sortedPlays = [...filteredPlays].sort((a, b) => a.name.localeCompare(b.name))
  const canDelete = selectedLoadId !== ''

  return (
    <div className="play-controls">
      <div className="form-row">
        <div className="form-group form-group-grow">
          <label htmlFor="play-name" className="field-label">
            Play Name
          </label>
          <input
            id="play-name"
            type="text"
            className="input-field"
            value={playName}
            onChange={(e) => onPlayNameChange(e.target.value)}
            placeholder="Enter play name..."
            disabled={!canEdit}
          />
        </div>

        <div className="form-group">
          <label htmlFor="play-filter" className="field-label">
            Play Filter
          </label>
          <select
            id="play-filter"
            className="select-field"
            value={playFilterId}
            onChange={(e) => onPlayFilterChange(e.target.value)}
          >
            {filterOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group form-group-grow">
          <label htmlFor="load-play" className="field-label">
            Load Play
          </label>
          <select
            id="load-play"
            className="select-field"
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
          className="btn btn-danger play-controls-delete"
          onClick={onDeletePlay}
          disabled={!canDelete || !canEdit}
        >
          Delete Saved Play
        </button>
      </div>
    </div>
  )
}
