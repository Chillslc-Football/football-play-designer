import { useState } from 'react'
import { getConversationTitle } from '../../constants/teamChatConstants'
import type {
  DirectMessageThreadWithUnread,
  TeamMessageThreadWithUnread,
} from '../../types/teamMessage'
import { TeamChatListItem } from './TeamChatListItem'
import { TeamChatNewMessagePicker } from './TeamChatNewMessagePicker'
import './TeamChatList.css'
import './TeamChatNewMessagePicker.css'

type TeamChatListProps = {
  teamId: string
  channels: TeamMessageThreadWithUnread[]
  directMessages: DirectMessageThreadWithUnread[]
  activeThreadId: string | null
  showSectionTitle: boolean
  showChevrons: boolean
  onSelectThread: (threadId: string) => void
  onStartDirectMessage: (targetUserId: string) => void
}

export function TeamChatList({
  teamId,
  channels,
  directMessages,
  activeThreadId,
  showSectionTitle,
  showChevrons,
  onSelectThread,
  onStartDirectMessage,
}: TeamChatListProps) {
  const [showNewMessagePicker, setShowNewMessagePicker] = useState(false)

  function handleSelectMember(member: { user_id: string }) {
    setShowNewMessagePicker(false)
    onStartDirectMessage(member.user_id)
  }

  return (
    <aside className="team-chat-list" aria-label="Chats">
      {showSectionTitle && <h2 className="team-chat-list-heading">Chats</h2>}

      <section className="team-chat-list-section" aria-label="Channels">
        <div className="team-chat-list-section-heading-row">
          <h3 className="team-chat-list-section-heading">Channels</h3>
        </div>
        <nav className="team-chat-list-section-nav">
          {channels.map((channel) => (
            <TeamChatListItem
              key={channel.id}
              title={getConversationTitle(channel)}
              isActive={activeThreadId === channel.id}
              showChevron={showChevrons}
              unreadCount={channel.unread_count}
              onSelect={() => onSelectThread(channel.id)}
            />
          ))}
        </nav>
      </section>

      <section className="team-chat-list-section" aria-label="Direct messages">
        <div className="team-chat-list-section-heading-row">
          <h3 className="team-chat-list-section-heading">Direct Messages</h3>
          <button
            type="button"
            className="btn team-chat-list-new-message-btn"
            onClick={() => setShowNewMessagePicker((current) => !current)}
          >
            New message
          </button>
        </div>

        {showNewMessagePicker && (
          <div className="team-chat-list-section-nav">
            <TeamChatNewMessagePicker
              teamId={teamId}
              onSelectMember={handleSelectMember}
              onClose={() => setShowNewMessagePicker(false)}
            />
          </div>
        )}

        <nav className="team-chat-list-section-nav">
          {directMessages.length === 0 ? (
            <p className="team-chat-list-empty">No direct messages yet.</p>
          ) : (
            directMessages.map((thread) => (
              <TeamChatListItem
                key={thread.id}
                title={getConversationTitle(thread)}
                isActive={activeThreadId === thread.id}
                showChevron={showChevrons}
                unreadCount={thread.unread_count}
                onSelect={() => onSelectThread(thread.id)}
              />
            ))
          )}
        </nav>
      </section>
    </aside>
  )
}
