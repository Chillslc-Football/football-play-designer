import type { Play } from '../../types/play'
import type { PlayFilterId } from '../../utils/formationUtils'
import './PlayControls.css'

type FilterOption = {
  id: PlayFilterId
  label: string
}

type PlayControlsProps = {
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

/**
 * Play name, formation filter, load dropdown, and delete.
 */
export function PlayControls({
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
      <div className="play-control-group">
        <label htmlFor="play-name" className="play-control-label">
          Play Name
        </label>
        <input
          id="play-name"
          type="text"
          className="play-name-input"
          value={playName}
          onChange={(e) => onPlayNameChange(e.target.value)}
          placeholder="Enter play name..."
        />
      </div>

      <div className="play-control-group">
        <label htmlFor="play-filter" className="play-control-label">
          Play Filter
        </label>
        <select
          id="play-filter"
          className="load-play-select"
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

      <div className="play-control-group">
        <label htmlFor="load-play" className="play-control-label">
          Load Play
        </label>
        <select
          id="load-play"
          className="load-play-select"
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
        className="play-control-btn play-control-btn-delete"
        onClick={onDeletePlay}
        disabled={!canDelete}
      >
        Delete Saved Play
      </button>
    </div>
  )
}
