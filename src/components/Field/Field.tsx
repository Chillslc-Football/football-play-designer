import { useEffect, useRef, useState } from 'react'
import { FIELD_LENGTH, FIELD_WIDTH } from '../../constants/field'
import type { Block } from '../../types/block'
import type { Player, PlayerLabel, Position } from '../../types/player'
import { clampPosition } from '../../types/player'
import type { PlayerNotes } from '../../types/playerNotes'
import { playerHasNotes } from '../../types/playerNotes'
import type { Route } from '../../types/route'
import { appendPathPoint } from '../../utils/pathUtils'
import { BlockLine } from '../BlockLine/BlockLine'
import type { DrawingMode } from '../DrawingModeSelector/DrawingModeSelector'
import { PlayerMarker } from '../PlayerMarker/PlayerMarker'
import { RouteLine } from '../RouteLine/RouteLine'
import './Field.css'

const DRAG_THRESHOLD = 5

type FieldProps = {
  players: Player[]
  routes: Route[]
  blocks: Block[]
  playerNotes: PlayerNotes
  drawingMode: DrawingMode
  selectedPlayerId: PlayerLabel | null
  onSelectPlayer: (playerId: PlayerLabel) => void
  onPlayerMove: (playerId: PlayerLabel, position: Position) => void
  onRouteComplete: (route: Route) => void
  onBlockComplete: (block: Block) => void
}

type DraftPath = {
  playerId: PlayerLabel
  points: Position[]
}

/**
 * Renders the field. Select a player, pick Route or Blocking mode,
 * then click and drag on the field to draw.
 */
export function Field({
  players,
  routes,
  blocks,
  playerNotes,
  drawingMode,
  selectedPlayerId,
  onSelectPlayer,
  onPlayerMove,
  onRouteComplete,
  onBlockComplete,
}: FieldProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const draggingIdRef = useRef<PlayerLabel | null>(null)
  const draftPathRef = useRef<DraftPath | null>(null)
  const drawingModeRef = useRef<DrawingMode>(drawingMode)
  const pointerStartRef = useRef<{
    playerId: PlayerLabel
    x: number
    y: number
  } | null>(null)

  const [draftPath, setDraftPath] = useState<DraftPath | null>(null)

  drawingModeRef.current = drawingMode

  const END_ZONE_DEPTH = 10
  const yardLines = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110]
  const midfieldYard = 60

  function getSvgPosition(clientX: number, clientY: number): Position {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }

    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const svgPoint = point.matrixTransform(svg.getScreenCTM()!.inverse())

    return clampPosition({ x: svgPoint.x, y: svgPoint.y })
  }

  function getPlayerPosition(playerId: PlayerLabel): Position {
    const player = players.find((p) => p.id === playerId)
    return player?.position ?? { x: 0, y: 0 }
  }

  function handlePlayerPointerDown(playerId: PlayerLabel, event: React.MouseEvent) {
    event.stopPropagation()
    event.preventDefault()
    pointerStartRef.current = { playerId, x: event.clientX, y: event.clientY }
  }

  function handleFieldMouseDown(event: React.MouseEvent) {
    if (!selectedPlayerId) return

    const target = event.target as Element
    if (target.closest('.player-marker')) return

    event.preventDefault()
    const position = getSvgPosition(event.clientX, event.clientY)
    const nextDraft = { playerId: selectedPlayerId, points: [position] }
    draftPathRef.current = nextDraft
    setDraftPath(nextDraft)
  }

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const pointerStart = pointerStartRef.current

      if (pointerStart) {
        const dx = event.clientX - pointerStart.x
        const dy = event.clientY - pointerStart.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance > DRAG_THRESHOLD) {
          draggingIdRef.current = pointerStart.playerId
          pointerStartRef.current = null
        }
      }

      if (draggingIdRef.current) {
        const position = getSvgPosition(event.clientX, event.clientY)
        onPlayerMove(draggingIdRef.current, position)
      }

      const currentDraft = draftPathRef.current
      if (currentDraft) {
        const position = getSvgPosition(event.clientX, event.clientY)
        const updated = {
          ...currentDraft,
          points: appendPathPoint(currentDraft.points, position),
        }
        draftPathRef.current = updated
        setDraftPath(updated)
      }
    }

    function handleMouseUp() {
      const pointerStart = pointerStartRef.current
      if (pointerStart) {
        onSelectPlayer(pointerStart.playerId)
        pointerStartRef.current = null
      }

      const completed = draftPathRef.current
      if (completed && completed.points.length > 0) {
        if (drawingModeRef.current === 'block') {
          onBlockComplete(completed)
        } else {
          onRouteComplete(completed)
        }
        draftPathRef.current = null
        setDraftPath(null)
      }

      draggingIdRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [onPlayerMove, onRouteComplete, onBlockComplete, onSelectPlayer])

  const hintText =
    selectedPlayerId &&
    (drawingMode === 'block'
      ? `${selectedPlayerId} selected — drag on the field to draw a blocking assignment`
      : `${selectedPlayerId} selected — drag on the field to draw a route`)

  return (
    <div className="field-container">
      {hintText && (
        <p className={`route-hint ${drawingMode === 'block' ? 'route-hint-block' : ''}`}>
          {hintText}
        </p>
      )}

      <svg
        ref={svgRef}
        className="field-svg"
        viewBox={`0 0 ${FIELD_LENGTH} ${FIELD_WIDTH}`}
        role="img"
        aria-label="Football field with offensive players"
        onMouseDown={handleFieldMouseDown}
      >
        <defs>
          <marker
            id="route-arrow"
            markerWidth="4"
            markerHeight="4"
            refX="3"
            refY="2"
            orient="auto"
          >
            <polygon points="0 0, 4 2, 0 4" className="route-arrow-head" />
          </marker>
          <marker
            id="block-t-cap"
            markerWidth="4"
            markerHeight="4"
            refX="2"
            refY="2"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <line x1="-1.5" y1="0" x2="1.5" y2="0" className="block-t-cap-line" />
          </marker>
        </defs>

        <rect x={0} y={0} width={FIELD_LENGTH} height={FIELD_WIDTH} className="field-grass" />

        <rect
          x={0}
          y={0}
          width={END_ZONE_DEPTH}
          height={FIELD_WIDTH}
          className="end-zone end-zone-left"
        />
        <text
          x={END_ZONE_DEPTH / 2}
          y={FIELD_WIDTH / 2}
          className="end-zone-label"
          transform={`rotate(-90, ${END_ZONE_DEPTH / 2}, ${FIELD_WIDTH / 2})`}
        >
          END ZONE
        </text>

        <rect
          x={FIELD_LENGTH - END_ZONE_DEPTH}
          y={0}
          width={END_ZONE_DEPTH}
          height={FIELD_WIDTH}
          className="end-zone end-zone-right"
        />
        <text
          x={FIELD_LENGTH - END_ZONE_DEPTH / 2}
          y={FIELD_WIDTH / 2}
          className="end-zone-label"
          transform={`rotate(90, ${FIELD_LENGTH - END_ZONE_DEPTH / 2}, ${FIELD_WIDTH / 2})`}
        >
          END ZONE
        </text>

        {yardLines.map((x) => (
          <line
            key={x}
            x1={x}
            y1={0}
            x2={x}
            y2={FIELD_WIDTH}
            className={x === midfieldYard ? 'yard-line midfield' : 'yard-line'}
          />
        ))}

        <text x={midfieldYard} y={FIELD_WIDTH / 2 + 2} className="midfield-label">
          50
        </text>

        {[20, 30, 40, 50, 60, 70, 80, 90].map((yardFromLeft) => {
          const displayNumber = yardFromLeft <= 60 ? yardFromLeft - 10 : 110 - yardFromLeft
          if (displayNumber === 50) return null
          return (
            <text key={yardFromLeft} x={yardFromLeft} y={8} className="yard-number">
              {displayNumber}
            </text>
          )
        })}

        {blocks.map((block) => (
          <BlockLine
            key={`block-${block.playerId}`}
            playerPosition={getPlayerPosition(block.playerId)}
            block={block}
          />
        ))}

        {routes.map((route) => (
          <RouteLine
            key={`route-${route.playerId}`}
            playerPosition={getPlayerPosition(route.playerId)}
            route={route}
          />
        ))}

        {draftPath && drawingMode === 'block' && (
          <BlockLine
            playerPosition={getPlayerPosition(draftPath.playerId)}
            block={draftPath}
            isDraft
          />
        )}

        {draftPath && drawingMode === 'route' && (
          <RouteLine
            playerPosition={getPlayerPosition(draftPath.playerId)}
            route={draftPath}
            isDraft
          />
        )}

        {players.map((player) => (
          <PlayerMarker
            key={player.id}
            player={player}
            isSelected={selectedPlayerId === player.id}
            hasNotes={playerHasNotes(playerNotes, player.id)}
            onPointerDown={handlePlayerPointerDown}
          />
        ))}
      </svg>
    </div>
  )
}
