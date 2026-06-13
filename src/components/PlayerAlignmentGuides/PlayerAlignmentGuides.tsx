import { FIELD_LENGTH, FIELD_WIDTH } from '../../constants/field'
import type { PlayerAlignmentGuide } from '../../utils/playerAlignmentGuides'

type PlayerAlignmentGuidesProps = {
  guides: PlayerAlignmentGuide[]
}

export function PlayerAlignmentGuides({ guides }: PlayerAlignmentGuidesProps) {
  if (guides.length === 0) return null

  return (
    <g className="player-alignment-guides" aria-hidden="true" pointerEvents="none">
      {guides.map((guide) =>
        guide.axis === 'horizontal' ? (
          <line
            key={`align-h-${guide.y}`}
            x1={0}
            y1={guide.y}
            x2={FIELD_WIDTH}
            y2={guide.y}
            className="player-alignment-guide player-alignment-guide-horizontal"
          />
        ) : (
          <line
            key={`align-v-${guide.x}`}
            x1={guide.x}
            y1={0}
            x2={guide.x}
            y2={FIELD_LENGTH}
            className="player-alignment-guide player-alignment-guide-vertical"
          />
        ),
      )}
    </g>
  )
}
