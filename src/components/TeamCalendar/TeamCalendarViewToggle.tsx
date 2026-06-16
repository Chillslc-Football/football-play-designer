import type { TeamCalendarDisplayView } from '../../pages/teamCalendarTypes'
import './TeamCalendarViewToggle.css'

type TeamCalendarViewToggleProps = {
  displayView: TeamCalendarDisplayView
  onChange: (view: TeamCalendarDisplayView) => void
}

export function TeamCalendarViewToggle({ displayView, onChange }: TeamCalendarViewToggleProps) {
  return (
    <div
      className="team-calendar-view-toggle play-type-selector"
      role="group"
      aria-label="Calendar view"
    >
      <button
        type="button"
        className={`btn ${displayView === 'list' ? 'btn-toggle-active' : ''}`}
        onClick={() => onChange('list')}
      >
        List
      </button>
      <button
        type="button"
        className={`btn team-calendar-view-toggle-month ${displayView === 'month' ? 'btn-toggle-active' : ''}`}
        onClick={() => onChange('month')}
      >
        Month
      </button>
    </div>
  )
}
