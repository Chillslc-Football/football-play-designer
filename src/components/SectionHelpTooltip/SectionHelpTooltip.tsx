import { useCallback, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import './SectionHelpTooltip.css'

type SectionHelpTooltipProps = {
  content: string
}

const VIEWPORT_PADDING = 8
const BUBBLE_MAX_WIDTH = 220
const BUBBLE_OFFSET = 6

export function SectionHelpTooltip({ content }: SectionHelpTooltipProps) {
  const tooltipId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const bubbleRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [bubbleStyle, setBubbleStyle] = useState<CSSProperties>({
    visibility: 'hidden',
  })

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    const bubble = bubbleRef.current
    if (!trigger || !bubble) return

    const triggerRect = trigger.getBoundingClientRect()
    const bubbleRect = bubble.getBoundingClientRect()

    let top = triggerRect.bottom + BUBBLE_OFFSET
    let left = triggerRect.left

    if (left + bubbleRect.width > window.innerWidth - VIEWPORT_PADDING) {
      left = window.innerWidth - bubbleRect.width - VIEWPORT_PADDING
    }

    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING
    }

    if (top + bubbleRect.height > window.innerHeight - VIEWPORT_PADDING) {
      top = triggerRect.top - bubbleRect.height - BUBBLE_OFFSET
    }

    if (top < VIEWPORT_PADDING) {
      top = VIEWPORT_PADDING
    }

    setBubbleStyle({
      position: 'fixed',
      top,
      left,
      maxWidth: BUBBLE_MAX_WIDTH,
      visibility: 'visible',
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setBubbleStyle({ visibility: 'hidden' })
      return
    }

    updatePosition()
  }, [open, content, updatePosition])

  useLayoutEffect(() => {
    if (!open) return

    function handleReposition() {
      updatePosition()
    }

    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)
    return () => {
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
  }, [open, updatePosition])

  function showTooltip() {
    setOpen(true)
  }

  function hideTooltip() {
    setOpen(false)
  }

  return (
    <span className="section-help-tooltip">
      <button
        ref={triggerRef}
        type="button"
        className="section-help-tooltip-trigger"
        aria-label={content}
        aria-describedby={open ? tooltipId : undefined}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        i
      </button>
      {open &&
        createPortal(
          <span
            ref={bubbleRef}
            id={tooltipId}
            className="section-help-tooltip-bubble section-help-tooltip-bubble-portal"
            role="tooltip"
            style={bubbleStyle}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  )
}
