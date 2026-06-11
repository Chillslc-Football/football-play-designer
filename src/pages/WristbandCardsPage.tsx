import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog'
import { AppShellNav } from '../components/AppShellNav/AppShellNav'
import { WristbandCardFace } from '../components/WristbandCardFace/WristbandCardFace'
import { WristbandPlaySelector } from '../components/WristbandPlaySelector/WristbandPlaySelector'
import { WristbandPrintSheet } from '../components/WristbandPrintSheet/WristbandPrintSheet'
import { APP_DISPLAY_THEME } from '../constants/appDisplayTheme'
import { useCanEdit } from '../hooks/useCanEdit'
import { useTeam } from '../hooks/useTeam'
import * as playRepository from '../repositories/playRepository'
import * as wristbandRepository from '../repositories/wristbandCardRepository'
import type { Play } from '../types/play'
import {
  cardToDraft,
  createEmptyWristbandCardDraft,
  type WristbandCard,
  type WristbandCardDraft,
} from '../types/wristbandCard'
import { getAvailableCategories } from '../utils/categoryUtils'
import { cardsPerSheet } from '../utils/wristbandPrint'
import './WristbandCardsPage.css'

type ViewMode = 'list' | 'edit' | 'print'

export function WristbandCardsPage() {
  const { team, activeTeamId } = useTeam()
  const canEdit = useCanEdit()

  const [cards, setCards] = useState<WristbandCard[]>([])
  const [plays, setPlays] = useState<Play[]>([])
  const [draft, setDraft] = useState<WristbandCardDraft>(createEmptyWristbandCardDraft())
  const [view, setView] = useState<ViewMode>('list')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!activeTeamId) return

    setLoading(true)
    setError(null)

    try {
      const [loadedCards, loadedPlays] = await Promise.all([
        wristbandRepository.getWristbandCardsByTeam(activeTeamId),
        playRepository.getPlaysByTeam(activeTeamId, []),
      ])
      setCards(loadedCards)
      setPlays(loadedPlays)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load wristband cards')
    } finally {
      setLoading(false)
    }
  }, [activeTeamId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const playNamesById = useMemo(
    () => Object.fromEntries(plays.map((play) => [play.id, play.name])),
    [plays],
  )

  const headingSuggestions = useMemo(() => {
    const offensive = getAvailableCategories('offensive', [], plays)
    const defensive = getAvailableCategories('defensive', [], plays)
    return [...new Set([...offensive, ...defensive])]
  }, [plays])

  const sheetLayout = cardsPerSheet(draft.wristband_width, draft.wristband_height)

  function openCreate() {
    setDraft(createEmptyWristbandCardDraft())
    setView('edit')
    setError(null)
  }

  function openEdit(card: WristbandCard) {
    setDraft(cardToDraft(card))
    setView('edit')
    setError(null)
  }

  async function handleSave() {
    if (!activeTeamId || !canEdit) return

    const trimmedName = draft.name.trim()
    if (trimmedName.length < 2) {
      setError('Template name must be at least 2 characters.')
      return
    }

    if (draft.wristband_width <= 0 || draft.wristband_height <= 0) {
      setError('Width and height must be greater than zero.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const saved = await wristbandRepository.upsertWristbandCard(activeTeamId, {
        ...draft,
        name: trimmedName,
      })
      setDraft(saved)
      await loadData()
      setView('list')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save wristband card')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!activeTeamId || !deleteTargetId || !canEdit) return

    try {
      await wristbandRepository.deleteWristbandCard(activeTeamId, deleteTargetId)
      setDeleteTargetId(null)
      await loadData()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete wristband card')
      setDeleteTargetId(null)
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className={`wristband-page app-theme-${APP_DISPLAY_THEME}`}>
      <ConfirmDialog
        open={deleteTargetId !== null}
        message="Delete this wristband card template? This cannot be undone."
        variant="delete"
        confirmLabel="Delete"
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTargetId(null)}
      />

      <div className="wristband-page-screen no-print">
        <header className="wristband-page-header">
          <div className="wristband-page-header-main">
            <AppShellNav />
            <h1>Wristband Cards</h1>
            <p className="wristband-page-subtitle">{team?.name ?? 'Team'}</p>
          </div>
          <div className="wristband-page-header-actions">
            {view !== 'list' && (
              <button type="button" className="btn" onClick={() => setView('list')}>
                Back to list
              </button>
            )}
            {canEdit && view === 'list' && (
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                Create Wristband Card
              </button>
            )}
          </div>
        </header>

        {error && <p className="wristband-page-error">{error}</p>}
        {!canEdit && !loading && (
          <p className="wristband-page-readonly">View and print only — contact your coach to edit.</p>
        )}

        {loading ? (
          <p className="wristband-page-loading">Loading wristband cards…</p>
        ) : view === 'list' ? (
          <div className="wristband-card-list">
            {cards.length === 0 ? (
              <p className="wristband-page-empty">No wristband card templates saved yet.</p>
            ) : (
              cards.map((card) => (
                <article key={card.id} className="wristband-card-list-item">
                  <div>
                    <h2>{card.name}</h2>
                    <p>
                      {card.wristband_width}" × {card.wristband_height}" · Left:{' '}
                      {card.left_play_ids.length} plays · Right: {card.right_play_ids.length} plays
                    </p>
                  </div>
                  <div className="wristband-card-list-actions">
                    <button type="button" className="btn" onClick={() => openEdit(card)}>
                      {canEdit ? 'Edit' : 'View'}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setDraft({ ...card })
                        setView('print')
                      }}
                    >
                      Print
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => setDeleteTargetId(card.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        ) : view === 'edit' ? (
          <div className="wristband-editor">
            <section className="wristband-editor-form">
              <div className="form-group">
                <label className="field-label" htmlFor="wristband-name">
                  Template name
                </label>
                <input
                  id="wristband-name"
                  className="input-field"
                  value={draft.name}
                  readOnly={!canEdit}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </div>

              <div className="wristband-editor-size-row">
                <div className="form-group">
                  <label className="field-label" htmlFor="wristband-width">
                    Width (inches)
                  </label>
                  <input
                    id="wristband-width"
                    className="input-field"
                    type="number"
                    min={0.1}
                    step={0.125}
                    value={draft.wristband_width}
                    readOnly={!canEdit}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        wristband_width: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="field-label" htmlFor="wristband-height">
                    Height (inches)
                  </label>
                  <input
                    id="wristband-height"
                    className="input-field"
                    type="number"
                    min={0.1}
                    step={0.125}
                    value={draft.wristband_height}
                    readOnly={!canEdit}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        wristband_height: Number(event.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="wristband-editor-headings">
                <div className="form-group">
                  <label className="field-label" htmlFor="left-heading">
                    Left heading
                  </label>
                  <input
                    id="left-heading"
                    className="input-field"
                    list="wristband-heading-suggestions"
                    value={draft.left_heading}
                    readOnly={!canEdit}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, left_heading: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="field-label" htmlFor="right-heading">
                    Right heading
                  </label>
                  <input
                    id="right-heading"
                    className="input-field"
                    list="wristband-heading-suggestions"
                    value={draft.right_heading}
                    readOnly={!canEdit}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, right_heading: event.target.value }))
                    }
                  />
                </div>
                <datalist id="wristband-heading-suggestions">
                  {headingSuggestions.map((heading) => (
                    <option key={heading} value={heading} />
                  ))}
                </datalist>
              </div>

              <WristbandPlaySelector
                label="Left column plays"
                plays={plays}
                selectedIds={draft.left_play_ids}
                canEdit={canEdit}
                onChange={(ids) => setDraft((current) => ({ ...current, left_play_ids: ids }))}
              />

              <WristbandPlaySelector
                label="Right column plays"
                plays={plays}
                selectedIds={draft.right_play_ids}
                canEdit={canEdit}
                onChange={(ids) => setDraft((current) => ({ ...current, right_play_ids: ids }))}
              />

              <div className="wristband-editor-actions">
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving}
                    onClick={() => void handleSave()}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                )}
                <button type="button" className="btn" onClick={() => setView('print')}>
                  Print Preview
                </button>
                <button type="button" className="btn" onClick={() => setView('print')}>
                  Print
                </button>
              </div>
            </section>

            <section className="wristband-editor-preview">
              <h2>Card preview</h2>
              <p className="wristband-editor-preview-meta">
                Fits {sheetLayout.count} per 8.5" × 11" sheet ({sheetLayout.cols} × {sheetLayout.rows})
              </p>
              <WristbandCardFace card={draft} playNamesById={playNamesById} />
            </section>
          </div>
        ) : (
          <div className="wristband-print-view">
            <p className="wristband-print-meta">
              Printing {sheetLayout.count} card{sheetLayout.count === 1 ? '' : 's'} per sheet (
              {draft.wristband_width}" × {draft.wristband_height}")
            </p>
            <div className="wristband-print-actions">
              <button type="button" className="btn btn-primary" onClick={handlePrint}>
                Print
              </button>
              <button type="button" className="btn" onClick={() => setView('edit')}>
                Back to editor
              </button>
            </div>
          </div>
        )}
      </div>

      {view === 'print' && (
        <div className="wristband-print-only print-only">
          <WristbandPrintSheet card={draft} playNamesById={playNamesById} />
        </div>
      )}
    </div>
  )
}
