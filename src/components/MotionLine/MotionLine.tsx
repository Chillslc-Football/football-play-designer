import { ActionEndpointMarker } from '../ActionEndpointMarker/ActionEndpointMarker'
import { PLAYBOOK_HIT_SIZE } from '../../constants/field'
import type { Position } from '../../types/player'
import type { EndpointMarker } from '../../types/playerAction'
import type { Motion, MotionType } from '../../types/motion'
import { lastSegmentUsesArrowMarker } from '../../utils/endpointMarker'
import {
  findNearestSegmentIndex,
  getRouteVertices,
  getSvgPointFromMouseEvent,
  isDenseRoute,
  isRouteVertexInteractive,
} from '../../utils/routeEdit'
import './MotionLine.css'

type MotionLineProps = {
  playerPosition: Position
  motion: Motion
  endpointMarker?: EndpointMarker
  isDraft?: boolean
  readOnly?: boolean
  selectedSegmentIndex?: number | null
  selectedVertexIndex?: number | null
  onSegmentSelect?: (segmentIndex: number) => void
  onVertexSelect?: (vertexIndex: number) => void
  onEndpointPointerDown?: (event: React.MouseEvent) => void
  onContextMenu?: (event: React.MouseEvent) => void
}

function motionTypeClass(motionType: MotionType, prefix: string): string {
  return `${prefix}-${motionType}`
}

export function MotionLine({
  playerPosition,
  motion,
  endpointMarker = 'filled-circle',
  isDraft = false,
  readOnly = false,
  selectedSegmentIndex = null,
  selectedVertexIndex = null,
  onSegmentSelect,
  onVertexSelect,
  onEndpointPointerDown,
  onContextMenu,
}: MotionLineProps) {
  if (motion.points.length === 0) return null

  const typeClass = motionTypeClass(motion.motionType, 'motion-segment')

  if (isDraft) {
    const vertices = getRouteVertices(playerPosition, {
      playerId: motion.playerId,
      points: motion.points,
    })
    const points = vertices.map((p) => `${p.x},${p.y}`).join(' ')

    return (
      <polyline
        points={points}
        className={`motion-line-draft motion-line-draft-${motion.motionType}`}
      />
    )
  }

  const vertices = getRouteVertices(playerPosition, {
    playerId: motion.playerId,
    points: motion.points,
  })
  const segmentCount = vertices.length - 1
  const denseRoute = isDenseRoute(vertices)
  const polylinePoints = vertices.map((vertex) => `${vertex.x},${vertex.y}`).join(' ')

  function handlePathSelect(event: React.MouseEvent<SVGPolylineElement>) {
    if (event.button !== 0) return
    event.stopPropagation()

    const svg = event.currentTarget.ownerSVGElement
    if (!svg) return

    const clickPoint = getSvgPointFromMouseEvent(svg, event.clientX, event.clientY)
    const segmentIndex = findNearestSegmentIndex(vertices, clickPoint)
    if (segmentIndex !== null) {
      onSegmentSelect?.(segmentIndex)
    }
  }

  return (
    <g
      className="motion-path"
      onContextMenu={
        readOnly
          ? undefined
          : (event) => {
              onContextMenu?.(event)
            }
      }
    >
      {!readOnly && (
        <polyline
          points={polylinePoints}
          className="motion-path-hit"
          onMouseDown={handlePathSelect}
        />
      )}

      {Array.from({ length: segmentCount }, (_, index) => {
        const start = vertices[index]
        const end = vertices[index + 1]
        const isSelected = selectedSegmentIndex === index
        const isLast = index === segmentCount - 1

        return (
          <g key={`segment-${index}`} className="motion-segment-group">
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              className={
                isSelected
                  ? `motion-segment ${typeClass} motion-segment-selected`
                  : `motion-segment ${typeClass}`
              }
              markerEnd={
                isLast && lastSegmentUsesArrowMarker(endpointMarker)
                  ? 'url(#route-arrow)'
                  : undefined
              }
              onMouseDown={
                readOnly
                  ? undefined
                  : (event) => {
                      if (event.button !== 0) return
                      event.stopPropagation()
                      onSegmentSelect?.(index)
                    }
              }
            />
          </g>
        )
      })}

      {vertices.length >= 2 && (
        <ActionEndpointMarker
          vertices={vertices}
          endpointMarker={endpointMarker}
          variant="motion"
          motionType={motion.motionType}
        />
      )}

      {!readOnly && onEndpointPointerDown && vertices.length >= 2 && (
        <circle
          cx={vertices[vertices.length - 1].x}
          cy={vertices[vertices.length - 1].y}
          r={PLAYBOOK_HIT_SIZE}
          className="motion-endpoint-handle-hit"
          onMouseDown={(event) => {
            if (event.button !== 0) return
            event.stopPropagation()
            onEndpointPointerDown(event)
          }}
        />
      )}

      {!readOnly &&
        vertices.map((vertex, index) => {
          const isVertexSelected = selectedVertexIndex === index
          const isSegmentStart = selectedSegmentIndex === index
          const isSegmentEnd =
            selectedSegmentIndex !== null && selectedSegmentIndex + 1 === index
          const isHighlighted = isVertexSelected || isSegmentStart || isSegmentEnd
          const interactive = isRouteVertexInteractive(
            index,
            vertices.length,
            denseRoute,
            selectedSegmentIndex,
          )

          return (
            <circle
              key={`vertex-${index}`}
              cx={vertex.x}
              cy={vertex.y}
              r={isHighlighted ? 0.42 : denseRoute ? 0.18 : 0.3}
              className={
                interactive
                  ? isHighlighted
                    ? `motion-vertex-handle motion-vertex-handle-${motion.motionType} motion-vertex-handle-selected motion-vertex-handle-hit`
                    : `motion-vertex-handle motion-vertex-handle-${motion.motionType} motion-vertex-handle-hit`
                  : `motion-vertex-handle motion-vertex-handle-${motion.motionType}`
              }
              onMouseDown={
                interactive
                  ? (event) => {
                      if (event.button !== 0) return
                      event.stopPropagation()
                      onVertexSelect?.(index)
                    }
                  : undefined
              }
            />
          )
        })}
    </g>
  )
}
