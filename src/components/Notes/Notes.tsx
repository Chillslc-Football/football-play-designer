import './Notes.css'

type NotesProps = {
  value: string
  onChange: (notes: string) => void
}

/**
 * A text area where coaches can write play notes
 * (e.g. "QB reads Mike linebacker", "Hot route on blitz").
 */
export function Notes({ value, onChange }: NotesProps) {
  return (
    <section className="notes-section">
      <label htmlFor="play-notes" className="notes-label">
        Play Notes
      </label>
      <textarea
        id="play-notes"
        className="notes-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write your play notes here — formations, reads, assignments..."
        rows={4}
      />
    </section>
  )
}
