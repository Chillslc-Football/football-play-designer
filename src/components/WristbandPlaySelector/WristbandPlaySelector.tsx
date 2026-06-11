import type { Play } from '../../types/play'
import './WristbandPlaySelector.css'

type WristbandPlaySelectorProps = {
  label: string
  plays: Play[]
  selectedIds: string[]
  canEdit: boolean
  onChange: (ids: string[]) => void
}

export function WristbandPlaySelector({
  label,
  plays,
  selectedIds,
  canEdit,
  onChange,
}: WristbandPlaySelectorProps) {
  const selectedPlays = selectedIds
    .map((id) => plays.find((play) => play.id === id))
    .filter((play): play is Play => Boolean(play))

  const availablePlays = plays.filter((play) => !selectedIds.includes(play.id))

  function addPlay(playId: string) {
    if (!canEdit || !playId) return
    onChange([...selectedIds, playId])
  }

  function removePlay(playId: string) {
    if (!canEdit) return
    onChange(selectedIds.filter((id) => id !== playId))
  }

  function movePlay(playId: string, direction: -1 | 1) {
    if (!canEdit) return
    const index = selectedIds.indexOf(playId)
    if (index < 0) return
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= selectedIds.length) return
    const next = [...selectedIds]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item)
    onChange(next)
  }

  return (
    <div className="wristband-play-selector">
      <div className="wristband-play-selector-header">
        <h3>{label}</h3>
        {canEdit && (
          <select
            className="select-field"
            value=""
            onChange={(event) => {
              addPlay(event.target.value)
              event.target.value = ''
            }}
            aria-label={`Add play to ${label}`}
          >
            <option value="">Add play…</option>
            {availablePlays.map((play) => (
              <option key={play.id} value={play.id}>
                {play.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedPlays.length === 0 ? (
        <p className="wristband-play-selector-empty">No plays selected.</p>
      ) : (
        <ol className="wristband-play-selector-list">
          {selectedPlays.map((play, index) => (
            <li key={play.id} className="wristband-play-selector-item">
              <span>{play.name}</span>
              {canEdit && (
                <div className="wristband-play-selector-actions">
                  <button
                    type="button"
                    className="btn btn-small"
                    disabled={index === 0}
                    onClick={() => movePlay(play.id, -1)}
                    aria-label={`Move ${play.name} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-small"
                    disabled={index === selectedPlays.length - 1}
                    onClick={() => movePlay(play.id, 1)}
                    aria-label={`Move ${play.name} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-danger"
                    onClick={() => removePlay(play.id)}
                    aria-label={`Remove ${play.name}`}
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
