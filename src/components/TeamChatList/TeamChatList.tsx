import { getThreadKindLabel } from '../../constants/teamChatConstants'
import type { TeamMessageThreadKind, TeamMessageThreadWithUnread } from '../../types/teamMessage'
import { TeamChatListItem } from './TeamChatListItem'
import './TeamChatList.css'

type TeamChatListProps = {
  channels: TeamMessageThreadWithUnread[]
  activeThreadKind: TeamMessageThreadKind
  showSectionTitle: boolean
  showChevrons: boolean
  onSelectChannel: (threadKind: TeamMessageThreadKind) => void
}

export function TeamChatList({
  channels,
  activeThreadKind,
  showSectionTitle,
  showChevrons,
  onSelectChannel,
}: TeamChatListProps) {
  return (
    <aside className="team-chat-list" aria-label="Chats">
      {showSectionTitle && <h2 className="team-chat-list-heading">Chats</h2>}
      <nav className="team-chat-list-nav">
        {channels.map((channel) => (
          <TeamChatListItem
            key={channel.id}
            title={getThreadKindLabel(channel.thread_kind)}
            isActive={activeThreadKind === channel.thread_kind}
            showChevron={showChevrons}
            unreadCount={channel.unread_count}
            onSelect={() => onSelectChannel(channel.thread_kind)}
          />
        ))}
      </nav>
    </aside>
  )
}
