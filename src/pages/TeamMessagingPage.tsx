import { useEffect, useState } from 'react'
import { TeamChatList } from '../components/TeamChatList/TeamChatList'
import { TeamChatPanel } from '../components/TeamChatPanel/TeamChatPanel'
import { APP_DISPLAY_THEME } from '../constants/appDisplayTheme'
import { EVERYONE_CHAT_ID, EVERYONE_CHAT_TITLE } from '../constants/teamChatConstants'
import { PHONE_VIEWPORT_MEDIA } from '../constants/viewportBreakpoints'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useTeam } from '../hooks/useTeam'
import './TeamMessagingPage.css'

type MobileMessagingScreen = 'list' | 'chat'

export function TeamMessagingPage() {
  const { team, activeTeamId } = useTeam()
  const isPhone = useMediaQuery(PHONE_VIEWPORT_MEDIA)
  const [mobileScreen, setMobileScreen] = useState<MobileMessagingScreen>('list')
  const [activeChatId, setActiveChatId] = useState(EVERYONE_CHAT_ID)

  useEffect(() => {
    setMobileScreen('list')
    setActiveChatId(EVERYONE_CHAT_ID)
  }, [activeTeamId])

  const showList = !isPhone || mobileScreen === 'list'
  const showChat = !isPhone || mobileScreen === 'chat'

  function handleSelectChat(chatId: string) {
    setActiveChatId(chatId)
    if (isPhone) {
      setMobileScreen('chat')
    }
  }

  function handleBackToList() {
    setMobileScreen('list')
  }

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

        <div
          className={`team-messaging-shell${isPhone ? ` is-mobile-${mobileScreen}` : ''}`}
        >
          {showList && (
            <TeamChatList
              activeChatId={activeChatId}
              showSectionTitle={!isPhone}
              showChevrons={isPhone}
              onSelectChat={handleSelectChat}
            />
          )}

          {showChat && (
            <TeamChatPanel
              chatTitle={EVERYONE_CHAT_TITLE}
              teamName={team?.name ?? 'Team'}
              showBackButton={isPhone}
              onBack={handleBackToList}
            />
          )}
        </div>
      </div>
    </div>
  )
}
