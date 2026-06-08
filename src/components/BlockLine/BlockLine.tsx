import type { Position } from '../../types/player'
import type { Block } from '../../types/block'
import { pathToPolylinePoints } from '../../utils/pathUtils'
import './BlockLine.css'

type BlockLineProps = {
  playerPosition: Position
  block: Block
  isDraft?: boolean
}

/**
 * Draws a blocking assignment as a solid line with a T-cap at the end (no arrow).
 */
export function BlockLine({ playerPosition, block, isDraft = false }: BlockLineProps) {
  if (block.points.length === 0) return null

  const points = pathToPolylinePoints(playerPosition, block.points)

  return (
    <polyline
      points={points}
      className={isDraft ? 'block-line block-line-draft' : 'block-line'}
      markerEnd="url(#block-t-cap)"
    />
  )
}
