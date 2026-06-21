import { type KeyboardEvent, type ReactNode } from 'react'
import { UnreadCountBadge } from '../UnreadCountBadge/UnreadCountBadge'

type TeamHubCardProps = {
  id: string
  title: string
  icon: ReactNode
  onNavigate?: () => void
  actions?: ReactNode
  unreadCount?: number
  children: ReactNode
}

function handleCardKeyDown(event: KeyboardEvent, onNavigate: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onNavigate()
  }
}

export function TeamHubCard({
  id,
  title,
  icon,
  onNavigate,
  actions,
  unreadCount = 0,
  children,
}: TeamHubCardProps) {
  const clickable = Boolean(onNavigate)

  return (
    <article
      className={`team-hub-card app-shell-card${clickable ? ' team-hub-card-clickable app-shell-card--interactive' : ''}`}
      aria-labelledby={id}
      {...(clickable
        ? {
            role: 'button',
            tabIndex: 0,
            onClick: onNavigate,
            onKeyDown: (event: KeyboardEvent) => handleCardKeyDown(event, onNavigate!),
          }
        : {})}
    >
      <div className="team-hub-card-heading">
        <span className="team-hub-card-icon">{icon}</span>
        <h2 id={id}>{title}</h2>
        <span className="team-hub-card-status">
          <UnreadCountBadge count={unreadCount} />
        </span>
      </div>
      <div className="team-hub-card-body">{children}</div>
      {actions && (
        <div
          className="team-hub-card-actions"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </article>
  )
}
