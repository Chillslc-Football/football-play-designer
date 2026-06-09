import type { Position } from '../../types/player'
import type { Block } from '../../types/block'
import { pathToPolylinePoints } from '../../utils/pathUtils'
import './BlockLine.css'

type BlockLineProps = {
  playerPosition: Position
  block: Block
  isDraft?: boolean
}

/** Half-length of the perpendicular blocking bar in SVG user units (scales with the field). */
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

/**
 * Draws a blocking assignment as a solid line with a perpendicular bar at the end (no arrow).
 */
export function BlockLine({ playerPosition, block, isDraft = false }: BlockLineProps) {
  if (block.points.length === 0) return null

  const vertices = [playerPosition, ...block.points]
  const points = pathToPolylinePoints(playerPosition, block.points)
  const endBar = getBlockEndBar(vertices)

  const lineClass = isDraft ? 'block-line block-line-draft' : 'block-line'
  const barClass = isDraft ? 'block-end-bar block-end-bar-draft' : 'block-end-bar'

  return (
    <g className="block-path">
      <polyline points={points} className={lineClass} />
      {endBar && (
        <line
          x1={endBar.x1}
          y1={endBar.y1}
          x2={endBar.x2}
          y2={endBar.y2}
          className={barClass}
        />
      )}
    </g>
  )
}
