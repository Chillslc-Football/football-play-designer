import { ActionEndpointMarker } from '../ActionEndpointMarker/ActionEndpointMarker'
import { PLAYBOOK_HIT_SIZE } from '../../constants/field'
import type { Position } from '../../types/player'
import type { EndpointMarker } from '../../types/playerAction'
import type { Route } from '../../types/route'
import { lastSegmentUsesArrowMarker } from '../../utils/endpointMarker'
import {
  findNearestSegmentIndex,
  getRouteVertices,
  getSvgPointFromMouseEvent,
  isDenseRoute,
  isRouteVertexInteractive,
  shouldRenderRouteVertexHandle,
} from '../../utils/routeEdit'
import './RouteLine.css'

type RouteLineProps = {
  playerPosition: Position
  route: Route
  endpointMarker?: EndpointMarker
  /** Dashed style while the user is actively freehand dragging. */
  isDraft?: boolean
  /** When true, route is visible but segments and handles are not interactive. */
  readOnly?: boolean
  /** When true, interior waypoint handles are shown for editing. */
  showIntermediateVertices?: boolean
  selectedSegmentIndex?: number | null
  selectedVertexIndex?: number | null
  onSegmentSelect?: (segmentIndex: number) => void
  onVertexSelect?: (vertexIndex: number) => void
  onEndpointPointerDown?: (event: React.MouseEvent) => void
  onContextMenu?: (event: React.MouseEvent) => void
}

/**
 * Draws a route as selectable segments with an arrow only on the final segment.
 */
export function RouteLine({
  playerPosition,
  route,
  endpointMarker = 'arrow',
  isDraft = false,
  readOnly = false,
  showIntermediateVertices = false,
  selectedSegmentIndex = null,
  selectedVertexIndex = null,
  onSegmentSelect,
  onVertexSelect,
  onEndpointPointerDown,
  onContextMenu,
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
  const denseRoute = isDenseRoute(vertices)
  const polylinePoints = vertices.map((vertex) => `${vertex.x},${vertex.y}`).join(' ')
  const endpoint = vertices[vertices.length - 1]

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
      className="route-path"
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
          className="route-path-hit"
          onMouseDown={handlePathSelect}
        />
      )}

      {Array.from({ length: segmentCount }, (_, index) => {
        const start = vertices[index]
        const end = vertices[index + 1]
        const isSelected = selectedSegmentIndex === index
        const isLast = index === segmentCount - 1

        return (
          <g key={`segment-${index}`} className="route-segment-group">
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              className={isSelected ? 'route-segment route-segment-selected' : 'route-segment'}
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

      {!readOnly &&
        vertices.map((vertex, index) => {
          if (!shouldRenderRouteVertexHandle(index, vertices.length, showIntermediateVertices)) {
            return null
          }

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
                    ? 'route-vertex-handle route-vertex-handle-selected route-vertex-handle-hit'
                    : 'route-vertex-handle route-vertex-handle-hit'
                  : 'route-vertex-handle'
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

      {vertices.length >= 2 && (
        <ActionEndpointMarker
          vertices={vertices}
          endpointMarker={endpointMarker}
          variant="route"
        />
      )}

      {!readOnly && onEndpointPointerDown && (
        <circle
          cx={endpoint.x}
          cy={endpoint.y}
          r={PLAYBOOK_HIT_SIZE}
          className="route-endpoint-handle-hit"
          onMouseDown={(event) => {
            if (event.button !== 0) return
            event.stopPropagation()
            onEndpointPointerDown(event)
          }}
        />
      )}
    </g>
  )
}
