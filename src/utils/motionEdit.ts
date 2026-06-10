import type { Motion } from '../types/motion'
import type { Route } from '../types/route'

export function motionToRoute(motion: Motion): Route {
  return { playerId: motion.playerId, points: motion.points }
}

export function routeToMotion(route: Route, motionType: Motion['motionType']): Motion {
  return { playerId: route.playerId, points: route.points, motionType }
}
