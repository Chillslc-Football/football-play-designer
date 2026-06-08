import type { PlayerLabel, Position } from './player'
import { mirrorPosition } from '../utils/mirror'

/** A route drawn for one player — a list of points on the field. */
export type Route = {
  playerId: PlayerLabel
  points: Position[]
}

/** Creates an empty route list. */
export function createEmptyRoutes(): Route[] {
  return []
}

/**
 * Mirrors every route horizontally across the field center.
 *
 * - Each point in every route has its x flipped around midfield.
 * - Y positions stay the same for every point.
 * - Routes are kept (not erased) — same players, same number of points, mirrored positions.
 * - playerId labels stay the same so routes still belong to the correct player.
 */
export function mirrorRoutes(routes: Route[]): Route[] {
  return routes.map((route) => ({
    ...route,
    points: route.points.map((point) => mirrorPosition(point)),
  }))
}

/** Builds an SVG polyline "points" string from a player position and route waypoints. */
export function routeToPolylinePoints(playerPosition: Position, route: Route): string {
  const allPoints = [playerPosition, ...route.points]
  return allPoints.map((p) => `${p.x},${p.y}`).join(' ')
}

/** Only add a new point if it is far enough from the last one (keeps routes smooth). */
export function appendRoutePoint(
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
