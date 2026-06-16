import { useCallback, useEffect, useRef, useState } from 'react'
import { AppShellNav } from '../components/AppShellNav/AppShellNav'
import { APP_DISPLAY_THEME } from '../constants/appDisplayTheme'
import { useAuth } from '../hooks/useAuth'
import { useTeam } from '../hooks/useTeam'
import * as teamMessageRepository from '../repositories/teamMessageRepository'
import {
  createEmptyTeamMessageDraft,
  type TeamMessage,
  type TeamMessageDraft,
  type TeamMessageThread,
} from '../types/teamMessage'
import { formatTeamUpdateTimestamp } from '../utils/teamUpdateUtils'
import './TeamMessagingPage.css'

function isDraftValid(draft: TeamMessageDraft): boolean {
  return draft.body.trim().length > 0
}

export function TeamMessagingPage() {
  const { user } = useAuth()
  const { team, activeTeamId } = useTeam()

  const [thread, setThread] = useState<TeamMessageThread | null>(null)
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [draft, setDraft] = useState<TeamMessageDraft>(createEmptyTeamMessageDraft())
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const appendMessage = useCallback((message: TeamMessage) => {
    setMessages((current) => {
      if (current.some((existing) => existing.id === message.id)) {
        return current
      }
      return [...current, message]
    })
  }, [])

  const loadChat = useCallback(async () => {
    if (!activeTeamId) return

    setLoading(true)
    setError(null)
    setThread(null)
    setMessages([])

    try {
      const loadedThread = await teamMessageRepository.getOrCreateTeamChatThread(activeTeamId)
      const loadedMessages = await teamMessageRepository.getTeamMessagesByThread(
        activeTeamId,
        loadedThread.id,
      )

      setThread(loadedThread)
      setMessages(loadedMessages)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [activeTeamId])

  useEffect(() => {
    void loadChat()
  }, [loadChat])

  useEffect(() => {
    if (!activeTeamId || !thread) return

    return teamMessageRepository.subscribeToTeamMessages(
      activeTeamId,
      thread.id,
      appendMessage,
    )
  }, [activeTeamId, thread, appendMessage])

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom()
    }
  }, [loading, messages, scrollToBottom])

  async function handleSend() {
    if (!activeTeamId || !thread || !user) return

    if (!isDraftValid(draft)) {
      setError('Message cannot be empty.')
      return
    }

    setSending(true)
    setError(null)

    try {
      const created = await teamMessageRepository.createTeamMessage(
        activeTeamId,
        thread.id,
        user.id,
        draft.body,
      )
      appendMessage(created)
      setDraft(createEmptyTeamMessageDraft())
      scrollToBottom()
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  function senderLabel(message: TeamMessage): string {
    if (user?.id && message.sender_id === user.id) {
      return 'You'
    }
    return 'Team member'
  }

  return (
    <div className={`team-messaging-page app-theme-${APP_DISPLAY_THEME}`}>
      <div className="team-messaging-page-screen">
        <header className="team-messaging-page-header">
          <div className="team-messaging-page-header-main">
            <AppShellNav />
            <h1>Messages</h1>
            <p className="team-messaging-page-subtitle">
              {thread?.title ?? 'Team Chat'} · {team?.name ?? 'Team'}
            </p>
          </div>
        </header>

        {error && <p className="team-messaging-page-error">{error}</p>}

        {loading ? (
          <p className="team-messaging-page-loading">Loading messages…</p>
        ) : (
          <div className="team-messaging-chat">
            <div className="team-messaging-messages" aria-live="polite">
              {messages.length === 0 ? (
                <p className="team-messaging-page-empty">
                  No messages yet. Send the first message to your team.
                </p>
              ) : (
                messages.map((message) => {
                  const isOwn = user?.id === message.sender_id

                  return (
                    <article
                      key={message.id}
                      className={`team-messaging-message${isOwn ? ' is-own' : ''}`}
                    >
                      <p className="team-messaging-message-meta">
                        {senderLabel(message)} · {formatTeamUpdateTimestamp(message.created_at)}
                      </p>
                      <p className="team-messaging-message-body">{message.body}</p>
                    </article>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              className="team-messaging-compose"
              onSubmit={(event) => {
                event.preventDefault()
                void handleSend()
              }}
            >
              <div className="form-group">
                <label className="field-label" htmlFor="team-message-body">
                  Message
                </label>
                <textarea
                  id="team-message-body"
                  className="input-field team-messaging-compose-body"
                  value={draft.body}
                  rows={3}
                  placeholder="Write a message to your team…"
                  disabled={sending}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, body: event.target.value }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void handleSend()
                    }
                  }}
                />
              </div>
              <div className="team-messaging-compose-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sending || !isDraftValid(draft)}
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
