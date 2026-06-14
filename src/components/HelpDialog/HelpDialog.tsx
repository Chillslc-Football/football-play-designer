import { useEffect, useState, type ReactNode } from 'react'
import { HELP_SECTIONS } from '../../content/helpContent'
import type { HelpBlock } from '../../content/helpContent'
import '../ConfirmDialog/ConfirmDialog.css'
import './HelpDialog.css'

type HelpDialogProps = {
  open: boolean
  onClose: () => void
}

function renderHelpBlock(block: HelpBlock, index: number) {
  if (block.type === 'paragraph') {
    return (
      <p key={`paragraph-${index}`} className="help-dialog-paragraph">
        {block.text}
      </p>
    )
  }

  return (
    <ul key={`list-${index}`} className="help-dialog-list">
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function HelpAccordionSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className={`help-accordion-section ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="help-accordion-header"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <span className="help-accordion-title">{title}</span>
        <span className="help-accordion-chevron" aria-hidden="true">
          {isOpen ? '▾' : '▸'}
        </span>
      </button>
      {isOpen && <div className="help-accordion-body">{children}</div>}
    </section>
  )
}

export function HelpDialog({ open, onClose }: HelpDialogProps) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="confirm-dialog-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="confirm-dialog help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
      >
        <div className="help-dialog-header">
          <h2 id="help-dialog-title" className="help-dialog-title">
            Help
          </h2>
          <button
            type="button"
            className="help-dialog-close"
            onClick={onClose}
            aria-label="Close help"
          >
            ×
          </button>
        </div>

        <div className="help-dialog-body">
          {HELP_SECTIONS.map((section) => (
            <HelpAccordionSection
              key={section.id}
              title={section.title}
              defaultOpen={section.defaultOpen}
            >
              {section.blocks.map((block, index) => renderHelpBlock(block, index))}
            </HelpAccordionSection>
          ))}
        </div>
      </div>
    </div>
  )
}
