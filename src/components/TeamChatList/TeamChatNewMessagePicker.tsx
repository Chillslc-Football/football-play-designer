import { useEffect, useMemo, useState } from 'react'
import * as teamMessageRepository from '../../repositories/teamMessageRepository'
import type { DirectMessageEligibleMember } from '../../types/teamMessage'
import type { TeamRole } from '../../types/team'
import { TEAM_ROLE_LABELS } from '../../utils/roleLabels'
import './TeamChatNewMessagePicker.css'

type TeamChatNewMessagePickerProps = {
  teamId: string
  onSelectMember: (member: DirectMessageEligibleMember) => void
  onClose: () => void
}

function memberLabel(member: DirectMessageEligibleMember): string {
  const name = member.display_name?.trim()
  if (name) {
    return name
  }

  return 'Team member'
}

export function TeamChatNewMessagePicker({
  teamId,
  onSelectMember,
  onClose,
}: TeamChatNewMessagePickerProps) {
  const [members, setMembers] = useState<DirectMessageEligibleMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setLoading(true)
      setError(null)

      try {
        const loadedMembers = await teamMessageRepository.listDmEligibleMembers(teamId)
        if (!cancelled) {
          setMembers(loadedMembers)
        }
      } catch (loadError) {
        if (!cancelled) {
          setMembers([])
          setError(loadError instanceof Error ? loadError.message : 'Failed to load team members')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [teamId])

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return members
    }

    return members.filter((member) => {
      const name = memberLabel(member).toLowerCase()
      const role = (TEAM_ROLE_LABELS[member.role as TeamRole] ?? member.role).toLowerCase()
      return name.includes(normalizedQuery) || role.includes(normalizedQuery)
    })
  }, [members, query])

  return (
    <div className="team-chat-new-message-picker" role="dialog" aria-label="New message">
      <div className="team-chat-new-message-picker-header">
        <h3 className="team-chat-new-message-picker-title">New message</h3>
        <button
          type="button"
          className="btn team-chat-new-message-picker-close"
          onClick={onClose}
          aria-label="Close new message picker"
        >
          Cancel
        </button>
      </div>

      <input
        type="search"
        className="input-field team-chat-new-message-picker-search"
        value={query}
        placeholder="Search team members…"
        aria-label="Search team members"
        onChange={(event) => setQuery(event.target.value)}
      />

      {loading ? (
        <p className="team-chat-new-message-picker-status">Loading team members…</p>
      ) : error ? (
        <p className="team-chat-new-message-picker-status team-chat-new-message-picker-error">
          {error}
        </p>
      ) : filteredMembers.length === 0 ? (
        <p className="team-chat-new-message-picker-status">No team members found.</p>
      ) : (
        <ul className="team-chat-new-message-picker-list">
          {filteredMembers.map((member) => (
            <li key={member.user_id}>
              <button
                type="button"
                className="team-chat-new-message-picker-item"
                onClick={() => onSelectMember(member)}
              >
                <span className="team-chat-new-message-picker-item-name">{memberLabel(member)}</span>
                <span className="team-chat-new-message-picker-item-role">
                  {TEAM_ROLE_LABELS[member.role as TeamRole] ?? member.role}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
