import { type KeyboardEvent } from 'react'
import { UnreadCountBadge } from '../UnreadCountBadge/UnreadCountBadge'

type TeamChatListItemProps = {
  title: string
  isActive: boolean
  showChevron: boolean
  unreadCount?: number
  onSelect: () => void
}

function handleKeyDown(event: KeyboardEvent, onSelect: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onSelect()
  }
}

export function TeamChatListItem({
  title,
  isActive,
  showChevron,
  unreadCount = 0,
  onSelect,
}: TeamChatListItemProps) {
  return (
    <button
      type="button"
      className={`team-chat-list-item${isActive ? ' is-active' : ''}`}
      aria-current={isActive ? 'true' : undefined}
      onClick={onSelect}
      onKeyDown={(event) => handleKeyDown(event, onSelect)}
    >
      <span className="team-chat-list-item-main">
        <span className="team-chat-list-item-title">{title}</span>
        <UnreadCountBadge count={unreadCount} className="team-chat-list-item-badge" />
      </span>
      {showChevron && <span className="team-chat-list-item-chevron" aria-hidden="true">›</span>}
    </button>
  )
}
