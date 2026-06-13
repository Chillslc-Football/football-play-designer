import { ActionEndpointMarker } from '../ActionEndpointMarker/ActionEndpointMarker'
import { PLAYBOOK_HIT_SIZE } from '../../constants/field'
import type { Position } from '../../types/player'
import type { EndpointMarker } from '../../types/playerAction'
import type { Block } from '../../types/block'
import { getBlockEndBar, lastSegmentUsesArrowMarker } from '../../utils/endpointMarker'
import {
  findNearestSegmentIndex,
  getRouteVertices,
  getSvgPointFromMouseEvent,
  isDenseRoute,
  isRouteVertexInteractive,
} from '../../utils/routeEdit'
import './BlockLine.css'

type BlockLineProps = {
  playerPosition: Position
  block: Block
  endpointMarker?: EndpointMarker
  isDraft?: boolean
  readOnly?: boolean
  selectedSegmentIndex?: number | null
  selectedVertexIndex?: number | null
  onSegmentSelect?: (segmentIndex: number) => void
  onVertexSelect?: (vertexIndex: number) => void
  onEndpointPointerDown?: (event: React.MouseEvent) => void
}

export function BlockLine({
  playerPosition,
  block,
  endpointMarker = 'blocking-line',
  isDraft = false,
  readOnly = false,
  selectedSegmentIndex = null,
  selectedVertexIndex = null,
  onSegmentSelect,
  onVertexSelect,
  onEndpointPointerDown,
}: BlockLineProps) {
  if (block.points.length === 0) return null

  if (isDraft) {
    const vertices = getRouteVertices(playerPosition, {
      playerId: block.playerId,
      points: block.points,
    })
    const points = vertices.map((p) => `${p.x},${p.y}`).join(' ')
    const endBar = getBlockEndBar(vertices)

    return (
      <g className="block-path">
        <polyline points={points} className="block-line block-line-draft" />
        {endBar && (
          <line
            x1={endBar.x1}
            y1={endBar.y1}
            x2={endBar.x2}
            y2={endBar.y2}
            className="block-end-bar block-end-bar-draft"
          />
        )}
      </g>
    )
  }

  const vertices = getRouteVertices(playerPosition, {
    playerId: block.playerId,
    points: block.points,
  })
  const segmentCount = vertices.length - 1
  const denseRoute = isDenseRoute(vertices)
  const polylinePoints = vertices.map((vertex) => `${vertex.x},${vertex.y}`).join(' ')

  function handlePathSelect(event: React.MouseEvent<SVGPolylineElement>) {
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
    <g className="block-path">
      {!readOnly && (
        <polyline
          points={polylinePoints}
          className="block-path-hit"
          onMouseDown={handlePathSelect}
        />
      )}

      {Array.from({ length: segmentCount }, (_, index) => {
        const start = vertices[index]
        const end = vertices[index + 1]
        const isSelected = selectedSegmentIndex === index
        const isLast = index === segmentCount - 1

        return (
          <g key={`segment-${index}`} className="block-segment-group">
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              className={isSelected ? 'block-segment block-segment-selected' : 'block-segment'}
              markerEnd={
                isLast && lastSegmentUsesArrowMarker(endpointMarker)
                  ? 'url(#route-arrow)'
                  : undefined
              }
              onMouseDown={
                readOnly
                  ? undefined
                  : (event) => {
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
          variant="block"
        />
      )}

      {!readOnly && onEndpointPointerDown && vertices.length >= 2 && (
        <circle
          cx={vertices[vertices.length - 1].x}
          cy={vertices[vertices.length - 1].y}
          r={PLAYBOOK_HIT_SIZE}
          className="block-endpoint-handle-hit"
          onMouseDown={(event) => {
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
                    ? 'block-vertex-handle block-vertex-handle-selected block-vertex-handle-hit'
                    : 'block-vertex-handle block-vertex-handle-hit'
                  : 'block-vertex-handle'
              }
              onMouseDown={
                interactive
                  ? (event) => {
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
