import { useCallback, useEffect, useState } from 'react'
import { AppShellNav } from '../components/AppShellNav/AppShellNav'
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog'
import { APP_DISPLAY_THEME } from '../constants/appDisplayTheme'
import { useAuth } from '../hooks/useAuth'
import { useCanEdit } from '../hooks/useCanEdit'
import { useTeam } from '../hooks/useTeam'
import * as teamUpdateRepository from '../repositories/teamUpdateRepository'
import {
  createEmptyTeamUpdateDraft,
  updateToDraft,
  type TeamUpdate,
  type TeamUpdateDraft,
} from '../types/teamUpdate'
import { formatTeamUpdateTimestamp, wasTeamUpdateEdited } from '../utils/teamUpdateUtils'
import './TeamUpdatesPage.css'

type ViewMode = 'list' | 'edit'

function isDraftValid(draft: TeamUpdateDraft): boolean {
  return draft.title.trim().length > 0 && draft.body.trim().length > 0
}

export function TeamUpdatesPage() {
  const { user } = useAuth()
  const { team, activeTeamId } = useTeam()
  const canEdit = useCanEdit()

  const [updates, setUpdates] = useState<TeamUpdate[]>([])
  const [draft, setDraft] = useState<TeamUpdateDraft>(createEmptyTeamUpdateDraft())
  const [view, setView] = useState<ViewMode>('list')
  const [editingExisting, setEditingExisting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadUpdates = useCallback(async () => {
    if (!activeTeamId) return

    setLoading(true)
    setError(null)

    try {
      const loaded = await teamUpdateRepository.getTeamUpdatesByTeam(activeTeamId)
      setUpdates(loaded)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load team updates')
    } finally {
      setLoading(false)
    }
  }, [activeTeamId])

  useEffect(() => {
    void loadUpdates()
  }, [loadUpdates])

  function openCreate() {
    setDraft(createEmptyTeamUpdateDraft())
    setEditingExisting(false)
    setView('edit')
    setError(null)
  }

  function openEdit(update: TeamUpdate) {
    setDraft(updateToDraft(update))
    setEditingExisting(true)
    setView('edit')
    setError(null)
  }

  function backToList() {
    setView('list')
    setEditingExisting(false)
    setDraft(createEmptyTeamUpdateDraft())
    setError(null)
  }

  async function handleSave() {
    if (!activeTeamId || !canEdit) return

    if (!isDraftValid(draft)) {
      setError('Title and message are required.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (editingExisting) {
        const original = updates.find((update) => update.id === draft.id)
        await teamUpdateRepository.updateTeamUpdate(activeTeamId, draft)
        if (original && draft.show_on_home !== original.show_on_home) {
          await teamUpdateRepository.setTeamUpdateShowOnHome(draft.id, draft.show_on_home)
        }
      } else {
        await teamUpdateRepository.createTeamUpdate(activeTeamId, draft)
        if (draft.show_on_home) {
          await teamUpdateRepository.setTeamUpdateShowOnHome(draft.id, true)
        }
      }

      await loadUpdates()
      backToList()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save team update')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!activeTeamId || !deleteTargetId || !canEdit) return

    try {
      await teamUpdateRepository.deleteTeamUpdate(activeTeamId, deleteTargetId)
      setDeleteTargetId(null)
      await loadUpdates()
      if (view === 'edit' && draft.id === deleteTargetId) {
        backToList()
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete team update')
      setDeleteTargetId(null)
    }
  }

  function authorLabel(update: TeamUpdate): string | null {
    if (!update.created_by) return null
    if (user?.id && update.created_by === user.id) {
      return 'You'
    }
    return 'Coach'
  }

  return (
    <div className={`team-updates-page app-theme-${APP_DISPLAY_THEME}`}>
      <ConfirmDialog
        open={deleteTargetId !== null}
        message="Delete this team update? This cannot be undone."
        variant="delete"
        confirmLabel="Delete"
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTargetId(null)}
      />

      <div className="team-updates-page-screen">
        <header className="team-updates-page-header">
          <div className="team-updates-page-header-main">
            <AppShellNav />
            <h1>Team Updates</h1>
            <p className="team-updates-page-subtitle">{team?.name ?? 'Team'}</p>
          </div>
          <div className="team-updates-page-header-actions">
            {view !== 'list' && (
              <button type="button" className="btn" onClick={backToList} disabled={saving}>
                Back to list
              </button>
            )}
            {canEdit && view === 'list' && (
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                New Update
              </button>
            )}
          </div>
        </header>

        {error && <p className="team-updates-page-error">{error}</p>}
        {!canEdit && !loading && view === 'list' && (
          <p className="team-updates-page-readonly">
            View only — contact your coach to post updates.
          </p>
        )}

        {loading ? (
          <p className="team-updates-page-loading">Loading team updates…</p>
        ) : view === 'list' ? (
          <div className="team-updates-list">
            {updates.length === 0 ? (
              <p className="team-updates-page-empty">
                {canEdit
                  ? 'No team updates yet. Post the first announcement for your team.'
                  : 'No team updates have been posted yet.'}
              </p>
            ) : (
              updates.map((update) => {
                const author = authorLabel(update)
                const edited = wasTeamUpdateEdited(update)

                return (
                  <article
                    key={update.id}
                    className={`team-updates-list-item${update.is_pinned ? ' is-pinned' : ''}`}
                  >
                    <div className="team-updates-list-content">
                      <div className="team-updates-list-title-row">
                        <h2>{update.title}</h2>
                        {update.is_pinned && (
                          <span className="team-updates-pinned-badge">Pinned</span>
                        )}
                        {update.show_on_home && (
                          <span className="team-updates-home-badge">Home</span>
                        )}
                      </div>
                      <p className="team-updates-list-meta">
                        {formatTeamUpdateTimestamp(update.created_at)}
                        {edited && ' · Edited'}
                        {author && ` · ${author}`}
                      </p>
                      <p className="team-updates-list-body">{update.body}</p>
                    </div>
                    <div className="team-updates-list-actions">
                      <button type="button" className="btn" onClick={() => openEdit(update)}>
                        {canEdit ? 'Edit' : 'View'}
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => setDeleteTargetId(update.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </article>
                )
              })
            )}
          </div>
        ) : (
          <div className="team-updates-editor">
            <section className="team-updates-editor-form">
              <div className="form-group">
                <label className="field-label" htmlFor="team-update-title">
                  Title
                </label>
                <input
                  id="team-update-title"
                  className="input-field"
                  value={draft.title}
                  readOnly={!canEdit}
                  maxLength={200}
                  placeholder="Practice moved to 6 PM"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label className="field-label" htmlFor="team-update-body">
                  Message
                </label>
                <textarea
                  id="team-update-body"
                  className="input-field team-updates-editor-body"
                  value={draft.body}
                  readOnly={!canEdit}
                  rows={8}
                  placeholder="Share schedule changes, reminders, or announcements with your team."
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, body: event.target.value }))
                  }
                />
              </div>

              {canEdit && (
                <div className="form-group team-updates-pin-row">
                  <label className="team-updates-pin-label">
                    <input
                      type="checkbox"
                      checked={draft.is_pinned}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, is_pinned: event.target.checked }))
                      }
                    />
                    Pin to top of list
                  </label>
                  <label className="team-updates-pin-label">
                    <input
                      type="checkbox"
                      checked={draft.show_on_home}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          show_on_home: event.target.checked,
                        }))
                      }
                    />
                    Show on Home
                  </label>
                </div>
              )}

              {canEdit && (
                <div className="team-updates-editor-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving || !isDraftValid(draft)}
                    onClick={() => void handleSave()}
                  >
                    {saving ? 'Saving…' : editingExisting ? 'Save Changes' : 'Post Update'}
                  </button>
                  {editingExisting && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={saving}
                      onClick={() => setDeleteTargetId(draft.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
