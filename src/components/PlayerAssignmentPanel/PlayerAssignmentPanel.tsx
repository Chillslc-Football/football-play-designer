import { useState } from 'react'
import type { PlayerLabel } from '../../types/player'
import type { PlayerNotes } from '../../types/playerNotes'
import './PlayerAssignmentPanel.css'

type PlayerAssignmentPanelProps = {
  selectedPlayerId: PlayerLabel | null
  selectedPlayerLabel: string
  playerNotes: PlayerNotes
  canEdit?: boolean
  onPlayerNotesChange: (playerId: PlayerLabel, notes: string) => void
  onPlayerLabelChange: (playerId: PlayerLabel, label: string) => void
}

export function PlayerAssignmentPanel({
  selectedPlayerId,
  selectedPlayerLabel,
  playerNotes,
  canEdit = true,
  onPlayerNotesChange,
  onPlayerLabelChange,
}: PlayerAssignmentPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <aside className={`assignment-panel ${isOpen ? 'is-open' : 'is-collapsed'}`}>
      <button
        type="button"
        className="assignment-panel-toggle"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <span className="assignment-panel-toggle-title">Player Assignment</span>
        {selectedPlayerId && (
          <span className="assignment-panel-badge">
            {selectedPlayerLabel || selectedPlayerId}
          </span>
        )}
        <span className="assignment-panel-chevron" aria-hidden="true">
          {isOpen ? '▾' : '▸'}
        </span>
      </button>

      {isOpen && (
        <div className="assignment-panel-body">
          {!selectedPlayerId ? (
            <p className="assignment-placeholder">
              Click a player on the field to edit position label and assignment notes.
            </p>
          ) : (
            <>
              <p className="assignment-slot-id">Slot: {selectedPlayerId}</p>
              <label htmlFor="player-position-label" className="assignment-field-label">
                Position label
              </label>
              <input
                id="player-position-label"
                className="assignment-label-input"
                type="text"
                maxLength={3}
                value={selectedPlayerLabel}
                onChange={(event) =>
                  onPlayerLabelChange(selectedPlayerId, event.target.value.toUpperCase())
                }
                placeholder={selectedPlayerId}
                readOnly={!canEdit}
                aria-label={`Position label for ${selectedPlayerId}`}
              />
              <label htmlFor="player-assignment-notes" className="assignment-field-label">
                Assignment
              </label>
              <textarea
                id="player-assignment-notes"
                className="assignment-textarea"
                value={playerNotes[selectedPlayerId]}
                onChange={(e) => onPlayerNotesChange(selectedPlayerId, e.target.value)}
                placeholder={`e.g. route, read, or blocking assignment for ${selectedPlayerLabel || selectedPlayerId}...`}
                rows={4}
                readOnly={!canEdit}
              />
            </>
          )}
        </div>
      )}
    </aside>
  )
}
