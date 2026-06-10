import { useState } from 'react'
import type { PlayerLabel } from '../../types/player'
import type { PlayerNotes } from '../../types/playerNotes'
import './PlayerAssignmentPanel.css'

type PlayerAssignmentPanelProps = {
  selectedPlayerId: PlayerLabel | null
  playerNotes: PlayerNotes
  canEdit?: boolean
  onPlayerNotesChange: (playerId: PlayerLabel, notes: string) => void
}

export function PlayerAssignmentPanel({
  selectedPlayerId,
  playerNotes,
  canEdit = true,
  onPlayerNotesChange,
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
          <span className="assignment-panel-badge">{selectedPlayerId}</span>
        )}
        <span className="assignment-panel-chevron" aria-hidden="true">
          {isOpen ? '▾' : '▸'}
        </span>
      </button>

      {isOpen && (
        <div className="assignment-panel-body">
          {!selectedPlayerId ? (
            <p className="assignment-placeholder">
              Click a player on the field to add assignment notes.
            </p>
          ) : (
            <>
              <p className="assignment-player-label">{selectedPlayerId}</p>
              <label htmlFor="player-assignment-notes" className="assignment-field-label">
                Assignment
              </label>
              <textarea
                id="player-assignment-notes"
                className="assignment-textarea"
                value={playerNotes[selectedPlayerId]}
                onChange={(e) => onPlayerNotesChange(selectedPlayerId, e.target.value)}
                placeholder={`e.g. "${selectedPlayerId} — route, read, or blocking assignment..."`}
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
