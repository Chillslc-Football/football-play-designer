import './UnreadCountBadge.css'

type UnreadCountBadgeProps = {
  count: number
  className?: string
  label?: string
}

export function formatUnreadCount(count: number): string {
  if (count <= 0) {
    return ''
  }

  if (count > 99) {
    return '99+'
  }

  return String(count)
}

export function UnreadCountBadge({ count, className = '', label }: UnreadCountBadgeProps) {
  if (count <= 0) {
    return null
  }

  const display = formatUnreadCount(count)
  const ariaLabel = label ?? `${count} unread message${count === 1 ? '' : 's'}`

  return (
    <span className={`unread-count-badge ${className}`.trim()} aria-label={ariaLabel} title={ariaLabel}>
      {display}
    </span>
  )
}
