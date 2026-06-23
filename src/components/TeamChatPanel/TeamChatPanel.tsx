import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { useAppShell } from '../../context/AppShellContext'
import { useAuth } from '../../hooks/useAuth'
import { useCanEdit } from '../../hooks/useCanEdit'
import { useTeam } from '../../hooks/useTeam'
import * as teamMessageRepository from '../../repositories/teamMessageRepository'
import {
  createEmptyTeamMessageDraft,
  type DirectMessageEligibleMember,
  type MessageReadSummary,
  type TeamMessage,
  type TeamMessageDraft,
} from '../../types/teamMessage'
import {
  formatMessageReadReceipt,
  formatThreadLatestReadReceipt,
} from '../../utils/messageReadReceiptUtils'
import { formatTeamUpdateTimestamp } from '../../utils/teamUpdateUtils'
import {
  filterMentionSuggestions,
  getActiveMentionQuery,
  insertMentionToken,
  buildPickedUserMention,
  type MentionSuggestion,
} from '../../utils/teamMessageMentionAutocomplete'
import { encodeMessageBodyForStorage } from '../../utils/teamMessageMentionUtils'
import { TeamMessageBody } from '../TeamMessageBody/TeamMessageBody'
import { TeamMessageMentionMenu } from './TeamMessageMentionMenu'
import './TeamChatPanel.css'

type TeamChatPanelProps = {
  threadId: string | null
  chatTitle: string
  teamName: string
  showBackButton: boolean
  onBack?: () => void
  onChannelActivity?: () => void
}

function isDraftValid(draft: TeamMessageDraft): boolean {
  return draft.body.trim().length > 0
}

export function TeamChatPanel({
  threadId,
  chatTitle,
  teamName,
  showBackButton,
  onBack,
  onChannelActivity,
}: TeamChatPanelProps) {
  const { user } = useAuth()
  const canViewReadReceipts = useCanEdit()
  const shell = useAppShell()
  const refreshMessageUnreadCount = shell?.refreshMessageUnreadCount
  const { activeTeamId } = useTeam()

  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [draft, setDraft] = useState<TeamMessageDraft>(createEmptyTeamMessageDraft())
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [threadReadSummary, setThreadReadSummary] = useState<MessageReadSummary | null>(null)
  const [ownMessageReadSummary, setOwnMessageReadSummary] = useState<MessageReadSummary | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const composeTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const lastMarkedReadMessageIdRef = useRef<string | null>(null)
  const readSummaryRequestRef = useRef(0)
  const readSummaryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [composeCursorPosition, setComposeCursorPosition] = useState(0)
  const [mentionHighlightIndex, setMentionHighlightIndex] = useState(0)
  const [mentionMenuForceHidden, setMentionMenuForceHidden] = useState(false)
  const [mentionMembers, setMentionMembers] = useState<DirectMessageEligibleMember[]>([])

  const READ_SUMMARY_DEBOUNCE_MS = 1500

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

  const latestOwnMessageId = useMemo(() => {
    if (!user?.id) {
      return null
    }

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].sender_id === user.id) {
        return messages[index].id
      }
    }

    return null
  }, [messages, user?.id])

  const messagesFingerprint = useMemo(() => {
    if (messages.length === 0) {
      return 'empty'
    }

    const latestMessage = messages[messages.length - 1]
    return `${messages.length}:${latestMessage.id}`
  }, [messages])

  const refreshReadSummaries = useCallback(async () => {
    if (!canViewReadReceipts || !threadId) {
      return
    }

    const requestId = ++readSummaryRequestRef.current

    try {
      const [threadSummary, ownSummary] = await Promise.all([
        teamMessageRepository.getThreadLatestReadSummary(threadId),
        latestOwnMessageId
          ? teamMessageRepository.getMessageReadSummary(latestOwnMessageId)
          : Promise.resolve(null),
      ])

      if (requestId !== readSummaryRequestRef.current) {
        return
      }

      setThreadReadSummary(threadSummary)
      setOwnMessageReadSummary(ownSummary)
    } catch (summaryError) {
      if (requestId !== readSummaryRequestRef.current) {
        return
      }

      console.error('Failed to load read summaries:', summaryError)
    }
  }, [canViewReadReceipts, threadId, latestOwnMessageId])

  const scheduleReadSummaryRefresh = useCallback(() => {
    if (readSummaryDebounceRef.current) {
      clearTimeout(readSummaryDebounceRef.current)
    }

    readSummaryDebounceRef.current = setTimeout(() => {
      readSummaryDebounceRef.current = null
      void refreshReadSummaries()
    }, READ_SUMMARY_DEBOUNCE_MS)
  }, [refreshReadSummaries])

  const loadChat = useCallback(async () => {
    if (!activeTeamId || !threadId) return

    if (readSummaryDebounceRef.current) {
      clearTimeout(readSummaryDebounceRef.current)
      readSummaryDebounceRef.current = null
    }

    readSummaryRequestRef.current += 1
    setLoading(true)
    setError(null)
    setMessages([])
    setThreadReadSummary(null)
    setOwnMessageReadSummary(null)
    lastMarkedReadMessageIdRef.current = null

    try {
      const loadedMessages = await teamMessageRepository.getTeamMessagesByThread(
        activeTeamId,
        threadId,
      )

      setMessages(loadedMessages)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [activeTeamId, threadId])

  useEffect(() => {
    void loadChat()
  }, [loadChat])

  useEffect(() => {
    if (!activeTeamId || !threadId) return

    return teamMessageRepository.subscribeToTeamMessages(
      activeTeamId,
      threadId,
      appendMessage,
    )
  }, [activeTeamId, threadId, appendMessage])

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom()
    }
  }, [loading, messages, scrollToBottom])

  useEffect(() => {
    if (!canViewReadReceipts || loading || !threadId || messages.length === 0) {
      return
    }

    void refreshReadSummaries()
  }, [canViewReadReceipts, loading, threadId, messagesFingerprint, refreshReadSummaries])

  useEffect(() => {
    if (!canViewReadReceipts || !activeTeamId || !threadId || loading) {
      return
    }

    return teamMessageRepository.subscribeToTeamMessageReads(
      activeTeamId,
      threadId,
      scheduleReadSummaryRefresh,
    )
  }, [canViewReadReceipts, activeTeamId, threadId, loading, scheduleReadSummaryRefresh])

  useEffect(() => {
    return () => {
      if (readSummaryDebounceRef.current) {
        clearTimeout(readSummaryDebounceRef.current)
        readSummaryDebounceRef.current = null
      }
    }
  }, [])

  const markMessagesReadThroughLatest = useCallback(async () => {
    if (!threadId || messages.length === 0) return

    const latestMessage = messages[messages.length - 1]
    if (lastMarkedReadMessageIdRef.current === latestMessage.id) {
      return
    }

    lastMarkedReadMessageIdRef.current = latestMessage.id

    try {
      await teamMessageRepository.markThreadRead(threadId, latestMessage.id)
      await refreshMessageUnreadCount?.()
      onChannelActivity?.()
    } catch (markReadError) {
      lastMarkedReadMessageIdRef.current = null
      console.error('Failed to mark messages as read:', markReadError)
    }
  }, [threadId, messages, refreshMessageUnreadCount, onChannelActivity])

  useEffect(() => {
    if (loading || !threadId || messages.length === 0) return
    void markMessagesReadThroughLatest()
  }, [loading, threadId, messages, markMessagesReadThroughLatest])

  useEffect(() => {
    if (!activeTeamId) {
      setMentionMembers([])
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const members = await teamMessageRepository.listDmEligibleMembers(activeTeamId)
        if (!cancelled) {
          setMentionMembers(members)
        }
      } catch {
        if (!cancelled) {
          setMentionMembers([])
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeTeamId])

  const activeMentionQuery = useMemo(
    () => getActiveMentionQuery(draft.body, composeCursorPosition),
    [draft.body, composeCursorPosition],
  )

  const mentionSuggestions = useMemo(() => {
    if (!activeMentionQuery || mentionMenuForceHidden) {
      return []
    }

    return filterMentionSuggestions(activeMentionQuery.query, mentionMembers)
  }, [activeMentionQuery, mentionMenuForceHidden, mentionMembers])

  const showMentionMenu = mentionSuggestions.length > 0 && activeMentionQuery !== null

  useEffect(() => {
    setMentionHighlightIndex(0)
  }, [activeMentionQuery?.startIndex, activeMentionQuery?.query, mentionSuggestions.length])

  useEffect(() => {
    setMentionMenuForceHidden(false)
  }, [activeMentionQuery?.startIndex, activeMentionQuery?.query])

  const syncComposeCursor = useCallback((textarea: HTMLTextAreaElement) => {
    setComposeCursorPosition(textarea.selectionStart ?? 0)
  }, [])

  const applyMentionSelection = useCallback(
    (option: MentionSuggestion) => {
      if (!activeMentionQuery) {
        return
      }

      const { nextBody, nextCursor } = insertMentionToken(
        draft.body,
        activeMentionQuery.startIndex,
        activeMentionQuery.endIndex,
        option.token,
      )

      setDraft((current) => ({
        body: nextBody,
        pickedUserMentions:
          option.kind === 'member'
            ? [...current.pickedUserMentions, buildPickedUserMention(option)]
            : current.pickedUserMentions,
      }))
      setComposeCursorPosition(nextCursor)

      requestAnimationFrame(() => {
        const textarea = composeTextareaRef.current
        if (!textarea) {
          return
        }

        textarea.focus()
        textarea.setSelectionRange(nextCursor, nextCursor)
      })
    },
    [activeMentionQuery, draft.body],
  )

  async function handleSend() {
    if (!activeTeamId || !threadId || !user) return

    if (!isDraftValid(draft)) {
      setError('Message cannot be empty.')
      return
    }

    setSending(true)
    setError(null)

    try {
      const bodyForStorage = encodeMessageBodyForStorage(
        draft.body,
        draft.pickedUserMentions,
      )
      const created = await teamMessageRepository.createTeamMessage(
        activeTeamId,
        threadId,
        user.id,
        bodyForStorage,
      )
      appendMessage(created)
      setDraft(createEmptyTeamMessageDraft())
      setComposeCursorPosition(0)
      setMentionMenuForceHidden(false)
      scrollToBottom()
      onChannelActivity?.()
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

  const composeFieldId = threadId ? `team-message-body-${threadId}` : 'team-message-body'
  const mentionMenuId = `${composeFieldId}-mention-menu`
  const threadReadReceiptLabel = formatThreadLatestReadReceipt(threadReadSummary)
  const ownMessageReadReceiptLabel = formatMessageReadReceipt(ownMessageReadSummary)

  function handleComposeKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (showMentionMenu) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setMentionHighlightIndex((current) =>
          Math.min(current + 1, mentionSuggestions.length - 1),
        )
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setMentionHighlightIndex((current) => Math.max(current - 1, 0))
        return
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        const selected = mentionSuggestions[mentionHighlightIndex]
        if (selected) {
          applyMentionSelection(selected)
        }
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        setMentionMenuForceHidden(true)
        return
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
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
          {canViewReadReceipts && threadReadReceiptLabel && (
            <p className="team-chat-panel-read-summary">{threadReadReceiptLabel}</p>
          )}
        </div>
      </header>

      {error && <p className="team-chat-panel-error app-shell-page-error">{error}</p>}

      {!threadId ? (
        <p className="team-chat-panel-loading app-shell-page-loading">Loading channel…</p>
      ) : loading ? (
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
                  const showOwnReadReceipt =
                    canViewReadReceipts &&
                    isOwn &&
                    message.id === latestOwnMessageId &&
                    ownMessageReadReceiptLabel

                  return (
                    <article
                      key={message.id}
                      className={`team-messaging-message${isOwn ? ' is-own' : ''}`}
                    >
                      <div className="team-messaging-message-bubble">
                        <p className="team-messaging-message-meta">
                          {senderLabel(message)} · {formatTeamUpdateTimestamp(message.created_at)}
                        </p>
                        <TeamMessageBody
                          body={message.body}
                          className="team-messaging-message-body"
                        />
                        {showOwnReadReceipt && (
                          <p className="team-messaging-message-read-receipt">
                            {ownMessageReadReceiptLabel}
                          </p>
                        )}
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
              <label className="field-label team-messaging-compose-label" htmlFor={composeFieldId}>
                Message
              </label>
              <div className="team-messaging-compose-row">
                <div className="team-messaging-compose-field">
                  {showMentionMenu && (
                    <TeamMessageMentionMenu
                      options={mentionSuggestions}
                      highlightedIndex={mentionHighlightIndex}
                      listboxId={mentionMenuId}
                      onHighlight={setMentionHighlightIndex}
                      onSelect={applyMentionSelection}
                    />
                  )}
                  <textarea
                    ref={composeTextareaRef}
                    id={composeFieldId}
                    className="input-field team-messaging-compose-body"
                    value={draft.body}
                    rows={3}
                    placeholder="Write a message to your team…"
                    disabled={sending}
                    aria-describedby={`${composeFieldId}-hint`}
                    aria-expanded={showMentionMenu}
                    aria-controls={showMentionMenu ? mentionMenuId : undefined}
                    aria-autocomplete="list"
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, body: event.target.value }))
                      syncComposeCursor(event.target)
                    }}
                    onClick={(event) => syncComposeCursor(event.currentTarget)}
                    onKeyUp={(event) => syncComposeCursor(event.currentTarget)}
                    onSelect={(event) => syncComposeCursor(event.currentTarget)}
                    onKeyDown={handleComposeKeyDown}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary team-messaging-compose-send"
                  disabled={sending || !isDraftValid(draft)}
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
              <p id={`${composeFieldId}-hint`} className="team-messaging-compose-hint">
                Use @everyone, @coaches, @players, @parents, or @ a team member to target
                notifications.
              </p>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
