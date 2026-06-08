import { useEffect, useRef, useState } from 'react'
import { FIELD_LENGTH, FIELD_WIDTH } from '../../constants/field'
import type { Player, PlayerLabel, Position } from '../../types/player'
import { clampPosition } from '../../types/player'
import type { PlayerNotes } from '../../types/playerNotes'
import { playerHasNotes } from '../../types/playerNotes'
import type { Route } from '../../types/route'
import { appendRoutePoint } from '../../types/route'
import { PlayerMarker } from '../PlayerMarker/PlayerMarker'
import { RouteLine } from '../RouteLine/RouteLine'
import './Field.css'

const DRAG_THRESHOLD = 5

type FieldProps = {
  players: Player[]
  routes: Route[]
  playerNotes: PlayerNotes
  selectedPlayerId: PlayerLabel | null
  onSelectPlayer: (playerId: PlayerLabel) => void
  onPlayerMove: (playerId: PlayerLabel, position: Position) => void
  onRouteComplete: (route: Route) => void
}

type DraftRoute = {
  playerId: PlayerLabel
  points: Position[]
}

/**
 * Renders a top-down football field using SVG.
 * Click a player to select them, then click and drag on the field to draw a route.
 */
export function Field({
  players,
  routes,
  playerNotes,
  selectedPlayerId,
  onSelectPlayer,
  onPlayerMove,
  onRouteComplete,
}: FieldProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const draggingIdRef = useRef<PlayerLabel | null>(null)
  const draftRouteRef = useRef<DraftRoute | null>(null)
  const pointerStartRef = useRef<{
    playerId: PlayerLabel
    x: number
    y: number
  } | null>(null)

  const [draftRoute, setDraftRoute] = useState<DraftRoute | null>(null)

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
    draftRouteRef.current = nextDraft
    setDraftRoute(nextDraft)
  }

  // One listener for the whole session — refs avoid missing mouseup after state changes
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

      const currentDraft = draftRouteRef.current
      if (currentDraft) {
        const position = getSvgPosition(event.clientX, event.clientY)
        const updated = {
          ...currentDraft,
          points: appendRoutePoint(currentDraft.points, position),
        }
        draftRouteRef.current = updated
        setDraftRoute(updated)
      }
    }

    function handleMouseUp() {
      const pointerStart = pointerStartRef.current
      if (pointerStart) {
        onSelectPlayer(pointerStart.playerId)
        pointerStartRef.current = null
      }

      const completedRoute = draftRouteRef.current
      if (completedRoute && completedRoute.points.length > 0) {
        onRouteComplete(completedRoute)
        draftRouteRef.current = null
        setDraftRoute(null)
      }

      draggingIdRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [onPlayerMove, onRouteComplete, onSelectPlayer])

  return (
    <div className="field-container">
      {selectedPlayerId && (
        <p className="route-hint">
          <strong>{selectedPlayerId}</strong> selected — click and drag on the field to draw a
          route
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

        {routes.map((route) => (
          <RouteLine
            key={route.playerId}
            playerPosition={getPlayerPosition(route.playerId)}
            route={route}
          />
        ))}

        {draftRoute && (
          <RouteLine
            playerPosition={getPlayerPosition(draftRoute.playerId)}
            route={draftRoute}
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
