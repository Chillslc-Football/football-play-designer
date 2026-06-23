import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TeamChatList } from '../components/TeamChatList/TeamChatList'
import { TeamChatPanel } from '../components/TeamChatPanel/TeamChatPanel'
import { APP_DISPLAY_THEME } from '../constants/appDisplayTheme'
import {
  DEFAULT_THREAD_KIND,
  getThreadKindLabel,
} from '../constants/teamChatConstants'
import { PHONE_VIEWPORT_MEDIA } from '../constants/viewportBreakpoints'
import { useAppShell } from '../context/AppShellContext'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useTeam } from '../hooks/useTeam'
import * as teamMessageRepository from '../repositories/teamMessageRepository'
import type { TeamMessageThreadKind, TeamMessageThreadWithUnread } from '../types/teamMessage'
import './TeamMessagingPage.css'

type MobileMessagingScreen = 'list' | 'chat'

function channelListSnapshot(channels: TeamMessageThreadWithUnread[]): string {
  return [...channels]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      (channel) =>
        `${channel.id}:${channel.thread_kind}:${channel.unread_count}:${channel.last_message_at ?? ''}`,
    )
    .join('|')
}

export function TeamMessagingPage() {
  const shell = useAppShell()
  const pendingMessageThreadId = shell?.pendingMessageThreadId
  const clearPendingMessageThreadId = shell?.clearPendingMessageThreadId
  const { team, activeTeamId } = useTeam()
  const isPhone = useMediaQuery(PHONE_VIEWPORT_MEDIA)
  const [mobileScreen, setMobileScreen] = useState<MobileMessagingScreen>('list')
  const [activeThreadKind, setActiveThreadKind] = useState<TeamMessageThreadKind>(DEFAULT_THREAD_KIND)
  const [channels, setChannels] = useState<TeamMessageThreadWithUnread[]>([])
  const [channelsLoading, setChannelsLoading] = useState(true)
  const [channelsError, setChannelsError] = useState<string | null>(null)

  const channelsSnapshotRef = useRef('')
  const channelsLoadedTeamIdRef = useRef<string | null>(null)
  const appliedPendingThreadIdRef = useRef<string | null>(null)
  const refreshInFlightRef = useRef(false)

  const refreshChannels = useCallback(
    async (options?: { showLoading?: boolean }) => {
      if (!activeTeamId) {
        channelsLoadedTeamIdRef.current = null
        channelsSnapshotRef.current = ''
        setChannels([])
        setChannelsLoading(false)
        return
      }

      if (refreshInFlightRef.current) {
        return
      }

      const isInitialLoad = channelsLoadedTeamIdRef.current !== activeTeamId
      const showLoading = options?.showLoading ?? isInitialLoad

      refreshInFlightRef.current = true

      if (showLoading) {
        setChannelsLoading(true)
      }
      setChannelsError(null)

      try {
        const loadedChannels =
          await teamMessageRepository.listAccessibleTeamMessageThreads(activeTeamId)
        const nextSnapshot = channelListSnapshot(loadedChannels)

        if (nextSnapshot !== channelsSnapshotRef.current) {
          channelsSnapshotRef.current = nextSnapshot
          setChannels(loadedChannels)
        }

        setActiveThreadKind((currentKind) => {
          if (loadedChannels.some((channel) => channel.thread_kind === currentKind)) {
            return currentKind
          }

          return loadedChannels[0]?.thread_kind ?? DEFAULT_THREAD_KIND
        })

        channelsLoadedTeamIdRef.current = activeTeamId
      } catch (loadError) {
        channelsSnapshotRef.current = ''
        setChannels([])
        setChannelsError(
          loadError instanceof Error ? loadError.message : 'Failed to load message channels',
        )
      } finally {
        refreshInFlightRef.current = false
        if (showLoading) {
          setChannelsLoading(false)
        }
      }
    },
    [activeTeamId],
  )

  useEffect(() => {
    channelsLoadedTeamIdRef.current = null
    channelsSnapshotRef.current = ''
    appliedPendingThreadIdRef.current = null
    setMobileScreen('list')
    setActiveThreadKind(DEFAULT_THREAD_KIND)
    void refreshChannels({ showLoading: true })
  }, [activeTeamId, refreshChannels])

  useEffect(() => {
    if (channelsLoading || !pendingMessageThreadId) {
      return
    }

    if (appliedPendingThreadIdRef.current === pendingMessageThreadId) {
      return
    }

    appliedPendingThreadIdRef.current = pendingMessageThreadId

    const matchedChannel = channels.find((channel) => channel.id === pendingMessageThreadId)
    if (matchedChannel) {
      setActiveThreadKind((currentKind) =>
        currentKind === matchedChannel.thread_kind ? currentKind : matchedChannel.thread_kind,
      )
      if (isPhone) {
        setMobileScreen('chat')
      }
    }

    clearPendingMessageThreadId?.()
  }, [
    channels,
    channelsLoading,
    pendingMessageThreadId,
    isPhone,
    clearPendingMessageThreadId,
  ])

  useEffect(() => {
    appliedPendingThreadIdRef.current = null
  }, [activeTeamId])

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.thread_kind === activeThreadKind) ?? null,
    [channels, activeThreadKind],
  )

  const activeThreadId = activeChannel?.id ?? null

  const showList = !isPhone || mobileScreen === 'list'
  const showChat = !isPhone || mobileScreen === 'chat'

  const handleSelectChannel = useCallback((threadKind: TeamMessageThreadKind) => {
    setActiveThreadKind((currentKind) => (currentKind === threadKind ? currentKind : threadKind))
    if (isPhone) {
      setMobileScreen('chat')
    }
  }, [isPhone])

  const handleBackToList = useCallback(() => {
    setMobileScreen('list')
  }, [])

  const handleChannelActivity = useCallback(() => {
    void refreshChannels({ showLoading: false })
  }, [refreshChannels])

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

        {channelsError && (
          <p className="team-messaging-page-error app-shell-page-error">{channelsError}</p>
        )}

        {channelsLoading ? (
          <p className="team-messaging-page-loading app-shell-page-loading">Loading channels…</p>
        ) : (
          <div
            className={`team-messaging-shell${isPhone ? ` is-mobile-${mobileScreen}` : ''}`}
          >
            {showList && (
              <TeamChatList
                channels={channels}
                activeThreadKind={activeThreadKind}
                showSectionTitle={!isPhone}
                showChevrons={isPhone}
                onSelectChannel={handleSelectChannel}
              />
            )}

            {showChat && (
              <TeamChatPanel
                threadId={activeThreadId}
                chatTitle={
                  activeChannel
                    ? getThreadKindLabel(activeChannel.thread_kind)
                    : getThreadKindLabel(activeThreadKind)
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
