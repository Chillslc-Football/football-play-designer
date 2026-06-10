import { useState } from 'react'
import './Notes.css'

type NotesProps = {
  value: string
  canEdit?: boolean
  onChange: (notes: string) => void
}

export function Notes({ value, canEdit = true, onChange }: NotesProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <section className={`notes-section ${isOpen ? 'is-open' : 'is-collapsed'}`}>
      <button
        type="button"
        className="notes-toggle"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <span className="notes-toggle-title">Play Notes</span>
        <span className="notes-chevron" aria-hidden="true">
          {isOpen ? '▾' : '▸'}
        </span>
      </button>

      {isOpen && (
        <div className="notes-body">
          <textarea
            id="play-notes"
            className="notes-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your play notes here — reads, assignments, coaching points..."
            rows={3}
            readOnly={!canEdit}
          />
        </div>
      )}
    </section>
  )
}
