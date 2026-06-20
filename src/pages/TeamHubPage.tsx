import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import {
  TeamHubBoltIcon,
  TeamHubCalendarIcon,
  TeamHubMegaphoneIcon,
  TeamHubMessageIcon,
} from '../components/TeamHub/TeamHubIcons'
import { TeamHubCard } from '../components/TeamHub/TeamHubCard'
import { APP_DISPLAY_THEME } from '../constants/appDisplayTheme'
import { useAppShell } from '../context/AppShellContext'
import { useAuth } from '../hooks/useAuth'
import { useCanEdit } from '../hooks/useCanEdit'
import { useTeam } from '../hooks/useTeam'
import * as teamEventRepository from '../repositories/teamEventRepository'
import * as teamMessageRepository from '../repositories/teamMessageRepository'
import * as teamUpdateRepository from '../repositories/teamUpdateRepository'
import type { TeamEvent } from '../types/teamEvent'
import type { TeamMessage } from '../types/teamMessage'
import type { TeamUpdate } from '../types/teamUpdate'
import { formatTeamEventDateTimeRange } from '../utils/teamEventUtils'
import { formatTeamUpdateTimestamp, teamUpdateBodyMatchesTitle } from '../utils/teamUpdateUtils'
import './TeamHubPage.css'

function truncatePreview(text: string, maxLength = 140): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxLength) {
    return trimmed
  }
  return `${trimmed.slice(0, maxLength).trimEnd()}…`
}

function descriptionPreview(description: string | null): string | null {
  if (!description) return null
  const trimmed = description.trim()
  return trimmed.length > 0 ? truncatePreview(trimmed) : null
}

export function TeamHubPage() {
  const { user } = useAuth()
  const shell = useAppShell()
  const setPageToolbar = shell?.setPageToolbar
  const navigateTo = shell?.navigateTo
  const { activeTeamId } = useTeam()
  const canEdit = useCanEdit()

  const [nextEvent, setNextEvent] = useState<TeamEvent | null>(null)
  const [recentUpdates, setRecentUpdates] = useState<TeamUpdate[]>([])
  const [recentMessages, setRecentMessages] = useState<TeamMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHubData = useCallback(async () => {
    if (!activeTeamId) return

    setLoading(true)
    setError(null)

    try {
      const [event, updates, messages] = await Promise.all([
        teamEventRepository.getNextUpcomingTeamEvent(activeTeamId),
        teamUpdateRepository.getRecentTeamUpdatesByTeam(activeTeamId, 3),
        teamMessageRepository.getRecentTeamMessagesForTeam(activeTeamId, 5),
      ])

      setNextEvent(event)
      setRecentUpdates(updates)
      setRecentMessages(messages)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load team hub')
    } finally {
      setLoading(false)
    }
  }, [activeTeamId])

  useEffect(() => {
    void loadHubData()
  }, [loadHubData])

  useLayoutEffect(() => {
    if (!setPageToolbar) return

    setPageToolbar(null)

    return () => {
      setPageToolbar(null)
    }
  }, [setPageToolbar])

  function senderLabel(message: TeamMessage): string {
    if (user?.id && message.sender_id === user.id) {
      return 'You'
    }
    return message.sender_display_name ?? 'Team member'
  }

  function goToCalendar() {
    navigateTo?.('calendar')
  }

  function goToUpdates() {
    navigateTo?.('team-updates')
  }

  function goToMessages() {
    navigateTo?.('messages')
  }

  function createEvent() {
    navigateTo?.('calendar', 'create')
  }

  function createUpdate() {
    navigateTo?.('team-updates', 'create')
  }

  function createWristband() {
    navigateTo?.('wristbands', 'create')
  }

  function openPlayDesigner() {
    navigateTo?.('designer')
  }

  const eventDescription = nextEvent ? descriptionPreview(nextEvent.description) : null

  return (
    <div className={`team-hub-page app-shell-page app-theme-${APP_DISPLAY_THEME}`}>
      <div className="team-hub-page-screen app-shell-page-screen">
        <header className="team-hub-page-header app-shell-page-header">
          <div className="team-hub-page-header-main app-shell-page-header-main">
            <h1>Team Hub</h1>
            <p className="team-hub-page-subtitle app-shell-page-subtitle">
              Everything you need to know about your team, all in one place.
            </p>
          </div>
        </header>

        {error && <p className="team-hub-page-error app-shell-page-error">{error}</p>}

        {loading ? (
          <p className="team-hub-page-loading app-shell-page-loading">Loading team hub…</p>
        ) : (
          <div className="team-hub-content app-shell-page-body">
            <div className="team-hub-dashboard">
              <div className="team-hub-row">
                <TeamHubCard
                  id="team-hub-next-event-heading"
                  title="Next Event"
                  icon={<TeamHubCalendarIcon />}
                  onNavigate={goToCalendar}
                  actions={
                    <button type="button" className="btn" onClick={goToCalendar}>
                      View Calendar
                    </button>
                  }
                >
                  {nextEvent ? (
                    <>
                      <h3 className="team-hub-card-title">{nextEvent.title}</h3>
                      <p className="team-hub-card-meta">
                        {formatTeamEventDateTimeRange(nextEvent.starts_at, nextEvent.ends_at)}
                      </p>
                      {nextEvent.location?.trim() && (
                        <p className="team-hub-card-detail">{nextEvent.location.trim()}</p>
                      )}
                      {eventDescription && (
                        <p className="team-hub-card-preview">{eventDescription}</p>
                      )}
                    </>
                  ) : (
                    <p className="team-hub-card-empty">No upcoming events.</p>
                  )}
                </TeamHubCard>

                <TeamHubCard
                  id="team-hub-quick-actions-heading"
                  title="Quick Actions"
                  icon={<TeamHubBoltIcon />}
                >
                  <p className="team-hub-quick-actions-hint">Jump to common tasks for your team.</p>
                  <div className="team-hub-quick-actions-buttons">
                    <button type="button" className="btn" onClick={openPlayDesigner}>
                      Open Play Designer
                    </button>
                    {canEdit && (
                      <>
                        <button type="button" className="btn" onClick={createEvent}>
                          New Event
                        </button>
                        <button type="button" className="btn" onClick={createUpdate}>
                          New Update
                        </button>
                      </>
                    )}
                    <button type="button" className="btn" onClick={goToMessages}>
                      Open Chat
                    </button>
                    {canEdit && (
                      <button type="button" className="btn" onClick={createWristband}>
                        Create Wristband Card
                      </button>
                    )}
                  </div>
                </TeamHubCard>
              </div>

              <div className="team-hub-row">
                <TeamHubCard
                  id="team-hub-updates-heading"
                  title="Recent Updates"
                  icon={<TeamHubMegaphoneIcon />}
                  onNavigate={goToUpdates}
                  actions={
                    <button type="button" className="btn" onClick={goToUpdates}>
                      View All Updates
                    </button>
                  }
                >
                  {recentUpdates.length === 0 ? (
                    <p className="team-hub-card-empty">No updates yet.</p>
                  ) : (
                    <ul className="team-hub-updates-list">
                      {recentUpdates.map((update) => (
                        <li key={update.id} className="team-hub-update-item">
                          <div className="team-hub-update-title-row">
                            <span className="team-hub-update-title">{update.title}</span>
                            {update.show_on_home && (
                              <span className="team-hub-home-badge">Home</span>
                            )}
                          </div>
                          <p className="team-hub-card-meta">
                            {formatTeamUpdateTimestamp(update.created_at)}
                          </p>
                          {!teamUpdateBodyMatchesTitle(update) && (
                            <p className="team-hub-update-preview">
                              {truncatePreview(update.body, 100)}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </TeamHubCard>

                <TeamHubCard
                  id="team-hub-messages-heading"
                  title="Recent Messages"
                  icon={<TeamHubMessageIcon />}
                  onNavigate={goToMessages}
                  actions={
                    <button type="button" className="btn" onClick={goToMessages}>
                      Open Chat
                    </button>
                  }
                >
                  {recentMessages.length === 0 ? (
                    <p className="team-hub-card-empty">No messages yet.</p>
                  ) : (
                    <ul className="team-hub-messages-list">
                      {recentMessages.map((message) => (
                        <li key={message.id} className="team-hub-message-item">
                          <p className="team-hub-message-meta">
                            {senderLabel(message)} · {formatTeamUpdateTimestamp(message.created_at)}
                          </p>
                          <p className="team-hub-message-preview">{truncatePreview(message.body, 100)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </TeamHubCard>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
