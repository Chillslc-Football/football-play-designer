import type { PlayerLabel } from '../../types/player'
import type { PlayerNotes } from '../../types/playerNotes'
import './PlayerAssignmentPanel.css'

type PlayerAssignmentPanelProps = {
  selectedPlayerId: PlayerLabel | null
  playerNotes: PlayerNotes
  onPlayerNotesChange: (playerId: PlayerLabel, notes: string) => void
}

/**
 * Shows assignment notes for the currently selected player.
 * Click a player on the field to open their notes here.
 */
export function PlayerAssignmentPanel({
  selectedPlayerId,
  playerNotes,
  onPlayerNotesChange,
}: PlayerAssignmentPanelProps) {
  if (!selectedPlayerId) {
    return (
      <aside className="assignment-panel assignment-panel-empty">
        <h2 className="assignment-title">Player Assignment</h2>
        <p className="assignment-placeholder">Click a player on the field to add assignment notes.</p>
      </aside>
    )
  }

  const notes = playerNotes[selectedPlayerId]

  return (
    <aside className="assignment-panel">
      <h2 className="assignment-title">Player Assignment</h2>
      <p className="assignment-player-label">{selectedPlayerId}</p>
      <label htmlFor="player-assignment-notes" className="assignment-field-label">
        Assignment
      </label>
      <textarea
        id="player-assignment-notes"
        className="assignment-textarea"
        value={notes}
        onChange={(e) => onPlayerNotesChange(selectedPlayerId, e.target.value)}
        placeholder={`e.g. "${selectedPlayerId} — route, read, or blocking assignment..."`}
        rows={5}
      />
    </aside>
  )
}
