import type { Position } from '../types/player'

/** Builds an SVG polyline "points" string from a start position and waypoints. */
export function pathToPolylinePoints(start: Position, points: Position[]): string {
  const allPoints = [start, ...points]
  return allPoints.map((p) => `${p.x},${p.y}`).join(' ')
}

/** Only add a new point if it is far enough from the last one (keeps lines smooth). */
export function appendPathPoint(
  points: Position[],
  newPoint: Position,
  minDistance = 0.8,
): Position[] {
  const last = points[points.length - 1]
  if (!last) return [newPoint]

  const dx = newPoint.x - last.x
  const dy = newPoint.y - last.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance < minDistance) return points
  return [...points, newPoint]
}
