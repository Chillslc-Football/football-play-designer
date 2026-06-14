import { useLayoutEffect, useRef, useState } from 'react'
import type { DrawingMode } from '../DrawingModeSelector/DrawingModeSelector'
import type { MotionType } from '../../types/motion'
import type { PlayerLabel } from '../../types/player'
import type { EndpointMarker, PlayerActionType } from '../../types/playerAction'
import './FieldActionContextMenu.css'

export type FieldActionContextMenuState = {
  x: number
  y: number
  playerId: PlayerLabel
  actionId: string
}

type FieldActionContextMenuProps = {
  menu: FieldActionContextMenuState
  actionType: PlayerActionType
  actionMotionType?: MotionType
  drawingMode: DrawingMode
  motionType: MotionType
  endpointMarker: EndpointMarker
  canDeleteSegment: boolean
  canDeleteEntire: boolean
  onDeleteSegment: () => void
  onDeleteEntire: () => void
  onEndpointMarkerChange: (marker: EndpointMarker) => void
  onDrawingModeChange: (mode: DrawingMode) => void
  onDrawingModeMotionSelect: (motionType: MotionType) => void
  onActionTypeChange: (type: PlayerActionType, motionType?: MotionType) => void
  onClose: () => void
}

const ENDPOINT_OPTIONS: { id: EndpointMarker; label: string }[] = [
  { id: 'arrow', label: 'Route Arrow' },
  { id: 'filled-circle', label: 'Motion Circle' },
  { id: 'blocking-line', label: 'Block Marker' },
]

const MOTION_TYPE_OPTIONS: { id: MotionType; label: string }[] = [
  { id: 'jog', label: 'Jog' },
  { id: 'sprint', label: 'Sprint' },
]

type ModeMenuOption = {
  id: DrawingMode | PlayerActionType
  label: string
  hasMotionSubmenu?: boolean
}

const DRAWING_MODE_OPTIONS: ModeMenuOption[] = [
  { id: 'route', label: 'Route' },
  { id: 'motion', label: 'Motion', hasMotionSubmenu: true },
  { id: 'block', label: 'Blocking' },
]

const ACTION_TYPE_OPTIONS: ModeMenuOption[] = [
  { id: 'route', label: 'Route' },
  { id: 'motion', label: 'Motion', hasMotionSubmenu: true },
  { id: 'block', label: 'Blocking' },
]

function deleteEntireLabel(actionType: PlayerActionType): string {
  if (actionType === 'route') return 'Delete Entire Route'
  if (actionType === 'motion') return 'Delete Entire Motion'
  return 'Delete Entire Block'
}

type MotionSubmenuProps = {
  disabled?: boolean
  activeMotionType?: MotionType
  onSelect: (motionType: MotionType) => void
}

function MotionSubmenu({ disabled = false, activeMotionType, onSelect }: MotionSubmenuProps) {
  return (
    <div
      className={`field-action-context-menu-item-with-submenu ${
        disabled ? 'field-action-context-menu-item-with-submenu-disabled' : ''
      }`}
    >
      <button
        type="button"
        className="field-action-context-menu-item field-action-context-menu-item-parent"
        disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      >
        Motion
        <span className="field-action-context-menu-item-chevron" aria-hidden="true">
          ›
        </span>
      </button>
      <div className="field-action-context-menu-submenu" role="menu">
        {MOTION_TYPE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="menuitem"
            className={`field-action-context-menu-item ${
              activeMotionType === option.id ? 'field-action-context-menu-item-active' : ''
            }`}
            disabled={disabled}
            onClick={() => onSelect(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function FieldActionContextMenu({
  menu,
  actionType,
  actionMotionType,
  drawingMode,
  motionType,
  endpointMarker,
  canDeleteSegment,
  canDeleteEntire,
  onDeleteSegment,
  onDeleteEntire,
  onEndpointMarkerChange,
  onDrawingModeChange,
  onDrawingModeMotionSelect,
  onActionTypeChange,
  onClose,
}: FieldActionContextMenuProps) {
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
          {deleteEntireLabel(actionType)}
        </button>
      </div>

      <div className="field-action-context-menu-section">
        <span className="field-action-context-menu-label">Endpoint Marker</span>
        {ENDPOINT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`field-action-context-menu-item ${
              endpointMarker === option.id ? 'field-action-context-menu-item-active' : ''
            }`}
            onClick={() => run(() => onEndpointMarkerChange(option.id))}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="field-action-context-menu-section">
        <span className="field-action-context-menu-label">Change Drawing Mode</span>
        {DRAWING_MODE_OPTIONS.map((option) =>
          option.hasMotionSubmenu ? (
            <MotionSubmenu
              key={option.id}
              activeMotionType={drawingMode === 'motion' ? motionType : undefined}
              onSelect={(selectedMotionType) =>
                run(() => onDrawingModeMotionSelect(selectedMotionType))
              }
            />
          ) : (
            <button
              key={option.id}
              type="button"
              className={`field-action-context-menu-item ${
                drawingMode === option.id ? 'field-action-context-menu-item-active' : ''
              }`}
              onClick={() => run(() => onDrawingModeChange(option.id as DrawingMode))}
            >
              {option.label}
            </button>
          ),
        )}
      </div>

      <div className="field-action-context-menu-section">
        <span className="field-action-context-menu-label">Change Selected Segment Type</span>
        {ACTION_TYPE_OPTIONS.map((option) =>
          option.hasMotionSubmenu ? (
            <MotionSubmenu
              key={option.id}
              disabled={actionType === 'motion'}
              activeMotionType={actionType === 'motion' ? actionMotionType : undefined}
              onSelect={(selectedMotionType) =>
                run(() => onActionTypeChange('motion', selectedMotionType))
              }
            />
          ) : (
            <button
              key={option.id}
              type="button"
              className={`field-action-context-menu-item ${
                actionType === option.id ? 'field-action-context-menu-item-active' : ''
              }`}
              disabled={actionType === option.id}
              onClick={() => run(() => onActionTypeChange(option.id as PlayerActionType))}
            >
              {option.label}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
