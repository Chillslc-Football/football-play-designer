import type { PlayerLabel, Position } from './player'
import { pathToPolylinePoints } from '../utils/pathUtils'

/** A route drawn for one player — a list of points on the field. */
export type Route = {
  playerId: PlayerLabel
  points: Position[]
}

/** Creates an empty route list. */
export function createEmptyRoutes(): Route[] {
  return []
}

/** Builds an SVG polyline "points" string from a player position and route waypoints. */
export function routeToPolylinePoints(playerPosition: Position, route: Route): string {
  return pathToPolylinePoints(playerPosition, route.points)
}
