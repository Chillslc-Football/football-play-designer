import type { Position } from '../../types/player'
import type { Block } from '../../types/block'
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
  isDraft?: boolean
  readOnly?: boolean
  selectedSegmentIndex?: number | null
  selectedVertexIndex?: number | null
  onSegmentSelect?: (segmentIndex: number) => void
  onVertexSelect?: (vertexIndex: number) => void
}

const BLOCK_BAR_HALF_LENGTH = 1.2

function getBlockEndBar(
  vertices: Position[],
): { x1: number; y1: number; x2: number; y2: number } | null {
  if (vertices.length < 2) return null

  const end = vertices[vertices.length - 1]

  let dirX = 0
  let dirY = 0
  for (let index = vertices.length - 1; index > 0; index--) {
    const dx = vertices[index].x - vertices[index - 1].x
    const dy = vertices[index].y - vertices[index - 1].y
    const length = Math.sqrt(dx * dx + dy * dy)
    if (length > 0.001) {
      dirX = dx / length
      dirY = dy / length
      break
    }
  }

  if (dirX === 0 && dirY === 0) return null

  const perpX = -dirY
  const perpY = dirX

  return {
    x1: end.x - perpX * BLOCK_BAR_HALF_LENGTH,
    y1: end.y - perpY * BLOCK_BAR_HALF_LENGTH,
    x2: end.x + perpX * BLOCK_BAR_HALF_LENGTH,
    y2: end.y + perpY * BLOCK_BAR_HALF_LENGTH,
  }
}

export function BlockLine({
  playerPosition,
  block,
  isDraft = false,
  readOnly = false,
  selectedSegmentIndex = null,
  selectedVertexIndex = null,
  onSegmentSelect,
  onVertexSelect,
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
  const endBar = getBlockEndBar(vertices)

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

        return (
          <g key={`segment-${index}`} className="block-segment-group">
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              className={isSelected ? 'block-segment block-segment-selected' : 'block-segment'}
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

      {endBar && (
        <line
          x1={endBar.x1}
          y1={endBar.y1}
          x2={endBar.x2}
          y2={endBar.y2}
          className="block-end-bar"
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
