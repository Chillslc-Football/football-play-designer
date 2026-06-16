import type { TeamEvent } from '../../types/teamEvent'
import {
  buildMonthCalendarGrid,
  formatCalendarEventChipTime,
  getEventsForLocalDay,
  isEventStartOnLocalDay,
  isPastTeamEvent,
} from '../../utils/teamEventUtils'
import './TeamCalendarMonthView.css'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type TeamCalendarMonthViewProps = {
  events: TeamEvent[]
  visibleMonth: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onEventClick: (event: TeamEvent) => void
}

export function TeamCalendarMonthView({
  events,
  visibleMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
  onEventClick,
}: TeamCalendarMonthViewProps) {
  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()
  const cells = buildMonthCalendarGrid(year, month)
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1))

  return (
    <div className="team-calendar-month">
      <div className="team-calendar-month-header">
        <h2 className="team-calendar-month-title">{monthLabel}</h2>
        <div className="team-calendar-month-nav">
          <button type="button" className="btn" onClick={onPrevMonth}>
            Prev Month
          </button>
          <button type="button" className="btn" onClick={onToday}>
            Today
          </button>
          <button type="button" className="btn" onClick={onNextMonth}>
            Next Month
          </button>
        </div>
      </div>

      <div className="team-calendar-month-grid" role="grid" aria-label={`${monthLabel} calendar`}>
        <div className="team-calendar-month-weekdays" role="row">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="team-calendar-month-weekday" role="columnheader">
              {label}
            </div>
          ))}
        </div>

        <div className="team-calendar-month-cells">
          {cells.map((cell) => {
            const dayEvents = getEventsForLocalDay(events, cell.date)

            return (
              <div
                key={cell.dateKey}
                className={`team-calendar-month-cell${cell.isCurrentMonth ? '' : ' is-outside-month'}${cell.isToday ? ' is-today' : ''}`}
                role="gridcell"
                aria-label={cell.date.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              >
                <div className="team-calendar-month-day-number">{cell.date.getDate()}</div>
                <div className="team-calendar-month-events">
                  {dayEvents.map((event) => {
                    const chipTime = formatCalendarEventChipTime(event, cell.date)
                    const isPast = isPastTeamEvent(event)
                    const isContinuation = !isEventStartOnLocalDay(event, cell.date)

                    return (
                      <button
                        key={`${cell.dateKey}-${event.id}`}
                        type="button"
                        className={`team-calendar-month-event-chip${isPast ? ' is-past' : ''}${isContinuation ? ' is-continuation' : ''}`}
                        onClick={() => onEventClick(event)}
                      >
                        {chipTime && (
                          <span className="team-calendar-month-event-time">{chipTime}</span>
                        )}
                        <span className="team-calendar-month-event-title">{event.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
