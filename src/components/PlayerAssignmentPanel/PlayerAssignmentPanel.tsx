import { useState } from 'react'
import type { Player, PlayerLabel } from '../../types/player'
import { resolvePlayerDisplayLabel } from '../../types/player'
import type { PlayerNotes } from '../../types/playerNotes'
import './PlayerAssignmentPanel.css'

type PlayerAssignmentPanelProps = {
  selectedPlayerId: PlayerLabel | null
  selectedPlayerLabel: string
  players: Player[]
  onSelectPlayer: (playerId: PlayerLabel) => void
  playerNotes: PlayerNotes
  canEdit?: boolean
  onPlayerNotesChange: (playerId: PlayerLabel, notes: string) => void
  onPlayerLabelChange: (playerId: PlayerLabel, label: string) => void
}

export function PlayerAssignmentPanel({
  selectedPlayerId,
  selectedPlayerLabel,
  players,
  onSelectPlayer,
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
          <label htmlFor="assignment-player-picker" className="assignment-field-label">
            Select player
          </label>
          <select
            id="assignment-player-picker"
            className="select-field assignment-player-picker"
            value={selectedPlayerId ?? ''}
            onChange={(event) => {
              const playerId = event.target.value as PlayerLabel
              if (playerId) onSelectPlayer(playerId)
            }}
            disabled={!canEdit}
            aria-label="Select player on field"
          >
            <option value="">Choose player…</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {resolvePlayerDisplayLabel(player.id, player.label)}
              </option>
            ))}
          </select>

          {!selectedPlayerId ? (
            <p className="assignment-placeholder">
              Choose a player above or click on the field to edit position label and assignment
              notes.
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
