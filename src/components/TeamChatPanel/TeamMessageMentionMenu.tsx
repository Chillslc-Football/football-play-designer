import type { MentionSuggestion } from '../../utils/teamMessageMentionAutocomplete'

type TeamMessageMentionMenuProps = {
  options: MentionSuggestion[]
  highlightedIndex: number
  listboxId: string
  onHighlight: (index: number) => void
  onSelect: (option: MentionSuggestion) => void
}

function getOptionKey(option: MentionSuggestion): string {
  return option.kind === 'audience' ? option.audience : option.userId
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
      aria-label="Mentions"
    >
      {options.map((option, index) => {
        const isHighlighted = index === highlightedIndex

        return (
          <li key={getOptionKey(option)} role="presentation">
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
