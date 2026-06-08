import type { Position } from '../../types/player'
import type { Route } from '../../types/route'
import { routeToPolylinePoints } from '../../types/route'
import './RouteLine.css'

type RouteLineProps = {
  playerPosition: Position
  route: Route
  /** Dashed style while the user is still drawing. */
  isDraft?: boolean
}

/**
 * Draws a player's route as a polyline with an arrow at the end.
 */
export function RouteLine({ playerPosition, route, isDraft = false }: RouteLineProps) {
  if (route.points.length === 0) return null

  const points = routeToPolylinePoints(playerPosition, route)

  return (
    <polyline
      points={points}
      className={isDraft ? 'route-line route-line-draft' : 'route-line'}
      markerEnd="url(#route-arrow)"
    />
  )
}
