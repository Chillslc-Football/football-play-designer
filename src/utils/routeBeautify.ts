import type { Position } from '../types/player'

const MIN_POINTS_FOR_BEAUTIFY = 3
const SMOOTH_ITERATIONS = 2
const SIMPLIFY_MIN_DISTANCE = 0.35

function distance(a: Position, b: Position): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

function laplacianSmooth(points: Position[], iterations: number): Position[] {
  if (points.length < 3) {
    return points.map((point) => ({ ...point }))
  }

  let current = points.map((point) => ({ ...point }))

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = current.map((point, index) => {
      if (index === 0 || index === current.length - 1) {
        return { ...point }
      }

      const previous = current[index - 1]
      const following = current[index + 1]
      return {
        x: 0.2 * previous.x + 0.6 * point.x + 0.2 * following.x,
        y: 0.2 * previous.y + 0.6 * point.y + 0.2 * following.y,
      }
    })
    current = next
  }

  return current
}

function simplifyPreservingEndpoints(points: Position[], minDistance: number): Position[] {
  if (points.length < 3) {
    return points.map((point) => ({ ...point }))
  }

  const start = points[0]
  const end = points[points.length - 1]
  const simplified: Position[] = [{ ...start }]
  let lastKept = start

  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]
    if (distance(lastKept, point) >= minDistance) {
      simplified.push({ ...point })
      lastKept = point
    }
  }

  simplified.push({ ...end })
  return simplified
}

export function canBeautifyRoutePoints(points: Position[]): boolean {
  return points.length >= MIN_POINTS_FOR_BEAUTIFY
}

/**
 * Smooths hand-drawn route waypoints while preserving the first and last points.
 * Player position is unchanged because it is not part of the points array.
 */
export function beautifyRoutePoints(points: Position[]): Position[] {
  if (points.length < MIN_POINTS_FOR_BEAUTIFY) {
    return points.map((point) => ({ ...point }))
  }

  const originalStart = points[0]
  const originalEnd = points[points.length - 1]

  const smoothed = laplacianSmooth(points, SMOOTH_ITERATIONS)
  const simplified = simplifyPreservingEndpoints(smoothed, SIMPLIFY_MIN_DISTANCE)

  simplified[0] = { ...originalStart }
  simplified[simplified.length - 1] = { ...originalEnd }

  return simplified
}
