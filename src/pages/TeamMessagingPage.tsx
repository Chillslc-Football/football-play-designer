import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TeamChatList } from '../components/TeamChatList/TeamChatList'
import { TeamChatPanel } from '../components/TeamChatPanel/TeamChatPanel'
import { APP_DISPLAY_THEME } from '../constants/appDisplayTheme'
import { DEFAULT_THREAD_KIND, getConversationTitle } from '../constants/teamChatConstants'
import { PHONE_VIEWPORT_MEDIA } from '../constants/viewportBreakpoints'
import { useAppShell } from '../context/AppShellContext'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useTeam } from '../hooks/useTeam'
import * as teamMessageRepository from '../repositories/teamMessageRepository'
import type {
  DirectMessageThreadWithUnread,
  TeamMessageThreadWithUnread,
} from '../types/teamMessage'
import './TeamMessagingPage.css'

type MobileMessagingScreen = 'list' | 'chat'

function conversationListSnapshot(
  channels: TeamMessageThreadWithUnread[],
  directMessages: DirectMessageThreadWithUnread[],
): string {
  const channelPart = [...channels]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      (channel) =>
        `c:${channel.id}:${channel.thread_kind}:${channel.unread_count}:${channel.last_message_at ?? ''}`,
    )
    .join('|')

  const directPart = [...directMessages]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      (thread) =>
        `d:${thread.id}:${thread.other_user_id}:${thread.unread_count}:${thread.last_message_at ?? ''}`,
    )
    .join('|')

  return `${channelPart}||${directPart}`
}

export function TeamMessagingPage() {
  const shell = useAppShell()
  const pendingMessageThreadId = shell?.pendingMessageThreadId
  const clearPendingMessageThreadId = shell?.clearPendingMessageThreadId
  const { team, activeTeamId } = useTeam()
  const isPhone = useMediaQuery(PHONE_VIEWPORT_MEDIA)
  const [mobileScreen, setMobileScreen] = useState<MobileMessagingScreen>('list')
  const [channels, setChannels] = useState<TeamMessageThreadWithUnread[]>([])
  const [directMessages, setDirectMessages] = useState<DirectMessageThreadWithUnread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const listSnapshotRef = useRef('')
  const listLoadedTeamIdRef = useRef<string | null>(null)
  const appliedPendingThreadIdRef = useRef<string | null>(null)
  const refreshInFlightRef = useRef(false)

  const refreshConversationLists = useCallback(
    async (options?: { showLoading?: boolean }) => {
      if (!activeTeamId) {
        listLoadedTeamIdRef.current = null
        listSnapshotRef.current = ''
        setChannels([])
        setDirectMessages([])
        setActiveThreadId(null)
        setListLoading(false)
        return
      }

      if (refreshInFlightRef.current) {
        return
      }

      const isInitialLoad = listLoadedTeamIdRef.current !== activeTeamId
      const showLoading = options?.showLoading ?? isInitialLoad

      refreshInFlightRef.current = true

      if (showLoading) {
        setListLoading(true)
      }
      setListError(null)

      try {
        const [loadedChannels, loadedDirectMessages] = await Promise.all([
          teamMessageRepository.listAccessibleTeamMessageThreads(activeTeamId),
          teamMessageRepository.listDirectMessageThreads(activeTeamId),
        ])
        const nextSnapshot = conversationListSnapshot(loadedChannels, loadedDirectMessages)

        if (nextSnapshot !== listSnapshotRef.current) {
          listSnapshotRef.current = nextSnapshot
          setChannels(loadedChannels)
          setDirectMessages(loadedDirectMessages)
        }

        setActiveThreadId((currentThreadId) => {
          const allThreads = [...loadedChannels, ...loadedDirectMessages]
          if (currentThreadId && allThreads.some((thread) => thread.id === currentThreadId)) {
            return currentThreadId
          }

          const everyoneChannel =
            loadedChannels.find((channel) => channel.thread_kind === DEFAULT_THREAD_KIND) ??
            loadedChannels[0] ??
            null

          return everyoneChannel?.id ?? null
        })

        listLoadedTeamIdRef.current = activeTeamId
      } catch (loadError) {
        listSnapshotRef.current = ''
        setChannels([])
        setDirectMessages([])
        setActiveThreadId(null)
        setListError(loadError instanceof Error ? loadError.message : 'Failed to load messages')
      } finally {
        refreshInFlightRef.current = false
        if (showLoading) {
          setListLoading(false)
        }
      }
    },
    [activeTeamId],
  )

  useEffect(() => {
    listLoadedTeamIdRef.current = null
    listSnapshotRef.current = ''
    appliedPendingThreadIdRef.current = null
    setMobileScreen('list')
    setActiveThreadId(null)
    void refreshConversationLists({ showLoading: true })
  }, [activeTeamId, refreshConversationLists])

  useEffect(() => {
    if (listLoading || !pendingMessageThreadId) {
      return
    }

    if (appliedPendingThreadIdRef.current === pendingMessageThreadId) {
      return
    }

    appliedPendingThreadIdRef.current = pendingMessageThreadId

    const allThreads = [...channels, ...directMessages]
    const matchedThread = allThreads.find((thread) => thread.id === pendingMessageThreadId)
    if (matchedThread) {
      setActiveThreadId(matchedThread.id)
      if (isPhone) {
        setMobileScreen('chat')
      }
    }

    clearPendingMessageThreadId?.()
  }, [
    channels,
    directMessages,
    listLoading,
    pendingMessageThreadId,
    isPhone,
    clearPendingMessageThreadId,
  ])

  useEffect(() => {
    appliedPendingThreadIdRef.current = null
  }, [activeTeamId])

  const activeConversation = useMemo(() => {
    if (!activeThreadId) {
      return null
    }

    return (
      channels.find((channel) => channel.id === activeThreadId) ??
      directMessages.find((thread) => thread.id === activeThreadId) ??
      null
    )
  }, [activeThreadId, channels, directMessages])

  const showList = !isPhone || mobileScreen === 'list'
  const showChat = !isPhone || mobileScreen === 'chat'

  const handleSelectThread = useCallback(
    (threadId: string) => {
      setActiveThreadId(threadId)
      if (isPhone) {
        setMobileScreen('chat')
      }
    },
    [isPhone],
  )

  const handleStartDirectMessage = useCallback(
    async (targetUserId: string) => {
      if (!activeTeamId) {
        return
      }

      try {
        const thread = await teamMessageRepository.getOrCreateDirectMessageThread(
          activeTeamId,
          targetUserId,
        )
        await refreshConversationLists({ showLoading: false })
        setActiveThreadId(thread.id)
        if (isPhone) {
          setMobileScreen('chat')
        }
      } catch (startError) {
        setListError(
          startError instanceof Error ? startError.message : 'Failed to start direct message',
        )
      }
    },
    [activeTeamId, isPhone, refreshConversationLists],
  )

  const handleBackToList = useCallback(() => {
    setMobileScreen('list')
  }, [])

  const handleChannelActivity = useCallback(() => {
    void refreshConversationLists({ showLoading: false })
  }, [refreshConversationLists])

  return (
    <div className={`team-messaging-page app-shell-page app-theme-${APP_DISPLAY_THEME}`}>
      <div className="team-messaging-page-screen app-shell-page-screen">
        {showList && isPhone && (
          <header className="team-messaging-page-header app-shell-page-header">
            <div className="team-messaging-page-header-main app-shell-page-header-main">
              <h1>Messages</h1>
            </div>
          </header>
        )}

        {listError && (
          <p className="team-messaging-page-error app-shell-page-error">{listError}</p>
        )}

        {listLoading ? (
          <p className="team-messaging-page-loading app-shell-page-loading">Loading messages…</p>
        ) : (
          <div
            className={`team-messaging-shell${isPhone ? ` is-mobile-${mobileScreen}` : ''}`}
          >
            {showList && activeTeamId && (
              <TeamChatList
                teamId={activeTeamId}
                channels={channels}
                directMessages={directMessages}
                activeThreadId={activeThreadId}
                showSectionTitle={!isPhone}
                showChevrons={isPhone}
                onSelectThread={handleSelectThread}
                onStartDirectMessage={(targetUserId) => {
                  void handleStartDirectMessage(targetUserId)
                }}
              />
            )}

            {showChat && (
              <TeamChatPanel
                threadId={activeThreadId}
                chatTitle={
                  activeConversation
                    ? getConversationTitle(activeConversation)
                    : 'Messages'
                }
                teamName={team?.name ?? 'Team'}
                showBackButton={isPhone}
                onBack={handleBackToList}
                onChannelActivity={handleChannelActivity}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
