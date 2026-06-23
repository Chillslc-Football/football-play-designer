import type { AudienceMentionOption } from '../../utils/teamMessageMentionAutocomplete'

type TeamMessageMentionMenuProps = {
  options: AudienceMentionOption[]
  highlightedIndex: number
  listboxId: string
  onHighlight: (index: number) => void
  onSelect: (option: AudienceMentionOption) => void
}

export function TeamMessageMentionMenu({
  options,
  highlightedIndex,
  listboxId,
  onHighlight,
  onSelect,
}: TeamMessageMentionMenuProps) {
  if (options.length === 0) {
    return null
  }

  return (
    <ul
      id={listboxId}
      className="team-messaging-mention-menu"
      role="listbox"
      aria-label="Audience mentions"
    >
      {options.map((option, index) => {
        const isHighlighted = index === highlightedIndex

        return (
          <li key={option.audience} role="presentation">
            <button
              type="button"
              className={`team-messaging-mention-menu-item${isHighlighted ? ' is-highlighted' : ''}`}
              role="option"
              aria-selected={isHighlighted}
              onMouseEnter={() => onHighlight(index)}
              onMouseDown={(event) => {
                event.preventDefault()
                onSelect(option)
              }}
            >
              <span className="team-messaging-mention-menu-label">{option.label}</span>
              <span className="team-messaging-mention-menu-description">{option.description}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
