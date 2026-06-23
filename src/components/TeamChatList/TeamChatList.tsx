import { EVERYONE_CHAT_ID, EVERYONE_CHAT_TITLE } from '../../constants/teamChatConstants'
import { TeamChatListItem } from './TeamChatListItem'
import './TeamChatList.css'

type TeamChatListProps = {
  activeChatId: string
  showSectionTitle: boolean
  showChevrons: boolean
  onSelectChat: (chatId: string) => void
}

export function TeamChatList({
  activeChatId,
  showSectionTitle,
  showChevrons,
  onSelectChat,
}: TeamChatListProps) {
  return (
    <aside className="team-chat-list" aria-label="Chats">
      {showSectionTitle && <h2 className="team-chat-list-heading">Chats</h2>}
      <nav className="team-chat-list-nav">
        <TeamChatListItem
          title={EVERYONE_CHAT_TITLE}
          isActive={activeChatId === EVERYONE_CHAT_ID}
          showChevron={showChevrons}
          onSelect={() => onSelectChat(EVERYONE_CHAT_ID)}
        />
      </nav>
    </aside>
  )
}
