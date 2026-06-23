import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppShell } from '../../context/AppShellContext'
import { useAuth } from '../../hooks/useAuth'
import { useTeam } from '../../hooks/useTeam'
import * as teamMessageRepository from '../../repositories/teamMessageRepository'
import {
  createEmptyTeamMessageDraft,
  type TeamMessage,
  type TeamMessageDraft,
  type TeamMessageThread,
} from '../../types/teamMessage'
import { formatTeamUpdateTimestamp } from '../../utils/teamUpdateUtils'
import './TeamChatPanel.css'

type TeamChatPanelProps = {
  chatTitle: string
  teamName: string
  showBackButton: boolean
  onBack?: () => void
}

function isDraftValid(draft: TeamMessageDraft): boolean {
  return draft.body.trim().length > 0
}

export function TeamChatPanel({
  chatTitle,
  teamName,
  showBackButton,
  onBack,
}: TeamChatPanelProps) {
  const { user } = useAuth()
  const shell = useAppShell()
  const refreshMessageUnreadCount = shell?.refreshMessageUnreadCount
  const { activeTeamId } = useTeam()

  const [thread, setThread] = useState<TeamMessageThread | null>(null)
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [draft, setDraft] = useState<TeamMessageDraft>(createEmptyTeamMessageDraft())
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const lastMarkedReadMessageIdRef = useRef<string | null>(null)

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
    lastMarkedReadMessageIdRef.current = null

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

  const markMessagesReadThroughLatest = useCallback(async () => {
    if (!thread || messages.length === 0) return

    const latestMessage = messages[messages.length - 1]
    if (lastMarkedReadMessageIdRef.current === latestMessage.id) {
      return
    }

    lastMarkedReadMessageIdRef.current = latestMessage.id

    try {
      await teamMessageRepository.markThreadRead(thread.id, latestMessage.id)
      await refreshMessageUnreadCount?.()
    } catch (markReadError) {
      lastMarkedReadMessageIdRef.current = null
      console.error('Failed to mark messages as read:', markReadError)
    }
  }, [thread, messages, refreshMessageUnreadCount])

  useEffect(() => {
    if (loading || !thread || messages.length === 0) return
    void markMessagesReadThroughLatest()
  }, [loading, thread, messages, markMessagesReadThroughLatest])

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
    return message.sender_display_name ?? 'Team member'
  }

  return (
    <section className="team-chat-panel" aria-label={`${chatTitle} chat`}>
      <header className="team-chat-panel-header">
        {showBackButton && (
          <button
            type="button"
            className="btn team-chat-panel-back"
            onClick={onBack}
            aria-label="Back to chat list"
          >
            ← Back
          </button>
        )}
        <div className="team-chat-panel-header-main">
          <h2 className="team-chat-panel-title">{chatTitle}</h2>
          <p className="team-chat-panel-subtitle">{teamName}</p>
        </div>
      </header>

      {error && <p className="team-chat-panel-error app-shell-page-error">{error}</p>}

      {loading ? (
        <p className="team-chat-panel-loading app-shell-page-loading">Loading messages…</p>
      ) : (
        <div className="team-chat-panel-body">
          <div className="team-messaging-panel app-shell-card">
            <div className="team-messaging-messages" aria-live="polite">
              {messages.length === 0 ? (
                <p className="team-chat-panel-empty app-shell-page-empty">
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
                      <div className="team-messaging-message-bubble">
                        <p className="team-messaging-message-meta">
                          {senderLabel(message)} · {formatTeamUpdateTimestamp(message.created_at)}
                        </p>
                        <p className="team-messaging-message-body">{message.body}</p>
                      </div>
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
              <label className="field-label team-messaging-compose-label" htmlFor="team-message-body">
                Message
              </label>
              <div className="team-messaging-compose-row">
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
                <button
                  type="submit"
                  className="btn btn-primary team-messaging-compose-send"
                  disabled={sending || !isDraftValid(draft)}
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
