import { useEffect, useRef, useState } from 'react'
import * as feedbackRepository from '../../repositories/feedbackRepository'
import type { FeedbackType } from '../../types/feedback'
import '../ConfirmDialog/ConfirmDialog.css'
import './FeedbackDialog.css'

type FeedbackDialogProps = {
  open: boolean
  userId: string
  teamId: string | null
  onClose: () => void
}

const SUCCESS_MESSAGE = 'Feedback submitted. Thank you.'

export function FeedbackDialog({ open, userId, teamId, onClose }: FeedbackDialogProps) {
  const [type, setType] = useState<FeedbackType>('issue')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusKind, setStatusKind] = useState<'success' | 'error' | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    setType('issue')
    setTitle('')
    setDescription('')
    setSubmitting(false)
    setStatusMessage('')
    setStatusKind(null)
    titleRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, submitting])

  if (!open) return null

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()

    if (!trimmedTitle || !trimmedDescription) {
      setStatusKind('error')
      setStatusMessage('Title and description are required.')
      return
    }

    setSubmitting(true)
    setStatusMessage('')
    setStatusKind(null)

    try {
      await feedbackRepository.submitFeedback({
        teamId,
        userId,
        type,
        title: trimmedTitle,
        description: trimmedDescription,
        pageUrl: window.location.href,
      })

      setStatusKind('success')
      setStatusMessage(SUCCESS_MESSAGE)
      setTitle('')
      setDescription('')
      setType('issue')

      window.setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      setStatusKind('error')
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to submit feedback. Please try again.',
      )
    } finally {
      setSubmitting(false)
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
        className="confirm-dialog feedback-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
      >
        <h2 id="feedback-dialog-title" className="feedback-dialog-title">
          Report Issue / Enhancement
        </h2>

        <form className="feedback-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="form-group">
            <label htmlFor="feedback-type" className="field-label">
              Type
            </label>
            <select
              id="feedback-type"
              className="select-field"
              value={type}
              onChange={(event) => setType(event.target.value as FeedbackType)}
              disabled={submitting || statusKind === 'success'}
            >
              <option value="issue">Issue</option>
              <option value="enhancement">Enhancement</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="feedback-title" className="field-label">
              Title
            </label>
            <input
              ref={titleRef}
              id="feedback-title"
              type="text"
              className="input-field"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Brief summary"
              disabled={submitting || statusKind === 'success'}
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label htmlFor="feedback-description" className="field-label">
              Description
            </label>
            <textarea
              id="feedback-description"
              className="input-field feedback-dialog-textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the issue or enhancement..."
              rows={5}
              disabled={submitting || statusKind === 'success'}
            />
          </div>

          {statusMessage && (
            <p
              className={`feedback-dialog-message ${
                statusKind === 'success'
                  ? 'feedback-dialog-message-success'
                  : 'feedback-dialog-message-error'
              }`}
            >
              {statusMessage}
            </p>
          )}

          <div className="feedback-dialog-actions">
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || statusKind === 'success'}
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
