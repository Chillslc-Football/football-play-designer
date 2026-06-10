import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useInviteRoles } from '../../hooks/useInviteRoles'
import * as inviteRepository from '../../repositories/inviteRepository'
import { INVITE_ROLE_LABELS, type InviteRole } from '../../types/invite'
import '../ConfirmDialog/ConfirmDialog.css'
import './InviteMemberDialog.css'

type InviteMemberDialogProps = {
  open: boolean
  teamId: string
  onClose: () => void
}

export function InviteMemberDialog({ open, teamId, onClose }: InviteMemberDialogProps) {
  const inviteRoles = useInviteRoles()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('player')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setEmail('')
      setRole(inviteRoles[0] ?? 'player')
      setError(null)
      setSubmitting(false)
      setInviteLink(null)
      setCopied(false)
      return
    }

    setRole(inviteRoles[0] ?? 'player')
    emailRef.current?.focus()
  }, [open, inviteRoles])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, submitting, onClose])

  if (!open) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setCopied(false)
    setSubmitting(true)

    try {
      const invite = await inviteRepository.createTeamInvite(teamId, email, role)
      const inviteUrl = `${window.location.origin}/accept-invite?token=${invite.token}`
      setInviteLink(inviteUrl)
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Could not create invite'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopyLink() {
    if (!inviteLink) return

    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
    } catch {
      setError('Could not copy link. Select and copy it manually.')
    }
  }

  return (
    <div
      className="confirm-dialog-overlay"
      role="presentation"
      onClick={(event) => {
        if (!submitting && event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="confirm-dialog invite-member-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-member-dialog-title"
      >
        <h2 id="invite-member-dialog-title" className="invite-member-dialog-title">
          Invite to team
        </h2>

        {inviteLink ? (
          <div className="invite-member-success">
            <p className="invite-member-message">
              Share this link with <strong>{email.trim()}</strong>. It expires in 14 days.
            </p>
            <label className="field-label" htmlFor="invite-link-output">
              Invite link
            </label>
            <input
              id="invite-link-output"
              className="input-field invite-member-link-input"
              type="text"
              readOnly
              value={inviteLink}
            />
            {error && <p className="auth-error">{error}</p>}
            <div className="confirm-dialog-actions">
              <button type="button" className="btn" onClick={onClose}>
                Done
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void handleCopyLink()}>
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          </div>
        ) : (
          <form className="invite-member-form" onSubmit={handleSubmit}>
            <p className="invite-member-message">
              Enter the recipient&apos;s email and role. They must sign in with that email to join.
            </p>

            {error && <p className="auth-error">{error}</p>}

            <div className="form-group">
              <label className="field-label" htmlFor="invite-email">
                Email
              </label>
              <input
                ref={emailRef}
                id="invite-email"
                className="input-field"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="invite-role">
                Role
              </label>
              <select
                id="invite-role"
                className="select-field"
                value={role}
                onChange={(event) => setRole(event.target.value as InviteRole)}
              >
                {inviteRoles.map((inviteRole) => (
                  <option key={inviteRole} value={inviteRole}>
                    {INVITE_ROLE_LABELS[inviteRole]}
                  </option>
                ))}
              </select>
            </div>

            <div className="confirm-dialog-actions">
              <button type="button" className="btn" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create invite link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
