import { useState, type ReactNode } from 'react'
import './CollapsibleSection.css'

type CollapsibleSectionProps = {
  step: string
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

export function CollapsibleSection({
  step,
  title,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className={`collapsible-section ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="collapsible-section-header"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <span className="collapsible-section-step">{step}</span>
        <span className="collapsible-section-title">{title}</span>
        <span className="collapsible-section-chevron" aria-hidden="true">
          {isOpen ? '▾' : '▸'}
        </span>
      </button>
      {isOpen && <div className="collapsible-section-body">{children}</div>}
    </section>
  )
}
