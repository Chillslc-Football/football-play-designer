import type { Position } from '../../types/player'
import type { Route } from '../../types/route'
import { getRouteVertices } from '../../utils/routeEdit'
import './RouteLine.css'

type RouteLineProps = {
  playerPosition: Position
  route: Route
  /** Dashed style while the user is actively freehand dragging. */
  isDraft?: boolean
  /** When true, route is visible but segments and handles are not interactive. */
  readOnly?: boolean
  selectedSegmentIndex?: number | null
  selectedVertexIndex?: number | null
  onSegmentSelect?: (segmentIndex: number) => void
  onVertexSelect?: (vertexIndex: number) => void
}

/**
 * Draws a route as selectable segments with an arrow only on the final segment.
 */
export function RouteLine({
  playerPosition,
  route,
  isDraft = false,
  readOnly = false,
  selectedSegmentIndex = null,
  selectedVertexIndex = null,
  onSegmentSelect,
  onVertexSelect,
}: RouteLineProps) {
  if (route.points.length === 0) return null

  if (isDraft) {
    const vertices = getRouteVertices(playerPosition, route)
    const points = vertices.map((p) => `${p.x},${p.y}`).join(' ')

    return (
      <polyline
        points={points}
        className="route-line route-line-draft"
      />
    )
  }

  const vertices = getRouteVertices(playerPosition, route)
  const segmentCount = vertices.length - 1

  return (
    <g className="route-path">
      {Array.from({ length: segmentCount }, (_, index) => {
        const start = vertices[index]
        const end = vertices[index + 1]
        const isSelected = selectedSegmentIndex === index
        const isLast = index === segmentCount - 1

        return (
          <g key={`segment-${index}`} className="route-segment-group">
            {!readOnly && (
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                className="route-segment-hit"
                onMouseDown={(event) => {
                  event.stopPropagation()
                  onSegmentSelect?.(index)
                }}
              />
            )}
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              className={isSelected ? 'route-segment route-segment-selected' : 'route-segment'}
              markerEnd={isLast ? 'url(#route-arrow)' : undefined}
            />
          </g>
        )
      })}

      {!readOnly &&
        vertices.map((vertex, index) => {
          const isVertexSelected = selectedVertexIndex === index
          const isSegmentStart = selectedSegmentIndex === index
          const isSegmentEnd =
            selectedSegmentIndex !== null && selectedSegmentIndex + 1 === index
          const isHighlighted = isVertexSelected || isSegmentStart || isSegmentEnd

          return (
            <circle
              key={`vertex-${index}`}
              cx={vertex.x}
              cy={vertex.y}
              r={isHighlighted ? 0.42 : 0.3}
              className={
                isHighlighted
                  ? 'route-vertex-handle route-vertex-handle-selected route-vertex-handle-hit'
                  : 'route-vertex-handle route-vertex-handle-hit'
              }
              onMouseDown={(event) => {
                event.stopPropagation()
                onVertexSelect?.(index)
              }}
            />
          )
        })}
    </g>
  )
}
