import { useCallback, useEffect, useState } from 'react'
import * as feedbackRepository from '../../repositories/feedbackRepository'
import type { FeedbackRecord, FeedbackType } from '../../types/feedback'
import { formatTeamUpdateTimestamp } from '../../utils/teamUpdateUtils'
import '../ConfirmDialog/ConfirmDialog.css'
import './FeedbackReviewDialog.css'

type FeedbackReviewDialogProps = {
  open: boolean
  onClose: () => void
}

const TYPE_LABELS: Record<FeedbackType, string> = {
  issue: 'Issue',
  enhancement: 'Enhancement',
}

function formatFeedbackType(type: FeedbackType): string {
  return TYPE_LABELS[type] ?? type
}

function formatFeedbackStatus(status: string | null): string {
  if (!status) return 'Open'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function FeedbackReviewDialog({ open, onClose }: FeedbackReviewDialogProps) {
  const [items, setItems] = useState<FeedbackRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)

  const loadFeedback = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    setResolveError(null)

    try {
      const rows = await feedbackRepository.fetchOpenFeedback()
      setItems(rows)
    } catch (error) {
      setItems([])
      setLoadError(
        error instanceof Error ? error.message : 'Failed to load feedback. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    void loadFeedback()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !resolvingId) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loadFeedback, onClose, open, resolvingId])

  if (!open) return null

  async function handleResolve(id: string) {
    setResolvingId(id)
    setResolveError(null)

    try {
      await feedbackRepository.resolveFeedback(id)
      setItems((current) => current.filter((item) => item.id !== id))
    } catch (error) {
      setResolveError(
        error instanceof Error ? error.message : 'Failed to resolve feedback. Please try again.',
      )
    } finally {
      setResolvingId(null)
    }
  }

  return (
    <div
      className="confirm-dialog-overlay"
      role="presentation"
      onClick={(event) => {
        if (!resolvingId && event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="confirm-dialog feedback-review-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-review-dialog-title"
      >
        <h2 id="feedback-review-dialog-title" className="feedback-review-dialog-title">
          Issues / Enhancements
        </h2>

        {loading && <p className="feedback-review-dialog-status">Loading…</p>}

        {!loading && loadError && (
          <p className="feedback-review-dialog-error">{loadError}</p>
        )}

        {!loading && !loadError && resolveError && (
          <p className="feedback-review-dialog-error">{resolveError}</p>
        )}

        {!loading && !loadError && items.length === 0 && (
          <p className="feedback-review-dialog-empty">No open issues or enhancements.</p>
        )}

        {!loading && !loadError && items.length > 0 && (
          <ul className="feedback-review-list">
            {items.map((item) => (
              <li key={item.id} className="feedback-review-item">
                <div className="feedback-review-item-header">
                  <h3 className="feedback-review-item-title">{item.title}</h3>
                  <span
                    className={`feedback-review-type feedback-review-type-${item.type}`}
                  >
                    {formatFeedbackType(item.type)}
                  </span>
                </div>

                <p className="feedback-review-item-description">{item.description}</p>

                {item.page_url && (
                  <p className="feedback-review-item-meta">
                    <span className="feedback-review-meta-label">Page URL</span>{' '}
                    <a
                      href={item.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="feedback-review-page-link"
                    >
                      {item.page_url}
                    </a>
                  </p>
                )}

                <div className="feedback-review-item-footer">
                  <div className="feedback-review-item-meta-group">
                    <span className="feedback-review-item-meta">
                      <span className="feedback-review-meta-label">Created</span>{' '}
                      {formatTeamUpdateTimestamp(item.created_at)}
                    </span>
                    <span className="feedback-review-item-meta">
                      <span className="feedback-review-meta-label">Status</span>{' '}
                      {formatFeedbackStatus(item.status)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary feedback-review-resolve-btn"
                    onClick={() => void handleResolve(item.id)}
                    disabled={resolvingId === item.id}
                  >
                    {resolvingId === item.id ? 'Resolving…' : 'Resolve'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="feedback-review-dialog-actions">
          <button type="button" className="btn" onClick={onClose} disabled={Boolean(resolvingId)}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
