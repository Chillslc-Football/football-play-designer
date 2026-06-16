import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog'
import { PageToolbarLayout } from '../components/PageToolbarLayout/PageToolbarLayout'
import { TeamCalendarMonthView } from '../components/TeamCalendar/TeamCalendarMonthView'
import { TeamCalendarViewToggle } from '../components/TeamCalendar/TeamCalendarViewToggle'
import { APP_DISPLAY_THEME } from '../constants/appDisplayTheme'
import { useAppShell } from '../context/AppShellContext'
import { useAuth } from '../hooks/useAuth'
import { useCanEdit } from '../hooks/useCanEdit'
import { useTeam } from '../hooks/useTeam'
import * as teamEventRepository from '../repositories/teamEventRepository'
import {
  createEmptyTeamEventDraft,
  eventToDraft,
  type TeamEvent,
  type TeamEventDraft,
} from '../types/teamEvent'
import {
  datetimeLocalToIso,
  formatTeamEventDateTimeRange,
  isoToDatetimeLocal,
  partitionTeamEventsByUpcomingPast,
  validateTeamEventDraft,
  wasTeamEventEdited,
} from '../utils/teamEventUtils'
import type { TeamCalendarDisplayView, TeamCalendarPageMode } from './teamCalendarTypes'
import './TeamCalendarPage.css'

function descriptionPreview(description: string | null): string | null {
  if (!description) return null
  const trimmed = description.trim()
  return trimmed.length > 0 ? trimmed : null
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function TeamCalendarPage() {
  const { user } = useAuth()
  const shell = useAppShell()
  const setPageToolbar = shell?.setPageToolbar
  const launchMode = shell?.launchMode
  const clearLaunchMode = shell?.clearLaunchMode
  const { team, activeTeamId } = useTeam()
  const canEdit = useCanEdit()

  const [events, setEvents] = useState<TeamEvent[]>([])
  const [draft, setDraft] = useState<TeamEventDraft>(createEmptyTeamEventDraft())
  const [pageMode, setPageMode] = useState<TeamCalendarPageMode>('browse')
  const [displayView, setDisplayView] = useState<TeamCalendarDisplayView>('list')
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [editingExisting, setEditingExisting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    if (!activeTeamId) return

    setLoading(true)
    setError(null)

    try {
      const loaded = await teamEventRepository.getTeamEventsByTeam(activeTeamId)
      setEvents(loaded)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load team events')
    } finally {
      setLoading(false)
    }
  }, [activeTeamId])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  useEffect(() => {
    if (launchMode !== 'create' || !canEdit || loading || pageMode !== 'browse') return
    openCreate()
    clearLaunchMode?.()
  }, [launchMode, canEdit, loading, pageMode, clearLaunchMode])

  function openCreate() {
    setDraft(createEmptyTeamEventDraft())
    setEditingExisting(false)
    setPageMode('edit')
    setError(null)
  }

  function openEdit(event: TeamEvent) {
    setDraft(eventToDraft(event))
    setEditingExisting(true)
    setPageMode('edit')
    setError(null)
  }

  function backToBrowse() {
    setPageMode('browse')
    setEditingExisting(false)
    setDraft(createEmptyTeamEventDraft())
    setError(null)
  }

  function goToPrevMonth() {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
  }

  function goToNextMonth() {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
  }

  function goToToday() {
    setVisibleMonth(startOfMonth(new Date()))
  }

  async function handleSave() {
    if (!activeTeamId || !canEdit) return

    const validationError = validateTeamEventDraft(draft)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (editingExisting) {
        await teamEventRepository.updateTeamEvent(activeTeamId, draft)
      } else {
        await teamEventRepository.createTeamEvent(activeTeamId, draft)
      }

      await loadEvents()
      backToBrowse()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save team event')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!activeTeamId || !deleteTargetId || !canEdit) return

    try {
      await teamEventRepository.deleteTeamEvent(activeTeamId, deleteTargetId)
      setDeleteTargetId(null)
      await loadEvents()
      if (pageMode === 'edit' && draft.id === deleteTargetId) {
        backToBrowse()
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete team event')
      setDeleteTargetId(null)
    }
  }

  function authorLabel(event: TeamEvent): string | null {
    if (!event.created_by) return null
    if (user?.id && event.created_by === user.id) {
      return 'You'
    }
    return 'Coach'
  }

  function renderEventCard(event: TeamEvent, isPast = false) {
    const author = authorLabel(event)
    const edited = wasTeamEventEdited(event)
    const preview = descriptionPreview(event.description)

    return (
      <article
        key={event.id}
        className={`team-calendar-list-item${isPast ? ' is-past' : ''}`}
      >
        <div className="team-calendar-list-content">
          <div className="team-calendar-list-title-row">
            <h2>{event.title}</h2>
            {isPast && <span className="team-calendar-past-badge">Past</span>}
          </div>
          <p className="team-calendar-list-meta">
            {formatTeamEventDateTimeRange(event.starts_at, event.ends_at)}
            {edited && ' · Edited'}
            {author && ` · ${author}`}
          </p>
          {event.location && (
            <p className="team-calendar-list-location">{event.location}</p>
          )}
          {preview && <p className="team-calendar-list-description">{preview}</p>}
        </div>
        <div className="team-calendar-list-actions">
          <button type="button" className="btn" onClick={() => openEdit(event)}>
            {canEdit ? 'Edit' : 'View'}
          </button>
          {canEdit && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setDeleteTargetId(event.id)}
            >
              Delete
            </button>
          )}
        </div>
      </article>
    )
  }

  const { upcoming, past } = partitionTeamEventsByUpcomingPast(events)
  const draftValidationError = validateTeamEventDraft(draft)
  const canSaveDraft = draftValidationError === null

  useLayoutEffect(() => {
    if (!setPageToolbar) return

    setPageToolbar(
      <PageToolbarLayout
        left={
          pageMode === 'browse' ? (
            <TeamCalendarViewToggle displayView={displayView} onChange={setDisplayView} />
          ) : null
        }
        actions={
          <>
            {pageMode === 'edit' && (
              <button type="button" className="btn" onClick={backToBrowse} disabled={saving}>
                Back
              </button>
            )}
            {canEdit && pageMode === 'browse' && (
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                New Event
              </button>
            )}
          </>
        }
      />,
    )

    return () => {
      setPageToolbar(null)
    }
  }, [setPageToolbar, pageMode, displayView, canEdit, saving])

  return (
    <div className={`team-calendar-page app-shell-page app-theme-${APP_DISPLAY_THEME}`}>
      <ConfirmDialog
        open={deleteTargetId !== null}
        message="Delete this team event? This cannot be undone."
        variant="delete"
        confirmLabel="Delete"
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTargetId(null)}
      />

      <div className="team-calendar-page-screen app-shell-page-screen">
        <header className="team-calendar-page-header app-shell-page-header">
          <div className="team-calendar-page-header-main app-shell-page-header-main">
            <h1>Team Calendar</h1>
            <p className="team-calendar-page-subtitle app-shell-page-subtitle">{team?.name ?? 'Team'}</p>
          </div>
        </header>

        {error && <p className="team-calendar-page-error app-shell-page-error">{error}</p>}
        {!canEdit && !loading && pageMode === 'browse' && (
          <p className="team-calendar-page-readonly app-shell-page-readonly">
            View only — contact your coach to manage calendar events.
          </p>
        )}

        {loading ? (
          <p className="team-calendar-page-loading app-shell-page-loading">Loading team events…</p>
        ) : pageMode === 'browse' && displayView === 'list' ? (
          <div className="team-calendar-list app-shell-page-body">
            {events.length === 0 ? (
              <p className="team-calendar-page-empty app-shell-page-empty">
                {canEdit
                  ? 'No team events yet. Add the first practice, game, or meeting for your team.'
                  : 'No team events have been scheduled yet.'}
              </p>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <section className="team-calendar-list-section">
                    <h2 className="team-calendar-list-section-title">Upcoming</h2>
                    <div className="team-calendar-list-section-items">
                      {upcoming.map((event) => renderEventCard(event))}
                    </div>
                  </section>
                )}
                {past.length > 0 && (
                  <section className="team-calendar-list-section">
                    <h2 className="team-calendar-list-section-title">Past events</h2>
                    <div className="team-calendar-list-section-items">
                      {past.map((event) => renderEventCard(event, true))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        ) : pageMode === 'browse' && displayView === 'month' ? (
          <div className="team-calendar-month-wrap app-shell-page-body">
            <TeamCalendarMonthView
              events={events}
              visibleMonth={visibleMonth}
              onPrevMonth={goToPrevMonth}
              onNextMonth={goToNextMonth}
              onToday={goToToday}
              onEventClick={openEdit}
            />
          </div>
        ) : (
          <div className="team-calendar-editor app-shell-page-body">
            <section className="team-calendar-editor-form">
              <div className="form-group">
                <label className="field-label" htmlFor="team-event-title">
                  Title
                </label>
                <input
                  id="team-event-title"
                  className="input-field"
                  value={draft.title}
                  readOnly={!canEdit}
                  maxLength={200}
                  placeholder="Varsity practice"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label className="field-label" htmlFor="team-event-starts-at">
                  Start date & time
                </label>
                <input
                  id="team-event-starts-at"
                  type="datetime-local"
                  className="input-field"
                  value={isoToDatetimeLocal(draft.starts_at)}
                  readOnly={!canEdit}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      starts_at: datetimeLocalToIso(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <label className="field-label" htmlFor="team-event-ends-at">
                  End date & time
                </label>
                <input
                  id="team-event-ends-at"
                  type="datetime-local"
                  className="input-field"
                  value={isoToDatetimeLocal(draft.ends_at)}
                  readOnly={!canEdit}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      ends_at: datetimeLocalToIso(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <label className="field-label" htmlFor="team-event-location">
                  Location
                </label>
                <input
                  id="team-event-location"
                  className="input-field"
                  value={draft.location ?? ''}
                  readOnly={!canEdit}
                  maxLength={200}
                  placeholder="Home field"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <label className="field-label" htmlFor="team-event-description">
                  Description
                </label>
                <textarea
                  id="team-event-description"
                  className="input-field team-calendar-editor-description"
                  value={draft.description ?? ''}
                  readOnly={!canEdit}
                  rows={6}
                  placeholder="Arrive 15 minutes early. Bring cleats and water."
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>

              {canEdit && (
                <div className="team-calendar-editor-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving || !canSaveDraft}
                    onClick={() => void handleSave()}
                  >
                    {saving ? 'Saving…' : editingExisting ? 'Save Changes' : 'Create Event'}
                  </button>
                  {editingExisting && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={saving}
                      onClick={() => setDeleteTargetId(draft.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
