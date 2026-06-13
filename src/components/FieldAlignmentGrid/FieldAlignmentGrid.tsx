import { useMemo } from 'react'
import { FIELD_LENGTH, FIELD_WIDTH } from '../../constants/field'

const GRID_SPACING_YARDS = 1
const GRID_MAJOR_INTERVAL_YARDS = 5

type GridLine = {
  position: number
  major: boolean
}

type FieldAlignmentGridProps = {
  width?: number
  height?: number
  spacing?: number
  majorInterval?: number
}

function isMajorGridLine(position: number, interval: number): boolean {
  const rounded = Math.round(position)
  return Math.abs(position - rounded) < 0.001 && rounded % interval === 0
}

function buildGridLines(length: number, spacing: number, majorInterval: number): GridLine[] {
  const lines: GridLine[] = []

  for (let position = 0; position <= length; position += spacing) {
    lines.push({
      position,
      major: isMajorGridLine(position, majorInterval),
    })
  }

  return lines
}

export function FieldAlignmentGrid({
  width = FIELD_WIDTH,
  height = FIELD_LENGTH,
  spacing = GRID_SPACING_YARDS,
  majorInterval = GRID_MAJOR_INTERVAL_YARDS,
}: FieldAlignmentGridProps) {
  const { verticalLines, horizontalLines } = useMemo(
    () => ({
      verticalLines: buildGridLines(width, spacing, majorInterval),
      horizontalLines: buildGridLines(height, spacing, majorInterval),
    }),
    [width, height, spacing, majorInterval],
  )

  return (
    <g className="field-alignment-grid" aria-hidden="true" pointerEvents="none">
      {verticalLines.map((line) => (
        <line
          key={`grid-v-${line.position}`}
          x1={line.position}
          y1={0}
          x2={line.position}
          y2={height}
          className={
            line.major
              ? 'field-alignment-grid-line field-alignment-grid-line-major'
              : 'field-alignment-grid-line field-alignment-grid-line-minor'
          }
        />
      ))}
      {horizontalLines.map((line) => (
        <line
          key={`grid-h-${line.position}`}
          x1={0}
          y1={line.position}
          x2={width}
          y2={line.position}
          className={
            line.major
              ? 'field-alignment-grid-line field-alignment-grid-line-major'
              : 'field-alignment-grid-line field-alignment-grid-line-minor'
          }
        />
      ))}
    </g>
  )
}
