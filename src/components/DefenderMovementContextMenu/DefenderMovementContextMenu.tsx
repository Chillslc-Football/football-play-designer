import { useLayoutEffect, useRef, useState } from 'react'
import type { DrawingMode } from '../DrawingModeSelector/DrawingModeSelector'
import type { DefenderLabel } from '../../types/defender'
import '../FieldActionContextMenu/FieldActionContextMenu.css'

export type DefenderMovementContextMenuState = {
  x: number
  y: number
  defenderId: DefenderLabel
}

type DefenderMovementContextMenuProps = {
  menu: DefenderMovementContextMenuState
  drawingMode: DrawingMode
  canDeleteSegment: boolean
  canDeleteEntire: boolean
  onDeleteSegment: () => void
  onDeleteEntire: () => void
  onDrawingModeChange: (mode: DrawingMode) => void
  onClose: () => void
}

export function DefenderMovementContextMenu({
  menu,
  drawingMode,
  canDeleteSegment,
  canDeleteEntire,
  onDeleteSegment,
  onDeleteEntire,
  onDrawingModeChange,
  onClose,
}: DefenderMovementContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: menu.x, y: menu.y })

  useLayoutEffect(() => {
    const element = menuRef.current
    if (!element) {
      setPosition({ x: menu.x, y: menu.y })
      return
    }

    const rect = element.getBoundingClientRect()
    const margin = 8
    const x = Math.min(menu.x, window.innerWidth - rect.width - margin)
    const y = Math.min(menu.y, window.innerHeight - rect.height - margin)
    setPosition({ x: Math.max(margin, x), y: Math.max(margin, y) })
  }, [menu.x, menu.y])

  function run(action: () => void) {
    action()
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="field-action-context-menu"
      style={{ left: position.x, top: position.y }}
      role="menu"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="field-action-context-menu-section">
        <button
          type="button"
          className="field-action-context-menu-item field-action-context-menu-item-danger"
          disabled={!canDeleteSegment}
          onClick={() => run(onDeleteSegment)}
        >
          Delete Segment
        </button>
        <button
          type="button"
          className="field-action-context-menu-item field-action-context-menu-item-danger"
          disabled={!canDeleteEntire}
          onClick={() => run(onDeleteEntire)}
        >
          Delete Entire Movement
        </button>
      </div>

      <div className="field-action-context-menu-section">
        <span className="field-action-context-menu-label">Change Drawing Mode</span>
        <button
          type="button"
          className={`field-action-context-menu-item ${
            drawingMode === 'route' ? 'field-action-context-menu-item-active' : ''
          }`}
          onClick={() => run(() => onDrawingModeChange('route'))}
        >
          Movement
        </button>
      </div>

      <div className="field-action-context-menu-section">
        <span className="field-action-context-menu-label">Change Selected Segment Type</span>
        <button
          type="button"
          className="field-action-context-menu-item field-action-context-menu-item-active"
          disabled
        >
          Movement
        </button>
      </div>
    </div>
  )
}
