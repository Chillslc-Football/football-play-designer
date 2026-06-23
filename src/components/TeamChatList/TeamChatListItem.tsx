import { type KeyboardEvent } from 'react'

type TeamChatListItemProps = {
  title: string
  isActive: boolean
  showChevron: boolean
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
      <span className="team-chat-list-item-title">{title}</span>
      {showChevron && <span className="team-chat-list-item-chevron" aria-hidden="true">›</span>}
    </button>
  )
}
