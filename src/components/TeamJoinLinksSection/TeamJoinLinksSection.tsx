import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog'
import { useCanInvite } from '../../hooks/useCanInvite'
import { useInviteRoles } from '../../hooks/useInviteRoles'
import * as joinLinkRepository from '../../repositories/joinLinkRepository'
import { INVITE_ROLE_LABELS } from '../../types/invite'
import type { JoinLinkRecord, JoinLinkRole } from '../../types/joinLink'
import { JOIN_LINK_ROLE_HINTS } from '../../types/joinLink'
import { buildJoinTeamUrl } from '../../utils/joinLinkToken'
import './TeamJoinLinksSection.css'

type TeamJoinLinksSectionProps = {
  teamId: string
  teamName: string
  onError?: (message: string | null) => void
}

export function TeamJoinLinksSection({
  teamId,
  onError,
}: TeamJoinLinksSectionProps) {
  const canInvite = useCanInvite()
  const inviteRoles = useInviteRoles()
  const [links, setLinks] = useState<JoinLinkRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedRole, setCopiedRole] = useState<JoinLinkRole | null>(null)
  const [expandedRole, setExpandedRole] = useState<JoinLinkRole | null>(null)
  const [regenerateRole, setRegenerateRole] = useState<JoinLinkRole | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  const linksByRole = useMemo(() => {
    const map = new Map<JoinLinkRole, JoinLinkRecord>()
    for (const link of links) {
      map.set(link.role, link)
    }
    return map
  }, [links])

  const loadLinks = useCallback(async () => {
    if (!canInvite) return

    setLoading(true)
    onError?.(null)

    try {
      const loaded = await joinLinkRepository.fetchTeamJoinLinks(teamId)
      setLinks(loaded)
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to load team join links')
    } finally {
      setLoading(false)
    }
  }, [canInvite, teamId, onError])

  useEffect(() => {
    void loadLinks()
  }, [loadLinks])

  if (!canInvite) {
    return null
  }

  async function handleCopyLink(linkRole: JoinLinkRole) {
    const link = linksByRole.get(linkRole)
    if (!link) return

    onError?.(null)

    try {
      await navigator.clipboard.writeText(buildJoinTeamUrl(link.token))
      setCopiedRole(linkRole)
      window.setTimeout(() => {
        setCopiedRole((current) => (current === linkRole ? null : current))
      }, 2000)
    } catch {
      onError?.('Could not copy join link. Try again or copy it manually.')
    }
  }

  async function handleConfirmRegenerate() {
    if (!regenerateRole) return

    setRegenerating(true)
    onError?.(null)

    try {
      await joinLinkRepository.regenerateTeamJoinLink(teamId, regenerateRole)
      setRegenerateRole(null)
      setExpandedRole((current) => (current === regenerateRole ? null : current))
      await loadLinks()
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Could not regenerate join link')
      setRegenerateRole(null)
    } finally {
      setRegenerating(false)
    }
  }

  function toggleShowLink(linkRole: JoinLinkRole) {
    setExpandedRole((current) => (current === linkRole ? null : linkRole))
  }

  return (
    <>
      <ConfirmDialog
        open={regenerateRole !== null}
        message="Regenerate this link? The old link will stop working."
        variant="delete"
        confirmLabel={regenerating ? 'Regenerating…' : 'Regenerate'}
        onConfirm={() => void handleConfirmRegenerate()}
        onCancel={() => {
          if (regenerating) return
          setRegenerateRole(null)
        }}
      />

      <section
        className="team-join-links app-shell-card"
        aria-labelledby="team-join-links-heading"
      >
        <h2 id="team-join-links-heading">Team Join Links</h2>
        <p className="team-join-links-description">Share these links with your team.</p>

        {loading ? (
          <p className="team-join-links-loading">Loading join links…</p>
        ) : (
          <ul className="team-join-links-list">
            {inviteRoles.map((linkRole) => {
              const link = linksByRole.get(linkRole)
              const joinUrl = link ? buildJoinTeamUrl(link.token) : ''
              const isExpanded = expandedRole === linkRole

              return (
                <li key={linkRole} className="team-join-link-row">
                  <div className="team-join-link-main">
                    <div className="team-join-link-info">
                      <h3 className="team-join-link-title">{INVITE_ROLE_LABELS[linkRole]}</h3>
                      <p className="team-join-link-hint">{JOIN_LINK_ROLE_HINTS[linkRole]}</p>
                    </div>

                    <div className="team-join-link-actions">
                      <button
                        type="button"
                        className="btn team-join-link-action-btn"
                        disabled={!link}
                        onClick={() => toggleShowLink(linkRole)}
                      >
                        {isExpanded ? 'Hide link' : 'Show link'}
                      </button>
                      <button
                        type="button"
                        className="btn team-join-link-action-btn"
                        disabled={!link}
                        onClick={() => void handleCopyLink(linkRole)}
                      >
                        {copiedRole === linkRole ? 'Copied!' : 'Copy Link'}
                      </button>
                      <button
                        type="button"
                        className="btn team-join-link-action-btn"
                        disabled={!link || regenerating}
                        onClick={() => setRegenerateRole(linkRole)}
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>

                  {isExpanded && joinUrl && (
                    <input
                      className="input-field team-join-link-url"
                      type="text"
                      readOnly
                      value={joinUrl}
                      aria-label={`${INVITE_ROLE_LABELS[linkRole]} join link`}
                      onFocus={(event) => event.target.select()}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
